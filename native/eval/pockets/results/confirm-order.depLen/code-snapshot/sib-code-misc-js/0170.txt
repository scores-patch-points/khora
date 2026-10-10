// penelope/organs/steersman.mjs — Thea's sight, appointed.
//
// Handle: Thea — the Titaness of sight: clear seeing turned into remedy.
// The real thea.js remedies the box's homeostasis (pace/defer/escalate...)
// from Apollo's findings; THIS organ is the same shape pointed at discourse:
// the clear eye that reads the shadow (ConcernField@1 priors) and turns the
// seeing into an ACTIVATION — which archons are live on this topic, for
// whom. Appointed mnemonic, never a measured claim (the GL-WV-11 law: the
// house never presents a mythic map as evidence).
//
// WHAT IT DOES (pure — it steers, it never draws):
//   1. TYPES THE DISCOURSE MOVE — Socrates' elenctic moves, closed
//      vocabulary, mechanical signatures on the asker's turn (mirroring the
//      socrates-priors move table's intent): consumption, aporia, question,
//      refutation, premise, method, midwifery. A turn may carry several;
//      all matched moves are recorded, the primary is the priority order.
//   2. PERFORMS THE CONSUMPTION MOVE — Terry Gross listening: the envelope
//      carries the prior turn it answers, so the response is TETHERED to
//      what was actually said. This is the anti-schizoid seam: one thread,
//      no voice answering beside the conversation.
//   3. ACTIVATES FROM THE SHADOW — the topic's own tokens against each
//      archon's admitted concern terms; an archon activates when the
//      overlap clears the population null (expected overlap of a random
//      topic-sized draw = |shadow|·|topic|/|U| — never a hand-set floor).
//      When a canon is not in the topic's language, the metadata lane
//      (giver/work/quote — pythia's own autoPick surface) is disclosed as
//      the fallback. Neither lane touches → APORIA: declared not-knowing,
//      never ventriloquy. The metadata lane is DISCLOSED-WEAK by design:
//      pythia's autoPick surface measures ~chance (falsify-null-overlap
//      AUC 0.542), so a metadata activation is a POINTER to look, never a
//      ground to speak from — the voice layer must not rest a confident
//      answer on it alone.
//
// THE LAW IT CARRIES: pathos never gates and never grades; it discloses
// whose stake the claim is. Logos is untouched: this organ changes nothing
// about how claims are read, folded, or tested. The mouth is never cued
// with a name — the envelope carries grounds (matched terms + their byte
// addresses in the canon), and the voice layer cuts its windows there.
import fs from "node:fs";
import path from "node:path";
import { loadRole } from "./pythia.mjs";

const ROOT = "/Users/mlacy/Documents/3.0";
const MANIFEST_DIR = path.join(ROOT, "eo-teachings/manifest");
const SHADOW_DIR = path.join(ROOT, "ethos/derived-priors/concern-priors/concern-fields");

// ── the elenctic moves, closed vocabulary (the socrates-priors table,
// retyped for the English asker's surface — signatures declared, never
// tuned): priority order IS the primary-move order ──
const MOVES = [
  { id: "aporia", signatures: ["i don't know", "i do not know", "not sure", "no idea", "can't tell"] },
  { id: "consumption", signatures: ["you said", "you wrote", "you claimed", "you called", "you mean", "as you put", "you just said", "you argued"] },
  { id: "question", signatures: ["what", "who", "when", "where", "why", "how", "does", "do you", "is it", "can you", "would you", "should", "?"] },
  { id: "refutation", signatures: ["but", "however", "yet", "contradicts", "wrong", "no,", "that's not", "that is not"] },
  { id: "premise", signatures: ["assume", "suppose", "given that", "let's say", "imagine"] },
  { id: "method", signatures: ["how do you know", "how do we know", "how do we test", "what's the method", "what is the method", "verify"] },
  { id: "midwifery", signatures: ["what do you think", "what would you ask", "help me see", "walk me through", "tell me"] },
];

function typeMove(turn) {
  const t = String(turn ?? "").toLowerCase();
  const matched = MOVES.filter((m) => m.signatures.some((s) => t.includes(s))).map((m) => m.id);
  return { all: matched.length ? matched : ["other"], primary: matched.length ? matched[0] : "other" };
}

function loadRoleLazy(rec) {
  try { return loadRole(rec); } catch { return null; }
}

// ── the cast and the shadow, loaded once ────────────────────────────────────
function loadCast() {
  const byKey = new Map();
  for (const f of fs.readdirSync(MANIFEST_DIR)) {
    if (!f.endsWith(".json")) continue;
    let r;
    try { r = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, f), "utf8")); } catch { continue; }
    const key = String(r.handle ?? "").toLowerCase();
    if (!key || !r.giver) continue;
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, r);
    else if (r.status === "verified" || r.status === "verified_local_archive_pending") byKey.set(key, r);
  }
  return byKey;
}

