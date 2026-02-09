
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ENVIRONMENT SHIM
 * Ensuring process.env.API_KEY is available as required by the Gemini SDK.
 * We look for a key in import.meta.env (Vite) and shim it into process.env if necessary.
 */
if (typeof window !== 'undefined') {
  const globalObj = (window as any);
  globalObj.process = globalObj.process || { env: {} };
  globalObj.process.env = globalObj.process.env || {};

  // Check Vite build variables as a source if the target is currently empty
  const vKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY;
  
  if (vKey && !globalObj.process.env.API_KEY) {
    globalObj.process.env.API_KEY = vKey;
    console.log("[AURA] API Key shimmied from build environment.");
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
