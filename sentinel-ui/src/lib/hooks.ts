"use client";

/**
 * Query hooks for the HHGOA backend.
 *
 * There is no SSE stream or role header — the backend is request/response,
 * and the console polls the queue while a batch runs. Everything else is
 * plain TanStack Query over the endpoints in `@/lib/api`.
 */

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ApiProblem } from "@/lib/api";
import type { AnalystAnswer } from "@/lib/hhgoa";

const STALE = 5_000;

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    staleTime: 15_000,
    refetchInterval: 10_000,
  });
}

export function useLlmStatus() {
  return useQuery({
    queryKey: ["llm-status"],
    queryFn: () => api.llmStatus(),
    staleTime: 15_000,
    refetchInterval: 10_000,
  });
}

/** Queue: case-pack triggers overlayed with any stored investigation results. */
export function useCases() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: () => api.cases({ limit: 100 }),
    staleTime: STALE,
    refetchInterval: 5_000,
  });
}

/** Queue rows as investigation summaries (only cases investigated this session). */
export function useInvestigations() {
  return useQuery({
    queryKey: ["investigations"],
    queryFn: () => api.investigations({ limit: 200 }),
    staleTime: STALE,
    refetchInterval: 5_000,
  });
}

/** Full answer file for one case (demo mode falls back to the committed file). */
export function useAnswer(caseId: string) {
  return useQuery({
    queryKey: ["answer", caseId],
    queryFn: () => api.answer(caseId),
    staleTime: STALE,
    enabled: Boolean(caseId),
  });
}

/** Case-scoped subgraph for the graph pane. Costs a graph round trip; opt-in. */
export function useCanvas(caseId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["canvas", caseId],
    queryFn: () => api.canvas(caseId),
    enabled: enabled && Boolean(caseId),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useRisk(caseId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["risk", caseId],
    queryFn: () => api.risk(caseId),
    enabled: enabled && Boolean(caseId),
    retry: false,
  });
}

export function useTimeline(caseId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["timeline", caseId],
    queryFn: () => api.timeline(caseId),
    enabled: enabled && Boolean(caseId),
    retry: false,
  });
}

export function useApprovals(status?: string) {
  return useQuery({
    queryKey: ["approvals", status],
    queryFn: () => api.approvals({ status, limit: 100 }),
    refetchInterval: 5_000,
  });
}

/** Decide one pending approval (approved / rejected) and refresh the list. */
export function useDecideApproval() {
  const client = useQueryClient();
  return useMutation<
    unknown,
    ApiProblem,
    { caseId: string; approvalId: string; decision: "approved" | "rejected"; approver: string }
  >({
    mutationFn: ({ caseId, approvalId, decision, approver }) =>
      api.decideApproval(caseId, approvalId, decision, approver),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["approvals"] });
      void client.invalidateQueries({ queryKey: ["investigations"] });
    },
  });
}

/** Start (or force-restart) one investigation and return its answer. */
export function useStartInvestigation() {
  const client = useQueryClient();
  return useMutation<unknown, ApiProblem, { caseId: string; force?: boolean }>({
    mutationFn: ({ caseId, force }) => api.startInvestigation(caseId, force),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["cases"] });
      void client.invalidateQueries({ queryKey: ["investigations"] });
      void client.invalidateQueries({ queryKey: ["canvas"] });
      void client.invalidateQueries({ queryKey: ["risk"] });
      void client.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useAsk() {
  return useMutation<AnalystAnswer, ApiProblem, { caseId: string; question: string }>({
    mutationFn: ({ caseId, question }) => api.ask(caseId, question),
  });
}

/** Run the full 20-case benchmark (may take a while; real work in demo too). */
export function useRunAll() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.runAll(),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["cases"] });
      void client.invalidateQueries({ queryKey: ["investigations"] });
      void client.invalidateQueries({ queryKey: ["benchmark"] });
    },
  });
}

export function useBenchmark() {
  return useQuery({ queryKey: ["benchmark"], queryFn: () => api.benchmark() });
}

/** A stable callback that copies text and reports whether it worked. */
export function useCopy(): [boolean, (text: string) => void] {
  // Thin wrapper over the browser clipboard for the panel's copy affordance;
  // kept here so components share one copy implementation.
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => setCopied(false),
    );
  }, []);
  return [copied, copy];
}
