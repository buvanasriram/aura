import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ENVIRONMENT SHIM
 * This block bridges environment variables from Vite/Vercel (import.meta.env)
 * into the global process.env object required by the Gemini SDK guidelines.
 * 
 * IMPORTANT: Vite requires STATIC references to import.meta.env variables 
 * for them to be replaced during the build process. Accessing them via 
 * dynamic properties (e.g., import.meta.env[key]) will NOT work in production.
 */
if (typeof window !== 'undefined') {
  // Explicitly reference variables so Vite can statically replace them at build time
  // Fix: Cast import.meta to any to resolve property 'env' not found error on ImportMeta
  const VITE_GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;
  // Fix: Cast import.meta to any to resolve property 'env' not found error on ImportMeta
  const VITE_API_KEY = (import.meta as any).env.VITE_API_KEY;
  
  // Choose the first available key
  const resolvedKey = VITE_GEMINI_API_KEY || VITE_API_KEY || "";

  // Set globally for SDK compatibility
  (window as any).process = (window as any).process || {};
  (window as any).process.env = (window as any).process.env || {};
  (window as any).process.env.API_KEY = resolvedKey;

  console.log("[AURA SYSTEM] Bootstrapping Environment...");
  if (resolvedKey) {
    console.log("[AURA SYSTEM] Integrity Check: Global API_KEY injected (len: " + resolvedKey.length + ")");
  } else {
    console.error("[AURA SYSTEM] Critical Error: No API Key detected in static build variables.");
    // Diagnostic logs using static references to help identify missing keys in Vercel dashboard
    console.log("[AURA SYSTEM] Debug - VITE_GEMINI_API_KEY availability:", !!VITE_GEMINI_API_KEY);
    console.log("[AURA SYSTEM] Debug - VITE_API_KEY availability:", !!VITE_API_KEY);
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