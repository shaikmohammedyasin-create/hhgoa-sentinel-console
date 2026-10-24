"use client";

/**
 * The investigation, as the backend's audit trail records it.
 *
 * The console's Timeline now renders what `GET /investigations/{id}/timeline`
 * actually returns: audit events with a state transition, an actor and a
 * timestamp. This is honest ground truth from the FastAPI backend, not a
 * reconstructed "argument" — the earlier log-odds posting ledger belonged to
 * the retired Sentinel API and has gone with it.
 */

import { Icon } from "@/components/console/icons";
import { ConsoleChip, Panel } from "@/components/console/parts";
import { humanise, toneVar, type Tone } from "@/components/console/vm";
import type { AuditEventOut } from "@/lib/hhgoa";

/** A rough tone per event type, so a scan reads at a glance. */
function eventTone(type: string): Tone {
  const t = type.toUpperCase();
  if (t.includes("FAIL") || t.includes("BLOCK") || t.includes("ESCALAT")) return "danger";
  if (t.includes("APPROV") || t.includes("EXECUT")) return "warning";
  if (t.includes("COMPLET")) return "success";
  return "neutral";
}

function formatTime(ts: string | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function Timeline({
  caseId,
  events,
  isLoading,
}: {
  caseId: string;
  events: AuditEventOut[] | undefined;
  isLoading: boolean;
}) {
  const rows = events ?? [];
  return (
    <Panel title="Audit timeline" aside={caseId}>
      {isLoading ? (
        <div className="py-10 text-center text-caption text-fg-subtle">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-caption text-fg-subtle">
          No audit events for this case yet. Run the investigation first.
        </div>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((ev, i) => {
            const tone = eventTone(ev.event_type);
            return (
              <li key={ev.event_id ?? i} className="flex items-start gap-2.5">
                <div
                  className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: toneVar(tone) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ConsoleChip tone={tone}>{humanise(ev.event_type)}</ConsoleChip>
                    {ev.state_from && ev.state_to ? (
                      <span className="font-mono text-[9px] text-fg-muted">
                        {ev.state_from} → {ev.state_to}
                      </span>
                    ) : null}
                    <span className="flex-1" />
                    <span className="font-mono text-[9px] tabular-nums text-fg-subtle">
                      {ev.timestamp ? formatTime(ev.timestamp) : "replay"}
                    </span>
                  </div>
                  {typeof ev.metadata?.detail === "string" ? (
                    <p className="mt-0.5 text-[10px] leading-snug text-fg-muted">
                      {ev.metadata.detail}
                    </p>
                  ) : null}
                  {ev.actor ? (
                    <div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-fg-muted">
                      <Icon name="user" size={10} />
                      <span>{ev.actor}</span>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
