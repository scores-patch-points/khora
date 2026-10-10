# WIP consolidation — done (2026-10-05)

An **opencode** session consolidated the Claude Code work-in-progress in this
worktree into `scores-patch-points/khora`.

**Landed & pushed:**
- `khora` main → `0cb1492` — code/language adapters, multilingual priors, barker
  organ (implementation only)
- `khora` `fold/handlers` (from the khora-fold worktree) → `4436fa2` — mountable
  handlers WIP: proxy, install, package

**Left uncommitted on purpose** (still in this working tree, not pushed): tests
(`*.test.*`, `test/`, `tests/`), docs (`*.md`, `docs/`), eval harnesses
(`eval/`), runtime logs/corpora (`*.jsonl`, `documents/`), and `node_modules`.

The freeze is lifted. Only the implementation was consolidated; the excluded
tests/docs/eval/runtime artefacts are untouched here.
