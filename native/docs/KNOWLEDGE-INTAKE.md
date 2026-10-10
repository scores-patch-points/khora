# KNOWLEDGE-INTAKE: how a measurement becomes something the running system is held to

**Standing: nomination.** This document names how what the multilingual and competence work measured can become
knowledge the running reader and the reasoning organs consult, and how a hypothesis is kept from becoming law
because it was written down. It is checkable against the code and the record, and both win any disagreement with
it. Written 2026-10-06 at the user's direction: *"figure out how we turn all this into real knowledge for the
system"* and *"how it can be cross modally applicable, enhancing the logos of the system"*. It is design only. No
file in the tree was changed to write it, and nothing in it is a result.

**Revised 2026-10-06 after a panel review** (section "Amendments from review", at the end, lists every finding and
what became of it). The review found that the first draft's intake could launder a stale card as a fresh
measurement, that its level-2 gate trusted the instrument's own report, and that its pre-registration, split,
tamper-evidence and multiplicity rules were bypassable or tautological. I checked the ones I could against the tree
and they hold. The main consequence is stated once, here, so no later section can soften it: **today no existing card
can reach L2, so the first build records, discloses and restricts, and widens nothing.**

Every fact below that I did not read in the code myself is tagged. **[V]** = verified here, 2026-10-06, by reading
or running. **[S]** = reported by a read-only scout this session, not re-verified. **[U]** = stated by the user,
not re-run. **A number quoted from a card or a count is a reading of a live tree at a time**, given with the card's
sha256 prefix and modification time where it matters; it illustrates a defect and is **not a record**. The first
draft's German row was already out of date when the panel read it (section 1.3 says how).

## At a glance

- **The problem in one observation.** `/private/tmp/claude-501/competence/r3-eng-dev.json` was read by a scout
  earlier in this session as score 0.360, `pass: true`. Read again at 01:09, after it was rewritten at 01:02, it
  says score 0.4946, margin 0.0032, `pass: false` (sha256 prefix d25b16d8a257) **[V]**. A second case the panel
  found: the first draft quoted `r1-deu-dev` as 0.9944 at n=799. The same file name now holds a v2 card, n=797,
  headline *site F1*, score 0, with the 0.9944 all-domain figure demoted to "secondary" (b8f061002916, written
  01:04) **[V]**. Both are real runs of an instrument that is changing under the reader. Neither is recorded
  anywhere that survives, and **an intake that stamps today's hashes on yesterday's card makes a stale measurement
  look current**. By the test in section 1.1, none of what this session measured is knowledge yet. It is *evidence
  awaiting intake*, and a card enters as a measurement only if it carries a fingerprint taken **at run time**.
- **The proposal in one sentence.** One append-only, content-addressed **knowledge log** in the repo whose entries
  are a closed set of nine types (material, instrument, claim, measurement, prior, constant, rule, verdict,
  testread); everything the system consults (competence, constants, prior manifest, negative-result list) is a
  **projection** of that log, recomputed, never stored beside it. This is the log-is-the-memory rule applied to
  what we know about our own instruments.
- **What the first build is (days, not a framework).** Five of the nine types are written (claim, verdict, prior,
  testread and hash-only material); a pinned head manifest so nothing can be deleted silently; the prior
  manifest generated from the files; the user's negative results recorded as `reported`; and small existing
  seams made honest (typed component gaps where `grammarFor` returns a silent `null`; the reported negatives
  disclosed where the caseless tier and the name nominator speak). It **widens nothing** and changes no decision.
  Section 8.
- **What it cannot do yet, said plainly.** No card in `eval/competence` or `eval/coding-competence` can satisfy
  the L2 gate (no instrument has a planted-effect or power arm; "built to fail" is not a field any card carries;
  no run-time fingerprint; no committed unit outcomes; the test-reads ledger is not in the repo). **Every existing
  measurement is capped at L1.** L2 becomes reachable per instrument family only after that family passes a
  conformance test (T17). Section 3.0.
- **It extends, it does not replace.** Carrier discipline from `kernel/task-log.js`; record-falsifier-concede
  shape from `organs/correction-rule.js`; declared-minus-unsupported from `kernel/capacity-map.js`; regimes from
  `assemblies.js`; sealing from `kernel/artifact.js`; the standing table from
  `the-fold/constitution.js::ENFORCEMENT`; the empty seat `EARNED` named in `organs/capacity-place.js`.
- **What the running system may do with it.** *Restricting* uses (disclose a typed gap, cap a standing, route away,
  exclude a witness) are available from L1 for fingerprinted negatives and from `reported` by disclosure only.
  *Widening* uses (route toward, raise trust, choose a witness in, derive a threshold) wait for **L4** and for T1
  and T13 to return. **Never lawful:** admit a being or a claim, grant a standing, weight or sum a witness, invent
  a likelihood ratio, carry a verdict from one system to another as a level. A1.2 and A4.1 are the whole
  interface.
- **The asymmetry that makes it safe.** Evidence can refute a license and never grant one (READING-SPEC S19). A
  negative record restricts at a lower rung than a positive record widens, and a promotion is **computed from
  entry conditions on every run**, never accepted because a verdict entry says so.
- **Cross-modal.** The kernel is medium-blind and the knowledge records are medium-blind; the adapter owns the
  ear, the address grammar and the instruments. Procedures transfer (measure the window, test the null, count
  independent witnesses); values and grammar-specific priors never do. Most cross-modal claims are unmeasured.
  Section 5 says which, and how to measure them.
- **Logos.** Logos reasons over material. It does not yet reason over its own instruments. The registry lets it
  say, per claim, *which of the rungs this claim rests on were earned in this system*, and lets it tell a true
  silence from an unhearable one: before L4 the only lawful form is the restricting one (an empty result in a
  system whose hear rung is failed or unmeasured is typed `not_computed_here`, never `computed_and_empty`).
  Section 6 pre-registers the tests that would show it does not help.
- **First, with a small budget:** Build 1 of section 8.1: five small new modules, two test files, and additive fields in five existing files.

---

## 1. The problem, honestly

### 1.1 What "knowledge" means here

"Real knowledge for the system" is taken to mean something the *running system can use and be held to*. A document
a person reads is not that. A record is knowledge in this sense when it passes seven tests. They are named K1 to
K7 so the rest of this document can cite them.

| | Test | What fails it |
|---|---|---|
| **K1** | **Recorded.** Committed in the repo, content-addressed. Not in `/private/tmp`, not in a scout's memory. | A result that exists only in a volatile directory or prose. |
| **K2** | **Provenance.** Giver (a person, or the run that derived it), instrument id and content hash, data snapshot hash, split, licence, builder. | A table with a giver string but no hash; a number with no run behind it. |
| **K3** | **Falsifiable.** Says what observation would show it wrong, and for a measurement, which control was built to fail and did. | A claim with no falsifier; a pass against a control that does as well as the real arm (II.23). |
| **K4** | **Versioned and stale-aware.** Names every file whose hash it depends on; a changed dependency is visible. | A card that survives a changed prior or instrument unnoticed. |
| **K5** | **Consulted.** At least one named run-time call site reads it, and where it is absent that call site emits a typed gap (IV.3). | A document. A registry nothing reads. |
| **K6** | **Pinned.** A test in *this* tree reads the committed record and fails by name if it, or its premise, changes. | A claim whose pin was removed from the tree. |
| **K7** | **Promotable and demotable.** Has a standing on a ladder, and a later falsification moves it, automatically, without deleting it. Negative results are knowledge and are retained and consulted. | A hypothesis promoted by being written down; a refutation that leaves the old claim standing. |

### 1.2 What we have, by those tests

Applying K1 to K7 to the session's inventory. Tags say how I know the status. Counts are a snapshot taken during
the session (the tree grew while it was written; a `notation-competence` directory appeared at 01:39).

| Item | What it is | K1 | K2 | K3 | K4 | K5 | K6 | K7 |
|---|---|---|---|---|---|---|---|---|
| Competence rungs R0 to R5, 25 stems, raw files in `/private/tmp/claude-501/competence` (182 `r?-*` files **[V]**) | measured evidence | no | partial: rung-module sha1, prereg digest stamped by r0, r1, r2, r3, r4 (read now **[V]**), not r5 | yes (controls built to fail) | no | no | instrument only, on toy fixtures | no |
| Coding ladder C0 to C5, 52 cards **[S]** | measured evidence | no | `sources` sha1 map in the card **[S]** | yes | partial | no | instrument only | no |
| Name nomination, de-identification, UDHR detection **[U]** | measured evidence | no (`/private/tmp/claude-501/deid/`, `names/` exist **[V]**) | no | partial | no | no | `tests/name-candidates.test.js` pins the mechanism | no |
| files in `native/priors`: 227 now **[V]** (220 in 20 schemas at the scouts' count **[S]**; the tree grew while this was written) | received priors | yes (in tree) | giver on POS 61/61 and nothing else uniformly; input sha256 on 8 of 220 **[S]** | n/a | no | read by 8+ independent loaders, no registry **[S]** | no | no |
| `assemblies.js` regimes (12 across 9 assemblies) **[S]** | declared constants | yes | giver mandatory (validator **[V]**) | no | no | **not read at run time**: no module reads `regimes[x].value` **[S]** | no | no |
| `kernel/capacity-map.js` DECLARED / UNSUPPORTED_CROSSINGS **[V]** | the best existing negative-result pattern | yes | giver per row | yes (rule + outcomes) | no | yes (`fold-plan.js`) | **pin and evidence removed** from the tree (cited `git 2f81545`, not in this tree) **[V]** | yes (a crossing moves between lists) |
| `ENFORCEMENT` in `the-fold/constitution.js` (31 rows, 8 `enforced: true`, 20 `null`, 3 `partial` **[V, run]**) **[V]** | rule-to-code binding table | yes | n/a | n/a | n/a | walked by `constitution.test.mjs` | yes | `null` rows are visible by design (VI.3) |
| READING-SPEC S1 to S137 | rules and amendments | yes | giver tag in early entries | Generality tag from S31 | no | prose | 98 of 99 named test files absent from this tree **[S]** | refutation = appended prose, no machine link |
| Barker, company/holograph-impact law, beings-by-physics | pre-registered hypotheses | docs yes | n/a | **yes: falsifier first** | frozen sha256 in `/private/tmp` for the law | no | no | hypothesis rung only |
| N1 recurrence gate (caseless tier) failed held-out **[U]** | negative result | no | no | n/a | n/a | the gate is still in the code **[V]** (below) | no | no |
| N2 frame prior ~+0.01 to +0.02 recall over random unseen words **[U]** | negative result | no | no | n/a | n/a | no | no | no |
| N3 de-identification peer's spaCy route beat `nameCandidates` **[U]** | negative result | no (`deid/nameCandidates-vs-gold.json` exists **[V]**) | no | n/a | n/a | no | no | no |
| N4 role-config stays off in production (SVO positional reading failed on real prose) | negative result | CHORUS-LOG prose **[S]** | no | n/a | n/a | enforced by *absence*: `relations-language.js` defaults `roleConfig` to null **[S]** | no | no |

By K1 to K7, **nothing on this table is knowledge in full.** The nearest are `capacity-map.js` (consulted and
retains its negatives, but its pin was removed), `manifests/reachable-paths.json` with
`tests/reachable-paths.test.js` (pinned, but consulted by nothing at run time) **[V]**, and MorphCuesPrior's
Provenance@1 (the richest provenance in the tree, read by nothing for competence). That is the honest standing of
the session's work today: **measured, unrecorded**.

Hypotheses and gaps, stated plainly so no one mistakes them for knowledge: Barker's kinds and arches (BARKER.md is
a pre-registration; "nothing in this document is a result"); the company/holograph-impact law
(LAW-FALSIFICATION.md, "contains no result"); beings-by-physics (trajectory, slot-ablation impulse response,
identity as fold); the autonomy-spiral trust ledger; any consumption of competence at run time; any licence gate.
All design-only.

### 1.3 Seven unconnected shapes of stored knowledge, and the plumbing defects the design must not inherit **[S unless tagged]**

Received priors (`priors/*.json`); declared dials (`assemblies.js` regimes plus comment-givers); registries
(`assemblies.js`, `organs/capacities.js` with 52 rows **[V]**, README handles, archon-holocracy); append-only
ledgers (`task-log`, `correction-rules.jsonl`, `document-ledger`, `reading-log`, sealed artifacts, heimdall);
rules (READING-SPEC, FOLD-CONSTITUTION, CHORUS-LOG); measurement outputs (`eval/*` into `/private/tmp`); pinned
manifests (`manifests/*.json`). No loader or registry joins them. The defects that matter to this design:

1. **`pass` is a margin over a control, not a level, and a card's headline changes between versions.** Reads of the
   live tree with each file's sha256 prefix and modification time (UTC), taken while this revision was written
   **[V]**. They illustrate the defect and are not records (no run-time fingerprint exists for any of them):

   | file (sha256 prefix, mtime) | n | score | control | margin | `pass` | what it means |
   |---|---|---|---|---|---|---|
   | `r1-deu-dev` (b8f061002916, 06:04Z) | 797 | 0.000 (v2 headline: *site F1*) | 0.0030 | -0.0030 | false | the ear is inert on the 75 inside-run sites; need share 0.0206, interval [0.0180, 0.0232] straddles the 0.02 floor, so "needs an ear" is borderline; `needs_ear_but_inert` fails. **The first draft read this stem as 0.9944 at n=799 (all-domain F1, `no_ear` control 0.9944). The same file name now measures a different quantity**, so a number from v1 and a number from v2 are two claims, never one trend (section 3.6) |
   | `r2-eng-dev` (48d54f1c3eef, 06:20Z, rewritten 01:20 local) | 1372 | 0.8128 | 0.8524 (`majority_oracle`) | -0.0396 | false | the classifier is worse than saying "everything is nominal" |
   | `r1-heb-dev` (bc0417d6a106, 06:05Z) | 484 | 0.6263 (site F1; all-domain 0.9383 now "secondary") | 0.5851 (`affix_only`) | +0.0412 | true | the ear helps against every control and still hears only 63 percent of the sites |

   A consumer that read `pass` as capability would trust a mediocre Hebrew ear and could read a v1 German number as
   current. A record must carry **level**, **effect over control**, the **arms**, the **typed gap reasons**, the
   **instrument version and headline metric**, and a **regime**, never one boolean. And a card that is read after
   a rewrite is a different measurement from the card that was read before it (blocker 1 of the review).

2. **Tier-wall collision.** `kernel/artifact.js::FORBIDDEN_BODY_KEYS` refuses the keys `margin` and `present`
   (decay-tier quantities, A1.1) **[V]**. A rung result carries `margin`. It cannot ride in a sealed
   EOArtifact@1 body unchanged. The record renames it `effect_over_control`.
3. **`measured` is read from prose.** `organs/capacity-place.js::hasMeasurementGap` is a regex over
   `stagesNotRun` free text, and `organs/fold-plan.js` reports `steps[].measured = !hasMeasurementGap(asm)`
   **[V by reading]**. An assembly with an empty `stagesNotRun` is "measured" with no record behind it. The seat
   for an earned ledger (`EARNED`) is named in `capacity-place.js`'s header and does not exist **[V]**.
4. **One value, two meanings.** The recurrence floor 2 is a "structural floor" at `kernel/corroboration.js:34`
   (`CANONICALIZATION_FLOOR`, confirmation by two distinct sources) and at `adapters/text/listening-cast.js:52`
   (`ARRIVALS_FLOOR`, **admission** of a heard being), and is typed as `minMentions: 2` at
   `adapters/text/recursive.js:687,693` and `the-fold/language-context.js:76` **[V]**. N1 falsifies the admission
   use. It does not touch the corroboration use. A constant record must carry a **scope**.
5. **Silent component absence.** `grammarFor` returns `framePrior: null, roleConfig: null` for grc, lat and san
   with no reason **[S]**, and `language-context.js::extractSurfacesHeard` silently returns the capital-only tier
   when `framePrior` is missing **[V]** (`if (!ctx.grammar?.framePrior) return capital`). Only the language level
   is typed. This violates IV.3.
6. **Pin rot.** READING-SPEC names 99 test files and one exists in this tree **[S]**. `conformance/` is an empty
   directory **[V]** and `package.json` globs `conformance/*.test.mjs`. Documentation that cites tests is
   currently unverifiable here.
7. **No licence gate.** The repo is MIT (`LICENSE`); the root `package.json` says ISC **[S]**. 15 languages have a
   POS or MorphCues prior whose recorded licence is CC BY-NC-SA. The same treebanks' proclitic and identity files
   carry plain CC BY-SA, 26 Frame and RoleConfig files carry no licence at all **[S]**. `organs/license-table.js`
   would return `ok: false` for every CC BY-SA input because its allow-list is permissive-only **[V by reading]**.
