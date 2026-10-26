# Sentinel Console — upstream attribution

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

- `src/lib/hhgoa.ts` — hand-typed contract mirroring the real backend
- `src/lib/api.ts` — same-origin fetch client, no role headers
- `src/lib/hooks.ts` — TanStack Query hooks over the HHGOA endpoints
- `src/lib/providers.tsx` — QueryClient without RoleProvider
- `src/components/console/*` — all console views rebuilt on `hhgoa.ts` types
- `next.config.ts` — optional `NEXT_PUBLIC_API_PROXY_TARGET` rewrite;
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

---

> **Attribution & Licence.** The console in `sentinel-ui/` is derived from the "Sentinel v2" analyst console by Team CollabUp (Hacker House Goa 2026, `https://github.com/r-rishit27/hacker_house` @ `7bcea03`). This repository does not claim ownership, permission, or a license for upstream-derived material; the upstream repository carries no LICENSE file. Attribution is provided in good faith. This project's original code (backend, agents, GraphRAG engine, Bayesian scorer, contracts, and rewritten UI data layers) remains MIT (`LICENSE`, Copyright 2026 Mohammed Yasin Shaik). See [`docs/UI_PROVENANCE.md`](../docs/UI_PROVENANCE.md) for file-level provenance.
