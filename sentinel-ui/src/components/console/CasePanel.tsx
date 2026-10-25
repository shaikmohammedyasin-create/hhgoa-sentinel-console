"use client";

/**
 * One case: its header, and the five ways of reading it.
 *
 * The answer file is `case_to_answer` honest bytes: what the graph said, what
 * the policy engine decided, whether Nemotron agreed, and the optional SAR.
 * The tabs are ordered by how much interpretation each carries, least first —
 * timeline (what happened), case file (what was concluded), SAR (what gets
 * filed), Nemotron (the advisory block) — and a reader who distrusts the
 * prose can walk right and end at the JSON.
 *
 * Q&A posts to `POST /api/cases/{id}/ask`; the footer lists per-role model
 * usage from the answer (model, latency, cache flag when the run was live).
 */

import { useMemo, useState } from "react";

import { Icon } from "@/components/console/icons";
import { ConsoleChip, Dial, Overline, Panel } from "@/components/console/parts";
import { Timeline } from "@/components/console/Timeline";
import {
  humanise,
  money,
  sourceIcon,
  sourceTone,
  toneVar,
  verdictTone,
} from "@/components/console/vm";
import { useAnswer, useAsk, useCopy, useStartInvestigation, useTimeline } from "@/lib/hooks";
import type { AnswerCase, AnswerEvidence, NemotronBlock, QueueRow, SarOut } from "@/lib/hhgoa";
import { cn } from "@/lib/cn";

type Tab = "timeline" | "file" | "sar" | "nemotron" | "json";

const TABS: { id: Tab; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "file", label: "Case file" },
  { id: "sar", label: "SAR" },
  { id: "nemotron", label: "Nemotron" },
  { id: "json", label: "JSON" },
];