8. **Constants are documentation.** The validator demands a giver; nothing reads the value **[S]**. The
   constitution's own II.11 row says "hand-picked and documented as open debt" (`ENFORCEMENT`, `enforced:
   "partial"`, naming `NULL_SAMPLES` (`organs/cite.js:197`, value 12 **[V]**) among others).
9. **Cross-medium identity by string coincidence.** `kernel/notes.js::noteId` lowercases its three strings with no
   medium component. `noteId("Foo","calls","bar") === noteId("foo","calls","bar")` returns `true` **[V, run]**:
   distinct identifiers in a case-significant language collapse to one note. A text claim and a MIDI claim with the
   same ends merge into one note with standing `corroborated-independently` and the join is recorded only in
   `assumedBridges` **[S, ran]**. This bears on section 5.
10. **The tree is live and its evidence is volatile.** The observation at the top of this document.

---

## 2. The knowledge types

### 2.0 One log, nine entry types, projections for everything the system reads

**The carrier.** A directory `native/knowledge/entries/` of **content-addressed JSON files**, one entry per file,
never edited, never deleted. The in-memory form uses the same entry vocabulary and the same immutable, sequenced
`append` as `kernel/task-log.js` (kinds `propose`, `evidence`, `result`, `supersede`, `retract`), with the
mapping claim -> `propose`, measurement -> `evidence`, verdict -> `result`. The **projections are not
`projectTasks`**: that function folds payload last-write-wins per `task_id` **[V]**, and a claim has many
measurements. The projections are new, small and pure.

**Why files, not one JSONL.** The tree is live: other sessions added tests and files while the scouts read it
**[S]**, and two appenders to one file is a merge conflict. A content-addressed file cannot conflict. The order of
entries is not a clock: each entry names the entries it answers in `after`, and the projection is a pure function
of that graph. Two verdicts that both follow the same predecessor are a **fork**, surfaced as the typed gap
`verdict_fork` that a third verdict must resolve. (A single JSONL file is the alternative; section 9 lists it.)

**The envelope.**

```jsonc
{
  "schema": "KnowledgeEntry@1",
  "type": "material | instrument | claim | measurement | prior | constant | rule | verdict | testread",   // Build 1 writes claim, verdict, prior, testread, hash-only material; entry.js refuses the rest until their gate lands (8.1)
  "address": "k:<full 64-hex sha256 over the canonical JSON of {type, after, giver, body}>",
  "after": ["k:..."],                       // entries this one answers; the order, not a clock
  "giver": { "kind": "person" | "run", "id": "mlacy" | "k:<measurement address>" },   // II.1, II.11
  "by": "ingest:eval/competence/run.mjs | lens:chomsky | person:mlacy",              // who wrote the entry
  "date": "2026-10-06",                     // metadata; no logic reads it (seq not clock)
  "body": { ... }                           // per type, below
}
```

**Tamper evidence, and what is and is not authenticated.** The address is the **full** 64-hex sha256 of the canonical
JSON of `{type, after, giver, body}`; the file is named by the full hash (a 16-hex prefix is a display convenience
only; the first draft's 64-bit prefix could be recomputed for a forged entry). Three things keep a deletion or a
forgery from being silent:

1. **A pinned head.** `knowledge/HEAD` is a committed, sorted list of every entry address with a count, and
   `knowledge/HEAD.sha256` records its hash. `add.mjs` is the only writer. A test (T19) fails if an address in
   HEAD has no file, if a file is not in HEAD, or if HEAD's hash differs from the record; in CI where git exists it
   also fails if any address in the base ref's HEAD is missing from the working HEAD (a ratchet: HEAD only grows).
   `REGISTRY.md` is a projection and proves nothing about deletions; HEAD does. HEAD is itself an editable file, so
   the ratchet is only as strong as the git history it is checked against; the log cannot defend against a rewritten
   history and says so (section 9, item 13).
2. **Retraction cannot remove a dead end.** `retract` is reserved for a recording mistake and carries a reason. A
   refuted claim is never retracted (it stays, with its verdict). **Retracting any entry that restricts** (a
   `refuted`, `not_supported`, `underpowered`, `invalid` or `stale` verdict, or a measurement behind one) **needs
   `giver.kind: person`**, and the retracted entry stays in `deadEnds()` as outcome `retracted_negative` with the
   reason shown. This is the kernel/corroboration.js rule ("a refuted kind is not re-signed silently") made
   structural.
3. **`giver.id`, `by` and `date` are free strings and authenticate nothing.** Authenticity of authorship is the git
   author and commit that added the file, checked outside the log. A hand-dropped entry is not stopped by the log.
   It is stopped by **projection**: every level is recomputed from entry conditions on every run and a verdict whose
   conditions are unmet is flagged `promote_unsupported` and ignored (3.1), and by review of the commit.

**The user's seven names, mapped.**

| Name in the ask | Stored or projected | Extends |
|---|---|---|
| Finding@1 | stored as `claim` + `measurement` + `verdict` entries (a finding is the claim with its evidence and standing) | task-log propose/evidence/result; `correction-rule.js` CorrectionRule@1 shape |
| Measurement@1 | stored (`measurement`) | `eval/competence/run.mjs` card; `kernel/artifact.js` material/regime/dropped |
| PriorManifest@1 | stored (`prior`), generated from the files | MorphCuesPrior@1's Provenance@1 `{value, basis}`; `organs/license-table.js` |
| CompetenceRegistry@1 | **projection** | the `EARNED` seat of `organs/capacity-place.js`; `run.mjs::verdictOf` vocabulary |
| DerivedConstant@1 | stored (`constant`) | `assemblies.js` regimes `{value, giver, basis}`; `kernel/assembly.js::assembly` |
| NegativeResult@1 | stored (`verdict` with outcome `refuted`, `not_supported` or `underpowered`) + **projection** `deadEnds()` | `kernel/capacity-map.js` UNSUPPORTED_CROSSINGS |
| Rule@1 | stored (`rule`) | READING-SPEC S-entry; `constitution.js` ENFORCEMENT row |

Two supporting types the seven need and the ask did not name: `material` (a data snapshot, in `artifact.js`'s own
word) and `instrument` (the thing a measurement cites, so staleness is one comparison). Section 2.1.

All new modules are left plain, no handle, like `assembly`, `artifact`, `cast-ledger` and `task-log`
(README Handles note). Whether the knowledge organ earns a handle is the user's.

### 2.1 `material` and `instrument`

```jsonc
// material: a data snapshot. extends artifact.js material {source, hash, extent, unit}
{ "id": "ud-eval:deu", "source": "UD_German-GSD",
  "pin": { "release_or_commit": "2.15 | <git sha>", "files": [{ "path": "ud-eval/deu/dev.conllu", "sha256": "..." }] },
  "split": "dev", "extent": { "sentences": 797 },
  "licence": { "spdx": "CC-BY-SA-4.0", "read_from": "<sha256 of the treebank's LICENSE.txt>", "class": "share-alike" },
  "availability": "present_here | absent_here",    // an absent material is `unverifiable`, never `ok` (7.4)
  "text_embedded": false }                          // an entry body never embeds gold sentence text (7.2, C9)

// instrument: what a measurement cites. Written ONLY from a run-time fingerprint sidecar (7.1), never by hashing the tree as it is now.
{ "id": "eval/competence/r1-hear.mjs", "version": "v2", "rung": "hear",
  "headline": { "metric": "site F1", "arms": ["real", "no_ear", "every_char", "affix_only", "..."] },   // a changed headline or arm set is a NEW version and a NEW claim (3.6)
  "params": { "NEED_FLOOR": 0.02, "MIN_EFFECT": 0.01, "B": 1000 },       // PARAMS verbatim (II.5); `declared`, not derived
  "sesoi": "<registered per rung before the first measurement; undecided, section 9>",
  "prereg": { "digest": "<lib.mjs::headerDigest at the committing commit>",
              "committed_in": "<git commit sha | knowledge entry address>",
              "status": "registered | retroactive | none" },
  "controls": [{ "name": "random_boundaries", "role": "floor | strong | built_to_fail", "mapped_by": "k:<conformance claim, T17>" }],
  "frame": "<organs/frame.js declareFrame address>",                       // so cross-frame comparison is refused
  "zero_model": true }                                                     // a source scan, 7.2 check C8
```

**Pre-registration is an ordering fact, not a digest.** `headerDigest` hashes the header *as it stands*, so a
digest stamped at run time equals itself after any edit and proves nothing (the first draft's C3 was tautological,
and its E7 retro-stamp was retroactive pre-registration by construction). `prereg.status: registered` requires that
the digest was **committed** (a git commit, or a log entry whose `after` chain precedes the instrument's first
measurement entry) before the first measurement entry for that instrument id. **Any change to the header, params,
headline or arm set after a measurement entry exists creates a new instrument version, a new claim at L0 with the
old results linked `supersedes`, and never a re-stamp.** A digest stamped after results exist is `retroactive` and
capped at L1. r4 already carries v1/v2 amendments with an "original" digest and r1's header describes a withdrawn
v1 pass **[V by reading]**: amended pre-registrations exist, and this is how they are told apart.

### 2.2 `claim` (the Finding)

A claim is a proposition about the system, **registered before it is measured**.

```jsonc
{ "id": "claim:competence:nl:deu:r1",              // or "claim:rule:born-at-first-mention", "claim:constant:..."
  "kind": "capability | mechanism | constant | rule | prior-value | arch",
  "statement": "the ear places the word boundaries the German gold has, better than no ear",     // free text
  "scope": { "systems": ["nl:deu"], "registers": ["UD_German-GSD genres"], "not_shown_for": ["..."] },   // free text
  "family": "competence:hear:site-f1",             // the trial family: cells, variants and TEST reads are counted per family (3.5)
  "overlap_keys": { "instrument_family": "competence/hear", "material": ["ud-eval:deu"], "target": "word-boundary-sites" },
                                                   // CLOSED vocabularies fixed at ingest; dead-end overlap is computed from these (2.7)
  "prediction": "...",
  "falsifier": "the real arm does not beat the strongest control by the registered SESOI on one ledgered TEST read",   // mandatory
  "sesoi": "<registered before the first measurement>",
  "prereg_sha256": "<digest registered before the run; counts only per 2.1>",
  "depends_on_claims": ["claim:competence:nl:deu:r0"] }
```

A claim without a `falsifier` is refused at ingest (K3). Claims enter at standing `hypothesis` (L0, section 3).
`statement` and `scope` are free text for a person; **overlap, family and the closed vocabularies are what code
reads**, so choosing a differently worded scope buys a claimant nothing.

### 2.3 `measurement`

One verdict of one instrument version on one material, carrying the **fingerprint taken at run time**.

```jsonc
{ "claim": "k:...", "system": { "modality": "text", "id": "nl:deu", "family": "Germanic", "script": "Latin" },
  "rung": { "id": "hear", "ordinal": 1, "alias": ["r1", "c1"] },
  "instrument": "k:<instrument version>", "material": "k:...",
  "split": "dev | test",
  "split_status": "tuned_on | single_ledgered_test_read | burned | unledgered_test_read",
                                        // dev is ALWAYS `tuned_on`: the ear, floors and headline were iterated on dev (r1 v1 -> v2, the bul-* scripts). Never "held-out"
  "testread": "k:<testread entry> | null",
  "n": 797,
  "level":  { "score": 0.0, "ci95": [0, 0], "metric": "site F1" },     // CI absent -> { "gap": "not_computed" }, never null
  "arms":   [ { "name": "real", "score": 0.0 },
              { "name": "no_ear", "role": "floor" },
              { "name": "every_char", "role": "strong" },
              { "name": "random_boundaries", "role": "built_to_fail" } ],   // `role` comes from the family's conformance mapping (T17), not from the card's own flag
  "effect_over_control": { "value": -0.003, "vs": "every_char", "ci95": { "gap": "not_computed" } },   // was `margin`
  "verdict": "passed | failed | unmeasured | underpowered | invalid | error | na | deferred",
  "verdict_basis": "needs_ear_but_inert (failed: real_equals_no_ear); borderline",
  "gaps": [ { "reason": "ear_inert", "count": 75, "of": 239 }, { "reason": "mwt_nonconcatenative", "count": 164 } ],
  "regime": { "applies_to": "UD_German-GSD dev sentences, written prose", "cased_script": true },
  "power": { "status": "absent_in_instrument | present", "min_detectable_effect": null, "planted_effect_recovered": null },
  "unit_outcomes": { "sha256": "...", "bytes": 0, "committed": true },   // compact per-unit (per-site, per-sentence) hit/miss for the real arm and the strongest control, so a recompute can check the headline
  "fingerprint": { "taken": "at_run", "sidecar_sha256": "...",           // 7.1; absent => the entry is `reported`, `depends: unknown`, L1 for ever
                   "files": [{ "path": "...", "sha256": "...", "via": "import_trace | fs_trace" }],
                   "unverifiable": [{ "what": "ud-eval gold", "why": "absent_here" }] },
  "raw": { "sha256": "...", "bytes": 0 } }                                // the raw rung file is evidence; its hash is recorded
```

`verdict` is `run.mjs::verdictOf`'s vocabulary (`pass`, `fail`, `unmeasured`, `error`, `invalid`) **[V]**, with the
coding card's `na` and `PASS*` (licence deferred, `deferred`) **[S]**, and IV.3's six silences mapping onto it:
not-present and not-computed -> `unmeasured`; computed-and-empty -> `passed`/`failed` with `level`;
refused-as-underpowered -> `underpowered`; censored-above and censored-below -> `level` with
`ci95` at the bound and a `gaps` row. **A missing record is not a verdict.** It is a typed gap
`no_competence_record` and passes through every guard as itself.

**What the cards actually carry today [V by grep and reading, 2026-10-06].** No rung module in `eval/competence`
or `eval/coding-competence` has a planted-effect or power arm: the only "planted" things are r0's licensed
derangements and the coding card's deranged control (`coding-competence/run.mjs:534`). Controls are reported under
**inconsistent fields**: `licensed`/`beats` in r4, `details.licence` in r1, `status: unlicensed` for guards in
`run.mjs`, and none is called `built_to_fail`. The NL card records only the rung module's sha1 (`run.mjs:492`), not
the reader's import closure or the priors read. So `power.status` is `absent_in_instrument` and `arms[].role` is a
**per-family mapping a person must write and a conformance test must pin** (T17), not a thing ingest may infer.
A measurement the ingest cannot give a run-time fingerprint is recorded **only** as `reported`.

### 2.4 `prior` (PriorManifest@1) and the licence gate

A manifest entry per file in `native/priors`, **generated from the file**, never typed:

```jsonc
{ "file": "frame-deu.json", "schema": "FramePrior@1", "language": "deu", "sha256": "...",
  "built_from": ["k:<material>"],                          // the source treebank(s); licence is derived through this
  "builder": { "script": "scripts/build-frame-prior.mjs", "sha256": "...", "args": ["--train-split", "..."] },
  "split": "train",
  "provenance": { "giver": {...}, "period": {...}, "region": {...}, "register": {...} },  // MorphCuesPrior@1 shape: {value, basis} per field
  "licence": { "class": "non-commercial", "spdx": "CC-BY-NC-SA-4.0", "derived": "most restrictive of built_from" },
  "status": "unverified | verified",                       // verified = a measurement in good standing cites this sha256 in `depends.priors`
  "caveats": ["no giver id: giver string says 'UD treebank (train split)'"],
  "consumed_by": ["the-fold/language-grammar.js::grammarFor"] }
```

A prior's licence is **derived through `built_from`** (most restrictive input) so one treebank's licence is read
once, not typed 50 times. This is also how the 4 CC BY-SA proclitic and identity files **[S]** and the 17 NC-labelled files **[S]**
for the same treebanks stop disagreeing: the disagreement becomes a derivable fact and a `licence_conflict` gap.

**`built_from` has a basis, and an inferred one proves nothing.** Only 8 of 220 priors carried an input hash at the
scouts' count **[S]**. For the rest, `built_from` can only be inferred from the filename or the language, which is a
typed mapping and an unverified provenance assertion. The manifest therefore records
`built_from_basis: "verified" | "inferred"`. **An `inferred` `built_from` leaves the derived licence `unknown`**
until an input hash exists; it never produces `share-alike` or `non-commercial` by guess and never produces
`permissive`. This makes `unknown` common at first, which is the honest state, and the ratchet below shrinks it.

**The licence gate** is a function `licenceGate({ prior | material | card }, action) -> { verdict, because }` over
four **actions**, because "may we use it" is four questions: `use_local`, `commit`, `distribute`, `embed_text`.
Its policy is a declared table, not a guess:

| class | `use_local` | `commit` | `distribute` | `embed_text` |
|---|---|---|---|---|
| `permissive` (MIT-compatible) | allow | allow | allow | allow with notice |
| `share-alike` (CC BY-SA) | allow | **undecided** | **undecided** | **undecided** |
| `non-commercial` (CC BY-NC-SA) | allow | **undecided** | **undecided** | refuse |
| `unknown` | refuse | refuse | refuse | refuse |

**`undecided` is a result, not a default, and it is a cap.** The gate returns `{ verdict: "undecided", because: "no
decision entry", needs: "rule:licence-policy:<class>:<action>" }`, and a `rule` entry whose giver is the owner (a
person) is what turns an `undecided` cell into `allow` or `refuse`. **An entry whose `commit` or `distribute`
cell is `undecided` cannot exceed L1** (the first draft let undecided pass L2 and be consumed). So until the owner
rules, **Build 1 commits only hashes and non-derived metadata**: file sha256, schema, language, builder name, the
giver string as written, and the licence *label as found*. It commits no number derived from CC BY-SA or NC gold
(no scores, counts, closed-class lists or frame distributions), and no gold sentence text. `use_local` for the
owner's own research is stated `allow` here as a nomination, not as legal advice; section 9 asks the owner and
counsel.

**The ratchet, extended.** The count of `unknown` licences may only fall; a **new** prior whose licence is `unknown`
fails CI; **a new prior whose licence is `undecided` for `commit` or `distribute` (an NC or SA class) also fails CI
until a decision entry exists for that class and action.** (The first draft let new NC priors in as `undecided`
freely.) `organs/license-table.js` is not reused unmodified (its `PERMISSIVE` set refuses SA); the gate sits beside it
and reuses its SPDX normalisation (`LICENSE_WORDS`, `canon`).

### 2.5 `CompetenceRegistry@1` (a projection; Build 2, restricting rows only at first)

