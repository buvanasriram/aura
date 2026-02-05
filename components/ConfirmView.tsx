
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
    if (intent === 'EXPENSE' && !base.currency) base.currency = 'INR';
    
    // Prioritize AI output, but provide sensible defaults if Gemini failed
    if (intent === 'MOOD') {
      base.vibe = base.vibe || 'Neutral';
      base.headline = base.headline || 'Mood reflection';
      base.reason = base.reason || rawText;
    } else if (intent === 'TODO') {
      base.headline = base.headline || 'Action Required';
      base.details = base.details || rawText;
    } else if (intent === 'EXPENSE') {
      base.details = base.details || rawText;
    }
    
    return base;
  });

  const getHeaderStyle = () => {
    switch(intent) {
      case 'EXPENSE': return { color: 'bg-[#ADF7B6]', label: 'Expense Log' };
      case 'REMINDER': return { color: 'bg-[#F7EF81]', label: 'Reminder' };
      case 'TODO': return { color: 'bg-[#ADD2C2]', label: 'Task' };
      case 'MOOD': return { color: 'bg-[#B892FF]', label: 'Mood Pulse' };
      case 'NOTE': return { color: 'bg-white', label: 'Note' };
      default: return { color: 'bg-indigo-400', label: 'Verification' };
    }
  };

  const style = getHeaderStyle();
  const expenseCategories = ['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Medical', 'Others'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#D4D6B9]/95 backdrop-blur-md overflow-y-auto no-scrollbar">
      <div className="bg-white border-4 border-[#32213A] rounded-[3.5rem] p-8 shadow-[12px_12px_0px_#32213A] w-full max-w-[340px] flex flex-col box-border text-left">
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${style.color}`}></div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#32213A]/40">{intent} Identified</span>
          </div>
          <h2 className="text-3xl font-black leading-none text-[#32213A] tracking-tighter uppercase">{style.label}</h2>
        </header>

        <div className="space-y-5 w-full">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">AI Vibe</label>
              <input 
                type="text" 
                value={data.vibe || ''} 
                onChange={e => setData({...data, vibe: e.target.value})} 
                className="w-full bg-[#32213A]/5 border-2 border-[#32213A] rounded-2xl px-4 py-3 text-sm font-black text-[#32213A]" 
                placeholder="Detected Emotion"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Summary Headline</label>
              <input 
                type="text" 
                value={data.headline || ''} 
                onChange={e => setData({...data, headline: e.target.value})} 
                className="w-full bg-[#32213A]/5 border-2 border-[#32213A] rounded-2xl px-4 py-3 text-sm font-black text-[#32213A]" 
                placeholder="Brief title"
              />
            </div>
          </div>

          {intent === 'EXPENSE' && (
            <div className="space-y-4 pt-2 border-t-2 border-[#32213A]/5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Amount</label>
                <input type="number" value={data.amount || 0} onChange={e => setData({...data, amount: parseFloat(e.target.value)})} className="w-full bg-[#32213A]/5 border-2 border-[#32213A] rounded-2xl px-4 py-3 text-2xl font-black text-[#32213A]" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Category</label>
                <select value={data.category || 'Others'} onChange={e => setData({...data, category: e.target.value})} className="w-full bg-[#32213A]/5 border-2 border-[#32213A] rounded-2xl px-4 py-3 text-sm font-black text-[#32213A] appearance-none">
                  {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
          )}

          {intent === 'TODO' && (
            <div className="space-y-4 pt-2 border-t-2 border-[#32213A]/5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Priority</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map(p => (
                    <button key={p} onClick={() => setData({...data, priority: p})} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${data.priority === p ? 'bg-[#32213A] text-white border-[#32213A]' : 'bg-white text-[#32213A]/40 border-[#32213A]/10'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1 pt-2 border-t-2 border-[#32213A]/5">
            <label className="text-[10px] font-black uppercase text-[#32213A]/40 tracking-widest px-1">Raw Capture</label>
            <p className="p-4 bg-white border-2 border-[#32213A] rounded-2xl text-[11px] text-[#32213A] italic leading-relaxed">"{rawText}"</p>
          </div>
        </div>

        <div className="flex gap-4 pt-8 mt-6 border-t-4 border-[#32213A]/5">
          <button onClick={onCancel} className="flex-1 py-4 text-[#32213A]/40 uppercase text-[10px] tracking-widest font-black active:scale-95 transition-all">Discard</button>
          <button onClick={() => onConfirm(data)} className="flex-[2] py-4 bg-[#32213A] text-white rounded-2xl uppercase text-[10px] tracking-widest font-black shadow-lg active:scale-95 transition-all neo-pop-shadow">Lock In</button>
        </div>
      </div>
    </div>
  );
};
