// organs/generation-door.mjs — THE DRAW DOOR (2026-10-01).
//
// The seam where "all generation related to eoreader7 runs through Penelope":
// every model DRAW the engine wants is asked here first. The law is the house
// law — library → box → hunt → mouth, mouth-last: the box (organs) checks the
// draw first, and only the irreducible residue goes to the mouth, which draws
// through Heimdall's channel with Penelope's one identity and the draw's
// kind, so the box's fair-share round robin sees every kind and every caller
// fairly. Every draw lands on the swatch (gym/swatch.jsonl) — the economy is
// measured, never asserted (GL-WV-05).
//
// THE BOX TODAY (2026-10-02): it holds ONE raw-draw shape — STANCE. A draw
// whose shape is a stance read (readStance over a candidate against its
// material, the emergent organ GL-RR-10) is answered HERE with zero mouth
// draws: the box computes the reading, the swatch records the box win, and the
// mouth is never asked. This is the first organ to hold a shape — the named
// gap ("the box answers nothing") closes one cell at a time, each measured on
// the swatch. Every other draw remains irreducible residue, mouth by
// construction, disclosed as before.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// THE RECORD PATH (2026-10-05): repo-relative by default; PENELOPE_RECORD_FILE
// relocates it (a mounted Fold keeps state outside the checkout). Resolved per
// append, so a host that sets it after import is still honoured.
const DEFAULT_SWATCH = path.join(HERE, "..", "gym", "swatch.jsonl");
const recordFile = () => (process.env.PENELOPE_RECORD_FILE ? path.resolve(process.env.PENELOPE_RECORD_FILE) : DEFAULT_SWATCH);
const SWATCH = recordFile();
// The mouth (PENELOPE_MOUTH_URL) is THE draw entry: the door checks the box,
// then draws the residue THROUGH THE MOUTH, which admits and forwards to
// Heimdall's channel (the bridge). The door never draws past her.
const MOUTH = String(process.env.PENELOPE_MOUTH_URL ?? "http://127.0.0.1:11439").replace(/\/+$/, "");
// THE MOUTH TRANSPORT SEAM (2026-10-05): the door reaches the mouth through ONE
// function, (request) -> fetch-style Response. Default: HTTP to PENELOPE_MOUTH_URL.
// A host that mounts penelope in-process (the Fold) installs the mouth's own
// transport, so the draw skips the self-HTTP hop but runs the same admit +
// route + bridge. setMouthTransport(fn) returns a restore function; null resets.
const httpTransport = ({ path: p, headers, body, signal }) => fetch(`${MOUTH}${p}`, { method: "POST", headers, body: JSON.stringify(body), signal });
let mouthTransport = httpTransport;
export function setMouthTransport(fn) {
  const prev = mouthTransport;
  mouthTransport = typeof fn === "function" ? fn : httpTransport;
  return () => { mouthTransport = prev; };
}
const KINDS = new Set(["chat", "probe", "stream", "build", "swarm", "vision", "other"]);
const ID = { "x-er7-user": "penelope", "x-er7-caller": "penelope-gym" };
const MAX_DEFER = 6;

const bare = (m) => String(m ?? "").replace(/^er7:/, "");
// THE RECORD NEVER WEDGES THE DRAW (2026-10-02): a failed swatch append is a
// finding, never a kill — generation continues and the miss is on stderr, so
// the economy stays measured without the record being able to stop the loom.
const swatch = (row) => {
  try {
    fs.appendFileSync(recordFile(), JSON.stringify({ schema: "Swatch@1", ts: new Date().toISOString(), ...row }) + "\n");
  } catch (e) {
    console.error(`[generation-door] swatch append failed: ${e.message}`);
  }
};
/** The swatch writer, exported so every draw path in the house uses ONE
 *  record — the door's own, never a second copy that drifts (Autonoe's
 *  duty: every draw recorded, by the same hand). */
export { swatch, SWATCH };

