
import { AppState, VoiceEntry, Expense, Task, MoodRecord } from '../types';

const DB_NAME = 'AuraRelationalVault';
const DB_VERSION = 5; 
const TABLES = {
  ENTRIES: 'voiceEntries',
  EXPENSES: 'expenses',
  TASKS: 'tasks',
  MOODS: 'moods'
};

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
        console.log("[AURA STORAGE] DB Initialized v" + DB_VERSION);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Atomic Save: Only write a single new item.
   * This is much safer than syncing the entire application state.
   */
  async saveItem(table: keyof typeof TABLES, item: any): Promise<void> {
    if (!this.db || !this.isInitialized) await this.init();
    const tableName = TABLES[table];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      const request = store.put(item);

      request.onsuccess = () => {
        console.log(`[AURA STORAGE] Saved item to ${tableName}:`, item.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async loadState(): Promise<AppState> {
    if (!this.db) await this.init();
    const state: any = { voiceEntries: [], expenses: [], tasks: [], moods: [] };
    const storeNames = Object.values(TABLES);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readonly');
      let completed = 0;

      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result || [];
          // Map internal table names back to state keys
          const stateKey = Object.keys(TABLES).find(k => (TABLES as any)[k] === storeName);
          if (stateKey) {
            const finalKey = stateKey === 'ENTRIES' ? 'voiceEntries' : stateKey.toLowerCase();
            state[finalKey] = results.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          }
          completed++;
          if (completed === storeNames.length) {
            console.log("[AURA STORAGE] State fully reconstructed from Disk");
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
    localStorage.removeItem('aura_pending_draft');
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve();
    });
  }

  async exportBackup() {
    const state = await this.loadState();
    const data = { app: "Aura", exportedAt: new Date().toISOString(), database: state };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura_vault_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }
}

export const auraStore = new StorageManager();
