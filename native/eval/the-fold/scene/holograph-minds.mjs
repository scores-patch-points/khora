// scene/holograph-minds.mjs — THE DISCUSSION OF SLAVES AND RULES, EXPERIENCED BY TWO MINDS AS A NETWORK THAT SHIFTS.  (v2, 2026-10-14)
//
//   node eval/the-fold/scene/holograph-minds.mjs [--null-draws 20] [--context 2]
//
// "It's not about sentences, it's about the holograph — holonic node networks shifting" (the user). The unit is a HOLON: here an
// OBLIGATION FRAME — who is bound (BEARER), who binds (ISSUER), the SIGN (a duty or a prohibition) and the MATTER (what they are
// bound to) — an addressed node that is a whole to the sentence it stands in for and a part of the network its mind holds.
//
// A MIND is a declared experiencer (organs/experiencer.js) over a fold of such holons. Reading a turn does three things to it:
//   ACTIVATE   the turn's frames touch the mind's holons by ROLE, never by word: bearer-kind and issuer-kind agree, where a KIND is
//              induced from position — a head that is the bearer in frames far more often than a shared-role null allows is of the
//              RULED kind, one that is the issuer far more often is of the RULER kind (a binomial tail against the fold's own base
//              rate, Bonferroni over the heads tested: no alpha typed in). An unspecified issuer is compatible with any.
//   SHIFT      an activated holon on the SAME MATTER moves by SIGN: the same sign strengthens it, the opposite violates it (a landing).
//   FEEL       kernel/dynamics.js reads the network the turn left: SURPRISE (the operations done), TENSION (open holons that
//              interact — here: the ACTIVATED ones that rest on the same matter — and how long they have stayed open), RELEASE (a
//              holon landing). organs/pathos.js composes them with the experiencer into the typed re-ground condition.
//
//   Straussian   the text as itself, whole (Strauss: an author is to be read as he understood himself). The fold is every frame the
//                speakers lay down — held from the start, closed — and a turn activates only within it, the text against itself.
//   Condorcetian   the opposite impulse: awash with context. No word is neutral and every utterance is half someone else's, so a turn
//                touches EVERYTHING the mind holds that it could touch — here the foundation's obligation frames of the ruled (WPA,
//                TRC, the struggle's documents), activated by ANY shared bearer, issuer, kind or matter, no gate.
//   the SPIRAL   what the system is: not either, but their collision, turn after turn. At each turn the flood (Condorcetian) and the
//                closure (Straussian) are laid beside each other: what floods in that the text holds no frame for is CONTEXT THE TEXT
//                DOES NOT CONTAIN; what the text holds that nothing floods to is TEXT NO LIVED VOICE REACHES; and the admitted set —
//                what the flood brings that the role-and-sign gate lets act — is what shifts the network. A flood the closure cannot
//                absorb is the re-ground's own condition (collapse), and the re-ground is REC·Ground at rising altitude
//                (organs/pathos.js): the concession is the altitude change, never an erasure.
//
// NULLS (size-matched). The Condorcetian is read against ${draws} minds built the SAME WAY from an equal number of obligation frames drawn
// from OTHER voices (farmers, hurricane interviews, children's books), each inducing its own kinds. The Kleinian's dependence on ORDER
// is read against the same turns shuffled. A mind is a point of view only if it shifts more than these.
//
// The standing disclosures stand: the Condorcetian's voices are selected (WPA interviewers, the TRC's question-and-answer form, the struggle's own
// documents); and the Straussian is Strauss's reading-as-he-understood-himself, not his esoteric one (the house's AntiStrauss archon is named against that).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathosOf, reGroundCondition } from "../../../organs/pathos.js";
import { obligation } from "../../../kernel/obligations.js";
import { loadModel, analyse, tokenize } from "../../../adapters/text/english-parser.js";
import { clausesOf } from "../../../adapters/text/nested-clauses.js";
import { negatorForms, isNegatorRow } from "./derived-lexicon.mjs";

