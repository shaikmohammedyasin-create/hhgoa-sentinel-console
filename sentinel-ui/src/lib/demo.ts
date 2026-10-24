/**
 * Static-snapshot data source for the hosted demo.
 *
 * On Vercel there is no Python process, so `/api/*` cannot be answered. When
 * the build sets `NEXT_PUBLIC_DEMO_DATA=1`, every console request is served
 * from files written by `scripts/export_ui_demo.py` out of a real local run.
 *
 * The rule for this file: never invent data. Read endpoints replay recorded
 * responses. Anything that would require the engine (the benchmark run, the
 * analyst Q&A model) says so in the response instead of pretending, and every
 * such answer carries `served_by: "demo-snapshot"` so the UI can label it.
 */

import type {
  AnalystAnswer,
  AnswerFile,
  ApprovalOut,
  BenchmarkReport,
  CaseGraph,
  CaseTrigger,
  HealthOut,
  InvestigationSummaryOut,
  LlmStatus,
  RiskAnalysisResponse,
} from "@/lib/hhgoa";

/** True when this build replays a recorded snapshot instead of calling a backend. */
export const DEMO_SNAPSHOT = process.env.NEXT_PUBLIC_DEMO_DATA === "1";

/** The question `scripts/export_ui_demo.py` recorded an answer for. Keep in sync. */
export const REFERENCE_QUESTION = "What evidence supports this verdict?";

type Json = Record<string, unknown>;

interface DemoIndex {
  generated_at: string;
  notice: string;
  health: HealthOut | null;
  llm_status: LlmStatus | null;
  cases: CaseTrigger[];
  investigations: InvestigationSummaryOut[];
  approvals: ApprovalOut[];
  benchmark: BenchmarkReport | null;
  case_ids: string[];
}

interface DemoCase {
  case_id: string;
  answer: AnswerFile | null;
  full: Json | null;
  graph: CaseGraph | null;
  risk: RiskAnalysisResponse | null;
  timeline: unknown[] | null;
  ask: AnalystAnswer | null;
}

export class DemoProblem extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "DemoProblem";
    this.status = status;
  }
}

const base = () => `${window.location.origin}/demo`;

let indexPromise: Promise<DemoIndex> | null = null;
const caseCache = new Map<string, Promise<DemoCase>>();

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new DemoProblem(
      response.status,
      `Demo snapshot missing (${response.status}): ${path}. Run scripts/export_ui_demo.py and rebuild.`,
    );
  }
  return (await response.json()) as T;
}

function loadIndex(): Promise<DemoIndex> {
  if (!indexPromise) indexPromise = fetchJson<DemoIndex>(`${base()}/index.json`);
  return indexPromise;
}

function loadCase(caseId: string): Promise<DemoCase> {
  const cached = caseCache.get(caseId);
  if (cached) return cached;
  const promise = fetchJson<DemoCase>(`${base()}/case/${encodeURIComponent(caseId)}.json`);
  caseCache.set(caseId, promise);
  return promise;
}

function require<T>(value: T | null, what: string, caseId = ""): T {
  if (value === null) {
    throw new DemoProblem(404, `No ${what} recorded for ${caseId || "this case"} in the demo snapshot.`);
  }
  return value;
}

function snapshotAnswer(caseId: string, question: string, recorded: AnalystAnswer | null): AnalystAnswer {
  const asked = question.trim().toLowerCase();
  const isReference = asked === REFERENCE_QUESTION.toLowerCase();
  const header = isReference
    ? "Static demo snapshot — this is the answer recorded for this question in a local run."
    : `Static demo snapshot — the console is replaying the answer recorded for the reference ` +
      `question "${REFERENCE_QUESTION}", not an answer to your question. The live analyst ` +
      `endpoint needs the backend running (see DEPLOY.md); it is not reachable from this build.`;
  const body = recorded?.answer ?? "No recorded answer for this case.";
  return {
    case_id: caseId,
    question,
    answer: `${header}\n\n${body}`,
    served_by: "demo-snapshot",
    llm_used: false,
  };
}

/**
 * Match a path and hand back its capture groups.
 *
 * `noUncheckedIndexedAccess` types a match array as `string | undefined`, and
 * every pattern below guarantees the group it reads. Normalising once here
 * keeps the routing table free of non-null assertions.
 */