function loadShadow() {
  const out = new Map();
  if (!fs.existsSync(SHADOW_DIR)) return out;
  for (const f of fs.readdirSync(SHADOW_DIR)) {
    if (!f.endsWith(".json")) continue;
    let p;
    try { p = JSON.parse(fs.readFileSync(path.join(SHADOW_DIR, f), "utf8")); } catch { continue; }
    if (!p.handle || !Array.isArray(p.terms)) continue;
    const terms = new Set(p.terms.map((t) => t.term));
    if (Array.isArray(p.entities)) for (const e of p.entities) terms.add(e.name);
    const grounds = new Map(p.terms.map((t) => [t.term, t.addresses?.[0] ?? null]));
    out.set(String(p.handle).toLowerCase(), { prior: p, terms, grounds });
  }
  return out;
}

function topicTokens(text) {
  const seen = new Set();
  for (const m of String(text ?? "").toLowerCase().matchAll(/\p{L}{3,}/gu)) seen.add(m[0]);
  return [...seen];
}

function unionVocab(shadows) {
  const u = new Set();
  for (const s of shadows.values()) for (const t of s.terms) u.add(t);
  return u.size;
}

// ── the steering ────────────────────────────────────────────────────────────
export function steer({ turn, priorTurn = null, cast = null, shadow = null } = {}) {
  if (!turn) return { refused: "no_turn" };
  const theCast = cast ?? loadCast();
  const theShadow = shadow ?? loadShadow();
  const move = typeMove(turn);
  const U = unionVocab(theShadow);

  // the topic's mattering tokens: a token that touches more than HALF the
  // cast (shadow or metadata) is common ground — grammar, not concern — and
  // is excluded before any scoring (the "beat the population" shape, the
  // same null the shadow itself runs). Never a hand-set stopword list.
  const topic = topicTokens(turn).filter((t) => {
    let touches = 0;
    const total = theShadow.size;
    for (const [key, sh] of theShadow) {
      if (sh.terms.has(t)) { touches += 1; continue; }
      const rec = theCast.get(key);
      if (rec && `${rec.giver ?? ""} ${rec.work ?? ""} ${rec.quote ?? ""}`.toLowerCase().includes(t)) touches += 1;
    }
    return touches * 2 <= total;
  });

  // per-archon cast-coverage of each topic token (how many shadows hold it):
  // the envelope discloses it per ground so the voice layer can weigh a
  // residue term — the print discloses the terrain, the consumer judges
  const coverageOf = (() => {
    const cov = new Map();
    for (const t of topic) {
      let n = 0;
      for (const sh of theShadow.values()) if (sh.terms.has(t)) n += 1;
      cov.set(t, n);
    }
    return (t) => `${cov.get(t) ?? 0}/${theShadow.size}`;
  })();

  // the mattering floor, measured from the shadow itself: the coverage
  // distribution of all admitted terms across the cast (2026-10-01:
  // mean 1.16, sd 0.59, p99 = 3). A ground shared by more canons than the
  // p99 coverage is RESIDUE — the language itself, not a concern ("you" at
  // 11/60, "that" at 14/60); a ground at or below it is a mattering
  // ("moral" at 3/60, shared because it is a concept). Derived, never set.
  const cov = new Map();
  for (const sh of theShadow.values()) for (const t of sh.terms) cov.set(t, (cov.get(t) ?? 0) + 1);
  const covs = [...cov.values()].sort((a, b) => a - b);
  const p99 = covs.length ? covs[Math.min(covs.length - 1, Math.floor(0.99 * covs.length))] : 1;
  const mattering = (t) => (cov.get(t) ?? 0) <= p99;

  // the JURISDICTION lane: the ask's KIND, typed by a closed vocabulary
  // (declared, mechanical — the same shape as the elenctic move table), is
  // scored against each archon's deep role. The shadow says what a canon
  // DWELLS on; the role says what jurisdiction it HOLDS. "how do we know a
  // correlation is real?" is an evidence-kind ask — the router checks in
  // with the gate/evidence archons BEFORE the reasoning fires, not only
  // with whoever's vocabulary the words happen to touch.
  const KIND = [
    "know", "true", "real", "evidence", "measure", "verify", "prove", "test", "corroborat",
    "witness", "count", "chain", "sample", "correlation", "cause", "data", "check", "confirm",
    "law", "gate", "clearance", "record", "archive", "history", "order",
    "felt", "undergo", "heart", "experience", "suffer", "beauty", "taste",
    "method", "reason", "logic", "argument", "contradict", "refute", "question",
  ];
  const kindWords = topic.filter((t) => KIND.some((k) => t.startsWith(k)) || KIND.includes(t));
  const jurisdiction = [];
  if (kindWords.length) {
    for (const [key, rec] of theCast) {
      if (!rec.handleFile) continue;
      let role = null;
      try { role = loadRoleLazy(rec); } catch { continue; }
      if (!role) continue;
      const rl = role.toLowerCase();
      const hits = kindWords.filter((t) => rl.includes(t));
      if (hits.length) jurisdiction.push({ handle: rec.handle, lane: "jurisdiction", score: hits.length, overlap: hits.length, expected: 0, grounds: hits.map((t) => ({ term: t, address: null, castCoverage: "role", mattering: true })) });
    }
    jurisdiction.sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle));
  }

  const activation = [];
  const aporiaReasons = [];
  for (const [key, sh] of theShadow) {
    const rec = theCast.get(key);
    if (!rec) continue;
    const overlap = topic.filter((t) => sh.terms.has(t)).length;
    if (overlap > 0) {
      const expected = (sh.terms.size * topic.length) / Math.max(1, U);
      if (overlap > expected) {
        const grounds = topic.filter((t) => sh.terms.has(t)).map((t) => ({ term: t, address: sh.grounds.get(t) ?? null, castCoverage: coverageOf(t), mattering: mattering(t) }));
        // an activation must rest on at least one MATTERING ground — a set
        // of residue terms alone is the language, not a touch
        if (!grounds.some((g) => g.mattering)) continue;
        activation.push({ handle: rec.handle, lane: "shadow", score: overlap, overlap, expected: Number(expected.toFixed(3)), grounds });
        continue;
      }
    }
    // the metadata lane (pythia's own autoPick surface): giver + work + quote.
    // Requires >= 2 DISTINCT topic tokens in the record — the structural
    // "2" floor clippy.js/binding.js already stand on (reused, never a
    // fresh number): one coincidental word is not a touch.
    const meta = `${rec.giver ?? ""} ${rec.work ?? ""} ${rec.quote ?? ""}`.toLowerCase();
    const metaHits = topic.filter((t) => meta.includes(t));
    if (metaHits.length >= 2) {
      activation.push({ handle: rec.handle, lane: "metadata", weak: true, score: metaHits.length, overlap: metaHits.length, expected: 0, grounds: metaHits.map((t) => ({ term: t, address: null })) });
    }
  }

  activation.sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle));
  const aporia = activation.length === 0 && jurisdiction.length === 0;
  if (aporia) aporiaReasons.push("no archon's concern field, jurisdiction, or metadata touched the topic's tokens above the population null");

  // the whole cast is covered: an archon with no shadow (no canon in the
  // priors) is NAMED AND REFUSED, never ventriloquized — pythia's own
  // printCast idiom (an archon with no verified words is named, not spoken)
  const activatedKeysAll = new Set([...activation, ...jurisdiction].map((a) => a.handle.toLowerCase()));
  const refused = [];
  for (const [key, rec] of theCast) {
    if (activatedKeysAll.has(key)) continue;
    if (theShadow.has(key)) continue;
    refused.push({ handle: rec.handle, why: `no shadow: ${rec.status ?? "no manifest"} — the full original text is not in the priors` });
  }
  refused.sort((a, b) => a.handle.localeCompare(b.handle));

  // shadowed but not touched by this topic — named present, never forgotten
  const present = [];
  for (const [key, sh] of theShadow) {
    if (activatedKeysAll.has(key)) continue;
    const rec = theCast.get(key);
    present.push({ handle: rec?.handle ?? key, lane: "shadow", touched: false });
  }
  present.sort((a, b) => a.handle.localeCompare(b.handle));

  return {
    schema: "SteeringEnvelope@1",
    giver: "thea",
    standing: "appointed",
    move,
    topic: { tokens: topic, from: "asker's turn" },
    consumption: priorTurn ? { of: String(priorTurn).slice(0, 500), consumed: true } : { consumed: false },
    activation,
    jurisdiction,
    present,
    refused,
    roster: { total: theCast.size, activated: activation.length + jurisdiction.length, present: present.length, refused: refused.length },
    aporia,
    aporiaReasons,
    disclosure: "pathos: whose stake the claim is — never a gate, never a grade; logos is untouched; the mouth is never cued with a name",
  };
}

const isMain = (() => { try { return import.meta.url === `file://${path.resolve(process.argv[1] ?? "")}`; } catch { return false; } })();
if (isMain) {
  const turn = process.argv.slice(2).join(" ") || "what is the genealogy of moral values?";
  const env = steer({ turn });
  console.log(JSON.stringify(env, null, 2));
}