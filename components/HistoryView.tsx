
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
  const iconBase = `shrink-0 neo-pop-shadow ${className || ''}`;
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

const DataRow = ({ label, value, dark }: { label: string, value: any, dark?: boolean }) => (
  <div className={`flex justify-between items-center py-2 border-b border-[#32213A]/5 last:border-0`}>
    <span className={`text-[8px] font-black uppercase tracking-widest ${dark ? 'text-[#32213A]/40' : 'text-[#32213A]/50'}`}>{label}</span>
    <span className="text-[10px] font-black text-[#32213A] truncate max-w-[180px]">{value || 'N/A'}</span>
  </div>
);

const IntentDetails = ({ entry }: { entry: VoiceEntry }) => {
  const e = entry.extractedEntities;
  const intent = entry.intent;

  switch (intent) {
    case 'EXPENSE':
      return (
        <div className="bg-white/40 rounded-2xl p-3 border-2 border-[#32213A]/10 mt-3">
          <DataRow label="Amount" value={`${e.amount || 0} INR`} dark />
          <DataRow label="Category" value={e.category} dark />
          <DataRow label="Target Date" value={e.date} dark />
          <DataRow label="Details" value={e.headline || e.details} dark />
        </div>
      );
    case 'TODO':
    case 'REMINDER':
      return (
        <div className="bg-white/40 rounded-2xl p-3 border-2 border-[#32213A]/10 mt-3">
          <DataRow label="Task" value={e.headline} dark />
          <DataRow label="Due Date" value={e.date} dark />
          <DataRow label="Priority" value={e.priority} dark />
          <DataRow label="Status" value={e.completed ? 'Done' : 'Pending'} dark />
        </div>
      );
    case 'MOOD':
      return (
        <div className="bg-white/40 rounded-2xl p-3 border-2 border-[#32213A]/10 mt-3">
          <DataRow label="Vibe" value={e.vibe} dark />
          <DataRow label="Insight" value={e.headline} dark />
          <DataRow label="Context" value={e.reason || e.details} dark />
        </div>
      );
    default:
      return (
        <div className="bg-white/40 rounded-2xl p-3 border-2 border-[#32213A]/10 mt-3">
          <DataRow label="Snapshot" value={e.headline || 'Note Captured'} dark />
          <DataRow label="Vibe" value={e.vibe} dark />
        </div>
      );
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

    return { monthlyBurn, dailyAvg, categoryBreakdown };
  }, [expenses]);

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#D4D6B9] max-w-md mx-auto border-x-4 border-[#32213A]/5">
      <header className="px-6 py-8 flex justify-between items-center">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tighter text-[#32213A]">Vault</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#32213A]/40">Persistent Data</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={onExport} title="Export Backup" className="w-12 h-12 bg-white border-2 border-[#32213A] rounded-2xl flex items-center justify-center text-[#32213A] active:scale-90 neo-pop-shadow transition-all">
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
           </button>
           <button onClick={onBack} title="Exit Vault" className="w-12 h-12 bg-[#32213A] rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      </header>

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
          Archives
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
        {mode === 'INTELLIGENCE' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border-4 border-[#32213A] p-6 rounded-[2.5rem] shadow-[6px_6px_0px_#32213A] text-left">
                <span className="text-[9px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-2">Monthly Spend</span>
                <p className="text-2xl font-black text-[#32213A]">₹{analytics.monthlyBurn}</p>
              </div>
              <div className="bg-white border-4 border-[#32213A] p-6 rounded-[2.5rem] shadow-[6px_6px_0px_#32213A] text-left">
                <span className="text-[9px] uppercase tracking-widest text-[#32213A]/40 font-black block mb-2">Daily Average</span>
                <p className="text-2xl font-black text-[#32213A]">₹{analytics.dailyAvg}</p>
              </div>
            </div>

            <div className="bg-white border-4 border-[#32213A] p-8 rounded-[3rem] shadow-[8px_8px_0px_#32213A] text-left">
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
                          className="h-full bg-[#ADF7B6] rounded-full" 
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
          <div className="space-y-6">
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

            <div className="space-y-4">
              {filteredEntries.length === 0 ? (
                <div className="py-20 text-center opacity-20 italic">No records in this archive.</div>
              ) : filteredEntries.map(entry => {
                const isExpense = entry.intent === 'EXPENSE';
                const isReminder = entry.intent === 'REMINDER';
                const isTodo = entry.intent === 'TODO';
                const isMood = entry.intent === 'MOOD';
                
                let bgColor = 'bg-white';
                if (isExpense) bgColor = 'bg-[#ADF7B6]';
                if (isReminder) bgColor = 'bg-[#F7EF81]';
                if (isTodo) bgColor = 'bg-[#ADD2C2]';
                if (isMood) bgColor = 'bg-[#B892FF]';

                return (
                  <div key={entry.id} className={`border-4 border-[#32213A] p-5 rounded-[2.5rem] shadow-[4px_4px_0px_#32213A] ${bgColor} text-left transition-transform active:scale-[0.98]`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                         <NeoPopIcon type={entry.intent} className="w-5 h-5 shadow-none" />
                         <span className="text-[9px] font-black uppercase text-[#32213A]/60 tracking-widest">{entry.intent}</span>
                      </div>
                      <span className="text-[8px] text-[#32213A]/40 font-black uppercase">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <IntentDetails entry={entry} />

                    <div className="mt-4 pt-3 border-t border-[#32213A]/10">
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#32213A]/30 block mb-1">Transcript</span>
                      <p className="text-[11px] text-[#32213A]/70 font-bold leading-tight line-clamp-2">"{entry.rawText}"</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
