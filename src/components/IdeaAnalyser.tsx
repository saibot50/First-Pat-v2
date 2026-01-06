import React, { useState } from 'react';
import { IdeaData, FieldName, FieldConfig } from '../types';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { Button } from './ui/Button';
import { enhanceFieldContent } from '../services/geminiService';
import { Lightbulb, ArrowRight, ArrowLeft } from 'lucide-react';

interface Props {
  data: IdeaData;
  onUpdate: (data: IdeaData) => void;
  onNext: () => void;
  onBack: () => void;
}

const FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title of Invention', placeholder: 'e.g. The Automatic Dog Walker', isTextArea: false },
  { key: 'problem', label: 'Problem to Solve', placeholder: 'What specific issue does this solve?', isTextArea: true },
  { key: 'solution', label: 'Solution', placeholder: 'How does your invention solve this problem?', isTextArea: true },
  { key: 'targetAudience', label: 'Who is it for?', placeholder: 'Describe your ideal customer or user base.', isTextArea: true },
  { key: 'advantages', label: 'Advantages over current similar inventions', placeholder: 'Why is yours better? What is the USP?', isTextArea: true },
];

export const IdeaAnalyser: React.FC<Props> = ({ data, onUpdate, onNext, onBack }) => {
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});

  const handleChange = (key: FieldName, value: string) => {
    onUpdate({ ...data, [key]: value });
  };

  const handleAiEnhance = async (key: FieldName) => {
    if (loadingFields[key]) return;

    setLoadingFields(prev => ({ ...prev, [key]: true }));
    try {
      const currentValue = data[key];
      const enhancedText = await enhanceFieldContent(key, currentValue, data);
      handleChange(key, enhancedText);
    } catch (error) {
      console.error("AI Enhance failed", error);
    } finally {
      setLoadingFields(prev => ({ ...prev, [key]: false }));
    }
  };

  const isFormValid = Object.values(data).every((val) => (val as string).trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-full mb-4">
          <Lightbulb size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Idea Analyser</h1>
        <p className="text-slate-600 max-w-xl mx-auto">
          Detail your invention below. Use the AI enhancement tools to refine your descriptions, correct grammar, and expand on your concepts professionally.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 space-y-8">
          {FIELDS.map((field) => (
            <div key={field.key} className="relative">
              {field.isTextArea ? (
                <TextArea
                  label={field.label}
                  placeholder={field.placeholder}
                  value={data[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  onAiEnhance={() => handleAiEnhance(field.key)}
                  isAiLoading={loadingFields[field.key]}
                />
              ) : (
                <Input
                  label={field.label}
                  placeholder={field.placeholder}
                  value={data[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  onAiEnhance={() => handleAiEnhance(field.key)}
                  isAiLoading={loadingFields[field.key]}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between">
          <Button 
            type="button" 
            variant="ghost"
            onClick={onBack}
            icon={<ArrowLeft size={20} />}
          >
            Back
          </Button>
          <div className="flex items-center gap-4">
             <div className="text-sm text-slate-500 hidden sm:block">
                <span className="font-semibold">{isFormValid ? 'Ready to proceed' : 'Complete all fields'}</span>
              </div>
              <Button 
                type="submit" 
                disabled={!isFormValid} 
                size="lg"
                icon={<ArrowRight size={20} />}
              >
                Save & Continue
              </Button>
          </div>
        </div>
      </form>
    </div>
  );
};