export function CasePanel({
  row,
  live,
  openInbox,
}: {
  row: QueueRow;
  live: boolean;
  openInbox: () => void;
}) {
  const [tab, setTab] = useState<Tab>("file");
  const [question, setQuestion] = useState("");
  const [copied, copy] = useCopy();

  const { data: answer, isLoading } = useAnswer(row.case_id);
  const { data: timeline } = useTimeline(row.case_id, Boolean(answer));
  const start = useStartInvestigation();
  const ask = useAsk();

  const hasAnswer = Boolean(answer);
  const caseBody = answer?.case;
  const nemotron = answer?.nemotron;
  // Nemotron is the only tab worth guarding on: everything else is engine output.
  const showNemotron = Boolean(nemotron?.model_proposal || nemotron?.policy_decision);

  const p = caseBody?.fraud_probability ?? row.fraud_probability ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      {/* header */}
      <div className="shrink-0 border-b border-border bg-surface px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] font-bold tracking-[0.02em]">{row.case_id}</span>
          <ConsoleChip tone={verdictTone(row.verdict)}>{row.verdict ?? "not run"}</ConsoleChip>
          {caseBody?.pattern ? (
            <ConsoleChip tone="neutral">{humanise(caseBody.pattern)}</ConsoleChip>
          ) : null}
          <span className="flex-1" />
          <Dial p={hasAnswer ? p : null} size={56} stroke={5} label="fraud" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-fg-muted">
          <span className="flex items-center gap-1">
            <Icon name="alert" size={10} style={{ color: toneVar(sourceTone("graph")) }} />
            {humanise(row.trigger_type)}
          </span>
          <span>{money(row.exposure_usd)}</span>
          <span className="flex items-center gap-1">
            <Icon name="card" size={10} />
            {row.card_id}
          </span>
          <span className="flex-1" />
          {live ? <ConsoleChip tone="accent" fill="solid">investigating</ConsoleChip> : null}
          <button
            type="button"
            onClick={() => start.mutate({ caseId: row.case_id, force: true })}
            disabled={start.isPending}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-muted hover:text-fg disabled:opacity-50"
          >
            {start.isPending ? "running…" : hasAnswer ? "re-run" : "run"}
          </button>
        </div>
        {caseBody?.summary ? (
          <p className="mt-2 border-t border-border pt-2 text-[11.5px] leading-[1.5] text-fg-muted">
            {caseBody.summary}
          </p>
        ) : null}
      </div>

      {/* tabs */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-border bg-surface px-2 pt-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "rounded-t-md px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]",
              tab === t.id
                ? "border border-b-0 border-border bg-bg text-fg"
                : "border border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {tab === "timeline" ? (
          <Timeline caseId={row.case_id} events={timeline} isLoading={!hasAnswer} />
        ) : tab === "file" ? (
          <CaseFile answer={caseBody} loading={isLoading} />
        ) : tab === "sar" ? (
          <SarPanel sar={answer?.sar} />
        ) : tab === "nemotron" ? (
          showNemotron ? (
            <NemotronPanel nemotron={nemotron} />
          ) : (
            <EmptyNote text="No Nemotron advisory block on this answer (model unavailable for this run)." />
          )
        ) : (
          <JsonPanel
            text={answer ? JSON.stringify(answer, null, 2) : "No answer file yet."}
            copied={copied}
            onCopy={() => copy(JSON.stringify(answer, null, 2))}
          />
        )}
      </div>

      {/* Q&A */}
      <div className="shrink-0 border-t border-border bg-surface p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim().length < 3 || !hasAnswer) return;
            void ask.mutateAsync({ caseId: row.case_id, question: question.trim() });
            setQuestion("");
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={hasAnswer ? "Ask the analyst a question about this case…" : "Run the case first."}
            disabled={!hasAnswer}
            className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-2 font-mono text-[11px] outline-none placeholder:text-fg-subtle focus:border-accent"
          />
          <button
            type="submit"
            disabled={!hasAnswer || question.trim().length < 3 || ask.isPending}
            className="rounded-md bg-accent px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-accent-contrast disabled:opacity-40"
          >
            {ask.isPending ? "…" : "Ask"}
          </button>
        </form>
        {ask.data ? (
          <div className="mt-2.5 rounded-md border border-border bg-surface-2 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Overline>Analyst answer</Overline>
              <span className="font-mono text-[9px] text-fg-subtle">
                {askProvenance(ask.data.served_by, ask.data.llm_used)}
                {ask.data.llm_used ? " · llm" : ""}
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-[1.5] text-fg">
              {ask.data.answer ?? "No answer was produced."}
            </p>
          </div>
        ) : null}
        {ask.isError ? (
          <p className="mt-2 font-mono text-[10px] text-danger">
            {(ask.error as Error | null)?.message ?? "Ask failed."}
          </p>
        ) : null}
      </div>

      {/* footer */}
      {nemotron?.model_usage ? (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-surface-2 px-3.5 py-1.5 font-mono text-[9px] text-fg-subtle">
          {Object.entries(nemotron.model_usage).map(([role, usage]) => (
            <span key={role} className="flex items-center gap-1.5">
              <span className="font-semibold uppercase text-fg-muted">{humanise(role)}</span>
              <span className="tabular-nums">
                {usage.prompt_tokens + usage.completion_tokens} tok
              </span>
              {usage.model ? (
                <span className="max-w-[150px] truncate" title={usage.model}>
                  {usage.model}
                </span>
              ) : null}
              {usage.latency_ms !== undefined ? (
                <span className="tabular-nums">{usage.latency_ms}ms</span>
              ) : null}
              {usage.cached ? <ConsoleChip tone="success">cached</ConsoleChip> : null}
            </span>
          ))}
          <span className="flex-1" />
          <button
            type="button"
            onClick={openInbox}
            className="flex items-center gap-1 text-fg-muted hover:text-fg"
          >
            <Icon name="doc" size={10} />
            approvals
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ── tab bodies ────────────────────────────────────────────────────────────── */

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-caption text-fg-subtle">
      {text}
    </div>
  );
}

