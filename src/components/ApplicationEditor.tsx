import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { getApplication, saveApplication } from '../services/firestoreService';
import { uploadAsset } from '../services/storageService';
import { Loader2, Save, LogOut } from 'lucide-react';
import { Button } from './ui/Button';
import { IdeaData, AppStage, PPRData, PatentData, ApplicationData } from '../types';
import { ConfidentialityAgreement } from './ConfidentialityAgreement';
import { IdeaAnalyser } from './IdeaAnalyser';
import { ProductPotentialReport } from './ProductPotentialReport';
import { PatentDrafting } from './PatentDrafting';
import { Header } from './Header';

const INITIAL_IDEA_DATA: IdeaData = {
    title: 'A dog collar with gps tracking and cooling',
    problem: 'Dogs can get lost on walks or go missing / are stolen and get hot',
    solution: 'GPS tracking will provide real-time data to a smart device. Kinetic energy from dog movement charges the device. Also includes a cooling fan for hot conditions.',
    targetAudience: 'Dog walkers, owners who have to leave their pets',
    advantages: 'cooling and tracking combined',
};

const INITIAL_PPR_DATA: PPRData = {
    templateFile: null,
    projectName: 'Trakker',
    clientName: 'Toby King',
    productSummary: 'A dog collar with gps tracking and cooling. GPS tracking will provide real-time data to a smart device. Kinetic energy from dog movement charges the device. Also includes a cooling fan for hot conditions.',
    customerSegments: [
        'Outdoor enthusiasts who take their dogs on long wilderness hikes in hot, sunny climates.',
        'Urban residents in warm climates who leave dogs in yards and fear theft or overheating during workdays.',
        ''
    ],
    earlyAdopters: [
        'Extreme desert hikers traveling with thick-furred dogs who require off-grid tracking and active heat management.',
        'Owners of brachycephalic breeds in humid cities requiring real-time location tracking and active cooling to prevent heatstroke.',
        ''
    ],
    competitors: [
        { name: '', brand: '', price: '', features: ['', '', ''], problems: ['', '', ''], url: '', imageUrl: '' },
        { name: '', brand: '', price: '', features: ['', '', ''], problems: ['', '', ''], url: '', imageUrl: '' },
        { name: '', brand: '', price: '', features: ['', '', ''], problems: ['', '', ''], url: '', imageUrl: '' }
    ],
    problemSummary: ['', '', ''],
    uvp: 'The only kinetic collar providing perpetual GPS tracking and active cooling to eliminate manual charging and prevent overheating.',
    marketData: '',
    marketSourceUrl: '',
    financials: { rrp: '', year3Sales: '', addOnValue: '', addOnItem: '', targetRevenue: '' },
    forecast: { year1: '100', year2: '200', year3: '400', total: '700' },
    leanCanvas: {
        problems: 'Pet owners struggle to prevent dogs from getting lost while simultaneously managing heatstroke risks.',
        solutions: '',
        uvp: 'Keep your dog safe and cool with a self-charging GPS and integrated cooling collar.',
        concept: 'A kinetic-powered collar that combines active cooling with real-time GPS safety tracking.',
        customers: 'Safety-conscious pet owners in hot climates seeking integrated GPS tracking and active cooling.',
        earlyAdopters: 'Active dog owners in warm climates whose pets are prone to wandering or overheating.',
        metrics: 'Monthly active users and the daily frequency of cooling system activations.',
        channels: 'Direct online sales and strategic partnerships with local pet boutiques and dog walkers.',
        costStructure: 'Manufacturing, kinetic research, GPS server maintenance, and marketing campaign expenses.',
        revenueStreams: 'Direct collar sales combined with monthly subscription fees for real-time tracking access.',
        preferredRoute: 'Kinetic-powered GPS collar offering real-time tracking and cooling for pet security and comfort.'
    }
};

const INITIAL_PATENT_DATA: PatentData = {
    disclaimers: { risks: false, noGuarantee: false, fees: false, ownership: false },
    keyComponents: '',
    variations: '',
    draftDescription: '',
    images: [null, null, null],
    uploadedImages: [null, null, null],
    filingDetails: {
        reference: '',
        name: '',
        address: '',
        inventionTitle: '',
        areApplicantsInventors: true,
        otherInventors: '',
        signature: '',
        date: new Date().toISOString().split('T')[0],
        contactName: '',
        contactEmail: '',
        contactPhone: ''
    }
};

