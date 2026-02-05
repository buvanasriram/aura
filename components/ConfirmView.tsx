
import React, { useState } from 'react';
import { IntentType } from '../types';

interface ConfirmViewProps {
  intent: IntentType;
  rawText: string;
  entities: any;
  onConfirm: (finalData: any) => void;
  onCancel: () => void;
}

export const ConfirmView: React.FC<ConfirmViewProps> = ({ intent, rawText, entities, onConfirm, onCancel }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const [data, setData] = useState(() => {
    const base = { ...entities };
    if (!base.date) base.date = today;
    if (intent === 'EXPENSE' && !base.category) base.category = 'Others';
    
    // Robust fallbacks for Mood capture
    if (intent === 'MOOD') {
      if (!base.sentiment) base.sentiment = 'Reflective';
      if (!base.sentence) base.sentence = rawText; // Fallback to raw text if AI missed the insight
    }
    
    // Fallback for missing Todo/Reminder titles
    if ((intent === 'TODO' || intent === 'REMINDER') && !base.title) {
      base.title = rawText;
    }
    
    return base;
  });

  const Header = ({ title, color }: { title: string, color: string }) => (
    <header className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
        <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#32213A]/40">Intelligence Verification</span>
      </div>
      <h2 className="text-3xl font-black leading-none text-[#32213A] tracking-tighter uppercase">{title}</h2>
    </header>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#D4D6B9]/95 backdrop-blur-md overflow-y-auto no-scrollbar">
      <div className="bg-white border-4 border-[#32213A] rounded-[3.5rem] p-8 shadow-[12px_12px_0px_#32213A] w-full max-w-[340px] flex flex-col box-border overflow-hidden">
        <Header 
          title={intent === 'EXPENSE' ? 'Expense' : intent === 'MOOD' ? 'Mood' : 'Record'} 
          color={intent === 'EXPENSE' ? 'bg-rose-400' : intent === 'MOOD' ? 'bg-pink-400' : 'bg-emerald-400'} 
        />
        
        <div className="bg-[#D4D6B9]/10 border-2 border-[#32213A]/10 rounded-3xl p-5 mb-6 box-border w-full">
          <p className="text-[9px] uppercase tracking-widest text-[#32213A]/40 mb-2 font-black">Original Thought</p>
          <p className="text-[#32213A] italic text-[14px] leading-snug font-medium break-words">"{rawText}"</p>
        </div>

        <div className="space-y-5 w-full box-border">
          {intent === 'EXPENSE' && (
            <div className="space-y-5 w-full">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Amount</label>
                <div className="flex gap-2 w-full box-border">
                  <input 
                    type="number" 
                    value={data.amount} 
                    onChange={e => setData({...data, amount: parseFloat(e.target.value)})} 
                    className="w-full flex-1 bg-[#D4D6B9]/5 border-2 border-[#32213A] rounded-2xl px-4 py-3 text-2xl font-black text-[#32213A] outline-none" 
                  />
                  <div className="w-16 bg-[#32213A] rounded-2xl flex items-center justify-center text-[10px] font-black text-white uppercase shrink-0">INR</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full box-border">
                <div className="space-y-1 flex flex-col overflow-hidden">
                  <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Category</label>
                  <select 
                    value={data.category} 
                    onChange={e => setData({...data, category: e.target.value})} 
                    className="w-full bg-[#D4D6B9]/5 border-2 border-[#32213A] rounded-2xl px-2 py-3 text-[10px] font-black text-[#32213A] outline-none truncate"
                  >
                    {['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Medical', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Date</label>
                  <input 
                    type="date" 
                    value={data.date} 
                    onChange={e => setData({...data, date: e.target.value})} 
                    className="w-full bg-[#D4D6B9]/5 border-2 border-[#32213A] rounded-2xl px-2 py-3 text-[9px] font-black text-[#32213A] outline-none" 
                  />
                </div>
              </div>
            </div>
          )}

          {intent === 'MOOD' && (
            <div className="space-y-4 w-full box-border">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Mood</label>
                <input type="text" value={data.sentiment} onChange={e => setData({...data, sentiment: e.target.value})} className="w-full bg-[#D4D6B9]/5 border-2 border-[#32213A] rounded-2xl px-4 py-3 text-sm font-black text-[#32213A] outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Insight</label>
                <textarea value={data.sentence} onChange={e => setData({...data, sentence: e.target.value})} className="w-full bg-[#D4D6B9]/5 border-2 border-[#32213A] rounded-2xl p-4 text-xs font-bold text-[#32213A] leading-tight outline-none resize-none" rows={2} />
              </div>
            </div>
          )}

          {(intent === 'TODO' || intent === 'REMINDER') && (
            <div className="space-y-4 w-full box-border">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Action Item</label>
                <input type="text" value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full bg-[#D4D6B9]/5 border-2 border-[#32213A] rounded-2xl px-4 py-3 text-sm font-black text-[#32213A] outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Target Date</label>
                <input type="date" value={data.date} onChange={e => setData({...data, date: e.target.value})} className="w-full bg-[#D4D6B9]/5 border-2 border-[#32213A] rounded-2xl px-4 py-3 text-[10px] font-black text-[#32213A] outline-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-8 mt-6 border-t-4 border-[#32213A]/5 w-full">
          <button onClick={onCancel} className="flex-1 py-4 text-[#32213A]/40 uppercase text-[10px] tracking-widest font-black active:scale-95 transition-all">Discard</button>
          <button onClick={() => onConfirm(data)} className="flex-[2] py-4 bg-[#32213A] text-white rounded-2xl uppercase text-[10px] tracking-widest font-black shadow-lg active:scale-95 transition-all neo-pop-shadow">Save Record</button>
        </div>
      </div>
    </div>
  );
};
