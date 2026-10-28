"use client";

/**
 * The console: one screen, three views, no navigation.
 *
 * The queue, the case and the graph are three answers to three different
 * questions held open at once — moving between them is the work, so the
 * console does not move you between pages. Below 1180px the graph pane
 * folds first.
 *
 * Everything on this screen is live backend data; there is no scripted walk
 * and no ring view — those belonged to a retired Sentinel API. The monitor
 * and the approvals inbox are reachable from the masthead and deep-linked via
 * `/benchmark` and `/approvals`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_SNAPSHOT } from "@/lib/demo";
import { IconSprite } from "@/components/console/icons";
import { Overline } from "@/components/console/parts";
import { huntState, toneVar } from "@/components/console/vm";
import { QueueRail } from "@/components/console/QueueRail";
import { GraphCanvasView, canvasSummary } from "@/components/console/GraphCanvasView";
import { CasePanel } from "@/components/console/CasePanel";
import { MonitorView } from "@/components/console/MonitorView";
import { RingView } from "@/components/console/RingView";
import { useAnswer, useCanvas, useCases, useHealth, useInvestigations, useLlmStatus, useRisk } from "@/lib/hooks";
import { useDemo } from "@/components/console/useDemo";
import type { CaseGraph, FraudPattern, QueueRow } from "@/lib/hhgoa";
import { cn } from "@/lib/cn";
import { useSearchParams } from "next/navigation";

type View = "queue" | "case" | "graph" | "monitor" | "ring";

export function Console({ initialCase, initialView }: { initialCase?: string; initialView?: View }) {
  const params = useSearchParams();
  const [view, setView] = useState<View>(initialView ?? "case");
  const [selected, setSelected] = useState(initialCase ?? "");
  const [inboxOpen, setInboxOpen] = useState(params.get("inbox") === "1");
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  // Presentation mode (?present=1): hides the re-run button and other
  // spend-triggering controls so a recorded demo cannot trigger Nemotron
  // calls by accident (C4).
  const presentMode = params.get("present") === "1";

  const casesQuery = useCases();
  const summariesQuery = useInvestigations();
  const rows = casesQuery.data;
  const summaries = summariesQuery.data;
  const { data: health } = useHealth();
  const { data: llmStatus } = useLlmStatus();

  // Any queue request failing while nothing is on screen means the API is down.
  // Without this the rail would say "Loading queue…" forever, because
  // undefined data is all it sees.
  const queueFailed = casesQuery.isError || summariesQuery.isError;
  const queueLoading = (casesQuery.isPending || summariesQuery.isPending) && !queueFailed;

  // Merge case triggers with any stored investigation results.
  const queue = useMemo<QueueRow[]>(() => {
    const byCase = new Map<string, QueueRow>();
    for (const trigger of rows ?? []) {
      byCase.set(trigger.case_id, { ...trigger, investigated: false, verdict: null, fraud_probability: null, pattern: null, exposure_usd: null, sar_required: null });
    }
    for (const s of summaries ?? []) {
      const trigger = byCase.get(s.case_id);
      byCase.set(s.case_id, {
        case_id: s.case_id,
        opened_at: s.updated_at ?? trigger?.opened_at ?? "",
        trigger_type: trigger?.trigger_type ?? "analyst_request",
        trigger_text: trigger?.trigger_text ?? "",
        flagged_txn_id: trigger?.flagged_txn_id ?? "",
        card_id: trigger?.card_id ?? "",
        customer_id: trigger?.customer_id ?? "",
        risk_score: null,
        investigated: s.investigated,
        verdict: s.verdict,
        fraud_probability: s.fraud_probability,
        pattern: s.pattern as FraudPattern | null,
        exposure_usd: s.exposure_usd,
        sar_required: s.sar_required,
        source: s.source,
      });
    }
    return [...byCase.values()];
  }, [rows, summaries]);

  const selectedRow = useMemo(
    () => queue.find((r) => r.case_id === selected) ?? null,
    [queue, selected],
  );

  // Open the first case as soon as the queue arrives. Landing on an empty
  // pane asks a visitor to do work before they can see anything.
  useEffect(() => {
    if (selected || queue.length === 0) return;
    const first = queue[0];
    if (first) setSelected(first.case_id);
  }, [queue, selected]);

  const { data: canvas } = useCanvas(selected, view === "graph" || view === "case");
  const { data: selectedAnswer } = useAnswer(selected);
  // A replayed answer file carries no stored signal snapshot, so there is no
  // risk decomposition to ask for; requesting it would only 404 in the console.
  const hasStoredRun = Boolean(selectedRow?.investigated) && selectedRow?.source !== "committed";
  const { data: riskData } = useRisk(selected, hasStoredRun);

  const hunt = huntState(
    selectedRow?.investigated === false,
    riskData?.current.fraud_probability ?? selectedRow?.fraud_probability ?? 0,
    selectedRow?.verdict ?? null,
    riskData?.methodology ?? (selectedRow?.investigated ? "stored run" : "not yet run"),
  );

  const demo = useDemo(queue, useCallback((act) => {
    if (act.caseId) setSelected(act.caseId);
    setView(act.view);
    setInboxOpen(Boolean(act.inbox));
  }, []));

  return (
    <div className="relative flex h-dvh flex-col bg-bg text-fg">
      <IconSprite />
      <Masthead
        health={health?.status}
        llmProvenance={
          selectedAnswer?.nemotron?.served_by ??
          (llmStatus?.available ? "live" : llmStatus ? "deterministic fallback" : undefined)
        }
        llmStatus={llmStatus ?? undefined}
        openInbox={() => setInboxOpen(true)}
        goMonitor={() => setView("monitor")}
        running={demo.running}
        onStartDemo={demo.start}
        onStopDemo={() => {
          demo.stop();
          setInboxOpen(false);
        }}
      />

      <div className="flex min-h-0 flex-1">
        {(view === "queue" || view === "case" || view === "graph") ? (
          <>
            {/* Sidebar on md+, hidden on mobile */}
            <div className="hidden min-h-0 md:flex">
              <QueueRail
                rows={queue}
                selected={selected}
                loading={queueLoading}
                failed={queueFailed}
                runningCase={selectedRow?.investigated === false ? selected : null}
                onSelect={(id) => {
                  setSelected(id);
                  setView("case");
                }}
              />
            </div>
            {/* Mobile queue overlay */}
            {mobileQueueOpen ? (
              <div className="fixed inset-0 z-40 md:hidden">
                <div
                  className="absolute inset-0 bg-black/20"
                  onClick={() => setMobileQueueOpen(false)}
                  aria-hidden="true"
                />
                <div className="relative z-10 flex h-full w-[min(300px,85vw)] flex-col border-r border-border bg-surface">
                  <div className="flex shrink-0 items-center justify-between border-b border-border px-3.5 py-2">
                    <Overline>Case queue</Overline>
                    <button
                      type="button"
                      onClick={() => setMobileQueueOpen(false)}
                      className="rounded px-1 font-mono text-[10px] text-fg-muted hover:text-fg"
                      aria-label="Close queue"
                    >
                      close ×
                    </button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <QueueRail
                      rows={queue}
                      selected={selected}
                      loading={queueLoading}
                      failed={queueFailed}
                      runningCase={selectedRow?.investigated === false ? selected : null}
                      onSelect={(id) => {
                        setSelected(id);
                        setView("case");
                        setMobileQueueOpen(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="relative flex min-w-0 flex-1 flex-col">
          {view === "queue" ? <QueueSummary rows={queue} /> : null}
          {view === "case" && selectedRow ? (
            <CasePanel row={selectedRow} live={demo.running} openInbox={() => setInboxOpen(true)} presentMode={presentMode} />
          ) : null}
          {view === "graph" ? (
            <div className="flex h-full flex-col overflow-y-auto">
              <div className="px-3.5 pb-2 pt-3">
                <Overline>Case subgraph · {selected}</Overline>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <GraphCanvasView canvas={canvas ?? null} live={demo.running} />
              </div>
            </div>
          ) : null}
          {view === "monitor" ? <MonitorView /> : null}
          {view === "ring" ? <RingView /> : null}

          {view === "case" ? (
            <CaseFooter
              caseId={selected}
              canvas={canvas}
              riskTone={toneVar("accent")}
              hunt={hunt}
              onOpenGraph={() => setView("graph")}
            />
          ) : null}
        </div>
      </div>

      {/* Mobile queue toggle */}
      {(view === "case" || view === "graph") ? (
        <button
          type="button"
          onClick={() => setMobileQueueOpen(true)}
          className="fixed bottom-12 left-3 z-30 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-muted shadow-2 md:hidden"
        >
          ☰ queue
        </button>
      ) : null}

      {/* Bottom view switcher */}
      <div className="shrink-0 border-t border-border bg-surface px-3.5 py-1.5">
        <ViewSwitcher
          view={view}
          onSelect={(v) => {
            setView(v);
            if (v === "case" && !selected) {
              const first = queue[0];
              if (first) setSelected(first.case_id);
            }
          }}
        />
      </div>

      {/* Approvals inbox overlay */}
      {inboxOpen ? <ApprovalsInbox onClose={() => setInboxOpen(false)} /> : null}

      {/* Demo act banner */}
      {demo.running && demo.act ? (
        <div className="fixed bottom-14 left-2 right-2 z-50 flex flex-wrap items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 shadow-2 sm:left-3.5 sm:right-auto sm:max-w-md">
          <Overline>{demo.act.title}</Overline>
          <span className="max-w-full text-[10px] leading-snug text-fg-muted sm:max-w-[340px]">{demo.act.caption}</span>
          <span className="shrink-0 font-mono text-[9px] text-fg-subtle">
            {demo.index + 1}/{demo.total}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ── masthead ──────────────────────────────────────────────────────────────── */

function Masthead({
  health,
  llmProvenance,
  llmStatus,
  openInbox,
  goMonitor,
  running,
  onStartDemo,
  onStopDemo,
}: {
  health: string | undefined;
  llmProvenance: string | null | undefined;
  llmStatus: { available?: boolean; model?: string; provider?: string } | null | undefined;
  openInbox: () => void;
  goMonitor: () => void;
  running: boolean;
  onStartDemo: () => void;
  onStopDemo: () => void;
}) {
  const tone = DEMO_SNAPSHOT ? "neutral" : health === "healthy" ? "success" : "warning";
  const isLive = Boolean(llmProvenance === "live" || llmStatus?.available);
  const modelName = llmStatus?.model ?? "Nemotron-3";

  // A1 — three honest Nemotron chip states driven by served_by + llmStatus.
  let chipLabel = "Deterministic fallback";
  let chipDotColor = "var(--warning)";
  let chipTextColor = "var(--warning)";
  if (isLive) {
    chipLabel = "Nemotron live";
    chipDotColor = "var(--success)";
    chipTextColor = "var(--success)";
  } else if (DEMO_SNAPSHOT || (llmProvenance && llmProvenance.startsWith("cached"))) {
    const date = (llmProvenance?.match(/\d{4}-\d{2}-\d{2}/)?.[0]) ?? "2026-10-25";
    chipLabel = `Nemotron: recorded live run, ${date}`;
    chipDotColor = "var(--fg-subtle)";
    chipTextColor = "var(--fg-subtle)";
  }
  const chipTooltip =
    isLive
      ? "Nemotron calls are succeeding against Nebius Token Factory."
      : llmProvenance?.startsWith("cached")
        ? "Replaying recorded Nemotron output from a real Nebius Token Factory pass."
        : "No Nemotron output exists; deterministic rules produced this verdict.";

  return (
    <header className="relative shrink-0 border-b border-border bg-surface">
      <div className="flex h-1 bg-runway" />
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 py-2 sm:px-3.5">
        {/* Brand */}
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: toneVar(tone) }}
            aria-label={
              DEMO_SNAPSHOT
                ? "static snapshot of a recorded run"
                : `backend ${health ?? "unknown"}`
            }
          />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">Sentinel</span>
        </span>

        {/* Backend + AI status badges — always visible */}
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-fg-muted">
          <span className="font-mono text-[9px] font-medium">Backend:</span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: health === "healthy" ? "var(--success)" : "var(--danger)" }}
            aria-hidden="true"
          />
          <span
            className="font-mono text-[9px] font-semibold"
            style={{ color: health === "healthy" ? "var(--success)" : "var(--danger)" }}
          >
            {DEMO_SNAPSHOT ? "static snapshot" : health === "healthy" ? "live" : "offline"}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5" title={`${chipTooltip} · Model: ${modelName}`}>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: chipDotColor }}
            aria-hidden="true"
          />
          <span
            className="font-mono text-[9px] font-semibold"
            style={{ color: chipTextColor }}
          >
            {chipLabel}
          </span>
          <span className="hidden font-mono text-[9px] text-fg-subtle sm:inline">· {modelName}</span>
        </div>

        <span className="flex-1" />

        {/* Action buttons — wrap cleanly on narrow screens */}
        <span role="group" aria-label="Run controls" className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={openInbox}
            className="rounded-md border border-border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-muted hover:text-fg"
          >
            inbox
          </button>
          <button
            type="button"
            onClick={goMonitor}
            className="rounded-md border border-border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-muted hover:text-fg"
          >
            pack
          </button>
          <button
            type="button"
            onClick={running ? onStopDemo : onStartDemo}
            className={cn(
              "rounded-md px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em]",
              running ? "bg-accent text-accent-contrast" : "border border-border text-fg-muted hover:text-fg",
            )}
          >
            {running ? "stop" : "demo"}
          </button>
        </span>
      </div>
    </header>
  );
}

function ViewSwitcher({ view, onSelect }: { view: View; onSelect: (v: View) => void }) {
  const items: { id: View; label: string; icon?: never }[] = [
    { id: "queue", label: "queue" },
    { id: "case", label: "case" },
    { id: "graph", label: "graph" },
    { id: "monitor", label: "pack" },
  ];
  // Ring tab hidden behind NEXT_PUBLIC_SHOW_RING=1 (B7).
  if (process.env.NEXT_PUBLIC_SHOW_RING === "1") {
    items.push({ id: "ring", label: "ring" });
  }
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Views">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          aria-pressed={view === item.id}
          className={cn(
            "rounded-md px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]",
            view === item.id ? "bg-accent-tint text-accent" : "text-fg-muted hover:text-fg",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function QueueSummary({ rows }: { rows: QueueRow[] }) {
  const investigated = rows.filter((r) => r.investigated).length;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
      <Overline>Queue · {rows.length} cases</Overline>
      <p className="mt-2 text-caption text-fg-muted">
        {investigated} investigated · {rows.length - investigated} pending. Use the
        &ldquo;case&rdquo; tab to open one.
      </p>
    </div>
  );
}

function CaseFooter({
  caseId,
  canvas,
  riskTone,
  hunt,
  onOpenGraph,
}: {
  caseId: string;
  canvas: CaseGraph | null | undefined;
  riskTone: string;
  hunt: ReturnType<typeof huntState>;
  onOpenGraph: () => void;
}) {
  if (!caseId) return null;
  return (
    <div className="shrink-0 border-t border-border bg-surface px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: riskTone }}
            aria-hidden="true"
          />
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: riskTone }}
          >
            {hunt.label}
          </span>
        </span>
        <span className="font-mono text-[10px] text-fg-muted">{hunt.note}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onOpenGraph}
          className="rounded-md border border-border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-muted hover:text-fg"
        >
          graph · {canvasSummary(canvas ?? null)}
        </button>
      </div>
    </div>
  );
}

/** Lightweight overlay; the full drawer lives at /approvals. */
function ApprovalsInbox({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Approvals inbox"
      className="fixed inset-0 z-40 bg-surface shadow-3"
      style={{ right: 0, width: "min(360px, 90vw)" }}
    >
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <Overline>Approvals</Overline>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1 font-mono text-[10px] text-fg-muted hover:text-fg"
        >
          close ×
        </button>
      </div>
      <div className="px-3.5 py-3 text-caption text-fg-subtle">
        Pending approvals are managed in the full inbox. Open it from the
        case panel footer or navigate to <code>/approvals</code>.
      </div>
    </div>
  );
}
