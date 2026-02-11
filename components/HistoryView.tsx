
import React, { useState, useMemo, useRef } from 'react';
import { VoiceEntry, Expense, MoodRecord, Task, IntentType } from '../types';
import { auraStore } from '../services/storageManager';

interface HistoryViewProps {
  entries: VoiceEntry[];
  expenses: Expense[];
  moods: MoodRecord[];
  tasks: Task[];
  onBack: () => void;
  onClearAll: () => void;
  onExport: () => void;
  onToggleTask: (taskId: string) => void;
  onImportState: () => void;
}

type VaultMode = 'ARCHIVES' | 'INTELLIGENCE';

interface AnalyticsData {
  totalSpend: number;
  categoryBreakdown: Record<string, number>;
  moodCounts: Record<string, number>;
  totalMoods: number;
  pendingTasks: number;
  completedTasks: number;
  efficiency: number;
  totalTasks: number;
}

const TaskTable = ({ tasks, filter, onToggleTask }: { tasks: Task[], filter: IntentType, onToggleTask: (id: string) => void }) => {
  const filteredTasks = tasks.filter(t => (filter === 'REMINDER' ? t.category === 'Reminder' : t.category !== 'Reminder'));
  const gridStyle = { gridTemplateColumns: '70px 1fr 60px 75px' };
  const bgColor = filter === 'REMINDER' ? 'bg-[#F7EF81]' : 'bg-[#ADD2C2]';

  if (filteredTasks.length === 0) {
    return (
      <div className="py-20 text-center border-4 border-dashed border-[#32213A]/10 rounded-3xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/30 italic">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-[#32213A] rounded-[2rem] overflow-hidden neo-pop-shadow">
      <div 
        style={{ display: 'grid', ...gridStyle }} 
        className={`${bgColor} px-4 py-3 border-b-4 border-[#32213A]`}
      >
        {['Date', 'Headline', 'Prio', 'Status'].map(col => (
          <span key={col} className="text-[8px] font-black uppercase tracking-widest text-[#32213A] truncate">{col}</span>
        ))}
      </div>
      <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
        {filteredTasks.map((task, idx) => (
          <div 
            key={task.id} 
            style={{ display: 'grid', ...gridStyle }}
            className={`px-4 py-4 items-center border-b-2 border-[#32213A]/10 last:border-0 transition-all ${task.completed ? 'opacity-40' : 'opacity-100'} ${idx % 2 === 1 ? 'bg-[#D4D6B9]/10' : 'bg-white'}`}
          >
            <span className="text-[10px] font-black text-[#32213A] uppercase tracking-tighter">
              {new Date(task.date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
            </span>
            <span className={`text-[10px] font-black text-[#32213A] uppercase tracking-tighter pr-2 truncate ${task.completed ? 'line-through' : ''}`}>
              {task.title}
            </span>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border-2 border-[#32213A] w-fit ${task.priority === 'high' ? 'bg-rose-100 text-rose-600' : task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {task.priority.substring(0, 3)}
            </span>
            <button 
              onClick={() => onToggleTask(task.id)}
              className={`w-full py-2 rounded-xl border-2 border-[#32213A] flex items-center justify-center transition-all active:scale-90 shadow-[2px_2px_0px_#32213A] ${task.completed ? 'bg-[#ADF7B6]' : 'bg-white'}`}
            >
              {task.completed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <span className="text-[7px] font-black uppercase">Pending</span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const IntentTable = ({ intent, entries }: { intent: IntentType, entries: VoiceEntry[] }) => {
  const getColumns = () => {
    switch (intent) {
      case 'EXPENSE': return ['Amount', 'Category', 'Date', 'Details'];
      case 'MOOD': return ['Date', 'Vibe', 'Headline', 'Reason'];
      default: return ['Date', 'Headline', 'Vibe', 'Notes'];
    }
  };

  const getGridStyle = () => {
    switch (intent) {
      case 'EXPENSE': return { gridTemplateColumns: '70px 0.8fr 70px 1.5fr' };
      case 'MOOD': return { gridTemplateColumns: '70px 60px 1fr 1.5fr' };
      default: return { gridTemplateColumns: '70px 1fr 60px 1.5fr' };
    }
  };

  const getRowData = (entry: VoiceEntry) => {
    const e = entry.extractedEntities;
    const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
    
    switch (intent) {
      case 'EXPENSE':
        return [
          `₹${(e.amount || 0).toLocaleString()}`,
          e.category || 'Other',
          e.date ? new Date(e.date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }) : dateStr,
          e.headline || e.details || entry.rawText
        ];
      case 'MOOD':
        return [
          dateStr,
          e.vibe || 'Neutral',
          e.headline || 'Mood',
          e.reason || e.details || '-'
        ];
      default:
        return [
          dateStr,
          e.headline || 'Note',
          e.vibe || '-',
          entry.rawText
        ];
    }
  };

  const getIntentColor = () => {
    switch (intent) {
      case 'EXPENSE': return 'bg-[#ADF7B6]';
      case 'MOOD': return 'bg-[#B892FF]';
      default: return 'bg-white';
    }
  };

  const columns = getColumns();
  const gridStyle = getGridStyle();

  if (entries.length === 0) {
    return (
      <div className="py-20 text-center border-4 border-dashed border-[#32213A]/10 rounded-3xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/30 italic">No records found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-[#32213A] rounded-[2rem] overflow-hidden neo-pop-shadow">
      <div 
        style={{ display: 'grid', ...gridStyle }} 
        className={`${getIntentColor()} px-4 py-3 border-b-4 border-[#32213A]`}
      >
        {columns.map(col => (
          <span key={col} className="text-[8px] font-black uppercase tracking-widest text-[#32213A] truncate">{col}</span>
        ))}
      </div>
      <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
        {entries.map((entry, idx) => (
          <div 
            key={entry.id} 
            style={{ display: 'grid', ...gridStyle }}
            className={`px-4 py-4 items-start border-b-2 border-[#32213A]/10 last:border-0 ${idx % 2 === 1 ? 'bg-[#D4D6B9]/10' : 'bg-white'}`}
          >
            {getRowData(entry).map((val, i) => (
              <span key={i} className="text-[10px] font-black text-[#32213A] uppercase tracking-tighter leading-tight break-words pr-2">
                {val}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const HistoryView: React.FC<HistoryViewProps> = ({ entries, expenses, moods, tasks, onBack, onClearAll, onExport, onToggleTask, onImportState }) => {
  const [mode, setMode] = useState<VaultMode>('ARCHIVES');
  const [filter, setFilter] = useState<IntentType>('EXPENSE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const firstDayOfMonth = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayStr = getLocalDateString(now);

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayStr);

  const analytics = useMemo((): AnalyticsData => {
    const start = new Date(fromDate).getTime();
    const end = new Date(toDate).setHours(23, 59, 59, 999);

    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.date).getTime();
      return d >= start && d <= end;
    });

    const filteredMoods = moods.filter(m => {
      const d = new Date(m.createdAt).getTime();
      return d >= start && d <= end;
    });

    const filteredTasksInRange = tasks.filter(t => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end;
    });

    const totalSpend = filteredExpenses.reduce((sum, e) => (sum as number) + (e.amount as number), 0);
    const categoryBreakdown = filteredExpenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = ((acc[e.category] || 0) as number) + (e.amount as number);
      return acc;
    }, {} as Record<string, number>);

    const moodCounts = filteredMoods.reduce((acc: Record<string, number>, m) => {
      acc[m.sentiment] = ((acc[m.sentiment] || 0) as number) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalMoods = filteredMoods.length;
    const pendingTasks = filteredTasksInRange.filter(t => !t.completed).length;
    const completedTasks = filteredTasksInRange.filter(t => t.completed).length;
    const totalTasks = filteredTasksInRange.length;
    const efficiency = totalTasks > 0 ? Math.round(((completedTasks as number) / (totalTasks as number)) * 100) : 0;

    return { 
      totalSpend, 
      categoryBreakdown, 
      moodCounts, 
      totalMoods,
      pendingTasks, 
      completedTasks,
      efficiency,
      totalTasks
    };
  }, [expenses, moods, tasks, fromDate, toDate]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.intent === filter);
  }, [entries, filter]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        await auraStore.importBackupJSON(json);
        onImportState(); // Trigger re-load in App.tsx
        alert("Import successful! New entries have been added to your vault.");
      } catch (err) {
        alert("Import failed. Please check the JSON format.");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset
  };

  const intents: IntentType[] = ['EXPENSE', 'TODO', 'REMINDER', 'MOOD', 'NOTE'];

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#D4D6B9] max-w-md mx-auto border-x-4 border-[#32213A]/5">
      <header className="px-6 py-8 flex justify-between items-center shrink-0">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tighter text-[#32213A]">Vault</h2>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={onExport} title="Export Excel" className="w-10 h-10 bg-white border-2 border-[#32213A] rounded-xl flex items-center justify-center text-[#32213A] active:scale-90 neo-pop-shadow transition-all">
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/></svg>
           </button>
           <button onClick={onBack} title="Exit" className="w-10 h-10 bg-[#32213A] rounded-xl flex items-center justify-center text-white active:scale-90 transition-all">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      </header>

      <div className="flex px-6 gap-3 mb-6 shrink-0">
        <button 
          onClick={() => setMode('ARCHIVES')}
          className={`flex-1 py-4 text-[10px] uppercase tracking-[0.2em] font-black rounded-2xl border-4 transition-all ${mode === 'ARCHIVES' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10'}`}
        >
          Archives
        </button>
        <button 
          onClick={() => setMode('INTELLIGENCE')}
          className={`flex-1 py-4 text-[10px] uppercase tracking-[0.2em] font-black rounded-2xl border-4 transition-all ${mode === 'INTELLIGENCE' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10'}`}
        >
          Insights
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
        {mode === 'ARCHIVES' ? (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
              {intents.map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 px-5 py-2 rounded-full text-[9px] uppercase tracking-widest font-black border-2 transition-all flex items-center gap-2 ${filter === f ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white border-[#32213A]/15 text-[#32213A]/40'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            {(filter === 'TODO' || filter === 'REMINDER') ? (
              <TaskTable tasks={tasks} filter={filter} onToggleTask={onToggleTask} />
            ) : (
              <IntentTable intent={filter} entries={filteredEntries} />
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Master Control: Date Picker */}
            <div className="bg-white border-4 border-[#32213A] p-5 rounded-[2rem] flex gap-3 neo-pop-shadow">
              <div className="flex-1 space-y-1">
                <label className="text-[8px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Start Range</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full bg-[#32213A]/5 border-2 border-[#32213A] rounded-xl px-3 py-2 text-[10px] font-black text-[#32213A]" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[8px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">End Range</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full bg-[#32213A]/5 border-2 border-[#32213A] rounded-xl px-3 py-2 text-[10px] font-black text-[#32213A]" />
              </div>
            </div>

            {/* Task Engine: Geometric Ring */}
            <div className="bg-[#ADD2C2] border-4 border-[#32213A] p-6 rounded-[2.5rem] neo-pop-shadow relative overflow-hidden">
               <div className="flex justify-between items-center relative z-10">
                  <div className="text-left">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60">Task Engine</h3>
                     <p className="text-5xl font-black text-[#32213A] tracking-tighter leading-none mt-2">{analytics.efficiency}%</p>
                     <div className="flex items-center gap-2 mt-3">
                        <span className="bg-[#32213A] text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">{analytics.completedTasks} Completed</span>
                        <span className="text-[8px] font-black uppercase text-[#32213A]/40">of {analytics.totalTasks}</span>
                     </div>
                  </div>
                  <div className="relative">
                    <svg className="w-28 h-28 rotate-[-90deg]">
                       <circle cx="56" cy="56" r="46" stroke="#32213A" strokeWidth="12" fill="transparent" strokeOpacity="0.1" />
                       <circle 
                          cx="56" cy="56" r="46" stroke="#32213A" strokeWidth="12" fill="transparent"
                          strokeDasharray={289}
                          strokeDashoffset={289 - (289 * ((analytics.efficiency as number) / 100))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                       />
                    </svg>
                  </div>
               </div>
            </div>

            {/* Capital Map: Clustered Bar Visualizer */}
            <div className="bg-white border-4 border-[#32213A] p-7 rounded-[2.5rem] neo-pop-shadow">
               <div className="flex justify-between items-end mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60 text-left">Capital Map</h3>
                  <div className="text-right">
                     <span className="text-[8px] font-black uppercase text-[#32213A]/40 block mb-1 tracking-widest">Total Flow</span>
                     <span className="text-3xl font-black text-[#32213A] tracking-tighter leading-none">₹{analytics.totalSpend.toLocaleString()}</span>
                  </div>
               </div>
               
               <div className="space-y-6">
                  {Object.entries(analytics.categoryBreakdown).length > 0 ? (
                    Object.entries(analytics.categoryBreakdown)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([cat, amt]) => {
                         const pct = ((amt as number) / Math.max(1, analytics.totalSpend as number)) * 100;
                         return (
                           <div key={cat} className="space-y-2 text-left">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-[#32213A]">
                                 <span className="truncate pr-4">{cat}</span>
                                 <span className="bg-[#32213A]/5 px-2 py-0.5 rounded border border-[#32213A]/10">₹{(amt as number).toLocaleString()}</span>
                              </div>
                              <div className="h-6 border-4 border-[#32213A] bg-[#32213A]/5 rounded-lg overflow-hidden relative">
                                 <div 
                                    className="h-full bg-[#ADF7B6] border-r-4 border-[#32213A] transition-all duration-1000 ease-out flex items-center justify-end px-2" 
                                    style={{ width: `${pct}%` }}
                                 >
                                    {pct > 20 && <span className="text-[7px] font-black text-[#32213A]">{Math.round(pct)}%</span>}
                                 </div>
                              </div>
                           </div>
                         );
                      })
                  ) : (
                    <p className="py-12 text-[10px] italic font-black text-[#32213A]/20 uppercase tracking-widest text-center">Zero Transaction Flow</p>
                  )}
               </div>
            </div>

            {/* Sentiment Pulse: Heat Blocks */}
            <div className="bg-[#B892FF] border-4 border-[#32213A] p-7 rounded-[2.5rem] neo-pop-shadow">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60 text-left mb-6 px-1">Sentiment Pulse</h3>
               <div className="flex flex-wrap gap-4">
                  {Object.entries(analytics.moodCounts).length > 0 ? (
                    Object.entries(analytics.moodCounts)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([mood, count]) => {
                         const weight = ((count as number) / Math.max(1, analytics.totalMoods as number));
                         return (
                           <div 
                              key={mood} 
                              style={{ flex: `1 0 ${Math.max(40, weight * 100)}%` }}
                              className="bg-white border-4 border-[#32213A] p-5 rounded-3xl flex flex-col justify-between items-start transition-transform hover:scale-[1.02] active:scale-95"
                           >
                              <div className="w-full flex justify-between items-start mb-4">
                                 <span className="text-4xl font-black text-[#32213A] leading-none">{count as number}</span>
                                 <div className="w-5 h-5 rounded-full bg-[#B892FF] border-4 border-[#32213A]"></div>
                              </div>
                              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#32213A] leading-none">{mood}</span>
                           </div>
                         );
                      })
                  ) : (
                    <div className="w-full py-10 text-center opacity-30">
                       <p className="text-[10px] italic font-black text-[#32213A] uppercase tracking-widest">No Emotional Data Found</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Vault Logistics: JSON & Excel Controls */}
            <div className="bg-white border-4 border-[#32213A] p-7 rounded-[2.5rem] neo-pop-shadow">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60 text-left mb-6 px-1">Vault Logistics</h3>
               <div className="grid grid-cols-2 gap-4 mb-4">
                  <button 
                    onClick={() => auraStore.exportBackupJSON()}
                    className="py-4 bg-[#B892FF] border-4 border-[#32213A] text-white text-[9px] uppercase tracking-widest font-black rounded-2xl neo-pop-shadow active:translate-y-1 active:shadow-none transition-all"
                  >
                    Export JSON
                  </button>
                  <button 
                    onClick={onExport}
                    className="py-4 bg-[#ADF7B6] border-4 border-[#32213A] text-[#32213A] text-[9px] uppercase tracking-widest font-black rounded-2xl neo-pop-shadow active:translate-y-1 active:shadow-none transition-all"
                  >
                    Export Excel
                  </button>
               </div>
               <button 
                  onClick={handleImportClick}
                  className="w-full py-4 bg-white border-4 border-[#32213A] text-[#32213A] text-[9px] uppercase tracking-[0.3em] font-black rounded-2xl neo-pop-shadow active:translate-y-1 active:shadow-none transition-all"
               >
                 Import Backup (.json)
               </button>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".json" 
                  onChange={handleFileChange} 
                  className="hidden" 
               />
            </div>

            <button 
              onClick={onClearAll}
              className="w-full py-5 bg-white border-4 border-[#32213A] text-rose-500 rounded-[2rem] text-[11px] uppercase tracking-[0.4em] font-black hover:bg-rose-500 hover:text-white transition-all neo-pop-shadow active:translate-y-1 active:shadow-none mb-10"
            >
              Purge Vault Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
