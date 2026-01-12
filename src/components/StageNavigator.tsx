import React from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { AppStage } from '../types';

interface StageNavigatorProps {
    currentStage: AppStage;
    onNavigate: (stage: AppStage) => void;
    completedStages: AppStage[];
}

const STAGES = [
    { key: AppStage.AGREEMENT, label: 'Agreement' },
    { key: AppStage.ANALYSER, label: 'Idea Analyser' },
    { key: AppStage.PPR_WIZARD, label: 'PPR Wizard' },
    { key: AppStage.PATENT_WIZARD, label: 'Patent Drafting' },
];

export const StageNavigator: React.FC<StageNavigatorProps> = ({ currentStage, onNavigate, completedStages }) => {
    return (
        <nav className="bg-white border-b border-slate-200 shadow-sm overflow-x-auto">
            <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-2 whitespace-nowrap">
                {STAGES.map((stage, index) => {
                    const isCurrent = currentStage === stage.key;
                    const isCompleted = completedStages.includes(stage.key);
                    const canNavigate = isCompleted || index < STAGES.findIndex(s => s.key === currentStage);

                    return (
                        <React.Fragment key={stage.key}>
                            <button
                                onClick={() => canNavigate && onNavigate(stage.key)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${isCurrent
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : canNavigate
                                            ? 'text-slate-600 hover:bg-slate-50'
                                            : 'text-slate-300 cursor-not-allowed'
                                    }`}
                                disabled={!canNavigate}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 size={16} className="text-green-500" />
                                ) : (
                                    <Circle size={16} className={isCurrent ? 'text-blue-500' : 'text-slate-300'} />
                                )}
                                <span className="text-sm">{stage.label}</span>
                            </button>
                            {index < STAGES.length - 1 && (
                                <ChevronRight size={14} className="text-slate-300 mx-1" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </nav>
    );
};
