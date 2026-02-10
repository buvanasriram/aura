
import { AppState, VoiceEntry, Expense, Task, MoodRecord, NoteRecord } from '../types';
import * as XLSX from 'xlsx';

const DB_NAME = 'AuraRelationalVault';
const DB_VERSION = 7; 
const TABLES = {
  ENTRIES: 'voiceEntries',
  EXPENSES: 'expenses',
  TASKS: 'tasks',
  MOODS: 'moods',
  NOTES: 'notes',
  CATEGORIES: 'categories'
};

const DEFAULT_CATEGORIES = ['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Medical', 'Others'];

export class StorageManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        Object.values(TABLES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveItem(table: keyof typeof TABLES, item: any): Promise<void> {
    if (!this.db || !this.isInitialized) await this.init();
    const tableName = TABLES[table];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadState(): Promise<AppState> {
    if (!this.db) await this.init();
    const state: any = { voiceEntries: [], expenses: [], tasks: [], moods: [], notes: [], categories: [] };
    const storeNames = Object.values(TABLES);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readonly');
      let completed = 0;

      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result || [];
          const stateKey = Object.keys(TABLES).find(k => (TABLES as any)[k] === storeName);
          if (stateKey) {
            if (stateKey === 'CATEGORIES') {
              state.categories = results.length > 0 ? results.map((r: any) => r.id) : DEFAULT_CATEGORIES;
            } else {
              const finalKey = stateKey === 'ENTRIES' ? 'voiceEntries' : stateKey.toLowerCase();
              state[finalKey] = results.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
            }
          }
          completed++;
          if (completed === storeNames.length) {
            resolve(state as AppState);
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async purgeAll(): Promise<void> {
    if (!this.db) return;
    const storeNames = Object.values(TABLES);
    const transaction = this.db.transaction(storeNames, 'readwrite');
    storeNames.forEach(storeName => transaction.objectStore(storeName).clear());
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve();
    });
  }

  async exportBackup() {
    const state = await this.loadState();
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // 1. Expenses Sheet
    const expenseData = state.expenses.map(e => ({
      Date: e.date,
      Amount: e.amount,
      Currency: e.currency,
      Category: e.category,
      Description: e.description
    }));
    const wsExpenses = XLSX.utils.json_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses");

    // 2. Tasks Sheet
    const taskData = state.tasks.map(t => ({
      Date: t.date,
      Title: t.title,
      Description: t.description,
      Category: t.category,
      Priority: t.priority,
      Status: t.completed ? 'Completed' : 'Pending',
      Created_At: new Date(t.createdAt).toLocaleString()
    }));
    const wsTasks = XLSX.utils.json_to_sheet(taskData);
    XLSX.utils.book_append_sheet(wb, wsTasks, "Tasks & Reminders");

    // 3. Moods Sheet
    const moodData = state.moods.map(m => ({
      Date: new Date(m.createdAt).toLocaleDateString(),
      Sentiment: m.sentiment,
      Headline: m.sentence,
      Reason: m.reason
    }));
    const wsMoods = XLSX.utils.json_to_sheet(moodData);
    XLSX.utils.book_append_sheet(wb, wsMoods, "Mood Tracker");

    // 4. Notes Sheet
    const noteData = state.notes.map(n => ({
      Date: n.date,
      Text: n.text,
      Created_At: new Date(n.createdAt).toLocaleString()
    }));
    const wsNotes = XLSX.utils.json_to_sheet(noteData);
    XLSX.utils.book_append_sheet(wb, wsNotes, "Notes");

    // 5. Raw Entries (System Audit)
    const entryData = state.voiceEntries.map(entry => ({
      Timestamp: new Date(entry.createdAt).toLocaleString(),
      Intent: entry.intent,
      Text: entry.rawText,
      Confidence: entry.confidence
    }));
    const wsEntries = XLSX.utils.json_to_sheet(entryData);
    XLSX.utils.book_append_sheet(wb, wsEntries, "System Logs");

    // Write file
    XLSX.writeFile(wb, `aura_vault_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}

export const auraStore = new StorageManager();
