"use client";

/**
 * Everything waiting on a human, in a drawer rather than a page.
 *
 * A drawer because approving is something you do *while* looking at a case,
 * not instead of looking at one. There is no role switcher anymore — the
 * HHGOA backend requires an approver name per decision, so the drawer asks
 * for one and records who decided. Every approval that comes back is shown
 * (including already-decided ones), pending items get the decision buttons.
 */

import { useState } from "react";

import { Icon } from "@/components/console/icons";
import { ConsoleChip, Overline } from "@/components/console/parts";
import { humanise, routeTone, toneVar } from "@/components/console/vm";
import { ApiProblem } from "@/lib/api";
import { useApprovals, useDecideApproval } from "@/lib/hooks";
import type { ApprovalOut } from "@/lib/hhgoa";
import { cn } from "@/lib/cn";

export function ApprovalsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: approvals, isLoading } = useApprovals();
  const decide = useDecideApproval();
  const [approver, setApprover] = useState("analyst");
  const [error, setError] = useState<string | null>(null);
  const pending = (approvals ?? []).filter((a) => a.status === "pending");
  const decided = (approvals ?? []).filter((a) => a.status !== "pending");

  async function submit(a: ApprovalOut, decision: "approved" | "rejected") {
    setError(null);
    try {
      await decide.mutateAsync({
        caseId: a.case_id,
        approvalId: a.approval_id,
        decision,
        approver: approver || "analyst",
      });
    } catch (err) {
      setError(err instanceof ApiProblem ? err.detail : "Request failed.");
    }
  }

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-y-0 right-0 z-40 w-full max-w-md transform border-l border-border bg-surface shadow-2xl transition-transform duration-base",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Overline>Approvals inbox</Overline>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 font-mono text-[10px] text-fg-muted hover:text-fg"
          aria-label="Close approvals"
        >
          close ×
        </button>
      </header>

      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <label
          htmlFor="approver"
          className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-muted"
        >
          Acting as
        </label>
        <input
          id="approver"
          value={approver}
          onChange={(e) => setApprover(e.target.value)}
          className="w-40 rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] outline-none focus:border-accent"
        />
      </div>

      <div className="h-full overflow-y-auto p-4 pb-32">
        {isLoading ? (
          <div className="py-10 text-center text-caption text-fg-subtle">Loading…</div>
        ) : pending.length === 0 && decided.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center text-caption text-fg-subtle">
            <Icon name="check" size={18} />
            <span>No approvals here.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error ? (
              <div className="rounded-md border border-danger bg-danger-tint px-3 py-2 text-[11px] text-danger">
                {error}
              </div>
            ) : null}

            {pending.length > 0 ? (
              <section className="space-y-2">
                <Overline>Pending ({pending.length})</Overline>
                {pending.map((a) => (
                  <ApprovalRow key={a.approval_id} approval={a} onDecide={submit} />
                ))}
              </section>
            ) : null}

            {decided.length > 0 ? (
              <section className="space-y-2">
                <Overline>Decided</Overline>
                {decided.map((a) => (
                  <div
                    key={a.approval_id}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <ConsoleChip tone={a.status === "approved" ? "success" : "danger"}>
                        {a.status}
                      </ConsoleChip>
                      <span className="font-mono text-[10px] text-fg-muted">{a.case_id}</span>
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] font-semibold uppercase">
                      {humanise(a.action)}
                    </p>
                    <p className="mt-1 text-[10px] text-fg-subtle">{a.reason}</p>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalRow({
  approval,
  onDecide,
}: {
  approval: ApprovalOut;
  onDecide: (a: ApprovalOut, decision: "approved" | "rejected") => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5">
        <ConsoleChip tone={routeTone(approval.route as "auto" | "L1" | "L2")}>
          {approval.route}
        </ConsoleChip>
        <span className="font-mono text-[10px] text-fg-muted">{approval.case_id}</span>
        <span className="flex-1" />
        <span className="font-mono text-[10px] font-semibold">{approval.approval_id}</span>
      </div>
      <p className="mt-1.5 font-mono text-[11px] font-semibold uppercase">{humanise(approval.action)}</p>
      <p className="mt-1 text-[10px] leading-snug text-fg-subtle">{approval.reason}</p>
      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          onClick={() => onDecide(approval, "approved")}
          className="flex-1 rounded-md bg-success px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-surface"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onDecide(approval, "rejected")}
          className="flex-1 rounded-md bg-danger px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-surface"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