// THE STANCE SHAPE (the box's first cell). A draw with `shape: "stance"` is a
// mechanical read, not a model draw: readStance(candidate, holon) at a level.
// The box computes it and answers with zero mouth draws; the residue doctrine
// is untouched — this shape is the box's, every other shape is the mouth's.
async function boxStance({ text = "", holon = null, level = "whole" } = {}) {
  try {
    const { readStance, carriesStrain } = await import("../../khora/native/organs/stance.js");
    const t = String(text ?? "").trim();
    if (!t || !holon) return { answered: false, why: "a stance draw needs both the candidate text and the holon it is read against — a named gap, never a guess" };
    const r = readStance(t, holon, { level });
    const strain = carriesStrain(t, holon);
    return {
      answered: true, why: "the box holds the stance shape (GL-RR-10) — a mechanical read, zero mouth draws",
      stance: { reading: r.stance, sign: r.sign, level: r.level, basis: r.basis, carried: strain.carried, tied: strain.tied, of: strain.of },
    };
  } catch (e) {
    return { answered: false, why: "the stance shape could not be computed: " + String(e?.message ?? e).slice(0, 160) };
  }
}

/** The door: check the box, then draw the residue through the channel.
 *  `hop` is the turn's re-entry mark (1 = the turn was already admitted at
 *  its doorway — the draw must not re-queue; 0 = full admission, the safe
 *  default for any caller that does not declare it). `keepAliveS` keeps the
 *  model resident for a long turn's worth of draws, like the engine's own
 *  direct draws do (per-request floor, aligned with the server's keep_alive).
 *  `shape` ("stance") asks the box for a mechanical read instead of a model
 *  draw; `text`/`holon`/`level` are the stance shape's own inputs. */
