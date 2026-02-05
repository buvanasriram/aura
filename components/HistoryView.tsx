
import React, { useState, useMemo } from 'react';
import { VoiceEntry, Expense, MoodRecord, Task } from '../types';

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

const NeoPopIcon = ({ type, className }: { type: string, className?: string }) => {
  const iconBase = `shrink-0 neo-pop-shadow ${className}`;
  switch (type) {
    case 'EXPENSE': 
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#FF5F5F" stroke="#32213A" strokeWidth="2.5"/>
          <path d="M12 7V17M7 12H17" stroke="#32213A" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      );
    case 'TODO':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#4ADE80" stroke="#32213A" strokeWidth="2.5"/>
          <path d="M8 12L11 15L16 9" stroke="#32213A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'MOOD':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#F472B6" stroke="#32213A" strokeWidth="2.5"/>
          <path d="M7 12L9 12L11 8L13 16L15 12L17 12" stroke="#32213A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
};

export const HistoryView: React.FC<HistoryViewProps> = ({ entries, expenses, moods, tasks, onBack, onClearAll, onExport }) => {
  const [mode, setMode] = useState<VaultMode>('INTELLIGENCE');
  const [filter, setFilter] = useState<string>('ALL');

  const filteredEntries = useMemo(() => {
    return filter === 'ALL' 
      ? entries 
      : entries.filter(e => e.intent === filter);
  }, [entries, filter]);

  const getExpenseForEntry = (entryId: string) => expenses.find(exp => exp.entryId === entryId);
  const getMoodForEntry = (entryId: string) => moods.find(m => m.entryId === entryId);

  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const dayOfMonth = now.getDate();

    const monthlyBurn = expenses.reduce((sum, e) => {
      const d = new Date(e.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + e.amount;
      }
      return sum;
    }, 0);

    const dailyAvg = (monthlyBurn / Math.max(1, dayOfMonth)).toFixed(0);

    const categoryBreakdown = expenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const topCategory = Object.entries(categoryBreakdown)
      .sort(([, a]: any, [, b]: any) => b - a)[0];

    const moodsSummary = moods.reduce((acc: any, m) => {
      acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
      return acc;
    }, {});

    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      highPriority: tasks.filter(t => t.priority === 'high' && !t.completed).length
    };

    return { monthlyBurn, dailyAvg, topCategory, moodsSummary, taskStats, categoryBreakdown };
  }, [expenses, moods, tasks]);

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#D4D6B9]">
      {/* Top Header */}
      <header className="px-6 py-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#32213A]">Vault</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#32213A]/40">Persistent Data</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={onExport} className="w-12 h-12 bg-white border-2 border-[#32213A] rounded-2xl flex items-center justify-center text-[#32213A] active:scale-90 neo-pop-shadow">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
           </button>
           <button onClick={onBack} className="w-12 h-12 bg-[#32213A] rounded-2xl flex items-center justify-center text-white active:scale-90">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      </header>

      {/* Tab Selector */}
      <div className="flex px-6 gap-4 mb-6">
        <button 
          onClick={() => setMode('INTELLIGENCE')}
          className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-black rounded-2xl border-4 transition-all ${mode === 'INTELLIGENCE' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10'}`}
        >
          Insights
        </button>
        <button 
          onClick={() => setMode('ARCHIVES')}
          className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-black rounded-2xl border-4 transition-all ${mode === 'ARCHIVES' ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10'}`}
        >
          History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
        {mode === 'INTELLIGENCE' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border-4 border-[#32213A] p-6 rounded-[2.5rem] shadow-[6px_6px_0px_#32213A]">
                <span className="text-[9px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-2">Monthly Spend</span>
                <p className="text-2xl font-black text-[#32213A]">₹{analytics.monthlyBurn}</p>
              </div>
              <div className="bg-white border-4 border-[#32213A] p-6 rounded-[2.5rem] shadow-[6px_6px_0px_#32213A]">
                <span className="text-[9px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-2">Daily Average</span>
                <p className="text-2xl font-black text-[#32213A]">₹{analytics.dailyAvg}</p>
              </div>
            </div>

            {/* Allocation */}
            <div className="bg-white border-4 border-[#32213A] p-8 rounded-[3rem] shadow-[8px_8px_0px_#32213A]">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#32213A]/40 font-black mb-6">Capital Allocation</h3>
              <div className="space-y-5">
                {Object.entries(analytics.categoryBreakdown).length > 0 ? (
                  Object.entries(analytics.categoryBreakdown).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4).map(([cat, amt]: any) => (
                    <div key={cat} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-black text-[#32213A] uppercase tracking-tighter">
                        <span>{cat}</span>
                        <span>₹{amt}</span>
                      </div>
                      <div className="h-3 bg-[#D4D6B9]/20 rounded-full border-2 border-[#32213A] overflow-hidden">
                        <div 
                          className="h-full bg-[#32213A] rounded-full" 
                          style={{ width: `${Math.min(100, (amt / Math.max(1, analytics.monthlyBurn)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-[#32213A]/20">No data synthesized.</p>
                )}
              </div>
            </div>

            <button 
              onClick={onClearAll}
              className="w-full py-5 bg-white border-4 border-rose-500/20 text-rose-500 text-[10px] uppercase tracking-[0.4em] font-black hover:bg-rose-500 hover:text-white transition-all rounded-[2rem] mt-8"
            >
              Purge Vault
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filter Bar */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {['ALL', 'EXPENSE', 'TODO', 'REMINDER', 'MOOD'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 px-6 py-2 rounded-full text-[9px] uppercase tracking-widest font-black border-2 transition-all ${filter === f ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white border-[#32213A]/10 text-[#32213A]/30'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            {filteredEntries.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-[10px] uppercase tracking-widest font-black text-[#32213A]/20">Archive Empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map(entry => {
                  const expense = getExpenseForEntry(entry.id);
                  const mood = getMoodForEntry(entry.id);
                  return (
                    <div key={entry.id} className="bg-white border-4 border-[#32213A] p-6 rounded-[2.5rem] shadow-[4px_4px_0px_#32213A]">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                           <NeoPopIcon type={entry.intent === 'MOOD' ? 'MOOD' : entry.intent === 'EXPENSE' ? 'EXPENSE' : 'TODO'} className="w-6 h-6" />
                           <span className="text-[9px] font-black uppercase text-[#32213A]/40 tracking-widest">{entry.intent}</span>
                        </div>
                        <span className="text-[9px] text-[#32213A]/20 font-black uppercase">{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <p className="text-sm text-[#32213A] font-bold leading-tight mb-4">"{entry.rawText}"</p>
                      
                      {(expense || mood) && (
                        <div className="pt-4 border-t-2 border-[#D4D6B9]/30 flex justify-between items-center">
                          <span className="text-[10px] font-black text-[#32213A]/40 uppercase tracking-tighter">
                            {expense ? expense.category : 'Reflection'}
                          </span>
                          <span className="text-sm font-black text-[#32213A]">
                            {expense ? `₹${expense.amount}` : mood?.sentiment}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
