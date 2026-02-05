
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Expense, VoiceEntry, Task, MoodRecord, IntentType } from '../types';

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
    case 'REMINDER':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#4ADE80" stroke="#32213A" strokeWidth="2.5"/>
          <path d="M8 12L11 15L16 9" stroke="#32213A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'PULSE':
    case 'MOOD':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#F472B6" stroke="#32213A" strokeWidth="2.5"/>
          <path d="M7 12L9 12L11 8L13 16L15 12L17 12" stroke="#32213A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'CASH':
      return (
        <svg className={iconBase} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="12" rx="4" fill="#60A5FA" stroke="#32213A" strokeWidth="2.5"/>
          <circle cx="12" cy="12" r="3" fill="white" stroke="#32213A" strokeWidth="2"/>
        </svg>
      );
    default:
      return null;
  }
};

export const HomeView: React.FC<HomeViewProps> = ({ expenses, voiceEntries, tasks, moods, onViewHistory, onVoiceSuccess, isProcessing: externalProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [internalProcessing, setInternalProcessing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<{message: string, cooldown: number, draft?: string} | null>(() => {
    const savedDraft = localStorage.getItem('aura_pending_draft');
    return savedDraft ? { message: "DRAFT RECOVERED", cooldown: 0, draft: savedDraft } : null;
  });
  const [transcript, setTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const isApiInFlight = useRef(false);
  const lastRequestTime = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  const totalSpend = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amount, 0), [expenses]);
  const realTasksCount = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);
  const currentMoodText = useMemo(() => moods.length > 0 ? moods[0].sentiment : 'Neutral', [moods]);
  const recentEntries = useMemo(() => voiceEntries.slice(0, 5), [voiceEntries]);

  useEffect(() => {
    if (!errorStatus || errorStatus.cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setErrorStatus(prev => {
        if (!prev) return null;
        if (prev.cooldown <= 1) return { ...prev, cooldown: 0 };
        return { ...prev, cooldown: prev.cooldown - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [errorStatus?.cooldown]);

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
    if (isApiInFlight.current || internalProcessing) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const stream = await initVisualizer();
    if (!stream) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript("");
      transcriptRef.current = "";
    };
    recognition.onresult = (event: any) => {
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        final += event.results[i][0].transcript;
      }
      setTranscript(final);
      transcriptRef.current = final;
    };
    recognition.onerror = () => stopVoice("AUTO_ERROR");
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = (trigger: string = "USER") => {
    if (!isRecording && trigger !== "AUTO_ERROR") return;
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    const capturedText = transcriptRef.current.trim();
    if (capturedText.length > 2) {
      processText(capturedText);
    }
    setTranscript("");
    transcriptRef.current = "";
  };

  const processText = async (text: string) => {
    const now = Date.now();
    if (isApiInFlight.current) return;
    
    // Mandate a 8s wait to stay under free tier RPM
    if (now - lastRequestTime.current < 8000) {
      const wait = Math.ceil((8000 - (now - lastRequestTime.current)) / 1000);
      setErrorStatus({ message: "COOLDOWN ACTIVE", cooldown: wait, draft: text });
      localStorage.setItem('aura_pending_draft', text);
      return;
    }

    isApiInFlight.current = true;
    lastRequestTime.current = now;
    setInternalProcessing(true);
    
    const today = new Date().toISOString().split('T')[0];
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Process Text: "${text}"`,
        config: { 
          systemInstruction: `Extract JSON. Date: ${today}.
          Schema: { "intent": "EXPENSE"|"TODO"|"REMINDER"|"MOOD"|"NOTE", "entities": {} }
          Entity Keys:
          - EXPENSE: { amount: number, category: string, description: string }
          - TODO/REMINDER: { title: string, date: string }
          - MOOD: { sentiment: string, sentence: string }
          Mood rules: 'sentiment' is a 1-word mood (Sad/Happy). 'sentence' is a summary of the thought.`,
          responseMimeType: 'application/json'
        }
      });

      localStorage.removeItem('aura_pending_draft');
      const result = JSON.parse(response.text || '{}');
      setErrorStatus(null);
      onVoiceSuccess({
        rawText: text,
        intent: result.intent || 'NOTE',
        entities: result.entities || {}
      });
    } catch (e: any) { 
      localStorage.setItem('aura_pending_draft', text);
      const is429 = e.message?.includes('429') || e.status === 429 || (e.error && e.error.code === 429);
      if (is429) {
        setErrorStatus({ message: "QUOTA EXHAUSTED", cooldown: 60, draft: text });
      } else {
        setErrorStatus({ message: "SYNC ERROR", cooldown: 5, draft: text });
      }
    } finally {
      isApiInFlight.current = false;
      setInternalProcessing(false);
    }
  };

  const getCardStyle = (intent: IntentType) => {
    switch (intent) {
      case 'EXPENSE': return 'bg-[#FFE4E4]'; // Soft Rose
      case 'TODO':
      case 'REMINDER': return 'bg-[#D1FAE5]'; // Soft Emerald
      case 'MOOD': return 'bg-[#FCE7F3]'; // Soft Pink
      default: return 'bg-white';
    }
  };

  const isBusy = internalProcessing || externalProcessing;

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden px-6 pb-6 bg-[#D4D6B9]">
      <header className="shrink-0 pt-12 pb-14 flex justify-between items-start z-50">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-[#32213A]">Aura</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#32213A]/40">Smart Assist</p>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex gap-4 mb-3">
            <button 
              onClick={onViewHistory}
              className="w-14 h-14 rounded-2xl bg-white border-4 border-[#32213A] flex items-center justify-center text-[#32213A] active:scale-95 transition-all neo-pop-shadow"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h7"/></svg>
            </button>
            
            <div className="relative w-14 h-14">
               <canvas ref={canvasRef} width={100} height={100} className={`absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] transition-opacity duration-300 pointer-events-none ${isRecording ? 'opacity-100' : 'opacity-0'}`} />
               <button 
                  onClick={() => isRecording ? stopVoice("USER_STOP") : startVoice()}
                  disabled={isBusy}
                  className={`w-full h-full rounded-2xl border-4 border-[#32213A] flex items-center justify-center transition-all neo-pop-shadow relative z-10
                    ${isRecording ? 'bg-rose-500 text-white translate-y-1 shadow-none' : 'bg-white text-[#32213A] active:scale-95'}
                    ${isBusy ? 'opacity-40 grayscale' : ''}`}
                >
                  {isRecording ? (
                    <div className="w-5 h-5 bg-white rounded-sm animate-pulse"></div>
                  ) : isBusy ? (
                    <div className="w-5 h-5 border-4 border-t-transparent border-[#32213A] rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                  )}
                </button>
            </div>
          </div>
          
          <div className="flex flex-col items-center min-h-[34px] w-24">
            <span className={`text-[8px] font-black uppercase tracking-widest text-center leading-tight ${isRecording ? 'text-rose-500 animate-pulse' : errorStatus ? 'text-rose-600' : 'text-[#32213A]/30'}`}>
              {isRecording ? "Listening..." : errorStatus ? errorStatus.message : "Ready"}
            </span>
            {errorStatus && errorStatus.cooldown > 0 && (
              <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest leading-none mt-1">
                Wait {errorStatus.cooldown}s
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Draft Notification */}
      {errorStatus?.draft && (
        <div className="mb-4 p-4 bg-white border-4 border-[#32213A] rounded-3xl shadow-[4px_4px_0px_#32213A] flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 z-50">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Unprocessed Draft</span>
            <button 
              disabled={isBusy || errorStatus.cooldown > 0}
              onClick={() => processText(errorStatus.draft!)}
              className="px-3 py-1 bg-[#32213A] text-white text-[8px] font-black uppercase tracking-widest rounded-full active:scale-95 disabled:opacity-20 transition-all"
            >
              {isBusy ? "Processing..." : "Retry Now"}
            </button>
          </div>
          <p className="text-[11px] font-bold text-[#32213A] italic truncate leading-none">"{errorStatus.draft}"</p>
        </div>
      )}

      <div className="mb-6 p-8 bg-white border-4 border-[#32213A] rounded-[3.5rem] shadow-[8px_8px_0px_#32213A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <NeoPopIcon type="CASH" className="w-16 h-16" />
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#32213A]/40 mb-1">Total Spend</span>
            <span className="text-4xl font-black text-[#32213A] tracking-tighter leading-none">₹{totalSpend.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-around items-center py-8 mb-8 border-y-4 border-[#32213A]/10 shrink-0">
        <div className="flex items-center gap-4">
          <NeoPopIcon type="TODO" className="w-10 h-10" />
          <div className="flex flex-col">
            <span className="text-2xl font-black text-[#32213A] leading-none">{realTasksCount}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/40 mt-1">pending tasks</span>
          </div>
        </div>
        <div className="w-1 h-10 bg-[#32213A]/10 rounded-full"></div>
        <div className="flex items-center gap-4">
          <NeoPopIcon type="PULSE" className="w-10 h-10" />
          <div className="flex flex-col">
            <span className="text-2xl font-black text-[#32213A] leading-none truncate max-w-[130px]">{currentMoodText}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/40 mt-1">Overall Mood</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar space-y-4 pt-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#32213A]/40 mb-2 px-2">Recent Thoughts</h3>
        {recentEntries.length === 0 ? (
          <div className="py-20 text-center border-4 border-dashed border-[#32213A]/10 rounded-[2.5rem]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#32213A]/20 italic">No records yet</p>
          </div>
        ) : (
          recentEntries.map(entry => (
            <div key={entry.id} className={`flex gap-5 items-center p-5 rounded-[2.5rem] border-4 border-[#32213A] shadow-[4px_4px_0px_#32213A] transition-colors duration-300 ${getCardStyle(entry.intent)}`}>
              <NeoPopIcon type={entry.intent === 'MOOD' ? 'PULSE' : entry.intent} className="w-8 h-8" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold text-[#32213A] truncate mb-0.5">"{entry.rawText}"</p>
                <span className="text-[8px] font-black text-[#32213A]/40 uppercase tracking-widest">{entry.intent}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
