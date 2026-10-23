"use client";

/**
 * A small guided walk through three cases that tell the story.
 *
 * A console full of finished cases does not explain itself. The three acts
 * are selections over the real queue rows:
 *   I   the strongest verdict of the pack
 *   II  a case whose agent conclusion disagrees with the bank model
 *   III  the highest-exposure case still uninvestigated
 *
 * Nothing here is scripted data; the acts are chosen from what the queue
 * actually says, so a re-run of the pack does not break the demo.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { QueueRow } from "@/lib/hhgoa";

export interface Act {
  title: string;
  caption: string;
  caseId: string;
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
    });
  }

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
