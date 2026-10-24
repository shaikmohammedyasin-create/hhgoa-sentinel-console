"use client";

/**
 * A guided walk through the console: three cases, then the other views.
 *
 * A console full of finished cases does not explain itself. The three case acts
 * are selections over the real queue rows:
 *   I   the strongest verdict of the pack
 *   II  a case whose agent conclusion disagrees with the bank model
 *   III the highest-exposure case still uninvestigated
 *
 * They are followed by a tour of the views a visitor would otherwise have to
 * find on their own: the device subgraph, the ring screen, the pack report and
 * the approvals inbox. Nothing here is scripted data; every case is chosen from
 * what the queue actually says, so a re-run of the pack does not break the demo.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { QueueRow } from "@/lib/hhgoa";

export type DemoView = "queue" | "case" | "graph" | "monitor" | "ring";

export interface Act {
  title: string;
  caption: string;
  view: DemoView;
  caseId?: string;
  /** Open the approvals overlay for this act. */
  inbox?: boolean;
}

export interface DemoState {
  running: boolean;
  act: Act | null;
  index: number;
  total: number;
  start: () => void;
  stop: () => void;
}

const ACT_MS = 10_000;

function buildActs(rows: QueueRow[]): Act[] {
  const acts: Act[] = [];
  const answered = rows.filter((r) => r.investigated && r.verdict);

  const strongest = answered
    .filter((r) => r.verdict === "fraud")
    .sort((a, b) => (b.fraud_probability ?? 0) - (a.fraud_probability ?? 0))[0];
  if (strongest) {
    acts.push({
      title: "ACT I",
      caption: `${strongest.case_id} — the strongest fraud verdict on this pack.`,
      caseId: strongest.case_id,
      view: "case",
    });
  }

  const disagreement = answered.find(
    (r) => r.verdict === "legitimate" && r.risk_score !== null && r.risk_score > 0.5,
  );
  if (disagreement) {
    acts.push({
      title: "ACT II",
      caption: `${disagreement.case_id} — the model flagged it; the agent disagreed.`,
      caseId: disagreement.case_id,
      view: "case",
    });
  }

  const highestExposure = rows
    .filter((r) => !r.investigated)
    .sort((a, b) => (b.exposure_usd ?? 0) - (a.exposure_usd ?? 0))[0];
  if (highestExposure) {
    acts.push({
      title: "ACT III",
      caption: `${highestExposure.case_id} — highest exposure, not yet run.`,
      caseId: highestExposure.case_id,
      view: "case",
    });
  }

  // The rest of the console, so the walk does not stop at the case file.
  const anchor = strongest?.case_id ?? answered[0]?.case_id;
  acts.push({
    title: "GRAPH",
    caption: "The device subgraph behind the verdict — one profile, many cards.",
    caseId: anchor,
    view: "graph",
  });
  acts.push({
    title: "RING",
    caption: "Ring analysis: what the graph can prove, and what it cannot.",
    view: "ring",
  });
  acts.push({
    title: "PACK",
    caption: "The pack report: every case, its measured latency and token spend.",
    view: "monitor",
  });
  acts.push({
    title: "INBOX",
    caption: "Approvals: a human signs off before a block or a SAR is filed.",
    view: "case",
    inbox: true,
  });

  return acts;
}

export function useDemo(rows: QueueRow[], apply: (act: Act) => void): DemoState {
  const [index, setIndex] = useState(-1);
  const [acts, setActs] = useState<Act[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  const stop = useCallback(() => {
    clear();
    setIndex(-1);
  }, [clear]);

  const start = useCallback(() => {
    clear();
    const planned = buildActs(rows);
    if (planned.length === 0) return;
    setActs(planned);
    planned.forEach((act, i) => {
      timers.current.push(
        setTimeout(() => {
          setIndex(i);
          apply(act);
        }, i * ACT_MS),
      );
    });
    timers.current.push(setTimeout(() => setIndex(-1), planned.length * ACT_MS));
  }, [rows, apply, clear]);

  useEffect(() => clear, [clear]);

  return {
    running: index >= 0,
    act: index >= 0 ? (acts[index] ?? null) : null,
    index,
    total: acts.length,
    start,
    stop,
  };
}
