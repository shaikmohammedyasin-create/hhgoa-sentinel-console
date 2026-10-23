"use client";

/**
 * The whole pack at once, and whether the run is defensible.
 *
 * Renders `GET /benchmark/report` — the real `run_all` output. What it shows
 * is what the backend measured: how many of the twenty cases completed, how
 * many failed, how long it took, the verdict mix, the SAR-filed rate, and
 * every case row. The old ratios this screen imagined (block rate, calibration
 * histogram) belonged to a report this API does not produce, so they are gone.
 */

import { Icon } from "@/components/console/icons";
import { ConsoleChip, Overline, StatTile } from "@/components/console/parts";
import { humanise, meterVar, toneVar, verdictTone } from "@/components/console/vm";
import { useBenchmark } from "@/lib/hooks";
import type { BenchmarkReport } from "@/lib/hhgoa";

export function MonitorView() {
  const { data, isLoading, error } = useBenchmark();

  if (isLoading) {
    return <Frame><p className="text-caption text-fg-subtle">Loading the pack report…</p></Frame>;
  }
  if (error || !data) {
    return (
      <Frame>
        <p className="text-caption text-fg-subtle">
          No benchmark report yet: {(error as Error | null)?.message ?? "run POST /benchmark/run first."}
        </p>
      </Frame>
    );
  }

  const verdicts: Record<string, number> = {};
  let sarFiled = 0;
  for (const row of data.results) {
    verdicts[row.verdict] = (verdicts[row.verdict] ?? 0) + 1;
    if (row.sar_filed) sarFiled += 1;
  }
  const verdictTally = Object.entries(verdicts).sort((a, b) => b[1] - a[1]);
  const dominant = verdictTally[0];
  const complete = data.completed === data.total_cases;

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 z-view overflow-y-auto bg-bg px-6 pb-9 pt-5">
      <header className="mb-4 flex flex-wrap items-end gap-3.5">
        <div>
          <div className="text-[16px] font-bold leading-tight">The pack, scored</div>
          <div className="mt-1.5 font-mono text-[10.5px] text-fg-muted">
            {data.completed} of {data.total_cases} cases completed · {data.elapsed_s.toFixed(0)}s
            wall clock · {data.results.length} result rows
          </div>
        </div>
        <span className="flex-1" />
        <ConsoleChip tone={data.failed === 0 ? "success" : "danger"}>
          {data.failed === 0 ? "all cases ran" : `${data.failed} failed`}
        </ConsoleChip>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Completed"
          value={`${data.completed}/${data.total_cases}`}
          note="cases the pipeline finished"
          tone={complete ? "success" : data.failed > 0 ? "danger" : "warning"}
          icon="check"
        />
        <StatTile
          label="Failed"
          value={`${data.failed}`}
          note="cases that errored"
          tone={data.failed === 0 ? "success" : "danger"}
          icon="alert"
        />
        <StatTile
          label="Elapsed"
          value={`${data.elapsed_s.toFixed(1)}s`}
          note="full run, wall clock"
          tone="neutral"
          icon="window"
        />
        <StatTile
          label="SAR filed"
          value={pct(sarFiled / Math.max(data.completed, 1))}
          note={`${sarFiled} of ${data.completed} cases`}
          tone="neutral"
          icon="doc"
        />
        <StatTile
          label="Dominant verdict"
          value={dominant ? `${dominant[1]} ${humanise(dominant[0])}` : "—"}
          note="mix across completed runs"
          tone="neutral"
          icon="scope"
        />
      </div>

      {data.failed > 0 ? (
        <section className="mb-4 overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <Overline>Failed cases</Overline>
            <span className="font-mono text-[9px] text-fg-subtle">{data.errors.length} errors</span>
          </header>
          <ul className="p-3">
            {data.errors.map((e) => (
              <li
                key={e.case_id}
                className="mb-1.5 flex items-start gap-2 rounded-md border border-danger bg-danger-tint px-2.5 py-2 last:mb-0"
              >
                <Icon name="alert" size={12} className="mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
                <div>
                  <span className="font-mono text-[10px] font-semibold text-danger">{e.case_id}</span>
                  <p className="mt-0.5 text-[10px] leading-snug text-fg-muted">{e.error}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.results.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <Overline>Every case that ran</Overline>
            <span className="font-mono text-[9px] text-fg-subtle">{data.results.length} rows</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {["Case", "Verdict", "P(fraud)", "Pattern", "Status", "SAR", "Evidence", "Tools", "Latency"].map(
                    (head) => (
                      <th
                        key={head}
                        scope="col"
                        className="px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.09em] text-fg-muted"
                      >
                        {head}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={row.case_id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2.5 font-mono text-[10.5px] font-semibold">{row.case_id}</td>
                    <td className="px-3 py-2.5">
                      <ConsoleChip tone={verdictTone(row.verdict)}>{row.verdict}</ConsoleChip>
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-[10.5px] font-bold tabular-nums"
                      style={{ color: meterVar(row.fraud_probability) }}
                    >
                      {row.fraud_probability.toFixed(3)}
                    </td>
                    <td className="px-3 py-2.5 text-[11.5px] text-fg-muted">
                      {row.pattern ? humanise(row.pattern) : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fg-muted">{row.status}</td>
                    <td className="px-3 py-2.5">
                      {row.sar_filed ? <ConsoleChip tone="danger">filed</ConsoleChip> : <span className="text-caption text-fg-subtle">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10.5px] tabular-nums text-fg-muted">
                      {row.evidence_count}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10.5px] tabular-nums text-fg-muted">
                      {row.tool_calls}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10.5px] tabular-nums text-fg-muted">
                      {row.latency_s.toFixed(1)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {verdictTally.length > 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-subtle">Verdict mix</span>
          {verdictTally.map(([verdict, count]) => (
            <span key={verdict} className="flex items-center gap-1.5 font-mono text-[9px] text-fg-muted">
              <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                <rect width="8" height="8" rx="2" fill={toneVar(verdictTone(verdict as "fraud" | "legitimate" | "uncertain"))} />
              </svg>
              {count} {humanise(verdict)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 top-0 z-view flex items-center justify-center bg-bg p-8">
      {children}
    </div>
  );
}
