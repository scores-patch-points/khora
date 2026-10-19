// opencode-archons.mjs — archon-aware `context`, step 1 of the doorway plan.
//
// matchArchons(ask) → dossier-gated hits → one short credited note.
//
// Roster rule: a hit rides only WITH a dossier (disclosure != null). An
// archon with no compendium row or no dossier never appears — the gate is
// structural, never a list, so unratified archons (Callimachus, Wald) are
// excluded by construction, not by maintenance.
//
// Caps: top 2 hits, ≤600 chars total. Anything else is a typed gap.
// Mechanical topic overlap, zero tokens, fail-open: a throw answers a gap,
// never nothing and never a guess.
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const ARCHON_NOTE_MAX_HITS = 2;
export const ARCHON_NOTE_MAX_CHARS = 600;
// The standing openness teaching injected into every turn (see opennessNote).
// Small and fixed: it is not a hit, it is what a coder entering this sphere is
// asked to hold.
export const OPENNESS_NOTE_MAX_CHARS = 700;

let compendium = null;
async function compendium_() {
  if (!compendium) compendium = await import(pathToFileURL(path.join(HERE, "native", "organs", "archon-compendium.js")).href);
  return compendium;
}

/**
 * The archon ground note for `ask`, or a typed gap.
 * Returns { note, handles, chars } on a match, { gap, why? } otherwise.
 */
export async function archonNote(ask) {
  try {
    const { matchArchons } = await compendium_();
    const text = String(ask ?? "").trim();
    if (!text) return { gap: "no-ask" };
    const hits = matchArchons(text)
      .filter((h) => h.disclosure != null)
      .slice(0, ARCHON_NOTE_MAX_HITS);
    if (!hits.length) return { gap: "no-archon-match" };
    const lines = hits.map((h) => `- ${h.handle} — ${h.role} [${h.credit} · verdict: ${h.verdict ?? "unrated"}]`);
    let note = ["<fold-archons>", ...lines, "</fold-archons>"].join("\n");
    if (note.length > ARCHON_NOTE_MAX_CHARS) note = note.slice(0, ARCHON_NOTE_MAX_CHARS - 1) + "…";
    return { note, handles: hits.map((h) => h.handle), chars: note.length };
  } catch (e) {
    return { gap: "archons-threw", why: String(e?.message ?? e).slice(0, 120) };
  }
}

let openness = null;
async function openness_() {
  if (!openness) openness = await import(pathToFileURL(path.join(HERE, "native", "the-fold", "openness.mjs")).href);
  return openness;
}

/**
 * The standing openness teaching — the power of openness, carried into every
 * turn so that a coder entering this sphere is met with it (user direction:
 * "unlocking the power of openness"). Not a hit and never a verdict: it is the
 * AntiStrauss discipline — the plain reading (honesty), humility (a gap is a
 * result), and knowing yourself (self.js) — plus the field's own reversal
 * (canon/tao-te-ching-zh.txt). Fail-open: a throw answers a gap, never nothing.
 */
export async function opennessNote() {
  try {
    const { knowYourself, OPENNESS } = await openness_();
    const y = knowYourself();
    let note = [
      "<fold-openness>",
      `${OPENNESS.handle} — ${OPENNESS.reversal.doctrine}. The power of openness: the field's health is openness, never completeness; a closing field re-grounds, never accumulates.`,
      `- honest: ${y.honest}.`,
      `- humble: ${y.humble}.`,
      `- open: ${y.open}.`,
      `- self: ${y.is}; ${y.constitutedBy}; ${y.greatestHope}.`,
      `[ground: ${OPENNESS.groundRef} · ${OPENNESS.reversal.teaching}]`,
      "</fold-openness>",
    ].join("\n");
    if (note.length > OPENNESS_NOTE_MAX_CHARS) note = note.slice(0, OPENNESS_NOTE_MAX_CHARS - 1) + "…";
    return { note, handle: OPENNESS.handle, groundRef: OPENNESS.groundRef, chars: note.length };
  } catch (e) {
    return { gap: "openness-threw", why: String(e?.message ?? e).slice(0, 120) };
  }
}
