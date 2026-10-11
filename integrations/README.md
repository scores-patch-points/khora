# Point any tool at The Fold

The Fold speaks **OpenAI**, **Ollama**, and **Anthropic** wire protocols on one
base URL. Any client that already speaks one of them works unmodified.

```
base URL (OpenAI / Anthropic)   http://127.0.0.1:11436/v1
base URL (Anthropic)            http://127.0.0.1:11436
Ollama gate                     http://127.0.0.1:11434
Ollama direct                   http://127.0.0.1:11435
model id                        fold:<real-model>      (er7: still accepted)
api key                         any non-empty string (ignored)
```

List the live roster: `curl -s http://127.0.0.1:11436/v1/models | jq -r '.data[].id'`

Start the pipeline first: `./local-up.sh` (see `../docs/PORTS.md`).

| tool | file | how |
|------|------|-----|
| opencode | `opencode.jsonc` | merge the `provider.fold` block into `~/.config/opencode/opencode.jsonc` |
| LibreChat | `librechat.yaml` | drop into your LibreChat root, set `CONFIG_PATH` |
| Continue | `continue.config.json` | merge into `~/.continue/config.json` |
| Cursor | `cursor.md` | Settings → Models → override the OpenAI base URL |
| Claude Code | `claude-code.sh` | export `ANTHROPIC_BASE_URL` (+ `ANTHROPIC_MODEL`) |
| Ollama CLI | `ollama.sh` | export `OLLAMA_HOST` |
| LangChain / OpenAI SDK | `langchain.py` | `base_url` + `model="fold:..."` |
| raw HTTP | `curl.sh` | the four doorways in one script |

## The native doors (beyond chat)

Any HTTP client can use the pipeline directly — no SDK needed:

- `POST /v1/ask { "task": "..." }` → `{ "answer", "sessionId", ... }`
- `POST /v1/read { "name", "text" }` → `EORead@1` (model-free)
- `POST /v1/swarm { "task", "text" }` → the capacity-swarm report
- `POST /v1/code { "task", "workspace", "testCommand" }` → the gated coding loop
- `GET /` → the self-describing map; `GET /v1/sessions` → live reader folds

## The sealed agent door (opencode's own session wire, on `127.0.0.1:4097`)

`native/sealed-agent/server.mjs` speaks the wire opencode itself speaks, so
any opencode-shaped client (TUI, SDK, the opencode-fold fork, heimdall's
opencode-lane) can drive the sealed agent with no new wire — and the page at
`GET /` (opencode-style tabs of sessions) is served from the door itself:

- `POST /session` · `POST /session/:id/message` · `GET /session/:id/message`
- `POST /session/:id/abort` (stop) · `GET /event` (SSE, live parts)
- Per-workspace store: `<workspace>/.sealed-agent/` — lessons (`skills.json`),
  the record (`record.jsonl`, the floor), the audit (`audit.jsonl`, every
  outbound body's hash).
- Frontier draws are antistrauss-gated and audit-ledgered; the same ask —
  same ask + test command + workspace — serves from a compiled lesson with
  zero frontier calls (THE-ONE-TIME-TEACHER: the frontier is consulted once
  per class).

Start it: `node native/sealed-agent/server.mjs` (needs `ANTHROPIC_API_KEY`),
or one-shot a turn: `node native/sealed-agent/run.mjs --workspace <dir>
--task "<ask>" [--test "<cmd>"]`.

Optional headers: `x-er7-session`, `x-er7-user`, `x-er7-workspace`, `x-er7-mode`.