`competence(system, rung)` is computed from the log by a pure function. Never stored beside it. It reads, per
`(system, rung)`, **the latest instrument version's measurement only** (3.6); earlier versions are listed
`non-governing`.

```jsonc
{ "system": "nl:deu", "rung": "hear",
  "state": "passed | failed | unmeasured | underpowered | invalid | na | deferred | contested | weak_level | reported | unverifiable",
  "governing": { "instrument": "k:<version>", "headline": "site F1" },
  "level":  { "score": 0.0, "ci95": [..], "tuned_on": "dev", "n": 797 },      // the capability: "can it?" (`tuned_on` unless one ledgered TEST read)
  "level_floor": { "registered": "<per rung, before first measurement; undecided>", "met": false },
  "effect": { "value": -0.003, "vs": "every_char", "ci95": {..} },            // the value added: "does the ear help?"
  "standing": "L1",                    // recomputed level of claim:competence:nl:deu:r1 (section 3); never read from a verdict
  "trials": { "family": "competence:hear:site-f1", "cells": 25, "variants": 2, "test_reads": 0 },   // shown next to every level (3.5)
  "earned_by": ["k:<measurement>", ...],
  "regime": { "applies_to": "...", "not_shown_for": ["..."] },
  "gaps": [ { "reason": "ear_inert", ... } ],
  "stale": false, "stale_because": [ { "path": "priors/pos-deu.json", "was": "...", "now": "..." } ] }
```

**Level and effect are different questions and a consumer reads the one it asks.** "Can the reader hear Hebrew word
boundaries?" reads `level` (site F1 0.63, and `weak_level` against any registered floor above that). "Does the ear
earn its place in Hebrew?" reads `effect` (+0.04 over the strongest control). The registry has no field named
`pass`. **A per-rung level floor (capability, not only effect) must hold for any widening use**; below it the cell is
`weak_level` and consumers disclose only. The first draft let Hebrew R1 (level 0.63, +0.04) clear on effect alone.
Floors are registered per rung before the first measurement and their values are undecided (section 9, item 11).

**No `trust` field in the first build; the join to earned-cast was unspecified and is cut.** The first draft
projected `checked | sampled | cleared` onto `the-fold/earned-cast.js::trustOf(state, name)`. That function is keyed
by the cast **archon's name** (kelsen, barker, ...) and means *which attentions run solo*, while a registry cell is a
**system and a rung**; how a cell becomes an archon's trust was never said, so `trustFor` and source edit E12 are
**deleted**, not deferred. If it returns, it is specified first: an archon's trust is the **minimum** over the cells
it reads, with a gap if any is unmeasured; `cleared` needs L3 reached through instruments whose ancestor graph
(prior, builder, treebank, material) is **disjoint, computed from the log and not asserted**; and it enters only
after T13. A competence cell never grants a standing to a claim (A1.2).

**Staleness is by hash, never by clock.** `stale_because` lists every fingerprinted file whose current sha256
differs. There is no expiry date; a held-out result computed once does not rot by the calendar, it rots when the
prior, the instrument, the reader's traced closure or the gold changed. What cannot be hashed here (gold absent) is
`unverifiable`, not stale and not fresh (7.4).

### 2.6 `constant` (DerivedConstant@1)

Extends `assemblies.js` regimes `{value, giver, basis}` with the three fields the session showed were missing:

```jsonc
{ "id": "constant:recurrence-floor:admit", "value": 2,
  "scope": "admit | confirm | route | window | cut",            // the scope N1 showed was needed
  "status": "declared | provisional | derived | falsified",
  "giver": { "kind": "person", "id": "..." } | { "kind": "run", "id": "k:<measurement>" },
  "derivation": { "procedure": "derive per material from its own distribution" | null, "run": "k:..." | null },
  "sites": ["adapters/text/listening-cast.js:52"],              // where the literal lives today
  "falsified_by": ["k:<verdict>"] }
```

The rule is FOLD-CONSTITUTION II.11: a constant names the run that derived it or a person as giver. A constant is
**derived** only when **all** hold: (a) a measurement entry is its giver; (b) its `derivation.procedure` is a
**hashed script entry** (a `prior`-style entry naming the script and its sha256), not a prose string, so "derived"
cannot be asserted by whoever writes the entry; (c) **the giver's material is disjoint from every material that later
evaluates a claim depending on the constant** (a floor derived on a stem's dev split and then evaluated on that same
split is circular; T-L2 is only a partial guard); (d) the giver measurement is itself at L4, because a derived
threshold changes behaviour and is a widening use (4.1). Today most are `declared` or `provisional`, and the
document says so instead of dressing them. **No constant is consulted in Build 1 or Build 2**; the pin below keeps
the literal and its record equal and nothing more.

**Constants to convert first** (verified at the cited lines **[V]** unless tagged):

| id | value | where | today | convert as |
|---|---|---|---|---|
| `recurrence-floor:confirm` | 2 | `kernel/corroboration.js:34` | declared structural (S16), source: one support per surviving false identity | `declared`, scope `confirm`; stays |
| `recurrence-floor:admit` | 2 | `adapters/text/listening-cast.js:52`; `recursive.js:687,693`; `the-fold/language-context.js:76` | declared structural | **`contested` by N1 while N1 is `reported`** [U]; `falsified` only once a fingerprinted refutation exists. Consult changes nothing in code until the user decides; it makes the contradiction with "a being is born at first mention" a visible, consulted fact |
| `language-evidence:strong/floor/margin` | 0.3 / 0.1 / 1.8 | `the-fold/language-listener.js:37`; `language-grammar.js::detectLanguage` | hand-typed, no giver | `provisional`; derive from R0 results (the 22 of 28 pass is a verdict on the rule, not a derivation) |
| `cased-script-floor` | 0.3 | `the-fold/language-context.js:43` | hand-typed | `provisional` |
| `script-floor:dense/abjad` | 2 / 3 | `adapters/text/script-floor.js:12` | hand-typed | `provisional` |
| `ear:enclitic-depth`, `ear:whole-word-floor` | 2 / 3 | `adapters/text/ear.js:27-28` | hand-typed | `provisional`; measured by R1 arms |
| `heard-surfaces:min-share/members` | 0.3 / 2 | `adapters/text/recursive.js:693` | hand-typed | `provisional` |
| `grammar-min-share` | 0.5 | `adapters/text/grain-typing.js` | "the repo's one declared settledness cut" **[S]** | `declared`, giver the declaring decision |
| `key-alpha` | 0.05 | `adapters/text/keyness.js` | declared | `declared` |
| `null-samples` | 12 | `organs/cite.js:197` | named in II.11's open debt **[V]** | `provisional`; derive from the claim's power card (section 6) |
| instrument params | `NEED_FLOOR .02`, `MIN_EFFECT .01`, `B 1000`, seeds | `eval/competence/r1-hear.mjs` etc. | in pre-registration headers | carried verbatim in `instrument.params`, `declared` |

**Rollout rule (no behaviour risk first).** Step A: a test asserts the literal in the source equals the constant
entry (a source-scan pin), so a literal cannot drift from its record. Step B, **deferred to L4 and gated on T1 and T13** (a derived threshold is a widening use), per site: replace the
literal with `constantOf(id).value`. A kernel module that reads the registry is the one place the kernel's
medium-blindness could leak, so Step B stops at the adapter and host layers (`assemblies.js` is already the
adapter/host layer, A2.4); `kernel/corroboration.js` keeps its literal and the test pins it.

### 2.7 `verdict` and `NegativeResult@1`

A verdict is an entry that **moves a claim on the ladder** (promotion, demotion, refutation, concession) with the
evidence it stands on:

```jsonc
{ "claim": "k:...", "outcome": "promote | demote | refuted | not_supported | underpowered | contested | stale | concede | attack | instrument_invalidated",   // `promote` has no force of its own (3.1); `instrument_invalidated` needs giver kind person
  "to": "L2", "because": ["k:<measurement>"], "reading": "...", "rule": "the pre-registered rule that fired",
  "outcomes": { "dracula": "SUPPORTED", "frankenstein": "FALSIFIED-INVERSE" },   // per-material, as capacity-map.js records them
  "relitigates": null }
```

**NegativeResult@1 is the set of verdicts with outcome `refuted`, `not_supported` or `underpowered`**, projected
by `deadEnds({ scope, kind })`. It is *consulted* in three places:

1. **At registration.** Overlap with a dead end is computed from the claim's `overlap_keys`: **instrument family,
   material and target, drawn from closed vocabularies fixed at ingest**, never from the claimant's free-text `scope`
   or `depends_on_claims` (the first draft judged overlap by keys the new claimant chose, so a differently keyed scope
   avoided any dead end without a `relitigates`). A new claim whose `overlap_keys` intersect a dead end's on instrument
   family and target, and on any material, is refused unless it carries `relitigates: <address>` and a stated reason
   the instrument or the data now differ. **Which negatives block:** only one whose measurement carries a run-time
   fingerprint and whose status is not `reported` (**none today, honestly**). A `reported` or prose-derived negative
   (N1 to N4, X1, X2, `LIMITS`; N4 comes from CHORUS-LOG prose and the N1 evidence file is unverified) **does not block**:
   it forces an `acknowledges: <address>` field on the new claim and is shown at registration, because an unverified
   statement should not stop real work and should not be silently ignorable either.
2. **At the consumer seam.** A lane that rests on a refuted claim reads the refutation (section 4).
3. **At planning.** `planFold` lists open dead ends beside `unmetPrerequisites` the way `capacity-map.js`'s
   `CROSSINGS` already shapes it.

**The first four entries** (Appendix A gives the full list): N1, N2, N3, N4, plus capacity-map.js's two
UNSUPPORTED_CROSSINGS and the three `LIMITS` of `capacity-place.js` (whose evidence files were removed from the
tree **[V]**, so they enter as `reported`, with `git 2f81545` named as the missing evidence).

### 2.8 `rule` (Rule@1)

The machine-readable twin of a READING-SPEC S-entry or a user standing rule:

```jsonc
{ "id": "rule:S138", "class": "reading-spec | standing | policy | constitution",
  "title": "...", "generality": "universal | specimen-scoped | not-applicable",
  "scope": { "systems": [...] },
  "from_claims": ["k:..."], "giver": { "kind": "person", "id": "mlacy" },
  "pinned_by": [{ "test": "tests/language-reach.test.js", "name": "caseless beings born at first mention" }],
  "enforced_in": ["the-fold/language-context.js::extractSurfacesHeard"],
  "amends": ["rule:S137"], "amended_by": ["k:<verdict>"] }
```

