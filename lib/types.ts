export type Direction = "KR->JP" | "JP->KR";
export type LlmMode = "live" | "mock";
export type RiskLevel = "low" | "needs_check" | "high";
export type Verdict = "supported" | "uncertain" | "contradicted";
export type RateBasis = "live" | "mock" | "table";

export interface ItemInput {
  description: string;
  valueJpy: number;
}

export interface ClassifiedItem extends ItemInput {
  category: string;
  riskLevel: RiskLevel;
  riskSignals: string[];
}

export interface Classification {
  items: ClassifiedItem[];
  notes: string;
}

export interface ProhibitedFlag {
  description: string;
  level: RiskLevel;
  label: string;
  reason: string;
  sourceUrl: string;
  ruleId: string | null;
  basis: "rule" | "ai";
}

export interface HSCandidate {
  item: string;
  code: string;
  description: string;
  rationale: string;
  confidence: string;
}

export interface DutyThreshold {
  label: string;
  amount: number;
  currency: "USD" | "JPY";
  applied: boolean;
  sourceUrl: string;
}

export interface DutyEstimate {
  declaredValueJpy: number;
  declaredValueKrw: number;
  declaredValueUsd: number;
  dutyRatePercent: number;
  dutyJpy: number;
  taxJpy: number;
  totalJpy: number;
  totalKrw: number;
  threshold: DutyThreshold;
  assumptions: string[];
  disclaimer: string;
  sourceUrl: string;
}

export interface AddressTranslation {
  original: string;
  formatted: string;
  romanized: string;
  notes: string;
}

export interface VerificationCheck {
  field: string;
  verdict: Verdict;
  reason: string;
  humanAction: string;
}

export interface Verification {
  verdict: Verdict;
  checks: VerificationCheck[];
  summary: string;
}

export interface FxRates {
  base: "JPY";
  rates: {
    KRW: number;
    USD: number;
  };
  date: string;
  source: "frankfurter" | "fallback";
  basis: "live" | "fallback";
  fetchedAt: string;
  sourceUrl: string;
  note?: string;
}

export interface RateQuote {
  id: string;
  carrier: string;
  service: string;
  priceJpy: number;
  priceKrw: number;
  priceOriginal: number;
  currency: string;
  etaDays: { min: number; max: number } | null;
  basis: RateBasis;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  effectiveFrom?: string;
  verifiedAt?: string;
  verified?: boolean;
  note?: string;
}

export interface StepLog {
  step: string;
  label: string;
  model: string;
  mode: LlmMode;
  latencyMs: number;
  note?: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface EtaEstimate {
  minDays: number;
  maxDays: number;
  note: string;
}

export interface PlanMeta {
  generatedAt: string;
  llmConfigured: boolean;
  ratesConfigured: boolean;
  mock: boolean;
  disclaimer: string;
}

export interface PlanResponse {
  direction: Direction;
  items: ItemInput[];
  weightKg: number;
  address: string;
  classification: Classification;
  prohibited: ProhibitedFlag[];
  hsCandidates: HSCandidate[];
  hsNotes: string;
  duty: DutyEstimate;
  addressTranslation: AddressTranslation;
  verification: Verification;
  rates: RateQuote[];
  fx: FxRates;
  eta: EtaEstimate;
  steps: StepLog[];
  meta: PlanMeta;
}

export interface PlanRequest {
  direction: Direction;
  items: ItemInput[];
  weightKg: number;
  address: string;
}
