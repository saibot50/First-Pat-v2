import React, { useState } from 'react';
import { ConfidentialityAgreement } from './components/ConfidentialityAgreement';
import { IdeaAnalyser } from './components/IdeaAnalyser';
import { ProductPotentialReport } from './components/ProductPotentialReport';
import { PatentDrafting } from './components/PatentDrafting';
import { Header } from './components/Header';
import { IdeaData, AppStage, PPRData } from './types';

const INITIAL_IDEA_DATA: IdeaData = {
  title: '',
  problem: '',
  solution: '',
  targetAudience: '',
  advantages: '',
};

const INITIAL_PPR_DATA: PPRData = {
  templateFile: null,
  projectName: '',
  clientName: '',
  productSummary: '',
  customerSegments: ['', '', ''],
  earlyAdopters: ['', '', ''],
  competitors: [
      { name: '', brand: '', price: '', features: ['','',''], problems: ['','',''], url: '', imageUrl: '' },
      { name: '', brand: '', price: '', features: ['','',''], problems: ['','',''], url: '', imageUrl: '' },
      { name: '', brand: '', price: '', features: ['','',''], problems: ['','',''], url: '', imageUrl: '' }
  ],
  problemSummary: ['', '', ''],
  uvp: '',
  marketData: '',
  marketSourceUrl: '',
  financials: { rrp: '', year3Sales: '', addOnValue: '', addOnItem: '', targetRevenue: '' },
  forecast: { year1: '100', year2: '200', year3: '400', total: '700' },
  leanCanvas: {
      problems: '', solutions: '', uvp: '', concept: '', customers: '',
      earlyAdopters: '', metrics: '', channels: '', costStructure: '',
      revenueStreams: '', preferredRoute: ''
  }
};

const App: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<AppStage>(AppStage.AGREEMENT);
  const [ideaData, setIdeaData] = useState<IdeaData>(INITIAL_IDEA_DATA);
  const [pprData, setPprData] = useState<PPRData>(INITIAL_PPR_DATA);

  // Auto-populate PPR summary from Idea when moving stages
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

  const handleAgreementSigned = () => {
    setCurrentStage(AppStage.ANALYSER);
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
  };
  
  const handlePatentBack = () => {
      setCurrentStage(AppStage.PPR_WIZARD);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Header />
      
      <main className="flex-grow">
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
            />
        )}
        
        {currentStage === AppStage.PATENT_WIZARD && (
            <PatentDrafting 
                ideaData={ideaData}
                onBack={handlePatentBack}
            />
        )}
      </main>
    </div>
  );
};

export default App;