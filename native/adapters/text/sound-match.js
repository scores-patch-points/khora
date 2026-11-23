// sound-match.js — the "sounds right" confirmation: a surface resolved by its pronunciation.
//
// G2P is espeak-ng (deterministic, rule-based grapheme-to-phoneme — the same engine the
// pronunciation-eng prior was built with). It is a static codec: no learned parameters, no model,
// no LLM. The claim is EXACT: a surface whose IPA is identical to exactly one known word's IPA is
// that word's homophone ("fone" -> phone, "thru" -> through, "coff" -> cough). Homophony needs no
// threshold, because "sounds exactly the same" is a fact, not a distance.
//
// WHY SOUND, BESIDE SIGHT. Orthography alone gets the phonetic misspelling wrong: "fone" is one edit
// from "one" (so edit distance "recovers" one, wrong), and two from "phone" (so it abstains) — yet a
// person typed the SOUND, and the sound is phone. Sound is the shallow-orthography cue the user
// named: readers of Finnish/Spanish lean on it, English readers use it for homophone confusion, and
// it is the twin of the orthographic cue, not its replacement. The near-homophone (one phoneme-edit)
// is the weaker, still-open claim and is disclosed as a typed gap, not approximated here.
import { execFileSync } from "node:child_process";

export const SOUND_SCHEMA = "SoundMatch@1";
export const DEFAULT_ESPEAK = process.env.ESPEAK || "espeak-ng";
const STRIP_STRESS = /[ˈˌ]/g;

/** g2p(surface) -> IPA with stress marks stripped. A failed call returns "" (a typed gap, never a guess). */
export function g2p(surface, { voice = "en-us", espeak = DEFAULT_ESPEAK } = {}) {
  const s = String(surface ?? "").trim();
  if (!s) return "";
  try {
    const out = execFileSync(espeak, ["-q", "--ipa", "-v", voice, s], { encoding: "utf8", timeout: 3000 });
    return out.replace(STRIP_STRESS, "").trim();
  } catch {
    return "";
  }
}

/**
 * makeSoundMatch({ forms, g2pFn, voice }) -> { sound, soundClaim }
 *  `forms` is the prior's own map (form -> { UPOS: count }). The IPA index (form -> IPA, and the
 *  reverse IPA -> [forms]) is built lazily; only homophony (exact IPA) is claimed, and only when the
 *  homophone is unique — "rite" sounds like both "right" and "write" and abstains.
 */
export function makeSoundMatch({ forms, g2pFn = g2p, voice = "en-us" } = {}) {
  if (!forms || typeof forms !== "object" || Array.isArray(forms)) throw new TypeError("makeSoundMatch: the prior's forms map is required");
  let byIpa = null;
  const build = () => {
    if (byIpa) return byIpa;
    byIpa = new Map();
    for (const w of Object.keys(forms)) {
      const ipa = g2pFn(w, { voice });
      if (!ipa) continue;
      if (!byIpa.has(ipa)) byIpa.set(ipa, []);
      byIpa.get(ipa).push(w);
    }
    return byIpa;
  };

  return {
    sound(surface) { return g2pFn(String(surface ?? ""), { voice }); },

    /** homophones(surface) -> every known form whose IPA is identical to the surface's (the candidate
     *  SET for the prediction layer, before any claim). */
    homophones(surface) {
      const s = String(surface ?? "").toLowerCase();
      if (!s) return [];
      if (forms[s]) return [s];
      const ipa = g2pFn(s, { voice });
      if (!ipa) return [];
      return build().get(ipa) ?? [];
    },

    /** soundClaim(surface) -> { surface, found, claimed, method, nearest, reason, candidates, matches }.
     *  method is "known" or "homophone"; reason is "ambiguous-homophone", "no-homophone", "no-g2p",
     *  or "empty". A homophone is claimed only when exactly one known word shares the surface's IPA. */
    soundClaim(surface) {
      const s = String(surface ?? "").toLowerCase();
      if (!s) return { surface: s, found: false, claimed: false, method: null, nearest: null, reason: "empty", candidates: [] };
      if (forms[s]) return { surface: s, found: true, claimed: true, method: "known", nearest: s, reason: null, candidates: forms[s], matches: [s] };
      const ipa = g2pFn(s, { voice });
      if (!ipa) return { surface: s, found: false, claimed: false, method: null, nearest: null, reason: "no-g2p", candidates: [] };
      const hom = build().get(ipa) ?? [];
      if (hom.length === 1) return { surface: s, found: false, claimed: true, method: "homophone", nearest: hom[0], reason: null, candidates: forms[hom[0]], matches: hom, ipa };
      if (hom.length > 1) return { surface: s, found: false, claimed: false, method: "homophone", nearest: null, reason: "ambiguous-homophone", candidates: [], matches: hom, ipa };
      return { surface: s, found: false, claimed: false, method: null, nearest: null, reason: "no-homophone", candidates: [], ipa };
    },
  };
}
