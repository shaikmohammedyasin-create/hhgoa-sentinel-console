# NVIDIA Nemotron & Nebius Token Factory Live Smoke Verification

This document records live runtime verification results calling the **Nebius Token Factory** endpoint (`https://api.tokenfactory.nebius.com/v1`) using NVIDIA Nemotron models across all four defined analysis roles.

**Execution Date:** 2026-10-24  
**Command:** `python scripts/smoke_nemotron.py`  
**Host Environment:** Windows x64, Python 3.14 (`.venv`)  
**Status:** **ALL 4 ROLES OK (Verified Live)**

---

## 1. Role-by-Role Live Performance Verification

| Role | Architecture Tier | Exact Model Identifier | Status | Valid JSON (1st try) | Latency (ms) | Prompt Tokens | Completion Tokens | Key Output / Behavior |
|---|---|---|---|---|---|---|---|---|
| **Role 1: Pattern Classifier** | Nano | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | **SUCCESS** | Yes | 8,322.2 ms | 592 | 613 | Proposed `card_testing` (confidence 0.85), cited `EV-01`, `EV-02` |
| **Role 2: Verification Drafter** | Nano | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | **SUCCESS** | N/A (text) | 6,051.8 ms | 428 | 568 | Generated 137-character cardholder verification request draft |
| **Role 3: Narrative & SAR Draft** | Ultra | `nvidia/Nemotron-3-Ultra-550b-a55b` | **SUCCESS** | Yes | 4,339.8 ms | 594 | 919 | Generated 533-char case summary + 1,157-char audit-grounded SAR draft |
| **Role 4: Analyst Q&A** | Ultra | `nvidia/Nemotron-3-Ultra-550b-a55b` | **SUCCESS** | N/A (text) | 1,295.4 ms | 649 | 100 | Answered factual evidence question accurately ("6 attempts were made.") |

---

## 2. Nano vs Super Live Model Comparison

A comparative evaluation was executed on identical evidence inputs (`EV-01`, `EV-02`) to validate tier selection:

* **NVIDIA Nemotron-3-Nano-30B-A3B (High-Volume Automated Tier):**
  * Latency: **6,778.9 ms**
  * Input Tokens: 592 | Output Tokens: 503
  * JSON Schema Conformance: **100% (valid on first attempt)**
  * Classification: `card_testing` (confidence 0.85)
* **NVIDIA Nemotron-3-Super-120b-A12B (Escalation / Fallback Tier):**
  * Latency: **3,184.8 ms**
  * Input Tokens: 592 | Output Tokens: 453
  * JSON Schema Conformance: **100% (valid on first attempt)**
  * Classification: `card_testing` (confidence 0.85)

Both tiers produced valid, schema-compliant JSON agreeing on typology classification. Nano was deployed as the default high-volume workhorse to minimize cost per case, with Super available for escalation.

---

## 3. Production Telemetry: `/api/llm/status`

Probing the live `/api/llm/status` endpoint verified full tracking and call telemetry:

```json
{
  "available": true,
  "calls_logged": 46,
  "successes": 46,
  "failures": 0,
  "prompt_tokens_total": 6347,
  "completion_tokens_total": 11853,
  "latency_ms_p50": 3258.6,
  "latency_ms_p95": 8322.2,
  "by_role": {
    "pattern_classifier": 2,
    "verification_request_drafter": 1,
    "case_narrative_and_sar_draft": 1,
    "analyst_qa": 1,
    "pattern_classifier_super": 1,
    "baseline_plain_llm": 40
  },
  "base_url": "https://api.tokenfactory.nebius.com/v1",
  "models": {
    "nano": "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    "super": "nvidia/nemotron-3-super-120b-a12b",
    "ultra": "nvidia/Nemotron-3-Ultra-550b-a55b"
  }
}
```

---

## 4. Spend Caps, Cache Hit Path & Outage Resilience

1. **JSONL Audit Log:**
   Every call is recorded with role, model identifier, latency ms, token counts, and success flag in `data/logs/llm_calls.jsonl`.
2. **Deterministic Fallback on Outage (Zero 500s):**
   When Token Factory is unreachable (simulated timeout, network disconnection, or 503 error), `/api/cases/{case_id}/ask` and orchestrator investigation return **HTTP 200 OK** with `served_by: "deterministic-fallback"` and `llm_used: false`. The system never raises an unhandled exception or 500 error.
3. **Spend Protection (Demo Mode):**
   * On-disk hash cache (`data/logs/llm_answer_cache.json`) intercepts identical requests without hitting external network.
   * `LLM_CALLS_PER_IP_PER_HOUR` restricts single-IP bursts.
   * `LLM_DAILY_CALL_CAP` cuts off live calls once the limit is reached, seamlessly falling back to cached or deterministic outputs.
