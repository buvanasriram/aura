
import React, { useState, useEffect, useRef } from 'react';
import { IntentManager } from '../services/intentManager';
import { IntentType } from '../types';
import { ProcessingView } from './ProcessingView';
import { GoogleGenAI, Type } from '@google/genai';

interface VoiceModeProps {
  intentManager: IntentManager;
  onProcessingComplete: (data: { rawText: string; intent: IntentType; entities: any }) => void;
  onExit: () => void;
}

export const VoiceMode: React.FC<VoiceModeProps> = ({ intentManager, onProcessingComplete, onExit }) => {
  const [status, setStatus] = useState("Tap to Begin");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    let timer: number;
    if (cooldownSeconds > 0) {
      timer = window.setInterval(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const initVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const ctx = canvasRef.current.getContext('2d')!;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const centerX = canvasRef.current.width / 2;
        const centerY = canvasRef.current.height / 2;
        
        ctx.beginPath();
        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * 100;
          const angle = (i * 2 * Math.PI) / dataArray.length;
          const x1 = centerX + Math.cos(angle) * 70;
          const y1 = centerY + Math.sin(angle) * 70;
          const x2 = centerX + Math.cos(angle) * (70 + barHeight);
          const y2 = centerY + Math.sin(angle) * (70 + barHeight);
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        }
        ctx.strokeStyle = '#32213A'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
      };
      draw();
      return stream;
    } catch (e) {
      console.error("[AURA] Visualizer error:", e);
      return null;
    }
  };

  const startVoiceCapture = async () => {
    if (cooldownSeconds > 0) return;
    setErrorMessage(null);
    setIsQuotaError(false);
    setTranscript("");
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Voice Recognition not supported on this browser.");
      return;
    }

    const stream = await initVisualizer();
    if (!stream) {
      setErrorMessage("Microphone access denied.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; 
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setStatus("Listening...");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (err: any) => {
      if (err.error !== 'no-speech') {
        setErrorMessage("Speech capture interrupted.");
        stopVoiceCapture();
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        if (transcript.trim().length > 0) {
          processText(transcript);
        } else {
          setIsRecording(false);
          setStatus("Tap to Begin");
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceCapture = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const processText = async (textToProcess: string) => {
    setIsProcessing(true);
    setStatus("Organizing...");
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Using gemini-3-flash-preview as requested for speed and efficiency
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: [{
          parts: [{
            text: `Input: "${textToProcess}"
            System Time: ${today}
            
            Extract context. Be creative with vibes and headlines. 
            Vibe must be a single evocative word. 
            Headline must be a sharp summary.`
          }]
        }],
        config: { 
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { 
                type: Type.STRING, 
                description: 'EXPENSE, TODO, REMINDER, MOOD, or NOTE' 
              },
              entities: {
                type: Type.OBJECT,
                properties: {
                  vibe: { type: Type.STRING, description: '1-word emotional state for MOOD' },
                  headline: { type: Type.STRING, description: '3-5 word summary for MOOD/TODO' },
                  reason: { type: Type.STRING, description: 'Original text for MOOD' },
                  amount: { type: Type.NUMBER, description: 'Cost for EXPENSE' },
                  category: { type: Type.STRING, description: 'Expense category' },
                  details: { type: Type.STRING, description: 'Full context description' },
                  currency: { type: Type.STRING, description: 'Default INR' },
                  date: { type: Type.STRING, description: 'Target date YYYY-MM-DD' },
                  priority: { type: Type.STRING, description: 'high/medium/low' },
                  text: { type: Type.STRING, description: 'Body for NOTE' }
                }
              }
            },
            required: ['intent', 'entities']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      onProcessingComplete({
        rawText: textToProcess.trim(),
        intent: (result.intent as IntentType) || 'NOTE',
        entities: result.entities || {}
      });
    } catch (apiErr: any) {
      console.error("[AURA] Extraction error:", apiErr);
      const is429 = apiErr.message?.includes('429') || apiErr.status === 429;
      if (is429) {
         setIsQuotaError(true);
         setCooldownSeconds(30);
         setErrorMessage("API Busy. Please wait.");
      } else {
         setErrorMessage("Sync Failed. Please retry.");
      }
      setIsProcessing(false);
    }
  };

  if (isProcessing) return <ProcessingView />;

  return (
    <div className="flex-1 flex flex-col p-8 bg-[#D4D6B9] relative overflow-hidden">
      <header className="flex justify-between items-center mb-8 z-20">
        <button onClick={onExit} className="px-6 py-2 bg-white border-4 border-[#32213A] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#32213A] neo-pop-shadow active:translate-y-1 transition-all">Discard</button>
        <div className="px-5 py-2 bg-white rounded-full border-4 border-[#32213A] flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#32213A]/20'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#32213A]">{status}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center items-center text-center z-10">
        <div className={`w-full max-w-sm mb-12 min-h-[120px] flex items-center justify-center transition-all duration-500 overflow-hidden ${isRecording || transcript ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <p className="text-[#32213A] text-lg font-black leading-tight italic px-4 break-words">
             {transcript || (isRecording ? "Listening..." : "")}
          </p>
        </div>

        <div className="relative mb-12 flex items-center justify-center">
          <canvas ref={canvasRef} width={400} height={400} className={`w-64 h-64 transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-5'}`} />
          
          {errorMessage ? (
            <div className="absolute inset-0 m-auto flex flex-col items-center justify-center p-8 bg-white border-4 border-[#32213A] rounded-[3rem] shadow-[12px_12px_0px_#32213A] max-w-xs h-fit animate-in zoom-in duration-300">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <p className="text-[#32213A] text-xs font-black uppercase tracking-widest mb-1">{errorMessage}</p>
              {isQuotaError && cooldownSeconds > 0 && (
                <p className="text-[#32213A]/60 text-[8px] font-black uppercase tracking-widest mb-6">Text limits reset in {cooldownSeconds}s</p>
              )}
              <button 
                disabled={cooldownSeconds > 0}
                onClick={startVoiceCapture} 
                className={`w-full py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all
                  ${cooldownSeconds > 0 
                    ? 'bg-[#32213A]/10 text-[#32213A]/20' 
                    : 'bg-[#32213A] text-white neo-pop-shadow'}`}
              >
                {cooldownSeconds > 0 ? `Wait (${cooldownSeconds}s)` : "Retry Voice Capture"}
              </button>
            </div>
          ) : (
            <button 
              disabled={cooldownSeconds > 0}
              onClick={isRecording ? stopVoiceCapture : startVoiceCapture}
              className={`absolute inset-0 m-auto w-32 h-32 rounded-full border-8 border-white flex items-center justify-center transition-all
                ${isRecording ? 'bg-red-500 shadow-2xl scale-110' : 'bg-[#32213A] shadow-xl active:scale-95'}`}
            >
              {isRecording ? (
                <div className="w-10 h-10 bg-white rounded-xl shadow-inner"></div>
              ) : (
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              )}
            </button>
          )}
        </div>

        <div className="max-w-xs mx-auto">
          <p className="text-[12px] font-black uppercase tracking-[0.4em] text-[#32213A]/40 mb-2">
            Intelligence Active
          </p>
          <p className="text-[14px] font-black text-[#32213A]/60 leading-tight">
            {isRecording ? "Listening to your thoughts..." : "Flash Summaries and Vibes are generated automatically."}
          </p>
        </div>
      </div>
    </div>
  );
};