import { StageNavigator } from './StageNavigator';
import { ProjectOverview } from './ProjectOverview';

// ... (existing constants)

export const ApplicationEditor: React.FC = () => {
    const { appId } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const [projectTitle, setProjectTitle] = useState('New Project');
    const [fullName, setFullName] = useState('');
    const [currentStage, setCurrentStage] = useState<AppStage>(AppStage.OVERVIEW);
    const [resumeStage, setResumeStage] = useState<AppStage>(AppStage.AGREEMENT);
    const [ideaData, setIdeaData] = useState<IdeaData>(INITIAL_IDEA_DATA);
    const [pprData, setPprData] = useState<PPRData>(INITIAL_PPR_DATA);
    const [patentData, setPatentData] = useState<PatentData>(INITIAL_PATENT_DATA);
    const [completedStages, setCompletedStages] = useState<AppStage[]>([]);

    useEffect(() => {
        const loadProject = async () => {
            if (!appId) {
                setIsLoading(false);
                return;
            }

            if (!auth.currentUser) {
                // Wait for auth to initialize (AuthGuard will handle direct redirects)
                return;
            }

            try {
                const data = await getApplication(auth.currentUser.uid, appId);
                if (data) {
                    if (data.title) setProjectTitle(data.title);
                    if (data.fullName) setFullName(data.fullName);

                    // Restore the saved stage
                    if (data.stage && data.stage !== AppStage.OVERVIEW) {
                        const savedStage = data.stage as AppStage;
                        setResumeStage(savedStage);

                        // If it's a "fresh" project (no agreement signed), go straight to AGREEMENT
                        if (savedStage === AppStage.AGREEMENT && !data.pprData?.agreementPdf) {
                            setCurrentStage(AppStage.AGREEMENT);
                        }
                    }

                    if (data.ideaData) setIdeaData({ ...INITIAL_IDEA_DATA, ...data.ideaData });
                    if (data.pprData) setPprData({ ...INITIAL_PPR_DATA, ...data.pprData });
                    if (data.patentData) setPatentData({ ...INITIAL_PATENT_DATA, ...data.patentData });

                    // Derive completed stages
                    const stages = [AppStage.AGREEMENT, AppStage.ANALYSER, AppStage.PPR_WIZARD, AppStage.PATENT_WIZARD];
                    const currentIndex = stages.indexOf(data.stage as AppStage);
                    if (currentIndex !== -1) {
                        setCompletedStages(stages.slice(0, currentIndex));
                    }

                    setLastSaved(data.updatedAt || new Date());
                } else {
                    navigate('/');
                }
            } catch (error) {
                console.error("Failed to load project", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProject();
    }, [appId, navigate, auth.currentUser]);

    // Autosave on data change
    useEffect(() => {
        if (!isLoading && currentStage !== AppStage.OVERVIEW) {
            const timer = setTimeout(() => {
                handleSave();
            }, 5000); // 5s debounce for typing
            return () => clearTimeout(timer);
        }
    }, [ideaData, pprData, patentData]);

    // Immediate save on stage change
    useEffect(() => {
        if (!isLoading && currentStage !== AppStage.OVERVIEW) {
            handleSave();
            // Update completed stages
            const stages = [AppStage.AGREEMENT, AppStage.ANALYSER, AppStage.PPR_WIZARD, AppStage.PATENT_WIZARD];
            const currentIndex = stages.indexOf(currentStage);
            if (currentIndex !== -1) {
                setCompletedStages(prev => {
                    const next = [...prev];
                    stages.slice(0, currentIndex).forEach(s => {
                        if (!next.includes(s)) next.push(s);
                    });
                    return next;
                });
            }
        }
    }, [currentStage]);

    const handleSave = async (forceStage?: AppStage, overrides?: Partial<ApplicationData>) => {
        if (!appId || !auth.currentUser || isLoading) return;

        setIsSaving(true);
        try {
            await saveApplication(auth.currentUser.uid, appId, {
                title: projectTitle, // Matches Dashboard/Creation name
                fullName,
                stage: forceStage || (currentStage === AppStage.OVERVIEW ? resumeStage : currentStage),
                ideaData,
                pprData,
                patentData,
                ...overrides
            });
            setLastSaved(new Date());
        } catch (error) {
            console.error("Save failed", error);
        } finally {
            setIsSaving(false);
        }
    };

    const syncIdeaToPPR = (iData: IdeaData) => {
        setPprData(prev => ({
            ...prev,
            productSummary: prev.productSummary || `Idea: ${iData.title}. ${iData.solution}`
        }));
    }

    const handleIdeaUpdate = (newData: IdeaData) => {
        setIdeaData(newData);
    };

    const handlePPRUpdate = (newData: PPRData) => {
        setPprData(newData);
    };

    const handlePatentUpdate = (newData: PatentData) => {
        setPatentData(newData);
    };

    const handleAgreementSigned = async (pdfBase64: string, name: string) => {
        setIsSaving(true);
        try {
            setFullName(name);
            let finalValue = pdfBase64;
            if (appId && auth.currentUser) {
                const url = await uploadAsset(auth.currentUser.uid, appId, 'confidentiality-agreement.pdf', pdfBase64);
                finalValue = url;
            }
            setPprData(prev => ({ ...prev, agreementPdf: finalValue }));
            setCurrentStage(AppStage.ANALYSER);
            // Force save immediately with the name
            await handleSave(AppStage.ANALYSER, { fullName: name, pprData: { ...pprData, agreementPdf: finalValue } });
        } catch (error) {
            console.error("Failed to upload agreement", error);
            // Fallback to base64 if upload fails? Or just proceed.
            setFullName(name);
            setPprData(prev => ({ ...prev, agreementPdf: pdfBase64 }));
            setCurrentStage(AppStage.ANALYSER);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyserNext = () => {
        syncIdeaToPPR(ideaData);
        setCurrentStage(AppStage.PPR_WIZARD);
    };

    const handleAnalyserBack = () => {
        setCurrentStage(AppStage.AGREEMENT);
    };

    const handlePPRBack = () => {
        setCurrentStage(AppStage.ANALYSER);
    };

    const handleProceedToPatent = () => {
        setCurrentStage(AppStage.PATENT_WIZARD);
        // Pre-fill
        if (!patentData.filingDetails.inventionTitle) {
            setPatentData(prev => ({
                ...prev,
                filingDetails: { ...prev.filingDetails, inventionTitle: ideaData.title }
            }));
        }
    };

    const handlePatentBack = () => {
        setCurrentStage(AppStage.PPR_WIZARD);
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <Header title={projectTitle}>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 mr-2 hidden sm:inline-block">
                        {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Unsaved'}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        icon={isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    >
                        Save
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                            if (!isSaving) {
                                await handleSave();
                                navigate('/');
                            }
                        }}
                        disabled={isSaving}
                        className="text-slate-500"
                        title="Exit to Dashboard"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                    </Button>
                </div>
            </Header>

            {currentStage !== AppStage.OVERVIEW && (
                <StageNavigator
                    currentStage={currentStage}
                    onNavigate={setCurrentStage}
                    completedStages={completedStages}
                />
            )}

            <main className="flex-grow">
                {currentStage === AppStage.OVERVIEW && (
                    <ProjectOverview
                        title={projectTitle}
                        stage={resumeStage}
                        pprData={pprData}
                        patentData={patentData}
                        onContinue={() => setCurrentStage(resumeStage)}
                        onNavigateToStage={setCurrentStage}
                    />
                )}

                {currentStage === AppStage.AGREEMENT && (
                    <ConfidentialityAgreement onAgree={handleAgreementSigned} />
                )}

                {currentStage === AppStage.ANALYSER && (
                    <IdeaAnalyser
                        data={ideaData}
                        onUpdate={handleIdeaUpdate}
                        onNext={handleAnalyserNext}
                        onBack={handleAnalyserBack}
                    />
                )}

                {currentStage === AppStage.PPR_WIZARD && (
                    <ProductPotentialReport
                        ideaData={ideaData}
                        pprData={pprData}
                        onUpdate={handlePPRUpdate}
                        onBack={handlePPRBack}
                        onProceedToPatent={handleProceedToPatent}
                        hasPatentDraft={!!patentData.draftDescription}
                        onNavigateToStage={setCurrentStage}
                        onForceSave={async (data) => await handleSave(undefined, { pprData: data })}
                    />
                )}

                {currentStage === AppStage.PATENT_WIZARD && (
                    <PatentDrafting
                        ideaData={ideaData}
                        data={patentData}
                        onUpdate={handlePatentUpdate}
                        onBack={handlePatentBack}
                        fullName={fullName}
                        onForceSave={async (data) => await handleSave(undefined, { patentData: data })}
                    />
                )}
            </main>
        </div>
    );
};
