/**
 * HHGOA backend contract — hand-typed from the real FastAPI backend.
 *
 * This replaces the vendored upstream's `generated/contract.ts` (which
 * described a different "Sentinel v2" API that this repository does not
 * host). Every shape below mirrors `backend/main.py` and
 * `backend/evaluation/exporter.py`; "Nemotron proposes, the policy engine
 * decides" is the story the console tells, and `nemotron` on an answer is
 * the additive advisory block exported by `case_to_answer`.
 */

// ── Health ───────────────────────────────────────────────────────────────────

export interface HealthOut {
  status: string; // "healthy" | "degraded"
  graph: Record<string, string>;
  app_db: string;
  llm_provider: string;
  nebius_available?: boolean;
  last_successful_call?: string | null;
  app_env: string;
  demo_mode: boolean;
  graph_hint?: string | null;
}

// ── Case pack (the queue) ────────────────────────────────────────────────────

export type TriggerType = "risk_score" | "customer_report" | "analyst_request";

export interface CaseTrigger {
  case_id: string;
  opened_at: string;
  trigger_type: TriggerType;
  trigger_text: string;
  flagged_txn_id: string;
  card_id: string;
  customer_id: string;
  risk_score: number | null;
}

// ── Investigation summaries (queue rows) ─────────────────────────────────────

export type Verdict = "fraud" | "legitimate" | "uncertain";

export type CaseStatus = "open" | "closed_fraud" | "closed_legitimate" | "escalated";

export type ApprovalRoute = "auto" | "L1" | "L2";

export type FraudPattern =
  | "card_testing"
  | "card_not_present_fraud"
  | "card_not_present_new_device"
  | "out_of_region_use"
  | "account_takeover"
  | "undocumented"
  | "none";

export type Action =
  | "ALLOW_TRANSACTION"
  | "DECLINE_TRANSACTION"
  | "MONITOR_CARD"
  | "MONITOR_CONNECTED_CARDS"
  | "WARN_CUSTOMER"
  | "VERIFY_WITH_CUSTOMER"
  | "STEP_UP_AUTH"
  | "BLOCK_CARD"
  | "BLOCK_ALL_CARDS"
  | "GENERATE_REPORT"
  | "CREATE_CASE"
  | "FILE_REPORT"
  | "ESCALATE_TO_ANALYST"
  | "CLOSE_NO_FRAUD";

export interface InvestigationSummaryOut {
  case_id: string;
  status: string;
  investigated: boolean;
  verdict: Verdict | null;
  fraud_probability: number | null;
  pattern: string | null;
  exposure_usd: number | null;
  sar_required: boolean | null;
  updated_at: string | null;
  /** "committed" = replayed answer file (no stored engine state), "live" = a
   *  run this process persisted. */
  source: string | null;
}

/**
 * One queue row: the trigger the pipeline was opened on, plus whatever the
 * engine has concluded about it (or explicit nulls when not yet run).
 */
export interface QueueRow extends CaseTrigger {
  investigated: boolean;
  verdict: Verdict | null;
  fraud_probability: number | null;
  pattern: FraudPattern | null;
  exposure_usd: number | null;
  sar_required: boolean | null;
  /** Where the row came from; replayed rows have no stored risk decomposition. */
  source?: string | null;
}

// ── Answer file (case_to_answer) ─────────────────────────────────────────────

export type EvidenceSource = "graph" | "document" | "customer" | "external";

export interface AnswerEvidence {
  /** Additive export field; absent in answer files written before it existed. */
  evidence_id?: string;
  claim: string;
  source: EvidenceSource;
  ref: string;
  entity_ids: string[];
}

export interface EvidenceRequestOut {
  type: string;
  asked_after_step: number;
  assumed_response: string;
  status: string;
  info_value: number;
  origin: string;
  decision_relevance?: string;
  alternatives_considered?: unknown[];
}

export interface ActionLineOut {
  action: string;
  route: "auto" | "L1" | "L2";
  reason: string;
}

export interface NextBestActionsOut {
  initial: ActionLineOut[];
  final: ActionLineOut[];
  what_changed: string;
}

export interface SarOut {
  file: boolean;
  reason: string;
  narrative: string;
  subjects: string[];
  total_amount_usd: number;
  activity_dates: string[];
}

/** Advisor output for one role. May be absent when the model was unavailable. */
export interface ModelProposal {
  pattern: string | null;
  confidence: number | null;
  evidence_ids: string[];
  rationale: string;
}

export interface PolicyDecision {
  verdict: Verdict;
  pattern: string | null;
  fraud_probability: number;
  actions: string[];
  decided_by: string;
}

