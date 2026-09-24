export interface AIAnalysis {
  semantic_indicators: string[];
  llm_risk: number;
  llm_confidence: number;
  scam_type: string;
  brief_reason: string;
}

export interface EvidenceItem {
  signal: string;
  severity: number;
  source: string;
  explanation?: string;
}

export interface EngineDisagreement {
  ml_assessment: string;
  llm_assessment: string;
  disagreement: boolean;
  reason: string;
  policy_resolution: string;
}

export interface ScamResult {
  final_decision: {
    risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK";
    confidence: number;
    risk_score: number;
    scam_type: string;
  };
  signals_detected: {
    strong: string[];
    medium: string[];
    weak: string[];
    behavioral: string[];
  };
  reasoning: {
    summary: string;
    detailed_reasons: string[];
  };
  user_advice: string[];
  rbi_guideline?: string;
  llm_stage?: "used" | "skipped";
  ai_analysis?: AIAnalysis;
  engine_disagreement?: EngineDisagreement;
  evidence?: EvidenceItem[];
  scan_id?: string | null;
  ocr_text?: string;
}

export interface DecisionResult {
  type: string;
  decision: "PAY" | "VERIFY_FIRST" | "DO_NOT_PAY";
  risk: "SAFE" | "LOW" | "SUSPICIOUS" | "HIGH_RISK" | "HIGH";
  confidence: number;
  risk_score: number;
  signals_detected: {
    payment_intent?: boolean;
    urgency: boolean;
    threat: boolean;
    kyc_scam: boolean;
    reward_trap: boolean;
    unknown_receiver: boolean;
    budget_issue?: boolean;
    impulse_trigger?: boolean;
  };
  ui: {
    verdict_label: string;
    color: string;
    icon: string;
    primary_message: string;
    secondary_message: string;
  };
  reasoning: {
    summary: string;
    details: string[];
  };
  advice: string[];
}

export interface BehaviorResult {
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK";
  confidence: number;
  risk_score: number;
  signals_detected: {
    amount_pattern: string;
    odd_timing: boolean;
    repetition_pattern: string;
  };
  reasoning: {
    summary: string;
    details: string[];
  };
  advice: string[];
}

export interface LinkResult {
  type: "url" | "upi" | "unknown";
  risk: "SAFE" | "LOW" | "SUSPICIOUS" | "HIGH_RISK" | "HIGH";
  confidence: number;
  risk_score: number;
  signals_detected: {
    fake_domain: boolean;
    brand_impersonation: boolean;
    suspicious_tld: boolean;
    shortened_link: boolean;
    random_upi: boolean;
  };
  reasoning: {
    summary: string;
    details: string[];
  };
  advice: string[];
}

export interface ScanRow {
  id: string;
  message_text: string;
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK";
  risk_score: number;
  confidence: number;
  scam_type: string;
  source: string;
  created_at: string;
}

export interface TrustedContact {
  id: string;
  value: string;
  label: string | null;
  created_at: string;
}

export interface HistoryData {
  scans: ScanRow[];
  stats: {
    total: number;
    by_risk: Record<string, number>;
    top_scam_types: [string, number][];
  };
}
