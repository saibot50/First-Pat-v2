import React, { useState, useEffect } from 'react';
import { PenTool, Key, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

export const Header: React.FC = () => {
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
     if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
         const selected = await (window as any).aistudio.hasSelectedApiKey();
         // If we are in an environment that supports this, we might want to encourage it if the default is failing
         // But initially, let's just track if we can show the button
     }
  };

  const handleApiKey = async () => {
    if ((window as any).aistudio) {
        try {
            await (window as any).aistudio.openSelectKey();
            // Optional: Reload to ensure clean state, although service creates fresh instances
            // window.location.reload(); 
        } catch (e) {
            console.error("Failed to select key", e);
        }
    } else {
        alert("API Key selection is not available in this environment.");
    }
  };

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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleApiKey}
            className="text-slate-500 hover:text-blue-600"
            title="Update API Key (Use if Quota Exceeded)"
          >
            <Key size={16} className="mr-2" />
            <span>API Key</span>
          </Button>
          <span className="h-4 w-px bg-slate-300 hidden sm:block"></span>
          <span className="hidden sm:block text-sm font-medium text-slate-600">Professional Idea Evaluation</span>
        </div>
      </div>
    </header>
  );
};