import React, { useState } from 'react';
import { ShieldCheck, Lock, FileText, User } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { jsPDF } from 'jspdf';

interface Props {
  onAgree: (pdfBase64: string) => void;
}

export const ConfidentialityAgreement: React.FC<Props> = ({ onAgree }) => {
  const [fullName, setFullName] = useState('');
  const handleAgree = () => {
    if (!fullName.trim()) return;
    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    doc.setFontSize(18);
    doc.text("Confidentiality Agreement", margin, y);
    y += 15;

    doc.setFontSize(10);
    doc.text(`Date of Acceptance: ${new Date().toLocaleDateString()}`, margin, y);
    y += 10;
    doc.text(`Between: INNOVATE DESIGN and ${fullName.toUpperCase()}`, margin, y);
    y += 15;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("1. Our Commitment to Privacy", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const p1 = "We understand that your ideas are valuable. Innovate Design commits to keeping your submission private, safe, and secure. We use industry-standard encryption and security practices to protect your intellectual property.";
    const split1 = doc.splitTextToSize(p1, 170);
    doc.text(split1, margin, y);
    y += split1.length * 5 + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("2. Non-Disclosure", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const p2 = "Innovate Design agrees not to disclose, copy, reproduce, or distribute your idea to any third party without your express written consent. Your data is used strictly for the purpose of evaluating your product potential and generating your reports.";
    const split2 = doc.splitTextToSize(p2, 170);
    doc.text(split2, margin, y);
    y += split2.length * 5 + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("3. Purpose", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const p3 = "The information you provide is collected solely to assist you in evaluating your product idea, drafting potential patent applications, and developing your business strategy.";
    const split3 = doc.splitTextToSize(p3, 170);
    doc.text(split3, margin, y);
    y += split3.length * 5 + 15;

    doc.setFont("helvetica", "italic");
    doc.text("By accepting this agreement electronically, you confirm that you understand and agree to the terms above.", margin, y);

    const pdfBase64 = doc.output('datauristring');
    onAgree(pdfBase64);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Confidentiality Agreement</h2>
            <p className="text-slate-500 text-sm">Please review our security commitment before proceeding.</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-600 text-sm leading-relaxed">
          <p className="font-semibold text-slate-800">
            THIS AGREEMENT is made between INNOVATE DESIGN and YOU.
          </p>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Lock size={16} className="text-blue-500" />
              1. Our Commitment to Privacy
            </h3>
            <p>
              We understand that your ideas are valuable. Innovate Design commits to keeping your submission private, safe, and secure. We use industry-standard encryption and security practices to protect your intellectual property.
            </p>

            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-500" />
              2. Non-Disclosure
            </h3>
            <p>
              Innovate Design agrees not to disclose, copy, reproduce, or distribute your idea to any third party without your express written consent. Your data is used strictly for the purpose of evaluating your product potential and generating your reports.
            </p>

            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              3. Purpose
            </h3>
            <p>
              The information you provide is collected solely to assist you in evaluating your product idea, drafting potential patent applications, and developing your business strategy.
            </p>

            <p className="italic text-slate-500 mt-4 border-t pt-4">
              By clicking "I Agree & Proceed" below, you confirm that you understand Innovate Design will keep your idea private, safe and secure.
            </p>

            <div className="pt-4 border-t">
              <Input
                label="Your Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Type your name here to sign"
                icon={<User size={18} />}
                required
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Button onClick={handleAgree} size="lg" className="w-full sm:w-auto" disabled={!fullName.trim()}>
            I Agree & Proceed
          </Button>
        </div>
      </div>
    </div>
  );
};