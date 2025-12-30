import React from 'react';
import { PenTool } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <PenTool size={20} />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">Innovate Design</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-4 w-px bg-slate-300 hidden sm:block"></span>
          <span className="hidden sm:block text-sm font-medium text-slate-600">Professional Idea Evaluation</span>
        </div>
      </div>
    </header>
  );
};