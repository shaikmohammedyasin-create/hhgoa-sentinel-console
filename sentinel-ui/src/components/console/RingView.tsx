"use client";

/**
 * Ring discovery — the honest state.
 *
 * The HHGOA read API does not expose a ring-sweep endpoint (no rings, no
 * device-sharing sweep over the pack). This view therefore states that the
 * capability does not exist in this API rather than fabricating a finding.
 * The queue and the per-case subgraph remain the source of truth here.
 */

import { Icon } from "@/components/console/icons";
import { Overline } from "@/components/console/parts";

export function RingView() {
  return (
    <div className="absolute inset-x-0 bottom-0 top-0 z-view overflow-y-auto bg-bg px-6 pb-9 pt-5">
      <header className="mb-4">
        <div className="text-[16px] font-bold leading-tight">Ring discovery</div>
        <div className="mt-1.5 font-mono text-[10.5px] text-fg-muted">
          multi-card device rings across the pack
        </div>
      </header>

      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface px-5 py-6">
        <div className="flex items-center gap-2">
          <Icon name="ring" size={16} style={{ color: "var(--fg-muted)" }} />
          <Overline>Not available in this API</Overline>
        </div>
        <p className="max-w-[560px] text-[12px] leading-[1.6] text-fg-muted">
          The HHGOA read API exposes no ring-sweep endpoint — it returns the case
          queue, per-case subgraphs and investigation results, but not a
          cross-case device-sharing analysis. This screen deliberately shows that
          absence instead of inventing a ring finding.
        </p>
        <p className="max-w-[560px] text-[12px] leading-[1.6] text-fg-subtle">
          The place to look for the ring-shaped question is the case subgraph: its{" "}
          <span className="font-mono text-[10px]">DeviceProfile</span> and{" "}
          <span className="font-mono text-[10px]">ConnectedCard</span> nodes and the{" "}
          <span className="font-mono text-[10px]">SHARED_DEVICE</span> links are exactly
          the material a sweep would start from.
        </p>
      </div>
    </div>
  );
}
