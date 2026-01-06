import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { IdeaData, PatentData, ApplicantDetails } from '../types';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { Input } from './ui/Input';
import { ShieldCheck, Lock, CreditCard, FileText, Image as ImageIcon, CheckCircle, Download, FileCheck, Loader2, ZoomIn, RefreshCw, X } from 'lucide-react';
import { generatePatentDescription, generatePatentFigures, generateSinglePatentFigure, enhanceFieldContent } from '../services/geminiService';

interface Props {
  ideaData: IdeaData;
  onBack: () => void;
}

type Stage = 'DISCLAIMER' | 'PAYMENT' | 'DETAILS' | 'DRAFTING' | 'FILING' | 'SUCCESS';

const INITIAL_DETAILS: ApplicantDetails = {
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
};

export const PatentDrafting: React.FC<Props> = ({ ideaData, onBack }) => {
  const [stage, setStage] = useState<Stage>('DISCLAIMER');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Disclaimer State
  const [disclaimers, setDisclaimers] = useState({
    risks: false,
    noGuarantee: false,
    fees: false,
    ownership: false
  });

  // Drafting State
  const [components, setComponents] = useState('');
  const [variations, setVariations] = useState('');
  const [draft, setDraft] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  
  // Image Controls
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Filing State
  const [details, setDetails] = useState<ApplicantDetails>({
      ...INITIAL_DETAILS, 
      inventionTitle: ideaData.title
  });

  // --- Handlers ---

  const handleDisclaimerChange = (k: keyof typeof disclaimers) => {
    setDisclaimers(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const handleEnhance = async (field: 'components' | 'variations', val: string) => {
    setIsEnhancing(field);
    const enhanced = await enhanceFieldContent(field, val, ideaData);
    if (field === 'components') setComponents(enhanced);
    else setVariations(enhanced);
    setIsEnhancing(null);
  };

  const generateDraft = async () => {
    setIsLoading(true);
    setLoadingText("Drafting patent description (UK IPO Standard)...");
    const result = await generatePatentDescription(ideaData, { components, variations });
    setDraft(result);
    setIsLoading(false);
  };

  const generateFigures = async () => {
    setIsLoading(true);
    setLoadingText("Generating technical patent figures (Main, Alternative, System Diagram)...");
    const imgs = await generatePatentFigures(draft);
    setImages(imgs);
    setIsLoading(false);
  };
  
  const handleRerollImage = async (index: number) => {
      setRegeneratingIndex(index);
      const types: ('main' | 'alt' | 'diagram')[] = ['main', 'alt', 'diagram'];
      const newImg = await generateSinglePatentFigure(draft, types[index]);
      
      setImages(prev => {
          const update = [...prev];
          update[index] = newImg;
          return update;
      });
      setRegeneratingIndex(null);
  };

  const downloadPDF = (type: 'receipt' | 'application') => {
    const doc = new jsPDF();
    const margin = 20;
    const pageHeight = doc.internal.pageSize.height;
    const marginBottom = 30; // Increased margin
    let y = 30; // Start slightly lower

    if (type === 'receipt') {
        doc.setFontSize(18);
        doc.text("Filing Receipt", margin, y);
        y += 15;
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y); y+=10;
        doc.text(`Reference: ${details.reference || 'N/A'}`, margin, y); y+=10;
        doc.text(`Applicant: ${details.name}`, margin, y); y+=10;
        doc.text(`Title: ${details.inventionTitle}`, margin, y); y+=10;
        doc.text("Status: Submitted for Review", margin, y); y+=10;
        doc.text("Payment: £450.00 (Paid)", margin, y); y+=20;
        doc.setFontSize(10);
        doc.text("Thank you for your submission. Our experts will review your filing shortly.", margin, y);
        doc.save("Filing_Receipt.pdf");
    } else {
        // Application Draft
        
        // Title only
        doc.setFontSize(11);
        doc.text(`Title: ${details.inventionTitle}`, margin, y); 
        y += 15;
        
        // Description Header
        doc.setFontSize(14);
        doc.text("Description", margin, y); 
        y += 10;
        doc.setFontSize(10);
        
        // Handle pagination for description text
        const splitText = doc.splitTextToSize(draft, 170);
        const lineHeight = 5;

        splitText.forEach((line: string) => {
             // Check if adding this line pushes into margin
             if (y > pageHeight - marginBottom) {
                 doc.addPage();
                 y = 20; // Reset to top margin
             }
             doc.text(line, margin, y);
             y += lineHeight;
        });
        
        // Add new page for images
        if (images.length > 0) {
            doc.addPage();
            y = 20;
            doc.setFontSize(14);
            doc.text("Drawings", margin, y);
            y += 20;

            const labels = ["Fig 1. Main Invention", "Fig 2. Alternative Embodiment", "Fig 3. System Block Diagram"];
            
            images.forEach((img, i) => {
                if (img) {
                    const imgHeight = 80;
                    const spacing = 20;
                    
                    // Check if image and label fit on current page
                    if (y + imgHeight + 10 > pageHeight - marginBottom) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.setFontSize(10);
                    doc.text(labels[i], margin, y - 5);
                    try {
                        doc.addImage(img, 'PNG', margin, y, 80, imgHeight);
                    } catch(e) { console.error("PDF Image Error", e) }
                    
                    y += imgHeight + spacing;
                }
            });
        }
        
        doc.save("Patent_Application_Draft.pdf");
    }
  };

  // --- Render Steps ---

  const renderDisclaimer = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-blue-600"/> Legal Disclaimer</h2>
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-900">
        Please acknowledge the following before proceeding to the drafting stage.
      </div>
      
      <div className="space-y-4">
        {[
            { k: 'risks', t: 'I acknowledge that patent applications carry inherent risks and there are no guarantees of grant.' },
            { k: 'noGuarantee', t: 'I understand that this tool aids drafting but does not replace professional legal counsel.' },
            { k: 'fees', t: 'I understand that the £450 fee covers the drafting and review service, not official UK IPO filing fees at this stage.' },
            { k: 'ownership', t: 'I confirm the idea is my own and I am the primary inventor.' }
        ].map((item) => (
            <label key={item.k} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <input 
                    type="checkbox" 
                    className="mt-1 h-4 w-4 text-blue-600"
                    checked={(disclaimers as any)[item.k]}
                    onChange={() => handleDisclaimerChange(item.k as any)}
                />
                <span className="text-slate-700 text-sm">{item.t}</span>
            </label>
        ))}
      </div>

      <Button 
        disabled={!Object.values(disclaimers).every(Boolean)}
        onClick={() => setStage('PAYMENT')}
        className="w-full"
      >
        Agree & Continue
      </Button>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-md mx-auto text-center space-y-8 py-10">
      <div className="bg-slate-100 p-6 rounded-full inline-block">
        <CreditCard size={48} className="text-slate-600"/>
      </div>
      <div>
          <h2 className="text-2xl font-bold mb-2">Service Fee</h2>
          <p className="text-slate-600">Drafting, Image Generation & Expert Review</p>
      </div>
      <div className="text-4xl font-bold text-slate-900">£450.00</div>
      
      <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-800 text-left">
        <strong>Includes:</strong>
        <ul className="list-disc ml-4 mt-2 space-y-1">
            <li>AI-assisted Professional Patent Draft</li>
            <li>3 Technical Patent Figures</li>
            <li>Review by In-house Patent Experts</li>
            <li>Application Preparation</li>
        </ul>
      </div>

      <Button onClick={() => setStage('DETAILS')} size="lg" className="w-full">
        Pay Securely
      </Button>
      <p className="text-xs text-slate-400">Secured by Stripe (Mock)</p>
    </div>
  );
  
  const renderDetailInputs = () => (
      <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Invention Details</h2>
              <p className="text-slate-600">Provide extra detail to help the AI draft a robust description.</p>
          </div>
          
          <TextArea 
            label="Key Components" 
            placeholder="List the physical parts (e.g., sensor, casing, microprocessor)..."
            value={components}
            onChange={(e) => setComponents(e.target.value)}
            onAiEnhance={() => handleEnhance('components', components)}
            isAiLoading={isEnhancing === 'components'}
          />
          
          <TextArea 
            label="Potential Variations" 
            placeholder="How else could this be made or used? (e.g., made of plastic instead of metal, used for cats instead of dogs)..."
            value={variations}
            onChange={(e) => setVariations(e.target.value)}
            onAiEnhance={() => handleEnhance('variations', variations)}
            isAiLoading={isEnhancing === 'variations'}
          />
          
          <div className="flex justify-end pt-4">
              <Button onClick={() => { generateDraft(); setStage('DRAFTING'); }} disabled={!components || !variations}>
                  Generate Patent Draft
              </Button>
          </div>
      </div>
  );

  const renderDrafting = () => (
    <div className="max-w-5xl mx-auto space-y-8">
      {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
              <p className="text-lg font-medium text-slate-700 animate-pulse">{loadingText}</p>
          </div>
      ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="text-purple-600"/> Patent Drafting Workspace</h2>
                    <p className="text-slate-500 text-sm">Review and edit the generated description below.</p>
                </div>
                {!images.length && (
                    <Button onClick={generateFigures} icon={<ImageIcon size={16}/>}>Generate Figures</Button>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Column */}
                <div className="space-y-2">
                    <div className="bg-slate-100 p-2 rounded-t-lg border-x border-t border-slate-300 flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <span className="ml-2">Description.txt</span>
                    </div>
                    <textarea 
                        className="w-full h-[600px] p-8 rounded-b-lg border border-slate-300 font-serif text-base leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner text-slate-800 resize-none whitespace-pre-wrap"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        spellCheck={true}
                    />
                </div>

                {/* Images Column */}
                <div className="space-y-4">
                    {images.length > 0 ? (
                        <>
                            <h3 className="font-bold text-lg border-b pb-2">Technical Drawings</h3>
                            <div className="grid grid-cols-1 gap-6">
                                {images.map((img, i) => (
                                    <div key={i} className="border rounded-lg p-2 bg-white shadow-sm relative group">
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button 
                                                onClick={() => handleRerollImage(i)}
                                                className="bg-white p-1.5 rounded-md shadow border hover:text-blue-600 disabled:opacity-50"
                                                disabled={regeneratingIndex === i}
                                                title="Regenerate this image"
                                             >
                                                 <RefreshCw size={16} className={regeneratingIndex === i ? 'animate-spin' : ''} />
                                             </button>
                                             <button 
                                                onClick={() => setSelectedImage(img)}
                                                className="bg-white p-1.5 rounded-md shadow border hover:text-blue-600"
                                                title="Enlarge"
                                             >
                                                 <ZoomIn size={16} />
                                             </button>
                                        </div>

                                        <p className="text-xs font-semibold text-slate-500 mb-2 text-center uppercase tracking-wide">
                                            {i === 0 ? "Fig 1. Main Invention" : i === 1 ? "Fig 2. Alt. Embodiment" : "Fig 3. Block Diagram"}
                                        </p>
                                        
                                        <div className="relative aspect-square bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                                            {regeneratingIndex === i ? (
                                                <Loader2 className="animate-spin text-slate-400" />
                                            ) : img ? (
                                                <img 
                                                    src={img} 
                                                    alt="Patent Figure" 
                                                    className="w-full h-full object-contain cursor-pointer" 
                                                    onClick={() => setSelectedImage(img)}
                                                />
                                            ) : (
                                                <div className="text-slate-400 text-xs">Failed to Gen</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-500">
                            <ImageIcon size={48} className="mb-4 opacity-50"/>
                            <p>Drawings will appear here after generation.</p>
                            <p className="text-xs mt-2">Generate the text draft first.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => setStage('DETAILS')}>Back to Details</Button>
                {images.length > 0 && (
                     <Button onClick={() => setStage('FILING')}>Proceed to Filing</Button>
                )}
            </div>
          </>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
              <button className="absolute top-4 right-4 text-white hover:text-gray-300">
                  <X size={32} />
              </button>
              <img 
                src={selectedImage} 
                alt="Enlarged Patent Figure" 
                className="max-w-full max-h-[90vh] object-contain rounded-sm bg-white"
                onClick={(e) => e.stopPropagation()} 
              />
          </div>
      )}
    </div>
  );

  const renderFiling = () => (
      <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold">Filing Details (Form 1)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input label="Reference (Optional)" value={details.reference} onChange={(e) => setDetails({...details, reference: e.target.value})} />
               <Input label="Title of Invention" value={details.inventionTitle} onChange={(e) => setDetails({...details, inventionTitle: e.target.value})} />
               <div className="md:col-span-2">
                   <Input label="Applicant Name(s)" value={details.name} onChange={(e) => setDetails({...details, name: e.target.value})} />
               </div>
               <div className="md:col-span-2">
                   <TextArea label="Address(es)" value={details.address} onChange={(e) => setDetails({...details, address: e.target.value})} className="min-h-[80px]" />
               </div>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-lg border space-y-4">
              <label className="flex items-center gap-2 font-medium text-sm text-slate-700">
                  <input type="checkbox" checked={details.areApplicantsInventors} onChange={(e) => setDetails({...details, areApplicantsInventors: e.target.checked})} className="rounded text-blue-600"/>
                  Are all applicants named above also inventors?
              </label>
              {!details.areApplicantsInventors && (
                  <Input label="Other Inventors" placeholder="Names..." value={details.otherInventors || ''} onChange={(e) => setDetails({...details, otherInventors: e.target.value})} />
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Signature (Type Full Name)" value={details.signature} onChange={(e) => setDetails({...details, signature: e.target.value})} />
              <Input label="Date" type="date" value={details.date} onChange={(e) => setDetails({...details, date: e.target.value})} />
          </div>

          <div className="border-t pt-4 mt-4 space-y-4">
              <h3 className="font-semibold">Contact Information</h3>
              <Input label="Contact Name" value={details.contactName} onChange={(e) => setDetails({...details, contactName: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Email" type="email" value={details.contactEmail} onChange={(e) => setDetails({...details, contactEmail: e.target.value})} />
                 <Input label="Phone" type="tel" value={details.contactPhone} onChange={(e) => setDetails({...details, contactPhone: e.target.value})} />
              </div>
          </div>

          <Button 
            disabled={!details.name || !details.signature || !details.contactEmail}
            onClick={() => setStage('SUCCESS')} 
            size="lg" 
            className="w-full mt-4"
        >
            Submit Application
          </Button>
      </div>
  );

  const renderSuccess = () => (
      <div className="max-w-xl mx-auto text-center py-12 space-y-8">
          <div className="inline-flex items-center justify-center p-4 bg-green-100 text-green-600 rounded-full">
              <FileCheck size={64} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Application Submitted!</h2>
          <p className="text-slate-600 text-lg">
              Thanks for submitting your application, which will now be reviewed by our in-house patent experts. 
              You should receive a copy of your filing receipt within two working days. 
              We will contact you if we feel any changes are required.
          </p>
          
          <div className="flex flex-col gap-3 max-w-xs mx-auto pt-6">
              <Button variant="outline" onClick={() => downloadPDF('application')} icon={<Download size={18}/>}>
                  Download Application (PDF)
              </Button>
              <Button variant="ghost" onClick={onBack} className="mt-4">Return to Dashboard</Button>
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} size="sm">Back</Button>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stage} STAGE</span>
        </div>
        
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 min-h-[500px]">
            {stage === 'DISCLAIMER' && renderDisclaimer()}
            {stage === 'PAYMENT' && renderPayment()}
            {stage === 'DETAILS' && renderDetailInputs()}
            {stage === 'DRAFTING' && renderDrafting()}
            {stage === 'FILING' && renderFiling()}
            {stage === 'SUCCESS' && renderSuccess()}
        </div>
    </div>
  );
};