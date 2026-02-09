
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Setup global process.env for compatibility with SDK requirements
// This bridge ensures that keys set in Vercel (e.g., VITE_GEMINI_API_KEY) 
// are accessible via process.env.API_KEY as mandated by the instructions.
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || {};
  (window as any).process.env = (window as any).process.env || {};

  // Try to resolve the API Key from multiple potential environment sources
  const resolvedKey = 
    (window as any).process.env.API_KEY || 
    (import.meta as any).env?.VITE_GEMINI_API_KEY || 
    (import.meta as any).env?.VITE_API_KEY ||
    (import.meta as any).env?.API_KEY ||
    "";

  (window as any).process.env.API_KEY = resolvedKey;
  
  if (!resolvedKey) {
    console.warn("[AURA] Environment Alert: No API Key found. Ensure VITE_GEMINI_API_KEY is set in your deployment environment.");
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
