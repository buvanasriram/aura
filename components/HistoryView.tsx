
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
}

type VaultMode = 'ARCHIVES' | 'INTELLIGENCE';

const IntentTable = ({ intent, entries }: { intent: IntentType, entries: VoiceEntry[] }) => {
  const getColumns = () => {
    switch (intent) {
      case 'EXPENSE': return ['Amount', 'Category', 'Target Date', 'Details'];
      case 'TODO':
      case 'REMINDER': return ['Due Date', 'Headline', 'Priority', 'Status'];
      case 'MOOD': return ['Date', 'Vibe', 'Headline', 'Reason'];
      default: return ['Date', 'Headline', 'Vibe', 'Notes'];
    }
  };

  const getGridStyle = () => {
    switch (intent) {
      case 'EXPENSE': return { gridTemplateColumns: '75px 0.8fr 75px 1.5fr' };
      case 'TODO':
      case 'REMINDER': return { gridTemplateColumns: '75px 1.5fr 60px 55px' };
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
      case 'TODO':
      case 'REMINDER':
        return [
          e.date || 'TBD',
          e.headline || entry.rawText,
          e.priority || 'med',
          e.completed ? 'Done' : 'Pend'
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
      case 'TODO': return 'bg-[#ADD2C2]';
      case 'REMINDER': return 'bg-[#F7EF81]';
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

export const HistoryView: React.FC<HistoryViewProps> = ({ entries, expenses, moods, tasks, onBack, onClearAll, onExport }) => {
  const [mode, setMode] = useState<VaultMode>('ARCHIVES');
  const [filter, setFilter] = useState<IntentType>('EXPENSE');

  // Date Filtering State
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayStr);

  const analytics = useMemo(() => {
    const start = new Date(fromDate).getTime();
    const end = new Date(toDate).setHours(23, 59, 59, 999);

    // Filtered source data based on date range
    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.date).getTime();
      return d >= start && d <= end;
    });

    const filteredMoods = moods.filter(m => {
      const d = new Date(m.createdAt).getTime();
      return d >= start && d <= end;
    });

    const filteredTasks = tasks.filter(t => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end;
    });

    // Calculations
    const totalSpend = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryBreakdown = filteredExpenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const moodCounts = filteredMoods.reduce((acc: any, m) => {
      acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
      return acc;
    }, {});

    const pendingTasks = filteredTasks.filter(t => !t.completed).length;
    const completedTasks = filteredTasks.filter(t => t.completed).length;

    return { 
      totalSpend, 
      categoryBreakdown, 
      moodCounts, 
      pendingTasks, 
      completedTasks 
    };
  }, [expenses, moods, tasks, fromDate, toDate]);

  // Fix: Added filteredEntries to solve the 'Cannot find name filteredEntries' error at line 228
  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.intent === filter);
  }, [entries, filter]);

  const intents: IntentType[] = ['EXPENSE', 'TODO', 'REMINDER', 'MOOD', 'NOTE'];

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#D4D6B9] max-w-md mx-auto border-x-4 border-[#32213A]/5">
      <header className="px-6 py-8 flex justify-between items-center shrink-0">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tighter text-[#32213A]">Detailed notes</h2>
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
            <IntentTable intent={filter} entries={filteredEntries} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Date Range Picker */}
            <div className="bg-white border-2 border-[#32213A] p-4 flex gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[8px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">From</label>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-[#32213A]/5 border border-[#32213A] px-2 py-2 text-[10px] font-black text-[#32213A]"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[8px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">To</label>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-[#32213A]/5 border border-[#32213A] px-2 py-2 text-[10px] font-black text-[#32213A]"
                />
              </div>
            </div>

            {/* Task Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#ADD2C2] border-2 border-[#32213A] p-5 text-left">
                <span className="text-[8px] uppercase tracking-widest text-[#32213A]/60 font-black block mb-1">Pending Tasks</span>
                <p className="text-3xl font-black text-[#32213A]">{analytics.pendingTasks}</p>
              </div>
              <div className="bg-white border-2 border-[#32213A] p-5 text-left">
                <span className="text-[8px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-1">Completed</span>
                <p className="text-3xl font-black text-[#32213A]">{analytics.completedTasks}</p>
              </div>
            </div>

            {/* Mood Frequency */}
            <div className="bg-[#B892FF] border-2 border-[#32213A] p-5 text-left">
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-[#32213A]/60 font-black mb-4 px-1">Mood Distribution</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.moodCounts).length > 0 ? (
                  Object.entries(analytics.moodCounts).map(([mood, count]) => (
                    <div key={mood} className="bg-white px-3 py-1.5 border-2 border-[#32213A] flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-tighter text-[#32213A]">{mood}</span>
                      <div className="w-5 h-5 bg-[#32213A] text-white rounded-full flex items-center justify-center text-[9px] font-black leading-none">{count as any}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-[9px] italic text-[#32213A]/60 font-black uppercase">No mood reflections in range</p>
                )}
              </div>
            </div>

            {/* Category-wise Expenses */}
            <div className="bg-white border-2 border-[#32213A] overflow-hidden">
               <div className="bg-[#ADF7B6] px-4 py-3 border-b-2 border-[#32213A]">
                 <h3 className="text-[9px] uppercase tracking-[0.3em] text-[#32213A] font-black">Capital Utilization</h3>
               </div>
               <div className="p-0">
                  <div className="grid grid-cols-2 px-4 py-2 border-b border-[#32213A]/10 bg-[#32213A]/5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#32213A]/40">Category</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#32213A]/40 text-right">Amount</span>
                  </div>
                  {Object.entries(analytics.categoryBreakdown).length > 0 ? (
                    Object.entries(analytics.categoryBreakdown).map(([cat, amt]) => (
                      <div key={cat} className="grid grid-cols-2 px-4 py-3 border-b border-[#32213A]/5 last:border-0">
                        <span className="text-[10px] font-black uppercase text-[#32213A]">{cat}</span>
                        <span className="text-[10px] font-black text-[#32213A] text-right">₹{Number(amt).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center italic text-[#32213A]/20 text-[10px] uppercase font-black">No transactions recorded</div>
                  )}
                  <div className="grid grid-cols-2 px-4 py-4 bg-[#32213A] text-white">
                    <span className="text-[10px] font-black uppercase tracking-widest">Grand Total</span>
                    <span className="text-[14px] font-black text-right tracking-tighter leading-none">₹{analytics.totalSpend.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            <button 
              onClick={onClearAll}
              className="w-full py-4 bg-white border-2 border-rose-500/30 text-rose-500 text-[10px] uppercase tracking-[0.4em] font-black hover:bg-rose-500 hover:text-white transition-all mt-4"
            >
              Purge All Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
