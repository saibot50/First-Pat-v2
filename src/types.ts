export interface IdeaData {
  title: string;
  problem: string;
  solution: string;
  targetAudience: string;
  advantages: string;
}

export enum AppStage {
  AGREEMENT = 'AGREEMENT',
  OVERVIEW = 'OVERVIEW',
  ANALYSER = 'ANALYSER',
  PPR_INTRO = 'PPR_INTRO',
  PPR_WIZARD = 'PPR_WIZARD',
  REPORT_RESULT = 'REPORT_RESULT',
  PATENT_WIZARD = 'PATENT_WIZARD'
}

export type FieldName = keyof IdeaData;

export interface FieldConfig {
  key: FieldName;
  label: string;
  placeholder: string;
  isTextArea?: boolean;
}

export interface CompetitorData {
  imageUrl: string;
  name: string;
  brand: string;
  price: string;
  features: [string, string, string];
  problems: [string, string, string];
  url: string;
}

export interface Financials {
  rrp: string;
  year3Sales: string;
  addOnValue: string;
  addOnItem: string;
  targetRevenue: string;
}

export interface Forecast {
  year1: string;
  year2: string;
  year3: string;
  total: string;
}

export interface LeanCanvas {
  problems: string;
  solutions: string;
  uvp: string;
  concept: string;
  customers: string;
  earlyAdopters: string;
  metrics: string;
  channels: string;
  costStructure: string;
  revenueStreams: string;
  preferredRoute: string;
}

export interface PPRData {
  templateFile: Blob | File | null;
  projectName: string;
  clientName: string;
  productSummary: string;
  customerSegments: [string, string, string];
  earlyAdopters: [string, string, string];
  competitors: [CompetitorData, CompetitorData, CompetitorData];
  problemSummary: [string, string, string];
  uvp: string;
  marketData: string;
  marketSourceUrl: string;
  financials: Financials;
  forecast: Forecast;
  leanCanvas: LeanCanvas;
  // Generated content storage
  generatedPdf?: string; // base64 or URL
  generatedHtml?: string;
}

export interface PatentJudgement {
  isPatentable: boolean;
  rationale: string;
}

export interface ApplicantDetails {
  reference?: string;
  name: string;
  address: string;
  inventionTitle: string;
  areApplicantsInventors: boolean;
  otherInventors?: string;
  signature: string;
  date: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface DisclaimerState {
  risks: boolean;
  noGuarantee: boolean;
  fees: boolean;
  ownership: boolean;
}

export interface PatentData {
  internalStage?: string;
  disclaimers: DisclaimerState;
  keyComponents: string;
  variations: string;
  draftDescription: string;
  images: (string | null)[];
  uploadedImages: (string | null)[];
  filingDetails: ApplicantDetails;
  // Generated content storage
  generatedPdf?: string; // base64 or URL
}