"use client";

/**
 * The twenty cases, ranked by what deserves attention.
 *
 * Ordered by exposure × uncertainty rather than by probability. A case at 0.9
 * has already been decided; a case at 0.55 with four thousand dollars behind
 * it is the one an analyst should open next. Sorting by probability would put
 * the settled cases on top and bury the work.
 *
 * Each row carries its own dial, so the rail is scannable without reading a
 * single number. Rows that have not been run yet show a hollow dial.
 */

import { Icon } from "@/components/console/icons";
import { ConsoleChip, Dial, Overline } from "@/components/console/parts";
import { exposureDisplay, toneVar, triggerIcon, triggerTone, verdictTone } from "@/components/console/vm";
import type { QueueRow } from "@/lib/hhgoa";
import { cn } from "@/lib/cn";

/**
 * What should be looked at next.
 *
 * Uncertainty peaks at p = 0.5 and falls to nothing at either end, so
 * `p(1-p)` is the shape. Exposure is damped by a log because the difference
 * between $30 and $300 matters and the difference between $3,000 and $30,000
 * matters much less once it is already going to a human either way.
 */
/** Extract a $x.xx trigger amount from the trigger_text, if present. */
function triggerAmount(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\(\$([\d,]+\.?\d*)\)/);
  return m ? `$${m[1]}` : null;
}

export function attentionScore(row: QueueRow): number {
  const p = row.fraud_probability ?? 0.5;
  const uncertainty = p * (1 - p);
  const exposure = Math.log10(1 + Math.max(row.exposure_usd ?? 0, 0));
  return uncertainty * (1 + exposure);
}

export function QueueRail({
  rows,
  selected,
  runningCase,
  loading = false,
  failed = false,
  onSelect,
}: {
  rows: QueueRow[];
  selected: string;
  runningCase: string | null;
  /** True until the first queue payload lands; without it an empty rail claims
   *  "No cases." while the fetch is still in flight. */
  loading?: boolean;
  /** True when the queue request failed, so "Loading…" would be a lie. */
  failed?: boolean;
  onSelect: (caseId: string) => void;
}) {
  const ordered = [...rows].sort((a, b) => {
    const delta = attentionScore(b) - attentionScore(a);
    return Math.abs(delta) > 1e-9 ? delta : a.case_id.localeCompare(b.case_id);
  });

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-border bg-surface md:w-auto md:min-w-[220px]">
      <div className="flex shrink-0 items-baseline justify-between px-3.5 pb-2 pt-3">
        <Overline className="tracking-[0.14em]">Case queue</Overline>
        <span className="font-mono text-[9px] font-medium text-fg-subtle">
          exposure × uncertainty
        </span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {ordered.map((row) => {
          const on = row.case_id === selected;
          const live = row.case_id === runningCase;
          const tone = live
            ? "accent"
            : row.verdict
              ? verdictTone(row.verdict)
              : "neutral";
          return (
            <li key={row.case_id}>
              <button
                type="button"
                onClick={() => onSelect(row.case_id)}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "mb-1 w-full rounded-lg border px-2.5 py-2.5 text-left transition-colors duration-fast",
                  on ? "border-accent bg-accent-tint" : "border-transparent hover:bg-surface-2",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    name={triggerIcon(row.trigger_type)}
                    size={13}
                    style={{ color: toneVar(triggerTone(row.trigger_type)) }}
                  />
                  <span className="whitespace-nowrap font-mono text-[11px] font-semibold tracking-[0.02em]">
                    {row.case_id}
                  </span>
                  <span className="flex-1" />
                  <Dial
                    p={row.investigated ? row.fraud_probability : null}
                    size={26}
                    stroke={3}
                    muted={!row.investigated}
                  />
                </div>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    <ConsoleChip tone={tone}>
                      {live ? "investigating" : (row.verdict ?? "not run")}
                    </ConsoleChip>
                    <span className="font-mono text-[9px] text-fg-muted">trigger {triggerAmount(row.trigger_text) ?? "—"}</span>
                    <span className="font-mono text-[9px] text-fg-muted">ring exposure {exposureDisplay(row.exposure_usd, row.verdict)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-fg-muted">P(fraud)</span>
                    <span
                      className="font-mono text-[11px] font-bold tabular-nums"
                      style={{ color: toneVar(tone) }}
                    >
                      {row.investigated && row.fraud_probability !== null
                        ? `${row.fraud_probability.toFixed(3)}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {ordered.length === 0 ? (
          <li className="px-2 py-8 text-center text-caption text-fg-subtle">
            {failed
              ? "Backend unreachable — is the API running?"
              : loading
                ? "Loading queue…"
                : "No cases."}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}
