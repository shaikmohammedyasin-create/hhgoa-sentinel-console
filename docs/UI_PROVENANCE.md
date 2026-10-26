# UI Provenance & Upstream Audit Log (`sentinel-ui`)

This document records the exact provenance, git history, and code attribution of the Next.js analyst console located in `sentinel-ui/`.

---

## 1. Upstream Origin & Notice

The `sentinel-ui/` directory originated as a fork of the "Sentinel v2" analyst console created by **Team CollabUp** at Hacker House Goa 2026.

### Repository Metadata:
- **Source Repository**: `https://github.com/r-rishit27/hacker_house`
- **Source Branch & Commit**: `sentinel-v2`, commit `7bcea03` (shallow clone, 2026-09-24)
- **Vendored Commit into this Repo**: `fe56ea9` (2026-10-21)
- **Upstream License**: **No LICENSE file exists in the upstream repository.**
- **Legal Posture & Attribution**: Attribution is maintained in good faith in `sentinel-ui/NOTICE.md`. This repository does not claim ownership, permission, or a license for upstream-derived material; the upstream repository carries no LICENSE file. The derived console remains the canonical shipped interface by project design, and this project's own code (backend, agents, GraphRAG engine, Bayesian scorer, contracts, and rewritten UI data layers) is MIT (`LICENSE`, Copyright 2026 Mohammed Yasin Shaik). Files that are unchanged upstream are listed in §4(A).

---

## 2. Git Commit Log for `sentinel-ui/`

Chronological history of changes committed to `sentinel-ui/` in this repository:

```
fe56ea9 2026-10-21 imohammedyasin05: feat: vendor Sentinel v2 analyst console as sentinel-ui (upstream r-rishit27/hacker_house@7bcea03, no LICENSE)
02d4e04 2026-10-21 imohammedyasin05: chore: add deploy surfaces (render.yaml, Dockerfile, CI, Vercel proxy) and same-origin sentinel-ui API resolution
ba1e887 2026-10-23 imohammedyasin05: feat: wire sentinel-ui data layer to the HHGOA backend
f3dbe0b 2026-10-23 imohammedyasin05: chore: retire the dead upstream UI surface
81ab4f2 2026-10-23 imohammedyasin05: feat: rebuild the sentinel-ui console on the HHGOA contract
5305e6b 2026-10-23 imohammedyasin05: feat: single-URL demo container and benchmark disclosure
29a6dc9 2026-10-23 imohammedyasin05: chore: clean up NOTICE.md and remove all CollabUp URL references
63ad134 2026-10-23 imohammedyasin05: docs: mark DESIGN_SYSTEM.md as superseded by tokens.css
fd60457 2026-10-23 imohammedyasin05: fix: serve standalone UI static assets + favicon; proxy 404s cleanly
ea562e0 2026-10-24 imohammedyasin05: feat: serve the console from a recorded snapshot when no backend exists
bb9b64f 2026-10-24 imohammedyasin05: build(ui): replace the broken 'next lint' script with a real eslint gate
b47c06e 2026-10-24 imohammedyasin05: test(ui): rewrite the browser suite against the console that ships
82298ce 2026-10-24 imohammedyasin05: chore(docker): keep .env.local out of the image and survive a slow PyPI
32938fc 2026-10-24 imohammedyasin05: feat(submission): complete phases 0-6 submission hardening and verified evidence
```

---

## 3. Contents of `sentinel-ui/NOTICE.md`

```markdown
# Sentinel Console ? upstream attribution

The Sentinel console in this directory (`sentinel-ui/`) is a forked and
reworked copy of the "Sentinel v2" analyst console by Team CollabUp
(Hacker House Goa 2026), originally at:

- Source: `https://github.com/r-rishit27/hacker_house` (branch `sentinel-v2`,
  commit `7bcea03`, shallow clone, 2026-09-24)
- **No LICENSE file exists in the upstream repository.** The upstream authors
  retain all rights by default. Attribution is provided here in good faith.

## What has changed since the fork

This copy is no longer an unmodified vendored snapshot. The following have
been added or rewritten to wire the console to the **HHGOA FastAPI backend**
in this repo (not the upstream Sentinel v2 API):

- `src/lib/hhgoa.ts` ? hand-typed contract mirroring the real backend
- `src/lib/api.ts` ? same-origin fetch client, no role headers
- `src/lib/hooks.ts` ? TanStack Query hooks over the HHGOA endpoints
- `src/lib/providers.tsx` ? QueryClient without RoleProvider
- `src/components/console/*` ? all console views rebuilt on `hhgoa.ts` types
- `next.config.ts` ? optional `NEXT_PUBLIC_API_PROXY_TARGET` rewrite;
  same-origin default so the single-URL demo co-hosts UI and backend