Two constraints turn the S31 tag from a label into a check (S31's own test "checks that the classification was
made, never that it is true" **[S]**): a `generality: "universal"` rule must satisfy 3.5: **the pass rate of its claim family over every system in the declared scope**, stated with a Wilson interval whose lower bound clears a registered threshold, with **any failing in-scope lineage demoting it** and the scope narrowed only by a new dated claim (the first draft's "two lineages at L3" let failures elsewhere go uncounted), or the ingest refuses it; and a
`pinned_by` test must exist in this tree and contain its `name` string. User standing rules (a name can appear once
and be a name; capitalisation is one witness; look at the slot, not the spans; the heard rule; the log is the
memory; derived not typed constants) enter (as a `claim` of kind `rule` in Build 1, as a `rule` entry in Build 3) with `class: "standing"`, **giver the user**: law by giver
(II.1), not by measurement. Their *empirical corollaries* are separate claims that can be measured and refuted;
the rule is not demoted by a corollary's failure, the corollary is.

---

## 3. The promotion ladder

### 3.0 The honest start: what the ladder can hold today

**[V by reading `run.mjs`, the rung modules and `eval/name-candidates.mjs`, 2026-10-06.]** No card in
`eval/competence` or `eval/coding-competence` can satisfy the L2 gate below:

- no instrument has a planted-effect or power arm (2.3);
- "built to fail" is not a field a card carries; controls are reported under three different conventions (2.3);
- the NL card records only the rung module's sha1, not the reader's import closure or the priors read (`run.mjs:492`);
- no card commits per-unit outcomes;
- the test-reads ledger is written only by `run.mjs`, to `/private/tmp/.../test-reads.jsonl`, a file that **does not
  exist now**; `eval/name-candidates.mjs --split test` (driven by `names/run-test.sh`, 25 `test-*.json` files now
  **[V]**) reads the TEST split without touching it, and 23 ad-hoc `bul-*` scripts iterated on dev outside any ledger
  **[S]**.

Therefore **every existing measurement is capped at L1 and the registry will hold L0 and L1 only.** That is a result,
not a defect of the design. L2 becomes reachable **per instrument family** when that family passes its conformance
test (T17: a mutated card, with the control set equal to the real arm or the power arm dropped, must demote L2 to
L1) and has a power arm and committed unit outcomes. Build 2 does that work for the competence rungs, in the order
r1, r0, then the rest, and stops where the cost is not worth it: a rung that never gains a power arm stays at L1
and the registry says so.

### 3.1 The ladder

Named L0 to L5 so it is not confused with the competence rungs R0 to R5.

| Level | Name | Entry condition (computed by the projection, never declared) | What consumers may do with it |
|---|---|---|---|
| **L0** | hypothesis | a `claim` with scope, prediction, **falsifier**, `family`, `overlap_keys`, giver. Anyone may write it | nothing at run time. Listed as an open question |
| **L1** | recorded | a `measurement` or `reported` statement is in the log and **any** L2 condition fails. The failing conditions are carried as typed reasons: `tuned_on_dev`, `no_runtime_fingerprint`, `prereg_retroactive`, `controls_unmapped`, `power_absent`, `licence_undecided`, `unledgered_test_read`, `burned`, `weak_level` | **disclose**; a fingerprinted negative may also **cap**; a `reported` negative **discloses only**. Never route, never widen |
| **L2** | measured | **all of:** (1) prereg digest committed before the first measurement entry (`registered`); (2) a run-time fingerprint whose files all still hash; (3) **one ledgered TEST read** (`split_status: single_ledgered_test_read`), dev is `tuned_on` and never counts; (4) the family's conformance mapping holds and every control mapped `built_to_fail` is **recomputed** from committed unit outcomes to have failed (the card's own flag is not read); (5) a power arm in the instrument recovered a planted effect; (6) committed unit outcomes; (7) the licence cell for `commit` is `allow` (**`undecided` caps at L1**); (8) the family-level trial accounting passes (3.5); (9) the per-rung level floor is met, else `weak_level` | **restricting uses only**: disclose, cap, route away, exclude a witness |
| **L3** | corroborated | the same claim family replicated on a second system in a different lineage, or by a second instrument, **whose ancestor graph (prior, builder, treebank, material) is disjoint from the first's, computed from the log** (`built_from`, `builder`, `fingerprint` edges; a missing edge is `unknown_ancestry` and counts as shared). Replication is counted against the family (3.5), so two chance passes among 25 stems do not qualify. No unresolved failing verdict anywhere in the claim's declared scope | restricting uses; a `universal` generality tag becomes admissible only through 2.8's pass-rate rule |
| **L4** | pinned | a test in this tree reads the committed unit outcomes, **recomputes the headline and interval from them**, and turns red under a named mutation (the repo's own mutation-tested practice); and **T1 and T13 have returned** and met their registered thresholds (3.2) | **widening uses**: route toward, raise trust, choose a witness in, derive a threshold. A changed dependency under an L4 claim **breaks the build** |
| **L5** | constitutional | wired as a row in `the-fold/constitution.js::ENFORCEMENT` with `enforced: true`, or amended into FOLD-CONSTITUTION by the person (VI.1: an amendment is a changed failing test) | the claim is law. **Only the user promotes to L5** |

**Computed, not declared.** The first draft said both that levels have "mechanical" entry conditions and that
promotion "is a verdict entry"; the second made the first decorative, because a `promote` file placed in `entries/`
passed schema and hash checks. Now: **the projection recomputes every claim's level from the conditions above on every
run and ignores any `promote` verdict whose conditions are not met, flagging it `promote_unsupported`.** CI runs that
over **all** entries, not only through the CLI (T20). A `demote`, `refuted` or `instrument_invalidated` verdict applies
by projection. A `promote` entry is a record of someone's intent and has no force of its own.

**Side states, each a typed gap:** `reported` (a person's statement of a result whose evidence exists but is not
frozen with a run-time fingerprint; N1 to N4 enter here), `contested` (two instruments disagree, both retained),
`stale:<instrument|reader|prior|material>` (a fingerprinted file changed), `unverifiable` (an external dependency
cannot be hashed here), `refuted` (a pre-registered falsifier fired on one ledgered TEST read), `underpowered` (the
instrument could not have detected it), `weak_level`, `burned` (a TEST read twice for a rung and stem), and
`declared` (a rule whose giver is a person: it binds by giver, not by measurement, and climbs only L4 and L5).

### 3.2 The asymmetry, and the order in which uses are unlocked

**Evidence can refute a license and never grant one** (READING-SPEC S19 **[S]**; the-fold ethos). So the ladder is
not symmetric:

- a `reported` negative **discloses only**. It is the user's stated result and the system must say "contested by a
  reported negative result" at once; it must not change a lane's behaviour on a result no test can re-derive;
- a **fingerprinted** negative restricts from **L1** by disclosure and cap, and from **L2** by routing away;
- a **positive** record never widens before **L4**. L2 and L3 positives are shown and used only to *restrict* (for
  example, to exclude a witness whose own rung failed). The first draft authorised route, choose-witness and
  derive-threshold at L2, so knowledge that governed run-time behaviour was validated by the very code under test;
- **widening seams ship only after T1 and T13 return** (the registry's disclosed level predicts a fresh read better
  than a script or family table, and a measurable share of consumer decisions differ with the registry versus
  stubbed empty). If T13 returns zero, the widening seams are deleted and the log stays a record.

**Staleness, one rule.** Any stale dependency, soft ones included (a file in the reader's traced closure changed),
**stops widening** with `stale:reader`; the reader is exactly what gets edited (the r3-eng-dev change), so "level kept
and disclosed" on an old reader was removed. A stale **negative** keeps restricting unless it is retired by an
`instrument_invalidated` verdict (a person) or superseded by a newer instrument version's measurement (3.6).

### 3.3 Demotion, automatically

Demotion is not an edit. It is a projection consequence:

| Event | Effect (computed) |
|---|---|
| A `refuted` verdict on one ledgered TEST read fires the claim's pre-registered falsifier | claim -> `refuted`; every `constant` and `rule` whose `from_claims` includes it -> `falsified` / `contested`; its row appears in `deadEnds()` |
| Two instruments give opposite verdicts for one claim | claim -> `contested`; both entries kept; a third (resolving) verdict is required |
| A fingerprinted file differs from the current file | `stale:<what>`; widening stops; restricting continues for a negative; CI class (7.5) decides whether the build breaks (L4: yes) |
| The instrument header, params, headline or arm set changes after a measurement entry exists | a **new instrument version and a new claim at L0**; old results linked `supersedes`, non-governing, **never re-stamped** |
| A TEST split is read a second time for a rung and stem, or by an unledgered route | the stem's claims for that rung -> `burned` / `unledgered_test_read`, **capped at L1 permanently**. "Disclosed" is not enough; it demotes |
| A person records `instrument_invalidated` for a withdrawn version | its negatives are retired from governing, **retained and shown**, never deleted |
| A failing system inside a `universal` rule's declared scope | the rule is demoted; scope narrows only by a new dated claim, never by edit (2.8) |
| A later measurement at L2 or above contradicts an earlier pass | the cell shows `contested`, and no widening use is lawful until a resolving verdict |
| A rule is amended by a refuted claim | the rule's S-entry gains the machine link `amended_by`; `generality` is recomputed; `universal` with a refuted corollary is flagged |

**The S137 case is the first demotion.** READING-SPEC S137 still tags the recurrence-plus-keyness lane "universal"
and nothing amends it **[S]**. With N1 as a verdict scoped to `admit`, the projection marks `rule:S137` `contested`
for the admission use and leaves the corroboration use (`confirm`) standing. Because N1 is `reported` today, the
marking is a **disclosure**, not a behaviour change. The prose amendment is a source edit (section 8).

### 3.4 The review gate: who may promote, and what a review is worth

The mechanical conditions are code (3.1). The **review** that precedes a promotion is a lens in the chorus sense
(`chorus-lint`): a **development-time, human-process checkpoint with no mechanical weight**. A lens run in the same
session as the author is not independent of it, and nothing at run time consults a model or a lens. The first draft
attached an `attack` entry and a lens name to every L2 to L3 promotion; the lens name is a free string and the entry
was prose. Both are replaced:

- **An `attack` entry is a `measurement` entry**: a registered control or perturbation that **could have refuted
  the claim**, with its arms, a unit-outcomes hash and a run-time fingerprint, authored by a **different giver than the
  claim** and committed (in the `after` chain) **before** any promotion it is cited for. An `attack` that is prose
  cannot be counted;
- the lens table of the first draft (Chomsky, Sullivan, Lovelace, Barker, Diaconis, Pearl, Greenberg) survives only
  as **who to ask** (undecided, section 9, item 10); naming a lens is not evidence that the lens ran;
- **Barker is `checked`** (`earned-cast.js` `DEFAULT_TRUST.barker = "checked"` **[V]**). A `checked` archon's
  verdict is advice and carries no promotion force; this is now vacuous (promotion has no force from any verdict) and
  is kept only to forbid the reverse: an archon's output is never written as an entry whose `giver` is a person.
  Barker's first competence cell is whether it recovers a planted kind (`organs/barker.js` C1 to C3);
- the person alone decides L5 and every licence cell.

### 3.5 Counting the trials (multiplicity), the smallest effect, and the word "universal"

There are about 25 stems times 6 rungs times several arms, each cell its own claim. The first draft had no
correction, so two chance passes among 25 stems would have reached L3. Rules:

1. Every claim names a **`family`** (for example `competence:hear:site-f1`). The projection **counts, per family,
   the cells, the variants (instrument versions) and the TEST reads attempted**, and prints that **trial count next
   to every level** (the `trials` field of 2.5). Relitigating or re-scoping a claim adds to its family's count.
   There is no separately stored trial ledger; it is a projection, so it cannot be skipped.
2. **L2 and L3 are computed at the family level.** A cell reaches L2 only if its pre-registered pass rule survives
   Holm correction over the family's registered cells (Benjamini-Hochberg is the alternative; the choice is
   registered per family before the first measurement). L3 is a pre-registered pass rate with a Wilson interval over
   the in-scope systems, never "any two".
3. **`generality: universal` requires the pass rate over every system in the declared scope**, stated with an
   interval, with a registered threshold on its lower bound. **A failing in-scope lineage demotes it** (it is in
   the denominator, not a separate claim). A scope may be narrowed only by a **new, dated** claim.
4. **The smallest effect of interest (SESOI) is registered per rung before the first measurement.** `MIN_EFFECT
   0.01` is a declared parameter and passes a one-point gain; it is not a SESOI. The values are undecided
   (section 9, item 11).
5. The doc forecasts most fine structure underpowered at 25 to 33 systems (6.4). The family accounting makes that
   forecast bite: an underpowered family stays at L1 and the registry says `underpowered`.

### 3.6 Versions: which measurement governs

For one `(system, rung)` with several measurements: **the latest instrument version's measurement governs**; earlier
versions are shown and non-governing. **A changed headline metric or arm set between versions is a new claim**
(r1 v1 to v2 changed the headline from all-domain F1 to site F1), and **levels from different versions are never
compared or merged**. If the latest version has no measurement, an older version's *negative* is shown as
`superseded_unmeasured` (disclosure only); an older *positive* does not govern. A negative from a withdrawn,
buggy version (r1 v1, early r3) is retired only by a person's `instrument_invalidated` and stays on the record.

---

## 4. Runtime consumption

### 4.1 Five lawful uses, and what is never lawful

| Use | Meaning | Example |
|---|---|---|
| **route** | choose which lane or assembly runs | `planFold` takes `measured` from the registry and lists dead ends |
| **disclose** | attach a typed gap the claim carries to the person | a claim read in a system whose R4 failed carries `competence_failed: r4` |
| **cap** | lower the standing class a claim may reach | a nomination from a lane resting on a refuted claim stays `provisional` |
| **choose a witness** | prefer or exclude an instrument as a witness, counted apart | an instrument whose hear-rung `failed` at L2 is excluded from the independent count with a typed reason |
| **derive a threshold** | a constant's value comes from a measurement | `null-samples` from a power card; per-system floors from the system's own window |

**Restricting and widening are unlocked at different levels (3.2).** *Restricting* uses (disclose, cap, route away,
exclude a witness) lower what a claim or lane may do and are lawful from L1 for a fingerprinted negative (a `reported`
negative: disclose only). *Widening* uses (route toward, raise trust, choose a witness in, **derive a threshold**:
a derived threshold changes behaviour in either direction, so it counts as widening) need **L4, fresh, and T1 and T13
returned**. A seam that does not say which kind it is does not ship.

**Never lawful, each with the test that would catch it** (section 10): admit a being or a claim from a record
(A4.1; the descriptor-being admission one level up); grant or transfer a standing (A1.2); weight or sum a witness
or compute a likelihood ratio from a record (`organs/corroboration.js` and `kernel/prior-query.js` both refuse
invented ratios); read a `level` measured on one system as a level for another (Greenberg, A1.2); read a missing
record as zero or as failure (IV.3).

### 4.2 The consult API

One read module, `native/knowledge/consult.js`. **Every function returns a typed row, never `null` and never a
number for an absence.** It is built in the order the builds unlock it, and it **throws `consult_forbidden_in_instrument`
when `globalThis.KHORA_MEASURING` is set** (4.5).

```
-- Build 1 ------------------------------------------------------------------------------------
priorStatus(file)                -> PriorManifest row | { gap: "no_prior_manifest", file }
deadEnds({ scope, kind })        -> [ verdict rows, each with its status: reported | fingerprinted | retracted_negative ]
-- Build 2 (restricting rows only: disclose, cap, route away, exclude) -------------------------
competenceFor(system, rung)      -> CompetenceRegistry@1 row | { gap: "no_competence_record", system, rung }
-- Deferred: each needs L4 and T1/T13 (widening), or its own gate ------------------------------
chainFor(system, rung)           -> [ rows for every rung the claim rests on ] | with gaps, never min()
constantOf(id)                   -> { value, scope, status, giver } | { gap: "no_constant", id }
licenceFor(file | material, action) -> { verdict: allow|undecided|refuse, because, needs }
-- Cut: trustFor(name) (the join to earned-cast was unspecified; 2.5) -------------------------
```

`chainFor` returns the **set** of rung records a claim rests on (a relation claim rests on identify, hear, classify,
beings and claims) so the disclosure is "r1 failed, r3 unmeasured", not a minimum. Whether failure on rung k
predicts failure on rung k+1 is itself a *claim* (it is the capacity map's crossing rule in another place, and the
capacity map's own crossings came back 0 of 2 supported **[V]**). It enters at L0 and is tested (T-L5, section 6).

### 4.3 Where it is read (the seams)

**Which seams exist in which build.** *Build 1 (live):* `grammarFor`, `language-context.js`/`language-listener.js` and
`name-candidates.js`, each **disclose only**. *Build 2:* `fold-plan`/`capacity-place` (`measured` from the registry),
`reader-bundle`/`corpus-session`/`read-door` disclosure, `cast-prior` `language_mismatch`, and the **restricting**
halves of the corroboration and kind-induction rows. *Deferred, widening, each needs L4 and T1/T13:* every "derive"
and "choose in" use, the constant sites, and the earned-cast row, which is **cut**. A row below that does not say
which build it belongs to is read as deferred.

Each row: the seam, what it reads, the lawful use, the typed gap if absent, and today's status.

| Seam (file::function) | Reads | Lawful use | Typed gap when absent | Today |
|---|---|---|---|---|
| `the-fold/language-grammar.js::grammarFor` | `priorStatus` per component, `competenceFor(system, "identify")` | **disclose** per-component absence | `no_frame_prior`, `no_role_config` (grc, lat, san) instead of `null` | silent null for grc, lat, san **[S]**; only `{language: null, gap}` typed |
| `the-fold/language-context.js::languageContextFor` and `extractSurfacesHeard` | `competenceFor(s, "hear")`, `deadEnds({scope:"admit"})`, `constantOf("recurrence-floor:admit")` | **route** (ear on or inert), **disclose** (`ear_needed_but_inert`), **cap** (heard beings from the caseless tier stay nominations while N1 is open) | `ctx.gaps[]` | silent capital fallback **[V]**; gate at line 76 is the N1-refuted lane |
| `the-fold/language-listener.js` | `competenceFor(s, "identify")`, `constantOf("language-evidence:*")` | **disclose** identification competence; **derive** STRONG/FLOOR/MARGIN | skip is silent (`continue` on `!grammar.framePrior`) **[S]** | typed skip with reason |
| `the-fold/reader-bundle.js` (the `languageContextFor` call near line 203 **[V]**) and `the-fold/corpus-session.js` (the `grammarFor` call near line 120 **[V]**, `doc.grammar = {language, gap, detected}`) | `chainFor(system, <highest rung the read uses>)` | **disclose**: `doc.grammar` gains `competence` and `gaps[]` | `no_competence_record` | `doc.grammar` has `gap` only for language |
| `the-fold/read-door.mjs` (`STAGES_NOT_RUN`, `declaredLanguage`, `truncated` **[V]**) | the same chain | **disclose** in the door's own `stagesNotRun` register: "r4 claims: unmeasured for hun" | line in `stagesNotRun` | declares extent and truncation, not competence |
| `adapters/text/recursive.js::createCausalTextPerceiver` (lines 687, 693) | `constantOf("heard-surfaces:*")`, `deadEnds({scope:"admit"})` | **derive**, **cap** | `constant_provisional` disclosed | literals |
| `adapters/text/listening-cast.js` (`ARRIVALS_FLOOR`) | `constantOf("recurrence-floor:admit")` | **cap** (a listened being below the floor is a nomination, not an admission) | falsified status shown | literal; the user's rule says born at first mention |
| `adapters/text/name-candidates.js` | `deadEnds` (N2, N3), `priorStatus(frame-<stem>)` | **disclose** the measured lift of the lane it runs; **cap** | already types `no_frame_prior`, `no_prior`, `language_unheard`, `ear_unaligned` **[S]**; adds `lane_measured_lift` | the best existing typed-gap module |
| `adapters/text/cast-prior.js::castLedgerPrior` | the sealed cast's `regime.language` vs the new encounter | **disclose** `language_mismatch`; stays nominate-only (A4.1) | `language_mismatch` | applicability checks `modality === "text"` only **[S]** |
| `kernel/corroboration.js` and `organs/corroboration.js` | `competenceFor(instrument's system, rung)`, ancestor graph from `prior` and `instrument` entries | **choose witness**: exclude an L2-failed instrument from the independence count with a reason, count an `unmeasured` one and flag it (an absence is a gap, not a verdict); **cap**: `corroborated-independently` requires every counted instrument to have a non-failed record or a disclosed gap | `witness_incompetent`, `witness_unmeasured` | `WITNESS_OPERATING_POINT` is a hand-held, model-bearing record **[V]**; no registry read |
| `kernel/nullcheck.js` (and `organs/cite.js::NULL_SAMPLES`) | `constantOf("null-samples")` | **derive** the draws from the claim's power card | `constant_provisional` | `NULL_SAMPLES = 12`, open debt in II.11 **[V]** |
| `kernel/kind-induction.js`, `kernel/entity-kind-induction.js`, `kernel/kind-functional-induction.js`, `organs/kind-standing.js::discoverCompanyKinds` | `competenceFor(system, "hear")`; derived floors | **refuse before the run** when the ear that produced the events has no passing hear-rung ("ear_not_competent"); **derive** `minMentions`/`minShare`/`minMembers` from the system's window | `kind_input_unhearable` | refuses only *after* the run (PDF stream marginal 0.82, GIF 0.66, no kinds) **[S]** |
| `kernel/completion.js::resolveAbsence` and `the-fold/void-loop.js::whatWouldSettle` | `competenceFor(system, rung of the absent act)` | **disclose**: an absence is typed `computed_and_empty` only where the rung that would have found it is `passed`; otherwise `not_computed_here` or `underpowered`. `whatWouldSettle` names the **measurement** that would settle the gap | `absence_unreadable` | absences are typed by the loop, not by competence |
| `organs/fold-plan.js::planFold` and `organs/capacity-place.js` (`EARNED`) | `competence` projection | **route**: `steps[].measured` read from the registry (a record id per capacity), not from `stagesNotRun` prose | `no_competence_record` per place | regex on prose; entity assembly with empty `stagesNotRun` reports `measured: true` **[V by reading]** |
| `the-fold/earned-cast.js::trustOf` and `proxy-runner.mjs` | nothing | **CUT** (E12): the join from a (system, rung) cell to a cast archon's trust was unspecified (2.5) | n/a | `DEFAULT_TRUST` hand-typed; `state.trust` never set **[S]** |
| `organs/barker.js` | `measurement` entries as outcomes, ancestor graph | consumed as group-T outcomes in an **EO-free envelope** (section 5.4) | `UNDERPOWERED` etc. (its own vocabulary) | profiles injected, not read from a registry |
| `kernel/rewrite-gate.js` | nothing | out of scope: it is a bounded-revise-loop stop whose `dims`, `rank`, `dt` are declared. Only a `constant` candidate | n/a | I read the header only; no competence interaction found |

### 4.4 The mouth and the firewall

The mouth is a model and the rule is L5: a compliance-critical fact is never left to the model. Three things follow
from the repo's own walls:

1. **Competence is apparatus vocabulary and never model-facing.** `the-fold/firewall.js` states the rule: "Counts,
   coverage, retrieval outcomes, the names of this instrument's own parts, and every caveat about how a list was
   built belong to the THINKING" **[V]**. "R1 failed for Hebrew" is such a caveat. It goes to the disclosure
   channel (`provenance.js` typed rendering, IV.4 shown-typed-never-blocked; III.3 the missing thing is on screen),
   never into a message handed to the model.
2. **The consequence reaches the mouth as a lowered license, not as a statement about competence.** A capped
   claim reaches the mouth with the standing word the mouth already receives, or is withheld through the existing
   "left open" register. The mouth is never asked to judge competence. `CONSTITUTION_PROMPT` already tells it "Do
   not claim that anything was checked, measured, or verified", and the 2026-08-19 amendment records that the model
   should not know it is being checked. Nothing here changes either.
3. **Knowledge addresses never reach the mouth.** An address in the model's view is an address it will write
   (`strikeAddresses`, `mouthFacing` **[V]**). The `k:` addresses must be added to the strike pattern so a record id
   cannot be written back as a fabricated citation. `APPARATUS_TERMS` gains the knowledge vocabulary (`competence`,
   `registry`, `rung`, `trust`, `cleared`, `stale`) so `assertModelFacing` fails a prompt that names it. Both are
   source edits (section 8) with a test (T10).

### 4.5 Instruments never consult the registry (the feedback loop)

Consultation changes what the reader does (route, cap, exclude a witness); instruments then measure the reader. If an
instrument ran with consultation on, a lane capped because it failed would be measured *as capped* and could never
show recovery, and a reader tuned to pass its instrument would be widened by that pass (goodharting by
consultation). Rules, each with a test (T22):

1. **Every instrument runs with consultation off.** The traced runner (7.1) sets `globalThis.KHORA_MEASURING`;
   `consult.js` throws `consult_forbidden_in_instrument` if called under it. A seeded consumer inside a fixture
   instrument that reads the registry must fail. The registry therefore describes the **raw reader**, and a cap or
   exclusion applies only in production reads, so recovery stays measurable.
2. **No file under `eval/` imports `knowledge/consult.js`** (a source-scan pin, the zero-model scan's sibling).
3. **A derived constant's giver material is disjoint from every material that later evaluates a claim depending on
   it** (2.6), and its derivation is a hashed script entry.
4. **Dev is never "held-out".** Every dev-measured level is `tuned_on`, and only one ledgered TEST read counts toward L2
   (2.3).
5. **A changed headline metric or arm set is a new claim** and levels from different versions are never merged (3.6).

---

## 5. Cross-modal

### 5.1 The shared ladder is the move the reader makes

The ladder is stated for natural language (`eval/competence/run.mjs` `RUNGS` **[V]**) and for code
(`eval/coding-competence/run.mjs` `RUNGS` **[V]**). They are the same six rungs, asked of different material:

| Rung | Medium-neutral question | NL (`r?`) | Code (`c?`) | Other media: the question the adapter must answer (all **hypotheses**) |
|---|---|---|---|---|
| 0 identify | which system is this, heard causally from the prefix? | which language | which language/system | which notation, tuning, codec, layout family |
| 1 hear | are the units where the gold has them? | word boundaries, bound morphemes | token boundaries, lexemes | note onsets, events, glyph regions, shots |
| 2 classify | can a unit, an unseen one included, name a being, and what class? | POS class of unseen words | token class | pitch class, voice, region type |
| 3 beings | are the referents found? | entities with case stripped | entities the text declares | motifs, voices, tracked objects |
| 4 relations | who did what to whom? | claims | calls, imports, inheritance | progressions, interactions |
| 5 agree | do parallel representations yield the same beings and relations? | parallel text | same algorithm in many languages | transcription vs score; caption vs image |

NL and code are measured. **Notation has no measured instrument in this tree.** When this was first written `eval/` held `barker`,
`coding-competence`, `competence`, `lavar`, `law`, `language-reach.mjs`, `name-candidates.mjs` and
`reading-helps-falsify.mjs` and no `notation-competence`; at 01:39 on 2026-10-06 a `notation-competence/` directory
appeared (another session): a corpus library `genetic-lib.mjs` and a `chem_smiles-data/` folder, with no rung driver
and no card **[V]**. It is in progress and unmeasured, and the ladder owes it the same fingerprint, ledger and
conformance discipline as the others (M5). BARKER.md lists "Notation 0". The task text
that listed it as existing is not backed by files here. The right-hand column is a proposal that the ladder is the
right ladder for other media. It is not a finding.

Because the rung ids are shared, the registry has one key shape, `system x rung`, and one record. `system` is the
Barker `SystemProfile@1.id` convention (`nl:<stem>@...`, `code:<lang>@grammar:...`, `notation:...`) and must stay
**free of EO words** (BARKER's contamination scan rejects `cell`, `operator`, `terrain`, `grain`, `stance` in a
profile identifier). Modality is a typed field on the record, not a prefix the kernel parses.

### 5.2 Who owns what

| Layer | Owns | Medium-blind? |
|---|---|---|
| Kernel (`kernel/*`) | the act of reading: encounter -> perceive -> witness; notes and standing (`kernel/notes.js::standingOf`); nullcheck; kind induction; the window; the knowledge log, projections and `consult` | yes (header, S6, S16). `kernel/index.js` re-exports the reading chain; kind inducers, corroboration, nullcheck, identity-* and prior-query are reachable by path only **[S]** |
| Adapter (`adapters/<medium>/`) | the **ear** (unit boundaries), the **address grammar** and its coordinate space, the perceiver, the **instruments** for its rungs, the ingest adapter for its cards | no. This is where the medium lives |
| Received priors (`priors/`) | grammar-specific tables (POS, frame, role-config, proclitic, keyword, lexicon) | no. Each is one system's, with a giver and a licence |
| Knowledge log | claims, measurements, verdicts about all of the above | yes. A record is about a system; the log is not |

The only modality that implements the reader contract (`perceive(encounter, orientation, nominations)` with
`Encounter@1.modality` and a prior's `applicability`) in the tree is text **[S]**. Code has its own instruments and
no recursive-reader perceiver. Other media reach the kernel through side doors: event-stream arrangements into
`kernel/notes.js`, descriptor stores (`organs/mnemonic.js`), raw streams straight to medium-blind organs, and the
screen sidecar **[S]**. **Importers, checked here [V]:** `adapters/audio/*` is referenced only in comments by
`organs/mnemonic.js` and `kernel/shadow-echo.js`; `adapters/video/material.js` and `adapters/math/*` have no
importer outside their own folder; `adapters/midi/midi.js` is imported only by `adapters/build/music-medium.js`;
`adapters/image/*` is imported by `organs/look-screen.js`, `screen-style.js`, `mnemonic*.js`. KHORA.md's
"omnimodal" is a statement about code that exists, not about wired paths.

### 5.3 What transfers across modalities, and what cannot

Transfer is of **procedure and kind of knowledge, never of a value**. Every system re-earns its own standing (A1.2).

| Knowledge | Transfers as | Evidence in-modality | Evidence cross-modal | Status |
|---|---|---|---|---|
| **Window measurement** (the settled extent a reading needs, derived from the material's own distribution; S16) | the *procedure* | text only, at specimen scale | none | hypothesis; measure first on text vs code (CM1) |
| **Standing by null** (permutation count against the material's own null; `kernel/nullcheck.js`) | the procedure | text | none | the procedure is medium-blind by header; unmeasured elsewhere |
| **Identity by fold survival** ("spans that survive are the same referent") | the procedure | none yet (LAW-FALSIFICATION T11, no result) | none | hypothesis, pre-registered |
| **Boundary by surprise** (`kernel/surprise-segments.js`, the ear) | the procedure | text ear measured on R1 (mixed results, section 1.3) | scout reports a PDF stream and a GIF formed no kinds **[S]** | hypothesis |
| **Slot ablation** (ablate tokens, read the slot's impulse response) | the procedure | none yet (LAW-FALSIFICATION R1) | none | hypothesis |
| **Independent witnesses counted apart, never summed** | the rule | `organs/corroboration.js`, `barker` independence audit | planted fixture only (T5) | mechanism; cross-modal unmeasured |
| **Typed gap, never a silent default** | the rule | yes | yes (a structural rule) | law |
| **Grammar-specific priors** (POS, frame, role-config, proclitics, keywords) | **nothing**. Greenberg: never another system's grammar as a fallback | N2: the frame prior adds ~+0.01 to +0.02 over random unseen words **[U]** | none, and none should be expected | cannot transfer; and in-modality value is small |
| **Kind priors over systems** (Barker: a system's kind predicts its parameters) | a *nomination of a parameter range with an interval*, to size a sample or choose which prior family to try first. Never a value | leave-one-family-out, pre-registered, no result (`eval/barker/transfer.mjs`) | within-modality first; none cross-modal | hypothesis |

### 5.4 Cross-modal corroboration: independent instruments at one address

The reasoning is the repo's own. Standing counts **sources apart from instruments**; `standingOf(note)` returns
`sources`, `instruments`, `standing` (`zero-witness | single-witness | corroborated | corroborated-independently`);
independence is distinct `sourceOfWitness` **and** distinct `recipeOfWitness` **[V by reading, S]**. "Two sources
through one instrument are two SOURCES and ONE READING" (`organs/corroboration.js`). The witness grammar is
`[kind:]<ref>[#address][~recipe]` with a coordinate space declared per medium (text bytes, MIDI ticks `midi:t<n>#<tick>`,
event ordinals `#e<i>-e<j>`, math `bytes:`, image pixel regions, audio samples **[S]**).

**What the knowledge records add, and what they must not.** The ancestor graph that decides independence is
*already recorded in the log*: a `prior` entry's `built_from` names its treebank; an `instrument` entry names the
priors it reads. Two instruments whose priors share one giver are one witness. This is not an abstract worry. The
parser's lexicon and Sullivan's cues "were both learned from UD_English-EWT, so 'corroborated' was two readers of
one giver agreeing" (CHORUS-LOG 2026-09-25, Pearl **[V]**). With the log, that audit is mechanical (Barker's
`independenceAudit`: connected components of the ancestor graph = effective N).

A cross-modal corroboration is lawful when **all** hold, and each has a typed refusal:

1. **A declared bridge between the coordinate spaces** (`organs/bridges.js`, `organs/bridge-witness.js` exist); no
   bridge -> `no_bridge`. Without one, `noteId` merges by string coincidence (defect 9), which is the failure the
   bridge exists to prevent.
2. **The two witnesses' instruments have disjoint ancestors** in the log, **computed from the `built_from`, `builder` and `fingerprint` edges and never asserted** (a missing edge is `unknown_ancestry` and counts as shared); shared ancestor -> counted as one with `shared_ancestor`.
3. **Neither counted instrument is competence-failed at L2** for its system and the rung the claim needs;
   failed -> excluded with `witness_incompetent`; **unmeasured** -> counted and flagged `witness_unmeasured`, never
   silently dropped and never promoted to the independent class on faith.
4. **It is counted, never weighted.** A competence level is never a vote weight and never a likelihood ratio.

**Source edits this implies** (section 8): `noteId` must carry a medium or system component and not lowercase a
case-significant identifier (the defect is latent today because nothing in `adapters/code` calls `hear`/`admit`
**[S]**, and it contradicts the standing rule that capitalisation is one witness, not the signal); the headline
`standing` string must say when a join was bridge-assumed.

**EO envelope.** If a record is typed with a cube cell or operator (`task-log` carries optional `operator`,
`operator_basis`, `grain`; `assemblies.js` cells are derived by `cellOf`), the typing lives in a separate optional
`eo` envelope on the entry. **Correctness never reads it.** Barker is testing EO and its contamination scan
rejects identifiers carrying EO words while it consumes competence records as group-T outcomes. Barker reads
`measurement` bodies and the ancestor graph, never the `eo` envelope. Whether to type acts at all is argued in
section 9.

### 5.5 The interface a new modality owes

A modality is added by implementing this contract and nothing in the kernel changes. Each obligation is one test in
`tests/knowledge-modality.test.js` (T14), whose control is a toy modality missing exactly one obligation.

| # | Obligation | Source it extends | If missing |
|---|---|---|---|
| M1 | an `Encounter@1.modality` string and an address grammar with a **declared coordinate space and a self-verifying read-back** (THE-ADDRESS A3) | `kernel/notes.js` witness grammar | typed `unaddressed`; notes refuse |
| M2 | an **ear**: unit boundaries, with a report of whether it is needed and whether it is inert | `adapters/text/ear.js` | `no_ear` gap (rung 1) |
| M3 | **received priors**, each with a `prior` manifest (giver, licence, hash, split), or a typed `no_prior` per component | `priors/`, this document | `no_prior`; the licence gate refuses an unlicensed one |
| M4 | a **perceiver** that only nominates and refuses a modality mismatch | `kernel/perception.js`, `adapters/text/cast-prior.js` | the modality reaches the kernel only by a side door, disclosed |
| M5 | an **instrument per rung** to the rung contract: `export RUNG, measure({system, split, limit}) -> {n, score, control, controls, gaps, details}`, with controls built to fail (no-ear identity arm, wrong-prior arm, scrambled arm, majority oracle), held-out gold with a recorded hash, a **planted-effect (power) arm**, a pre-registration header **committed before the first measurement**, TEST opened only through the shared opener (`testread` entries), and a **run-time fingerprint sidecar** | `eval/competence/run.mjs`, `lib.mjs` | the rung is `unmeasured` |
| M6 | a **system id** in the Barker convention, EO-word-free | `docs/BARKER.md` 3.1 | the profile is refused |
| M7 | a **gap vocabulary** per rung (IV.3's six silences) | `eval/competence/run.mjs::holeFor`, `verdictOf` | a missing value reads as zero |
| M8 | an **ingest adapter** from the instrument's card to `measurement` entries | section 7 | the result stays volatile |
| M9 | a **zero-model source scan** over the instrument and ear files | `tests/barker-organ.test.js:569` pattern | the scan fails |
| M10 | a **licence declaration** for every gold and prior | section 2.4 | the gate returns `refuse` |

What the kernel provides for free: notes, `hear`/`admit`, standing and independence, nullcheck, kind induction,
the window, the knowledge log and `consult`.

**Status by modality, honestly [V unless tagged]:**

| Modality | M1 | M2 | M3 | M4 | M5 | Wired into a reading path? |
|---|---|---|---|---|---|---|
| text | yes | yes (`ear.js`, 25 stems measured) | yes, the priors above with the provenance defects named in 1.3 | yes | R0 to R5 | yes |
| code | partial | token lexers | 32 code priors, `CodeKeywordPrior` etc. | no recursive-reader perceiver **[S]** | C0 to C5, 52 cards **[S]** | own instruments, not the recursive reader |
| notation | no | no | none | no | none (a corpus library and data folder in progress, 01:39; no rung driver or card) | no |
| audio | locate() with seconds **[S]** | windows | none | no | none | no importer |
| image | pixel regions | screen-read | none | sidecar | none | `look-screen.js` live |
| midi | tick addresses | parse | none | no | none | via `music-medium.js`, which nothing imports |
| video | index only, no locate **[S]** | transitions | none | no | none | no importer |
| math | byte addresses into serialization; best-formed adapter **[S]** | n/a | n/a | no | none | no importer |

### 5.6 How to measure the cross-modal claims

Most are unmeasured. Each is pre-registered with a control built to fail, a registered smallest effect of
interest, and a statement of what its failure means.

- **CM1: does window measurement transfer as a procedure?** Derive the settled window of a stream from its own
  distribution on two modalities that each have a gold (text via UD; code via the coding gold). Claim: the
  per-system derived value beats a single global constant on held-out units in both. Controls: global constant;
  shuffled stream (built to fail: the window must collapse); a different system's window (the "transfer the
  value" arm, expected to lose). **If the derived value does not beat the global constant in both, the procedure
  transfers nowhere and the window claim is scoped to text.**
- **CM2: cross-modal corroboration against a planted truth.** Plant one claim at known addresses in a text and in
  a second modality fixture; run two competent instruments, one incompetent instrument, and two instruments sharing
  an ancestor. Claim: registry-aware standing assigns `corroborated-independently` to the planted claim and not to
  the decoy more often than registry-free standing. Controls: registry-free standing; a shuffled address bridge.
  **If registry-aware standing is no better, the competence and ancestor reads are decoration.** (T5.)
- **CM3: code and the prose about it, the first real cross-modal pair.** Both media have instruments in the tree.
  The gold is derived mechanically: identifiers a docstring or comment names between backticks that resolve to a
  declared name in the same file. This gold has a known bias (only backticked mentions; it overstates how clean
  prose naming is), stated in the card. Claim: a being found in the prose and a being declared in the code, at the
  bridged address, are corroborated more reliably than either alone. Control: bridge shuffled across files.
  **Failure means the two media's beings do not share identity at the string level, and corroboration across them
  needs a richer bridge than the one built.**

---

## 6. Enhancing logos

### 6.1 The gap

Logos is the reasoning apparatus: kind induction, relation composition, corroboration, the evidentiary walk,
reference, memory and identity (README Handles; archon-holocracy labels 17 of 26 archons logos **[S]**). Today it
reasons over its **material** as if every instrument were equally competent in every system. It has no way to say:
*this claim rests on a rung that was never earned in this language*, or *"nothing found" in this system means the
reader could not hear it, not that nothing is there.* Intake gives logos a second object of reasoning, **its own
instruments**, with the same discipline it applies to material: standing by evidence, typed absence, independence
counted, no invented numbers.

### 6.2 Six channels, with the seam each uses (section 4.3 has the call sites)

1. **Competence-aware silence typing (completion, whatWouldSettle).** The registry decides which of IV.3's six
   silences a null result is. **The lawful early form is the restricting one**: an empty result in a system whose
   rung that would have found the thing is `failed`, `weak_level` or unmeasured is typed `not_computed_here` or
   `underpowered`, never `computed_and_empty`. **Typing an absence `computed_and_empty` is a widening claim (it says
   "there is truly nothing") and needs L4.** `whatWouldSettle` names the *measurement* that would convert a gap into
   knowledge, so **gaps become a work queue** (Rule 3: gaps are results).

2. **Competence-aware standing (corroboration).** Witness choice and the independent count read the registry and
   the ancestor graph (5.4). Counted, never weighted.
3. **Derived thresholds (nullcheck, kind induction, listening and surface lanes).** A floor comes from the system's
   own measured window or a claim's power card, with the constant recorded as `derived` and naming its run (II.11).
   The user's rule fixes the direction: admission is first mention (floor 1); derived floors govern *standing* and
   *confirmation*, which is where `CANONICALIZATION_FLOOR` already lives.
4. **Pre-run refusal in kind induction.** Refuse to induce kinds over events whose hear-rung has no passing record
   (`ear_not_competent`), and derive `minMentions`/`minShare`/`minMembers` per system. Today the organ refuses only
   after running **[S]**.
5. **Dead-end consultation (planning and registration).** The same dead end is not walked twice without a stated
   reason (2.7).
6. **Metastructure as prior over systems (Barker).** Induced kinds of systems nominate a parameter range with an
   interval for an *unmeasured* system, to size a sample, choose which prior family to try first, or flag a rung
   that fails for a structural reason shared across a kind. It never supplies a value and never admits.

**Which channels are live early.** Only the restricting halves: channel 1's `not_computed_here`, channel 2's
exclusion of a witness whose own rung failed (and the flag on an unmeasured one), channel 4's pre-run refusal, and
channel 5's dead-end consultation (Build 1 discloses; Build 2 plans). Channels 3 and 6 (derived thresholds, kind
priors over systems) and channel 1's `computed_and_empty` and channel 2's "choose a witness in" are **widening** and
wait for L4 and for T1 and T13. This is a cut from the first draft, which let L2 govern them; the logos benefit
that survives early is *honest silence and honest exclusion*, and the benefit that must be earned is *confidence*.

### 6.3 How the pending designs feed it

- **Barker** consumes `measurement` entries as group-T outcomes and the ancestor graph as its independence input;
  its lineage is the unit of independence (9 lineages, 13 branches, per BARKER.md). The profile is EO-free. Barker
  earns the right to *clear* a promotion by passing its own planted-world calibration (C1 to C3), until then it
  advises (3.4).
- **The company/holograph-impact law and beings-by-physics** enter as `claim` entries at L0 with their falsifiers
  and pre-registration hash frozen **in the repo** (today the freeze is `/private/tmp/claude-501/law/PREREGISTRATION.sha256`,
  volatile). A result from `eval/law` becomes a `measurement` and, if a pre-registered falsifier fires, a
  `refuted` verdict that demotes anything that cites it. Trajectory, slot-ablation impulse response and
  identity-as-fold become *seams* only after they pass L3 across at least two systems, and the user's rule
  governs meanwhile: look at the slot, not the spans; same referent = the fold survives substitution.
- **N2 and N3** become the stated, consulted ceiling of the frame-based nominator: the frame prior is a
  nomination aid worth ~+0.01 to +0.02, and a stronger peer exists. A peer whose route is a trained model
  (the spaCy route) cannot be a call site in a zero-model reader. It is recorded as an external comparator that
  sets the bar `nameCandidates` is measured against, not as a witness to route to **[U on the peer; I have not
  inspected its route]**.

### 6.4 What would show it helps, and what would show it does not

Pre-registered here, with the code to be written after this document is frozen (the practice BARKER.md and
LAW-FALSIFICATION.md follow). All on held-out stems; the unit of replication is the lineage, not the sentence.

| Test | Claim | Controls (built to fail) | Falsified if | Then |
|---|---|---|---|---|
| **T-L1 silence typing** | among empty R4 results, `P(miss | typed computed_and_empty) < P(miss | typed not_computed_here)` with the interval above a registered SESOI | (a) random typing at the same base rates; (b) typing by script or family only | the difference is within SESOI, or no larger than the script-only typing | the registry adds nothing beyond "which script"; keep the typed gap (it is honest disclosure), drop the claim that it is *informative* |
| **T-L2 derived floors** | per-system derived confirmation floor beats the fixed floor 2 on held-out confirmation precision at matched recall | fixed 2; fixed 1; a floor derived from the wrong system | not better than the best fixed floor | derivation is theatre; constants stay `declared` |
| **T-L3 kind priors bootstrap** | Barker's induced kinds predict a held-out family's parameter better than global mean, nearest script and random kinds | those three; label permutation | not better than nearest-script | kinds of systems are scripts; the logos claim for Barker is refuted at this n |
| **T-L4 corroboration** | competence-aware standing separates planted truth from decoy better than registry-free | registry-free; shuffled bridge | no better | the competence read is decoration (CM2) |
| **T-L5 rung dependence** | a system's R_k failure predicts R_{k+1} claim errors across the 25 stems, beyond script/family | script-only predictor; shuffled stems | not beyond script | `chainFor` returns the set anyway (no min); the dependence claim is dropped |
| **T-L6 decision difference** | with the registry, a measurable share of consumer decisions (route, cap, exclude) differ from without it on a fixed read set | the same run with the registry stubbed to empty | **zero** decisions differ | the registry is documentation with extra steps; delete the consumer seams, keep the log as a record |

**What will probably come back, said before the run:** most fine structure underpowered at 25 to 33 systems; the
"kind" of a system largely the script or the family (BARKER.md's own forecast); T-L1 informative only where the
per-system level varies widely (it does: 0.63 for Hebrew R1 against 0.99 for German); T-L2 unlikely to beat fixed
floors on cased scripts and possibly informative on caseless ones. If T-L6 returns zero, that is the most useful
single result the design can produce.

**Ordering and multiplicity of these tests (review).** T-L1 to T-L6 are registered families like any other (3.5): the
trial count (cells, variants, TEST reads) is printed with each result, and a T-L that is re-scoped or re-run is a new
variant, not a replacement. **T1 and T13 gate every widening seam**; T-L1, T-L4 and T-L5 gate the specific logos seams
they name; no T-L result is read as a finding until it is run against a ledgered single TEST read on stems whose TEST
was not read by an unledgered route.

---

## 7. The ingest pipeline

```
traced run -> card + fingerprint sidecar (volatile) -> INGEST -> proposed -> REVIEW GATE -> entries/ + HEAD -> projections -> consult -> seams
 (wraps the     taken AT RUN TIME, not at ingest      normalise,   proposed,   mechanical     content-        competence,     typed       restrict first;
  existing                                            hash, tier   not read    checks C1-C12 addressed,       deadEnds,       rows,       widen only at L4
  driver)                                             scan         by anything               append-only     priors          never null
```

### 7.1 Stages

1. **Traced run (a precondition of ingesting any card as a measurement).** `knowledge/run-traced.mjs` (new; **no
   existing file is edited**) starts the existing driver as a child process with a module-loader hook and a log of
   every file the process opens, and sets the env var `KHORA_MEASURING=1`, which its `--import` hook turns into `globalThis.KHORA_MEASURING` (4.5). At exit it writes `<card>.fingerprint.json`:
   the sha256 of **every repo file loaded or read** (instrument, the reader's import closure *as traced*, every
   prior and data file the run opened by any path), every gold file read (path and sha256, or `unverifiable` with a
   reason where it cannot be hashed in this environment), the instrument's header digest, the card's own sha256 and
   size, and the node version. The closure comes from a **runtime trace, not a static import scan**: a static scan
   misses priors and data loaded by computed paths and dynamic `import()`, and it could not say how `depends.priors`
   was determined. Anything the trace cannot see (a spawned subprocess such as `coding-competence/gold.py`, a
   network read) is listed in `unverifiable`, which caps; the trace is a hook, not an oracle. This **replaces the first draft's E7 source edit** to `lib.mjs`; the retro-stamp of
   `headerDigest` into rungs that lack it is dropped (2.1).
2. **Ingest** (`knowledge/ingest/<family>.mjs`, read-only over the output). Three outcomes, decided by the sidecar and
   never by the clock alone:
   - **no sidecar, or the sidecar's card hash differs from the card's, or the card's mtime is later than the
     sidecar's**: recorded **only** as `reported`, L1, `depends: unknown`, `no_runtime_fingerprint`,
     non-governing, **and it can never be upgraded** (a later run under the wrapper writes a new measurement). It
     is history, not a measurement that could ever reach L2. This is the case for every card in `/private/tmp`
     today, including r3-eng-dev and r1-deu-dev;
   - **a sidecar whose listed files no longer all hash to the recorded values** (the reader or a prior changed after
     the run): recorded as a measurement *of that older state*, `stale` at birth, never governing and never
     widening. It is **not** stamped with today's hashes;
   - **a sidecar whose files all still hash**: recorded as a measurement; levels computed by the projection (3.1).
   It runs the instrument's own `verdictOf` and does **not** re-score; renames `margin` to `effect_over_control`;
   copies the compact card (numbers, arms, gaps, never sentence text) and the **committed unit outcomes**; records the
   raw file's sha256 and size; runs `artifactTierViolations` on the body; and proposes the entry (written, not yet in HEAD, so nothing reads it).
   Volatile raw outputs (547 MB under `competence`, 626 MB under `coding-competence` **[V, earlier read]**) are
   *referenced by hash*, not committed.
3. **Review gate.** Mechanical checks C1 to C12 (7.2). A lens review, where one is wanted, is a process note with no
   mechanical weight (3.4). Passing the checks moves the entry to `entries/` as an append and updates HEAD.
4. **Projections.** `knowledge/project.js` (pure) computes levels, the registry, `deadEnds`, prior status and
   staleness. A generated human view `knowledge/REGISTRY.md` is committed and a test fails if it differs from the
   projection (regenerate, never adapt, A3.2). **It proves nothing about deletions; HEAD does (2.0).**
5. **Consume** through `consult.js` only (4.2).

### 7.2 The mechanical checks (the review gate's first half)

| | Check | Refuses |
|---|---|---|
| C1 | schema and closed type set; `falsifier`, `family`, `overlap_keys` present and from the closed vocabularies; a body field not in the schema | an unversioned, falsifier-less or free-keyed entry |
| C2 | every **repo-internal** hash resolves (instrument, priors, evidence copies, raw): absent -> `broken_citation`. An **external** dependency that cannot be hashed here (gold absent) is `unverifiable`, not `ok` | a citation to a repo file that is absent |
| C3 | pre-registration is an **ordering fact** (2.1): `prereg.committed_in` resolves and precedes the first measurement entry for that instrument id; the digest equals the header at that commit. Otherwise `prereg: retroactive`, capped at L1 | a claim set after seeing the result (II.5); a header edited after results |
| C4 | control conformance: the family's mapping assigns each control a role (T17), and every `built_to_fail` control is **recomputed from committed unit outcomes** to have failed. The card's own flag is never read | a pass against a control that did as well (II.23); an unmapped control |
| C5 | power: the **instrument** has a planted-effect arm and recovered it. Absent -> `power_absent`, capped at L1. **No instrument has this today (2.3)** | an underpowered result presented as a pass |
| C6 | split discipline: every TEST open is a `testread` entry (below); a second TEST read of a rung and stem is `burned`; an unledgered route caps that stem's claims at L1 permanently | held-out gold used twice, or read by a route the ledger never saw |
| C7 | licence gate on every `material` and `prior` the entry depends on: **`commit` must be `allow` for L2; `undecided` caps at L1** (2.4) | an `unknown` or undecided licence under a promoted claim |
| C8 | zero-model scan over the instrument and ear files (the `tests/barker-organ.test.js:569` pattern: no `model-server`, `mouth.js`, `node:http(s)`, `fetch(`, `embedding`, `openai`, `anthropic`) | an instrument whose score can depend on a model |
| C9 | **no gold sentence text in the body**, implemented as (a) a body-field **allowlist** from the schema and (b) an **n-gram overlap scan** of the body against the gold files when they are present (any run of 8 or more consecutive gold tokens fails). With gold absent the scan is `unverifiable` and the allowlist alone applies, and the entry says so. A keys-only tier scan is not C9 (r1 cards embed forms and counts) | embedded licensed text; `margin`/`present` keys |
| C10 | a run-time fingerprint is present and consistent with the card (7.1 stage 2) | a card ingested as a measurement without one |
| C11 | HEAD ratchet (2.0 and T19) | a deleted or unlisted entry |
| C12 | family conformance (T17): the family's conformance test passes on a mutated card (control set equal to the real arm; power arm dropped) by demoting L2 to L1 | a family whose L2 gate does not bite |

**The `testread` entry (the ninth type).** `{ stem, rung, material, instrument_fingerprint, route }`, written by a
**shared opener** that every driver reading a TEST split must go through (`knowledge/open-test.mjs`: it appends the
entry, then returns the path). The ledger the first draft left in `/private/tmp` is thereby in the repo and hashed.
Back-filled at once: the 25 stems for which `names/test-*.json` exist are recorded as `route:
unledgered:name-candidates` (their TEST was read outside any ledger), so those stems are **capped at L1 for
name-candidate claims for ever**, and the doc says that this costs future held-out material for those stems.

### 7.3 Idempotence and hashes

The address is the full sha256 of the canonical JSON of the entry (sorted keys, no `address`). Ingesting the same
card twice writes nothing. **Same inputs, different result is itself a finding**: the ingest records a
`nondeterministic_instrument` verdict naming both outputs, because the instruments are seeded and a changed result
under identical fingerprints means a hidden dependency. The r3-eng-dev observation is the other case: different
result, *different* dependencies, which the sidecar would now show.

### 7.4 Staleness when priors or instruments change

Every `measurement` carries its run-time `fingerprint`. `staleness()` re-hashes current files and reports differences.
**One rule: any stale dependency stops widening**, the reader's traced closure included (3.2). The tiers differ only in
what breaks the build:

| Dependency state | Registry | CI |
|---|---|---|
| a file the fingerprint lists changed (instrument, traced reader closure, a prior, the gold) | `stale:<what>`; widening stops; a negative keeps restricting | prints at L1 to L3; **breaks the build at L4** |
| an external dependency cannot be hashed here (gold absent, UD release not pinned) | `unverifiable`: **caps and discloses** | neither red nor green; listed in the report. The `material` entry must carry the pinned UD release or commit and per-file hashes so it *can* be verified where the data is |
| a repo-internal citation is missing (instrument, prior, evidence copy, raw) | `broken_citation` | **always breaks the build** |
| the instrument version is superseded | non-governing (3.6) | none |

The first draft said both "absent -> `broken_citation`, always breaks the build" and "V3 skipped without data", so
in CI, where the gold is absent, either every build was red or an external dependency was silently unchecked.
`unverifiable` is the third state. A **stale-prior test** is the load-bearing one: change one byte in a prior and the
registry must mark every measurement whose fingerprint lists it `stale`, and an L4 claim resting on it must turn the
build red. (T2.)

### 7.5 What CI verifies, in three classes

- **V1 record integrity**, always in CI: schema, HEAD, hashes resolve (repo-internal), projection equals
  `REGISTRY.md`, citations exist, every `pinned_by` test exists and contains its `name`, tier scan, zero-model scan,
  licence ratchet, `promote_unsupported` over every entry (T20).
- **V2 recompute from committed evidence**, in CI: for any record whose compact evidence is committed (the small ones:
  `deid/*.json`, `names/test-*.json`, capacity-map's outcomes, and every measurement's `unit_outcomes`), a test
  recomputes the number from the evidence. **A second implementation of the scorer is wanted and not required for L4;
  the recompute of aggregation and interval from unit outcomes is required.** This is the pin `capacity-map.test.js`
  had and lost.
- **V3 re-measure**, on demand (`knowledge/remeasure.mjs`, deferred): re-runs the instrument on the pinned gold and
  compares; reports `unverifiable` where the data is absent. `scripts/fetch-ud-eval.sh` pulls UD `master` **[S]**, so
  the release or commit must be recorded first.

An L4 claim needs V1 and V2. V3 is what promotes L2 to L3 on replication.

---

## 8. Migration plan

### 8.1 Three builds, and what each unlocks

The first draft had twelve steps and a framework before its first runtime value. The panel's finding is that most of it
rested on a measurement path that cannot yet exist (3.0). The plan is now three builds. **Build 1 is days and needs no
measurement.** Build 2 is the work that makes measurement admissible. Build 3 is a list of gated items, each with the
result that must come back before it starts, and any of which may be deleted by that result.

| Build | Do | New files | Existing files touched | Pinned by | Size |
|---|---|---|---|---|---|
| **1** | **Record the negatives, list the priors, make two silences typed, disclose the reported negatives.** (a) `entry.js`: closed type check, canonical JSON, **full-hash** address, HEAD and its hash. (b) `add.mjs`: the only writer. (c) Write `claim` + `verdict` (status `reported`) entries for N1 to N4, capacity-map's X1/X2 and `LIMITS` (evidence listed as missing where it is), the `testread` back-fill for the 25 name stems, L0 `claim` entries for Barker, the law, beings-by-physics, and the user's standing rules as `claim`s of kind `rule` (giver the user; no `rule` type yet). (d) `manifest-priors.mjs`: one `prior` row per file in `priors/` (233 now **[V]**), generated from the file: sha256, schema, language, giver as written, licence label as found, `built_from_basis: inferred` unless an input hash exists, **hashes and non-derived metadata only** (2.4). (e) `licence-gate.js`: the table and the ratchet, no decisions. (f) `consult.js`: `priorStatus` and `deadEnds` only. (g) Seams (below). | `knowledge/{entry,add,manifest-priors,licence-gate,consult}.{js,mjs}`, `knowledge/entries/**`, `knowledge/HEAD`, `knowledge/HEAD.sha256`, `tests/knowledge-{record,priors}.test.js` | **E1, E2, E3a, E13** (additive fields only; section 8.3) | T3, T4, T7, T9, T10, T15, T19 | days |
| **2** | **Make measurement admissible.** (a) `run-traced.mjs` and the fingerprint sidecar; (b) `open-test.mjs` and the three TEST-opening drivers routed through it (E7b); (c) per-family conformance tests (T17) and the family `role` mapping, written by a person; (d) a **planted-effect arm per rung**, r1 first (E7c: additive exports only, `lib.mjs`'s own rule); (e) unit outcomes committed; (f) `instrument` and `measurement` types enabled in `entry.js`; (g) ingest for r0 to r5 and c0 to c5 **only for cards that carry a sidecar**; (h) `project.js` computing levels, the trial counts, `weak_level`, `stale`, `unverifiable`; (i) `competenceFor` for **restricting** uses; (j) the family trial accounting (3.5); (k) the restricting seams of 4.3 | `knowledge/{run-traced,open-test,project,fingerprint}.mjs`, `knowledge/ingest/**`, `knowledge/REGISTRY.md` (generated), `tests/knowledge-{project,conformance}.test.js` | **E7b, E7c**, then the Build 2 seams of 4.3 | T2, T6, T16 to T22 | weeks, per rung |
| **3** | **Gated.** Each item starts only when its gate has returned, and **a gate that returns zero deletes the item**: widening seams (L4, after **T1 and T13**); constants and `constantOf` (L4); the `chainFor` / silence-typing form that types `computed_and_empty` (after T-L1); kind-induction pre-run refusal (restricting form first, after T-L5); competence-aware corroboration (restricting form first, after T5); `rule` entries and constitution wiring (L4, L5, the user); cross-modal contract test, Barker consumption, CM1 to CM3 | as the item needs | E4, E5, E6, E8 to E11, E14, E16, E18 as dispositioned in 8.3 | the item's own T-L or T-test | by gate |

**Build 1 seams (disclose only, additive).** (1) `the-fold/language-grammar.js::grammarFor` returns
`gaps: [{component: "frame", reason: "no_frame_prior"}]` (and role, proclitic) where it returns a silent `null` for grc,
lat, san and any stem missing a component (E1). (2) `the-fold/language-context.js::extractSurfacesHeard` and
`the-fold/language-listener.js` record the capital-only fallback and the `continue` on a missing `framePrior` in
`ctx.gaps` instead of silently (E2). (3) The caseless-tier heard beings and `adapters/text/name-candidates.js` carry the
**`reported` dead ends** they rest on, by slug (`reported_negative: "recurrence-admit"`, `"frame-prior-ceiling"`,
`"peer-route-beat"`), not by `k:` address (E3a). (4) E13 strikes `k:` addresses and the knowledge vocabulary from
anything model-facing. None changes a decision.

**What Build 1 is worth, and what it is not.** It preserves the user's three negatives and the role-config absence
as hashed, consultable entries; it turns the 233 prior files into a table that shows exactly which are `unknown` on
licence, which have no input hash, and which the gate would refuse; it makes the silent `null` and the silent
capital fallback typed (IV.3); and it makes the N1 contradiction ("a being is born at first mention" against the
two-mention admission gate that is still in the code) a *visible, consulted fact*. It does **not** change a lane's
behaviour, because a `reported` result may lawfully only be disclosed (3.2), and it contains no measurement. If a
reviewer reads that as thin, the answer is that it is the part that is knowledge today; the rest waits for the
instruments to earn it.

### 8.2 What to do first with a limited budget

**Build 1, only.** Four small modules, two test files, five additive source edits. Everything else is gated on
something Build 1 does not need. If the budget allows a second item, it is `run-traced.mjs` and the fingerprint
sidecar alone, run once over `r1` for two stems: that is the cheapest way to turn "the card was rewritten under the
reader" into something detectable, and it is a precondition for every later claim.

### 8.3 SOURCE EDITS (for the main agent; I made none), with the panel's dispositions

Each is a change to an **existing** file. **Keep** = in the stated build. **Cut** = deleted. **Deferred** = gated, may
never ship.

| # | File | Edit | Disposition |
|---|---|---|---|
| **E1** | `the-fold/language-grammar.js::grammarFor` | typed component gaps for grc, lat, san and any stem missing a component | **Keep, Build 1** (IV.3; T4) |
| **E2** | `the-fold/language-listener.js`, `the-fold/language-context.js::extractSurfacesHeard`, `languageContextFor` | record the skip and the capital-only fallback in `ctx.gaps` instead of silent | **Keep, Build 1** (IV.3; T4) |
| **E3a** | `adapters/text/name-candidates.js`, `the-fold/language-context.js` (the caseless-tier output) | carry the `reported` dead-end slugs they rest on (disclosure only) | **Keep, Build 1** (K5 for the negatives) |
| **E3b** | `organs/capacity-place.js` (`EARNED`), `organs/fold-plan.js` (`steps[].measured` from the registry, `deadEnds` beside `unmetPrerequisites`) | the named empty seat | **Deferred to Build 2** (needs a registry) |
| **E4** | the constant sites (`listening-cast.js:52`, `recursive.js:687,693`, `language-context.js:43,76`, `language-listener.js:37`, `script-floor.js:12`, `ear.js:27-28`, `grain-typing.js`, `organs/cite.js:197`); **not** `kernel/corroboration.js:34` | replace a literal with `constantOf(id).value` | **Deferred, widening (L4)**. **E4a is a product decision**: the admission lane is the N1-refuted gate and changing it changes outputs; the user decides |
| **E5** | `READING-SPEC.md` | append S138+ and "Amended" to S137 for the `admit` scope | **Keep, small, after Build 1**; prose only |
| **E6** | `the-fold/constitution.js::ENFORCEMENT` | wire I.1, I.2, II.1, II.10, II.11 to new tests | **Deferred (L5, the user)** |
| **E7** | `eval/competence/lib.mjs`, `r5-parallel.mjs`, `eval/coding-competence/c1`-`c5`, `scripts/fetch-ud-eval.sh` | the first draft's retro-stamp of `headerDigest` and an in-rung `fingerprint()` | **Replaced.** No retro-stamp (retroactive pre-registration by construction). The fingerprint is a wrapper's sidecar taken at run time (7.1), which edits no rung. The UD release or commit pin remains, in `fetch-ud-eval.sh` |
| **E7b** | `eval/competence/run.mjs`, `eval/coding-competence/run.mjs`, `eval/name-candidates.mjs` | open every TEST split through `knowledge/open-test.mjs` | **Keep, Build 2** |
| **E7c** | the rung modules | add a planted-effect arm (additive exports only) | **Keep, Build 2, per rung, r1 first.** If a rung never gains one, it stays L1 |
| **E8** | `kernel/completion.js::resolveAbsence`, `the-fold/void-loop.js::whatWouldSettle` | type an absence from competence; name the measurement | **Deferred.** First form is restricting only: an absence in a system whose hear rung is failed or unmeasured is `not_computed_here`. `computed_and_empty` needs L4 |
| **E9** | `organs/kind-standing.js::discoverCompanyKinds`, `kernel/kind-induction.js` | pre-run refusal `ear_not_competent`; derived floors | **Deferred.** The refusal is restricting (Build 2 candidate); the derived floors are widening |
| **E10** | `kernel/corroboration.js`, `organs/corroboration.js` | competence-aware independent count | **Deferred.** Excluding a failed witness is restricting (Build 2 candidate); counting an `unmeasured` one and flagging it is a disclosure |
| **E11** | `kernel/notes.js::noteId`, `standingOf` | carry a system or medium; do not lowercase a case-significant identifier; say when a join was bridge-assumed | **A real bug independent of intake**; nominated separately, off the critical path. It contradicts the standing rule that capitalisation is one witness |
| **E12** | `the-fold/earned-cast.js::trustOf`, `proxy-runner.mjs` | set `state.trust` from `trustFor` | **Cut** (the join was unspecified; 2.5) |
| **E13** | `the-fold/firewall.js` (`APPARATUS_TERMS`, `strikeAddresses`) | knowledge vocabulary and `k:` addresses never model-facing | **Keep, Build 1** (T10) |
| **E14** | `assemblies.js`, `kernel/assembly.js` | register the multilingual organs; add optional `scope` and `status` to a regime | **Deferred and undecided** (a `LAYERS` decision for the user; A4.2 severance test has not run) |
| **E15** | `organs/capacities.js` | add the new organs; replace prose numbers with a record pointer | **Cut** (over-engineering before any record exists) |
| **E16** | the prior builders, `adapters/text/cast-prior.js` | emit a `prior` entry at build time; add giver and licence to RoleConfig; a `language` check in `castLedgerPrior` | **Deferred.** Build 1 generates the manifest from files, so no builder needs editing yet. The `language_mismatch` disclosure is a Build 2 candidate |
| **E17** | `kernel/prior-query.js` | register `native/priors` as a family | **Cut** (optional; the registry is not a prior family) |
| **E18** | root `package.json` | `"license": "ISC"` against `LICENSE` MIT **[S]** | **Undecided, the owner** (blocks the licence cells) |
| **E19** | `archon-holocracy/responsibilities.mjs` | register a knowledge circle | **Cut** (read-only for me; review lenses carry no weight, 3.4) |

### 8.4 New files, summarised

*Build 1:* `native/knowledge/{entry.js,add.mjs,manifest-priors.mjs,licence-gate.js,consult.js}`,
`knowledge/entries/`, `knowledge/HEAD`, `knowledge/HEAD.sha256`, `native/tests/knowledge-{record,priors}.test.js`.
*Build 2:* `knowledge/{run-traced.mjs,open-test.mjs,project.js,fingerprint.mjs}`, `knowledge/ingest/{competence,coding,names,deid}.mjs`,
`knowledge/evidence/` (unit outcomes; user test strings only after item 4 of section 9), `knowledge/REGISTRY.md`
(generated), `tests/knowledge-{project,conformance,promotion}.test.js`. *Build 3, per gate:* `remeasure.mjs`,
`tests/knowledge-{constants,rules,modality}.test.js`. **Cut from the first draft:** `promote.mjs` (promotion is computed,
3.1), `stale.mjs` (a function in `project.js`), the `inbox/` staging directory as a separate concept (an unreviewed
entry is simply not added to HEAD).

---

## 9. Undecided: for the user

These are not decided here. Each names what it blocks.

1. **Licensing of NC and SA derived priors in an MIT repo.** Whether count tables, closed-class lists, frame
   distributions and competence numbers derived from CC BY-SA or BY-NC-SA gold are *adaptations* that bind an MIT
   repo; whether NC-derived priors may ship; whether a card may embed gold sentence text (the design says no; the
   alternative is permission by licence). 50 prior files sit in 15 NC-source languages and 26 carry no licence **[S]**.
   Blocks: every `commit` and `distribute` cell of the gate. Needs the owner, and counsel for the legal reading. The
   ISC/MIT mismatch (E18) is part of it.
2. **Commit the priors or distribute them separately.** If the NC question resolves against shipping, the priors
   become a separately obtained, hash-pinned download and the manifest becomes the contract (`sha256` checked at
   load). The design works either way; the choice sets whether `native/priors` stays in the repo.
3. **How much of EO to make load-bearing.** The design uses EO only in an optional `eo` envelope that correctness
   never reads, because Barker is testing EO and its contamination scan rejects EO words in system ids. The
   argument *for* typing acts: `assemblies.js` cells and `capacities.js` terrain/op already exist, and a typed act
   lets `fold-plan` ask "which fold answers this want". The argument against: nothing in the knowledge path needs
   it, and making it load-bearing would put the thing under test inside the instrument that tests it. The
   recommendation is: optional until Barker's EO battery returns.
4. **Public vs private repo.** A public repo with NC-derived tables, a `knowledge/evidence/` that holds the user's
   test strings (`deid/cases.json` contains invented personal names), and `k:` addresses that must never reach a
   mouth. Blocks: the evidence copy of the de-identification cases (Build 1 copies no user test strings) (they are the user's own test strings,
   not licensed gold, so probably fine, but the user decides).
5. **Whether the recurrence admission lane changes (E4a).** The code still gates a caseless being on two mentions;
   the user's rule and N1 say a being is born at first mention. The registry will say so loudly; changing the lane
   changes outputs.
6. **One JSONL or content-addressed files.** Files are proposed because the tree is live; a single JSONL is
   simpler to review. The projection and the HEAD ratchet (2.0) are identical either way.
7. **Which `LAYERS` row the measuring assembly takes** (`baseline`, or a new layer), and whether the new
   multilingual organs form one assembly or several (E14). A2 says a boundary is a hypothesis; the severance test
   (A4.2) has not run.
8. **Whether the user's own three negatives are re-run under a frozen instrument now (a new traced measurement, never an upgrade of the `reported` entry; 7.1) or recorded first as `reported`.** The design records first; re-running is a separate, small, pre-registered
   task.
9. **Handles.** Whether the knowledge organ gets a handle in the README table or is left plain.
10. **Who the reviewer lenses are** beyond the four named. Chomsky, Sullivan, Lovelace and Barker are grounded in
    CHORUS-LOG and the repo; the assignment is a nomination and a lens review carries no mechanical weight (3.4).
11. **Per-rung level floors and SESOIs** (3.5, 2.5): the capability a cell must show before any widening use, and the
    smallest effect of interest per rung, registered before the first measurement. The design cannot derive them from
    the data it is about to measure. Blocks: any L2 and every widening use. Needs the owner (and, for the floors, a
    word on what "good enough to route on" means per rung).
12. **Whether the 25 name stems whose TEST was read outside any ledger are burned for good.** The design says yes
    (they are capped at L1 for name-candidate claims). The cost is that those stems cannot later give a clean
    held-out read for that claim family; a fresh split or a new material is the only repair. Blocks: any L2 for
    `name-candidates`.
13. **What the HEAD ratchet is checked against, and who may rewrite history.** The log cannot defend against a
    rewritten git history. CI checks HEAD against the base ref; the repo is git **[V]** at `/Users/mlacy/Documents/3.0/khora`
    but `native/` is a subdirectory of it. The owner decides the base ref and whether force-pushes to it are allowed.
14. **Whether instrument additions (a planted-effect arm per rung) are worth their cost.** If a rung never gains
    one, L2 is unreachable for it and the registry is permanently L1 there. That is an acceptable result, not a
    failure of the design, but it means the competence ladder never becomes a basis for widening on that rung.

---

## 10. Tests of the design itself

These test the *design*: each says what result would show it wrong. They are written to fail. Where a test needs
data the tree does not have, it says so.

| # | Claim | Test | What would show the design wrong |
|---|---|---|---|
| **T1** | **Disclosed competence matches measured competence.** The `level` the registry discloses for a system and rung predicts a fresh measurement on a later snapshot | for each stem, compare the registry level from the dev measurement with a fresh TEST-split (computed once) measurement; compute rank correlation and mean absolute gap; compare to a script/family-only predictor | the correlation is no higher than the script/family-only predictor. Then the per-system record is no better than a table of scripts and the registry's per-system claim is refuted |
| **T2** | **A stale prior is caught.** Changing one byte of `priors/pos-deu.json` makes every measurement that read it `stale`, and an L4 claim resting on it turns the build red | mutation test: patch a copy, run `staleness()` and the CI class check | the registry still reports `passed`, or the L4 pin stays green. Mutation-test each: dependency scan removed, tier logic inverted |
| **T3** | **Negative results are consulted, and cannot be evaded.** A new claim whose `overlap_keys` (instrument family, material, target) intersect a dead end's is flagged whatever its free-text scope says; the admission lane and the name nominator read `deadEnds` | register a duplicate of N1 with a differently worded scope and different `depends_on_claims`; remove the `deadEnds` read from the consumer | the duplicate is accepted unflagged, or the lane behaves identically with the consult removed (then the negative is stored, not consulted, K5 fails). A `reported` dead end must force `acknowledges` and must not block (T23) |
| **T4** | **Typed gaps pass through as themselves.** For grc, lat, san the output carries `no_frame_prior`; a system with no record returns `no_competence_record`, never 0 or a failure | run `grammarFor` over `availableStems()` (56 stems **[S]**) and assert no `null` component without a reason; call `competenceFor` on an unmeasured system and a stubbed guard | any `null` without a reason; a guard relabelling the gap as zero |
| **T5** | **Cross-modal corroboration raises *correct* standing against a single instrument.** On a planted fixture (truth planted at known addresses in two media; a decoy; an incompetent instrument; two instruments with a shared ancestor), registry-aware standing marks the planted claim `corroborated-independently` and not the decoy, more often than registry-free standing or a single instrument | build the fixture; run three configurations; score against the plant | no better than a single instrument, or the shared-ancestor pair still counts as two (the ancestor read fails), or a string-coincident cross-medium merge still reports independent (defect 9 not fixed) |
| **T6** | **Tier wall.** A `measurement` body round-trips `sealArtifact` and `artifactTierViolations` returns `[]` | seal a body with `effect_over_control`; then one with `margin` (must refuse) | the rename is incomplete and a body with `margin` seals |
| **T7** | **Licence gate.** The ratchet: the count of `unknown` prior licences may only fall; a new prior with `unknown` fails CI; a new prior derived from an NC or SA treebank fails CI until a decision entry exists; a prior derived from an NC treebank returns `undecided` for `distribute`; `undecided` caps at L1 | remove a licence from a manifest entry and from a builder; add a decision entry; add a new NC prior | the gate returns `allow` for an NC prior with no decision, `unknown` passes, or an undecided entry exceeds L1 (see also T24) |
| **T8** | **Zero-model.** No module under `knowledge/` and no instrument it cites depends on a model path | source scan (`model-server`, `mouth.js`, `node:https?`, `fetch(`, `embedding`, `openai`, `anthropic`) and an import-graph walk | a hit. Note: `organs/corroboration.js` and `kernel/prior-query.js` are model-bearing **[S]**; a derived threshold or a competence read that goes through them fails this test |
| **T9** | **Idempotence and determinism.** Ingesting the same card twice writes nothing; the same instrument and gold twice give the same address | run ingest twice; re-run a seeded rung | a second file is written, or the address differs (a hidden dependency) |
| **T10** | **The mouth never sees the registry.** `assertModelFacing` fails on `competence`, `registry`, `rung`, `cleared`, `stale`, and `strikeAddresses` strips `k:` addresses | feed the real model-facing builders and a seeded leak | a knowledge word or a `k:` address reaches a model-facing string |
| **T11** | **The ladder cannot be skipped.** The level is recomputed from entry conditions on every run: a `promote` to L3 without a disjoint-ancestry replication in the same family, to L4 without recompute-from-unit-outcomes and a mutation-red test, or to a `universal` rule without the all-in-scope pass rate, has no force, from the CLI or from a dropped file (T20) | attempt each | any is accepted, or any is accepted because a verdict entry or a lens name says so |
| **T12** | **Demotion cascades without an edit.** Adding a `refuted` verdict for the claim behind a `constant` and a `rule` changes both projections | add the verdict; re-project | a dependent stays `derived` or `universal` |
| **T13** | **The registry changes decisions.** The decision-difference run of T-L6: the share of consumer decisions that differ with the registry versus stubbed empty | fixed read set, both runs | zero differ. Then the consumer seams are decoration |
| **T14** | **The modality contract has teeth.** A toy modality with M1 to M10 passes; the same toy missing exactly one obligation fails by that obligation's name | one fixture per obligation | the toy missing an obligation passes, or fails with the wrong name |
| **T15** | **Pin rot is itself pinned.** Every `pinned_by` test exists in this tree and contains its name; every `evidence` path in a `reported` record that names the repo resolves | walk all rule and verdict entries | a missing file. (The READING-SPEC debt, 98 of 99 absent **[S]**, is listed as known debt on a ratchet, not a failure, and shrinks only) |
| **T16** | **A stale card cannot be laundered.** A card with no run-time sidecar, or whose sidecar card hash or mtime disagrees, or whose sidecar lists a file whose current hash differs, is never recorded as a governing, fresh measurement | feed the ingest (a) the real `r3-eng-dev.json` and `r1-deu-dev.json` with no sidecar, (b) a fixture card rewritten after its sidecar, (c) a fixture whose reader file changed after the run | any of them is recorded above `reported` L1, stamped with today's hashes, or governing. (a) must come out `reported`, `depends: unknown`, non-upgradable |
| **T17** | **The L2 gate bites, per family.** For each of r0 to r5 and c0 to c5 a mutated card (the control set equal to the real arm; the power arm dropped; the unit outcomes absent) demotes L2 to L1; a family with no power arm is capped at L1 and says `power_absent` | mutate a real-shaped fixture card per family and project | the mutated card keeps L2, or a family reaches L2 with `power.status: absent_in_instrument` (then L2 is the instrument's self-report again) |
| **T18** | **Pre-registration is an ordering fact.** An instrument whose header or params are edited after its first measurement entry yields a *new* instrument version and a new claim at L0; a digest stamped after results is `retroactive` and capped at L1 | edit a fixture header after a measurement entry; stamp a digest at run time | the old measurement is re-stamped or keeps its level under the edited header |
| **T19** | **Nothing is deleted silently.** Deleting any entry file, or a leaf verdict with nothing after it, fails; retracting a restricting entry with a non-person giver is refused and the entry still appears in `deadEnds()` as `retracted_negative` | delete a leaf refutation, regenerate `REGISTRY.md`, run the HEAD check; attempt the retraction | the build stays green after the deletion, or the retracted negative disappears from `deadEnds()` |
| **T20** | **A hand-dropped promotion has no force.** A `promote` verdict file placed directly in `entries/` for a claim whose L2 conditions are unmet is flagged `promote_unsupported` and the computed level is unchanged; CI runs this over every entry, not only the CLI | drop one in; run the projection and the CI class V1 | the projection reports the promoted level, or only the CLI refuses |
| **T21** | **Multiplicity and "universal".** Two chance passes among 25 simulated null stems do not reach L3 (family-corrected); a `universal` rule is demoted by one failing in-scope lineage; the trial count prints next to every level | simulate 25 null cells with a seeded generator; add a failing in-scope system | L3 is reached by two chance passes, or a failing in-scope lineage leaves `universal` standing |
| **T22** | **Instruments never consult.** Under `KHORA_MEASURING`, `consult.js` throws; a fixture instrument that reads the registry fails the run; no file under `eval/` imports `knowledge/consult.js` | a seeded consumer inside a fixture instrument; a source scan | an instrument reads the registry without failing (then a capped lane could never show recovery) |
| **T23** | **Overlap is not evadable.** A new claim whose `overlap_keys` (instrument family, material, target) intersect a dead end's, but whose free-text `scope` and `depends_on_claims` differ, is still flagged; a `reported` dead end forces `acknowledges` and does not block, a fingerprinted one blocks without `relitigates` | register a differently scoped duplicate of N1 and of a fingerprinted fixture negative | the differently scoped duplicate registers without the flag |
| **T24** | **Licence undecided caps.** An entry whose `commit` cell is `undecided` cannot exceed L1; an `inferred` `built_from` leaves the licence `unknown`; a new NC or SA prior with no decision entry fails CI; a body that repeats 8 gold tokens fails C9 | fixtures for each | any passes |
| **T25** | **Staleness is one rule, and absence is a third state.** A change in the reader's traced closure (soft) stops widening as `stale:reader`; an absent gold gives `unverifiable` (not red, not passing, capped); a superseded instrument version is non-governing; an `instrument_invalidated` verdict retires a negative without deleting it; a changed headline metric yields a new claim | fixtures for each; run CI with the gold absent | a stale reader keeps a widening level, CI is red or green on an absent gold, or a v1 number is merged with a v2 number |
| **T-L1 to T-L6** | section 6.4 | section 6.4 | section 6.4 |

---

## Appendix A. The first entries to write (Build 1)

All of these enter as `reported` or L0 and **none is a measurement**; the first draft's Step 0 "freeze the evidence"
claimed more than a copy at today's hashes can support. Evidence copies are of small files only and are labelled with
the time they were copied.

| Entry | Type and level | Content | Evidence (to copy and hash) | Consulted by |
|---|---|---|---|---|
| N1 recurrence gate | `verdict` `refuted`, scope `admit`, status `reported`, L1, **disclose only** [U] | the caseless being tier's recurrence gate and keyness standing failed a held-out test; contradicts "a being is born at first mention" | the user's held-out result; `/private/tmp/claude-501/names/test-<stem>.json` is the nearest located file and **I have not verified it is that result**. Those stems' TEST was read outside any ledger, so they are also back-filled as `unledgered` `testread`s | `language-context.js::extractSurfacesHeard` (disclosure), later `listening-cast.js`, `recursive.js` |
| N2 frame prior | `verdict` `not_supported` as an effective nominator, `reported` [U] | frame prior adds ~+0.01 to +0.02 recall over random unseen words | `deid/cases.json`, `cases-heldout.json`, `candidates-with-basis.json`, `deid.json` (recall 0.6818 on 28 cases, `capitalOnlyCaught` 0 **[V, earlier read]**) | `name-candidates.js` (disclosure) |
| N3 peer beat | `verdict` `not_supported`, `reported` [U] | a de-identification peer's spaCy route beat `nameCandidates` | `deid/nameCandidates-vs-gold.json` **[V exists]**; peer comparison not re-run | `name-candidates.js` (disclosure) |
| N4 role-config off | `verdict` `not_supported`, `reported`; **its evidence is CHORUS-LOG prose and I have not verified it** | SVO positional reading failed on real prose; isolated Hebrew and Arabic recall 16 to 34 percent **[S]** | CHORUS-LOG 2026-10-05 row; `capacities.js` `positionalSlots` row | `relations-language.js` (today: by absence); a `reported` negative does not block registration (2.7) |
| X1, X2 crossings; `LIMITS` | `verdict` `not_supported`, `reported`, **evidence missing in this tree** | `capacity-map.js` UNSUPPORTED_CROSSINGS and `capacity-place.js::LIMITS` (3 findings), with outcomes and rule verbatim | named `git 2f81545` paths **missing in this tree [V]** | `fold-plan.js` (Build 2) |
| `testread` back-fill | `testread` x 25, `route: unledgered:name-candidates` | `names/test-*.json` exist **[V, 25 files]** | the file names and hashes | the projection (`burned` / `unledgered_test_read`) |
| prior manifest | `prior` x 233 **[V]** | file, schema, language, sha256, giver as written, licence label as found, `built_from_basis` | the files themselves | `priorStatus`; the licence ratchet |
| user standing rules | `claim`, `kind: rule`, giver `mlacy`, L0 (no `rule` type until Build 3) | a name can appear once and be a name; capitalisation is one witness; identity is the universe folded at a point from a perspective bounded by a difference that makes a difference; look at the slot, not the spans; the heard rule; the log is the memory; derived, not typed, constants | the user's words, with date | `planFold` open questions (Build 2) |
| Barker, law, beings-by-physics | `claim` L0 | each with falsifier and the frozen `prereg_sha256` copied into the repo **as a hash only, `prereg: none` until committed ahead of a measurement** | BARKER.md; LAW-FALSIFICATION.md; `PREREGISTRATION.sha256` | `planFold` open questions |

## Appendix B. What is knowledge today, what is hypothesis (the final account)

- **Knowledge today by this document's own test (K1 to K7):** none in full. The nearest are
  `capacity-map.js` (consulted, retained negatives, pin removed), `reachable-paths.json` (pinned, not consulted), and
  the sealed-artifact and task-log mechanics (tested, with no tests in this tree importing them **[S]**).
- **Measured, unrecorded (evidence awaiting intake), and not admissible as measurement until a run-time fingerprint
  exists:** the `r?-*` rung files (182 at the first count, more now) and 52 coding cards, the name, de-identification and UDHR results [U for the
  claims, V that files exist], `tests/language-reach.test.js` behaviours (13 tests **[S]**, pinning mechanism not
  numbers). **No existing card can reach L2.**
- **Received, giver-named, competence-unmeasured:** the treebank-derived tables, of which a large share lack a
  uniform giver, a licence or an input hash.
- **Declared by a person:** the standing rules; `DEFAULT_TRUST`; assembly regimes.
- **Negative, stated and retained nowhere in the repo until Build 1:** N1 to N4.
- **Hypothesis, design-only:** Barker's kinds and arches; the company/holograph-impact law; beings-by-physics; any
  consumption of competence at run time beyond Build 1's disclosures; any widening use; any licence decision;
  every cross-modal claim in section 5.3 marked hypothesis; the whole of section 6.

---

## Amendments from review (2026-10-06)

A panel reviewed the first draft (needs_fixes: four blockers, seven major findings visible to me). I checked what I
could against the tree before accepting; the checks and their results are in the third column. **The panel text
reached me cut off inside the fix of the eleventh finding and ended with a stray copy of my first draft's summary; there
may be findings after the eleventh that I have not seen. I completed the eleventh from its stated issue and flagged
it; the panel should be asked to re-send the remainder.**

| # | Severity | Finding (short) | What I checked | Disposition |
|---|---|---|---|---|
| 1 | blocker | Ingest launders stale results as fresh: hashes taken at ingest on today's tree; E7 fingerprint came after Step 3; NL cards record only the rung sha1; the doc's own German row was out of date | **Confirmed.** `r1-deu-dev.json` is now v2, n=797, headline site F1, score 0 (the draft quoted 0.9944, n=799); `run.mjs:492` records only the rung module sha1 | **Accepted.** Run-time fingerprint (traced runner, sidecar) is a precondition of any measurement (7.1; Build 2). No sidecar -> `reported`, L1, `depends: unknown`, never upgradable. A changed file after the run -> stale at birth. The doc's own numbers are tagged with file hash and time, and the German row is replaced (1.3). *Modified:* a mismatching card is kept as non-governing history rather than rejected, so negatives are not lost |
| 2 | blocker | The L2 gate rests on the instrument's own report; no card has a built-to-fail field or a power arm; L2 authorises widening | **Confirmed by grep and reading:** no planted/power arm in the rung modules (only r0's licensed derangements and `coding-competence/run.mjs:534`); controls use `licensed`/`beats`, `details.licence`, `status: unlicensed` | **Accepted in full.** 3.0 says every existing card is capped at L1. L2 is **restricting only**; widening needs **L4 and T1/T13** (3.1, 3.2). Per-family conformance test T17 (mutated card must demote); committed unit outcomes and recompute at L4; `arms[].role` is a human-written, test-pinned mapping, never inferred |
| 3 | blocker | Pre-registration and split discipline are tautological or bypassable (`headerDigest` of the current header; retro-stamp; ledger absent; name-candidates unwired; disclosed re-reads demote nothing) | **Confirmed.** `test-reads.jsonl` does not exist; `eval/name-candidates.mjs` has no ledger call; 25 `names/test-*.json` files exist; r4/r1 headers carry amendments | **Accepted.** Prereg counts only if committed before the first measurement entry; a header change is a new instrument and a claim at L0; the retro-stamp is **dropped** (E7 replaced); `testread` is a ninth, in-repo entry type written by a shared opener; a second TEST read burns the stem, an unledgered route caps at L1 for ever; the 25 name stems are back-filled as unledgered (2.1, 3.3, 7.2 C3/C6) |
| 4 | blocker | The log has no tamper evidence; deleting a leaf verdict is invisible; `retract` can remove a dead end; 64-bit address; free-string giver | Not independently testable here; accepted from the design's own structure (no manifest exists in the first draft) | **Accepted.** Full-length hash; committed `HEAD` manifest with a CI ratchet against the base ref (T19); retraction of a restricting entry needs a person and leaves `retracted_negative` in `deadEnds`; "giver authenticity is the git author, not a field" is stated. *Limit stated:* HEAD is an editable file, so the ratchet depends on git history (section 9, item 13) |
| 5 | major | Promotion computed two ways; a hand-dropped promote verdict passes; the adversarial attack is prose by a free-string lens | Accepted from reading my own 2.7/3.1/3.4 | **Accepted.** The projection recomputes every level and flags `promote_unsupported`; CI runs it over all entries (T20); an `attack` is a measurement entry by a different giver committed before the promotion; the lens review is a process note with **no mechanical weight** (3.1, 3.4) |
| 6 | major | No multiplicity accounting (25 stems x 6 rungs x arms); two chance passes reach L3; "universal" ignores failures; MIN_EFFECT 0.01 passes a one-point gain | Accepted | **Accepted, one modification.** Per-family counts of cells, variants and TEST reads as a **projection** (no separate stored ledger), printed beside every level; Holm or BH at family level; `universal` = pass rate over every in-scope system with a Wilson interval, demoted by any failing in-scope lineage, narrowed only by a new dated claim; SESOI registered per rung before first measurement (3.5; T21). SESOI values undecided (item 11) |
| 7 | major | `cleared` and routing from a weak card (Hebrew R1 0.63 level, +0.04); `trustFor`/E12 is a category error | **Confirmed** against the earned-cast keying by archon name | **Accepted.** Per-rung level floor, `weak_level` (2.5). **`trustFor` and E12 are cut**, not deferred; if they return, trust is the minimum over the cells an archon reads and `cleared` needs L3 through a disjoint, computed ancestor graph |
| 8 | major | Feedback loop and goodharting by consultation; constants derived and evaluated on the same material; `derivation.procedure` is a string; dev called held-out | Accepted; the r1 v1 to v2 change and the bul-* scripts support it | **Accepted.** Instruments run with consultation off, enforced by a throw and a source scan (4.5; T22); disjoint giver material and a hashed derivation script for any derived constant (2.6; constants deferred to L4 anyway); dev is `tuned_on`, never held-out (2.3); a changed headline or arm set is a new claim (3.6) |
| 9 | major | Staleness rules contradict (soft keeps widening); gold absent in CI contradicts "always breaks"; static import scan misses data; stale negatives from buggy versions restrict for ever; multi-version undefined | **Confirmed** (gold lives in `/private/tmp`; UD pulled from master) | **Accepted.** One rule: any stale dependency stops widening; a new `unverifiable` state for what cannot be hashed here (caps, neither red nor green); closure from a runtime trace, with untraced subprocesses listed as `unverifiable`; `instrument_invalidated` (a person) retires a negative without deleting it; latest instrument version governs per (system, rung) (3.6, 7.4; T25) |
| 10 | major | Licence gate holes: `undecided` promotes at L2; only 8 of 220 priors carry an input hash so `built_from` is inferred; C9 has no detector; the ratchet admits new undecided NC priors | Accepted | **Accepted.** `undecided` is a cap at L1; Build 1 commits only hashes and non-derived metadata; `built_from_basis: inferred` leaves the licence `unknown`; C9 = field allowlist + 8-gram overlap scan against the gold when present; ratchet fails a new undecided NC/SA prior until a decision entry exists (2.4, 7.2; T24) |
| 11 | major | Negative-result consultation is evadable (overlap judged by the claimant's own scope keys); unclear which statuses block. *Text truncated here; completed from the stated issue.* | Accepted | **Accepted.** Overlap from closed `overlap_keys` (instrument family, material, target) fixed at ingest, never from the claimant's `scope` or `depends_on_claims`. Only a negative with a run-time fingerprint blocks without `relitigates` (none today); a `reported` or prose-derived negative (N1 to N4, X1, X2, `LIMITS`; N4's evidence is prose, the N1 evidence file is unverified) does not block but forces `acknowledges` (2.7; T23) |

**Cut as over-engineering, because the panel showed the first draft built on a measurement path that cannot yet
exist:** the twelve-step plan (now three builds); `trustFor`, the trust projection and E12; widening uses before L4;
`measurement`, `instrument`, `constant` and `rule` entries in Build 1; `promote.mjs` (promotion is computed), `stale.mjs`
and the `inbox/` directory; E14, E15, E17, E19; the E4 per-site literal replacement and E6 constitution wiring (gated);
the `eo` envelope (reserved, not built; section 9, item 3 stands).

**Not changed, on purpose:** the seven tests K1 to K7; the asymmetry; the five lawful and the never-lawful uses; the
cross-modal section 5 and the logos section 6 (their seams now say which build unlocks them); the tests of the
design; the open decisions for the user.

**Added unasked:** a statement of what Build 1 is worth and what it is not (8.1); the `unverifiable` state; the
`testread` back-fill for 25 stems and its cost to future held-out material (item 12); instrument additions as a stated
cost that may not be worth paying (item 14).
