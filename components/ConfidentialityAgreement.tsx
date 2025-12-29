import React from 'react';
import { ShieldCheck, Lock, FileText } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  onAgree: () => void;
}

export const ConfidentialityAgreement: React.FC<Props> = ({ onAgree }) => {
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
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Button onClick={onAgree} size="lg" className="w-full sm:w-auto">
            I Agree & Proceed
          </Button>
        </div>
      </div>
    </div>
  );
};