
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Expense, VoiceEntry, Task, MoodRecord, IntentType } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

interface HomeViewProps {
  expenses: Expense[];
  voiceEntries: VoiceEntry[];
  tasks: Task[];
  moodsCount: number;
  moods: MoodRecord[];
  onStartVoice: () => void;
  onViewHistory: () => void;
  onVoiceSuccess: (data: { rawText: string; intent: IntentType; entities: any }) => void;
  isProcessing: boolean;
}

const NeoPopIcon = ({ type, className, colorOverride }: { type: string, className?: string, colorOverride?: string }) => {
  const iconBase = `shrink-0 neo-pop-shadow ${className}`;
  switch (type) {
    case 'EXPENSE': 
    case 'CASH':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="12" rx="4" fill={colorOverride || "#ADF7B6"} stroke="#32213A" strokeWidth="2.5"/>
          <circle cx="12" cy="12" r="3" fill="white" stroke="#32213A" strokeWidth="2"/>
        </svg>
      );
    case 'TODO':
    case 'TASKS':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="3" fill={colorOverride || "#ADD2C2"} stroke="#32213A" strokeWidth="2.5"/>
          <path d="M8 12L11 15L16 9" stroke="#32213A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'REMINDER':
    case 'ALERTS':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8V11C6 11.6644 5.71554 12.2961 5.21115 12.7334C4.43632 13.4063 4 14.3828 4 15.4118V16C4 16.5523 4.44772 17 5 17H19C19.5523 17 20 16.5523 20 16V15.4118C20 14.3828 19.5637 13.4063 18.7889 12.7334C18.2845 12.2961 18 11.6644 18 11V8Z" fill={colorOverride || "#F7EF81"} stroke="#32213A" strokeWidth="2.5"/>
          <path d="M10 19C10 20.1046 10.8954 21 12 21C13.1046 21 14 20.1046 14 19" stroke="#32213A" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );
    case 'PULSE':
    case 'MOOD':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill={colorOverride || "#B892FF"} stroke="#32213A" strokeWidth="2.5"/>
          <path d="M7 12L9 12L11 8L13 16L15 12L17 12" stroke="#32213A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
};

