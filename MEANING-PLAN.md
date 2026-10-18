# MEANING-PLAN — the grand plan for meaning, memory, dreaming and forgetting

Written 2026-10-16, after commit `64625d39` (meaning framework in shadow). Nothing below is run unless marked **landed**.

## 0. The one sentence

The ledger keeps what changed and mattered. Impressions are what the reader absorbed from it. Dreaming turns
events into impressions and lets impressions fade. Shadow keeps every impression from becoming testimony. Git keeps the bytes.

| Layer | What it is | Where | Can it testify? |
|---|---|---|---|
| Bytes | what the files are | git, the files, `<agent>.turns.md` | yes, by address |
| Weft (events) | what the changes **meant**, DMD-gated | `<task>/weft.jsonl` + the packed `seg-*.bin` | yes, re-expands to bytes |
| Cloth | the hologram projected at a cursor | `clothAt(weft, {asOf})` | only what it cites |
| Impressions (vasana) | priors the reader absorbed | holographs, projected from MeaningDelta rows | **never**, they condition only |
| Shadow | measured, logged, injected nowhere | flags default 0 | n/a |

## 1. Laws (each one a test, never a sentence in a prompt)

1. **One store.** Every meaning row is a line in `weft.jsonl`. Every view (stakes, holograph, cloth, rank) is a fold of it.
2. **DMD at the write boundary.** A restatement or a repeat is not appended. Append-only does not mean record every edit.
3. **Weft-lean envelope.** Rows carry `a l g w ws s ins seg con eva` so `asPass`/`clothAt` read them unchanged; audit numbers ride in `m`.
4. **Bytes are referenced, never copied.** A row keys to `git: {commit, file, span}`; `expand()` reads them back.
5. **Forgetting is a projection, never a delete.** Old generations are frozen and fingerprinted; the cloth drops them; the rows stay.
6. **Impressions never testify.** A holograph orders and thresholds; it never becomes a claim, a number in a prompt, or evidence.
7. **Register gate.** Witnessed (the box judged it) and said (an agent reported it) never mix.
8. **Nothing optimizes against the delta.** No reward, no training use, no joy metric. Audited on a schedule for drift into an implicit spec.

## 2. Where we stand

**Landed (`64625d39`, shadow, all suites green one at a time):** `opencode-ledger` (incremental fold, DMD gate,
weft-lean envelope, cloth) · `opencode-delta` (KL delta, register gate, plural readers, re-zero) · `opencode-pathos`
(measured curve; collapse fires only when measured) · `opencode-stakes` (CONTEST never supersedes) · `opencode-ethos`
(C1–C3 with mutation checks, C4 a disclosed gap) · surf `delta` arm · `blocksToOperations`.

**Known gaps:** the combined `node --test` run hangs · surf delta arm is not wired (no block→turn link) · `LOG.jsonl`
and `EOT.md` are still separate stores · no dream pass reads the ledger · nothing calls `rezero` · no falsifier has run on real data ·
`UPSTREAM.md` still lists the retired fold event.

## 3. Phases

Each phase ends with its tests green and a commit. Each phase can be stopped after without breaking the one before.

### Phase A — make the ground trustworthy (small, first)
- A1. Find why the combined test run hangs (shared `FOLD_WORKNOTES_DIR` across files is the first suspect); fix or isolate per file.
- A2. Fix `UPSTREAM.md` (fold event retired); confirm whether `fold.ts` still sends it.
- A3. Confirm the janus sibling is present for `opencode-standing.mjs`; check `docs/THE-HOLOGRAPH.md` against `bayes-surprise.js`.
- **Done when:** one command runs every opencode suite green.

### Phase B — one ledger, really
- B1. Write-through: `admit()` appends its VoidLog row and its EOT block to `weft.jsonl` as lean rows (op ADMIT/REC, `con` to the superseded block).
- B2. `LOG.jsonl` and `EOT.md` become **projections** of `weft.jsonl` (rendered on demand), kept on disk for one release as read-compat.
- B3. Migration script: fold existing `LOG.jsonl` + `EOT.md` into `weft.jsonl` once, idempotent by content address.
- B4. Pack: when `weft.jsonl` passes a size bound, roll its lean rows into a `seg-*.bin` via `weft-store` (the jsonl stays the readable twin of the tail).
- B5. Git keying: the doorway fills `git: {commit, file, span}` from the workspace on admit; `expand()` test re-reads the span.
- **Falsifier:** replay of every existing task's `LOG.jsonl` + `EOT.md` through B3 gives the same `fold()` and `reconcile()` answers.

