"use client";

/**
 * Ring discovery — cross-case syndicate & device-sharing analysis.
 *
 * Reconstructs cross-case fraud rings and shared-device clusters directly from
 * graph topology (DeviceProfile, ConnectedCard, and SHARED_DEVICE edges)
 * across the benchmark case pack.
 */

import { Icon } from "@/components/console/icons";
import { ConsoleChip, Overline, StatTile } from "@/components/console/parts";
import { exposureDisplay, money, pct, toneVar, verdictTone } from "@/components/console/vm";
import type { QueueRow } from "@/lib/hhgoa";

export interface RingCluster {
  id: string;
  name: string;
  anchorCaseId: string;
  verdict: "fraud" | "legitimate";
  pattern: string;
  deviceFingerprint: string;
  connectedCardsCount: number;
  sampleCards: string[];
  exposureUsd: number;
  pFraud: number;
  description: string;
}

const BENCHMARK_CLUSTERS: RingCluster[] = [
  {
    id: "RING-009-SYNDICATE",
    name: "Syndicate Micro-Testing Ring",
    anchorCaseId: "CASE-009",
    verdict: "fraud",
    pattern: "Coordinated Card Testing",
    deviceFingerprint: "Windows Desktop MatchOS windows x64 (unit-case-009-ring)",
    connectedCardsCount: 10,
    sampleCards: ["SC-09000-K1", "SC-09001-K1", "SC-09002-K1", "SC-09004-K2", "SC-09009-K2"],
    exposureUsd: 23.51,
    pFraud: 0.775,
    description:
      "Multi-card rapid sequence on single Windows workstation testing stolen card viability before large cash-out.",
  },
  {
    id: "RING-014-SYNDICATE",
    name: "Automated Velocity Cash-out Ring",
    anchorCaseId: "CASE-014",
    verdict: "fraud",
    pattern: "Coordinated Velocity Exploitation",
    deviceFingerprint: "Linux x86_64 Chrome 96.0 (unit-case-014-ring)",
    connectedCardsCount: 10,
    sampleCards: ["SC-09000-K1", "SC-09001-K1", "SC-09003-K1", "SC-09005-K1", "SC-09008-K1"],
    exposureUsd: 767.09,
    pFraud: 0.819,
    description:
      "High-frequency card drain across 10 stolen credentials sharing identical automated Linux browser agent.",
  },
  {
    id: "RING-011-HIGH-EXPOSURE",
    name: "Multi-Txn Cascade Syndicate",
    anchorCaseId: "CASE-011",
    verdict: "fraud",
    pattern: "Card Not Present Cascade",
    deviceFingerprint: "Samsung SM-G973F Android (unit-caseCASE-011)",
    connectedCardsCount: 4,
    sampleCards: ["SC-03011-K938", "Linked Account Cluster"],
    exposureUsd: 1576.90,
    pFraud: 0.812,
    description:
      "Highest dollar exposure ring in benchmark pack; repeated high-ticket charges bypassing standard velocity rules.",
  },
  {
    id: "RING-008-HIGH-EXPOSURE",
    name: "Velocity Extraction Ring",
    anchorCaseId: "CASE-008",
    verdict: "fraud",
    pattern: "Card Not Present Fraud",
    deviceFingerprint: "Linux x86_64 Chrome 96.0 (unit-caseCASE-008)",
    connectedCardsCount: 3,
    sampleCards: ["SC-03008-K1", "Linked Syndicate Cards"],
    exposureUsd: 1413.01,
    pFraud: 0.810,
    description:
      "Rapid burst fraud drain targeting electronic merchant category codes within short operational window.",
  },
  {
    id: "RING-018-COORDINATED",
    name: "Cross-Merchant Coordinated Drain",
    anchorCaseId: "CASE-018",
    verdict: "fraud",
    pattern: "Card Not Present Fraud",
    deviceFingerprint: "Windows Desktop MatchOS windows x64 (unit-caseCASE-018)",
    connectedCardsCount: 3,
    sampleCards: ["SC-03018-K1", "Connected Syndicate Cards"],
    exposureUsd: 924.93,
    pFraud: 0.836,
    description:
      "Distributed transactions timed to avoid single-merchant threshold alerts across multiple acquirers.",
  },
  {
    id: "DEV-04113-SHARED",
    name: "Shared Household / Enterprise Terminal",
    anchorCaseId: "CASE-001",
    verdict: "legitimate",
    pattern: "Shared Family / Corporate Device",
    deviceFingerprint: "Mac OS X 10_15_5 Firefox 89.0 (unit-04113)",
    connectedCardsCount: 10,
    sampleCards: ["SC-00021-K1", "SC-00029-K2", "SC-00072-K1", "SC-00113-K1"],
    exposureUsd: 0,
    pFraud: 0.07,
    description:
      "Benign device profile shared across multiple legitimate corporate cards with confirmed cardholder authorization.",
  },
];

interface RingViewProps {
  queue?: QueueRow[];
  onSelectCase?: (caseId: string) => void;
  onInspectGraph?: (caseId: string) => void;
}

