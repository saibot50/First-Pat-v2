import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { auth } from '../services/firebase';
import { uploadAsset } from '../services/storageService';
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
import { ArrowLeft, ArrowRight, Upload, Phone, Loader2, Sparkles, CheckCircle, Globe, BrainCircuit, RefreshCw, Code, ChevronDown, ChevronUp, AlertTriangle, Search, PenTool, Mail, PhoneCall, FileText, FileDown, X } from 'lucide-react';

interface Props {
  ideaData: IdeaData;
  pprData: PPRData;
  onUpdate: (data: PPRData) => void;
  onBack: () => void;
  onProceedToPatent?: () => void;
  hasPatentDraft?: boolean;
  onNavigateToStage?: (stage: AppStage) => void;
}

const STEPS = [
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

export const ProductPotentialReport: React.FC<Props> = ({
  ideaData,
  pprData,
  onUpdate,
  onBack,
  onProceedToPatent,
  hasPatentDraft,
  onNavigateToStage
}) => {
  const { appId } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState<string | null>(null);
  const [judgement, setJudgement] = useState<PatentJudgement | null>(pprData.judgement || null);
  const [showVariables, setShowVariables] = useState(false);
  const [isGeneratingFile, setIsGeneratingFile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [hasAttemptedFinancials, setHasAttemptedFinancials] = useState(false);

  const totalSteps = STEPS.length;
  const stepName = STEPS[currentStep];

  useEffect(() => {
    // Automatically load template if not present
    if (!pprData.templateFile) {
      const loadTemplate = async () => {
        try {
          const response = await fetch('/template.pptx');
          const blob = await response.blob();
          onUpdate({ ...pprData, templateFile: blob });
        } catch (error) {
          console.error("Failed to load automatic template:", error);
        }
      };
      loadTemplate();
    }

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

  // --- CLEANUP OBJECT URLS ---
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleNext = async () => {
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

    } catch (e) {
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
    } catch (e) {
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
    try {
      const result = await generatePatentJudgement(ideaData, pprData);
      setJudgement(result);
      onUpdate({ ...pprData, judgement: result });
    } catch (error) {
      console.error("Final analysis failed", error);
    } finally {
      setIsLoading(false);
    }
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



  // --- SERVER SIDE GENERATION ---

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handlePreviewHtml = async () => {
    setIsGeneratingFile(true);
    try {
      const data = getFlattenedData();
      const response = await fetch('/api/report/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });

      if (!response.ok) throw new Error("Failed to generate preview");

      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      let finalValue = base64;
      if (appId && auth.currentUser) {
        try {
          const url = await uploadAsset(auth.currentUser.uid, appId, 'report-preview.html', base64);
          finalValue = url;
        } catch (storageErr) {
          console.error("Storage upload failed for HTML", storageErr);
        }
      }

      onUpdate({ ...pprData, generatedHtml: finalValue });

      // Force content type to text/html to ensure browser treats it correctly
      const htmlBlob = new Blob([blob], { type: 'text/html' });
      const url = window.URL.createObjectURL(htmlBlob);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (e) {
      console.error("Preview generation error:", e);
      alert("Failed to generate preview");
    } finally {
      setIsGeneratingFile(false);
    }
  };

  const handleDownloadServerPDF = async () => {
    setIsGeneratingFile(true);
    try {
      const data = getFlattenedData();
      const response = await fetch('/api/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          outputName: pprData.projectName || "Report"
        })
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      let finalValue = base64;
      if (appId && auth.currentUser) {
        try {
          const url = await uploadAsset(auth.currentUser.uid, appId, 'report.pdf', base64);
          finalValue = url;
        } catch (storageErr) {
          console.error("Storage upload failed for PDF", storageErr);
        }
      }

      onUpdate({ ...pprData, generatedPdf: finalValue });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pprData.projectName || 'Report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to download PDF");
    } finally {
      setIsGeneratingFile(false);
    }
  };

  // --- CLIENT SIDE PPTX GENERATION ---

  // --- CLIENT SIDE PDF GENERATION ---

  const handleGenerateAndDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const data = getFlattenedData();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const blue = [37, 99, 235]; // #2563eb
    const slate = [51, 65, 85]; // #334155

    const addPageHeader = (title: string) => {
      // Header Bar
      doc.setFillColor(blue[0], blue[1], blue[2]);
      doc.rect(0, 0, pageWidth, 25, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, 17);

      // Subtitle/Branding
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("Innovate Design | Product Potential Report", pageWidth - margin, 16, { align: 'right' });
    };

    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`Generated for ${data.client_name}`, margin, pageHeight - 10);
    };

    // --- PAGE 1: COVER ---
    addPageHeader("Product Potential Report");
    doc.setTextColor(slate[0], slate[1], slate[2]);
    doc.setFontSize(40);
    doc.text(data.project_name, margin, 60);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prepared for: ${data.client_name}`, margin, 80);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 90);

    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.rect(margin, 110, pageWidth - (margin * 2), 60, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Executive Summary", margin + 5, 120);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(data.product_summary, pageWidth - (margin * 2) - 10);
    doc.text(summaryLines, margin + 5, 130);
    addFooter(1);

    // --- PAGE 2: TARGET MARKET ---
    doc.addPage();
    addPageHeader("Target Market Analysis");
    doc.setTextColor(slate[0], slate[1], slate[2]);

    const colWidth = (pageWidth - (margin * 2)) / 2;

    // Customer Segments
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Customer Segments", margin, 45);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    [data.customer_1, data.customer_2, data.customer_3].forEach((seg, i) => {
      if (seg) doc.text(`\u2022 ${seg}`, margin + 5, 55 + (i * 10));
    });

    // Early Adopters
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Early Adopters", margin + colWidth, 45);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    [data.early_adopter_1, data.early_adopter_2, data.early_adopter_3].forEach((ea, i) => {
      if (ea) doc.text(`\u2022 ${ea}`, margin + colWidth + 5, 55 + (i * 10));
    });

    // Market Insight
    doc.setFillColor(239, 246, 255); // bg-blue-50
    doc.rect(margin, 100, pageWidth - (margin * 2), 40, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text("Market Data Point", margin + 5, 110);
    doc.setFont('helvetica', 'normal');
    const mktLines = doc.splitTextToSize(data.mkt_data, pageWidth - (margin * 2) - 10);
    doc.text(mktLines, margin + 5, 118);
    doc.setTextColor(blue[0], blue[1], blue[2]);
    doc.text(`Source: ${data.mkt_source_url}`, margin + 5, 133);
    addFooter(2);

    // --- PAGE 3: COMPETITOR OVERVIEW ---
    doc.addPage();
    addPageHeader("Competitor Landscape");
    doc.setTextColor(slate[0], slate[1], slate[2]);

    const compBoxWidth = (pageWidth - (margin * 2) - 10) / 3;
    [1, 2, 3].forEach((num, i) => {
      const x = margin + (i * (compBoxWidth + 5));
      doc.setFillColor(252, 252, 252);
      doc.rect(x, 40, compBoxWidth, 140, 'S');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text((data as any)[`alt_brand_${num}`] || "Competitor", x + 5, 50);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text((data as any)[`alt_product_name_${num}`] || "", x + 5, 57, { maxWidth: compBoxWidth - 10 });

      doc.setFont('helvetica', 'bold');
      doc.text("Key Features:", x + 5, 80);
      doc.setFont('helvetica', 'normal');
      [1, 2, 3].forEach((f, k) => {
        const feat = (data as any)[`alt_doesjob${num}_${f}`];
        if (feat) doc.text(`- ${feat}`, x + 5, 87 + (k * 12), { maxWidth: compBoxWidth - 10 });
      });

      doc.setFont('helvetica', 'bold');
      doc.text("Gaps / Shortcomings:", x + 5, 135);
      doc.setFont('helvetica', 'normal');
      [1, 2, 3].forEach((p, k) => {
        const prob = (data as any)[`alt_prob${num}_${p}`];
        if (prob) doc.text(`- ${prob}`, x + 5, 142 + (k * 12), { maxWidth: compBoxWidth - 10 });
      });
    });
    addFooter(3);

    // --- PAGE 4: STRATEGY & FINANCIAL ---
    doc.addPage();
    addPageHeader("Growth Strategy");
    doc.setTextColor(slate[0], slate[1], slate[2]);

    // Financials
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Financial Projections", margin, 45);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Primary Product RRP: GBP ${data.ex_rrp}`, margin, 55);
    doc.text(`Add-on Strategy: ${data.ex_av_item} (+GBP ${data.ex_add_value})`, margin, 65);
    doc.text(`Target Revenue per Customer: GBP ${data.ex_tgt_rev}`, margin, 75);
    doc.text(`Est. Year 3 Unit Sales: ${data.ex_yr3_units}`, margin, 85);

    // Forecast
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Customer Growth", margin + colWidth, 45);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Year 1: ${data.cust_yr1} customers`, margin + colWidth, 55);
    doc.text(`Year 2: ${data.cust_yr2} customers`, margin + colWidth, 65);
    doc.text(`Year 3: ${data.cust_yr3} customers`, margin + colWidth, 75);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total (3YR): ${data.tot_cust}`, margin + colWidth, 88);

    // UVP
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, 120, pageWidth - (margin * 2), 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Unique Value Proposition", margin + 5, 132);
    doc.setFontSize(18);
    const uvpLines = doc.splitTextToSize(data.uvp, pageWidth - (margin * 2) - 10);
    doc.text(uvpLines, margin + 5, 145);
    addFooter(4);

    // --- PAGE 5: BUSINESS PLAN ---
    doc.addPage();
    addPageHeader("Lean Business Plan");
    doc.setTextColor(slate[0], slate[1], slate[2]);

    const items = [
      { l: "Problem", v: data.lbp_problems },
      { l: "Solution", v: data.lbp_sol },
      { l: "UVP", v: data.lbp_uvp },
      { l: "Channels", v: data.lbp_chan },
      { l: "Revenue Streams", v: data.lbp_rev_stream },
      { l: "Cost Structure", v: data.lbp_cost_struc }
    ];

    items.forEach((item, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = margin + (col * colWidth);
      const y = 40 + (row * 45);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(item.l, x, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(item.v, colWidth - 10);
      doc.text(lines, x, y + 7);
    });
    addFooter(5);

    // Download
    const safeName = data.project_name.replace(/[^a-z0-9]/gi, '_').substring(0, 20) || "Report";
    const fileName = `${safeName}_PPR.pdf`;

    // Use jsPDF's built-in save method for reliable downloads
    doc.save(fileName);
  };


  // --- RENDER STEPS ---


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
            <Input key={`feat-${k}`} label={`Feature ${k + 1}`} value={comp.features[k]} onChange={(e) => updateCompetitor(index, 'features', e.target.value, k)} />
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-700">3 Problems/Shortcomings</h3>
          {[0, 1, 2].map(k => (
            <Input key={`prob-${k}`} label={`Problem ${k + 1}`} value={comp.problems[k]} onChange={(e) => updateCompetitor(index, 'problems', e.target.value, k)} />
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
        <Button size="sm" onClick={handleManualMarketResearch} isLoading={aiSuggestionLoading === 'market-manual'} icon={<RefreshCw size={14} />}>Refresh Market Data</Button>
      </div>

      <TextArea label="Market Data Point" value={pprData.marketData} onChange={(e) => updateField('marketData', null, e.target.value)} placeholder="e.g. The UK Pet Accessories market was valued at..." />
      <Input label="Source URL" value={pprData.marketSourceUrl} onChange={(e) => updateField('marketSourceUrl', null, e.target.value)} placeholder="https://..." />
    </div>
  );

  const renderFinancials = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financial Projections</h2>
        <Button size="sm" variant="outline" onClick={() => handleAutoFinancials(true)} isLoading={aiSuggestionLoading === 'financials-auto'} icon={<RefreshCw size={14} />}>Regenerate</Button>
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
      { k: 'problems', l: 'Problem' }, { k: 'solutions', l: 'Solution' }, { k: 'uvp', l: 'Unique Value Prop' }, { k: 'concept', l: 'High-level Concept' },
      { k: 'customers', l: 'Target Customers' }, { k: 'earlyAdopters', l: 'Early Adopters' }, { k: 'metrics', l: 'Key Metrics' }, { k: 'channels', l: 'Channels' },
      { k: 'costStructure', l: 'Cost Structure' }, { k: 'revenueStreams', l: 'Revenue Streams' }, { k: 'preferredRoute', l: 'Preferred Route' }
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

  const renderFinalAnalysis = () => {
    if (!judgement) {
      return (
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
    }

    const flattenedData = getFlattenedData();

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="text-center py-4">
          <h2 className="text-3xl font-extrabold text-slate-900">Report Package Ready</h2>
          <p className="text-slate-500 mt-2 font-medium tracking-wide uppercase text-xs">UK IPO Compliance Audit Complete</p>
        </div>

        <div className={`p-8 rounded-2xl border-2 relative overflow-hidden ${judgement.isPatentable ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
          <div className="absolute top-0 right-0 p-4">
            {judgement.isPatentable ? (
              <CheckCircle className="text-emerald-500 opacity-10" size={120} />
            ) : (
              <AlertTriangle className="text-slate-500 opacity-10" size={120} />
            )}
          </div>

          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              {judgement.isPatentable ? <CheckCircle className="text-emerald-600" size={28} /> : <Sparkles className="text-amber-600" size={28} />}
              Patentability Assessment
            </h3>
            <p className="text-slate-800 leading-relaxed text-lg mb-8 whitespace-pre-line">
              {judgement.rationale}
            </p>

            <div className={`p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${judgement.isPatentable
              ? 'bg-white border-emerald-200 shadow-sm'
              : 'bg-white border-slate-200 shadow-sm'
              }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${judgement.isPatentable ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                  <PenTool size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Next Recommended Step</h4>
                  <p className="text-sm text-slate-600">
                    {judgement.isPatentable
                      ? 'Your idea shows strong patent potential. Start the drafting process now.'
                      : 'While a standard patent might be difficult, we can explore other protection routes.'}
                  </p>
                </div>
              </div>
              <Button
                onClick={onProceedToPatent}
                size="lg"
                className={judgement.isPatentable ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                icon={hasPatentDraft ? <ArrowRight size={20} /> : <BrainCircuit size={20} />}
              >
                {hasPatentDraft ? "Resume Patent Application" : "Draft and Apply for Patent"}
              </Button>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FileDown className="text-blue-600" /> Downloads
            </h3>
            <p className="text-sm text-slate-600">
              Generate and download your professional PDF report.
            </p>

            <div className="flex flex-col gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handlePreviewHtml}
                  variant="outline"
                  className="w-full"
                  icon={<Search size={18} />}
                  isLoading={isGeneratingFile}
                >
                  Preview HTML
                </Button>
                <Button
                  onClick={handleDownloadServerPDF}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  icon={<FileText size={18} />}
                  isLoading={isGeneratingFile}
                >
                  Download PDF
                </Button>
              </div>
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
                {showVariables ? 'Hide' : 'Show'} List {showVariables ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[10px] text-slate-700 transition-all ${showVariables ? 'max-h-[300px]' : 'max-h-[120px]'}`}>
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

        {/* Process Roadmap / Quick Navigation */}
        <div className="pt-8 border-t border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
            <Globe className="text-slate-400" size={16} /> Process Roadmap
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <button
              onClick={() => onNavigateToStage?.(AppStage.ANALYSER)}
              className="group p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Step 1</div>
              <div className="text-sm font-bold text-slate-700 group-hover:text-blue-600 flex items-center justify-between">
                Idea Analyser <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </div>
            </button>
            <button
              onClick={() => setCurrentStep(1)} // Jump to Customers
              className="group p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Step 2</div>
              <div className="text-sm font-bold text-slate-700 group-hover:text-blue-600 flex items-center justify-between">
                Market Details <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </div>
            </button>
            <button
              onClick={() => onProceedToPatent?.()}
              className="group p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-purple-300 hover:shadow-md transition-all"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Step 3</div>
              <div className="text-sm font-bold text-slate-700 group-hover:text-purple-600 flex items-center justify-between">
                Patent Draft <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </div>
            </button>
            <button
              onClick={() => onNavigateToStage?.(AppStage.OVERVIEW)}
              className="group p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Finish</div>
              <div className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 flex items-center justify-between">
                Project Hub <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={20} />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>Notice:</strong> Making changes to your report data will not automatically update this assessment. If you have edited your business plan, click
              <button onClick={() => setJudgement(null)} className="mx-1 font-bold underline hover:text-amber-900 border-none bg-transparent cursor-pointer">Reset & Regenerate</button>
              to ensure the UK IPO analysis remains accurate.
            </div>
          </div>
        </div>

        <div className="flex justify-start pt-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(Math.max(0, STEPS.indexOf('Lean Canvas')))} icon={<ArrowLeft size={16} />}>
            Back to Lean Canvas
          </Button>
        </div>
      </div>
    );
  };

  // --- PREVIEW MODAL ---
  const renderPreviewModal = () => {
    if (!showPreview) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-bold text-lg">Report Preview</h3>
            <div className="flex gap-2">
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  Open in New Tab
                </a>
              )}
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-100 p-4 overflow-auto">
            <iframe
              src={previewUrl || ""}
              className="w-full h-full bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm]"
              title="Preview"
            />
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Granular Sidebar Navigation */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Report Sections</h3>
            </div>
            <nav className="p-2 space-y-1">
              {STEPS.map((step, index) => {
                const isActive = currentStep === index;
                const isCompleted = index < currentStep; // Simple heuristic for "previously visited"

                return (
                  <button
                    key={step}
                    onClick={() => setCurrentStep(index)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span className="truncate">{step}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 min-h-[500px]">
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

          <div className="mt-8 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <Button variant="ghost" onClick={handleBack} icon={<ArrowLeft size={20} />}>
              Previous Section
            </Button>

            <div className="text-sm font-medium text-slate-400">
              Step {currentStep + 1} of {totalSteps}
            </div>

            {stepName !== 'Final Analysis' && stepName !== 'Competitor Research' ? (
              <Button onClick={handleNext} icon={<ArrowRight size={20} />}>
                Next Section
              </Button>
            ) : <div className="w-24"></div>}
          </div>
        </div>
      </div>

      {renderPreviewModal()}
    </div>
  );
};