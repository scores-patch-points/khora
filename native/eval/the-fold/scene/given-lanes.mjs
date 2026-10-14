// scene/given-lanes.mjs — THE GIVEN TIER of the corpus hyperlexicon: two lanes, one law.  (2026-10-14)
//
// The law (kernel/hyperlexicon.js, licenseStanding): a GIVEN row needs a NAMED giver AND a ground —
// a binding to the real governing text's bytes (a LICENSE) or a derivation stamped by the reading's own
// chemistry. "A giver with no ground and no chemistry is a reputation label, and it licenses nothing."
// That law decides what each lane may honestly do, so the lanes are NOT symmetric:
//
//   · CHARTER lane (UDHR as charter). The English declaration's own modal clauses are re-found at their
//     BYTES, and each (bearer × consequence) the charter states becomes a given row bound to the
//     digest of the charter's bytes. Only the declaration's own structure is licensed: the row ends are
//     typed keys (`bearer:universal` → `consequence:right`), never charter words, so the rows cannot
//     become a search term, a ground or a vocabulary source (feedback: ethos enables, never governs).
//
//   · RECEIVED LEXICONS lane (UD treebanks / UniMorph paradigms / Wiktionary dumps = janus/priors pos-*).
//     A POS prior says what a FORM is; it cannot say what two things may COMPOSE into, and a bare
//     lexicon giver would be refused by the wall as ungrounded. So this lane mints NOTHING: it attests,
//     per language, whether the candidate ends have nominal standing in a received lexicon, against a
//     null drawn from the SAME document's own types (is a relation end more lexically-nominal than an
//     arbitrary word of that text?). Priors that are projections of the UDHR's own parallel translation
//     are excluded — scoring the UDHR against itself is circular.
//
// Pure given its input files; seeded draws (mulberry32 from the weft's digest) so a rerun agrees
// byte-for-byte or names the drift.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ── the injunction reading's own closed class (read-injunctions.mjs:16-20; parity pinned by the test) ──
export const MODALS = Object.freeze([
  Object.freeze({ kind: "right", re: /\b(?:has|have) the right\b|\b(?:is|are) entitled\b/i }),
  Object.freeze({ kind: "prohibition", re: /\bnobody shall\b|\bno one shall\b/i }),
  Object.freeze({ kind: "duty", re: /\bshall\b/i }),
]);
export const BEARER_UNIVERSAL = /\beveryone\b|\bevery person\b|\ball\b|\bno one\b|\bnobody\b|\bmen and women\b/;
const SENT = /[^.!?]+[.!?]+/g;

export const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** The project's short-digest convention: sha256, first 32 hex chars. */
export const digest32 = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 32);

