# Benchmark

## What this page says

Two numbers, and what they mean.

---

## Precomputed demo answers (this repo)

The 20 committed answer files in `cases/*.json` — the ones the demo mode serves
when no live backend run is available — score against
`cases/ground_truth.json`:

> **Verdict accuracy 100% (20/20). Pattern accuracy 100% (20/20).**

These are the precomputed engine answers. The deterministic policy engine and
the committed answer files were validated together; the files carry the full
Nemotron advisory block so the UI can show the propose/decide split.
They are what the free demo container serves without an API key.

**Run it yourself:** `python scripts/compare_baselines.py`
(reports both numbers against `ground_truth.json` and writes
`artifacts/compare_baselines.json`).

---

## Live Nemotron-on-LLM run (original dataset, not redistributed)

On the original review round's real dataset (which is not included in this
repo), the live path through NVIDIA Nemotron via Nebius Token Factory
scored:

> **Verdict accuracy 60% (12/20). Pattern accuracy 85% (17/20).**

These are the live-LLM numbers. They are lower than the precomputed demo
answers, and the two are **not** measured on the same cases, so the gap is not
a controlled comparison. Two things contribute:

1. The live run is the model *proposing* a pattern; the deterministic engine
   *decides*. Where the model's proposal disagreed with the engine, the engine
   is what the committed answers record — this is the "propose/decide" split
   the system is built to demonstrate, and it is why the engine output (not the
   model output) is the accuracy target.
2. The original dataset is not the redistributed synthetic case pack; its case
   mix and difficulty differ, and that is not something this repository can
   quantify without the dataset.

**To reproduce these numbers:** run `scripts/eval_heldout.py` with
`NEBIUS_API_KEY` set. Without the key, parts C and D (plain-LLM baseline and
model/engine ablation) report `"NEBIUS_API_KEY not set"`.

---

## Risk-threshold baseline

For reference: a risk-score-threshold sweep across the 20 case-pack cases,
thresholds 0.30–0.75, best F1 = **1.0 at threshold 0.70** (on this synthetic
pack the bank risk score is the dominant signal). This is not a substitute
for the full pipeline — it is a floor that the graph evidence layer must beat
on the original dataset.

---

## Cost and latency (from the JSONL call log)

After a live run, `scripts/eval_heldout.py` part E prints the call-log
summary: number of successful calls, p50/p95 latency, total prompt and
completion tokens. These numbers are only meaningful after a live run with
`NEBIUS_API_KEY` set; in demo mode (no key) the log is empty.

---

## Demo mode disclosure

When running the demo container without an API key:

- `DEMO_MODE=1` (default): Nemotron answers are replayed from the committed
  answer files. Zero LLM calls. The numbers in "Precomputed demo answers"
  above are what a judge sees.
- `DEMO_MODE=0` + `NEBIUS_API_KEY`: the live LLM path runs. The numbers in
  "Live Nemotron-on-LLM run" above are what a live run will approximate on
  this synthetic pack.

The per-role `model_usage` block in each answer file records `prompt_tokens`,
`completion_tokens`, and (when the run was live) `model`, `latency_ms`, and
`cached` — the fields the case panel's footer renders.
