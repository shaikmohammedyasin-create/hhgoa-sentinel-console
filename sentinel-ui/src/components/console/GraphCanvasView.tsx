"use client";

/**
 * The case as a subgraph.
 *
 * Drawn from `GET /api/investigations/{id}/graph` — the real backend builds
 * a case-scoped graph: the customer, the card, the flagged transaction,
 * connected devices and cards, prior closed cases and the durable graph case
 * record. BFS rings from the card under review; the same case always draws
 * the same picture.
 *
 * Node `type` is a string from the backend. The mapping to a tone is
 * exhaustive over the eight types the subgraph builder emits, so a new type
 * fails loudly here rather than silently defaulting. `affected` lives in a
 * node's metadata (the flagged + burst transactions), and those nodes are
 * ringed in danger.
 *
 * Colour is kind, not judgement, with one exception: affected transactions
 * are the nodes the answer actually accuses, and that is the first question
 * anyone asks.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/console/icons";
import { toneVar, type Tone } from "@/components/console/vm";
import type { CaseGraph, GraphNode } from "@/lib/hhgoa";

/** Fallback canvas before the pane has been measured (SSR + first paint). */
const DEFAULT_W = 960;
const DEFAULT_H = 520;
const MIN_W = 320;
const MIN_H = 260;
/** Two hops is all the API returns; anything unreached sits on the outer ring. */
const MAX_HOPS = 2;

/** Ring geometry as a fraction of the measured pane, so the graph fills it. */
const RING_X = [0, 0.18, 0.37];
const RING_Y = [0, 0.20, 0.41];

/** Every node type the subgraph builder emits, mapped to a tone. */
const TYPE_TONE: Record<string, Tone> = {
  Customer: "accent",
  Card: "accent",
  FlaggedTransaction: "danger",
  Transaction: "neutral",
  DeviceProfile: "warning",
  ConnectedCard: "warning",
  ClosedCase: "info",
  InvestigationCase: "info",
};

/** The same table for radius: the things a case is about are drawn bigger. */
const TYPE_RADIUS: Record<string, number> = {
  Customer: 12,
  Card: 15,
  FlaggedTransaction: 14,
  Transaction: 8,
  DeviceProfile: 12,
  ConnectedCard: 11,
  ClosedCase: 11,
  InvestigationCase: 12,
};

const MAX_LABEL = 16;

function shortLabel(label: string): string {
  const head = (label.split("|")[0] ?? label).trim();
  return head.length > MAX_LABEL ? `${head.slice(0, MAX_LABEL - 1)}…` : head;
}

function toneFor(node: GraphNode): Tone {
  if (node.metadata?.affected) return "danger";
  return TYPE_TONE[node.type] ?? "neutral";
}

function radiusFor(node: GraphNode): number {
  return TYPE_RADIUS[node.type] ?? 9;
}

interface Placed {
  node: GraphNode;
  x: number;
  y: number;
  r: number;
  tone: Tone;
  hop: number;
}

/**
 * Breadth-first rings from the card under review.
 *
 * Ordering within a ring is by type then id so the layout is a pure function
 * of the payload: the same case never rearranges itself between two loads.
 * Radii are fractions of the measured pane, so a wide window spreads the rings
 * instead of leaving the drawing stranded in the middle.
 */
function layout(
  canvas: CaseGraph,
  w: number,
  h: number,
): { placed: Placed[]; index: Map<string, Placed> } {
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(1.6, Math.max(1, Math.min(w, h) / 560));
  const nodes = canvas.nodes;
  const neighbours = new Map<string, string[]>();
  for (const node of nodes) neighbours.set(node.id, []);
  for (const link of canvas.links) {
    neighbours.get(link.source)?.push(link.target);
    neighbours.get(link.target)?.push(link.source);
  }

  const root = nodes.find((node) => node.type === "Card") ?? nodes[0];
  const hop = new Map<string, number>();
  if (root) {
    hop.set(root.id, 0);
    let frontier = [root.id];
    let depth = 0;
    while (frontier.length > 0 && depth < MAX_HOPS) {
      depth += 1;
      const next: string[] = [];
      for (const id of frontier) {
        for (const other of neighbours.get(id) ?? []) {
          if (!hop.has(other)) {
            hop.set(other, depth);
            next.push(other);
          }
        }
      }
      frontier = next;
    }
  }
  // Anything the walk never reached sits on the outer ring rather than vanishing.
  const outer = MAX_HOPS;
  for (const node of nodes) if (!hop.has(node.id)) hop.set(node.id, outer);

  const byHop = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const depth = hop.get(node.id) ?? outer;
    const bucket = byHop.get(depth) ?? [];
    bucket.push(node);
    byHop.set(depth, bucket);
  }

  const placed: Placed[] = [];
  for (const [depth, bucket] of [...byHop.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...bucket].sort(
      (a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id),
    );
    const ring = Math.min(depth, MAX_HOPS);
    const ringX = (RING_X[ring] ?? 0) * w;
    const ringY = (RING_Y[ring] ?? 0) * h;
    sorted.forEach((node, index) => {
      // Start at the top and step round. The half-turn offset on odd rings
      // stops a first-ring node from hiding a second-ring one behind it.
      const step = (Math.PI * 2) / Math.max(sorted.length, 1);
      const angle = -Math.PI / 2 + index * step + (depth % 2 === 0 ? 0 : step / 2);
      placed.push({
        node,
        x: ring === 0 ? cx : cx + Math.cos(angle) * ringX,
        y: ring === 0 ? cy : cy + Math.sin(angle) * ringY,
        r: radiusFor(node) * scale,
        tone: toneFor(node),
        hop: depth,
      });
    });
  }

  return { placed, index: new Map(placed.map((item) => [item.node.id, item])) };
}

