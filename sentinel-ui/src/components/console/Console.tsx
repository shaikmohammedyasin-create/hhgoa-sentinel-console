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
import { useCanvas, useCases, useHealth, useInvestigations, useLlmStatus, useRisk } from "@/lib/hooks";
import { useDemo } from "@/components/console/useDemo";
import type { CaseGraph, FraudPattern, QueueRow } from "@/lib/hhgoa";
import { cn } from "@/lib/cn";
import { useSearchParams } from "next/navigation";

type View = "queue" | "case" | "graph" | "monitor" | "ring";

export function Console({ initialCase }: { initialCase?: string }) {
  const params = useSearchParams();
  const [view, setView] = useState<View>("case");
  const [selected, setSelected] = useState(initialCase ?? "");
  const [inboxOpen, setInboxOpen] = useState(params.get("inbox") === "1");

  const { data: rows } = useCases();
  const { data: summaries } = useInvestigations();
  const { data: health } = useHealth();
  const { data: llmStatus } = useLlmStatus();

  // Merge case triggers with any stored investigation results.
  const queue = useMemo<QueueRow[]>(() => {
    const byCase = new Map<string, QueueRow>();
    for (const trigger of rows ?? []) {
      byCase.set(trigger.case_id, { ...trigger, investigated: false, verdict: null, fraud_probability: null, pattern: null, exposure_usd: null, sar_required: null });
    }
    for (const s of summaries ?? []) {
      byCase.set(s.case_id, {
        case_id: s.case_id,
        opened_at: s.updated_at ?? "",
        trigger_type: "analyst_request",
        trigger_text: "",
        flagged_txn_id: "",
        card_id: "",
        customer_id: "",
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
    setSelected(act.caseId);
    setView("case");
  }, []));

  return (
    <div className="relative flex h-dvh flex-col bg-bg text-fg">
      <IconSprite />
      <Masthead
        health={health?.status}
        demoMode={health?.demo_mode}
        llmAvailable={llmStatus?.available}
        openInbox={() => setInboxOpen(true)}
        goMonitor={() => setView("monitor")}
        running={demo.running}
        onStartDemo={demo.start}
        onStopDemo={demo.stop}
      />

      <div className="flex min-h-0 flex-1">
        {(view === "queue" || view === "case" || view === "graph") ? (
          <QueueRail
            rows={queue}
            selected={selected}
            loading={!rows && !summaries}
            runningCase={selectedRow?.investigated === false ? selected : null}
            onSelect={(id) => {
              setSelected(id);
              setView("case");
            }}
          />
        ) : null}

        <div className="relative flex min-w-0 flex-1 flex-col">
          {view === "queue" ? <QueueSummary rows={queue} /> : null}
          {view === "case" && selectedRow ? (
            <CasePanel row={selectedRow} live={demo.running} openInbox={() => setInboxOpen(true)} />
          ) : null}
          {view === "graph" ? (
            <div className="flex h-full flex-col overflow-y-auto">
              <div className="px-3.5 pb-2 pt-3">
                <Overline>Case subgraph · {selected}</Overline>
              </div>
              <div className="min-h-0 flex-1">
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
        <div className="fixed bottom-14 left-3.5 z-50 flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 shadow-2">
          <Overline>{demo.act.title}</Overline>
          <span className="max-w-[340px] text-[10px] leading-snug text-fg-muted">{demo.act.caption}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ── masthead ──────────────────────────────────────────────────────────────── */

function Masthead({
  health,
  demoMode,
  llmAvailable,
  openInbox,
  goMonitor,
  running,
  onStartDemo,
  onStopDemo,
}: {
  health: string | undefined;
  demoMode: boolean | undefined;
  llmAvailable: boolean | undefined;
  openInbox: () => void;
  goMonitor: () => void;
  running: boolean;
  onStartDemo: () => void;
  onStopDemo: () => void;
}) {
  const tone = DEMO_SNAPSHOT ? "neutral" : health === "healthy" ? "success" : "warning";
  return (
    <header className="relative shrink-0 border-b border-border bg-surface">
      <div className="flex h-1 bg-runway" />
      <div className="flex items-center gap-3 px-3.5 py-2">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: toneVar(tone) }}
            aria-label={
              DEMO_SNAPSHOT
                ? "static snapshot of a recorded run"
                : `backend ${health ?? "unknown"}`
            }
          />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">Sentinel</span>
        </span>
        <span className="font-mono text-[9px] text-fg-subtle">
          {DEMO_SNAPSHOT
            ? "static snapshot · recorded run"
            : demoMode
              ? "demo mode · committed cases"
              : "live backend"}
        </span>
        {llmAvailable !== undefined ? (
          <span
            className="font-mono text-[9px]"
            style={{ color: llmAvailable ? "var(--success)" : "var(--fg-subtle)" }}
          >
            {llmAvailable ? "nebius · nemotron" : "nemotron unavailable"}
          </span>
        ) : null}
        <span className="flex-1" />
        <span role="group" aria-label="Run controls" className="flex items-center gap-1.5">
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
    { id: "ring", label: "ring" },
  ];
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
