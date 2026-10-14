// scene/foucault-sublation.mjs — THE GENEALOGIST WIRED IN, AND THE SUBLATION THAT LEVERAGES THE TENSION.  (2026-10-14)
//
//   node eval/the-fold/scene/foucault-sublation.mjs [--null-draws 100] [--context 2]
//
// Two minds read the same turns and a third act joins them.
//   GROUND   (Strauss) the Republic as itself, substance only: matter × sign, no bearer, issuer, layer or date — the re-zero.
//   FIGURE   (Foucault) context used to show the claimed-universal is contingent: for each rule the text lays down, WHO issues it
//            and under what, in the voices that hold the same matter. A rule the text states with no one commanding (issuer ∅) is
//            presented as natural; the genealogist's act is to supply the issuer from context. Not progress, not decay: conditions.
//   SUBLATION the synthesis, a mechanical act over the two readings that keeps both and adds the relation neither holds:
//            DEF  a matter the text left unissued is DEFINED with the issuers the context gives it
//            EVA  the same matter held with the same sign across contexts — the claim EVALUATED as surviving them
//            REC  the same matter held with the opposite sign — RECONCILED: both kept, the dispute lifted to a typed record
//   The record is what the system's mind takes up. Neither reading is altered by it (tested: the ground is byte-identical with and
//   without the context loaded; every context holon that shifted a text frame is in a record; each record carries both addresses).
// Disclosures: context here is the ruled's voices (WPA, TRC, struggle documents) — one lane of three; the world-of-the-text lane
// (Athenian primary sources, scholarship) is not yet loaded. The matter is a verb lemma. Foucault's own words are in copyright (the
// dossier stands deferred, with Nietzsche's PD passage as the verified ancestor of the method).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathosOf, reGroundCondition } from "../../../organs/pathos.js";
import { obligation } from "../../../kernel/obligations.js";
import { loadModel, analyse, tokenize } from "../../../adapters/text/english-parser.js";
import { clausesOf } from "../../../adapters/text/nested-clauses.js";

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
const NEGW = new Set(["not", "n't", "never", "no", "nobody", "nothing", "neither", "nor", "cannot", "without"]);
const model = loadModel(JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/parser-eng-ewt.json", "utf8")));
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
    const neg = pt.some((w) => NEGW.has(w)) || /\b(?:forbid|forbade|forbidden)\b/.test(head) || rows.some((r) => r.head === c.head && NEGW.has(r.form.toLowerCase()));
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
const frozen = JSON.stringify(textFrames);
const K = mind({ who: "straussian:the-republic-as-itself (substance only)", read: ENGLISH, held: textFrames, mode: "substance", turnsIn: turns, framesIn: turnFrames });
const kSig0 = JSON.stringify(summary(K));
const Zs = mind({ who: "foucauldian:context (substance reading)", read: `foundation: ${ruledFrames.length} frames of the ruled`, held: ruledFrames, mode: "substance", turnsIn: turns, framesIn: turnFrames });

// ── the sublation: records over (text frame, contexts that held its matter) ────────────────────────────────────────────────────
function sublate(shifts) {
  const by = new Map();                                   // text frame → { f, turn, contexts: Map(witness → ctx) }
  for (const s of shifts) { const k = s.by; const r = by.get(k) ?? { f: k, turn: s.turn, contexts: new Map() }; if (!r.contexts.has(s.holon.witness)) r.contexts.set(s.holon.witness, { layer: s.holon.layer, witness: s.holon.witness, sign: s.holon.sign, issuer: s.holon.issuer, bearer: s.holon.bearer, text: s.holon.text }); by.set(k, r); }
  const recs = [];
  for (const r of by.values()) {
    const cs = [...r.contexts.values()];
    const same = cs.filter((c) => c.sign === r.f.sign), opp = cs.filter((c) => c.sign !== r.f.sign);
    const issuers = [...cs.reduce((m, c) => (c.issuer !== "∅" && m.set(c.issuer, (m.get(c.issuer) ?? 0) + 1), m), new Map())].sort((a, b) => b[1] - a[1]);
    const ops = [];
    if (r.f.issuer === "∅" && issuers.length) ops.push({ op: "DEF", issuers: issuers.slice(0, 5).map(([h, n]) => `${h}×${n}`) });
    if (same.length) ops.push({ op: "EVA", held: same.length });
    if (opp.length) ops.push({ op: "REC", disputed: opp.length, altitude: 1 });
    recs.push({ turn: r.turn, text: r.f.text, textWitness: r.f.witness, matter: r.f.matter, sign: r.f.sign, issuerIn: r.f.issuer, ops, contexts: cs.map((c) => ({ layer: c.layer, witness: c.witness, sign: c.sign, issuer: c.issuer, text: c.text.slice(0, 200) })), contextCount: cs.length });
  }
  return recs;
}
const recs = sublate(Zs.shifts);
const count = (rs) => ({ frames: rs.length, DEF: rs.filter((r) => r.ops.some((o) => o.op === "DEF")).length, EVA: rs.filter((r) => r.ops.some((o) => o.op === "EVA")).length, REC: rs.filter((r) => r.ops.some((o) => o.op === "REC")).length, contexts: rs.reduce((n, r) => n + r.contextCount, 0) });
const obs = count(recs);
const naturalized = textFrames.filter((f) => f.issuer === "∅").length;
console.log(`\nGROUND: ${textFrames.length} text frames · ${naturalized} state a rule with no one commanding (issuer ∅, the naturalized)`);
console.log(`FIGURE: the context held the same matter as ${obs.frames} of them, through ${obs.contexts} distinct voices`);
console.log(`SUBLATION: DEF ${obs.DEF} (an issuer supplied to a naturalized rule) · EVA ${obs.EVA} (survives context) · REC ${obs.REC} (disputed, both kept, lifted)`);

// ── born null: the same context frames with their matters permuted (the link from matter to frame broken; sign, issuer, layer kept) ──
const nulls = [];
const DR = Number(opt("--null-draws", 100));
for (let d = 0; d < DR; d++) {
  const ms = shuffle(ruledFrames.map((f) => f.matter));
  const held = ruledFrames.map((f, i) => ({ ...f, matter: ms[i] }));
  const z = mind({ who: `perm:${d}`, read: "perm", held, mode: "substance", turnsIn: turns, framesIn: turnFrames });
  nulls.push(count(sublate(z.shifts)));
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const rows = ["frames", "DEF", "EVA", "REC", "contexts"].map((k) => { const a = nulls.map((n) => n[k]); const best = Math.max(0, ...a); return { k, obs: obs[k], mean: mean(a), best, above: obs[k] > best, p: (a.filter((x) => x >= obs[k]).length + 1) / (DR + 1) }; });
for (const r of rows) console.log(`  ${r.k.padEnd(9)} observed ${String(r.obs).padStart(4)} · permuted-matter null mean ${r.mean.toFixed(1)}, best of ${DR} ${r.best} → ${r.above ? "ABOVE every draw" : "not above the best draw"} (p=${r.p.toFixed(3)})`);

// ── the properties the sublation must keep ───────────────────────────────────────────────────────────────────────────────────────
const checks = [];
checks.push(["ground untouched: text frames byte-identical after context was loaded", JSON.stringify(textFrames) === frozen]);
checks.push(["ground untouched: the ground's own reading is the same when re-read after the context minds ran", JSON.stringify(summary(mind({ who: "straussian:again", read: ENGLISH, held: textFrames, mode: "substance", turnsIn: turns, framesIn: turnFrames }))) === kSig0]);
const shiftedVoices = new Set(Zs.shifts.map((s) => `${s.by.witness}|${s.by.text}|${s.holon.witness}`));
const recordedVoices = new Set(recs.flatMap((r) => r.contexts.map((c) => `${r.textWitness}|${r.text}|${c.witness}`)));
checks.push(["preserves both: every (text frame, context voice) that shifted is in a record", [...shiftedVoices].every((x) => recordedVoices.has(x))]);
checks.push(["both addresses: every record carries the text address and every context its own", recs.every((r) => r.textWitness && r.contexts.every((c) => c.witness))]);
checks.push(["lifts: a REC record holds both signs at once (a relation neither reading states alone)", recs.filter((r) => r.ops.some((o) => o.op === "REC")).every((r) => r.contexts.some((c) => c.sign !== r.sign))]);
for (const [n, ok] of checks) console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}`);

// ── the records, quoted ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const show = (op, n = 4) => recs.filter((r) => r.ops.some((o) => o.op === op)).slice(0, n).map((r) => `  [${op}] ${r.turn}  PLATO (${r.sign}${r.issuerIn === "∅" ? ", no issuer" : ", issuer " + r.issuerIn}): "${r.text.slice(0, 150)}"\n        ${r.contexts.slice(0, 2).map((c) => `${c.layer} (${c.sign}${c.issuer !== "∅" ? ", issuer " + c.issuer : ""}): "${c.text.slice(0, 130)}"  ${c.witness}`).join("\n        ")}`).join("\n");
for (const op of ["DEF", "REC", "EVA"]) console.log(`\n${show(op)}`);
fs.writeFileSync(path.join(HERE, "foucault-sublation.json"), JSON.stringify({ at: new Date().toISOString(), seed: SEED, textFrames: textFrames.length, naturalized, ruledFrames: ruledFrames.length, observed: obs, nullDraws: DR, rows, checks: checks.map(([n, ok]) => ({ n, ok })), records: recs }, null, 2) + "\n");
console.log(`\n→ ${path.join(HERE, "foucault-sublation.json")}`);
