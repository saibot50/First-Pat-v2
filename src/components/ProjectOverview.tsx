import React, { useState } from 'react';
import {
    FileText,
    Download,
    Play,
    FileCode,
    ExternalLink,
    Clock,
    ArrowRight,
    History,
    CheckCircle2,
    LayoutDashboard,
    Mail,
    Phone,
    User,
    FileCheck,
    MessageSquare,
    ShieldCheck,
    Play as PlayIcon,
    Image as ImageIcon
} from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'files' | 'contact'>('files');
    const hasAgreementPdf = !!pprData.agreementPdf;
    const hasPPRPdf = !!pprData.generatedPdf;
    const hasPPRHtml = !!pprData.generatedHtml;
    const hasPatentDraft = !!patentData.draftDescription;
    const hasPatentPdf = !!patentData.generatedPdf;
    const hasDisclaimerPdf = !!patentData.disclaimerPdf;
    const hasFilingFormPdf = !!patentData.filingFormPdf;
    const hasFigures = patentData.images.some(img => img !== null) || patentData.uploadedImages.some(img => img !== null);

    const handleDownload = (uri: string, filename: string) => {
        const link = document.createElement('a');
        link.href = uri;
        link.download = filename;
        if (uri.startsWith('http')) {
            link.target = '_blank';
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            <h1 className="text-3xl font-bold text-slate-900 border-b border-slate-200 pb-4">Project Overview</h1>
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
                <Button onClick={onContinue} icon={<Play size={18} />} disabled={stage === 'SUCCESS'}>
                    {stage === 'SUCCESS' ? 'Filing Complete' : 'Resume Process'}
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('files')}
                    className={`pb-4 px-2 text-sm font-bold transition-all ${activeTab === 'files' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Project Files
                </button>
                <button
                    onClick={() => setActiveTab('contact')}
                    className={`pb-4 px-2 text-sm font-bold transition-all ${activeTab === 'contact' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Contact Innovate
                </button>
            </div>

            {activeTab === 'files' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Generated Documents */}
                    <div className="md:col-span-2 space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                            <FileCode className="text-blue-600" size={20} /> Generated Files
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Confidentiality Agreement */}
                            <div className={`p-4 rounded-lg border transition-all ${hasAgreementPdf ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 opacity-60'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-lg ${hasAgreementPdf ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm truncate">Confidentiality Agreement</h3>
                                        <p className="text-xs text-slate-500">{hasAgreementPdf ? 'Accepted & Saved' : 'Not signed yet'}</p>
                                    </div>
                                </div>
                                {hasAgreementPdf && (
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleDownload(pprData.agreementPdf!, `Confidentiality_Agreement_${title}.pdf`)}>
                                        <Download size={14} className="mr-2" /> Download
                                    </Button>
                                )}
                            </div>
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
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleDownload(pprData.generatedPdf!, `${title}_PPR.pdf`)}>
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
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(pprData.generatedHtml, '_blank')}>
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
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleDownload(patentData.generatedPdf!, `${title}_Patent_Draft.pdf`)}>
                                        <Download size={14} className="mr-2" /> Download
                                    </Button>
                                )}
                            </div>

                            {/* Legal Disclaimer */}
                            <div className={`p-4 rounded-lg border transition-all ${hasDisclaimerPdf ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 opacity-60'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-lg ${hasDisclaimerPdf ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm truncate">Legal Disclaimer</h3>
                                        <p className="text-xs text-slate-500">{hasDisclaimerPdf ? 'Drafting Stage Agreement' : 'Not signed yet'}</p>
                                    </div>
                                </div>
                                {hasDisclaimerPdf && (
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleDownload(patentData.disclaimerPdf!, `${title}_Disclaimer.pdf`)}>
                                        <Download size={14} className="mr-2" /> Download
                                    </Button>
                                )}
                            </div>

                            {/* Patent Filing Details Form */}
                            <div className={`p-4 rounded-lg border transition-all ${hasFilingFormPdf ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 opacity-60'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-lg ${hasFilingFormPdf ? 'bg-amber-50 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <FileCheck size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm truncate">Filing Details (Form 1)</h3>
                                        <p className="text-xs text-slate-500">{hasFilingFormPdf ? 'Final Filing Info' : 'Not submitted yet'}</p>
                                    </div>
                                </div>
                                {hasFilingFormPdf && (
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleDownload(patentData.filingFormPdf!, `${title}_Filing_Details.pdf`)}>
                                        <Download size={14} className="mr-2" /> Download
                                    </Button>
                                )}
                            </div>

                            {/* Patent Live Draft Status */}
                            <div className={`p-4 rounded-lg border transition-all ${hasPatentDraft ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 opacity-60'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-lg ${hasPatentDraft ? 'bg-amber-50 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <Play size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm truncate">Draft Workspace</h3>
                                        <p className="text-xs text-slate-500">{stage === 'SUCCESS' ? 'Application Submitted' : hasPatentDraft ? 'Live Document (Editable)' : 'Not started yet'}</p>
                                    </div>
                                </div>
                                {hasPatentDraft && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => onNavigateToStage(AppStage.PATENT_WIZARD)}
                                        disabled={stage === 'SUCCESS'}
                                    >
                                        {stage === 'SUCCESS' ? 'Locked (Submitted)' : <><ArrowRight size={14} className="mr-2" /> Open Editor</>}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Figures Gallery */}
                        {hasFigures && (
                            <div className="mt-8 space-y-4">
                                <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                                    <ImageIcon className="text-emerald-600" size={20} /> Technical Drawings
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {patentData.images.map((img, i) => {
                                        if (!img) return null;
                                        const standardLabels = ["Main Invention", "Alt. Embodiment", "Block Diagram"];
                                        const label = i < standardLabels.length ? standardLabels[i] : `Figure ${i + 1}`;
                                        return (
                                            <div key={i} className="bg-white border border-slate-200 rounded-lg overflow-hidden group">
                                                <div className="aspect-square bg-slate-50 flex items-center justify-center p-2">
                                                    <img src={img} alt={label} className="max-w-full max-h-full object-contain" />
                                                </div>
                                                <div className="p-3 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                                                    <button
                                                        onClick={() => handleDownload(img, `${title}_Fig_${i + 1}.png`)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Download Figure"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                        <MessageSquare size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Need Help?</h2>
                        <p className="text-slate-500 mt-2">Our team of experts is ready to assist you with your project evaluation or patent drafting.</p>
                    </div>
                    <div className="pt-4">
                        <a
                            href="mailto:info@innovate-design.com"
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                        >
                            <Mail size={18} /> Email info@innovate-design.com
                        </a>
                    </div>
                    <p className="text-xs text-slate-400 pt-4">We typically respond within 24 hours.</p>
                </div>
            )}
        </div>
    );
};
