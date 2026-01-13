import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { auth } from '../services/firebase';
import { uploadAsset } from '../services/storageService';
import { IdeaData, PatentData, ApplicantDetails, DisclaimerState } from '../types';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { Input } from './ui/Input';
import { ShieldCheck, Lock, CreditCard, FileText, Image as ImageIcon, CheckCircle, Download, FileCheck, Loader2, ZoomIn, RefreshCw, X, Upload } from 'lucide-react';
import { generatePatentDescription, generatePatentFigures, generateSinglePatentFigure, enhanceFieldContent } from '../services/geminiService';

interface Props {
    ideaData: IdeaData;
    data: PatentData;
    onUpdate: (data: PatentData) => void;
    onBack: () => void;
    onForceSave?: (data: PatentData) => Promise<void>;
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

export const PatentDrafting: React.FC<Props> = ({ ideaData, data, onUpdate, onBack, onForceSave }) => {
    const { appId } = useParams();
    // UI State (Local)
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

    // Derived Data (with safe defaults)
    const stage = (data.internalStage as Stage) || 'DISCLAIMER';
    const disclaimers = data.disclaimers || { risks: false, noGuarantee: false, fees: false, ownership: false };
    const components = data.keyComponents || '';
    const variations = data.variations || '';
    const draft = data.draftDescription || '';
    const images = data.images || [null, null, null];
    const uploadedImages = data.uploadedImages || [null, null, null];
    const details = data.filingDetails || { ...INITIAL_DETAILS, inventionTitle: ideaData.title };

    // Helper to update specific fields
    const updateData = (updates: Partial<PatentData>) => {
        onUpdate({ ...data, ...updates });
    };

    const setStage = (newStage: string) => updateData({ internalStage: newStage });

    // --- Handlers ---
    const handleDisclaimerChange = (k: keyof DisclaimerState) => {
        updateData({ disclaimers: { ...disclaimers, [k]: !disclaimers[k] } });
    };

    const handleEnhance = async (field: 'components' | 'variations', val: string) => {
        setIsEnhancing(field);
        const enhanced = await enhanceFieldContent(field, val, ideaData);
        if (field === 'components') updateData({ keyComponents: enhanced });
        else updateData({ variations: enhanced });
        setIsEnhancing(null);
    };

    const generateDraft = async () => {
        setIsLoading(true);
        setError(null);
        setLoadingText("Drafting patent description (UK IPO Standard)...");
        try {
            const result = await generatePatentDescription(ideaData, { components, variations });
            updateData({ draftDescription: result, internalStage: 'DRAFTING' });
            if (onForceSave) {
                await onForceSave({ ...data, draftDescription: result, internalStage: 'DRAFTING' });
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to generate draft. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsLoading(true);
            setLoadingText("Uploading drawing...");
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const result = reader.result as string;
                    let finalValue = result;

                    if (appId && auth.currentUser) {
                        const url = await uploadAsset(auth.currentUser.uid, appId, `figure-${index + 1}.png`, result);
                        finalValue = url;
                    }

                    const newUploads = [...uploadedImages];
                    newUploads[index] = finalValue;

                    const newImages = [...images];
                    newImages[index] = finalValue;

                    updateData({ images: newImages, uploadedImages: newUploads });
                    if (onForceSave) {
                        await onForceSave({ ...data, images: newImages, uploadedImages: newUploads });
                    }
                } catch (err) {
                    console.error("Upload failed", err);
                    alert("Failed to upload image to permanent storage.");
                } finally {
                    setIsLoading(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = (index: number) => {
        const newUploads = [...uploadedImages];
        newUploads[index] = null;

        const newImages = [...images];
        newImages[index] = null; // Clear from display too

        updateData({ images: newImages, uploadedImages: newUploads });
    };

    const generateFigures = async () => {
        setIsLoading(true);
        setLoadingText("Generating technical patent figures (filling empty slots)...");

        const indicesToGenerate: number[] = [];
        const currentImages = [...images];

        for (let i = 0; i < 3; i++) {
            if (!uploadedImages[i] && !currentImages[i]) {
                indicesToGenerate.push(i);
            }
        }

        if (indicesToGenerate.length === 0) {
            setIsLoading(false);
            return;
        }

        try {
            const types: ('main' | 'alt' | 'diagram')[] = ['main', 'alt', 'diagram'];
            const updates = [...currentImages];

            await Promise.all(indicesToGenerate.map(async (idx) => {
                const imgBase64 = await generateSinglePatentFigure(draft, types[idx]);
                let finalImg = imgBase64;

                if (appId && auth.currentUser) {
                    try {
                        const url = await uploadAsset(auth.currentUser.uid, appId, `figure-${idx + 1}.png`, imgBase64);
                        finalImg = url;
                    } catch (storageErr) {
                        console.error("Storage upload failed for figure", storageErr);
                    }
                }
                updates[idx] = finalImg;
            }));
            updateData({ images: updates });
            if (onForceSave) {
                await onForceSave({ ...data, images: updates });
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to generate figures.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRerollImage = async (index: number) => {
        if (uploadedImages[index]) return;

        setRegeneratingIndex(index);
        try {
            const types: ('main' | 'alt' | 'diagram')[] = ['main', 'alt', 'diagram'];
            const imgBase64 = await generateSinglePatentFigure(draft, types[index]);
            let finalImg = imgBase64;

            if (appId && auth.currentUser) {
                try {
                    const url = await uploadAsset(auth.currentUser.uid, appId, `figure-${index + 1}.png`, imgBase64);
                    finalImg = url;
                } catch (storageErr) {
                    console.error("Storage upload failed for reroll", storageErr);
                }
            }

            const update = [...images];
            update[index] = finalImg;
            updateData({ images: update });
            if (onForceSave) {
                await onForceSave({ ...data, images: update });
            }
        } catch (err) {
            console.error("Reroll failed", err);
        } finally {
            setRegeneratingIndex(null);
        }
    };

    const syncPdfToFirestore = async () => {
        const doc = new jsPDF();
        const margin = 20;
        const pageHeight = doc.internal.pageSize.height;
        const marginBottom = 30;
        let y = 30;

        doc.setFontSize(11);
        doc.text(`Title: ${details.inventionTitle}`, margin, y);
        y += 15;

        doc.setFontSize(14);
        doc.text("Description", margin, y);
        y += 10;
        doc.setFontSize(10);

        const splitText = doc.splitTextToSize(draft, 170);
        const lineHeight = 5;

        splitText.forEach((line: string) => {
            if (y > pageHeight - marginBottom) {
                doc.addPage();
                y = 20;
            }
            doc.text(line, margin, y);
            y += lineHeight;
        });

        if (images.length > 0 && images.some(img => img !== null)) {
            doc.addPage();
            y = 20;
            doc.setFontSize(14);
            doc.text("Drawings", margin, y);
            y += 20;

            const labels = ["Fig 1. Main Invention", "Fig 2. Alternative Embodiment", "Fig 3. System Block Diagram"];

            // For image rendering in PDF, we need the base64. 
            // If it's a Storage URL, we might need a workaround, but for now jspdf might struggle with URLs.
            // Actually, we usually have the base64 in the generator anyway.
            // Let's assume the 'img' here might be a URL.

            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                if (img) {
                    const imgHeight = 80;
                    const spacing = 20;

                    if (y + imgHeight + 10 > pageHeight - marginBottom) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.setFontSize(10);
                    doc.text(labels[i], margin, y - 5);

                    try {
                        let finalImg = img;
                        // If it's a Storage URL, we might need to fetch it as a Data URL for jsPDF
                        if (img.startsWith('http')) {
                            const response = await fetch(img);
                            const blob = await response.blob();
                            finalImg = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(blob);
                            });
                        }
                        doc.addImage(finalImg, 'PNG', margin, y, 80, imgHeight);
                    } catch (e) {
                        console.error("PDF Image Error", e);
                    }

                    y += imgHeight + spacing;
                }
            }
        }

        const pdfBase64 = doc.output('datauristring');
        let finalPdfValue = pdfBase64;

        if (appId && auth.currentUser) {
            try {
                const url = await uploadAsset(auth.currentUser.uid, appId, 'patent-draft.pdf', pdfBase64);
                finalPdfValue = url;
            } catch (storageErr) {
                console.error("Storage upload failed for patent PDF", storageErr);
            }
        }

        updateData({ generatedPdf: finalPdfValue });
        if (onForceSave) {
            await onForceSave({ ...data, generatedPdf: finalPdfValue });
        }
        return doc;
    };

    const downloadPDF = async (type: 'receipt' | 'application') => {
        if (type === 'receipt') {
            const doc = new jsPDF();
            const margin = 20;
            let y = 30;
            doc.setFontSize(18);
            doc.text("Filing Receipt", margin, y);
            y += 15;
            doc.setFontSize(12);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y); y += 10;
            doc.text(`Reference: ${details.reference || 'N/A'}`, margin, y); y += 10;
            doc.text(`Applicant: ${details.name}`, margin, y); y += 10;
            doc.text(`Title: ${details.inventionTitle}`, margin, y); y += 10;
            doc.text("Status: Submitted for Review", margin, y); y += 10;
            doc.text("Payment: £450.00 (Paid)", margin, y); y += 20;
            doc.setFontSize(10);
            doc.text("Thank you for your submission. Our experts will review your filing shortly.", margin, y);
            doc.save("Filing_Receipt.pdf");
        } else {
            const doc = await syncPdfToFirestore();
            doc.save("Patent_Application_Draft.pdf");
        }
    };

    // --- Render Steps ---

    const renderDisclaimer = () => (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-blue-600" /> Legal Disclaimer</h2>
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
                            onChange={() => handleDisclaimerChange(item.k as keyof DisclaimerState)}
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
                <CreditCard size={48} className="text-slate-600" />
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
                onChange={(e) => updateData({ keyComponents: e.target.value })}
                onAiEnhance={() => handleEnhance('components', components)}
                isAiLoading={isEnhancing === 'components'}
            />

            <TextArea
                label="Potential Variations"
                placeholder="How else could this be made or used? (e.g., made of plastic instead of metal, used for cats instead of dogs)..."
                value={variations}
                onChange={(e) => updateData({ variations: e.target.value })}
                onAiEnhance={() => handleEnhance('variations', variations)}
                isAiLoading={isEnhancing === 'variations'}
            />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="flex justify-end pt-4">
                <Button onClick={() => generateDraft()} disabled={!components || !variations}>
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
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="text-red-500 mb-4 bg-red-50 p-4 rounded-full">
                        <X size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Generation Failed</h3>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <Button onClick={() => { setError(null); generateDraft(); }}>Try Again</Button>
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="text-purple-600" /> Patent Drafting Workspace</h2>
                            <p className="text-slate-500 text-sm">Review and edit the generated description below. Your changes are saved automatically.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    setIsLoading(true);
                                    setLoadingText("Syncing draft with overview...");
                                    await syncPdfToFirestore();
                                    setIsLoading(false);
                                }}
                                icon={<RefreshCw size={14} />}
                                title="Sync this draft to the Project Overview PDF"
                            >
                                Sync with Overview
                            </Button>
                            {!images.some(img => img !== null) && (
                                <Button size="sm" onClick={generateFigures} icon={<ImageIcon size={16} />}>Generate Missing Figures</Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                onChange={(e) => updateData({ draftDescription: e.target.value })}
                                spellCheck={true}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Technical Drawings</h3>
                                    <Button size="sm" variant="outline" onClick={generateFigures} disabled={isLoading || images.every(i => i !== null)}>
                                        {isLoading ? 'Generating...' : 'Auto-Generate Missing'}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="border rounded-lg p-3 bg-slate-50 relative group">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    {i === 0 ? "Fig 1. Main Invention" : i === 1 ? "Fig 2. Alt. Embodiment" : "Fig 3. Block Diagram"}
                                                </p>

                                                <div className="flex items-center gap-2">
                                                    {uploadedImages[i] ? (
                                                        <button
                                                            onClick={() => handleRemoveImage(i)}
                                                            className="text-xs text-red-500 hover:underline flex items-center gap-1"
                                                        >
                                                            <X size={12} /> Remove Upload
                                                        </button>
                                                    ) : (
                                                        <label className="text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                                                            <Upload size={12} /> Upload
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => handleImageUpload(i, e)}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="relative aspect-video bg-white border border-slate-200 rounded flex items-center justify-center overflow-hidden">
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    {!uploadedImages[i] && images[i] && (
                                                        <button
                                                            onClick={() => handleRerollImage(i)}
                                                            className="bg-white p-1.5 rounded-md shadow border hover:text-blue-600 disabled:opacity-50"
                                                            disabled={regeneratingIndex === i}
                                                            title="Regenerate this image"
                                                        >
                                                            <RefreshCw size={16} className={regeneratingIndex === i ? 'animate-spin' : ''} />
                                                        </button>
                                                    )}
                                                    {images[i] && (
                                                        <button
                                                            onClick={() => setSelectedImage(images[i])}
                                                            className="bg-white p-1.5 rounded-md shadow border hover:text-blue-600"
                                                            title="Enlarge"
                                                        >
                                                            <ZoomIn size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {regeneratingIndex === i ? (
                                                    <div className="flex flex-col items-center">
                                                        <Loader2 className="animate-spin text-slate-400 mb-2" />
                                                        <span className="text-xs text-slate-400">Generatiing...</span>
                                                    </div>
                                                ) : images[i] ? (
                                                    <>
                                                        <img
                                                            src={images[i] || ""}
                                                            alt={`Figure ${i + 1}`}
                                                            className="w-full h-full object-contain cursor-pointer"
                                                            onClick={() => setSelectedImage(images[i])}
                                                        />
                                                        {uploadedImages[i] && (
                                                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded shadow-sm">
                                                                USER UPLOAD
                                                            </div>
                                                        )}
                                                        {!uploadedImages[i] && (
                                                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded shadow-sm">
                                                                AI GENERATED
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
                                                        <span className="text-xs text-slate-400">No image generated</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button variant="outline" onClick={() => setStage('DETAILS')}>Back to Details</Button>
                        {images.some(img => img !== null) && (
                            <Button onClick={() => setStage('FILING')}>Proceed to Filing</Button>
                        )}
                    </div>
                </>
            )}

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
                <Input label="Reference (Optional)" value={details.reference} onChange={(e) => updateData({ filingDetails: { ...details, reference: e.target.value } })} />
                <Input label="Title of Invention" value={details.inventionTitle} onChange={(e) => updateData({ filingDetails: { ...details, inventionTitle: e.target.value } })} />
                <div className="md:col-span-2">
                    <Input label="Applicant Name(s)" value={details.name} onChange={(e) => updateData({ filingDetails: { ...details, name: e.target.value } })} />
                </div>
                <div className="md:col-span-2">
                    <TextArea label="Address(es)" value={details.address} onChange={(e) => updateData({ filingDetails: { ...details, address: e.target.value } })} className="min-h-[80px]" />
                </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border space-y-4">
                <label className="flex items-center gap-2 font-medium text-sm text-slate-700">
                    <input type="checkbox" checked={details.areApplicantsInventors} onChange={(e) => updateData({ filingDetails: { ...details, areApplicantsInventors: e.target.checked } })} className="rounded text-blue-600" />
                    Are all applicants named above also inventors?
                </label>
                {!details.areApplicantsInventors && (
                    <Input label="Other Inventors" placeholder="Names..." value={details.otherInventors || ''} onChange={(e) => updateData({ filingDetails: { ...details, otherInventors: e.target.value } })} />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Signature (Type Full Name)" value={details.signature} onChange={(e) => updateData({ filingDetails: { ...details, signature: e.target.value } })} />
                <Input label="Date" type="date" value={details.date} onChange={(e) => updateData({ filingDetails: { ...details, date: e.target.value } })} />
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
                <h3 className="font-semibold">Contact Information</h3>
                <Input label="Contact Name" value={details.contactName} onChange={(e) => updateData({ filingDetails: { ...details, contactName: e.target.value } })} />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Email" type="email" value={details.contactEmail} onChange={(e) => updateData({ filingDetails: { ...details, contactEmail: e.target.value } })} />
                    <Input label="Phone" type="tel" value={details.contactPhone} onChange={(e) => updateData({ filingDetails: { ...details, contactPhone: e.target.value } })} />
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
                <Button variant="outline" onClick={() => downloadPDF('application')} icon={<Download size={18} />}>
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