function nodeMeta(node: GraphNode): string[] {
  const meta: string[] = [];
  if (node.metadata?.affected) meta.push("named in the answer");
  if (node.metadata?.verdict) meta.push(`verdict ${node.metadata.verdict}`);
  if (node.metadata?.probability !== undefined) {
    meta.push(`p=${Number(node.metadata.probability).toFixed(2)}`);
  }
  if (node.metadata?.risk_score !== undefined) {
    meta.push(`risk ${Number(node.metadata.risk_score).toFixed(0)}`);
  }
  return meta;
}

/** Measured size of the pane the graph fills. */
function usePaneSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: DEFAULT_W, height: DEFAULT_H });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

export function GraphCanvasView({ canvas, live }: { canvas: CaseGraph | null; live: boolean }) {
  const [paneRef, size] = usePaneSize();
  const W = Math.max(MIN_W, Math.round(size.width));
  const H = Math.max(MIN_H, Math.round(size.height));
  const model = useMemo(() => (canvas ? layout(canvas, W, H) : null), [canvas, W, H]);

  if (!canvas || !model || canvas.nodes.length === 0) {
    return (
      <div className="mx-1.5 mb-1.5 rounded-lg border border-dashed border-border bg-surface px-3 py-8 text-center text-caption text-fg-subtle sm:mx-3 sm:mb-3">
        No subgraph for this case yet.
      </div>
    );
  }

  const focus = model.placed.find((item) => item.node.type === "Card") ?? model.placed[0];
  // Labels are in user units (1 unit = 1 px here), so they must grow with the
  // pane or they stay thumbnail-sized on a large screen.
  const labelSize = Math.min(13, Math.max(9, Math.round(Math.min(W, H) / 62)));

  return (
    <div className="mx-1.5 mb-1.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface sm:mx-3 sm:mb-3">
      <div ref={paneRef} className="min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-full w-full bg-dotgrid"
          role="img"
          aria-label={`Case subgraph: ${canvas.counts.nodes} nodes, ${canvas.counts.links} links`}
        >
        {canvas.links.map((link, i) => {
          const a = model.index.get(link.source);
          const b = model.index.get(link.target);
          if (!a || !b) return null;
          return (
            <line
              key={`${link.source}-${link.target}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={live ? "var(--accent-bold)" : "var(--border)"}
              strokeWidth={1.6}
              strokeDasharray={live ? "6 6" : undefined}
              className={live ? "animate-trace" : undefined}
            >
              <title>{link.type}</title>
            </line>
          );
        })}

        {focus ? (
          <>
            <circle
              cx={focus.x}
              cy={focus.y}
              r={focus.r + 7}
              fill="none"
              stroke={live ? "var(--accent-bold)" : toneVar(focus.tone)}
              strokeWidth="2"
              className="animate-lock"
            />
            <circle
              cx={focus.x}
              cy={focus.y}
              r={focus.r + 14}
              fill="none"
              stroke={live ? "var(--accent-bold)" : toneVar(focus.tone)}
              strokeWidth="1.2"
              strokeDasharray="5 7"
              opacity={live ? 0.85 : 0.35}
              className="animate-spin-slow"
            />
          </>
        ) : null}

        {model.placed.map((item) => {
          const affected = Boolean(item.node.metadata?.affected);
          return (
            <g key={item.node.id} className="animate-s-pop">
              {affected ? (
                <circle
                  cx={item.x}
                  cy={item.y}
                  r={item.r + 5}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth="1.4"
                  strokeDasharray="4 4"
                />
              ) : null}
              <circle
                cx={item.x}
                cy={item.y}
                r={item.r}
                fill={`color-mix(in srgb, ${toneVar(item.tone)} 20%, transparent)`}
                stroke={toneVar(item.tone)}
                strokeWidth="2"
              />
              <text
                x={item.x}
                y={item.y + item.r + 12}
                fill="var(--fg-muted)"
                fontFamily="var(--font-mono)"
                fontSize={labelSize}
                fontWeight="600"
                textAnchor="middle"
              >
                {shortLabel(item.node.label)}
              </text>
              <title>
                {item.node.type} {item.node.id}
                {nodeMeta(item.node).map((m) => ` · ${m}`).join("")}
              </title>
            </g>
          );
        })}
      </svg>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-border px-3 py-2">
        {Object.entries(TYPE_TONE)
          .map(([type, tone]) => ({ type, tone, count: canvas.nodes.filter((n) => n.type === type).length }))
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <span
              key={entry.type}
              className="flex items-center gap-1.5 font-mono text-[9px] font-medium text-fg-muted"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                <circle cx="4" cy="4" r="4" fill={toneVar(entry.tone)} />
              </svg>
              {entry.type} {entry.count}
            </span>
          ))}
        <span className="ml-auto flex items-center gap-1 font-mono text-[9px] text-fg-subtle">
          <Icon name="doc" size={9} />
          {canvas.counts.nodes} nodes · {canvas.counts.links} links
        </span>
      </div>
    </div>
  );
}

/** The one-line count the pane's header shows. */
export function canvasSummary(canvas: CaseGraph | null): string {
  if (!canvas) return "—";
  return `${canvas.counts.nodes} nodes · ${canvas.counts.links} links`;
}
