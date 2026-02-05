
import { FunctionDeclaration, Type } from "@google/genai";
import { IntentType, VoiceEntry } from "../types";

export interface IntentDefinition {
  type: IntentType;
  tool: FunctionDeclaration;
  extractor: (data: any) => any;
}

export class IntentManager {
  private intents: Map<IntentType, IntentDefinition> = new Map();

  registerIntent(def: IntentDefinition) {
    this.intents.set(def.type, def);
  }

  getTools(): FunctionDeclaration[] {
    return Array.from(this.intents.values()).map(i => i.tool);
  }

  getIntentByType(type: IntentType) {
    return this.intents.get(type);
  }

  classifyRawText(text: string): { intent: IntentType; confidence: number } {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('spent') || lowerText.includes('bought') || lowerText.includes('cost') || 
        lowerText.includes('paid') || lowerText.includes('price') || lowerText.includes('rupees') || 
        lowerText.includes(' rs') || lowerText.match(/\d+\s?rs/)) {
      return { intent: 'EXPENSE', confidence: 0.95 };
    }
    
    // Expanded Mood Keywords
    const moodWords = [
      'feel', 'feeling', 'happy', 'sad', 'stressed', 'anxious', 'tired', 'great', 
      'awesome', 'bad', 'terrible', 'thought', 'think', 'reflection', 'realized', 
      'wondering', 'excited', 'angry', 'mood', 'today was', 'day was'
    ];
    
    if (moodWords.some(word => lowerText.includes(word))) {
      return { intent: 'MOOD', confidence: 0.9 };
    }
    
    if (lowerText.includes('remind') || lowerText.includes('reminder') || lowerText.includes('alert')) {
      return { intent: 'REMINDER', confidence: 0.9 };
    }

    if (lowerText.includes('todo') || lowerText.includes('task') || lowerText.includes('need to') || lowerText.includes('remember to')) {
      return { intent: 'TODO', confidence: 0.85 };
    }

    return { intent: 'NOTE', confidence: 0.5 };
  }
}

export const ExpenseIntent: IntentDefinition = {
  type: 'EXPENSE',
  tool: {
    name: 'logExpense',
    description: 'Log any purchase, cost, or spending activity.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'Numeric value of expense.' },
        currency: { type: Type.STRING, description: 'Currency (default INR).' },
        date: { type: Type.STRING, description: 'YYYY-MM-DD' },
        category: { 
          type: Type.STRING, 
          enum: ['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Medical', 'Others']
        },
        description: { type: Type.STRING, description: 'What was bought.' }
      },
      required: ['amount', 'category', 'description']
    }
  },
  extractor: (data) => ({
    amount: typeof data.amount === 'string' ? parseFloat(data.amount) : (data.amount || 0),
    currency: data.currency || 'INR',
    category: data.category || 'Others',
    date: data.date || new Date().toISOString().split('T')[0],
    description: data.description || 'Purchase'
  })
};

export const TodoIntent: IntentDefinition = {
  type: 'TODO',
  tool: {
    name: 'logTodo',
    description: 'Add a task to a to-do list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
        category: { type: Type.STRING },
        date: { type: Type.STRING }
      },
      required: ['title']
    }
  },
  extractor: (d) => ({
    title: d.title || 'Task',
    priority: d.priority || 'medium',
    category: d.category || 'Personal',
    date: d.date || new Date().toISOString().split('T')[0]
  })
};

export const ReminderIntent: IntentDefinition = {
  type: 'REMINDER',
  tool: {
    name: 'logReminder',
    description: 'Set an alert for a specific time or event.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        time: { type: Type.STRING },
        date: { type: Type.STRING }
      },
      required: ['title']
    }
  },
  extractor: (d) => ({
    title: d.title || 'Reminder',
    time: d.time || '',
    date: d.date || new Date().toISOString().split('T')[0],
    priority: 'high',
    category: 'Reminder'
  })
};

export const MoodIntent: IntentDefinition = {
  type: 'MOOD',
  tool: {
    name: 'logMood',
    description: 'Log emotional state, feelings, mood, or personal reflections about the day.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sentiment: { type: Type.STRING, description: 'The mood (e.g., Happy, Tired).' },
        sentence: { type: Type.STRING, description: 'The summary of the thought.' },
        reason: { type: Type.STRING, description: 'The reason for the feeling.' }
      },
      required: ['sentiment', 'sentence']
    }
  },
  extractor: (d) => ({
    sentiment: d.sentiment || 'Neutral',
    sentence: d.sentence || 'Reflection captured.',
    reason: d.reason || ''
  })
};
