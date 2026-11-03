// senses/describe.mjs — the MEASURED NOTE: what the ear and the eye found, in the one channel foldcode carries (text).
//
// foldcode's perceive path uses only the answer's `text` (fold.ts: perceiveOne). The ear and the eye return their readings in
// `meta` (they must: deltaOf and the representative ground are for the source's own characters). To let the frontier model hear
// or see, the door may add a short NOTE, and the note is built so it can never be mistaken for the source's words:
//   · it opens with a line that says it is a measurement and not text the file contained (Holodeck's media-reader rule);
//   · it is added after any transcript or OCR, never in place of it;
//   · when the file has no characters of its own, the media is KEPT (replaceMedia:false), so a note is never a substitute for it;
//   · what could not be assessed is said in one closing line, so a missing reading is not read as "nothing there".
// Modes (perceive.json `describe`): "when-no-text" (default) | "always" | "off".
import { earOrgan } from "./organs/ear.mjs";
import { eyeOrgan } from "./organs/eye.mjs";

export const DESCRIBE_MODES = Object.freeze(["when-no-text", "always", "off"]);
export const MAX_NOTE_CHARS = 1400;
export const BUDGET_MS = 20_000;

/** Does the text hold characters of the source's own? Recognisers write non-speech as "[MUSIC]", "(applause)", "♪": brackets and
 *  music marks are removed first. Structural (S1: punctuation), no word list; it only decides whether a cheap, labelled note is added. */
export const hasSourceCharacters = (text) => /[\p{L}\p{N}]/u.test(String(text ?? "").replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|[♪♫♬]/gu, " "));

export const modeOf = (m) => (DESCRIBE_MODES.includes(m) ? m : "when-no-text");
export const wantsNote = (mode, text) => { const m = modeOf(mode); return m === "off" ? false : m === "always" ? true : !hasSourceCharacters(text); };
export const describableMime = (mime) => /^(audio|image|video)\//i.test(String(mime ?? ""));

const notAssessed = (gaps) => { const r = [...new Set((gaps || []).map((g) => String(g.reason || "").replace(/_not_assessed$|_unavailable$/, "").replace(/_/g, " ")).filter(Boolean))]; return r.length ? `not assessed: ${r.join(", ")}.` : ""; };
const clip = (s, n) => (s.length <= n ? s : s.slice(0, Math.max(0, n - 1)).trimEnd() + "…");

/** reading = an organ's { meta, gaps }; returns the labelled note, within the character budget */
export function noteOf(kind, reading) {
  const m = reading?.meta; if (!m) return null;
  const head = `[measured, not words in the file — ${m.organ} (${m.stratum}, ${m.by}); this describes the ${kind === "ear" ? "sound" : "picture"}, it does not transcribe or read it]`;
  const tail = notAssessed(reading.gaps);
  let body = [];
  if (kind === "ear") {
    const lines = m.description || []; body = lines.slice();
    const room = MAX_NOTE_CHARS - head.length - tail.length - 40; let used = 0, kept = [];
    for (const l of body) { if (used + l.length + 1 > room && kept.length) break; kept.push(clip(l, Math.max(120, room - used))); used += l.length + 1; }
    if (kept.length < body.length) kept.push(`(+${body.length - kept.length} more section(s))`);
    body = kept;
  } else {
    const p = (m.palette || []).slice(0, 3).map((c) => `${c.hex || c.color || ""} ${c.share != null ? Math.round(c.share * 100) + "%" : ""}`.trim()).filter(Boolean).join(", ");
    body = [clip(`${m.width}x${m.height}; background ${m.background} (${m.polarity}); ink share ${m.inkShare}; ${m.textLines} text line(s); regions ${JSON.stringify(m.regionCounts)}${p ? `; palette ${p}` : ""}; scene kind (a proposal, not verified): ${m.sceneKind?.value}.`, MAX_NOTE_CHARS - head.length - tail.length - 4)];
  }
  return clip([head, ...body, tail].filter(Boolean).join("\n"), MAX_NOTE_CHARS);
}

/** run the right organ for the medium within a time budget; null when there is nothing to say */
export async function describeMedia(bytes, { mime, name = "attachment" } = {}) {
  const m = String(mime ?? "").toLowerCase(), kind = m.startsWith("image/") ? "eye" : m.startsWith("audio/") || m.startsWith("video/") ? "ear" : null;
  if (!kind) return null;
  let timer; const budget = new Promise((r) => { timer = setTimeout(() => r({ timeout: true }), BUDGET_MS); });
  try {
    const out = await Promise.race([(kind === "ear" ? earOrgan : eyeOrgan)(bytes, { name }), budget]);
    if (out.timeout || !out.meta) return null;
    const note = noteOf(kind, out); return note ? { kind, note, reading: out.meta, gaps: out.gaps || [] } : null;
  } catch { return null; } finally { clearTimeout(timer); }
}

/** pure: fold a note into a perceive answer. The source's own text comes first and is never altered. */
export function compose(out, described, cfg = {}) {
  if (!described || !out || out.passthrough) return out;
  const own = hasSourceCharacters(out.text), text = out.text && out.text.trim() ? `${out.text}\n\n${described.note}` : described.note;
  return { ...out, text, chars: text.length, replaceMedia: own ? cfg.replaceMedia : false, measured: { kind: described.kind, ...described.reading }, measuredNote: true };
}
