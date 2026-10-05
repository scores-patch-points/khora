// read-door.mjs — the body of the proxy's POST /v1/read, as a function a test can call without a server.
//
// A read is not a draw: khora perceives, model-free, and the mouth is never consulted. This is the same reader the
// proxy always ran (corpus-session.js: createSession → admitChunked → sessionReferents/sessionRelations). What changed
// (2026-10-05) is what the door SAYS and which language it reads in:
//
//   • LANGUAGE. The proxy used to pass `language: "en"` for every document, which switched off the reader's own
//     language leg (corpus-session.js readDocument: "a declared language, else the one the text's own words attest —
//     measured, never a silent default"). The door now takes a DECLARED language from the caller, and otherwise lets the
//     reader hear it. Measured on an 11-language gold set (48 entities): recall 11/48 forced-English → 14/48 detected;
//     Spanish 2/5 → 5/5, Hindi 0/4 → 1/4, Arabic 1/4 → 0/4 (a regression), Russian / Chinese / Japanese 0 either way.
//     So the hardcode was NOT the main cause of the non-Latin zeros: those are the reader's recurrence floor
//     (`minMentions: 2`) and its immature non-Latin grammars, and this door does not pretend otherwise.
//   • DISCLOSURE. `priorsInjected`, `basis` and `language` are now what the reader reported for THIS document, not
//     strings written in advance (the old basis claimed "bin/priors/lang/en.json absent" for every read).
//
// Stages 5b-8 are still not run by this host; they are named, never implied (P2).

import { createSession, admitChunked, sessionReferents, sessionRelations } from "./corpus-session.js";

const DECLARED = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
export const STAGES_NOT_RUN = Object.freeze(["5b", "6", "7", "8"]);

/** A declared language, or null; throws RangeError for something that is not a language code. */
export function declaredLanguage(language) {
  if (language == null || language === "") return null;
  if (typeof language !== "string" || !DECLARED.test(language)) throw new RangeError("language must be a code like \"en\", \"es\" or \"zh-Hans\"; omit it to let the reader hear it");
  return language;
}

/** Read `text` and describe what the reader did. Returns the EORead@1 body. */
export async function readDoor({ text, name = "", language = null, maxCharacters = 60000, now = () => Date.now() } = {}) {
  const declared = declaredLanguage(language);
  const material = String(text ?? "").slice(0, maxCharacters);
  const truncated = material.length < String(text ?? "").length;
  const t0 = now();
  const sourceId = `doc:${(String(name).trim() || "unnamed").replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  const session = createSession();
  admitChunked(session, { text: material, sourceId, ...(declared ? { language: declared } : {}) });
  const cast = await sessionReferents(session, { sourceId, priors: [], limit: 200 });
  const relations = await sessionRelations(session, { sourceId });
  const grammar = session.documents?.get?.(sourceId)?.grammar ?? null;
  const lang = grammar?.language ?? null;
  const source = declared ? "declared" : lang ? "detected" : "undetected";
  const referents = (cast.referents ?? []).map((r) => ({
    surfaces: [r.display].filter(Boolean),
    routes: (r.fromPrior === true ? ["prior"] : ["witnessed"]).concat(r.individuation ? [`grain:${r.individuation}`] : []),
    grain: r.individuation ?? null,
  }));
  const gaps = [
    ...(truncated ? [`input_truncated: read ${material.length} of ${String(text).length} characters; a prefix is different material (S2)`] : []),
    ...(source === "undetected" ? [`language_undetected: ${grammar?.gap ?? "the text's words attest no language the reader has a grammar for"}; read with capitalisation alone`] : []),
    ...(cast.gaps ?? []).map((g) => (typeof g === "string" ? g : `${g.reason}`)),
  ].slice(0, 8);
  return {
    schema: "EORead@1", ms: now() - t0,
    source: sourceId, truncated, sourceCharacters: String(text ?? "").length, readCharacters: material.length, maxCharacters,
    assembly: "constitutional-host",
    language: lang, languageSource: source, languageDetected: grammar?.detected ?? null,
    priorsInjected: lang ? [`language:${lang}`] : [],
    stagesNotRun: [...STAGES_NOT_RUN],
    basis: `constitutional reader: createSession → admitChunked → sessionReferents; model-free; language ${lang ?? "none"} (${source}); stages 1-5a run, 5b-8 not run (this host does not wire them); a referent needs a second mention past the material's own floor`,
    sentences: [], relations: relations?.relations ?? relations ?? [],
    referents, descriptorBeings: [],
    gaps,
    disclosure: { giver: "heimdall", standing: "disclosed", rule: "a read is not a draw — the mouth is never consulted; the ground is a hypothesis (standing: hypothesis, half-life'd), never asserted (S1/P2/P3, khora)" },
  };
}
