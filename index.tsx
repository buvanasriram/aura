
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ENVIRONMENT SHIM
 * Ensuring process.env.API_KEY is available as required by the Gemini SDK.
 * We look for a key in import.meta.env (Vite) and shim it into all global process objects.
 */
const bootstrapEnvironment = () => {
  if (typeof window === 'undefined') return;

  const globalObj = (window as any);
  
  // 1. Ensure a unified process.env object exists
  const env = globalObj.process?.env || {};
  const unifiedProcess = { env };
  
  // 2. Link all global references to this same object
  globalObj.process = unifiedProcess;
  (globalThis as any).process = unifiedProcess;

  // 3. Extract key from Vite's build-time environment
  const vKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY;
  
  if (vKey) {
    // Forcibly set/overwrite to ensure it's available
    env.API_KEY = vKey;
    console.log("[AURA] Environment Bootstrap: API Key synchronized (len: " + vKey.length + ")");
  } else if (env.API_KEY) {
    console.log("[AURA] Environment Bootstrap: API Key already present in process.env");
  } else {
    console.warn("[AURA] Environment Bootstrap: No API Key found in build environment.");
  }
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
