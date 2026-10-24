"use client";

/**
 * What to do now — the policy engine's recommended actions.
 *
 * The HHGOA backend does not expose an interactive execute endpoint to the
 * UI; the answer file carries `next_best_actions` with an `initial` set (what
 * the agent recommended before asking anything) and a `final` set (after the
 * answer and any Q&A came back). The toggle between them is the point: on a
 * case where the picture changed, flipping is the clearest way to see it.
 *
 * Decisions are already made server-side by the policy engine, so the rail is
 * read-only — it states the route (auto / L1 / L2) and the reason, and opens
 * the approvals inbox for anything still waiting on a human.
 */

import { useState } from "react";

import { Icon } from "@/components/console/icons";
import { ConsoleChip, Panel } from "@/components/console/parts";
import { actionTone, humanise, routeTone, toneVar } from "@/components/console/vm";
import type { ActionLineOut } from "@/lib/hhgoa";
import { cn } from "@/lib/cn";

function ActionLine({ line }: { line: ActionLineOut }) {
  const tone = actionTone(line.action as never);
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
      <Icon name="bolt" size={14} style={{ color: toneVar(tone) }} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.02em]">
            {humanise(line.action)}
          </span>
          <ConsoleChip tone={routeTone(line.route)}>{line.route}</ConsoleChip>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-fg-muted">{line.reason}</p>
      </div>
    </li>
  );
}

export function ActionRail({
  initial,
  final,
  whatChanged,
  openInbox,
}: {
  initial: ActionLineOut[];
  final: ActionLineOut[];
  whatChanged: string;
  openInbox: () => void;
}) {
  const [phase, setPhase] = useState<"initial" | "final">("initial");
  const lines = phase === "initial" ? initial : final;

  return (
    <Panel
      title="Recommended actions"
      aside="Nemotron proposes · policy decides"
      bodyClassName="p-3 space-y-2.5"
    >
      <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5">
        {(["initial", "final"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPhase(key)}
            aria-pressed={phase === key}
            className={cn(
              "flex-1 rounded-[4px] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]",
              phase === key ? "bg-accent text-surface" : "text-fg-muted hover:text-fg",
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {whatChanged ? (
        <p className="rounded-md border border-border bg-surface-2 px-2.5 py-2 text-[10px] leading-snug text-fg-muted">
          {whatChanged}
        </p>
      ) : null}

      {lines.length === 0 ? (
        <div className="py-6 text-center text-caption text-fg-subtle">No actions on file.</div>
      ) : (
        <ul className="space-y-2">
          {lines.map((line, i) => (
            <ActionLine key={i} line={line} />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={openInbox}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-muted hover:text-fg"
      >
        <Icon name="doc" size={11} />
        Open approvals inbox
      </button>
    </Panel>
  );
}
