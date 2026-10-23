/**
 * The one place this app talks to the HHGOA backend.
 *
 * Same-origin by default: `API_BASE` is empty on a hosted build so `/api/*`
 * is answered by the deployment's own Next proxy (see next.config.ts), and
 * defaults to `http://127.0.0.1:8000` locally. No role headers, no
 * third-party origin — this console talks only to the repository's own API.
 *
 * Types are imported from `@/lib/hhgoa` (hand-typed from the real backend);
 * the vendored upstream `generated/contract.ts` described a different API
 * and is no longer used.
 */

import type {
  AnalystAnswer,
  AnswerFile,
  ApprovalOut,
  AuditEventOut,
  BenchmarkReport,
  CaseGraph,
  CaseTrigger,
  HealthOut,
  InvestigationSummaryOut,
  LlmStatus,
  RiskAnalysisResponse,
} from "@/lib/hhgoa";

/**
 * Base for the HHGOA API.
 *
 * - Empty string → same-origin; the Next server rewrites `/api/*`,
 *   `/investigations/*`, `/benchmark/*`, `/health` to the backend.
 * - Local dev (`NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000`) → direct
 *   fetch to the FastAPI process, no proxy.
 */
const NEXT_PUBLIC_API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
export const API_BASE = NEXT_PUBLIC_API_BASE !== undefined ? NEXT_PUBLIC_API_BASE : "";

type Query = Record<string, string | number | boolean | null | undefined>;

function url(path: string, query?: Query): string {
  const target = new URL(
    `${API_BASE}${path}`,
    API_BASE ? API_BASE : window.location.origin,
  );
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== "") {
      target.searchParams.set(key, String(value));
    }
  }
  return target.toString();
}

export class ApiProblem extends Error {
  readonly status: number;
  readonly detail: string;
  readonly body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    const detail = typeof body.detail === "string" ? body.detail : `HTTP ${status}`;
    super(detail);
    this.name = "ApiProblem";
    this.status = status;
    this.detail = detail;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  { query, method = "GET", body }: { query?: Query; method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = (await response.json()) as Record<string, unknown>;
    } catch {
      parsed = { detail: response.statusText };
    }
    throw new ApiProblem(response.status, parsed);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Every endpoint the console uses, typed from the HHGOA contract. */
export const api = {
  health: () => request<HealthOut>("/health"),
  llmStatus: () => request<LlmStatus>("/api/llm/status"),

  cases: (query: Query) => request<CaseTrigger[]>("/api/cases", { query }),
  investigations: (query: Query) =>
    request<InvestigationSummaryOut[]>("/api/investigations", { query }),

  /** Full answer for a case. Demo mode falls back to the committed answer file. */
  answer: (id: string) => request<AnswerFile>(`/api/investigations/${id}`),
  full: (id: string) => request<AnswerFile>(`/api/investigations/${id}/full`),

  ask: (id: string, question: string) =>
    request<AnalystAnswer>(`/api/cases/${id}/ask`, {
      method: "POST",
      body: { question },
    }),

  approvals: (query: Query) => request<ApprovalOut[]>("/api/approvals", { query }),
  decideApproval: (caseId: string, approvalId: string, decision: "approved" | "rejected", approver: string) =>
    request<Record<string, unknown>>(`/investigations/${caseId}/approvals/${approvalId}`, {
      method: "POST",
      body: { decision, approver },
    }),
  timeline: (id: string) => request<AuditEventOut[]>(`/investigations/${id}/timeline`),
  canvas: (id: string) => request<CaseGraph>(`/api/investigations/${id}/graph`),
  risk: (id: string) => request<RiskAnalysisResponse>(`/api/investigations/${id}/risk`),

  startInvestigation: (caseId: string, force = false) =>
    request<AnswerFile>(`/investigations/${caseId}/run`, {
      method: "POST",
      query: { force },
    }),

  benchmark: () => request<BenchmarkReport>("/benchmark/report"),
  runAll: () => request<Record<string, unknown>>("/benchmark/run", { method: "POST" }),
};
