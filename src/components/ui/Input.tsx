import React from 'react';
import { Sparkles } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  onAiEnhance?: () => void;
  isAiLoading?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  onAiEnhance,
  isAiLoading,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-slate-700">
          {label} <span className="text-red-500">*</span>
        </label>
        {onAiEnhance && (
          <button
            type="button"
            onClick={onAiEnhance}
            disabled={isAiLoading || props.disabled}
            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium transition-colors disabled:opacity-50"
            title="Enhance with AI"
          >
            {isAiLoading ? (
               <span className="animate-pulse">Enhancing...</span>
            ) : (
              <>
                <Sparkles size={14} />
                AI Enhance
              </>
            )}
          </button>
        )}
      </div>
      <input
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow h-10 ${className}`}
        {...props}
      />
    </div>
  );
};