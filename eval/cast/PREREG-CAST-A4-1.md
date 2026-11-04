# PREREG-CAST-A4-1 — a patch to A4, not a new round

Supersedes nothing: PREREG-CAST-A4 (head `562e703`, sha256 `a45da065ac505e35ab3d6f7de529537fdaee1d9bbff51d594ee3c91dfbd86440`, code `29cfe25`) and its result (RESULT-CAST-A4.md) stand. This patch was asked for by the parent after a binder round found a malformed surface; no exam is claimed for it and none was run as a pass claim.

**Frozen code commit: `ef00e61`** (`git diff 29cfe25 ef00e61 -- native` touches only `native/organs/cast-identity.js` and `native/organs/cast-identity.test.mjs`; the commit after it adds `eval/cast/dev/badsurf.mjs` and this note). Option still opt-in and off by default; protected files, `read-process.mjs`, the binder and `package.json` unchanged.

## The defect

With `castIdentity: true`, the Sydney Harbour Bridge text (a spent exam text) had a being whose surface and `allSurfaces` entry was `Sydney Harbour Bridge'`; the base reader gives `Sydney Harbour Bridge`. Cause: the pass's tokenizer let an apostrophe end a token, so a closing quote (`'Sydney Harbour Bridge'`) became part of a name in RESCUE's closed-extension ("headed") rule, which built the unit `Sydney Harbour Bridge'` from the text slice. Mention spans were right (the matcher's boundaries do not include the quote); only the string was malformed.

## What changed (two structural rules, no list)

1. The tokenizer accepts an apostrophe only when a letter or digit follows it (`Bridge's`, `O'Brien` stay whole; `Bridge'` before a space or full stop does not take the mark).
2. Output guard: every being's surfaces (and the representative surface) lose leading and trailing marks (anything that is not a letter or digit) at the end of the pass, keeping the period of an abbreviation of this read; a surface that is empty after that is dropped, and a being left with no surface is dropped.

## Evidence

Unit test (`native/organs/cast-identity.test.mjs`, "a being's surfaces never end in a mark"): fails on `29cfe25`, passes now; 18 of 18 tests pass, which include R1 (the entry with the option absent or false is JSON-identical to base `15f82fcd` on the three fixtures). G1 passes (`eval/cast/cast-identity-gate.mjs`).

Count of beings with a surface or `allSurfaces` entry ending in a non-alphanumeric character (script `eval/cast/dev/badsurf.mjs`, real pipeline, `KHORA_PRIORS_DIR=$HOME/Downloads/workspace/janus/priors`): base 0 on every set. Option on, A4 code `29cfe25` → this patch:

| texts | beings (A4 → patch) | with such a surface (A4 → patch) |
|---|---|---|
| 23 census articles (dev) | 6597 → 6594 | 4 → 0 ("Archimedes'", "Great Church'", "Kievan Rus'", "Workers'") |
| 6 spent articles | 1751 → 1751 | 0 → 0 |
| 3 spent articles (Apollo 11, Mississippi, Cumberland) | 910 → 910 | 0 → 0 |
| Sydney Harbour Bridge | 320 → 318 | 1 → 0 |
| spent exam v1 (10 articles) | 2812 → 2811 | 0 → 0 |
| spent exam v2 (10 articles) | 1734 → 1733 | 2 → 0 ("Object D'", "Object PS'") |
| spent exam v3 (10 articles) | 2052 → 2053 | 2 → 0 ("Robbers'", "Knights'") |
| total | | 9 → 0 |

LAYER3, option on, the parent's scorer (`db15e251…`) and the parent's inventories, A4 code → patch (the same files the earlier rounds scored; the exams are spent and these runs claim nothing): exam v1 41/50 (0.82) → 41/50; exam v2 56/61 (0.918) → 56/61; exam v3 60/80 (0.75) → 60/80 (A4-ON.json's 60/80 reproduced). No drop.

## Preflight

`canon-check.mjs` on the clean tree at `93df357` (code identical to `ef00e61`): CANON-OK, exit 0, `dirty_files: 0`, hash `fb4d4016a024284ecb16879b53d006810307065f2c0d53ff808c1adff4bbab69`.
