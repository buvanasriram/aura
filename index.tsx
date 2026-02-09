
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Setup global process.env for compatibility with SDK requirements
// This bridge ensures that keys set in Vercel (e.g., VITE_GEMINI_API_KEY) 
// are accessible via process.env.API_KEY as mandated by the instructions.
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || {};
  (window as any).process.env = (window as any).process.env || {};

  // Debug logs for environment variable detection
  console.log("[AURA DEBUG] Checking Environment Sources...");
  // Added cast to any to fix TypeScript error: Property 'env' does not exist on type 'ImportMeta'
  console.log("[AURA DEBUG] import.meta.env:", (import.meta as any).env);
  console.log("[AURA DEBUG] VITE_GEMINI_API_KEY source:", (import.meta as any).env?.VITE_GEMINI_API_KEY ? "FOUND (HIDDEN)" : "NOT FOUND");
  
  // Try to resolve the API Key from multiple potential environment sources
  const resolvedKey = 
    (window as any).process.env.API_KEY || 
    (import.meta as any).env?.VITE_GEMINI_API_KEY || 
    (import.meta as any).env?.VITE_API_KEY ||
    (import.meta as any).env?.API_KEY ||
    "";

  (window as any).process.env.API_KEY = resolvedKey;
  
  console.log("[AURA DEBUG] Final resolved process.env.API_KEY length:", resolvedKey.length);
  
  if (!resolvedKey) {
    console.error("[AURA ERROR] No API Key found in any environment source. Please check Vercel Dashboard for VITE_GEMINI_API_KEY.");
  } else {
    console.log("[AURA SUCCESS] API Key successfully shimmied to process.env.API_KEY");
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
