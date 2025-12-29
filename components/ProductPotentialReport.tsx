import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { IdeaData, PPRData, CompetitorData, PatentJudgement, AppStage } from '../types';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { Button } from './ui/Button';
import { 
  researchCompetitors, 
  generateProblemSummaries,
  generatePatentJudgement, 
  generateGenericSuggestion, 
  generateMarketData, 
  generateFinancials,
  generateUVP
} from '../services/geminiService';
import { ArrowLeft, ArrowRight, Upload, FileDown, Phone, Loader2, Sparkles, CheckCircle, Globe, BrainCircuit, RefreshCw, Code, ChevronDown, ChevronUp, AlertTriangle, FileType, Search, PenTool, Mail, PhoneCall } from 'lucide-react';

interface Props {
  ideaData: IdeaData;
  pprData: PPRData;
  onUpdate: (data: PPRData) => void;
  onBack: () => void;
  onProceedToPatent?: () => void;
}

const STEPS = [
  'Template',
  'Project Info',
  'Customers',
  'Competitor Research', 
  'Competitor 1',
  'Competitor 2',
  'Competitor 3',
  'Problems & UVP',
  'Market Data',
  'Financials',
  'Forecast',
  'Lean Canvas',
  'Final Analysis'
];

export const ProductPotentialReport: React.FC<Props> = ({ ideaData, pprData, onUpdate, onBack, onProceedToPatent }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState<string | null>(null);
  const [judgement, setJudgement] = useState<PatentJudgement | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [isGeneratingFile, setIsGeneratingFile] = useState(false);
  
  const [hasAttemptedFinancials, setHasAttemptedFinancials] = useState(false);

  const totalSteps = STEPS.length;
  const stepName = STEPS[currentStep];

  useEffect(() => {
    if (stepName === 'Competitor Research') {
      handleCompetitorResearch();
    } else if (stepName === 'Financials' && !pprData.financials.rrp && !hasAttemptedFinancials) {
      handleAutoFinancials();
    }
  }, [stepName]);

  // --- FINANCIAL CALCULATION EFFECT ---
  useEffect(() => {
    const rrp = parseFloat(pprData.financials.rrp) || 0;
    const addOn = parseFloat(pprData.financials.addOnValue) || 0;
    if (rrp > 0 || addOn > 0) {
        const total = (rrp + addOn).toFixed(2);
        // Only update if different to avoid infinite loop
        if (pprData.financials.targetRevenue !== total) {
            updateField('financials', 'targetRevenue', total);
        }
    }
  }, [pprData.financials.rrp, pprData.financials.addOnValue]);

  const handleNext = async () => {
    if (currentStep === 0 && !pprData.templateFile) {
        alert("Please upload a PowerPoint template to proceed.");
        return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const updateField = (section: keyof PPRData, field: any, value: any, index?: number) => {
    const newData = { ...pprData };
    if (index !== undefined && Array.isArray(newData[section])) {
      (newData[section] as any)[index] = value;
    } else if (typeof newData[section] === 'object' && newData[section] !== null && !Array.isArray(newData[section])) {
       (newData[section] as any)[field] = value;
    } else {
      (newData as any)[section] = value;
    }
    onUpdate(newData);
  };

  const updateCompetitor = (index: number, field: keyof CompetitorData, value: any, subIndex?: number) => {
      const newCompetitors = [...pprData.competitors];
      if (subIndex !== undefined && Array.isArray(newCompetitors[index][field])) {
          (newCompetitors[index][field] as any)[subIndex] = value;
      } else {
          (newCompetitors[index] as any)[field] = value;
      }
      onUpdate({ ...pprData, competitors: newCompetitors as [CompetitorData, CompetitorData, CompetitorData] });
  };

  // --- AI HANDLERS ---
  const handleCompetitorResearch = async () => {
    setIsLoading(true);
    setLoadingStage("Scanning global markets & competitors...");
    try {
        await new Promise(r => setTimeout(r, 1000));
        
        // Execute Competitor and Market Research in parallel
        const competitorsPromise = researchCompetitors(ideaData);
        const marketDataPromise = generateMarketData(ideaData);
        
        setLoadingStage("Analyzing industry data...");
        const [competitors, marketResult] = await Promise.all([competitorsPromise, marketDataPromise]);
        
        const updatedCompetitors = [...pprData.competitors];
        if (competitors && competitors.length > 0) {
            competitors.slice(0, 3).forEach((comp, i) => {
                updatedCompetitors[i] = { ...updatedCompetitors[i], ...comp };
            });
        }
        
        setLoadingStage("Identifying gaps...");
        const problemSummaries = await generateProblemSummaries(ideaData, updatedCompetitors as CompetitorData[]);
        
        onUpdate({ 
          ...pprData, 
          competitors: updatedCompetitors as [CompetitorData, CompetitorData, CompetitorData],
          problemSummary: problemSummaries,
          marketData: marketResult.data,
          marketSourceUrl: marketResult.url
        });
        
        await new Promise(r => setTimeout(r, 1000));
        setCurrentStep(prev => prev + 1);
    } catch (e) {
        console.error(e);
        setCurrentStep(prev => prev + 1); 
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualMarketResearch = async () => {
    setAiSuggestionLoading("market-manual");
    try {
      const result = await generateMarketData(ideaData);
      
      const updatedPPR = {
          ...pprData,
          marketData: result.data || pprData.marketData,
          marketSourceUrl: result.url || pprData.marketSourceUrl
      };
      
      onUpdate(updatedPPR);
      
    } catch(e) { 
        console.error("Manual research failed", e);
    } finally {
        setAiSuggestionLoading(null);
    }
  };
  
  const handleUVPGenerate = async () => {
    setAiSuggestionLoading("uvp");
    try {
        const result = await generateUVP(ideaData);
        updateField('uvp', null, result);
    } catch(e) {
        console.error(e);
    } finally {
        setAiSuggestionLoading(null);
    }
  };

  const handleAutoFinancials = async (force: boolean = false) => {
    if (hasAttemptedFinancials && !force) return;
    setHasAttemptedFinancials(true);
    setAiSuggestionLoading("financials-auto");
    try {
      const result = await generateFinancials(ideaData);
      if (result.rrp) {
        onUpdate({
          ...pprData,
          financials: {
            ...pprData.financials,
            ...result
          }
        });
      }
    } catch (e) { console.error(e) }
    setAiSuggestionLoading(null);
  };

  const handleFinalAnalysis = async () => {
    setIsLoading(true);
    setLoadingStage("Consulting UK IPO guidelines...");
    const result = await generatePatentJudgement(ideaData, pprData);
    setJudgement(result);
    setIsLoading(false);
  };
  
  const handleAiSuggest = async (context: string, fieldKey: string, updateFn: (val: string) => void, siblings: string[] = [], maxWords: number = 20) => {
      setAiSuggestionLoading(fieldKey);
      const suggestion = await generateGenericSuggestion(
          `${context} Idea: ${JSON.stringify(ideaData)}. Existing: ${siblings.join(', ')}`, 
          fieldKey,
          maxWords
      );
      updateFn(suggestion);
      setAiSuggestionLoading(null);
  }

  // --- DATA HELPERS ---

  const truncateWords = (str: string, limit: number) => {
    if (!str) return "";
    const words = str.split(/\s+/);
    if (words.length <= limit) return str;
    return words.slice(0, limit).join(' ') + "...";
  };

  const getFlattenedData = () => {
      const d = pprData;
      const c = pprData.competitors;
      const f = pprData.financials;
      
      return {
          "project_name": d.projectName,
          "client_name": d.clientName,
          "product_summary": d.productSummary,
          "customer_1": d.customerSegments[0] || "",
          "customer_2": d.customerSegments[1] || "",
          "customer_3": d.customerSegments[2] || "",
          "early_adopter_1": d.earlyAdopters[0] || "",
          "early_adopter_2": d.earlyAdopters[1] || "",
          "early_adopter_3": d.earlyAdopters[2] || "",
          
          "alt_product_name_1": c[0].name,
          "alt_brand_1": c[0].brand,
          "alt_price_1": c[0].price,
          "alt_url_1": c[0].url,
          "alt_img_1": "[Image: " + c[0].imageUrl + "]",
          "alt_doesjob1_1": c[0].features[0] || "",
          "alt_doesjob1_2": c[0].features[1] || "",
          "alt_doesjob1_3": c[0].features[2] || "",
          "alt_prob1_1": c[0].problems[0] || "",
          "alt_prob1_2": c[0].problems[1] || "",
          "alt_prob1_3": c[0].problems[2] || "",

          "alt_product_name_2": c[1].name,
          "alt_brand_2": c[1].brand,
          "alt_price_2": c[1].price,
          "alt_url_2": c[1].url,
          "alt_img_2": "[Image: " + c[1].imageUrl + "]",
          "alt_doesjob2_1": c[1].features[0] || "",
          "alt_doesjob2_2": c[1].features[1] || "",
          "alt_doesjob2_3": c[1].features[2] || "",
          "alt_prob2_1": c[1].problems[0] || "",
          "alt_prob2_2": c[1].problems[1] || "",
          "alt_prob2_3": c[1].problems[2] || "",

          "alt_product_name_3": c[2].name,
          "alt_brand_3": c[2].brand,
          "alt_price_3": c[2].price,
          "alt_url_3": c[2].url,
          "alt_img_3": "[Image: " + c[2].imageUrl + "]",
          "alt_doesjob3_1": c[2].features[0] || "",
          "alt_doesjob3_2": c[2].features[1] || "",
          "alt_doesjob3_3": c[2].features[2] || "",
          "alt_prob3_1": c[2].problems[0] || "",
          "alt_prob3_2": c[2].problems[1] || "",
          "alt_prob3_3": c[2].problems[2] || "",

          "prob_summary_1": d.problemSummary[0] || "",
          "prob_summary_2": d.problemSummary[1] || "",
          "prob_summary_3": d.problemSummary[2] || "",
          "uvp": d.uvp,

          "mkt_data": d.marketData,
          "mkt_source_url": d.marketSourceUrl,
          "ex_rrp": f.rrp,
          "ex_yr3_units": f.year3Sales,
          "ex_add_value": f.addOnValue,
          "ex_tgt_rev": f.targetRevenue,
          "ex_av_item": f.addOnItem,

          "cust_yr1": d.forecast.year1,
          "cust_yr2": d.forecast.year2,
          "cust_yr3": d.forecast.year3,
          "tot_cust": d.forecast.total,

          "lbp_problems": truncateWords(d.leanCanvas.problems, 15),
          "lbp_exst_sol": truncateWords(c.map(x => x.name).join(', '), 15),
          "lbp_sol": truncateWords(d.leanCanvas.solutions, 15),
          "lbp_keymet": truncateWords(d.leanCanvas.metrics, 15),
          "lbp_uvp": truncateWords(d.leanCanvas.uvp, 15),
          "lbp_hlc": truncateWords(d.leanCanvas.concept, 15),
          "lbp_cost_struc": truncateWords(d.leanCanvas.costStructure, 15),
          "lbp_rrp": truncateWords(f.rrp, 10),
          "lbp_rev_stream": truncateWords(d.leanCanvas.revenueStreams, 15),
          "lbp_pref_route": truncateWords(d.leanCanvas.preferredRoute, 15),
          "lbp_chan": truncateWords(d.leanCanvas.channels, 15),
          "lbp_cust": truncateWords(d.leanCanvas.customers, 15),
          "lbp_ea": truncateWords(d.leanCanvas.earlyAdopters, 15)
      };
  };

  // --- CLIENT SIDE PPTX GENERATION ---

  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
  };
  
  // Creates a regex that finds a key even if it is "shattered" by XML tags
  const createShatteredRegex = (key: string) => {
     const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     const xmlNoise = "(?:<[^>]+>)*";
     let pattern = "\\{" + xmlNoise + "\\{" + xmlNoise;
     for (let i = 0; i < safeKey.length; i++) {
         pattern += safeKey[i] + xmlNoise;
     }
     pattern += "\\}" + xmlNoise + "\\}";
     return new RegExp(pattern, 'g');
  };

  const handleGenerateAndDownload = async () => {
      if (!pprData.templateFile) {
          alert("No template file found. Please upload it in the 'Template' step.");
          return;
      }

      setIsGeneratingFile(true);
      try {
          const zip = new JSZip();
          const content = await zip.loadAsync(pprData.templateFile);
          const data = getFlattenedData();
          const keys = Object.keys(data).sort((a, b) => b.length - a.length);

          // Iterate through all files in the PPTX
          for (const fileName of Object.keys(content.files)) {
              if (fileName.match(/\.xml$/)) {
                   let xmlText = await content.file(fileName)?.async("string");
                   if (xmlText) {
                       let modified = false;
                       for (const key of keys) {
                           const val = (data as any)[key] || "";
                           const escapedVal = escapeXml(String(val));
                           
                           // 1. Try Simple Replacement (Fast)
                           const placeholder = `{{${key}}}`;
                           if (xmlText.includes(placeholder)) {
                               xmlText = xmlText.split(placeholder).join(escapedVal);
                               modified = true;
                           }
                           
                           // 2. Try Shattered Replacement (Robust)
                           const shatteredRegex = createShatteredRegex(key);
                           if (shatteredRegex.test(xmlText)) {
                               xmlText = xmlText.replace(shatteredRegex, escapedVal);
                               modified = true;
                           }
                       }
                       if (modified) {
                           zip.file(fileName, xmlText);
                       }
                   }
              }
          }

          const blob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safeName = pprData.projectName.replace(/[^a-z0-9]/gi, '_').substring(0, 20) || "Report";
          a.download = `${safeName}_PPR.pptx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

      } catch (error) {
          console.error("Generation failed:", error);
          alert("An error occurred while generating the file.");
      } finally {
          setIsGeneratingFile(false);
      }
  };


  // --- RENDER STEPS ---
  
  const renderTemplateStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Template Setup</h2>
      <p className="text-slate-600">Upload your PowerPoint template (.pptx) here.</p>
      
      <div className="border-2 border-dashed border-blue-200 bg-blue-50 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-blue-100 transition-colors cursor-pointer relative">
        <input 
            type="file" 
            accept=".pptx" 
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
                if(e.target.files?.[0]) {
                    onUpdate({...pprData, templateFile: e.target.files[0]});
                }
            }}
        />
        {pprData.templateFile ? (
            <>
                <FileDown size={48} className="text-green-600 mb-4" />
                <p className="text-green-700 font-bold text-lg">{pprData.templateFile.name}</p>
                <p className="text-slate-500 text-sm mt-2">Click to replace</p>
            </>
        ) : (
            <>
                <Upload size={48} className="text-blue-400 mb-4" />
                <p className="text-slate-700 font-medium">Drag & Drop your .pptx template here</p>
            </>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 items-start">
           <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
           <div className="text-sm text-amber-800">
               <strong>Note:</strong> We now support variables even if PowerPoint has split them (e.g. bolding half a word). However, typing <code>{'{{variable}}'}</code> into Notepad first and pasting it into PowerPoint is still the safest method.
           </div>
      </div>
    </div>
  );

  const renderProjectInfo = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Project Details</h2>
      <Input label="Project Name" value={pprData.projectName} onChange={(e) => updateField('projectName', null, e.target.value)} placeholder="e.g. Project Alpha" />
      <Input label="Client Name" value={pprData.clientName} onChange={(e) => updateField('clientName', null, e.target.value)} placeholder="Your Name" />
      <TextArea label="Product Summary" value={pprData.productSummary} onChange={(e) => updateField('productSummary', null, e.target.value)} onAiEnhance={() => handleAiSuggest("Summarize product", "productSummary", (v) => updateField('productSummary', null, v))} isAiLoading={aiSuggestionLoading === "productSummary"} placeholder="Brief summary..." />
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Target Market</h2>
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-700">Customer Segments</h3>
        {[0, 1, 2].map(i => (
          <Input key={`cust-${i}`} label={`Segment ${i + 1}`} value={pprData.customerSegments[i]} onChange={(e) => updateField('customerSegments', null, e.target.value, i)} onAiEnhance={() => handleAiSuggest("Suggest customer segment", `cust-${i}`, (v) => updateField('customerSegments', null, v, i), pprData.customerSegments)} isAiLoading={aiSuggestionLoading === `cust-${i}`} placeholder="e.g. Urban Commuters" />
        ))}
      </div>
      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-semibold text-slate-700">Early Adopters</h3>
         {[0, 1, 2].map(i => (
          <Input key={`early-${i}`} label={`Early Adopter ${i + 1}`} value={pprData.earlyAdopters[i]} onChange={(e) => updateField('earlyAdopters', null, e.target.value, i)} onAiEnhance={() => handleAiSuggest("Suggest niche early adopter", `early-${i}`, (v) => updateField('earlyAdopters', null, v, i), pprData.earlyAdopters)} isAiLoading={aiSuggestionLoading === `early-${i}`} placeholder="e.g. Eco-conscious professionals" />
        ))}
      </div>
    </div>
  );

  const renderEnhancedProgress = () => (
      <div className="flex flex-col items-center justify-center py-20 min-h-[500px]">
          <div className="relative mb-8">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full h-32 w-32"></div>
              <div className="h-32 w-32 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-blue-600 border-l-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                   <Globe className="text-blue-600 animate-pulse" size={40} />
              </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Product DNA</h2>
          <p className="text-blue-600 font-medium text-lg animate-pulse">{loadingStage || "Processing..."}</p>
          <p className="text-slate-400 text-sm mt-8 max-w-xs text-center">Please leave this tab open.</p>
      </div>
  );

  const renderCompetitor = (index: number) => {
    const comp = pprData.competitors[index];
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">Competitor {index + 1} <span className="text-sm font-normal text-slate-500">(Review & Edit)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Product Name" value={comp.name} onChange={(e) => updateCompetitor(index, 'name', e.target.value)} />
            <Input label="Brand / Manufacturer" value={comp.brand} onChange={(e) => updateCompetitor(index, 'brand', e.target.value)} />
            <Input label="RRP (£)" value={comp.price} onChange={(e) => updateCompetitor(index, 'price', e.target.value)} />
            <Input label="Product URL" value={comp.url} onChange={(e) => updateCompetitor(index, 'url', e.target.value)} />
        </div>
        <div className="space-y-2">
             <label className="text-sm font-semibold text-slate-700">Product Image Description</label>
             <TextArea label="" value={comp.imageUrl} onChange={(e) => updateCompetitor(index, 'imageUrl', e.target.value)} placeholder="Description..." />
        </div>
        <div className="space-y-2">
            <h3 className="font-semibold text-slate-700">3 Features</h3>
            {[0, 1, 2].map(k => (
                <Input key={`feat-${k}`} label={`Feature ${k+1}`} value={comp.features[k]} onChange={(e) => updateCompetitor(index, 'features', e.target.value, k)} />
            ))}
        </div>
        <div className="space-y-2">
            <h3 className="font-semibold text-slate-700">3 Problems/Shortcomings</h3>
            {[0, 1, 2].map(k => (
                <Input key={`prob-${k}`} label={`Problem ${k+1}`} value={comp.problems[k]} onChange={(e) => updateCompetitor(index, 'problems', e.target.value, k)} />
            ))}
        </div>
      </div>
    );
  };

  const renderProblemsUVP = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Problems & Value Proposition</h2>
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-700">Summary of Main Problems</h3>
        {[0, 1, 2].map(i => (
          <TextArea key={`probsum-${i}`} label={`Problem Summary ${i + 1}`} value={pprData.problemSummary[i]} onChange={(e) => updateField('problemSummary', null, e.target.value, i)} placeholder="Describe a key issue..." onAiEnhance={() => handleAiSuggest("Describe problem", `probsum-${i}`, (v) => updateField('problemSummary', null, v, i), pprData.problemSummary)} isAiLoading={aiSuggestionLoading === `probsum-${i}`} />
        ))}
      </div>
      <TextArea 
          label="Unique Value Proposition (UVP)" 
          value={pprData.uvp} 
          onChange={(e) => updateField('uvp', null, e.target.value)} 
          onAiEnhance={handleUVPGenerate} 
          isAiLoading={aiSuggestionLoading === "uvp"} 
          placeholder="Why is your product best?" 
      />
    </div>
  );

  const renderMarketData = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Market Data</h2>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between border border-blue-100">
          <div className="flex items-center gap-2 text-blue-800 text-sm">
             <Search size={18} />
             <span>Review the automatically gathered market data below.</span>
          </div>
          <Button size="sm" onClick={handleManualMarketResearch} isLoading={aiSuggestionLoading === 'market-manual'} icon={<RefreshCw size={14}/>}>Refresh Market Data</Button>
      </div>

      <TextArea label="Market Data Point" value={pprData.marketData} onChange={(e) => updateField('marketData', null, e.target.value)} placeholder="e.g. The UK Pet Accessories market was valued at..." />
       <Input label="Source URL" value={pprData.marketSourceUrl} onChange={(e) => updateField('marketSourceUrl', null, e.target.value)} placeholder="https://..." />
    </div>
  );

  const renderFinancials = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financial Projections</h2>
        <Button size="sm" variant="outline" onClick={() => handleAutoFinancials(true)} isLoading={aiSuggestionLoading === 'financials-auto'} icon={<RefreshCw size={14}/>}>Regenerate</Button>
      </div>
      <Input label="Example RRP (£)" value={pprData.financials.rrp} onChange={(e) => updateField('financials', 'rrp', e.target.value)} />
      <Input label="Est. Year 3 Sales (Units)" value={pprData.financials.year3Sales} onChange={(e) => updateField('financials', 'year3Sales', e.target.value)} />
      <div className="p-4 bg-slate-50 rounded-lg space-y-4 border">
        <h3 className="font-semibold text-slate-800">Add-on Strategy</h3>
        <Input label="Potential Add-on Item" value={pprData.financials.addOnItem} onChange={(e) => updateField('financials', 'addOnItem', e.target.value)} placeholder="e.g. Refill packs" />
        <Input label="Est. Add-on Value (£)" value={pprData.financials.addOnValue} onChange={(e) => updateField('financials', 'addOnValue', e.target.value)} />
      </div>
      <Input label="Total Target Revenue per Customer (£)" value={pprData.financials.targetRevenue} onChange={(e) => updateField('financials', 'targetRevenue', e.target.value)} placeholder="Calculated: RRP + Add-on Value" readOnly className="bg-slate-50" />
    </div>
  );

  const renderForecast = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Growth Forecast</h2>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Year 1 Customers" value={pprData.forecast.year1} onChange={(e) => updateField('forecast', 'year1', e.target.value)} />
        <Input label="Year 2 Customers" value={pprData.forecast.year2} onChange={(e) => updateField('forecast', 'year2', e.target.value)} />
        <Input label="Year 3 Customers" value={pprData.forecast.year3} onChange={(e) => updateField('forecast', 'year3', e.target.value)} />
         <Input label="Total Customers (3 Years)" value={pprData.forecast.total} onChange={(e) => updateField('forecast', 'total', e.target.value)} />
      </div>
    </div>
  );

  const renderLeanCanvas = () => {
    const fields = [
        {k: 'problems', l: 'Problem'}, {k: 'solutions', l: 'Solution'}, {k: 'uvp', l: 'Unique Value Prop'}, {k: 'concept', l: 'High-level Concept'},
        {k: 'customers', l: 'Target Customers'}, {k: 'earlyAdopters', l: 'Early Adopters'}, {k: 'metrics', l: 'Key Metrics'}, {k: 'channels', l: 'Channels'},
        {k: 'costStructure', l: 'Cost Structure'}, {k: 'revenueStreams', l: 'Revenue Streams'}, {k: 'preferredRoute', l: 'Preferred Route'}
    ];
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Lean Business Plan</h2>
            <div className="grid grid-cols-1 gap-6">
                {fields.map((f) => (
                    <TextArea key={f.k} label={f.l} value={(pprData.leanCanvas as any)[f.k]} onChange={(e) => updateField('leanCanvas', f.k, e.target.value)} onAiEnhance={() => handleAiSuggest(`Lean Canvas section: ${f.l}`, `lc-${f.k}`, (v) => updateField('leanCanvas', f.k, v), [], 15)} isAiLoading={aiSuggestionLoading === `lc-${f.k}`} className="min-h-[80px]" />
                ))}
            </div>
        </div>
    );
  };
  
  const renderFinalAnalysis = () => (
    <div className="flex flex-col items-center justify-center py-10 space-y-8 text-center">
        <div className="bg-blue-600 p-6 rounded-full text-white shadow-xl">
            <BrainCircuit size={48} />
        </div>
        
        <div className="space-y-4 max-w-lg">
            <h2 className="text-2xl font-bold text-slate-900">Final Analysis</h2>
            <p className="text-slate-600">
                You have completed all sections. We will now perform a final patentability assessment and prepare your download package.
            </p>
        </div>

        <Button 
            onClick={handleFinalAnalysis} 
            size="lg" 
            className="w-full max-w-md h-14 text-lg shadow-lg shadow-blue-200"
            icon={<Sparkles className="mr-2" />}
        >
            Generate Final Assessment
        </Button>
    </div>
  );

  const renderJudgement = () => {
    if (!judgement) return null;
    const flattenedData = getFlattenedData();

    return (
        <div className="space-y-8">
            <div className="text-center py-4">
                <h2 className="text-3xl font-bold text-slate-900">Report Package Ready</h2>
                <p className="text-slate-500 mt-2">Your data has been processed.</p>
            </div>
            
            <div className={`p-6 rounded-xl border-2 ${judgement.isPatentable ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    {judgement.isPatentable ? <CheckCircle className="text-green-600"/> : <Sparkles className="text-amber-600"/>}
                    Patentability Assessment
                </h3>
                <p className="text-slate-800 mb-4 whitespace-pre-line">{judgement.rationale}</p>
                
                {judgement.isPatentable ? (
                    <div className="mt-4 p-4 bg-green-100 rounded-lg flex items-center justify-between flex-wrap gap-4">
                         <div className="flex items-center gap-3">
                             <PenTool className="text-green-700" size={24} />
                             <div>
                                 <h4 className="font-bold text-green-900">Ready to Draft</h4>
                                 <p className="text-sm text-green-800">Your idea may have patent potential. Start the drafting process now.</p>
                             </div>
                         </div>
                         <Button onClick={onProceedToPatent} variant="primary" className="bg-green-700 hover:bg-green-800 border-green-800">
                             Draft and Apply for Patent
                         </Button>
                    </div>
                ) : (
                    <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
                                <PhoneCall size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-1">Contact Innovate Design</h4>
                                <p className="text-sm text-slate-600 mb-3">
                                    While a standard patent might be difficult, there are other ways to protect and monetize your idea (Design Rights, Copyright, Prototyping). 
                                    Speak to our experts to explore your options.
                                </p>
                                <div className="flex gap-3">
                                    <Button variant="outline" size="sm" icon={<PhoneCall size={14}/>}>
                                        0123 456 7890
                                    </Button>
                                    <Button variant="outline" size="sm" icon={<Mail size={14}/>}>
                                        Email Us
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileDown className="text-blue-600" /> Downloads
                    </h3>
                    <p className="text-sm text-slate-600">
                        Click below to generate and download your filled PowerPoint report.
                    </p>
                    
                    <div className="flex flex-col gap-3 py-4">
                        <Button 
                            onClick={handleGenerateAndDownload} 
                            isLoading={isGeneratingFile}
                            size="lg"
                            className="w-full py-4 text-lg"
                            icon={<FileType />}
                        >
                            {isGeneratingFile ? "Generating Report..." : "Generate & Download Report"}
                        </Button>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500">
                        <p><strong>Note:</strong> This process runs entirely in your browser.</p>
                    </div>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Code className="text-purple-600" /> Template Variables
                        </h3>
                        <button 
                            onClick={() => setShowVariables(!showVariables)} 
                            className="text-sm text-blue-600 hover:underline flex items-center"
                        >
                            {showVariables ? 'Hide' : 'Show'} List {showVariables ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                    </div>
                    
                    <div className={`flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-slate-700 transition-all ${showVariables ? 'max-h-[400px]' : 'max-h-[200px]'}`}>
                        <table className="w-full text-left">
                            <tbody>
                                {Object.keys(flattenedData).map(key => (
                                    <tr key={key} className="border-b border-slate-100 last:border-0">
                                        <td className="py-1 pr-2 font-bold select-all text-purple-700">{`{{${key}}}`}</td>
                                        <td className="py-1 text-slate-500 truncate max-w-[120px] opacity-70">
                                            {typeof flattenedData[key as keyof typeof flattenedData] === 'string' 
                                                ? (flattenedData[key as keyof typeof flattenedData] as string).substring(0, 20) + '...' 
                                                : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // --- MAIN RENDER ---
  
  if (isLoading) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8 bg-white rounded-xl shadow-lg border border-slate-200">
             {stepName === 'Competitor Research' ? renderEnhancedProgress() : (
                 <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                    <h2 className="text-xl font-semibold">{loadingStage}</h2>
                </div>
             )}
        </div>
      );
  }
  
  if (judgement) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8 bg-white rounded-xl shadow-lg border border-slate-200">
            {renderJudgement()}
        </div>
      )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
          <span>{stepName}</span>
          <span>Step {currentStep + 1} of {totalSteps}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 min-h-[400px]">
        {stepName === 'Template' && renderTemplateStep()}
        {stepName === 'Project Info' && renderProjectInfo()}
        {stepName === 'Customers' && renderCustomers()}
        {stepName === 'Competitor 1' && renderCompetitor(0)}
        {stepName === 'Competitor 2' && renderCompetitor(1)}
        {stepName === 'Competitor 3' && renderCompetitor(2)}
        {stepName === 'Problems & UVP' && renderProblemsUVP()}
        {stepName === 'Market Data' && renderMarketData()}
        {stepName === 'Financials' && renderFinancials()}
        {stepName === 'Forecast' && renderForecast()}
        {stepName === 'Lean Canvas' && renderLeanCanvas()}
        {stepName === 'Final Analysis' && renderFinalAnalysis()}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={handleBack} icon={<ArrowLeft size={20} />}>
          Back
        </Button>
        {stepName !== 'Final Analysis' && stepName !== 'Competitor Research' && (
             <Button onClick={handleNext} icon={<ArrowRight size={20} />}>
                Next
            </Button>
        )}
      </div>
    </div>
  );
};