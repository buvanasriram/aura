
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="relative h-screen w-full flex flex-col overflow-hidden text-white font-sans">
      <main className="relative z-10 flex-1 overflow-hidden flex flex-col max-w-lg mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
