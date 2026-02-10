
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

const NeoPopIcon = ({ type, className }: { type: string, className?: string }) => {
  const iconBase = `shrink-0 ${className || ''}`;
  const size = "24"; 

  switch (type) {
    case 'EXPENSE': 
      return (
        <svg className={iconBase} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="12" rx="4" fill="#ADF7B6" stroke="#32213A" strokeWidth="2.5"/>
          <circle cx="12" cy="12" r="3" fill="white" stroke="#32213A" strokeWidth="2"/>
        </svg>
      );
    case 'REMINDER':
    case 'ALERTS':
      return (
        <svg className={iconBase} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 17H18V10C18 6.68629 15.3137 4 12 4C8.68629 4 6 6.68629 6 10V17Z" fill="#F7EF81" stroke="#32213A" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M4 17H20" stroke="#32213A" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M10 20C10 21.1046 10.8954 22 12 22C13.1046 22 14 21.1046 14 20" stroke="#32213A" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );
    case 'TODO':
    case 'TASKS':
      return (
        <svg className={iconBase} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#ADD2C2" stroke="#32213A" strokeWidth="2.5"/>
          <path d="M8 12L11 15L16 9" stroke="#32213A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'MOOD':
    case 'PULSE':
      return (
        <svg className={iconBase} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#B892FF" stroke="#32213A" strokeWidth="2.5"/>
          <path d="M7 12L9 12L11 8L13 16L15 12L17 12" stroke="#32213A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
};

const IntentTable = ({ intent, entries }: { intent: IntentType, entries: VoiceEntry[] }) => {
  const getColumns = () => {
    switch (intent) {
      case 'EXPENSE': return ['Amount', 'Category', 'Target Date', 'Details'];
      case 'TODO':
      case 'REMINDER': return ['Due Date', 'Headline', 'Priority', 'Status'];
      case 'MOOD': return ['Date', 'Vibe', 'Headline', 'Reason'];
      default: return ['Date', 'Snapshot', 'Vibe', 'Raw Text'];
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

  if (entries.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-[#32213A]/20">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/30 italic">No records found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#32213A] overflow-hidden">
      <div className={`grid grid-cols-4 ${getIntentColor()} px-4 py-3 border-b-2 border-[#32213A]`}>
        {columns.map(col => (
          <span key={col} className="text-[8px] font-black uppercase tracking-widest text-[#32213A] truncate pr-1">{col}</span>
        ))}
      </div>
      <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
        {entries.map((entry, idx) => (
          <div key={entry.id} className={`grid grid-cols-4 px-4 py-3 items-start border-b border-[#32213A]/10 last:border-0 ${idx % 2 === 1 ? 'bg-[#D4D6B9]/10' : 'bg-white'}`}>
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

  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.intent === filter);
  }, [entries, filter]);

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

    // Enhanced Analytics
    const moodFreq = moods.reduce((acc: any, m) => {
      acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
      return acc;
    }, {});
    const topMood = Object.entries(moodFreq).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'Neutral';

    const completedTasks = tasks.filter(t => t.completed).length;
    const taskEfficiency = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    return { monthlyBurn, dailyAvg, categoryBreakdown, topMood, taskEfficiency };
  }, [expenses, moods, tasks]);

  const intents: IntentType[] = ['EXPENSE', 'TODO', 'REMINDER', 'MOOD', 'NOTE'];

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#D4D6B9] max-w-md mx-auto border-x-4 border-[#32213A]/5">
      <header className="px-6 py-8 flex justify-between items-center">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tighter text-[#32213A]">Detailed notes</h2>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={onExport} title="Export Backup" className="w-10 h-10 bg-white border-2 border-[#32213A] rounded-xl flex items-center justify-center text-[#32213A] active:scale-90 neo-pop-shadow transition-all">
             <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/></svg>
           </button>
           <button onClick={onBack} title="Exit" className="w-10 h-10 bg-[#32213A] rounded-xl flex items-center justify-center text-white active:scale-90 transition-all">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      </header>

      <div className="flex px-6 gap-3 mb-6">
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
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
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
            {/* 2x2 Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border-2 border-[#32213A] p-5 text-left">
                <span className="text-[8px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-1">Monthly Burn</span>
                <p className="text-xl font-black text-[#32213A]">₹{analytics.monthlyBurn}</p>
              </div>
              <div className="bg-white border-2 border-[#32213A] p-5 text-left">
                <span className="text-[8px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-1">Efficiency</span>
                <p className="text-xl font-black text-[#32213A]">{analytics.taskEfficiency}%</p>
              </div>
              <div className="bg-white border-2 border-[#32213A] p-5 text-left">
                <span className="text-[8px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-1">Sentiment</span>
                <p className="text-xl font-black text-[#32213A] uppercase tracking-tighter truncate">{analytics.topMood}</p>
              </div>
              <div className="bg-white border-2 border-[#32213A] p-5 text-left">
                <span className="text-[8px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-1">Daily Avg</span>
                <p className="text-xl font-black text-[#32213A]">₹{analytics.dailyAvg}</p>
              </div>
            </div>

            {/* Spend Distribution */}
            <div className="bg-white border-2 border-[#32213A] p-6 text-left">
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-[#32213A]/40 font-black mb-5">Expense Breakdown</h3>
              <div className="space-y-4">
                {Object.entries(analytics.categoryBreakdown).length > 0 ? (
                  Object.entries(analytics.categoryBreakdown).sort((a: any, b: any) => b[1] - a[1]).map(([cat, amt]: any) => (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black text-[#32213A] uppercase tracking-tighter">
                        <span>{cat}</span>
                        <span>₹{amt}</span>
                      </div>
                      <div className="h-2 bg-[#D4D6B9]/30 border border-[#32213A]/10 overflow-hidden">
                        <div 
                          className="h-full bg-[#ADF7B6]" 
                          style={{ width: `${Math.min(100, (amt / Math.max(1, analytics.monthlyBurn)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] italic text-[#32213A]/20 font-black uppercase tracking-widest">No transaction data</p>
                )}
              </div>
            </div>

            <button 
              onClick={onClearAll}
              className="w-full py-4 bg-white border-2 border-rose-500/30 text-rose-500 text-[10px] uppercase tracking-[0.4em] font-black hover:bg-rose-500 hover:text-white transition-all mt-6"
            >
              Purge All Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