/** Per-role model usage. `model`/`latency_ms`/`cached` are present for live
 * Nebius runs; precomputed answer files may only carry token counts. */
export interface ModelUsageEntry {
  prompt_tokens: number;
  completion_tokens: number;
  model?: string;
  latency_ms?: number;
  cached?: boolean;
}

export interface NemotronBlock {
  model_proposal: ModelProposal | null;
  policy_decision: PolicyDecision | null;
  model_agreed: boolean | null;
  model_override_reason: string;
  verification_draft: string | null;
  model_usage: Record<string, ModelUsageEntry>;
  /** Honest provenance label: "live", "cached live run (<date>)", or
   *  "deterministic fallback". Filled by the API, not by the raw answer file. */
  served_by?: string | null;
  recorded_at?: string | null;
  recorded_from?: string | null;
  /** Cached narrative/SAR recorded from a live run, for display only. */
  recorded_narrative?: string | null;
  recorded_sar_narrative?: string | null;
  model_proposal_cached?: boolean;
}

export interface AnswerCase {
  status: string;
  verdict: Verdict;
  fraud_probability: number;
  pattern: string;
  pattern_description: string;
  affected_txn_ids: string[];
  first_suspicious_txn_id: string;
  connected_card_ids: string[];
  connected_device_profiles: string[];
  exposure_usd: number;
  evidence: AnswerEvidence[];
  similar_prior_cases: string[];
  summary: string;
  written_to_graph: boolean;
  graph_case_id: string;
}

export interface AnswerFile {
  case_id: string;
  case: AnswerCase;
  evidence_requests: EvidenceRequestOut[];
  next_best_actions: NextBestActionsOut;
  sar: SarOut;
  nemotron: NemotronBlock;
  stop_reason: string;
  tool_calls: number;
  tokens: number;
  latency_s: number;
}

// ── Analyst Q&A (role 4) ─────────────────────────────────────────────────────

export interface AnalystAnswer {
  case_id: string;
  question: string;
  answer: string | null;
  served_by: string | null;
  llm_used: boolean;
  latency_s?: number | null;
}

// ── LLM status ───────────────────────────────────────────────────────────────

export interface LlmStatus {
  available: boolean;
  model_nano?: string;
  model_super?: string;
  model_ultra?: string;
  calls?: number;
  [key: string]: unknown;
}

// ── Approvals ────────────────────────────────────────────────────────────────

export interface ApprovalOut {
  approval_id: string;
  case_id: string;
  action: string;
  route: string;
  reason: string;
  status: string; // pending | approved | rejected
  requested_at?: string;
  decided_at?: string | null;
  decided_by?: string | null;
  [key: string]: unknown;
}

// ── Audit timeline ───────────────────────────────────────────────────────────

export interface AuditEventOut {
  event_id?: string;
  event_type: string;
  state_from?: string | null;
  state_to?: string | null;
  actor?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  case_id?: string;
}

// ── Risk analysis ────────────────────────────────────────────────────────────

export interface ScoreChannelOut {
  channel: string;
  contribution: number;
  label: string;
  type: string;
}

export interface RiskAssessmentOut {
  fraud_probability: number;
  confidence: number;
  risk_level: string;
  key_signals: string[];
  score_breakdown: ScoreChannelOut[];
}

export interface RiskTrajectoryPointOut {
  step: number;
  label: string;
  probability: number;
  origin: string;
}

export interface RiskAnalysisResponse {
  case_id: string;
  verdict: Verdict;
  prior: { bank_risk_score: number | null; source: string } | null;
  pre_evidence: RiskAssessmentOut | null;
  current: RiskAssessmentOut;
  trajectory: RiskTrajectoryPointOut[];
  evidence_type_counts: {
    observed_fact: number;
    derived_inference: number;
    model_score: number;
    total: number;
  };
  methodology: string;
}

// ── Graph subgraph (case-scoped) ────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata: Record<string, unknown>;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface CaseGraph {
  case_id: string;
  nodes: GraphNode[];
  links: GraphLink[];
  counts: { nodes: number; links: number };
}

// ── Benchmark report (run_benchmark.py) ──────────────────────────────────────

export interface BenchmarkResultRow {
  case_id: string;
  verdict: Verdict;
  fraud_probability: number;
  pattern: string;
  status: string;
  exposure_usd: number;
  evidence_count: number;
  tool_calls: number;
  latency_s: number;
  sar_filed: boolean;
  nba_initial_count: number;
  nba_final_count: number;
  stop_reason: string;
}

export interface BenchmarkReport {
  total_cases: number;
  completed: number;
  failed: number;
  elapsed_s: number;
  results: BenchmarkResultRow[];
  errors: { case_id: string; error: string }[];
}