const FOLD = "/Users/mlacy/Documents/3.0/the-fold";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const NULLS = Number(opt("--null-draws", 20)), CONTEXT = Number(opt("--context", 2));
const ENGLISH = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const SEED = 20261014;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const bytes = (s) => Buffer.byteLength(s, "utf8");
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ── the frame: read off a parse (a declared closed class of deontic cues, the injunction reader's own kind of rule) ───────────────────
const MODALS = new Set(["must", "ought", "shall", "should", "need", "needs", "needed", "have", "has", "had"]);   // have/has/had only with "to"
const OBEY = new Set(["obey", "follow", "serve", "submit", "heed", "mind"]);
const COMMAND = new Set(["command", "order", "forbid", "forbade", "forbidden", "bid", "make", "made", "let", "allow", "permit", "compel", "force", "require", "demand", "direct", "instruct", "tell", "told", "ask"]);
const NONDEONTIC = new Set(["like", "love", "prefer", "wish", "hope", "say", "think", "imagine", "suppose", "add", "observe", "mention", "remark", "venture", "submit", "beg", "suggest", "guess", "expect", "fancy"]);   // a closed class: verbs that make a modal a hedge or a courtesy
const model = loadModel(JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/parser-eng-ewt.json", "utf8")));
// negation is what the parser's own lexicon types as negation (Polarity=Neg / PronType=Neg, class agreeing with the POS prior) — derived-lexicon.mjs
const NEGW = negatorForms(model);
const STOPHEAD = new Set(["it", "that", "this", "which", "what", "there", "one", "thing", "things", "way"]);
const headNorm = (h) => String(h ?? "").toLowerCase().replace(/[^\p{L}']/gu, "").replace(/(?<=[a-z]{4})s$/, "");

/** sentence → { bearer, issuer, sign, matter } | null.  bearer/issuer are head words; issuer "∅" when the sentence names none. */
function frameOf(sentence) {
  const toks = tokenize(sentence);
  if (toks.length < 4 || toks.length > 60) return null;
  const rows = analyse(model, toks.map((t) => t.form));
  const cl = clausesOf(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const c of cl) {
    const pt = c.predicate.text.toLowerCase().split(/\s+/);
    const head = String(c.predicate.lemma ?? c.predicate.head).toLowerCase();
    const modal = pt.find((w) => MODALS.has(w) && (w !== "have" && w !== "has" && w !== "had" || rows.some((r) => r.form.toLowerCase() === "to" && r.head === c.head)));
    const cmd = COMMAND.has(head) ? head : null, obey = OBEY.has(head) ? head : null;
    if (modal && !cmd && !obey && NONDEONTIC.has(head)) continue;     // "I should like to know": a courtesy wish, not an obligation
    if (!modal && !cmd && !obey) continue;
    const neg = pt.some((w) => NEGW.has(w)) || /\b(?:forbid|forbade|forbidden)\b/.test(head) || rows.some((r) => r.head === c.head && (NEGW.has(r.form.toLowerCase()) || isNegatorRow(r)));
    let bearer = c.subject?.head ?? null, issuer = "∅", matter = head;
    if (cmd) {                                                         // X commands Y to Z: the issuer is the subject, the bearer the one acted on
      issuer = c.subject?.head ?? "∅"; bearer = c.object?.head ?? rows.find((r) => r.head === c.head && (r.deprel === "iobj" || r.deprel === "obj"))?.form ?? null;
      const x = rows.find((r) => r.head === c.head && (r.deprel === "xcomp" || r.deprel === "ccomp")); if (x) matter = String(x.lemma ?? x.form).toLowerCase();
    } else if (obey) { issuer = c.object?.head ?? "∅"; }              // the bearer obeys the issuer
    if (!bearer) continue;
    return { bearer: headNorm(bearer), issuer: issuer === "∅" ? "∅" : headNorm(issuer), sign: (cmd && /forbid|forbade|forbidden/.test(head)) || neg ? "-" : "+", matter: headNorm(matter) || head, deontic: modal ?? cmd ?? obey };
  }
  return null;
}

// ── the Republic: turns = every section where slaves and rules meet, with neighbours (contiguous runs, in order) ──────────────────
const SLAVE = /\b(slaves?|slavery|enslave\w*|servants?|bondmen|bondman|masters?|bondage|overseer|plantation|massa|owner)\b/i;
const RULE = /\b(rules?|rulers?|ruling|ruled|laws?|lawgivers?|govern\w*|tyrants?|tyranny|authority|subjects?|regulations?|apartheid|pass laws?|police|commission|state)\b/i;
const eRaw = fs.readFileSync(ENGLISH, "utf8");
const start = eRaw.indexOf("I went down yesterday to the Piraeus");
const marks = []; { const re = /\*(\d{3})([A-Ea-e])?\*/g; re.lastIndex = start; let m, last = 326; while ((m = re.exec(eRaw)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { marks.push({ page: p, letter: (m[2] ?? "A").toUpperCase(), idx: m.index, end: m.index + m[0].length }); last = p; } } }
const clean = (t) => t.replace(/\[Footnote[\s\S]*?\]/g, " ").replace(/\[Sidenote[\s\S]*?\]/g, " ").replace(/\{\d+\}/g, " ");
const secs = marks.map((mk, i) => { const stop = i + 1 < marks.length ? marks[i + 1].idx : mk.end + 3000; return { ...mk, sec: `${mk.page}${mk.letter}`, text: norm(clean(eRaw.slice(mk.end, stop))), at: bytes(eRaw.slice(0, mk.idx)) }; });
const inPlay = secs.map((s) => SLAVE.test(s.text) && RULE.test(s.text));
const keepIdx = new Set(); inPlay.forEach((p, i) => { if (p) for (let k = i - CONTEXT; k <= i + CONTEXT; k++) if (k >= 0 && k < secs.length) keepIdx.add(k); });
const turns = [...keepIdx].sort((a, b) => a - b).map((i) => secs[i]);
const sentOf = (t) => (t.match(/[^.!?]+[.!?]+/g) ?? []).map(norm).filter((s) => s.length >= 25 && /\b(must|ought|shall|should|need|have to|has to|had to|obey|command|order|forbid|forbade|forbidden|bid|made|make|let|allow|permit|compel|force|require|demand|tell|told|follow|serve|submit)\w*\b/i.test(s));
const turnFrames = turns.map((t) => sentOf(t.text).map((s) => ({ s, f: frameOf(s) })).filter((x) => x.f).map((x) => ({ ...x.f, text: x.s, witness: `${path.basename(ENGLISH)}#${t.at}`, sec: t.sec })));
console.log(`the Republic: ${secs.length} sections · slaves and rules meet in ${inPlay.filter(Boolean).length} · with ±${CONTEXT} neighbours ${turns.length} turns · obligation frames laid down: ${turnFrames.flat().length} in ${turnFrames.filter((x) => x.length).length} turns`);

// ── the foundation's frames ───────────────────────────────────────────────────────────────────────────────────────────────────────
const load = (f) => { try { const j = JSON.parse(fs.readFileSync(path.join(FOLD, "mind", f), "utf8")); return j.schema === "FoundationIndex@1" ? j : null; } catch { return null; } };
const pub = load("foundation-index.json"), loc = load("foundation-index.local.json");
let all = pub ?? loc; if (pub && loc) { const off = pub.docs.length; all = { ...pub, docs: [...pub.docs, ...loc.docs], units: [...pub.units, ...loc.units.map((u) => [u[0] + off, u[1], u[2]])] }; }
const CUE = /\b(must|ought|shall|should|need|have to|has to|had to|obey|command|order|forbid|forbade|forbidden|bid|made|make|let|allow|permit|compel|force|require|demand|tell|told|follow|serve|submit)\w*\b/i;
const RULED = new Set(["oral-history-us", "testimony-trc", "testimony"]);
const framesOf = (units) => units.filter((u) => CUE.test(u[2]) && u[2].length >= 25 && u[2].length <= 400).map((u) => ({ f: frameOf(norm(u[2])), u })).filter((x) => x.f).map((x) => ({ ...x.f, text: norm(x.u[2]), witness: `${all.docs[x.u[0]].file}#${x.u[1]}`, layer: all.docs[x.u[0]].layer }));
const t0 = Date.now();
const ruledFrames = framesOf(all.units.filter((u) => RULED.has(all.docs[u[0]].layer)));
const otherFrames = framesOf(all.units.filter((u) => !RULED.has(all.docs[u[0]].layer)));
console.log(`the foundation: obligation frames of the ruled ${ruledFrames.length} (${ruledFrames.filter((f) => f.sign === "-").length} prohibitions) · of other voices ${otherFrames.length}  [${Math.round((Date.now() - t0) / 1000)}s]`);

// ── kinds, induced from position ──────────────────────────────────────────────────────────────────────────────────────────────────
function lgamma(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const k of c) s += k / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
const logC = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
const tail = (k, n, p, upper) => { let s = 0; for (let i = upper ? k : 0; i <= (upper ? n : k); i++) s += Math.exp(logC(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p)); return Math.min(1, s); };
function induceKinds(frames) {
  const b = new Map(), s = new Map(); let nb = 0, ns = 0;
  for (const f of frames) { if (f.bearer && !STOPHEAD.has(f.bearer)) { b.set(f.bearer, (b.get(f.bearer) ?? 0) + 1); nb += 1; } if (f.issuer !== "∅" && !STOPHEAD.has(f.issuer)) { s.set(f.issuer, (s.get(f.issuer) ?? 0) + 1); ns += 1; } }
  const p0 = nb / ((nb + ns) || 1);
  const heads = [...new Set([...b.keys(), ...s.keys()])].filter((h) => (b.get(h) ?? 0) + (s.get(h) ?? 0) >= 3);
  const kind = new Map(); const bar = 1 / Math.max(1, heads.length);                  // Bonferroni: fewer than one false kind expected
  for (const h of heads) {
    const x = b.get(h) ?? 0, n = x + (s.get(h) ?? 0);
    if (x / n > p0 && tail(x, n, p0, true) < bar) kind.set(h, "RULED");
    else if (x / n < p0 && tail(x, n, p0, false) < bar) kind.set(h, "RULER");
  }
  return kind;
}
const LIGHT = new Set(["be", "do", "have", "make", "let", "go", "get", "say", "tell", "take", "give", "come", "put", "see", "know", "think", "want", "use", "ask", "need", "must", "ought", "shall", "should"]);
const kindOf = (kinds, h) => (h === "∅" ? "∅" : (kinds.get(h) ?? "OTHER"));

// ── a mind: a fold of holons, shifted turn by turn ──────────────────────────────────────────────────────────────────────────────
let oid = 0;
const holon = (f, tag, at) => ({ ...obligation({ id: `${tag}:${oid++}`, distinction: { materiality: { makesDifference: true, reasons: [{ kind: f.sign === "-" ? "prohibition" : "duty" }] } }, grounds: [f.matter], alternatives: [f.sign === "-" ? "permitted" : "refused"], consequences: [{ kind: f.sign === "-" ? "prohibition" : "duty" }], status: "open", openedAt: at, persistence: 0, witness: f.witness, text: f.text, bearer: f.bearer, issuer: f.issuer, sign: f.sign, matter: f.matter, }), bearer: f.bearer, issuer: f.issuer, sign: f.sign, matter: f.matter, layer: f.layer, text: f.text, sec: f.sec, witness: f.witness });
function mind({ who, read, held = [], mode = "gated", rezero = false, turnsIn, framesIn }) {
  const listener = false;
  const store = held.map((f) => holon(f, "held", -1));
  let kinds = induceKinds(held);
  const laid = [];                                          // the frames the speakers have laid down so far (the listener's whole fold)
  const status = new Map(); const activatedEver = new Set();
  const series = []; const shifts = [];
  turnsIn.forEach((t, i) => {
    const mine = framesIn[i];
    if (rezero) status.clear();                                        // RE-ZERO: the origin returns to the text as itself; nothing the figure did last turn is carried
    const before = { obligations: [...store, ...laid.map((f) => f.h)].map((o) => ({ ...o, status: status.get(o.id) ?? o.status })), expectations: [], sequence: i };
    const ops = []; const active = new Map();
    if (listener) kinds = induceKinds(laid.map((x) => x.f));          // the listener's kinds are those of the drama so far
    for (const f of mine) {
      const fh = holon(f, "text", i + 1);
      const fb = kindOf(kinds, f.bearer), fi = kindOf(kinds, f.issuer);
      const pool = store;
      for (const h of pool) {
        const hb = kindOf(kinds, h.bearer), hi = kindOf(kinds, h.issuer);
        if ((mode === "closed" || mode === "substance") && h.sec === t.sec) continue;           // the text against ITSELF: a frame does not act on its own section
        // ACTIVATE. gated: by role — bearer-kind agrees (both placed, or the very same head), an unspecified issuer compatible with any.
        // flood: by ANY contact — the same bearer, issuer, matter, or a placed kind in either role. Nothing is turned away.
        const bearerOk = (fb !== "OTHER" && fb === hb) || f.bearer === h.bearer;
        const issuerOk = f.issuer === "∅" || h.issuer === "∅" || (fi !== "OTHER" && fi === hi) || f.issuer === h.issuer;
        const touches = bearerOk || issuerOk || h.matter === f.matter || (fb !== "OTHER" && (fb === hb || fb === hi)) || (fi !== "OTHER" && (fi === hi || fi === hb));
        if (mode === "substance" ? !(h.matter === f.matter && !LIGHT.has(h.matter)) : mode === "flood" ? !touches : !(bearerOk && issuerOk)) continue;
        active.set(h.id, h); activatedEver.add(h.id);
        if (h.matter === f.matter && !LIGHT.has(f.matter)) {                // SHIFT: the same matter moves by sign
          const st = h.sign === f.sign ? "strengthened" : "violated";
          status.set(h.id, st);
          ops.push({ operator: st === "violated" ? "REC" : "EVA", mode: "Interpret", domain: "Structure", grain: "Pattern", inputs: [h.id], outputs: [fh.id], payload: { id: h.id, action: "resolve-obligation" }, witness: fh.witness });
          if (shifts.length < 4000) shifts.push({ turn: t.sec, holon: h, status: st, by: f });
        }
      }
      ops.push({ operator: "INS", mode: "Generate", domain: "Structure", grain: "Figure", inputs: [], outputs: [fh.id], payload: { id: fh.id, action: "obligation" }, witness: fh.witness });
      laid.push({ f, h: fh }); active.set(fh.id, fh);
    }
    // the network the turn left = the ACTIVATED holons (the working set), tension counted over those only
    const after = { obligations: [...active.values()].map((o) => ({ ...o, status: status.get(o.id) ?? o.status })), expectations: [], sequence: i + 1 };
    const beforeActive = { obligations: before.obligations.filter((o) => active.has(o.id)), expectations: [], sequence: i };
    const text = t.text.length >= 8 ? t.text.slice(0, 4000) : "x".repeat(8);
    const r = pathosOf({ text, experiencer: { who, read, revision: null }, fold: after, delta: { operations: ops }, beforeFold: beforeActive });
    series.push({ ids: [...active.keys()].filter((k) => !k.startsWith("text:")), matters: [...new Set([...active.values()].map((o) => o.matter))], turn: t.sec, frames: mine.length, active: active.size, surprise: r.curve.surprise.operations, violated: ops.filter((o) => o.operator === "REC").length, strengthened: ops.filter((o) => o.operator === "EVA").length, tension: r.curve.tension.interactionNetwork, open: r.curve.tension.obligations, persistence: r.curve.tension.persistenceMax, release: r.curve.release ?? 0, condition: reGroundCondition(r).kind });
  });
  return { series, shifts, activatedEver: activatedEver.size, held: store.length, kindsFinal: kinds };
}
const tot = (s, k) => s.reduce((n, x) => n + x[k], 0);
const summary = (m) => ({ activated: m.activatedEver, violated: tot(m.series, "violated"), strengthened: tot(m.series, "strengthened"), tension: tot(m.series, "tension"), peakActive: Math.max(0, ...m.series.map((x) => x.active)), release: tot(m.series, "release"), conditions: m.series.reduce((c, x) => ((c[x.condition] = (c[x.condition] ?? 0) + 1), c), {}) });

const textFrames = turnFrames.flat();
const K = mind({ who: "straussian:the-republic-as-itself (substance only)", read: `${ENGLISH}`, held: textFrames, mode: "substance", turnsIn: turns, framesIn: turnFrames });
const K0 = mind({ who: "straussian:the-republic-as-itself (roles kept)", read: `${ENGLISH}`, held: textFrames, mode: "closed", turnsIn: turns, framesIn: turnFrames });
const Zr = mind({ who: "condorcetian:the-ruled (role-gated, re-zeroed each turn)", read: `foundation: ${ruledFrames.length} obligation frames of the ruled`, held: ruledFrames, mode: "gated", rezero: true, turnsIn: turns, framesIn: turnFrames });
const Zs = mind({ who: "condorcetian:the-ruled (substance, same reading as the ground)", read: `foundation: ${ruledFrames.length} obligation frames of the ruled`, held: ruledFrames, mode: "substance", turnsIn: turns, framesIn: turnFrames });
const Zg = mind({ who: "condorcetian:the-ruled (role-gated)", read: `foundation: ${ruledFrames.length} obligation frames of the ruled`, held: ruledFrames, mode: "gated", turnsIn: turns, framesIn: turnFrames });
const Z = mind({ who: "condorcetian:the-ruled (flood)", read: `foundation: ${ruledFrames.length} obligation frames of the ruled (WPA, TRC, struggle documents)`, held: ruledFrames, mode: "flood", turnsIn: turns, framesIn: turnFrames });
const sK = summary(K), sZ = summary(Z), sG = summary(Zg), sK0 = summary(K0), sR = summary(Zr), sS = summary(Zs);
console.log(`STRAUSSIAN roles kept (closed, bearer/issuer gate): activated ${sK0.activated} · violated ${sK0.violated} · strengthened ${sK0.strengthened}`);
console.log(`CONDORCETIAN re-zeroed each turn (role-gated): activated ${sR.activated} · violated ${sR.violated} · strengthened ${sR.strengthened} · tension ${sR.tension} · ${JSON.stringify(sR.conditions)}`);
console.log(`CONDORCETIAN substance (the ground's own reading, applied to the ruled): activated ${sS.activated} · violated ${sS.violated} · strengthened ${sS.strengthened} · tension ${sS.tension}`);
const kinds = (m) => { const c = { RULED: 0, RULER: 0 }; for (const v of m.kindsFinal.values()) c[v] += 1; return c; };
console.log(`\nSTRAUSSIAN (the text as itself, ${textFrames.length} frames): kinds ${JSON.stringify(kinds(K))} · activated ${sK.activated} · violated ${sK.violated} · strengthened ${sK.strengthened} · tension ${sK.tension} · release ${sK.release} · ${JSON.stringify(sK.conditions)}`);
console.log(`CONDORCETIAN flood (${ruledFrames.length} frames, no gate): activated ${sZ.activated} · violated ${sZ.violated} · strengthened ${sZ.strengthened} · tension ${sZ.tension} (peak working set ${sZ.peakActive}) · release ${sZ.release} · ${JSON.stringify(sZ.conditions)}`);
console.log(`CONDORCETIAN role-gated (admitted): activated ${sG.activated} · violated ${sG.violated} · strengthened ${sG.strengthened} · tension ${sG.tension} (peak ${sG.peakActive}) · release ${sG.release} · ${JSON.stringify(sG.conditions)}`);
// THE SPIRAL: the collision of the two impulses, turn by turn
const textMatters = new Set(textFrames.map((f) => f.matter));
const spiral = turns.map((t, i) => { const F = new Set(Z.series[i].ids), G = new Set(Zg.series[i].ids); const flooded = [...F]; const admitted = [...G]; const novel = Z.series[i].matters.filter((m) => !textMatters.has(m)); return { turn: t.sec, flood: F.size, admitted: G.size, refused: F.size - [...G].filter((x) => F.has(x)).length, novelMatters: novel.length, closure: K.series[i].active, floodCond: Z.series[i].condition, gatedCond: Zg.series[i].condition, closedCond: K.series[i].condition }; });
const collisions = spiral.filter((x) => x.floodCond !== x.closedCond).length;
const novelAll = [...new Set(turns.flatMap((_, i) => Z.series[i].matters).filter((m) => !textMatters.has(m)))];
console.log(`THE SPIRAL: the flood touched ${tot(Z.series, "active")} holon-turns, the gate admitted ${tot(Zg.series, "active")}, the text's closure held ${tot(K.series, "active")}; the minds' typed conditions DISAGREE in ${collisions} of ${turns.length} turns; matters the flood brings that the text has no frame for: ${novelAll.length} (e.g. ${novelAll.slice(0, 8).join(", ")})`);
const flips = spiral.filter((x) => x.floodCond === "collapse").length;
console.log(`  turns where the flood is a COLLAPSE the closure cannot absorb (a re-ground is called for): ${flips} · lifted: ${spiral.filter((x) => x.floodCond === "lifted").length} · holds: ${spiral.filter((x) => x.floodCond === "ground_holds").length}`);

// ── nulls ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const nullZ = [];
for (let d = 0; d < NULLS; d++) {
  const pick = shuffle(otherFrames).slice(0, ruledFrames.length);
  nullZ.push(summary(mind({ who: `random:${d}`, read: `foundation: ${pick.length} obligation frames of other voices`, held: pick, mode: "gated", turnsIn: turns, framesIn: turnFrames })));
}
const nullOrder = [];
for (let d = 0; d < NULLS; d++) { const idx = shuffle(turns.map((_, i) => i)); const s = summary(mind({ who: `shuffled:${d}`, read: ENGLISH, held: textFrames, mode: "closed", turnsIn: idx.map((i) => turns[i]), framesIn: idx.map((i) => turnFrames[i]) })); nullOrder.push(s); }
const arr = (a, k) => a.map((x) => x[k]); const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const cmp = (v, a) => `${v}  · other voices: mean ${mean(a).toFixed(1)}, best ${Math.max(0, ...a)}  → ${v > Math.max(0, ...a) ? "ABOVE every random mind" : "not above the best random mind"}`;
console.log(`\nCondorcetian role-gated against ${NULLS} size-matched minds of other voices (${ruledFrames.length} frames each, each inducing its own kinds):`);
console.log(`  holons activated:    ${cmp(sG.activated, arr(nullZ, "activated"))}`);
console.log(`  holons violated:     ${cmp(sG.violated, arr(nullZ, "violated"))}`);
console.log(`  holons strengthened: ${cmp(sG.strengthened, arr(nullZ, "strengthened"))}`);
console.log(`Straussian against the same ${turns.length} turns in ${NULLS} shuffled orders: violated ${sK.violated} (shuffled mean ${mean(arr(nullOrder, "violated")).toFixed(1)}, range ${Math.min(...arr(nullOrder, "violated"))}–${Math.max(...arr(nullOrder, "violated"))}) · strengthened ${sK.strengthened} (mean ${mean(arr(nullOrder, "strengthened")).toFixed(1)}, range ${Math.min(...arr(nullOrder, "strengthened"))}–${Math.max(...arr(nullOrder, "strengthened"))})`);

// ── the shifts, quoted ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const q = (s) => `  [${s.status}] ${s.turn}  PLATO: "${s.by.text.slice(0, 150)}"\n        ${s.holon.layer ?? "text"}: "${s.holon.text.slice(0, 160)}"  ${s.holon.witness}`;
const zv = Zg.shifts.filter((s) => s.status === "violated"), zs = Zg.shifts.filter((s) => s.status === "strengthened");
console.log(`\nthe ruled's network shifted ${Zg.shifts.length} times (admitted): ${zs.length} strengthened, ${zv.length} violated`);
for (const s of zs.slice(0, 3)) console.log(q(s));
for (const s of zv.slice(0, 3)) console.log(q(s));
const kLines = K.shifts.slice(0, 3);
console.log(`\nthe text's own network shifted ${K.shifts.length} times (the text against itself)`);
for (const s of kLines) console.log(q(s));

const md = [`# The discussion of slaves and rules — two minds, a network that shifts`, "",
  `> **Standpoint, declared (Zinn).** The Condorcetian mind is awash with the voices of the people who were ruled. Its ${ruledFrames.length} obligation frames come from WPA narrators selected and prompted by 1930s interviewers, TRC witnesses answering the commission's questions, and the struggle's own documents: what survives in these archives, not what was lived. The Straussian mind holds the Republic as itself, whole: only what its own speakers laid down (Strauss: read the author as he understood himself — not the esoteric reading the house's AntiStrauss is named against).`, "",
  `*${turns.length} turns (every section where slaves and rules meet, with ±${CONTEXT} neighbours, in order); ${turnFrames.flat().length} obligation frames laid down by the speakers. A holon is an obligation frame (bearer, issuer, sign, matter) at its address; activation is by role-kind and sign, never by word.*`, "",
  `| | activated | violated | strengthened | tension (activated only) | release | re-ground conditions |`, `|---|---|---|---|---|---|---|`,
  `| Straussian (the text, ${textFrames.length} frames) | ${sK.activated} | ${sK.violated} | ${sK.strengthened} | ${sK.tension} | ${sK.release} | ${JSON.stringify(sK.conditions)} |`,
  `| Condorcetian flood (${ruledFrames.length} held, no gate) | ${sZ.activated} | ${sZ.violated} | ${sZ.strengthened} | ${sZ.tension} | ${sZ.release} | ${JSON.stringify(sZ.conditions)} |`, `| Condorcetian role-gated (admitted) | ${sG.activated} | ${sG.violated} | ${sG.strengthened} | ${sG.tension} | ${sG.release} | ${JSON.stringify(sG.conditions)} |`, "", `**The spiral:** the flood touched ${tot(Z.series, "active")} holon-turns, the gate admitted ${tot(Zg.series, "active")}, the closure held ${tot(K.series, "active")}; typed conditions disagree in ${collisions} of ${turns.length} turns; ${novelAll.length} matters flood in that the text has no frame for.`, "",
  `Size-matched minds of other voices, role-gated (${NULLS}): activated mean ${mean(arr(nullZ, "activated")).toFixed(1)} (best ${Math.max(0, ...arr(nullZ, "activated"))}), violated mean ${mean(arr(nullZ, "violated")).toFixed(1)} (best ${Math.max(0, ...arr(nullZ, "violated"))}), strengthened mean ${mean(arr(nullZ, "strengthened")).toFixed(1)} (best ${Math.max(0, ...arr(nullZ, "strengthened"))}). Straussian shuffled orders: violated mean ${mean(arr(nullOrder, "violated")).toFixed(1)}, strengthened mean ${mean(arr(nullOrder, "strengthened")).toFixed(1)}.`, "",
  `## The ruled's holons the Republic shifted`, "", ...[...zv.slice(0, 15), ...zs.slice(0, 15)].map((s) => `- **${s.status}** (${s.turn}) — Plato: “${s.by.text.slice(0, 200)}” ⟷ ${s.holon.layer}: “${s.holon.text.slice(0, 220)}”  \`${s.holon.witness}\``), "",
  `## Per turn`, "", `| turn | frames | closure (S) | S cond | flood (B) | admitted | refused | novel matters | B-flood cond | B-gated cond |`, `|---|---|---|---|---|---|---|---|---|---|`,
  ...spiral.map((x, i) => `| ${x.turn} | ${K.series[i].frames} | ${x.closure} | ${x.closedCond} | ${x.flood} | ${x.admitted} | ${x.refused} | ${x.novelMatters} | ${x.floodCond} | ${x.gatedCond} |`)];
fs.writeFileSync(path.join(HERE, "holograph-minds.slaves-and-rules.md"), md.join("\n") + "\n");
fs.writeFileSync(path.join(HERE, "holograph-minds.slaves-and-rules.json"), JSON.stringify({ at: new Date().toISOString(), version: 2, seed: SEED, turns: turns.map((t) => t.sec), republicFrames: turnFrames.flat().length, ruledFrames: ruledFrames.length, otherFrames: otherFrames.length, straussian: { ...sK, kinds: kinds(K), series: K.series.map(({ ids, matters, ...r }) => r) }, condorcetianFlood: { ...sZ, series: Z.series.map(({ ids, matters, ...r }) => r) }, condorcetianGated: { ...sG, kinds: kinds(Zg), series: Zg.series.map(({ ids, matters, ...r }) => r) }, spiral, novelMatters: novelAll, nulls: { draws: NULLS, zinnian: nullZ, shuffledOrder: nullOrder } }, null, 2) + "\n");
console.log(`\n→ ${path.join(HERE, "holograph-minds.slaves-and-rules.md")}`);
