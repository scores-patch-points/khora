# Model-call baseline — the real counter

**Captured:** 2026-10-16 ~05:14 local, mid-session (the number below is *moving*;
each additional turn increments it).

## Where the number actually lives

The "214 events" strap in `design_handoff_opencode/opencode-three-pane.html` is
hard-coded text — it does nothing. The counter that works is OpenCode's own
database (`~/.local/share/opencode/opencode-local.db`):

- one `assistant` row in `session_message` = **one model call**;
- `session_v2` carries `tokens_input / tokens_output / tokens_reasoning / cost`.

`measure-model-calls.sh` reads it. That is the counter, wired to the real
source instead of the mockup.

## Current session (this one)

`ses_ebd00d341ffec4nGQym0yKtqn6` — *"re, ocxtf: remember that the fold works"*

| metric | value |
|---|---|
| model calls (assistant msgs) | **87** and climbing |
| user messages | 10 |
| tokens in | 339,024 |
| tokens out | 19,362 |
| tokens reasoning | 66,196 |
| cost | $0.449 |

To merely *investigate* whether we reduced calls, this session burned **87
model calls and 66K reasoning tokens** on its own. That is the behavior the
user is seeing.

## Comparable recent sessions (same model, deepseek-v4-pro)

| session | calls | tokens in | tokens out | tokens reasoning |
|---|---|---|---|---|
| re, ocxtf: remember that the fold works (this) | 87+ | 339K | 19K | 66K |
| The log is the one thing on screen | 76 | 331K | 25K | 64K |
| Attached file | 200 | 851K | 56K | 193K |
| with the operators in this app, change… | 59 | 212K | 11K | 45K |
| how can ocxtf have no context window limit | 250 | 1.57M | 79K | 288K |
| figrue out how OCxTF can truly unlock… | 214 | 1.34M | 53K | 214K |
| develop for the opencode x the fold app | 212 | 1.64M | 54K | 201K |

## What "reduce" now means

A real before/after has three numbers to watch, all already tracked:

1. **model calls per task** (assistant messages) — the headline metric.
2. **tokens_reasoning per task** — the expensive hidden tax this model pays.
3. **cost** — the floor truth.

Baseline to beat: a typical coding task in this workspace costs **~150–250
model calls and 200K+ reasoning tokens**. The goal isn't a prettier log; it's
pulling those numbers down. Re-run `./measure-model-calls.sh` after any
behavior change and compare against the numbers above.
