
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { HomeView } from './components/HomeView';
import { ConfirmView } from './components/ConfirmView';
import { HistoryView } from './components/HistoryView';
import { ProcessingView } from './components/ProcessingView';
import { VoiceMode } from './components/VoiceMode';
import { AppView, AppState, IntentType, VoiceEntry, Expense, Task, MoodRecord, NoteRecord } from './types';
import { auraStore } from './services/storageManager';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [isInitializing, setIsInitializing] = useState(true);
  const [state, setState] = useState<AppState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingData, setProcessingData] = useState<{ rawText: string; intent: IntentType; entities: any } | null>(null);
  
  const isReadyRef = useRef(false);

  const loadAppState = async () => {
    try {
      await auraStore.init();
      const savedState = await auraStore.loadState();
      if (!savedState.notes) savedState.notes = [];
      setState(savedState);
      isReadyRef.current = true;
      setIsInitializing(false);
    } catch (e) {
      console.error("[AURA] Load State Error:", e);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    loadAppState();
  }, []);

  const handleToggleTask = async (taskId: string) => {
    if (!state) return;
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTask = { ...state.tasks[taskIndex], completed: !state.tasks[taskIndex].completed };
    
    try {
      await auraStore.saveItem('TASKS', updatedTask);
      setState(prev => {
        if (!prev) return prev;
        const newTasks = [...prev.tasks];
        newTasks[taskIndex] = updatedTask;
        return { ...prev, tasks: newTasks };
      });
    } catch (e) {
      console.error("[AURA] Toggle Task Error:", e);
    }
  };

  const handleConfirmAction = async (finalData: any) => {
    if (!processingData || !state || !isReadyRef.current) return;
    
    const entryId = Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    
    const newEntry: VoiceEntry = {
      id: entryId,
      rawText: processingData.rawText,
      intent: processingData.intent,
      confidence: 0.95,
      extractedEntities: finalData,
      createdAt: now,
      source: 'voice'
    };

    let relatedItem: any = null;
    let tableKey: string = 'TASKS';

    // Check for new categories
    if (processingData.intent === 'EXPENSE' && finalData.category) {
      if (!state.categories.includes(finalData.category)) {
        await auraStore.saveItem('CATEGORIES', { id: finalData.category });
        setState(prev => prev ? ({ ...prev, categories: [...prev.categories, finalData.category] }) : prev);
      }
    }

    if (processingData.intent === 'EXPENSE') {
      tableKey = 'EXPENSES';
      relatedItem = {
        id: Math.random().toString(36).substring(2, 9),
        entryId,
        amount: Number(finalData.amount) || 0,
        currency: finalData.currency || 'INR',
        category: finalData.category || 'Others',
        date: finalData.date || today,
        description: finalData.details || processingData.rawText
      } as Expense;
    } else if (processingData.intent === 'TODO' || processingData.intent === 'REMINDER') {
      tableKey = 'TASKS';
      relatedItem = {
        id: Math.random().toString(36).substring(2, 9),
        title: finalData.headline || (processingData.intent === 'REMINDER' ? 'Reminder' : processingData.rawText),
        description: finalData.details || processingData.rawText,
        completed: false,
        priority: finalData.priority || (processingData.intent === 'REMINDER' ? 'high' : 'medium'),
        category: processingData.intent === 'REMINDER' ? 'Reminder' : 'Personal',
        date: finalData.date || today,
        createdAt: now
      } as Task;
    } else if (processingData.intent === 'MOOD') {
      tableKey = 'MOODS';
      relatedItem = {
        id: Math.random().toString(36).substring(2, 9),
        entryId,
        sentiment: finalData.vibe || 'Neutral',
        sentence: finalData.headline || 'Reflection captured.',
        reason: finalData.reason || processingData.rawText,
        createdAt: now
      } as MoodRecord;
    } else if (processingData.intent === 'NOTE') {
      tableKey = 'NOTES';
      relatedItem = {
        id: Math.random().toString(36).substring(2, 9),
        entryId,
        text: finalData.text || processingData.rawText,
        date: finalData.date || today,
        createdAt: now
      } as NoteRecord;
    }

    try {
      await auraStore.saveItem('ENTRIES', newEntry);
      if (relatedItem) {
        await auraStore.saveItem(tableKey as any, relatedItem);
      }
      
      setState(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        next.voiceEntries = [newEntry, ...prev.voiceEntries];
        if (processingData.intent === 'EXPENSE') next.expenses = [relatedItem, ...prev.expenses];
        if (processingData.intent === 'TODO' || processingData.intent === 'REMINDER') next.tasks = [relatedItem, ...prev.tasks];
        if (processingData.intent === 'MOOD') next.moods = [relatedItem, ...prev.moods];
        if (processingData.intent === 'NOTE') next.notes = [relatedItem, ...(prev.notes || [])];
        return next;
      });
    } catch (dbErr) {
      console.error("[AURA] Persistence Error:", dbErr);
    }

    setProcessingData(null);
    setView(AppView.HOME);
  };

  const handleClearDatabase = async () => {
    if (confirm("Purge detailed notes? This will erase all persistent records.")) {
      await auraStore.purgeAll();
      await loadAppState();
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
          onStartVoice={() => setView(AppView.VOICE_CAPTURE)} 
          onViewHistory={() => setView(AppView.HISTORY)}
          onVoiceSuccess={(data) => {
            setProcessingData(data);
            setView(AppView.CONFIRM_INTENT);
          }}
        />
      )}
      {view === AppView.VOICE_CAPTURE && (
        <VoiceMode 
          intentManager={null as any}
          onExit={() => setView(AppView.HOME)}
          onProcessingComplete={(data) => {
            setProcessingData(data);
            setView(AppView.CONFIRM_INTENT);
          }}
        />
      )}
      {view === AppView.CONFIRM_INTENT && processingData && (
        <ConfirmView 
          intent={processingData.intent}
          rawText={processingData.rawText}
          entities={processingData.entities}
          categories={state.categories}
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
          onToggleTask={handleToggleTask}
          onImportState={loadAppState}
        />
      )}
      {isProcessing && <ProcessingView />}
    </Layout>
  );
};

export default App;
