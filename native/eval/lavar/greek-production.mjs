// greek-production.mjs — the PRODUCTION Ancient-Greek reader wrapper (2026-10-08).
//
// The recovered seam (greek.mjs) exposes the mechanics — confirmedVerbSet,
// greekClauses, greekBeings, caseOf — but it is given its priors by hand. This
// thin module is the ONE production entry point: it loads pos-grc and
// case-marking-grc from THE ONE HOME FOR THE PRIORS (janus/priors, the same
// directory reader-bundle.js reads as data), calls the seam, and returns a
// disclosed, never-fabricated reading:
//
//   readGreek(text, { articleMode:"soft" })
//     → { language:"grc", verbs, clauses, gaps, beings }
//
// `verbs` are the prior-confirmed verbs that actually occur in the text (the
// full confirmed set is 15k forms — we report what is heard here). `clauses`
// are the case-marked clauses the seam recovered. `gaps` are the clauses whose
// subject is grammaticalized IN the verb — the pro-drop disclosure: subject
// null, typed, never fabricated into a referent (greek.mjs's own header).
//
// LanguageRouter hook -->
//   In khora/native/the-fold/reader-bundle.js::dispatchExtractors(language),
//   route the Ancient-Greek register here instead of the eng dispatch. The
//   one-line integration, given `import { readGreek } from "../eval/lavar/greek-production.mjs"`:
//     if (language === "grc") return { mode: "grc", discoverRelationVocab: () => ({ verbs: new Set(readGreek(cachedText).verbs), candidates: [] }), extractRelations: () => [] };
//   (No edit is made to reader-bundle.js — a different ant owns that file; the
//   language leg already reaches it, this names the seam it should call.)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GRAMMAR_MIN_SHARE } from "../../adapters/text/grain-typing.js";
import { confirmedVerbSet, greekBeings, greekClauses } from "./greek.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// THE ONE HOME FOR THE PRIORS (janus): `../../..`-tripping from this file's dir
// (native/eval/lavar) lands on the workspace root, then janus/priors. A walk-up
// fallback keeps the read honest if the module is ever moved within the tree.
function resolvePriorsDir() {
  const direct = path.join(HERE, "..", "..", "..", "..", "janus", "priors");
  if (fs.existsSync(path.join(direct, "pos-grc.json"))) return direct;
  let d = HERE;
  for (let i = 0; i < 10; i += 1) {
    const cand = path.join(d, "janus", "priors");
    if (fs.existsSync(path.join(cand, "pos-grc.json"))) return cand;
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return direct;
}
export const PRIORS_DIR = resolvePriorsDir();

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
let _pos = null, _case = null;
function priors() {
  if (!_pos) {
    _pos = readJson(path.join(PRIORS_DIR, "pos-grc.json"));
    _case = readJson(path.join(PRIORS_DIR, "case-marking-grc.json"));
  }
  return { pos: _pos, casePrior: _case };
}

const TOKEN = /[\p{L}\p{N}’']+/gu;
/** verbsInText(text, confirmed) — the confirmed verbs that OCCUR in the text,
 *  unique, in order of first appearance. The prior confirms; the text decides
 *  which of the 15k it heard. Mechanical, never a hand list. */
function verbsInText(text, confirmed) {
  const out = [], seen = new Set();
  for (const m of String(text ?? "").matchAll(TOKEN)) {
    const w = m[0].toLowerCase();
    if (confirmed.has(w) && !seen.has(w)) { seen.add(w); out.push(m[0]); }
  }
  return out;
}

/** readGreek(text, opts) → { language, verbs, clauses, gaps, beings }.
 *  articleMode "soft" (the muse-swarm's declared floor) is the default: the
 *  preceding article overrides only a weak ending vote, never a strong one. */
export function readGreek(text, { articleMode = "soft", minShare = 0.6, minCount = 20, articleWindow = 1, minOccurrences = 2 } = {}) {
  const { pos, casePrior } = priors();
  const confirmed = confirmedVerbSet(pos, GRAMMAR_MIN_SHARE);
  const verbs = verbsInText(text, confirmed);
  const verbSet = new Set(verbs.map((v) => v.toLowerCase()));
  const beings = greekBeings(text, pos, { minOccurrences });
  const clauses = greekClauses(String(text ?? ""), verbSet, pos, casePrior, { beings, minShare, minCount, articleMode, articleWindow });
  // THE PRO-DROP DISCLOSURE: subject null is the reading, not a failure — the
  // clause's subject is in the verb (person+number) and is never fabricated.
  const gaps = clauses.map((c, i) => ({ clause: i, verb: c.verb, subject: null, kind: "pro-drop" }))
    .filter((_, i) => clauses[i].subject === null);
  return { language: "grc", articleMode, verbs, clauses, gaps, beings };
}

export default readGreek;
