# Step 30 — REAL-OUTCOME stance test: DECLARED-OPEN on the legislative archive

*Verified feasibility record, 2026-10-11. Status: blocked on DATA ARCHITECTURE,
not on the method.*

The earned stance-usefulness protocol (step 29: each stance forecasts its own
held-out future texture) was to be re-run against a REAL consequence — an
actual contract/vote outcome — instead of textual recurrence. The target data
was the Nashville Legistar / ePAV archive
(`nashville-legistar-archive/data`). Direct measurement of the spokes says the
arena cannot run yet:

| Material | Measured | Consequence for the stance test |
| --- | --- | --- |
| `page-sightings.jsonl` | 4,470 rows; **7 distinct attachment ids**, each in **1 matter** (multi-occasion = 0) | no entity×matter participation spine |
| `referents.jsonl` | 583 attachment-reads; 575 with `contract_number` | 430 ePAV tokens each attend **exactly 1 matter** (multi-occasion = 0) |
| `contract-ledger.jsonl` | 7,803 rows; 56 distinct contract numbers | the outcome exists (56 contracts) but has no per-entity temporal join |
| dates | `intro_date` on sightings | temporal spine exists at matter level |

Why it matters, in the battery's own terms: steps 12, 15 and this probe are the
same shape — a falsifier is DECLARED-OPEN because the material lacks the
required multi-occasion structure, never because the method flinched. This is
"empirical identifiability not established on this ground," stated precisely
with numbers, not a failure of the stances.

## The build that would un-block it (named, not guessed)

1. Extract entities across the archived attachments (the reader that produced
   `assertions.jsonl`, run over the 4,470 sightings / 57 contracts), yielding
   entity × matter × date participation with provenance.
2. Join to the ePAV contract ledger for the real outcome (awarded / not).
3. Re-run the step-29 protocol **unmodified** — each stance must forecast its
   own outcome texture (arrangement-shift, boundary-ownership, context-shift
   of CONTRACTS) beyond count, peers, and a shuffled null.

Only then does a stance's usefulness meet "a world that cares."