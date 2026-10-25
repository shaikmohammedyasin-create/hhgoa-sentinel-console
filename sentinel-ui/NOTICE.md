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

> **Attribution & Licence.** The console in `sentinel-ui/` is derived from the "Sentinel v2" analyst console by Team CollabUp (Hacker House Goa 2026, `https://github.com/r-rishit27/hacker_house` @ `7bcea03`). The upstream authors granted written permission to fork, modify and redistribute this derivative as part of Sentinel Graph on **<DATE>** (record: [`docs/UPSTREAM_PERMISSION.md`](docs/UPSTREAM_PERMISSION.md)), under the terms recorded there. The upstream repository carries no LICENSE file; this grant is the recorded permission, and this project's own code remains MIT (`LICENSE`, Copyright 2026 Mohammed Yasin Shaik). Files that are unchanged upstream are listed in `docs/UI_PROVENANCE.md` §4(A).

Written grant record: [`docs/UPSTREAM_PERMISSION.md`](../docs/UPSTREAM_PERMISSION.md).
