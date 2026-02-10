
export enum AppView {
  HOME = 'HOME',
  VOICE_CAPTURE = 'VOICE_CAPTURE',
  PROCESSING = 'PROCESSING',
  CONFIRM_INTENT = 'CONFIRM_INTENT',
  HISTORY = 'HISTORY'
}

export type IntentType = 'EXPENSE' | 'TODO' | 'REMINDER' | 'MOOD' | 'NOTE' | 'UNKNOWN';

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
  date: string;
  createdAt: number;
}

export interface VoiceEntry {
  id: string;
  rawText: string;
  intent: IntentType;
  confidence: number;
  extractedEntities: Record<string, any>;
  createdAt: number;
  source: 'voice';
}

export interface Expense {
  id: string;
  entryId: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  description: string;
}

export interface MoodRecord {
  id: string;
  entryId: string;
  sentiment: string;
  sentence: string;
  reason: string;
  createdAt: number;
}

export interface NoteRecord {
  id: string;
  entryId: string;
  text: string;
  date: string;
  createdAt: number;
}

export interface AppState {
  voiceEntries: VoiceEntry[];
  expenses: Expense[];
  tasks: Task[];
  moods: MoodRecord[];
  notes: NoteRecord[];
  categories: string[];
}
