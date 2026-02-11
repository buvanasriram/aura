import React, { useState, useMemo } from 'react';
import { VoiceEntry, Expense, MoodRecord, Task, IntentType } from '../types';

interface HistoryViewProps {
  entries: VoiceEntry[];
  expenses: Expense[];
  moods: MoodRecord[];
  tasks: Task[];
  onBack: () => void;
  onClearAll: () => void;
  onExport: () => void;
  onToggleTask: (taskId: string) => void;
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
  const gridStyle = { gridTemplateColumns: '75px 1.5fr 60px 65px' };
  const bgColor = filter === 'REMINDER' ? 'bg-[#F7EF81]' : 'bg-[#ADD2C2]';

  if (filteredTasks.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-[#32213A]/20">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/30 italic">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#32213A] overflow-hidden">
      <div 
        style={{ display: 'grid', ...gridStyle }} 
        className={`${bgColor} px-3 py-3 border-b-2 border-[#32213A]`}
      >
        {['Date', 'Headline', 'Prio', 'Status'].map(col => (
          <span key={col} className="text-[8px] font-black uppercase tracking-widest text-[#32213A] truncate pr-1">{col}</span>
        ))}
      </div>
      <div className="max-h-[58vh] overflow-y-auto no-scrollbar">
        {filteredTasks.map((task, idx) => (
          <div 
            key={task.id} 
            style={{ display: 'grid', ...gridStyle }}
            className={`px-3 py-3 items-center border-b border-[#32213A]/10 last:border-0 ${task.completed ? 'opacity-50' : ''} ${idx % 2 === 1 ? 'bg-[#D4D6B9]/10' : 'bg-white'}`}
          >
            <span className="text-[10px] font-black text-[#32213A] uppercase tracking-tighter leading-tight">
              {new Date(task.date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
            </span>
            <span className={`text-[10px] font-black text-[#32213A] uppercase tracking-tighter leading-tight break-words pr-2 ${task.completed ? 'line-through' : ''}`}>
              {task.title}
            </span>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-[#32213A]/10 w-fit ${task.priority === 'high' ? 'bg-rose-100 text-rose-600' : task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {task.priority.substring(0, 3)}
            </span>
            <button 
              onClick={() => onToggleTask(task.id)}
              className={`w-full py-1.5 rounded-lg border-2 border-[#32213A] flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_#32213A] ${task.completed ? 'bg-[#ADF7B6]' : 'bg-white'}`}
            >
              {task.completed ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <span className="text-[7px] font-black uppercase">Pend</span>
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
      case 'EXPENSE': return ['Amount', 'Category', 'Target Date', 'Details'];
      case 'MOOD': return ['Date', 'Vibe', 'Headline', 'Reason'];
      default: return ['Date', 'Headline', 'Vibe', 'Notes'];
    }
  };

  const getGridStyle = () => {
    switch (intent) {
      case 'EXPENSE': return { gridTemplateColumns: '75px 0.8fr 75px 1.5fr' };
      case 'MOOD': return { gridTemplateColumns: '75px 65px 1fr 1.5fr' };
      default: return { gridTemplateColumns: '75px 1fr 65px 1.5fr' };
    }
  };

  const getRowData = (entry: VoiceEntry) => {
    const e = entry.extractedEntities;
    const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' });
    
    switch (intent) {
      case 'EXPENSE':
        return [
          `${e.amount || 0} INR`,
          e.category || 'Other',
          e.date || dateStr,
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
      <div className="py-20 text-center border-2 border-dashed border-[#32213A]/20">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/30 italic">No records found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#32213A] overflow-hidden">
      <div 
        style={{ display: 'grid', ...gridStyle }} 
        className={`${getIntentColor()} px-3 py-3 border-b-2 border-[#32213A]`}
      >
        {columns.map(col => (
          <span key={col} className="text-[8px] font-black uppercase tracking-widest text-[#32213A] truncate pr-1">{col}</span>
        ))}
      </div>
      <div className="max-h-[58vh] overflow-y-auto no-scrollbar">
        {entries.map((entry, idx) => (
          <div 
            key={entry.id} 
            style={{ display: 'grid', ...gridStyle }}
            className={`px-3 py-3 items-start border-b border-[#32213A]/10 last:border-0 ${idx % 2 === 1 ? 'bg-[#D4D6B9]/10' : 'bg-white'}`}
          >
            {getRowData(entry).map((val, i) => (
              <span key={i} className="text-[10px] font-black text-[#32213A] uppercase tracking-tighter leading-tight break-words whitespace-normal pr-2">
                {val}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const HistoryView: React.FC<HistoryViewProps> = ({ entries, expenses, moods, tasks, onBack, onClearAll, onExport, onToggleTask }) => {
  const [mode, setMode] = useState<VaultMode>('ARCHIVES');
  const [filter, setFilter] = useState<IntentType>('EXPENSE');

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

    // Fix: Add explicit number assertions and strictly type reduce initial values to resolve arithmetic errors
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

  const intents: IntentType[] = ['EXPENSE', 'TODO', 'REMINDER', 'MOOD', 'NOTE'];

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#D4D6B9] max-w-md mx-auto border-x-4 border-[#32213A]/5">
      <header className="px-6 py-8 flex justify-between items-center shrink-0">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tighter text-[#32213A]">Vault Archives</h2>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={onExport} title="Export Backup" className="w-10 h-10 bg-white border-2 border-[#32213A] rounded-xl flex items-center justify-center text-[#32213A] active:scale-90 neo-pop-shadow transition-all">
             <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/></svg>
           </button>
           <button onClick={onBack} title="Exit" className="w-10 h-10 bg-[#32213A] rounded-xl flex items-center justify-center text-white active:scale-90 transition-all">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      </header>

      <div className="flex px-6 gap-3 mb-4 shrink-0">
        <button 
          onClick={() => setMode('ARCHIVES')}
          className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-black rounded-xl border-4 transition-all ${mode === 'ARCHIVES' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10'}`}
        >
          Archives
        </button>
        <button 
          onClick={() => setMode('INTELLIGENCE')}
          className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-black rounded-xl border-4 transition-all ${mode === 'INTELLIGENCE' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10'}`}
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
          <div className="space-y-8 pb-10">
            {/* Date Range Master Control */}
            <div className="bg-white border-4 border-[#32213A] p-4 flex gap-3 neo-pop-shadow">
              <div className="flex-1 space-y-1">
                <label className="text-[8px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Start Range</label>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-[#32213A]/5 border-2 border-[#32213A] px-2 py-2 text-[10px] font-black text-[#32213A]"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[8px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">End Range</label>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-[#32213A]/5 border-2 border-[#32213A] px-2 py-2 text-[10px] font-black text-[#32213A]"
                />
              </div>
            </div>

            {/* Task Engine: High-Contrast Geometric Ring */}
            <div className="bg-[#ADD2C2] border-4 border-[#32213A] p-6 neo-pop-shadow relative overflow-hidden">
               <div className="flex justify-between items-center relative z-10">
                  <div className="text-left">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60">Task Engine</h3>
                     <p className="text-4xl font-black text-[#32213A] tracking-tighter leading-none mt-1">{analytics.efficiency}%</p>
                     <div className="flex items-center gap-2 mt-2">
                        <span className="bg-[#32213A] text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">{analytics.completedTasks} Done</span>
                        <span className="text-[8px] font-black uppercase text-[#32213A]/40">of {analytics.totalTasks}</span>
                     </div>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-24 h-24 rotate-[-90deg]">
                       <circle cx="48" cy="48" r="40" stroke="#32213A" strokeWidth="12" fill="transparent" strokeOpacity="0.1" />
                       <circle 
                          cx="48" cy="48" r="40" stroke="#32213A" strokeWidth="12" fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * ((analytics.efficiency as number) / 100))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                       />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="w-10 h-10 border-2 border-[#32213A]/20 rounded-full"></div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Capital Map: Clustered Bar Visualizer */}
            <div className="bg-white border-4 border-[#32213A] p-6 neo-pop-shadow">
               <div className="flex justify-between items-end mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60 text-left">Capital Map</h3>
                  <div className="text-right">
                     <span className="text-[8px] font-black uppercase text-[#32213A]/40 block mb-1">Total Flow</span>
                     <span className="text-3xl font-black text-[#32213A] tracking-tighter leading-none">₹{analytics.totalSpend.toLocaleString()}</span>
                  </div>
               </div>
               
               <div className="space-y-6">
                  {Object.entries(analytics.categoryBreakdown).length > 0 ? (
                    Object.entries(analytics.categoryBreakdown)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([cat, amt]) => {
                         // Fix: Use explicit number assertions to resolve arithmetic errors
                         const pct = ((amt as number) / Math.max(1, analytics.totalSpend as number)) * 100;
                         return (
                           <div key={cat} className="group">
                              <div className="flex justify-between items-center mb-1.5">
                                 <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#ADF7B6] border-2 border-[#32213A] shrink-0"></div>
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-[#32213A] truncate">{cat}</span>
                                 </div>
                                 <span className="text-[9px] font-black text-[#32213A] bg-[#32213A]/5 px-2 py-0.5 rounded border border-[#32213A]/10">₹{(amt as number).toLocaleString()}</span>
                              </div>
                              <div className="h-6 border-4 border-[#32213A] bg-[#32213A]/5 relative overflow-hidden">
                                 <div 
                                    className="h-full bg-[#ADF7B6] border-r-4 border-[#32213A] transition-all duration-1000 ease-out flex items-center px-2" 
                                    style={{ width: `${pct}%` }}
                                 >
                                    {pct > 15 && <span className="text-[7px] font-black text-[#32213A]">{Math.round(pct)}%</span>}
                                 </div>
                              </div>
                           </div>
                         );
                      })
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center opacity-20">
                       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#32213A" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /></svg>
                       <p className="text-[10px] italic font-black text-[#32213A] uppercase tracking-widest mt-4 text-center">Zero Transaction Flow</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Sentiment Pulse: Proportional Vibe Blocks (Heat Map Effect) */}
            <div className="bg-[#B892FF] border-4 border-[#32213A] p-6 neo-pop-shadow">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60 text-left mb-6 px-1">Sentiment Pulse</h3>
               <div className="flex flex-wrap gap-3">
                  {Object.entries(analytics.moodCounts).length > 0 ? (
                    Object.entries(analytics.moodCounts)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([mood, count]) => {
                         // Fix: Use explicit number assertions and safeguard against division by zero
                         const weight = ((count as number) / Math.max(1, analytics.totalMoods as number));
                         // Dynamic flex sizing creates the "heat map" proportional block effect
                         return (
                           <div 
                              key={mood} 
                              style={{ flex: `1 0 ${Math.max(30, (weight as number) * 100)}%` }}
                              className="bg-white border-4 border-[#32213A] p-4 flex flex-col justify-between items-start transition-transform active:scale-95"
                           >
                              <div className="flex justify-between items-start w-full">
                                 <span className="text-3xl font-black text-[#32213A] leading-none mb-2">{count as number}</span>
                                 <div className="w-4 h-4 rounded-full bg-[#B892FF] border-2 border-[#32213A]"></div>
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-widest text-[#32213A] leading-none">{mood}</span>
                           </div>
                         );
                      })
                  ) : (
                    <div className="w-full py-12 text-center opacity-30">
                       <p className="text-[10px] italic font-black text-[#32213A] uppercase tracking-widest">No Emotional Data Found</p>
                    </div>
                  )}
               </div>
            </div>

            <button 
              onClick={onClearAll}
              className="w-full py-5 bg-white border-4 border-[#32213A] text-rose-500 text-[11px] uppercase tracking-[0.4em] font-black hover:bg-rose-500 hover:text-white transition-all neo-pop-shadow active:translate-y-1 active:shadow-none mb-10"
            >
              Purge All Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};