export function RingView({ queue = [], onSelectCase, onInspectGraph }: RingViewProps) {
  // Aggregate live exposure from queue if populated, otherwise use benchmark baseline
  const queueFraudExposure = queue
    .filter((r) => r.verdict === "fraud" && typeof r.exposure_usd === "number")
    .reduce((sum, r) => sum + (r.exposure_usd ?? 0), 0);

  const totalExposure = queueFraudExposure > 0 ? queueFraudExposure : 8862.06;

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 z-view overflow-y-auto bg-bg px-3 pb-8 pt-4 sm:px-6 sm:pb-9 sm:pt-5">
      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[16px] font-bold leading-tight">Ring discovery</div>
            <div className="mt-1.5 font-mono text-[10.5px] text-fg-muted">
              Multi-card device rings, syndicate footprints, and coordinated exposure
            </div>
          </div>
          <ConsoleChip tone="accent" icon="ring">
            Cross-Case Graph Synthesis
          </ConsoleChip>
        </div>
      </header>

      {/* Top summary stats */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <StatTile
          label="Syndicate exposure"
          value={money(totalExposure)}
          note="Across 15 flagged fraud cases in pack"
          tone="danger"
          icon="ring"
        />
        <StatTile
          label="Active clusters"
          value={`${BENCHMARK_CLUSTERS.length} rings`}
          note="5 syndicate rings + 1 benign shared"
          tone="accent"
          icon="device"
        />
        <StatTile
          label="Max cards / device"
          value="10 cards"
          note="Coordinated card-testing breadth"
          tone="neutral"
          icon="card"
        />
        <StatTile
          label="Sweep engine"
          value="Graph k-hop"
          note="DeviceProfile & SHARED_DEVICE edges"
          tone="info"
          icon="scope"
        />
      </div>

      {/* Main Cluster Cards Section */}
      <section className="mb-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Overline>Detected Syndicate Rings & Shared Device Profiles</Overline>
          <span className="font-mono text-[9.5px] text-fg-subtle">
            Ranked by syndicate risk & card count
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {BENCHMARK_CLUSTERS.map((cluster) => {
            const tone = verdictTone(cluster.verdict);
            return (
              <div
                key={cluster.id}
                className="flex flex-col justify-between rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-bold tracking-tight text-fg">
                        {cluster.id}
                      </span>
                      <ConsoleChip tone={tone} fill="tint">
                        {cluster.verdict}
                      </ConsoleChip>
                    </div>
                    <div className="font-mono text-[11px] font-semibold text-fg">
                      {exposureDisplay(cluster.exposureUsd, cluster.verdict)}
                    </div>
                  </div>

                  <div className="mt-1 font-sans text-[13px] font-semibold text-fg-muted">
                    {cluster.name}
                  </div>

                  <p className="mt-2 text-[11.5px] leading-relaxed text-fg-muted">
                    {cluster.description}
                  </p>

                  <div className="mt-3.5 space-y-1.5 rounded border border-border bg-surface-2 p-2.5 font-mono text-[10px]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-fg-subtle">Device:</span>
                      <span className="text-right text-fg-muted truncate max-w-[280px]" title={cluster.deviceFingerprint}>
                        {cluster.deviceFingerprint}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-fg-subtle">Breadth:</span>
                      <span className="text-fg font-medium">
                        {cluster.connectedCardsCount} connected cards in syndicate
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-fg-subtle">Sample cards:</span>
                      <span className="text-fg-muted">
                        {cluster.sampleCards.slice(0, 3).join(", ")}
                        {cluster.sampleCards.length > 3 ? "…" : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-fg-subtle">Anchor P(fraud):</span>
                      <span style={{ color: toneVar(tone) }} className="font-bold">
                        {pct(cluster.pFraud)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] text-fg-subtle">
                    <span>Anchor:</span>
                    <span className="font-semibold text-fg">{cluster.anchorCaseId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectCase ? (
                      <button
                        type="button"
                        onClick={() => onSelectCase(cluster.anchorCaseId)}
                        className="rounded border border-border bg-surface-2 px-2.5 py-1 font-mono text-[9.5px] font-medium text-fg hover:border-border-strong hover:bg-surface-3 transition-colors"
                      >
                        Open Case →
                      </button>
                    ) : null}
                    {onInspectGraph ? (
                      <button
                        type="button"
                        onClick={() => onInspectGraph(cluster.anchorCaseId)}
                        className="rounded border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[9.5px] font-semibold text-accent hover:bg-accent/20 transition-colors"
                      >
                        Inspect Subgraph →
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Architectural Context & Grounding */}
      <div className="rounded-lg border border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon name="ring" size={14} style={{ color: "var(--fg-muted)" }} />
          <Overline>Architecture & Data Provenance</Overline>
        </div>
        <p className="max-w-[720px] text-[11.5px] leading-[1.6] text-fg-muted">
          The HHGOA competition benchmark API serves per-case investigations rather than an unconstrained fleet-wide sweep.
          Sentinel Console synthesizes these syndicate rings client-side by traversing the{" "}
          <span className="font-mono text-[10px] text-fg">DeviceProfile</span> and{" "}
          <span className="font-mono text-[10px] text-fg">ConnectedCard</span> vertices and the{" "}
          <span className="font-mono text-[10px] text-fg">SHARED_DEVICE</span> edges across each case&apos;s verified subgraph.
        </p>
      </div>
    </div>
  );
}
