# Live walkthrough

A five-minute path through the console that fits in one browser tab and
assumes nothing about the viewer.

---

## Before you start

Two ways to be looking at the same thing:

**A. Hosted snapshot (no install, no key).** Open the Vercel URL. The masthead
reads `static snapshot · recorded run`. Everything on screen is a replay of a
real recorded run over the 20-case pack — see `docs/DEPLOY.md` for how it is
built. What it cannot do: execute a fresh run, or answer an analyst question
with a model. It says so where it matters instead of pretending.

**B. Full backend (Docker).**

```bash
docker compose up --build
# open http://localhost:8008
```

The console, the API, and the policy engine run in one container. No
`NEBIUS_API_KEY` is needed: opening a case serves its committed answer file
`cases/<id>.json`. The masthead reads `demo mode · committed cases`, and
`nemotron unavailable` appears next to it when no key is configured.

If you want live Nemotron calls for the demo, set `NEBIUS_API_KEY` and
`DEMO_MODE=0` in `docker-compose.yml` (cost guards stay on: 20 calls per IP
per hour, 200 calls per day, then deterministic-only).

The cloud TigerGraph instance is optional in both modes. `GRAPH_BACKEND=local`
runs the same traversal logic against the bundled SQLite store, which is what
the container does.

---

## The screen, in one breath

Three panes, one screen, no page navigation:

- **Left — the case queue.** All 20 cases, ordered by *exposure − uncertainty*,
  so the biggest unresolved risk sits at the top. Each row carries the verdict
  and P(fraud) once a case has run.
- **Centre — the open case.** Header (id, verdict chip, pattern, dial), five
  tabs, and the footer's route into the subgraph.
- **Bottom — the view switcher.** `queue · case · graph · pack · ring`, plus
  `inbox`, `pack` and `demo` in the masthead.

The five tabs are ordered by how much interpretation each carries, least
first — a viewer who distrusts the prose can walk right and end at raw JSON:

| Tab | What it is |
|---|---|
| **Timeline** | The backend's audit trail: one row per event, with state transition, actor, timestamp. |
| **Case file** | The conclusion (verdict, P(fraud), pattern, exposure, connected cards, affected txns) and the evidence ledger behind it — every claim with its source and reference. |
| **SAR** | The filed narrative, subjects, total, activity dates, and the reason it was or was not filed. |
| **Nemotron** | The advisory block split in two: what the model proposed, and what the policy engine decided. When they disagree, the disagreement is printed. |
| **JSON** | `answer.json`, verbatim, copyable. |

---

## 3–5 minute flow

### 0:00 — Orientation

> "This is a fraud investigation console. The queue on the left is the bank's
> unresolved case pack, ranked by exposure weighted by uncertainty — not by
> date. The number next to each case is the probability the agent concluded.
> The masthead says where the data comes from, because a demo that hides its
> own provenance is a liability."

Point at the masthead label. In snapshot mode it says so.

### 0:45 — Open a case, read the conclusion

Click the top row. The first case opens automatically on arrival, so there is
always something on screen.

> "Every case ends in a decision: fraud or legitimate, a pattern, a probability
> with the uncertainty that produced it, and the exposure at stake. The dial is
> the agent's confidence — not a decoration."

Switch to **Case file**. Point at the evidence ledger.

> "Each claim below is sourced and referenced: `graph`, `memory`, `policy`,
> `txn`. If a claim has no reference, it does not belong on this screen."

### 1:30 — Show the audit trail

**Timeline**.

> "This is the backend's audit log, not a reconstruction. State transitions,
> who acted, when. The same rows are what an auditor would pull."

### 2:00 — The governed split

**Nemotron**.

> "The model proposes; the policy engine decides. Both are on screen. When
> Nemotron's pattern disagrees with the deterministic decision, the
> disagreement is shown with its reason rather than smoothed over. The model
> never gets the last word on money movement."

### 2:30 — The subgraph

Click `graph →` in the case footer, or `graph` in the bottom switcher.

> "The case subgraph is the evidence as a graph — card, customer, device,
> transactions, prior cases. Nodes the answer accuses are marked; the focus
> ring is the entity the conclusion turns on."

### 3:00 — The pack, scored

`pack` in the bottom switcher (or the masthead).

> "All 20 cases in one table: verdict, probability, pattern, SAR, evidence
> count, tool calls, latency. In the snapshot build a banner says these numbers
> were measured on a keyed run and are being replayed — the page's own response
> times are not the engine's."

The numbers to quote, and their provenance:

- 20/20 cases completed, 0 failed, 457 s wall clock, 12.02–35.28 s per case.
- 20/20 verdict and 20/20 pattern against `cases/ground_truth.json`
  (tp 15, fp 0, tn 5, fn 0), 600/600 evidence checkpoints.
- Reproduce: `python scripts/compare_baselines.py`, and
  `python -m backend.evaluation.validate_answers`.
- **State the caveat out loud** if asked about the model: the committed answer
  files are the deterministic-engine output and score 20/20; the live
  Nemotron-on-LLM path on the original (non-redistributed) dataset scored
  60% verdict / 85% pattern. `docs/BENCHMARK.md` prints both numbers and says
  which is which.

### 3:45 — What the console refuses to fake

`ring` in the bottom switcher.

> "Ring discovery — multi-card device rings across the pack — is a capability
> this API does not expose. The screen says exactly that instead of drawing a
> plausible network. An honest gap is worth more than a fabricated finding."

`inbox` in the masthead opens the approvals drawer: pending and decided
actions, each with the action, the case, and the reason it was gated, plus an
"Acting as" field so the decision is attributed to whoever is at the keyboard.

### 4:15 — The guided walk (optional)

The masthead's `demo` button runs three acts over the real queue, ten seconds
each: the strongest verdict in the pack, a case where the agent's conclusion
disagrees with the bank model, and the highest-exposure case still
uninvestigated. The acts are selected from what the queue actually says, so a
re-run does not break them. `stop` returns control.

---

## Questions to expect, and straight answers

| Question | Answer |
|---|---|
| "Is this live AI right now?" | On the hosted URL, no — it is a recorded replay, labelled as such. In Docker with a key and `DEMO_MODE=0`, yes; the Nemotron tab and the per-role token/latency footer show the calls. |
| "Where is the training data?" | There is none. The graph store is built from 12,235 synthetic transactions in `data/synthetic/`; no third-party or customer data is in the repository. |
| "Does the model decide?" | No. The policy engine produces the verdict and the actions; the model proposes a pattern and a rationale. The split is visible on the Nemotron tab. |
| "How do you know it works?" | 290 tests pass (9 skipped, each with a documented reason), 600/600 evidence checkpoints on the 20-case pack, and a 33-check browser suite that fails on any console error. |
| "What is not proven?" | The live Nemotron path against the original dataset is a recorded measurement, not reproducible here (the dataset is not redistributable). It scored 60%/85%, which is stated in `docs/BENCHMARK.md` rather than buried. |

---

## Do not do this mid-demo

- Do not edit `.env` or toggle `GRAPH_BACKEND` while the server is running.
- Do not present the snapshot's 20/20 as the LLM's accuracy. It is the
  deterministic engine's, and the LLM number is lower and printed.
- Do not claim a TigerGraph cloud run unless one is actually connected — the
  container is local by design and `/health` reports which backend answered.