### Phase C — dreaming (events → impressions, and fading)
Read the dream commits first (`24fcbeab`, `88755332`); reuse, do not re-derive.
- C1. `opencode-dream.mjs` over the ledger, run at sleep (the door's idle timer), never on the hot path.
- C2. **Recurrence → promotion.** A referent's meaning that recurs across ≥k witnessed rows without contradiction is promoted to a Stake@1 row, `promotedBy: recurrence:k`, `by: "dream"`. Promotion is a proposal until the person confirms (a dream never speaks for the person).
- C3. **Discrepancy → surfaced.** Open forks and unresolved CONTESTs are named in the next turn's mechanical note, batched at turn end.
- C4. **Fading.** Per reader, gamma is declared; dream re-derives holographs at sleep so decay is a fold, not hidden state.
- C5. **Re-zero.** Pathos concession → `rezero()` call (wired); surfeit (a slot censored-above over a declared window) → `rezero()`.
- C6. **Cloth retirement.** A referent whose last row is older than a declared horizon and touches no stake drops out of `clothAt` by default; `asOf` and an explicit drill still see it.
- **Falsifiers:** (a) a forgotten referent re-opened by a new row is back in the cloth with its history; (b) nothing in `weft.jsonl` is ever deleted by a dream (byte length is monotone); (c) promotion never fires on said-register rows alone.

### Phase D — impressions as auditable objects (only if wanted)
- D1. `impressionOf(task, reader)` → a projection naming each slot's mode and how settled it is, **for the audit view only**.
- D2. Shadow test: no impression field ever reaches a model-facing note (grep the note builders, plus a firewall test).
- D3. Reader pockets: decide the Zenodotus pockets for the code, legal and news readers (open decision 2); load them as foreign priors (predict only).

### Phase E — wire the surf arm and run the experiment
- E1. Link block → turn: the doorway records the session turn on each admit (`turn` in the lean row's `clause`).
- E2. `onSurf` passes `rank` from `rankOf()` when `FOLD_SURF_MODE=delta`.
- E3. The real falsifier: planted fact at ≥50 turns on recorded sessions; ladder vs pointer vs delta. Report recovery per arm with the raw counts.
- **Kill criterion:** if delta-ordered keep does not beat pointer-only, delta mode is removed (the measurement stays).

### Phase F — the four falsifiers from the spec, on real data
1. Delta-ordered keep vs ladder/pointer at ≥50 turns (E3).
2. Noise vs real supersede: a corpus of real noise blocks (formatting, churn) against real supersedes; KL must rank supersedes higher, surprisal is reported beside it.
3. Sclerosis: rows *about* the log must not lower later real deltas beyond the declared decay. Test with a stream salted with meta-rows.
4. Ethos false positives: a set of witnessed, public-record, official-capacity claims; the closure check must pass them above a declared bar before any rule leaves shadow.

### Phase G — leaving shadow, one flag at a time
Order: STAKES (CONTEST surfaced to the person) → PATHOS (mechanical note only) → DELTA (ordering only) → ETHOS (last; needs F4).
Each flag flips only with: its falsifier green on real data, an A/B on cost and coverage like FOLD_ARCHONS, and the person's go-ahead.

## 4. Decisions only you can make
1. Experiencer: the person alone (my lean) or the person plus the agent as witness.
2. Zenodotus pockets for the code, legal and news readers.
3. Slots for code: the four now (kind, relation, verdict, wasGreen), or more.
4. Contest events: batch at turn end (my lean) or surface immediately.
5. C4: is there a mechanical form?
6. Dream promotion: does the person confirm every promotion, or only promotions about them (`about:user:*`)?
7. Retirement horizon for the cloth (C6): turns, days, or "untouched since the last conceded ground".

## 5. Order and size

A (hours) → B (the big one: days, guarded by its replay falsifier) → C (days) → E (a day) → F (needs recorded data) → G (per flag).
D waits until someone wants to look at impressions directly.
