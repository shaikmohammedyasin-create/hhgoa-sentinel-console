# Attribution draft — upstream Sentinel v2 console (Team CollabUp)

The console under `sentinel-ui/` is derived from the "Sentinel v2" analyst
console by Team CollabUp (Hacker House Goa 2026,
`https://github.com/r-rishit27/hacker_house` @ commit `7bcea03`). The upstream
repository carries **no LICENSE file**, so two prepared variants are recorded
here. **Neither has been applied to `LICENSE` or `NOTICE.md` yet** — the
repository owner must decide which applies before publishing.

## Variant A — permission granted (preferred if upstream confirms)

If Team CollabUp grants permission (in writing, or via an added LICENSE to the
upstream repository), apply this variant:

- Add `sentinel-ui/NOTICE.md` line: "Console is derived from Sentinel v2 by
  Team CollabUp; used with permission. Upstream license: MIT (or as stated)."
- `LICENSE` remains MIT, Copyright 2026 Mohammed Yasin Shaik, and a new line
  states: "Portions of `sentinel-ui/` are derived from Sentinel v2 by Team
  CollabUp, used with permission."
- Update `docs/UI_PROVENANCE.md` to mark the fork as permission-granted.

## Variant B — permission not granted (current, conservative position)

If no permission is granted (upstream remains unlicensed), apply this variant:

- Keep `sentinel-ui/NOTICE.md` as-is: attribution without ownership claim.
- `LICENSE` remains MIT, Copyright 2026 Mohammed Yasin Shaik, with explicit
  exclusion: "This MIT license does NOT extend to `sentinel-ui/`, which
  contains material derived from an unlicensed upstream work by Team CollabUp."
- Consider shipping the FastAPI `/docs` surface instead of the console, or
  rewriting the console from scratch, before any public release.
- `docs/UI_PROVENANCE.md` already lists file-level provenance.

## Decision pending
Owner (Mohammed Yasin Shaik) to choose Variant A or B before submission.
