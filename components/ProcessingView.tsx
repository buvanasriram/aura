
import React from 'react';

export const ProcessingView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#D4D6B9]">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-4 border-[#32213A]/10 absolute inset-0 animate-ping"></div>
        <div className="w-24 h-24 rounded-full border-4 border-[#32213A] border-t-transparent animate-spin relative"></div>
      </div>
      <h2 className="text-2xl font-black text-[#32213A] mb-2 tracking-tighter uppercase">Synchronizing...</h2>
      <p className="text-[#32213A]/40 text-[10px] font-black uppercase tracking-[0.3em] max-w-xs mx-auto">
        Extracting Vault Intelligence
      </p>
    </div>
  );
};
