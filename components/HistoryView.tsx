
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

type VaultMode = 'ARCHIVES' | 'INSIGHTS' | 'IMPORT_EXPORT';

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

const formatDateShort = (dateInput: string | number) => {
  if (!dateInput) return '--/--/--';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  });
};

const getMoodEmoji = (mood: string) => {
  const m = mood.toLowerCase();
  if (m.includes('happ') || m.includes('good') || m.includes('glad')) return '😊';
  if (m.includes('sad') || m.includes('upset') || m.includes('unhapp')) return '😢';
  if (m.includes('stress') || m.includes('pressur') || m.includes('overwhel')) return '😫';
  if (m.includes('tire') || m.includes('sleep') || m.includes('exhaust')) return '😴';
  if (m.includes('awesom') || m.includes('amaz') || m.includes('stok') || m.includes('incredi')) return '🤩';
  if (m.includes('excit') || m.includes('hyp') || m.includes('eager')) return '😃';
  if (m.includes('angr') || m.includes('annoy') || m.includes('mad')) return '😡';
  if (m.includes('calm') || m.includes('relax') || m.includes('chill') || m.includes('peac')) return '😌';
  if (m.includes('anxi') || m.includes('nerv') || m.includes('worr')) return '😨';
  if (m.includes('great') || m.includes('fant')) return '😁';
  if (m.includes('neutr') || m.includes('fine') || m.includes('okay')) return '😐';
  if (m.includes('bor')) return '😑';
  if (m.includes('lov') || m.includes('ador')) return '🥰';
  if (m.includes('sick') || m.includes('ill') || m.includes('unwell')) return '🤒';
  if (m.includes('focus') || m.includes('produc') || m.includes('work')) return '🎯';
  if (m.includes('confus') || m.includes('lost')) return '😕';
  if (m.includes('energet') || m.includes('electr')) return '⚡';
  return '😶'; 
};

