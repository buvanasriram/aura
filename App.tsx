
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { HomeView } from './components/HomeView';
import { ConfirmView } from './components/ConfirmView';
import { HistoryView } from './components/HistoryView';
import { ProcessingView } from './components/ProcessingView';
import { AppView, AppState, IntentType, VoiceEntry, Expense, Task, MoodRecord } from './types';
import { auraStore } from './services/storageManager';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [isInitializing, setIsInitializing] = useState(true);
  const [state, setState] = useState<AppState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingData, setProcessingData] = useState<{ rawText: string; intent: IntentType; entities: any } | null>(null);
  
  const isReadyRef = useRef(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        await auraStore.init();
        const savedState = await auraStore.loadState();
        setState(savedState);
        isReadyRef.current = true;
        setIsInitializing(false);
      } catch (e) {
        console.error("[AURA] Init Error:", e);
        setIsInitializing(false);
      }
    };
    initApp();
  }, []);

  const handleConfirmAction = async (finalEntities: any) => {
    if (!processingData || !state || !isReadyRef.current) return;
    
    const entryId = Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    
    // 1. Create entry
    const newEntry: VoiceEntry = {
      id: entryId,
      rawText: processingData.rawText,
      intent: processingData.intent,
      confidence: 0.95,
      extractedEntities: finalEntities,
      createdAt: now,
      source: 'voice'
    };

    // 2. Intent-specific data creation
    let relatedItem: any = null;
    let tableKey: 'EXPENSES' | 'TASKS' | 'MOODS' = 'TASKS';

    if (processingData.intent === 'EXPENSE') {
      tableKey = 'EXPENSES';
      relatedItem = {
        id: Math.random().toString(36).substring(2, 9),
        entryId,
        amount: Number(finalEntities.amount) || 0,
        currency: finalEntities.currency || 'INR',
        category: finalEntities.category || 'Others',
        date: finalEntities.date || new Date().toISOString().split('T')[0],
        description: finalEntities.description || processingData.rawText
      };
    } else if (processingData.intent === 'TODO' || processingData.intent === 'REMINDER') {
      tableKey = 'TASKS';
      relatedItem = {
        id: Math.random().toString(36).substring(2, 9),
        title: finalEntities.title || processingData.rawText,
        completed: false,
        priority: finalEntities.priority || (processingData.intent === 'REMINDER' ? 'high' : 'medium'),
        category: finalEntities.category || (processingData.intent === 'REMINDER' ? 'Reminder' : 'Personal'),
        date: finalEntities.date || new Date().toISOString().split('T')[0],
        createdAt: now
      };
    } else if (processingData.intent === 'MOOD') {
      tableKey = 'MOODS';
      relatedItem = {
        id: Math.random().toString(36).substring(2, 9),
        entryId,
        sentiment: finalEntities.sentiment || 'Neutral',
        sentence: finalEntities.sentence || 'Reflection captured.',
        reason: finalEntities.reason || processingData.rawText,
        createdAt: now
      };
    }

    // 3. Save to Disk FIRST (Atomic Persistence)
    try {
      await auraStore.saveItem('ENTRIES', newEntry);
      if (relatedItem) {
        await auraStore.saveItem(tableKey, relatedItem);
      }
      
      // 4. Update memory (State) ONLY after successful save
      setState(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        next.voiceEntries = [newEntry, ...prev.voiceEntries];
        if (processingData.intent === 'EXPENSE') next.expenses = [relatedItem, ...prev.expenses];
        if (processingData.intent === 'TODO' || processingData.intent === 'REMINDER') next.tasks = [relatedItem, ...prev.tasks];
        if (processingData.intent === 'MOOD') next.moods = [relatedItem, ...prev.moods];
        return next;
      });
    } catch (dbErr) {
      console.error("[AURA] Persistence Error:", dbErr);
    }

    setProcessingData(null);
    setView(AppView.HOME);
  };

  const handleClearDatabase = async () => {
    if (confirm("Purge vault? This will erase all persistent records.")) {
      await auraStore.purgeAll();
      setState({ voiceEntries: [], expenses: [], tasks: [], moods: [] });
    }
  };

  if (isInitializing || !state) return <ProcessingView />;

  return (
    <Layout>
      {view === AppView.HOME && (
        <HomeView 
          expenses={state.expenses} 
          voiceEntries={state.voiceEntries}
          tasks={state.tasks || []}
          moodsCount={state.moods.length}
          moods={state.moods}
          isProcessing={isProcessing}
          onStartVoice={() => {}} 
          onViewHistory={() => setView(AppView.HISTORY)}
          onVoiceSuccess={(data) => {
            setIsProcessing(true);
            setProcessingData(data);
            setView(AppView.CONFIRM_INTENT);
            setIsProcessing(false);
          }}
        />
      )}
      {view === AppView.CONFIRM_INTENT && processingData && (
        <ConfirmView 
          intent={processingData.intent}
          rawText={processingData.rawText}
          entities={processingData.entities}
          onConfirm={handleConfirmAction}
          onCancel={() => {
            setProcessingData(null);
            setView(AppView.HOME);
          }}
        />
      )}
      {view === AppView.HISTORY && (
        <HistoryView 
          entries={state.voiceEntries}
          expenses={state.expenses}
          moods={state.moods}
          tasks={state.tasks}
          onBack={() => setView(AppView.HOME)}
          onClearAll={handleClearDatabase}
          onExport={() => auraStore.exportBackup()}
        />
      )}
      {isProcessing && <ProcessingView />}
    </Layout>
  );
};

export default App;