function sample(arr, n, rnd) {          // n of arr without replacement (partial Fisher–Yates on a copy)
  const a = arr.slice(); const m = Math.min(n, a.length);
  for (let i = 0; i < m; i++) { const j = i + Math.floor(rnd() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, m);
}
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

// ═════════════════════════════ THE CHARTER LANE ═════════════════════════════
const modalOf = (t) => MODALS.find((M) => M.re.test(t)) ?? null;
const sentencesOf = (text) => [...text.matchAll(SENT)].map((m) => ({ raw: m[0], index: m.index }));

/** Every sentence of `text` that carries a modal (kind + bearer), at its byte address. The reading's own rule, re-run on bytes. */
export function modalClauses(text) {
  const out = [];
  for (const { raw, index } of sentencesOf(text)) {
    const t = raw.trim(); if (!t) continue;
    const modal = modalOf(t); if (!modal) continue;
    const lead = raw.length - raw.trimStart().length;
    const mk = modal.re.exec(t);
    out.push({
      kind: modal.kind,
      bearer: BEARER_UNIVERSAL.test(t.toLowerCase()) ? "universal" : "other",
      at: Buffer.byteLength(text.slice(0, index + lead), "utf8"),
      text: t,
      // the byte address of the MODAL ITSELF — the witness a licence stands on
      markerAt: Buffer.byteLength(text.slice(0, index + lead + mk.index), "utf8"),
      marker: mk[0],
    });
  }
  return out;
}

/**
 * Re-find the prior reading's obligations at their bytes, then mint nothing the bytes do not carry.
 * @returns { charter, groups, verified, unverified, gates, controls, null }
 */
export function readCharter({ udhrPath, injunctionsPath, controlPath = null, draws = 1000, seed = 1 }) {
  const buf = fs.readFileSync(udhrPath);
  const text = buf.toString("utf8");
  const charter = { id: "UDHR", sha256: digest32(buf), bytes: buf.length };
  const prior = JSON.parse(fs.readFileSync(injunctionsPath, "utf8"));

  // verify every obligation of the injunction reading against the bytes: same kind, same bearer, the
  // modal's own bytes at the address. A mismatch is DISCLOSED, never minted.
  const here = modalClauses(text);
  const byAt = new Map(here.map((c) => [c.at, c]));
  const verified = []; const unverified = [];
  for (const o of prior.obligations) {
    const c = byAt.get(o.at);
    const ok = c && c.kind === o.kind && c.bearer === o.bearer && c.text.slice(0, 24) === o.text.slice(0, 24) &&
      buf.subarray(c.markerAt, c.markerAt + Buffer.byteLength(c.marker, "utf8")).toString("utf8") === c.marker;
    (ok ? verified : unverified).push(ok ? { ...o, markerAt: c.markerAt, marker: c.marker } : { id: o.id, kind: o.kind, bearer: o.bearer, at: o.at, why: c ? "kind/bearer/anchor differs from the bytes" : "no modal clause begins at this address" });
  }

  const groups = new Map();
  for (const o of verified) {
    const k = `${o.bearer}\u0000${o.kind}`;
    if (!groups.has(k)) groups.set(k, { bearer: o.bearer, kind: o.kind, witnesses: [], members: 0 });
    const g = groups.get(k); g.members += 1; g.witnesses.push(o.markerAt);
  }

  // NULLS (born from the charter's own bytes — no hand-set number):
  //   · chance: n random SENTENCES of the declaration → how often one carries a modal at all. Disclosed: the
  //     extraction picks modal sentences by construction, so this is the base rate the grounding is read against,
  //     not a significance test of the extraction.
  //   · control: a non-normative work (Pride and Prejudice by default), whole, through the SAME rule.
  const rnd = mulberry32(seed);
  const sents = sentencesOf(text).map((s) => s.raw.trim()).filter(Boolean);
  const baseRate = sents.filter((t) => modalOf(t)).length / (sents.length || 1);
  const n = verified.length;
  const nullRates = [];
  for (let d = 0; d < draws; d++) nullRates.push(sample(sents, n, rnd).filter((t) => modalOf(t)).length / (n || 1));
  const real = n ? n / prior.obligations.length : 0;      // verified / re-found obligations
  let control = null;
  if (controlPath && fs.existsSync(controlPath)) {
    // the WHOLE work: a same-size head is front matter (a title page and a contents list), which proves nothing
    const ctrl = fs.readFileSync(controlPath, "utf8");
    const cs = sentencesOf(ctrl).map((s) => s.raw.trim()).filter(Boolean);
    control = { path: path.basename(controlPath), sentences: cs.length, modalSentences: cs.filter((t) => modalOf(t)).length, rate: cs.filter((t) => modalOf(t)).length / (cs.length || 1) };
  }
  const stripped = text.replace(/\b(?:has|have) the right\b/gi, "xxx").replace(/\b(?:is|are) entitled\b/gi, "xxx").replace(/\bshall\b/gi, "xxx");
  const strippedClauses = modalClauses(stripped).length;

  return {
    charter, groups: [...groups.values()], verified, unverified,
    gates: {
      priorObligations: prior.obligations.length, verifiedAtBytes: verified.length, unverified: unverified.length,
      allWitnessesAreByteAddressed: verified.every((o) => Number.isInteger(o.markerAt)),
      modalStrippedClauses: strippedClauses,                                  // must be 0
      charterBeatsControl: control ? baseRate > control.rate : null,          // specificity, relative — no number
    },
    controls: { control, modalStripped: strippedClauses },
    null: { chanceBaseRate: baseRate, draws, n, nullMean: mean(nullRates), nullMax: Math.max(...nullRates, 0), realGroundedRate: real,
      note: "the extraction picks modal sentences by construction; this is the base rate a grounded address is read against, not a significance test" },
    giver: `UDHR — Universal Declaration of Human Rights, UN General Assembly resolution 217 A (III), 10 December 1948; English text as OHCHR publishes it (udhr-eng.txt), clauses read by ${path.basename(injunctionsPath)}`,
  };
}

// ═════════════════════════ THE RECEIVED-LEXICONS LANE ═════════════════════════
export function tierOfGiver(giver) {
  const g = String(giver ?? "");
  if (/^Universal Dependencies/.test(g)) return "treebank";
  if (/^UniMorph/.test(g)) return "paradigm";
  if (/kaikki|wiktionary/i.test(g)) return "wiktionary";
  if (/^projected from/i.test(g)) return "projected";
  return "other";
}
const TIER_ORDER = ["treebank", "paradigm", "wiktionary", "other"];            // projected never competes (circular for the UDHR)

/** The received POS prior for a UDHR code, or a typed gap. A projection of the UDHR itself is not a lexicon of it. */
export function priorFor(code, priorsDir) {
  const names = [...new Set([code, code.replace(/_/g, "-"), code.split("_")[0]])];
  const found = [];
  for (const base of names) {
    for (const f of fs.readdirSync(priorsDir).filter((x) => x === `pos-${base}.json` || x === `pos-${base}-unimorph.json`)) {
      const p = JSON.parse(fs.readFileSync(path.join(priorsDir, f), "utf8"));
      found.push({ file: f, tier: tierOfGiver(p.provenance?.giver), prior: p });
    }
  }
  const usable = found.filter((x) => x.tier !== "projected").sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  if (usable.length) return usable[0];
  if (found.length) return { gap: `only a projection of the UDHR's own parallel translation (${found.map((x) => x.file).join(", ")}) — circular as a lexicon of the UDHR` };
  return { gap: `no received POS prior for ${code}` };
}

const NOMINAL = ["NOUN", "PROPN"];
const typesOf = (text) => [...new Set((text.toLowerCase().match(/[\p{L}\p{M}]+/gu) ?? []))];
const codeOfWitness = (w) => /udhr-([a-z0-9_]+)\.txt#\d+$/.exec(w)?.[1] ?? null;

/**
 * Per language: how many candidate ends are ATTESTED, and how many carry NOMINAL standing, in a received lexicon —
 * against the same number of arbitrary types drawn from the same document. Mints nothing.
 */
export function lexicalLane({ composition, priorsDir, draws = 1000, seed = 1 }) {
  const byCode = new Map();
  for (const row of composition) {
    if (row.standing !== "candidate") continue;
    const w = (row.witnesses ?? []).find((x) => codeOfWitness(x));
    const code = w ? codeOfWitness(w) : null; if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, { path: w.replace(/#\d+$/, ""), ends: new Set() });
    const e = byCode.get(code).ends; e.add(String(row.left).toLowerCase()); e.add(String(row.right).toLowerCase());
  }
  const lanes = []; const gaps = [];
  for (const [code, { path: docPath, ends }] of [...byCode.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const found = priorFor(code, priorsDir);
    if (found.gap) { gaps.push({ code, ends: ends.size, why: found.gap }); continue; }
    const forms = found.prior.forms;
    const attested = (f) => Object.prototype.hasOwnProperty.call(forms, f);
    const nominal = (f) => attested(f) && NOMINAL.some((t) => forms[f][t] > 0);
    const E = [...ends].sort();
    const rate = (set, fn) => set.filter(fn).length / (set.length || 1);
    const types = fs.existsSync(docPath) ? typesOf(fs.readFileSync(docPath, "utf8")) : [];
    const rnd = mulberry32(seed + [...code].reduce((s, c) => s + c.charCodeAt(0), 0));
    const nullA = []; const nullN = [];
    for (let d = 0; d < draws; d++) { const s = sample(types, E.length, rnd); nullA.push(rate(s, attested)); nullN.push(rate(s, nominal)); }
    const obsA = rate(E, attested), obsN = rate(E, nominal);
    const cmp = (obs, nul) => ({ observed: obs, nullMean: mean(nul), nullMax: Math.max(...nul, 0),
      exceedsNull: obs > Math.max(...nul, 0), rank: (1 + nul.filter((x) => x >= obs).length) / (1 + nul.length) });
    const p = found.prior.provenance;
    lanes.push({
      code, prior: found.file, tier: found.tier, giver: p.giver, license: p.license,
      ends: E.length, docTypes: types.length,
      attested: cmp(obsA, nullA), nominal: cmp(obsN, nullN),
      note: types.length < E.length ? "document has fewer types than ends — null undefined" : undefined,
    });
  }
  return {
    schema: "LexicalLane@1",
    mints: 0,
    why: "a received lexicon says what a form IS, not what two ends may compose into; a bare lexicon giver is refused by the wall as ungrounded, so this lane attests and the rows stay candidates",
    draws, lanes, gaps,
  };
}
