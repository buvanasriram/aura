
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
  // Hard-coded constraints to prevent giant icons if Tailwind fails to load
  const sizeStyle = { width: '100%', maxWidth: '48px', height: 'auto', display: 'block', flexShrink: 0 };
  
  switch (type) {
    case 'EXPENSE': 
    case 'CASH':
      return (
        <svg className={iconBase} style={sizeStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="12" rx="4" fill={colorOverride || "#ADF7B6"} stroke="#32213A" strokeWidth="2.5"/>
          <circle cx="12" cy="12" r="3" fill="white" stroke="#32213A" strokeWidth="2"/>
        </svg>
      );
    case 'TODO':
    case 'TASKS':
      return (
        <svg className={iconBase} style={sizeStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="3" fill={colorOverride || "#ADD2C2"} stroke="#32213A" strokeWidth="2.5"/>
          <path d="M8 12L11 15L16 9" stroke="#32213A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'REMINDER':
    case 'ALERTS':
      return (
        <svg className={iconBase} style={sizeStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8V11C6 11.6644 5.71554 12.2961 5.21115 12.7334C4.43632 13.4063 4 14.3828 4 15.4118V16C4 16.5523 4.44772 17 5 17H19C19.5523 17 20 16.5523 20 16V15.4118C20 14.3828 19.5637 13.4063 18.7889 12.7334C18.2845 12.2961 18 11.6644 18 11V8Z" fill={colorOverride || "#F7EF81"} stroke="#32213A" strokeWidth="2.5"/>
          <path d="M10 19C10 20.1046 10.8954 21 12 21C13.1046 21 14 20.1046 14 19" stroke="#32213A" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );
    case 'PULSE':
    case 'MOOD':
      return (
        <svg className={iconBase} style={sizeStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const isApiInFlight = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  const realTasksCount = useMemo(() => tasks.filter(t => t.category !== 'Reminder' && !t.completed).length, [tasks]);
  const