export const HomeView: React.FC<HomeViewProps> = ({ expenses, voiceEntries, tasks, moods, onViewHistory, onVoiceSuccess, isProcessing: externalProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [internalProcessing, setInternalProcessing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const isApiInFlight = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  const realTasksCount = useMemo(() => tasks.filter(t => t.category !== 'Reminder' && !t.completed).length, [tasks]);
  const upcomingAlerts = useMemo(() => tasks.filter(t => t.category === 'Reminder' && !t.completed).slice(0, 2), [tasks]);
  const totalSpend = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amount, 0), [expenses]);
  const currentMoodText = useMemo(() => moods.length > 0 ? moods[0].sentiment : 'Neutral', [moods]);
  const recentEntries = useMemo(() => voiceEntries.slice(0, 5), [voiceEntries]);

  useEffect(() => {
    if (errorStatus) {
      const timer = setTimeout(() => setErrorStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorStatus]);

  const initVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        if (!canvasRef.current) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        const ctx = canvasRef.current.getContext('2d')!;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const centerX = canvasRef.current.width / 2;
        const centerY = canvasRef.current.height / 2;
        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * 30;
          const angle = (i * 2 * Math.PI) / dataArray.length;
          const x1 = centerX + Math.cos(angle) * 18;
          const y1 = centerY + Math.sin(angle) * 18;
          const x2 = centerX + Math.cos(angle) * (18 + barHeight);
          const y2 = centerY + Math.sin(angle) * (18 + barHeight);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = '#32213A'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
        }
      };
      draw();
      return stream;
    } catch (e) { return null; }
  };

  const startVoice = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorStatus("BROWSER NOT SUPPORTED");
      return;
    }
    const stream = await initVisualizer();
    if (!stream) {
      setErrorStatus("MICROPHONE DENIED");
      return;
    }
    
    setIsRecording(true);
    setTranscript("");
    transcriptRef.current = "";
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      let current = "";
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
      transcriptRef.current = current;
    };

    recognition.onend = () => {
      const finalResult = transcriptRef.current.trim();
      setIsRecording(false);
      if (finalResult.length > 1) {
        processText(finalResult);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const processText = async (text: string) => {
    if (isApiInFlight.current) return;
    
    if (!process.env.API_KEY) {
      console.error("[AURA] Missing API Key");
      setErrorStatus("MISSING API KEY");
      return;
    }

    isApiInFlight.current = true;
    setInternalProcessing(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [{
            text: `System: Aura Intelligence Engine. Analyze: "${text}". Date: ${today}.
            Classify: EXPENSE, TODO, REMINDER, MOOD, or NOTE.
            MANDATORY: 1-word 'vibe' and 3-5 word 'headline' for ALL inputs.`
          }]
        }],
        config: { 
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              entities: {
                type: Type.OBJECT,
                properties: {
                  vibe: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                  details: { type: Type.STRING },
                  date: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ['vibe', 'headline']
              }
            },
            required: ['intent', 'entities']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      onVoiceSuccess({ rawText: text, intent: result.intent || 'NOTE', entities: result.entities || {} });
    } catch (e: any) {
      console.error("[AURA] Sync error:", e);
      setErrorStatus(e.message?.includes('401') ? "INVALID API KEY" : "SYNC FAILED");
    } finally {
      isApiInFlight.current = false;
      setInternalProcessing(false);
    }
  };

  const getCardStyle = (intent: IntentType) => {
    switch (intent) {
      case 'EXPENSE': return 'bg-[#ADF7B6]'; 
      case 'REMINDER': return 'bg-[#F7EF81]';
      case 'TODO': return 'bg-[#ADD2C2]';
      case 'MOOD': return 'bg-[#B892FF]';
      default: return 'bg-white';
    }
  };

  const isBusy = internalProcessing || externalProcessing;

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden px-5 pb-5 bg-[#D4D6B9] font-black">
      {/* Error Toast */}
      {errorStatus && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] animate-slide-up">
           <div className="bg-[#32213A] text-rose-400 border-4 border-rose-400 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-[8px_8px_0px_#32213A]">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">{errorStatus}</span>
           </div>
        </div>
      )}

      {/* Sync Overlay */}
      {isBusy && (
        <div className="fixed inset-0 z-[250] bg-[#32213A]/60 backdrop-blur-sm flex items-center justify-center p-8 text-center">
           <div className="bg-white border-4 border-[#32213A] rounded-[3rem] p-10 neo-pop-shadow max-w-xs w-full animate-in zoom-in duration-300">
              <div className="w-16 h-16 border-8 border-[#32213A] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-black text-[#32213A] uppercase tracking-tighter mb-2">Syncing Aura</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#32213A]/40 leading-relaxed">Processing your words into structured intelligence...</p>
           </div>
        </div>
      )}

      <header className="shrink-0 pt-8 pb-6 flex justify-between items-start z-50">
        <div className="text-left">
          <h1 className="text-4xl font-black tracking-tighter text-[#32213A] leading-none">Aura</h1>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#32213A]/40 mt-1">Smart Assist</p>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex gap-3 mb-2">
            <button 
              onClick={onViewHistory}
              className="w-12 h-12 rounded-xl bg-white border-4 border-[#32213A] flex items-center justify-center text-[#32213A] active:scale-95 transition-all neo-pop-shadow"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h7"/></svg>
            </button>
            
            <div className="relative w-12 h-12">
               <canvas ref={canvasRef} width={80} height={80} className={`absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] transition-opacity duration-300 pointer-events-none ${isRecording ? 'opacity-100' : 'opacity-0'}`} />
               <button 
                  onClick={() => isRecording ? stopVoice() : startVoice()}
                  disabled={isBusy}
                  className={`w-full h-full rounded-xl border-4 border-[#32213A] flex items-center justify-center transition-all neo-pop-shadow relative z-10
                    ${isRecording ? 'bg-red-500 text-white translate-y-1 shadow-none' : 'bg-white text-[#32213A] active:scale-95'}
                    ${isBusy ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  {isRecording ? (
                    <div className="w-4 h-4 bg-white rounded-sm animate-pulse"></div>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                  )}
                </button>
            </div>
          </div>
          <span className={`text-[7px] font-black uppercase tracking-widest text-center leading-tight ${isRecording ? 'text-red-500 animate-pulse' : 'text-[#32213A]/30'}`}>
            {isRecording ? "Listening" : "System Ready"}
          </span>
        </div>
      </header>

      {upcomingAlerts.length > 0 && (
        <div className="mb-4 shrink-0 space-y-2 text-left">
           <h3 className="text-[8px] font-black uppercase tracking-[0.3em] text-[#32213A]/40 px-2">Upcoming Alerts</h3>
           {upcomingAlerts.map(alert => (
             <div key={alert.id} className="bg-[#F7EF81] p-3 rounded-2xl flex items-center gap-3">
               <NeoPopIcon type="ALERTS" className="w-5 h-5 shadow-none" colorOverride="#32213A" />
               <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-[#32213A] truncate leading-tight">{alert.title}</p>
               </div>
             </div>
           ))}
        </div>
      )}

      <div className="mb-4 shrink-0 p-5 bg-white rounded-[2.5rem] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NeoPopIcon type="CASH" className="w-12 h-12" colorOverride="#ADF7B6" />
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#32213A]/40 mb-1">Expenses</span>
            <span className="text-3xl font-black text-[#32213A] tracking-tighter leading-none">₹{totalSpend.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex justify-around items-center py-4 mb-4 border-y-4 border-[#32213A]/10">
        <div className="flex items-center gap-3 text-left">
          <NeoPopIcon type="TASKS" className="w-8 h-8" colorOverride="#ADD2C2" />
          <div className="flex flex-col">
            <span className="text-xl font-black text-[#32213A] leading-none">{realTasksCount}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#32213A]/40 mt-1">pending tasks</span>
          </div>
        </div>
        <div className="w-1 h-8 bg-[#32213A]/10 rounded-full"></div>
        <div className="flex items-center gap-3 text-left">
          <NeoPopIcon type="PULSE" className="w-8 h-8" colorOverride="#B892FF" />
          <div className="flex flex-col">
            <span className="text-xl font-black text-[#32213A] leading-none truncate max-w-[100px]">{currentMoodText}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#32213A]/40 mt-1">Current Vibe</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden text-left">
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#32213A]/40">My Thoughts</h3>
          {isRecording && <span className="text-[8px] text-red-500 animate-pulse uppercase tracking-widest">Capturing Audio...</span>}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 pb-4">
          {recentEntries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-[#32213A]/10 rounded-none">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#32213A]/20 italic">Awaiting Input...</p>
            </div>
          ) : (
            recentEntries.map(entry => (
              <div key={entry.id} className={`flex flex-col py-2 px-3 rounded-none transition-all duration-300 ${getCardStyle(entry.intent)}`}>
                <div className="flex justify-between items-center mb-0.5">
                   <span className="text-[7px] font-black text-[#32213A]/40 uppercase tracking-widest">
                     {new Date(entry.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                   </span>
                   <span className="text-[7px] font-black text-[#32213A]/60 uppercase tracking-widest">{entry.intent}</span>
                </div>
                <p className="text-[12px] font-medium text-[#32213A] leading-tight">"{entry.rawText}"</p>
              </div>
            ))
          )}
        </div>
      </div>

      {isRecording && transcript && (
        <div className="absolute bottom-10 left-10 right-10 p-6 bg-white border-4 border-[#32213A] rounded-[2rem] shadow-[8px_8px_0px_#32213A] z-[100] animate-in fade-in slide-in-from-bottom-5">
           <p className="text-xs font-black italic text-[#32213A] leading-snug break-words">"{transcript}..."</p>
        </div>
      )}
    </div>
  );
};
