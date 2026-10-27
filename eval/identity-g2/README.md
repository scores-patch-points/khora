# identity-g2 — the plain-arm scorers for prose-against-structured alignment (G2), frozen

Two scorers for the identity verdict `aligned | contradictory | undecided | refused` (frame: as-of, holder, purpose; pool), run with **rules and typed comparison, no model**, on the G2 pair set (`g2-pairs.json`, sha256 `062da61125fd232a58af0429b38a17303ec4c2f1e5ac53b7f7319baa8ffbdafc`, registration `1c64491a`, kept beside the ground in the workspace, not in this repo).

| file | what | sha256 |
|---|---|---|
| `g2-score.mjs` | A1: the strict identity verdict (entity, period, polarity); also `--selftest` | `986e438ae79094963f7ddbc7fd5680de240547939bdd0a84a02088f13757e174` |
| `g2-lib.mjs` | the A1 rules as an importable library (the text of `g2-score.mjs` before its self-test and scoring blocks) | `69f372e2894cd56c8a9168b127ffa455205d09a6663d4319c2538d534486d56f` |
| `g3-measure.mjs` | A3 = A1 + measure identity (concept and scope); `--selftest`, `--build`, `--score` | `7dff0e754992d34fe9a670485baa019bb3ec198b128290ab8bc04b9b89918d4e` |
| `g2m.json` | the fresh ground G2-M: 60 measure pairs (real sentence, real record of another concept) and 30 scope pairs (**fictional**: a cue inserted into a real sentence) | `686569fce04a83e9d9d9eb0dba50319757ba1c7ec4fc969c0e478ea798c2285d` |
| `g2-result.json`, `g3-result.json` | the single-pass outputs | |
| `g2-diag.mjs`, `g3-diag.mjs` | read-only post-hoc diagnostics; change no rule and no result | |

**These files are frozen by hash. Do not edit them to fix a path or a rule**: the hashes are the pre-registration (PIPELINE-LOG.md entries identity-11 to identity-14, identity-17, identity-18). Paths to `g2-pairs.json` and `EO-terminal/data/` are absolute (`/Users/mlacy/Downloads/workspace/...`) and are not portable; a portable version should be a new file with a new registration.

Run (from this folder): `node g2-score.mjs --selftest` (12 synthetic tests) and `node g3-measure.mjs --selftest` (12). `node g2-score.mjs <g2-pairs.json>` and `node g3-measure.mjs --score g2m.json` repeat the scoring passes; the first needs the pair set, which is **spent** for tuning and may only be used as a regression.

## What the numbers were (details in PIPELINE-LOG.md identity-14 and identity-18)

A1 on 391 G2 pairs: 0 false convictions on the 331 natural aligned pairs; 0 convictions on the 24 not_comparable pairs; **2 of 24 planted contradictions found** (conviction needs the prose's period known, and the plain period reader knew it for 54 of 331). A3 on G2-M: all 60 measure pairs refused as a different measure, 28 of 30 scope pairs refused; aligned recall on the natural pairs 326 -> 324 of 331 (three correct pairs wrongly excluded by regex attachment faults).

## Limits (read these before using any of it)

- **English-only.** Every list is English and financial: concept anchors, scope cues, month names, "ended", "compared to", loss/income polarity words, `\b` word boundaries (a hyphen counts as a boundary: "non-cash" was read as Cash). The ground is English earnings releases of three filers. There is no per-language rate and no non-text modality. **Not moderation-ready.**
- The pool in every pair is the single record given with it, so tie-breaking is not exercised. The cash-plus-investments subset-sum (`poolVerdict`) is tested on 3 synthetic pools only.
- The measure of the prose is read by regex from the label; the three false exclusions on natural pairs are reading faults.
- The scope class of G2-M is fictional by construction and tests machinery, not the world.
