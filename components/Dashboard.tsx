
import React from 'react';
import { Task } from '../types';

interface DashboardProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onClearTasks: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, onToggleTask, onClearTasks }) => {
  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-white/90">Aura</h1>
          <p className="text-white/40 mt-2 font-medium">Your Privacy-First Assistant</p>
        </div>
        {tasks.length > 0 && (
          <button 
            onClick={onClearTasks}
            className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
          >
            Clear All
          </button>
        )}
      </header>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
          <h2 className="text-sm font-semibold tracking-widest uppercase text-white/60">Active Tasks</h2>
        </div>

        {tasks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border border-white/5 rounded-3xl bg-white/5 backdrop-blur-xl">
            <p className="text-white/30 italic">No tasks captured yet.</p>
            <p className="text-white/20 text-xs mt-2">Switch to Voice Mode to add tasks naturally.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTasks.map(task => (
              <div 
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={`group relative p-6 rounded-3xl transition-all cursor-pointer border backdrop-blur-md
                  ${task.completed 
                    ? 'bg-white/5 border-white/10 opacity-50' 
                    : 'bg-white/10 border-white/20 hover:border-white/40 hover:translate-y-[-2px]'
                  }`}
              >
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                      ${task.priority === 'high' ? 'bg-rose-500/20 text-rose-300' : 
                        task.priority === 'medium' ? 'bg-amber-500/20 text-amber-300' : 
                        'bg-emerald-500/20 text-emerald-300'}`}
                    >
                      {task.priority}
                    </span>
                    <h3 className={`mt-3 text-lg font-medium leading-tight ${task.completed ? 'line-through text-white/30' : 'text-white/90'}`}>
                      {task.title}
                    </h3>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-white/40 font-mono tracking-tighter uppercase">
                    <span>{task.category}</span>
                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
