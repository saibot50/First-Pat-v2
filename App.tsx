import React, { useState } from 'react';
import { ConfidentialityAgreement } from './components/ConfidentialityAgreement';
import { IdeaAnalyser } from './components/IdeaAnalyser';
import { ProductPotentialReport } from './components/ProductPotentialReport';
import { PatentDrafting } from './components/PatentDrafting';
import { Header } from './components/Header';
import { IdeaData, AppStage, PPRData } from './types';

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
    solutions: '', // Prompt didn't specify, keeping default
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