function CaseFile({ answer, loading }: { answer: AnswerCase | undefined; loading: boolean }) {
  if (loading) return <EmptyNote text="Loading the answer file…" />;
  if (!answer) return <EmptyNote text="No answer file for this case yet." />;
  const body = answer;
  return (
    <div className="space-y-3">
      <Panel title="Case file">
        <WhyGrid
          verdict={body.verdict}
          fraudProbability={body.fraud_probability}
          pattern={body.pattern}
          exposureUsd={body.exposure_usd}
          connectedCards={body.connected_card_ids.length}
          affectedTxns={body.affected_txn_ids.length}
        />
      </Panel>
      <Panel title={`Evidence · ${body.evidence.length}`} bodyClassName="p-3 space-y-2">
        {body.evidence.length === 0 ? (
          <div className="py-6 text-center text-caption text-fg-subtle">No evidence on file.</div>
        ) : (
          body.evidence.map((ev, i) => (
            // Two evidence items can share a ref (same query, different claim),
            // so the ref alone is not a unique key.
            <EvidenceRow key={ev.evidence_id ?? `${ev.ref || "ev"}-${i}`} ev={ev} />
          ))
        )}
      </Panel>
    </div>
  );
}

function WhyGrid({
  verdict,
  fraudProbability,
  pattern,
  exposureUsd,
  connectedCards,
  affectedTxns,
}: {
  verdict: AnswerCase["verdict"];
  fraudProbability: number;
  pattern: string;
  exposureUsd: number;
  connectedCards: number;
  affectedTxns: number;
}) {
  const paired: [string, string][] = [
    ["Verdict", verdict],
    ["P(fraud)", fraudProbability.toFixed(3)],
    ["Pattern", humanise(pattern)],
    ["Exposure", money(exposureUsd)],
    ["Connected cards", String(connectedCards)],
    ["Affected txns", String(affectedTxns)],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {paired.map(([k, v]) => (
        <div key={k}>
          <div className="font-mono text-[9px] uppercase tracking-[0.09em] text-fg-muted">{k}</div>
          <div className="mt-0.5 truncate font-mono text-[11px] font-semibold" title={v}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceRow({ ev }: { ev: AnswerEvidence }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
      <Icon
        name={sourceIcon(ev.source)}
        size={13}
        className="mt-0.5 shrink-0"
        style={{ color: toneVar(sourceTone(ev.source)) }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-[1.45] text-fg">{ev.claim}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-fg-subtle">
          <span className="uppercase">{ev.source}</span>
          <span>{ev.ref}</span>
          {ev.entity_ids.slice(0, 4).map((id, i) => (
            <span key={`${id}-${i}`} className="rounded-sm bg-surface-3 px-1 py-px">{id}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SarPanel({ sar }: { sar: SarOut | undefined }) {
  if (!sar) return <EmptyNote text="No SAR on this case." />;
  return (
    <Panel title={`SAR · ${sar.file ? "filed" : "not filed"}`}>
      {sar.file ? (
        <div className="space-y-2.5">
          <p className="text-[11.5px] leading-[1.5] text-fg-muted">{sar.narrative}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-fg-subtle">
            <span>subjects: {sar.subjects.join(", ")}</span>
            <span>total: {money(sar.total_amount_usd)}</span>
            {sar.activity_dates.length > 0 ? (
              <span>dates: {sar.activity_dates.join(", ")}</span>
            ) : null}
          </div>
          <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[10px] leading-[1.5] text-fg-muted">
            {sar.reason}
          </div>
        </div>
      ) : (
        <p className="text-caption text-fg-muted">{sar.reason}</p>
      )}
    </Panel>
  );
}

/** Human label for the Ask answer provenance. */
function askProvenance(servedBy: string | null | undefined, llmUsed: boolean | undefined): string {
  if (!servedBy) return llmUsed ? "live" : "rules";
  if (servedBy.startsWith("cached")) return servedBy;
  if (servedBy === "deterministic-fallback" || servedBy === "deterministic fallback") {
    return "deterministic fallback";
  }
  if (servedBy.startsWith("nvidia/") || servedBy.toLowerCase().includes("nemotron")) return "live";
  return servedBy;
}

function NemotronPanel({ nemotron }: { nemotron: NemotronBlock | undefined }) {
  const proposal = nemotron?.model_proposal;
  const policy = nemotron?.policy_decision;
  return (
    <div className="space-y-3">
      {nemotron?.served_by ? (
        <div className="flex flex-wrap items-baseline gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
          <Overline>Nemotron provenance</Overline>
          <span className="font-mono text-[10px] text-fg-muted">{nemotron.served_by}</span>
          {nemotron.recorded_at ? (
            <span className="font-mono text-[9px] text-fg-subtle">
              recorded {nemotron.recorded_at}
            </span>
          ) : null}
        </div>
      ) : null}
      {proposal ? (
        <Panel
          title="Nemotron proposal"
          aside={proposal.confidence === null || proposal.confidence === undefined ? undefined : `conf ${(proposal.confidence * 100).toFixed(0)}%`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {proposal.pattern ? (
              <ConsoleChip tone="accent">{humanise(proposal.pattern)}</ConsoleChip>
            ) : null}
            {proposal.evidence_ids.map((id) => (
              <span key={id} className="rounded-sm bg-surface-3 px-1.5 py-0.5 font-mono text-[9px] text-fg-muted">
                {id}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-[1.5] text-fg-muted">{proposal.rationale}</p>
        </Panel>
      ) : null}

      {policy ? (
        <Panel
          title="Policy decision"
          aside={`decided by ${policy.decided_by}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <ConsoleChip tone={verdictTone(policy.verdict)}>{policy.verdict}</ConsoleChip>
            <span className="font-mono text-[11px] font-bold tabular-nums">
              {policy.fraud_probability.toFixed(3)}
            </span>
            {policy.pattern ? (
              <ConsoleChip tone="neutral">{humanise(policy.pattern)}</ConsoleChip>
            ) : null}
          </div>
          {policy.actions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {policy.actions.map((a) => (
                <span key={a} className="rounded-sm bg-surface-3 px-1.5 py-0.5 font-mono text-[9px] text-fg-muted">
                  {humanise(a)}
                </span>
              ))}
            </div>
          ) : null}
          {nemotron?.model_agreed === false ? (
            <div className="mt-2.5 rounded-md border border-warning bg-warning-tint px-3 py-2 text-[10.5px] leading-[1.5] text-warning">
              Nemotron disagreed with the policy: {nemotron.model_override_reason || "no reason given."}
            </div>
          ) : null}
        </Panel>
      ) : null}

      {nemotron?.recorded_narrative &&
      !Object.keys(nemotron?.model_usage ?? {}).some((role) => role.includes("narrative")) ? (
        <Panel title="Recorded Nemotron narrative" aside={nemotron.recorded_at ?? undefined}>
          <p className="text-[11.5px] leading-[1.5] text-fg-muted">{nemotron.recorded_narrative}</p>
        </Panel>
      ) : null}

      {nemotron?.verification_draft ? (
        <Panel title="Verification draft">
          <p className="whitespace-pre-wrap text-[10.5px] leading-[1.5] text-fg-muted">
            {nemotron.verification_draft}
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

function JsonPanel({ text, copied, onCopy }: { text: string; copied: boolean; onCopy: () => void }) {
  const lines = useMemo(() => text.split("\n"), [text]);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <Overline>answer.json</Overline>
        <button
          type="button"
          onClick={onCopy}
          className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-muted hover:text-fg"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="max-h-[440px] overflow-auto p-3 font-mono text-[10px] leading-[1.55] text-fg-muted">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-7 shrink-0 select-none pr-2 text-right text-fg-subtle/60">{i + 1}</span>
            <span className="whitespace-pre-wrap">{line}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