function matchPath(path: string, pattern: RegExp): { id: string; second: string } | null {
  const match = path.match(pattern);
  return match ? { id: match[1] ?? "", second: match[2] ?? "" } : null;
}

/**
 * Resolve one console request from the snapshot.
 *
 * Every branch is exercised end to end by `e2e/smoke.mjs` when it runs against
 * a snapshot build (`SNAPSHOT=1`); the console reaches it via `api.request`.
 */
export async function demoRequest<T>(
  path: string,
  { query = {}, method = "GET", body }: { query?: Record<string, string | number | boolean | null | undefined>; method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const index = await loadIndex();

  if (path === "/health") return require(index.health, "health block") as T;
  if (path === "/api/llm/status") return require(index.llm_status, "LLM status") as T;
  if (path === "/api/cases") return index.cases as T;
  if (path === "/api/investigations") return index.investigations as T;

  if (path === "/api/approvals") {
    const status = typeof query.status === "string" ? query.status : undefined;
    const rows = status ? index.approvals.filter((a) => a.status === status) : index.approvals;
    return rows as T;
  }

  if (path === "/benchmark/report") return require(index.benchmark, "benchmark report") as T;

  if (path === "/benchmark/run" && method === "POST") {
    // Honest refusal: a static snapshot cannot re-run 20 investigations.
    return {
      ok: false,
      ran: false,
      note:
        "This is a static snapshot of a completed run; the 20-case benchmark " +
        "is not re-executed in the browser. Run it locally with `python -m " +
        "backend.evaluation.run_benchmark`.",
    } as T;
  }

  let m = matchPath(path, /^\/api\/investigations\/([^/]+)$/);
  if (m) return require((await loadCase(m.id)).answer, "answer file", m.id) as T;

  m = matchPath(path, /^\/api\/investigations\/([^/]+)\/full$/);
  if (m) return require((await loadCase(m.id)).full, "internal case model", m.id) as T;

  m = matchPath(path, /^\/api\/investigations\/([^/]+)\/graph$/);
  if (m) return require((await loadCase(m.id)).graph, "case graph", m.id) as T;

  m = matchPath(path, /^\/api\/investigations\/([^/]+)\/risk$/);
  if (m) return require((await loadCase(m.id)).risk, "risk analysis", m.id) as T;

  m = matchPath(path, /^\/investigations\/([^/]+)\/timeline$/);
  if (m) return require((await loadCase(m.id)).timeline, "audit timeline", m.id) as T;

  m = matchPath(path, /^\/investigations\/([^/]+)\/run$/);
  if (m && method === "POST") {
    // The console's re-run button: return the recorded answer for that case.
    return require((await loadCase(m.id)).answer, "answer file", m.id) as T;
  }

  m = matchPath(path, /^\/investigations\/([^/]+)\/approvals\/([^/]+)$/);
  if (m && method === "POST") {
    const caseId = m.id;
    const approvalId = m.second;
    const payload = (body ?? {}) as { decision?: string; approver?: string };
    const decision = payload.decision === "rejected" ? "rejected" : "approved";
    const row = index.approvals.find((a) => a.approval_id === approvalId);
    if (!row) throw new DemoProblem(404, `Approval ${approvalId} is not in the demo snapshot.`);
    // Mutate the cached copy so the polling inbox shows the decision, exactly
    // as the live endpoint would.
    row.status = decision;
    row.decided_by = payload.approver ?? "demo-analyst";
    row.decided_at = new Date().toISOString();
    return {
      approval_id: approvalId,
      case_id: caseId,
      status: decision,
      approver: payload.approver ?? "demo-analyst",
      note: "Recorded in this browser session only — the snapshot is read-only storage.",
    } as T;
  }

  m = matchPath(path, /^\/api\/cases\/([^/]+)\/ask$/);
  if (m && method === "POST") {
    const caseId = m.id;
    const question = String((body as { question?: string } | undefined)?.question ?? "");
    const recorded = (await loadCase(caseId)).ask;
    return snapshotAnswer(caseId, question, recorded) as T;
  }

  throw new DemoProblem(404, `The demo snapshot has no route for ${path}.`);
}