Dead upstream surface removed: `generated/contract.ts`, `lib/role.tsx`,
`lib/replay.ts`, `lib/format.ts`, `components/ui/*`, `shell/RoleSwitcher.tsx`.

## Run

```bash
cd sentinel-ui
npm install
# Default: same-origin (the single-URL demo container)
npm run dev

# Local dev with backend on port 8000:
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 npm run dev
```

This app talks to the HHGOA backend in this repo. It does not call the
upstream team's deployed API.
```

---

## 4. File-by-File Classification: Upstream vs Locally Written

### (A) Unchanged Upstream Files (9 Files)
These files remain byte-for-byte or functionally identical to the upstream fork:
1. `sentinel-ui/src/app/globals.css` ? Global typography and scrollbar styles.
2. `sentinel-ui/src/app/tokens.css` ? Warm cream and dark forest color variables.
3. `sentinel-ui/src/components/console/icons.tsx` ? Feather/Lucide inline SVG icon set.
4. `sentinel-ui/src/components/console/parts.tsx` ? Minor UI chips and format helpers.
5. `sentinel-ui/src/components/shell/AppShell.tsx` ? Main page wrapper layout.
6. `sentinel-ui/src/lib/cn.ts` ? Standard `clsx` and `tailwind-merge` utility.
7. `sentinel-ui/tailwind.config.ts` ? Tailwind configuration for CSS tokens.
8. `sentinel-ui/tsconfig.json` ? TypeScript compiler configuration.
9. `sentinel-ui/next-env.d.ts` ? Next.js environment declaration.

### (B) New Files Written Locally (6 Files + 21 Snapshots)
These files were created from scratch for Sentinel Graph and do not exist upstream:
1. `sentinel-ui/src/lib/hhgoa.ts` ? Pydantic-mirrored TypeScript types for the HHGOA backend contract (Case, Evidence, NemotronBlock, SarOut, QueueRow, AuditEvent).
2. `sentinel-ui/src/lib/demo.ts` ? Offline fallback harness for zero-backend operation.
3. `sentinel-ui/e2e/smoke.mjs` ? Comprehensive 32-check Playwright E2E smoke test suite with multi-browser resolution.
4. `sentinel-ui/eslint.config.mjs` ? Standalone ESLint 9 configuration enforcing zero warnings.
5. `sentinel-ui/public/favicon.svg` ? Custom project favicon.
6. `sentinel-ui/public/demo/*.json` ? 20 precomputed case snapshots exported from verified backend runs.

### (C) Heavily Rewritten Files
Files originally present upstream that were gutted and rewritten to interface with the HHGOA backend:
1. `sentinel-ui/src/lib/api.ts` ? Replaced upstream REST client with clean fetch client targeting `/api/*` and `/investigations/*`.
2. `sentinel-ui/src/lib/hooks.ts` ? Replaced upstream mock hooks with TanStack Query hooks wired to `hhgoa.ts`.
3. `sentinel-ui/src/components/console/CasePanel.tsx` ? Rewritten to display the 5 tabs (`timeline`, `file`, `sar`, `nemotron`, `json`), evidence ledger provenance, Bayesian $P(\text{fraud})$ dial, and the interactive Analyst Q&A box.
4. `sentinel-ui/src/components/console/GraphCanvasView.tsx` ? Rewired to render the dynamic case subgraph returned by the HHGOA graph query router.
5. `sentinel-ui/src/components/console/ApprovalsDrawer.tsx` ? Rewired to manage pending and approved actions with explicit authenticated analyst sign-off.
6. `sentinel-ui/src/components/console/QueueRail.tsx` ? Rewritten to rank cases by *exposure $\times$ uncertainty*.

### (D) Deleted Upstream Dead Code (19 Files Removed)
The following dead or irrelevant upstream mock files were purged:
- `src/lib/generated/contract.ts` (upstream hypothetical contract)
- `src/lib/role.tsx` & `src/components/shell/RoleSwitcher.tsx` (mock role switcher)
- `src/lib/replay.ts` & `src/lib/format.ts` (dead replay utilities)
- `src/app/showcase/page.tsx` (mock design showcase)
- `src/components/ui/*` (14 unused mock atomic components)