const TaskTable = ({ tasks, filter, onToggleTask }: { tasks: Task[], filter: IntentType, onToggleTask: (id: string) => void }) => {
  const filteredTasks = tasks.filter(t => (filter === 'REMINDER' ? t.category === 'Reminder' : t.category !== 'Reminder'));
  const gridStyle = { gridTemplateColumns: '70px 1fr 60px 75px' };
  const bgColor = filter === 'REMINDER' ? 'bg-[#F7EF81]' : 'bg-[#ADD2C2]';

  if (filteredTasks.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-[#32213A]/10">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/30 italic">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#32213A] overflow-hidden">
      <div 
        style={{ display: 'grid', ...gridStyle }} 
        className={`${bgColor} px-4 py-3 border-b border-[#32213A]`}
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
            className={`px-4 py-4 items-center border-b border-[#32213A]/10 last:border-0 transition-all ${task.completed ? 'opacity-40' : 'opacity-100'} ${idx % 2 === 1 ? 'bg-[#D4D6B9]/10' : 'bg-white'}`}
          >
            <span className="text-[10px] font-black text-[#32213A] uppercase tracking-tighter">
              {formatDateShort(task.date)}
            </span>
            <span className={`text-[10px] font-black text-[#32213A] uppercase tracking-tighter pr-2 truncate ${task.completed ? 'line-through' : ''}`}>
              {task.title}
            </span>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-[#32213A] w-fit ${task.priority === 'high' ? 'bg-rose-100 text-rose-600' : task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {task.priority.substring(0, 3)}
            </span>
            <button 
              onClick={() => onToggleTask(task.id)}
              className={`w-full py-2 rounded-xl border border-[#32213A] flex items-center justify-center transition-all active:scale-90 ${task.completed ? 'bg-[#ADF7B6]' : 'bg-white'}`}
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
      case 'EXPENSE': return ['Date', 'Category', 'Details', 'Amount'];
      case 'MOOD': return ['Date', 'Vibe', 'Headline', 'Reason'];
      case 'NOTE': return ['Date', 'Headline', 'Vibe', 'Notes'];
      default: return ['Date', 'Headline', 'Vibe', 'Notes'];
    }
  };

  const getGridStyle = () => {
    switch (intent) {
      case 'EXPENSE': return { gridTemplateColumns: '70px 0.8fr 1.5fr 80px' };
      case 'MOOD': return { gridTemplateColumns: '70px 60px 1fr 1.5fr' };
      case 'NOTE': return { gridTemplateColumns: '70px 1fr 60px 1.5fr' };
      default: return { gridTemplateColumns: '70px 1fr 60px 1.5fr' };
    }
  };

  const getRowData = (entry: VoiceEntry) => {
    const e = entry.extractedEntities;
    const captureDate = formatDateShort(entry.createdAt);
    
    switch (intent) {
      case 'EXPENSE':
        return [
          e.date ? formatDateShort(e.date) : captureDate,
          e.category || 'Other',
          e.headline || e.details || entry.rawText,
          `₹${(e.amount || 0).toLocaleString()}`
        ];
      case 'MOOD':
        return [
          captureDate,
          e.vibe || 'Neutral',
          e.headline || 'Mood',
          e.reason || e.details || '-'
        ];
      case 'NOTE':
        return [
          captureDate,
          e.headline || 'Note',
          e.vibe || '-',
          entry.rawText
        ];
      default:
        return [
          captureDate,
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
      case 'NOTE': return 'bg-white';
      default: return 'bg-white';
    }
  };

  const sortedEntries = useMemo(() => {
    if (intent === 'EXPENSE') {
      return [...entries].sort((a, b) => (b.extractedEntities.amount || 0) - (a.extractedEntities.amount || 0));
    }
    return entries;
  }, [entries, intent]);

  const totalExpenseAmount = useMemo(() => {
    if (intent !== 'EXPENSE') return 0;
    return entries.reduce((sum, entry) => sum + (entry.extractedEntities.amount || 0), 0);
  }, [entries, intent]);

  const columns = getColumns();
  const gridStyle = getGridStyle();

  if (sortedEntries.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-[#32213A]/10">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/30 italic">No records found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#32213A] overflow-hidden">
      <div 
        style={{ display: 'grid', ...gridStyle }} 
        className={`${getIntentColor()} px-4 py-3 border-b border-[#32213A]`}
      >
        {columns.map((col, i) => (
          <span key={col} className={`text-[8px] font-black uppercase tracking-widest text-[#32213A] truncate ${intent === 'EXPENSE' && i === 3 ? 'text-right' : 'text-left'}`}>
            {col}
          </span>
        ))}
      </div>
      <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
        {sortedEntries.map((entry, idx) => (
          <div 
            key={entry.id} 
            style={{ display: 'grid', ...gridStyle }}
            className={`px-4 py-4 items-start border-b border-[#32213A]/10 last:border-0 ${idx % 2 === 1 ? 'bg-[#D4D6B9]/10' : 'bg-white'}`}
          >
            {getRowData(entry).map((val, i) => (
              <span key={i} className={`text-[10px] font-black text-[#32213A] uppercase tracking-tighter leading-tight break-words pr-2 ${intent === 'EXPENSE' && i === 3 ? 'text-right pr-0' : 'text-left'}`}>
                {val}
              </span>
            ))}
          </div>
        ))}
        {intent === 'EXPENSE' && (
          <div 
            style={{ display: 'grid', ...gridStyle }}
            className="px-4 py-4 items-center border-t-2 border-[#32213A] bg-[#ADF7B6]/30 sticky bottom-0"
          >
            <span className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#32213A] text-right pr-4">Total Amount</span>
            <span className="text-[10px] font-black text-[#32213A] text-right">₹{totalExpenseAmount.toLocaleString()}</span>
          </div>
        )}
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

  const isDateInRange = (dateInput: string | number) => {
    if (!dateInput) return false;
    const d = new Date(dateInput).getTime();
    const start = new Date(`${fromDate}T00:00:00`).getTime();
    const end = new Date(`${toDate}T23:59:59.999`).getTime();
    return d >= start && d <= end;
  };

  const analytics = useMemo((): AnalyticsData => {
    const filteredExpenses = expenses.filter(e => isDateInRange(e.date));
    const filteredMoods = moods.filter(m => isDateInRange(m.createdAt));
    const filteredTasksInRange = tasks.filter(t => isDateInRange(t.date) && t.category !== 'Reminder');

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

    return { totalSpend, categoryBreakdown, moodCounts, totalMoods, pendingTasks, completedTasks, efficiency, totalTasks };
  }, [expenses, moods, tasks, fromDate, toDate]);

  const filteredEntriesForArchives = useMemo(() => {
    return entries.filter(e => {
      const logicalDate = e.extractedEntities?.date || e.createdAt;
      return e.intent === filter && isDateInRange(logicalDate);
    });
  }, [entries, filter, fromDate, toDate]);

  const filteredTasksForArchives = useMemo(() => {
    return tasks.filter(t => isDateInRange(t.date));
  }, [tasks, fromDate, toDate]);

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
        onImportState(); 
        alert("Import successful! New entries have been added to your detailed notes.");
      } catch (err) {
        alert("Import failed. Please check the JSON format.");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const intents: IntentType[] = ['EXPENSE', 'TODO', 'REMINDER', 'MOOD', 'NOTE'];

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#D4D6B9] max-w-md mx-auto border-x-4 border-[#32213A]/5">
      <header className="px-6 pt-10 pb-6 flex justify-between items-center shrink-0">
        <div className="text-left">
          <h2 className="text-4xl font-black tracking-tighter text-[#32213A]">Detailed notes</h2>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={onBack} title="Exit" className="w-12 h-12 bg-[#32213A] rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all shadow-lg">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      </header>

      {/* TAB NAVIGATION */}
      <div className="flex px-6 gap-3 mb-4 shrink-0">
        <button 
          onClick={() => setMode('ARCHIVES')}
          className={`flex-1 py-4 text-[10px] uppercase tracking-widest font-black rounded-[1.25rem] border-[3px] transition-all neo-pop-shadow active:translate-y-0.5 ${mode === 'ARCHIVES' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10 shadow-none'}`}
        >
          Archives
        </button>
        <button 
          onClick={() => setMode('INSIGHTS')}
          className={`flex-1 py-4 text-[10px] uppercase tracking-widest font-black rounded-[1.25rem] border-[3px] transition-all neo-pop-shadow active:translate-y-0.5 ${mode === 'INSIGHTS' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10 shadow-none'}`}
        >
          Insights
        </button>
        <button 
          onClick={() => setMode('IMPORT_EXPORT')}
          className={`flex-1 py-4 text-[10px] uppercase tracking-widest font-black rounded-[1.25rem] border-[3px] transition-all neo-pop-shadow active:translate-y-0.5 ${mode === 'IMPORT_EXPORT' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10 shadow-none'}`}
        >
          Import/Export
        </button>
      </div>

      {/* DATE FILTER */}
      {(mode === 'ARCHIVES' || mode === 'INSIGHTS') && (
        <div className="px-6 mb-6 shrink-0">
           <div className="bg-white border-2 border-[#32213A] p-4 rounded-[1.5rem] flex gap-4 neo-pop-shadow">
              <div className="flex-1 space-y-1">
                <label className="text-[8px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Start</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full bg-[#32213A]/5 border border-[#32213A] rounded-xl px-2 py-2 text-[10px] font-black text-[#32213A]" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[8px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">End</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full bg-[#32213A]/5 border border-[#32213A] rounded-xl px-2 py-2 text-[10px] font-black text-[#32213A]" />
              </div>
            </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
        {mode === 'ARCHIVES' ? (
          <div className="space-y-6">
            <div className="flex gap-1 flex-wrap justify-start items-center pb-4">
              {intents.map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-2.5 rounded-2xl text-[9px] uppercase tracking-widest font-black border-2 transition-all flex items-center gap-2 ${filter === f ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white border-[#32213A]/15 text-[#32213A]/40'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            {(filter === 'TODO' || filter === 'REMINDER') ? (
              <TaskTable tasks={filteredTasksForArchives} filter={filter} onToggleTask={onToggleTask} />
            ) : (
              <IntentTable intent={filter} entries={filteredEntriesForArchives} />
            )}
          </div>
        ) : mode === 'INSIGHTS' ? (
          <div className="space-y-8">
            <div className="bg-[#ADD2C2] border border-[#32213A] p-7 rounded-[3rem] neo-pop-shadow relative overflow-hidden">
               <div className="flex justify-between items-center relative z-10">
                  <div className="text-left">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60">Task Engine</h3>
                     <p className="text-5xl font-black text-[#32213A] tracking-tighter leading-none mt-2">{analytics.efficiency}%</p>
                     <div className="flex items-center gap-2 mt-4">
                        <span className="bg-[#32213A] text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter">{analytics.completedTasks} Done</span>
                        <span className="text-[8px] font-black uppercase text-[#32213A]/40">of {analytics.totalTasks}</span>
                     </div>
                  </div>
                  <div className="relative">
                    <svg className="w-24 h-24 rotate-[-90deg]" viewBox="0 0 100 100">
                       <circle cx="50" cy="50" r="42" stroke="#32213A" strokeWidth="12" fill="transparent" strokeOpacity="0.1" />
                       <circle 
                          cx="50" cy="50" r="42" stroke="#32213A" strokeWidth="12" fill="transparent"
                          strokeDasharray={264}
                          strokeDashoffset={264 - (264 * ((analytics.efficiency as number) / 100))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                       />
                    </svg>
                  </div>
               </div>
            </div>

            <div className="bg-white border border-[#32213A] p-8 rounded-[3rem] neo-pop-shadow">
               <div className="flex justify-between items-end mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60 text-left">Capital Map</h3>
                  <div className="text-right">
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
                                 <span>₹{(amt as number).toLocaleString()}</span>
                              </div>
                              <div className="h-6 border border-[#32213A] bg-[#32213A]/5 rounded-lg overflow-hidden relative">
                                 <div 
                                    className="h-full bg-[#ADF7B6] border-r border-[#32213A] transition-all duration-1000 ease-out" 
                                    style={{ width: `${pct}%` }}
                                 ></div>
                              </div>
                           </div>
                         );
                      })
                  ) : (
                    <p className="py-12 text-[10px] italic font-black text-[#32213A]/20 uppercase tracking-widest text-center">Zero Transaction Flow</p>
                  )}
               </div>
            </div>

            <div className="bg-[#B892FF] border border-[#32213A] p-8 rounded-[3rem] neo-pop-shadow">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/60 text-left mb-6 px-1">Sentiment Pulse</h3>
               <div className="grid grid-cols-2 gap-4">
                  {Object.entries(analytics.moodCounts).length > 0 ? (
                    Object.entries(analytics.moodCounts).map(([mood, count]) => (
                       <div key={mood} className="flex flex-col items-center justify-center transition-all active:scale-95">
                          <span className="text-5xl mb-2 leading-none" role="img" aria-label={mood}>
                             {getMoodEmoji(mood)}
                          </span>
                          <span className="text-2xl font-black text-[#32213A] tracking-tighter">
                             {count as number}
                          </span>
                       </div>
                    ))
                  ) : (
                    <p className="col-span-2 py-10 text-center text-[10px] italic font-black text-[#32213A]/40 uppercase tracking-widest">No Emotional Data Found</p>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-[#32213A] p-8 rounded-[3rem] neo-pop-shadow text-left">
               <h3 className="text-xl font-black text-[#32213A] uppercase tracking-tighter mb-2">Vault Logistics</h3>
               <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/40 mb-8">System Portability Controls</p>
               
               <div className="space-y-4">
                  <button 
                    onClick={() => auraStore.exportBackupJSON()}
                    className="w-full py-5 bg-[#B892FF] border-2 border-[#32213A] text-white text-[11px] uppercase tracking-[0.3em] font-black rounded-2xl neo-pop-shadow active:translate-y-1 active:shadow-none transition-all"
                  >
                    Export to JSON
                  </button>
                  <button 
                    onClick={onExport}
                    className="w-full py-5 bg-[#ADF7B6] border-2 border-[#32213A] text-[#32213A] text-[11px] uppercase tracking-[0.3em] font-black rounded-2xl neo-pop-shadow active:translate-y-1 active:shadow-none transition-all"
                  >
                    Export to Excel
                  </button>
                  <div className="py-6 flex items-center gap-4">
                    <div className="flex-1 h-1 bg-[#32213A]/10 rounded-full"></div>
                    <span className="text-[10px] font-black text-[#32213A]/30 uppercase tracking-widest">Restoration</span>
                    <div className="flex-1 h-1 bg-[#32213A]/10 rounded-full"></div>
                  </div>
                  <button 
                    onClick={handleImportClick}
                    className="w-full py-5 bg-white border-2 border-[#32213A] text-[#32213A] text-[11px] uppercase tracking-[0.3em] font-black rounded-2xl neo-pop-shadow active:translate-y-1 active:shadow-none transition-all"
                  >
                    Import from JSON
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept=".json" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
               </div>
            </div>

            <button 
              onClick={onClearAll}
              className="w-full py-6 bg-white border-2 border-[#32213A] text-rose-500 rounded-[2.5rem] text-[11px] uppercase tracking-[0.4em] font-black hover:bg-rose-500 hover:text-white transition-all neo-pop-shadow active:translate-y-1 active:shadow-none mb-4"
            >
              Purge Notes Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
