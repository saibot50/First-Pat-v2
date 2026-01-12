import React from 'react';
import { FileText, Image as ImageIcon, Download, Play, FileCode, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { PPRData, PatentData, AppStage } from '../types';
import { Button } from './ui/Button';

interface ProjectOverviewProps {
    title: string;
    stage: AppStage;
    pprData: PPRData;
    patentData: PatentData;
    onContinue: () => void;
    onNavigateToStage: (stage: AppStage) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
    title,
    stage,
    pprData,
    patentData,
    onContinue,
    onNavigateToStage
}) => {
    const hasPPRPdf = !!pprData.generatedPdf;
    const hasPPRHtml = !!pprData.generatedHtml;
    const hasPatentDraft = !!patentData.draftDescription;
    const hasPatentPdf = !!patentData.generatedPdf;
    const hasFigures = patentData.images.some(img => img !== null) || patentData.uploadedImages.some(img => img !== null);

    const downloadBase64 = (base64: string, filename: string) => {
        const link = document.createElement('a');
        link.href = base64;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5 font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            <Clock size={14} /> {stage.replace('_', ' ')}
                        </span>
                        <span>Project ID: {window.location.pathname.split('/').pop()}</span>
                    </div>
                </div>
                <Button onClick={onContinue} icon={<Play size={18} />}>
                    Resume Process
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Generated Documents */}
                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                        <FileCode className="text-blue-600" size={20} /> Generated Files
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* PPR PDF */}
                        <div className={`p-4 rounded-lg border transition-all ${hasPPRPdf ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 opacity-60'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${hasPPRPdf ? 'bg-red-50 text-red-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm truncate">Product Potential Report (PDF)</h3>
                                    <p className="text-xs text-slate-500">{hasPPRPdf ? 'Final Document' : 'Not generated yet'}</p>
                                </div>
                            </div>
                            {hasPPRPdf && (
                                <Button variant="outline" size="sm" className="w-full" onClick={() => downloadBase64(pprData.generatedPdf!, `${title}_PPR.pdf`)}>
                                    <Download size={14} className="mr-2" /> Download
                                </Button>
                            )}
                        </div>

                        {/* PPR HTML */}
                        <div className={`p-4 rounded-lg border transition-all ${hasPPRHtml ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 opacity-60'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${hasPPRHtml ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <FileCode size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm truncate">HTML Preview</h3>
                                    <p className="text-xs text-slate-500">{hasPPRHtml ? 'Interactive Version' : 'Not generated yet'}</p>
                                </div>
                            </div>
                            {hasPPRHtml && (
                                <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigateToStage(AppStage.PPR_WIZARD)}>
                                    <Play size={14} className="mr-2" /> View Preview
                                </Button>
                            )}
                        </div>

                        {/* Patent PDF */}
                        <div className={`p-4 rounded-lg border transition-all ${hasPatentPdf ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 opacity-60'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${hasPatentPdf ? 'bg-purple-50 text-purple-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm truncate">Patent Draft (PDF)</h3>
                                    <p className="text-xs text-slate-500">{hasPatentPdf ? 'Ready for filing' : 'Not generated yet'}</p>
                                </div>
                            </div>
                            {hasPatentPdf && (
                                <Button variant="outline" size="sm" className="w-full" onClick={() => downloadBase64(patentData.generatedPdf!, `${title}_Patent_Draft.pdf`)}>
                                    <Download size={14} className="mr-2" /> Download
                                </Button>
                            )}
                        </div>

                        {/* Figures */}
                        <div className={`p-4 rounded-lg border transition-all ${hasFigures ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 opacity-60'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${hasFigures ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <ImageIcon size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm truncate">Technical Drawings</h3>
                                    <p className="text-xs text-slate-500">{hasFigures ? '3 Images Saved' : 'No images'}</p>
                                </div>
                            </div>
                            {hasFigures && (
                                <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigateToStage(AppStage.PATENT_WIZARD)}>
                                    <ArrowRight size={14} className="mr-2" /> View Drawings
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Sidebar */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                        <CheckCircle2 className="text-blue-600" size={20} /> History
                    </h2>
                    <div className="bg-white border border-slate-200 rounded-xl divide-y text-sm">
                        <button onClick={() => onNavigateToStage(AppStage.ANALYSER)} className="w-full text-left p-4 hover:bg-slate-50 flex items-center justify-between group">
                            <span className="text-slate-700">Idea Analyser</span>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                        <button onClick={() => onNavigateToStage(AppStage.PPR_WIZARD)} className="w-full text-left p-4 hover:bg-slate-50 flex items-center justify-between group">
                            <span className="text-slate-700">PPR Wizard</span>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                        <button onClick={() => onNavigateToStage(AppStage.PATENT_WIZARD)} className="w-full text-left p-4 hover:bg-slate-50 flex items-center justify-between group">
                            <span className="text-slate-700">Patent Drafting</span>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
