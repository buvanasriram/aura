
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ENVIRONMENT SHIM
 * Ensuring process.env.API_KEY is available as required by the Gemini SDK guidelines.
 */
const bootstrapEnvironment = () => {
  if (typeof window === 'undefined') return;

  const globalObj = (window as any);
  
  // Ensure we use the process object defined in index.html to preserve existing references
  globalObj.process = globalObj.process || { env: {} };
  globalObj.process.env = globalObj.process.env || {};
  
  const vKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY;
  
  if (vKey) {
    // Additive assignment ensures that modules with a cached reference to 'process' see the update
    globalObj.process.env.API_KEY = vKey;
    console.log("[AURA] Environment Bootstrap: API Key synchronized (len: " + vKey.length + ")");
  } else if (!globalObj.process.env.API_KEY) {
    console.warn("[AURA] Environment Bootstrap: No API Key found in build context.");
  }

  // Sync globalThis for full environment consistency across different JS loaders
  (globalThis as any).process = globalObj.process;
};

bootstrapEnvironment();

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
