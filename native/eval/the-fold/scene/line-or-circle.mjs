// scene/line-or-circle.mjs — WHICH MIND IS THE LINE, WHICH THE CIRCLE?  (2026-10-14)
//
//   node eval/the-fold/scene/line-or-circle.mjs [--draws 5000]
//
// The user's question: of the Straussian (the text as itself, a re-zeroing) and the Condorcetian (context as linear social progress),
// which is the line and which the circle? A line and a circle differ in one thing a pair of points cannot show: whether a matter that
// has turned TURNS BACK. Take a matter (the thing bound to) and follow its SIGN (duty +, prohibition −) through time:
//     constant  no change                    + + +
//     line      one reversal, then it stays   + − −      (progress: the later reverses the earlier and holds)
//     circle    it returns to a sign it had   + − +      (recurrence: the turned matter comes round again)
// A line needs ≥3 dated points to be told from a circle at all; with two points everything is a line. The null shuffles each matter's
// signs among its own dates (its multiset kept), so the expected number of circles is read off the data's own sign mix, no threshold typed.
// Four readings, each on its own material:
//   R  the Republic by its own order (the Stephanus sections, the author's line of argument) — the Straussian's ground, text as itself
//   W  the ruled's frames by an EXPLICIT year in the sentence — the Condorcetian's dated context
//   W2 the same, plus the declared epoch of the interview layer where no year is given (WPA ≈1937, TRC ≈1997)
//   X  a shared matter followed from the Republic (−375) through the ruled's dates — the claim "later reverses Plato and holds" itself
// Disclosures: the ruled's frames are selected testimony; a year in a sentence is the year of an EVENT it narrates, an epoch is the year of
// the TELLING; the matter is a verb lemma, so "the same matter" is as coarse as the parse.
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


const DRAWS = Number(opt("--draws", 5000));
const EPOCH = { "oral-history-us": 1937, "testimony-trc": 1997 };
const yearOf = (t) => { const m = t.match(/\b(1[5-9]\d\d|20[0-2]\d)\b/); return m ? Number(m[1]) : null; };
const secIdx = new Map(turns.map((t, i) => [t.sec, i]));
function seqs(frames, dateOf) {                      // matter → [{date, sign}] sorted by date; a date whose frames disagree is dropped (mixed)
  const by = new Map();
  for (const f of frames) { if (LIGHT.has(f.matter)) continue; const d = dateOf(f); if (d == null) continue; const m = by.get(f.matter) ?? new Map(); const set = m.get(d) ?? new Set(); set.add(f.sign); m.set(d, set); by.set(f.matter, m); }
  const out = new Map();
  for (const [m, dm] of by) { const pts = [...dm.entries()].filter(([, s]) => s.size === 1).map(([d, s]) => ({ date: d, sign: [...s][0] })).sort((x, y) => x.date - y.date); if (pts.length >= 3) out.set(m, pts); }
  return out;
}
const changes = (signs) => { let c = 0; for (let i = 1; i < signs.length; i++) if (signs[i] !== signs[i - 1]) c += 1; return c; };
const kindOfSeq = (signs) => { const c = changes(signs); return c === 0 ? "constant" : c === 1 ? "line" : "circle"; };
function test(name, S) {
  const ms = [...S.entries()]; const sg = ms.map(([, p]) => p.map((x) => x.sign));
  const count = (arrs) => arrs.reduce((o, a) => { o[kindOfSeq(a)] += 1; return o; }, { constant: 0, line: 0, circle: 0 });
  const obs = count(sg);
  const draws = []; for (let d = 0; d < DRAWS; d++) draws.push(count(sg.map((a) => shuffle(a))));
  const mean = (k) => draws.reduce((s, x) => s + x[k], 0) / DRAWS;
  const pHi = (k) => (draws.filter((x) => x[k] >= obs[k]).length + 1) / (DRAWS + 1), pLo = (k) => (draws.filter((x) => x[k] <= obs[k]).length + 1) / (DRAWS + 1);
  const res = { name, matters: ms.length, observed: obs, expected: { constant: mean("constant"), line: mean("line"), circle: mean("circle") }, p: { circleHigh: pHi("circle"), circleLow: pLo("circle"), lineHigh: pHi("line"), lineLow: pLo("line") }, examples: ms.filter(([, p]) => kindOfSeq(p.map((x) => x.sign)) === "circle").slice(0, 6).map(([m, p]) => `${m}: ${p.map((x) => x.sign + "@" + x.date).join(" ")}`) };
  console.log(`\n${name}: ${res.matters} matters with ≥3 dated points · constant ${obs.constant} (null ${res.expected.constant.toFixed(1)}) · line ${obs.line} (null ${res.expected.line.toFixed(1)}) · circle ${obs.circle} (null ${res.expected.circle.toFixed(1)})`);
  console.log(`   circles more than the shuffle: p=${res.p.circleHigh.toFixed(4)} · fewer: p=${res.p.circleLow.toFixed(4)} · lines more: p=${res.p.lineHigh.toFixed(4)} · fewer: p=${res.p.lineLow.toFixed(4)}`);
  if (res.examples.length) console.log(`   circle examples: ${res.examples.join(" | ")}`);
  return res;
}
const R = test("R  Republic, its own order", seqs(turnFrames.flat(), (f) => secIdx.get(f.sec)));
const W = test("W  the ruled, explicit year", seqs(ruledFrames, (f) => yearOf(f.text)));
const W2 = test("W2 the ruled, year else epoch of the telling", seqs(ruledFrames, (f) => yearOf(f.text) ?? EPOCH[f.layer] ?? null));
// X: the Republic's sign for a matter (when its frames agree) as the first point, then the ruled's dated points
const rep = new Map(); for (const f of turnFrames.flat()) { if (LIGHT.has(f.matter)) continue; const set = rep.get(f.matter) ?? new Set(); set.add(f.sign); rep.set(f.matter, set); }
const later = seqs(ruledFrames, (f) => yearOf(f.text) ?? EPOCH[f.layer] ?? null);
const laterAny = new Map(); { const by = new Map(); for (const f of ruledFrames) { if (LIGHT.has(f.matter)) continue; const d = yearOf(f.text) ?? EPOCH[f.layer] ?? null; if (d == null) continue; const m = by.get(f.matter) ?? new Map(); const set = m.get(d) ?? new Set(); set.add(f.sign); m.set(d, set); by.set(f.matter, m); }
  for (const [m, dm] of by) { const pts = [...dm.entries()].filter(([, s]) => s.size === 1).map(([d, s]) => ({ date: d, sign: [...s][0] })).sort((x, y) => x.date - y.date); if (pts.length >= 2) laterAny.set(m, pts); } }
const X = new Map(); for (const [m, pts] of laterAny) { const r = rep.get(m); if (r && r.size === 1) X.set(m, [{ date: -375, sign: [...r][0] }, ...pts]); }
const Xres = test("X  Plato's matter followed through the ruled's dates", X);
fs.writeFileSync(path.join(HERE, "line-or-circle.json"), JSON.stringify({ at: new Date().toISOString(), seed: SEED, draws: DRAWS, republicFrames: turnFrames.flat().length, ruledFrames: ruledFrames.length, withYear: ruledFrames.filter((f) => yearOf(f.text) != null).length, R, W, W2, X: Xres }, null, 2) + "\n");
console.log(`\nruled frames with an explicit year: ${ruledFrames.filter((f) => yearOf(f.text) != null).length} of ${ruledFrames.length}`);
