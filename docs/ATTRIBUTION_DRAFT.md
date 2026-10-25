# Attribution wording — two variants (NOT APPLIED)

Status: **drafted only.** Neither variant below has been applied to `README.md`,
`sentinel-ui/NOTICE.md` or `docs/UI_PROVENANCE.md`. Pick one **only after** the
upstream authors answer, then apply it in the places listed for that variant.

Context: `sentinel-ui/` is a forked and reworked copy of the "Sentinel v2"
analyst console by Team CollabUp (`https://github.com/r-rishit27/hacker_house`,
branch `sentinel-v2`, commit `7bcea03`). The upstream repository contains **no
LICENSE file**, so the upstream authors retain all rights by default. The
current README section states exactly that and claims nothing further.

---

## Variant A — permission granted

Apply this wording only if a written grant exists. Record the grant first
(issue/PR link, email, or a LICENSE file added by the upstream authors), then
replace the README "Attribution & Licence Status" section and the final
paragraph of `sentinel-ui/NOTICE.md` with:

> **Attribution & Licence.** The console in `sentinel-ui/` is derived from the
> "Sentinel v2" analyst console by Team CollabUp (Hacker House Goa 2026,
> `https://github.com/r-rishit27/hacker_house` @ `7bcea03`). The upstream authors
> granted written permission to fork, modify and redistribute this derivative as
> part of Sentinel Graph on **<DATE>** (record: **<LINK OR PATH>**), under the
> terms recorded there. The upstream repository carries no LICENSE file; this
> grant is the recorded permission, and this project's own code remains MIT
> (`LICENSE`, Copyright 2026 Mohammed Yasin Shaik). Files that are unchanged
> upstream are listed in `docs/UI_PROVENANCE.md` §4(A).

Also: add the granted licence text (or the grant record) under
`docs/upstream-permission/` and link it from `sentinel-ui/NOTICE.md`.

---

## Variant B — permission not granted (or no answer by the deadline)

Apply this wording if permission is refused, or if no written answer arrives by
the submission deadline. It must be paired with the code action below, so the
statement is true.

> **Attribution & Licence.** `sentinel-ui/` started from the "Sentinel v2"
> analyst console by Team CollabUp (Hacker House Goa 2026,
> `https://github.com/r-rishit27/hacker_house` @ `7bcea03`). The upstream
> repository carries no LICENSE file, and no written permission to redistribute
> it was obtained. To keep this submission's licensing unambiguous, the
> upstream-derived interface has been removed from the evaluated path: the
> console shipped for evaluation is the project's own implementation
> (`<PATH/BRANCH>`), and the upstream-derived files are retained only in the git
> history for provenance, or were removed (see `docs/UI_PROVENANCE.md` §4).
> This project's own code is MIT (`LICENSE`, Copyright 2026 Mohammed Yasin
> Shaik).

Required code action before applying Variant B: switch the deployed/demo UI to a
clean-room implementation (the `own-ui` branch is the intended vehicle — see
`docs/FALLBACK_PLAN.md`), remove or clearly quarantine the upstream-derived
files, and update `docs/UI_PROVENANCE.md` §4 accordingly. Do **not** apply the
wording while the forked console is still the shipped UI.

---

## Where to apply the chosen variant

1. `README.md` §15 "Attribution & Licence Status".
2. `sentinel-ui/NOTICE.md` final paragraph (and the "No LICENSE file" bullet).
3. `docs/UI_PROVENANCE.md` §1 "Legal Posture & Attribution" (replace the current
   `TODO` line).
4. `docs/FINAL_REPORT.md` §5 if it is regenerated after the decision.