export async function runDrawDoor({ prompt, model = "gemma2:2b", kind = null, maxTokens = 260, temperature = 0, priority = "interactive", hop = 0, keepAliveS = 0, shape = null, text = null, holon = null, level = "whole", transport = null } = {}) {
  const ask = String(prompt ?? "").trim();
  if (!ask && shape !== "stance") return { ok: false, error: "a prompt is required — an empty draw is a named gap, never a draw" };
  const k = KINDS.has(String(kind ?? "").toLowerCase()) ? String(kind).toLowerCase() : "chat";
  const m = bare(model);
  const t0 = Date.now();
  // THE BOX, FIRST (mouth-last). The box today holds ONE shape — stance (a
  // mechanical read, zero draws). Every other draw is irreducible residue and
  // the mouth's by construction, disclosed as before.
  const box = { answered: false, why: "no organ holds a raw-draw shape — the residue is the mouth's by construction" };
  if (shape === "stance") {
    const b = await boxStance({ text: text ?? ask, holon, level });
    box.answered = b.answered;
    box.why = b.why;
    if (b.answered) {
      swatch({ weave: `box:stance`, class: "box", engine: "penelope organs (stance.js)", model: null, mouthCalls: 0, mouthBytes: 0, corpusBytes: 0, huntBytes: 0, boxBytes: (b.stance?.basis ?? "").length, verdict: "box", shape: "stance", evidence: "2026-10-02 box stance cell, GL-RR-10" });
      return { ok: true, text: JSON.stringify(b.stance), winner: "box", kind: k, ms: Date.now() - t0, box, stance: b.stance };
    }
    // the box did not answer — fall through to the mouth as residue? NO: a
    // stance draw that the box cannot compute is a typed gap, never a model
    // draw (the mouth would paraphrase a reading, and a reading is not a
    // paraphrase). Returned as a refusal that names why.
    swatch({ weave: `box:stance`, class: "box", engine: "penelope organs (stance.js)", model: null, mouthCalls: 0, mouthBytes: 0, corpusBytes: 0, huntBytes: 0, boxBytes: 0, verdict: "gap", shape: "stance", error: b.why, evidence: "2026-10-02 box stance cell, GL-RR-10" });
    return { ok: false, error: b.why, kind: k, box: { answered: false, why: b.why } };
  }
  let last = null;
  let j = null;
  // THE VOICE, WHEN THE ARCHONS HOLD THE THREAD (2026-10-04): penelope's job
  // is keeping ALL the threads together for generation. A `chat` draw that the
  // box cannot settle is the mouth's — but before the bare draw, the voice
  // layer checks the archons in: the steersman reads the shadow (pathos —
  // whose stake the turn carries), speakEnvelope frames the draw with the
  // routed archons' jurisdictions (the POV in the frame, never in the quotes),
  // and the two gates — rejectfab (a quotation not in the material) and the
  // veil (no name reaches the model or the response) — bound the draw. Logos
  // is untouched. When the archons are unavailable (no cast/shadow on disk),
  // the door draws the residue exactly as before — the record discloses which.
  if (k === "chat") {
    try {
      const { steer } = await import("./steersman.mjs");
      const { speakEnvelope, loadCast } = await import("./voice.mjs");
      const env = steer({ turn: ask });
      if (env?.activation?.length && !env.aporia) {
        const voice = await speakEnvelope(env, loadCast(), { turn: ask });
        if (voice?.text) {
          const vText = String(voice.text).trim();
          swatch({ weave: `voice:${voice.record?.mode ?? "chat"}`, class: "voice", engine: "steersman→voice (pathos archons)", model: voice.record?.model ?? m, mouthCalls: 1, mouthBytes: vText.length, corpusBytes: 0, huntBytes: 0, boxBytes: 0, verdict: "voice", routed: (voice.record?.routed ?? []).map((r) => r.handle).join("+"), evidence: "2026-10-04 voice thread, GL-WV-15" });
          return { ok: true, text: vText, winner: "voice", model: voice.record?.model ?? m, kind: k, ms: Date.now() - t0, box, voice: { mode: voice.record?.mode, routed: voice.record?.routed, disclosure: voice.record?.disclosure } };
        }
        if (voice?.refused || voice?.record?.mode === "weak-pointer") {
          swatch({ weave: `voice:${voice.record?.mode ?? "refused"}`, class: "voice", engine: "steersman→voice", model: null, mouthCalls: 0, mouthBytes: 0, corpusBytes: 0, huntBytes: 0, boxBytes: 0, verdict: voice.record?.mode ?? "refused", error: voice.refused ?? null, evidence: "2026-10-04 voice thread" });
          if (voice.record?.mode === "aporia" || voice.record?.mode === "weak-pointer") {
            return { ok: true, text: voice.text, winner: "voice", model: null, kind: k, ms: Date.now() - t0, box, voice: voice.record };
          }
        }
      }
    } catch (e) {
      console.error(`[generation-door] voice unavailable, drawing residue: ${e.message}`);
    }
  }
  for (let a = 0; a < MAX_DEFER; a += 1) {
    const r = await (transport ?? mouthTransport)({
      path: "/api/generate",
      headers: {
        "content-type": "application/json",
        ...ID,
        "x-er7-priority": priority === "interactive" ? "interactive" : "batch",
        "x-er7-kind": k,
        ...(Number.isFinite(Number(hop)) && Number(hop) >= 1 ? { "x-heimdall-hop": String(hop) } : {}),
      },
      body: { model: m, prompt: ask, stream: false, options: { num_predict: Math.max(1, Number(maxTokens) || 260), temperature: Number(temperature) || 0 }, ...(Number(keepAliveS) > 0 ? { keep_alive: `${Math.round(keepAliveS)}s` } : {}) },
      signal: AbortSignal.timeout(240000),
    });
    if (r.status === 429 || r.status === 503) {
      last = r.status;
      const wait = Math.min(120000, (Number(r.headers.get("retry-after")) || 20) * 1000);
      await new Promise((res) => setTimeout(res, wait)); // Thea: defer, never spin
      continue;
    }
    j = await r.json().catch(() => null);
    if (!r.ok) { last = r.status; break; }
    const text = String(j?.response ?? "").trim();
    if (!text) { last = "empty"; break; }
    swatch({ weave: `draw:${k}`, class: "draw", engine: "box→mouth (heimdall channel)", model: m, mouthCalls: 1, mouthBytes: text.length, corpusBytes: 0, huntBytes: 0, boxBytes: 0, verdict: "mouth", evidence: "2026-10-01 door, GL-WV-05" });
    return {
      ok: true, text, winner: "mouth", model: j?.model ?? m, kind: k,
      promptTokens: j?.prompt_eval_count ?? 0, evalTokens: j?.eval_count ?? 0,
      ms: Date.now() - t0,
      box,
    };
  }
  swatch({ weave: `draw:${k}`, class: "draw", engine: "box→mouth (heimdall channel)", model: m, mouthCalls: 1, mouthBytes: 0, corpusBytes: 0, huntBytes: 0, boxBytes: 0, verdict: "refused", error: String(last ?? "no draw"), evidence: "2026-10-01 door, GL-WV-05" });
  return { ok: false, error: `heimdall refused the draw (${last}) after bounded defer — Thea says pace, retry later`, kind: k, box };
}

if (import.meta.url === `file://${path.resolve(process.argv[1] ?? "")}`) {
  const r = await runDrawDoor({ prompt: process.argv.slice(2).join(" ") || "Say OK" });
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.ok ? 0 : 1);
}