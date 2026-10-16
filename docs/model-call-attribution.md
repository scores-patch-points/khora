# Model-call attribution — the bet, measured

**Recorded:** 2026-10-16. Companion to `model-call-baseline.md` (the counter)
and the harness that produces these numbers: `model-call-harness.py`.

## The harness

`model-call-harness.py` reads OpenCode's own DB and classifies every model
call (one `assistant` message) by what its tool parts actually *did*, instead
of merely counting. It is model-free (sqlite3 + json, stdlib only) — measuring
costs zero model calls.

```
./model-call-harness.py                 # current session
./model-call-harness.py SES_ID          # a specific session
./model-call-harness.py --all 6         # last N sessions, newest first
./model-call-harness.py --all 6 --verbose   # + per-call attribution of find-read
```

Buckets (disclosed, coarse — a heuristic, not a verdict):

- **find-read** — a call whose tools did nothing but `grep` / `read` / `glob` /
  `websearch` / `webfetch`, or a shell command whose verb is read/search
  (`cat`, `sed`, `ls`, `find`, `git log`, …). This is the surface surf+fold
  absorbs.
- **do-work** — `write` / `edit`, or a shell command that mutates or executes
  (`node`, `python3`, `git commit`, `mkdir`, …). Irreducible residue.
- **steer** — `question` / `skill` (the human in the loop).
- **think-only** — no tool parts; the model reasoned in its head.
- **other** — matched no rule; reported, never silently assigned.

The single hand-set part is the verb tables at the top of the file — that is
where the heuristic is sharpened. `--verbose` prints each find-read call with
its exact tool sequence, so the replacement surface is visible, not asserted.

## The finding (the "grep vs surf + fold" bet, confirmed)

Across the recent coding/research sessions, **60–70% of all model calls are
find-and-read** — the grep → read → read → read loop — and those calls consume
the majority of `tokens_reasoning`:

| session | calls | find-read | do-work | reasoning (real) |
|---|---|---|---|---|
| with the operators… (59) | 59 | **69.5%** | 10.2% | 45,398 |
| can we replace grep with surf and fold | 41 | **68.3%** | 19.5% | 34,156 |
| re, ocxtf: remember that the fold works | 114 | **64.0%** | 16.7% | 90,211 |
| The log is the one thing on screen | 123 | **62.6%** | 19.5% | 99,311 |
| Attached file | 239 | **60.3%** | 29.7% | 238,268 |
| how can ocxtf have no context window limit | 250 | **40.8%** | 36.0% | 288,382 |

The reasoning-char proxy shows the same shape: find-read calls hold the most
reasoning. `grep` returns raw lines; the model then re-reads offsets and
reasons over them, each step a paid call. surf + fold would hand the model
already-ranked, already-folded spans, leaving only the do-work residue.

## Falsifying control

A session where the dominant tool is `edit`/`write`/`node` (a true build, not a
read-and-understand task) should show find-read **low** and do-work **high** —
if it doesn't, the classifier is misfiling shell verbs. The two build-heavy
sessions above ("Attached file" 29.7%, "how can ocxtf" 36.0% do-work) already
tilt that way; that is the control behaving, not a bug. Re-run after building
surf + fold and watch the find-read percentage fall against these numbers.
