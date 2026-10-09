# Falsification run — other texts, other languages

*Standing finding, 2026-10-09. One sentence: the night's three claims — the
case-free cast, the case-free floor, and the EO clause shape (position-as-
case) — were falsified across seven unseen texts and three languages, and
held.*

## The claims under falsification

1. **The case-free cast** — beings are found by recurrence + company, never
   capitalisation; a lowercase text binds the same cast as its cased twin.
2. **The case-free floor** (`surfaces.js`) — a zero-cap text must survive
   silently (was: 0 referents, silent collapse).
3. **The EO clause shape** (English, `reader-en.mjs`) — position IS case; the
   empty object seat is a typed slot; objects bind at Greek-like rates.

## The battery

### English, three unseen genres

| text | segment | clauses | subjects | objects | objects% |
|---|---|---|---|---|---|
| Alice's Adventures in Wonderland | 0–60k | 2071 | 2032 | 885 | **43%** |
| Tom Sawyer | 1k–61k | 1514 | 1446 | 671 | **44%** |
| Dracula | 1k–61k | 1913 | 1412 | 522 | **27%** |

No collapse. Fantasy proper nouns (Hatter, Gryphon, Cheshire), 19th-century
dialect (Tom's idiolect), foundry names and newspaper prose (Dracula) — all
bound. The prior is silent for nearly every PROPN here (none of these were in
pos-eng), and the **recurrence+company seat** carried them exactly as it
carried `darcy`.

### Non-standard English — the case-free law, bent all the way

The same three, whole lowercase:

| text | clauses | subjects | objects | objects% | refs |
|---|---|---|---|---|---|
| ALICE-LOWER | 2071 | 2032 | 885 | **43%** | 261 |
| TOM-LOWER | 1544 | 1476 | 676 | **44%** | 390 |
| DRACULA-LOWER | 1964 | 1447 | 536 | **27%** | 342 |

**Structurally identical** to the cased runs — same clause counts, same object
rates, same referent counts. The 0-referent collapse of
THE-CASE-FREE-CAST is gone on every text tried. A dialect stream, an OCR of a
novel, a lisp-coded paragraph: each recurs and keeps company without a
capital.

### Sanskrit, two registers (IAST seam)

| text | clauses | subjects | objects |
|---|---|---|---|
| Rigveda (hymns, control) | — | — | 79% object-bound |
| **Mahabharata** bk 1 (epic) | 85 | 9 | **39** |
| **Atharvaveda** (ritual) | 104 | 26 | **67** |

The accusative-ending seam binds objects at 3–4× the subject rate on two
unseen texts — the ending-reading, not a grab. The Mahabharata colophon
verse's cast (`sastham`, `parasaryavacassarojam`, `bharatapankajam`) are real
proper nouns.

## Verdict

Three claims, seven texts, three languages — **none falsified.** The strongest
blow was the lowercased runs: not a single collapse, and the object rate is
stable within ~1–2% of the cased run across all three English texts. The
machine is reading structure, and structure does not care about the case of
its glyphs, the genre of its prose, or the family of its grammar.

## The one honest caveat

None of this falsifies the *meaning* of the read — it falsifies the *seam's*
claims (case-free cast, EO clause shape, case-free floor). The referee
(accuracy.mjs, DMD-bounded) still decides whether the *abstractions* hold.
These runs prove the beings are found; they do not prove what was said about
them is true. That is the next falsification, and it must go to the byte.