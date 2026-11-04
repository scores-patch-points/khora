// cast-identity.js — ONE NAME, ONE BEING (opt-in: readWith({ castIdentity: true | { lead, rescue, claims, unmerge, fold, casing, spans } })).
//
// A pass over the cast the reader built, run before the entry is assembled; off, nothing here runs and the entry is JSON-identical to base.
// It repairs the four defects the 2026-11-03 cast census found (CAST-CENSUS-2.md), each by a structural rule or by the text's own
// evidence — there is no list of words in this file (eval/cast/cast-identity-gate.mjs scans for one). The steps, in order:
//   LEAD    a surface the text itself shows is a name plus a sentence's edge: every mention of "The Colosseum" opens a sentence and the
//           text also writes "the" in lower case; every mention of "Colosseum A" runs across a line or sentence break. The surface is
//           dropped; its mentions are the name's own.
//   RESCUE  a name the capital tier truncated: a joiner inside a token ("Trans-Siberian", "WF/PC"), a number that ends a name
//           ("Voyager 1"), a lower-case connector ("Great Wall of China"), a sentence-initial head ("Machu Picchu"). A string is joined
//           as a unit only when it recurs as that unit; a connector also needs the unit to be the common way one of its sides appears.
//   CLAIMS  a parenthesis after a name that lists forms sharing the name's initials or tokens ("Large Hadron Collider (LHC)",
//           "... (US 66 or Route 66)") says those forms belong to that name: no other being keeps them.
//   UNMERGE a short form that the text uses BEFORE the longer name it sits inside (so it cannot be that name's later mention),
//           e.g. "LHC" beside "LHC Computing Grid", leaves that name's being. Two full names that differ before a shared tail
//           ("Ezana Stone", "Rosetta Stone") are two beings.
//   FOLD    a being most of whose mentions lie inside the mentions of ONE longer being is a part of it ("Golden", "Golden Gate",
//           "Gate" of "Golden Gate Bridge"); so is a short form whose one dominant container is first mentioned before it
//           ("Everest" after "Mount Everest"). A tie between two longer beings is a typed gap, never a guess.
//   SPANS   a being's mentions never overlap another's (the longer mention keeps the place); a mention ends where the name ends: a
//           period that is not the name's own (not an abbreviation of this read's set, not inside the token, not an initial before
//           another capital) is the sentence's; a name does not run across a line break.
// Pure given its inputs. `mentionsOf` is read-core's own matcher, handed in so a mention is found the one way.

const TOK = /[\p{L}\p{N}](?:[\p{L}\p{N}'’]|[-–/.](?=[\p{L}\p{N}]))*/gu;
const CAP = /^\p{Lu}/u, LOW = /^\p{Ll}/u, NUM = /^\p{N}+(?:['’]s)?$/u;
const JOINER = /[-–/]/;
// the recurrence a joined unit must show: declared, and reported in PREREG-CAST-A1.md
export const RECUR = { unit: 2, connector: 3 };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const lc = (s) => s.toLocaleLowerCase();
const refOfKey = (k) => `ref:auto:${k.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "")}`;
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean);
const bare = (w) => w.replace(/['’]s$/i, "");
const longest = (surfaces) => [...surfaces].sort((a, b) => b.length - a.length)[0];

/** spans reduced to the maximal ones: a span inside another, or starting inside the previous one, is dropped */
export function maximal(spans) {
  const s = [...spans].sort((a, b) => a[0] - b[0] || b[1] - a[1]); const out = []; let end = -1;
  for (const x of s) if (x[0] >= end) { out.push(x); end = x[1]; }
  return out;
}
const inside = (x, y) => x[0] >= y[0] && x[1] <= y[1];
const insideCount = (a, b) => { let k = 0; for (const x of a) if (b.some((y) => inside(x, y))) k++; return k; };

/**
 * every token of the text with its place, and `positional(token)`: the text's own evidence that a capital on this word is the sentence's and
 * not the name's — it writes the word in lower case at least as often as it writes it capitalised away from a sentence's opening.
 */
export function scan(text) {
  const toks = []; const low = new Map(), mid = new Map();
  for (const m of text.matchAll(TOK)) {
    const t = { t: m[0], s: m.index, e: m.index + m[0].length };
    toks.push(t);
    const k = lc(bare(t.t));
    if (LOW.test(t.t)) low.set(k, (low.get(k) ?? 0) + 1);
    else if (CAP.test(t.t) && !opensSentence(text, t.s)) mid.set(k, (mid.get(k) ?? 0) + 1);
  }
  return { toks, positional: (w) => { const k = lc(bare(w)); const l = low.get(k) ?? 0; return l > 0 && l >= (mid.get(k) ?? 0); } };
}
const sameLine = (text, a, b) => /^[ \t]+$/.test(text.slice(a.e, b.s));

/** a position that opens a sentence or a line (a quote or bracket in front of it does not count against that) */
function opensSentence(text, i) {
  let j = i - 1;
  while (j >= 0 && /[ \t"'“‘(\[]/.test(text[j])) j--;
  return j < 0 || !/[\p{L}\p{N},&’-]/u.test(text[j]);
}

/** does a mention's text cross a line, or a sentence's end — a period that is not an abbreviation's, an initial's or the token's own */
function crossesBreak(span, abbreviations) {
  if (/\n/.test(span)) return true;
  const w = span.split(/\s+/);
  return w.slice(0, -1).some((x) => { if (!x.endsWith(".")) return /[!?]$/.test(x); const t = x.slice(0, -1); return !(abbreviations.has(t) || t.includes(".") || /^\p{Lu}$/u.test(t)); });
}

/** mentions of every surface; a later token of a name the text writes in lower case ("Antikythera mechanism") is the same name */
function spansFor(text, surfaces, mentionsOf, casing, nominalOk) {
  const base = mentionsOf(text, surfaces);
  if (!casing) return base;
  const extra = [];
  for (const s of surfaces) {
    const w = words(s); if (w.length < 2 || !w.slice(1).some((x) => CAP.test(x) && lc(x) !== x) || !w.slice(1).every((x) => !CAP.test(x) || nominalOk(x))) continue;
    const body = w.map((x, q) => (q === 0 ? esc(x) : esc(x).replace(/^(\\?.)/u, (c) => (CAP.test(c) ? `[${c}${lc(c)}]` : c)))).join("\\.?\\s+");
    const hits = [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${body}\\.?(?![\\p{L}\\p{N}])`, "gu"))].map((m) => [m.index, m.index + m[0].length]);
    // the variant counts only when it recurs (RECUR.connector times) as its own unit
    const exact = hits.filter(([a, b]) => text.slice(a, b).replace(/\.$/, "") === s || text.slice(a, b).replace(/\.$/, "") === w.join(" ")).length;
    if (hits.length - exact >= RECUR.connector) extra.push(...hits);
  }
  return extra.length ? maximal([...base, ...extra]) : base;
}

/**
 * RESCUE — names the capital tier truncated or never started. Each candidate recurs as that unit (RECUR), is written capitalised more
 * often than not, and is one of: a window holding an inner joiner, a number after a capitalised token, or one lower-case connector between
 * capitalised tokens (the connector's unit must also be the common way one side appears); or a headed run — capitalised tokens whose first
 * token the text never writes in lower case and whose mentions mostly open a sentence, while the remainder is already a being's surface.
 * A candidate wholly explained by a longer one with the same count is dropped.
 */
export function rescue(text, { toks, positional }, surfaceSet, connectorOk = () => true) {
  const found = new Map(); const MAXW = 8; const n = toks.length;
  const initialGap = (a, b) => /^[ \t]+$/.test(text.slice(a.e, b.s)) || (/^\p{Lu}$/u.test(a.t) && /^\.[ \t]+$/.test(text.slice(a.e, b.s)));
  const open = (a, b) => b >= 0 && b < n && initialGap(toks[Math.min(a, b)], toks[Math.max(a, b)]) && CAP.test(toks[b].t) && !positional(toks[b].t);
  for (let i = 0; i < n; i++) {
    // a window may open on a word the text also writes in lower case when this occurrence is capitalised away from a sentence's opening
    if (!CAP.test(toks[i].t) || (positional(toks[i].t) && opensSentence(text, toks[i].s))) continue;
    let low = 0;
    for (let j = i; j < n && j - i < MAXW; j++) {
      if (j > i && !initialGap(toks[j - 1], toks[j])) break;
      const t = toks[j].t;
      if (LOW.test(t)) { low++; if (low > 1 || !connectorOk(t)) break; continue; }
      low = 0;
      if (!CAP.test(t) && !NUM.test(t)) break;
      if (NUM.test(t) && j === i) break;
      const w = toks.slice(i, j + 1);
      const end = NUM.test(toks[j].t) ? toks[j].s + bare(toks[j].t).length : toks[j].e;
      const k = text.slice(toks[i].s, end).replace(/\s+/g, " ");
      const hasConn = w.some((x, q) => q > 0 && q < w.length - 1 && LOW.test(x.t));
      const hasNum = w.some((x, q) => q > 0 && NUM.test(x.t));
      const hasJoin = w.some((x) => JOINER.test(x.t));
      const hasInit = w.some((x, q) => q > 0 && q < w.length - 1 && /^\p{Lu}$/u.test(x.t) && text[x.e] === ".");
      if (hasConn && hasNum) continue;
      const caps = w.every((x) => CAP.test(x.t));
      const closed = caps && !hasJoin && !open(i, i - 1) && !open(j, j + 1);
      const headed = j > i && caps && !hasJoin && surfaceSet.has(w.slice(1).map((x) => x.t).join(" ")) && !surfaceSet.has(k) && closed;
      const long = closed && w.length >= 5;
      if (!hasConn && !hasNum && !hasJoin && !hasInit && !headed && !long) continue;
      if (hasConn && NUM.test(w[w.length - 1].t)) continue;
      const kind = hasConn ? "connector" : hasNum ? "number" : hasJoin ? "joiner" : hasInit ? "initial" : headed ? "headed" : "long";
      if ((kind === "headed" || kind === "long") && !closed) continue;
      const e = found.get(k) ?? { key: k, kind, starts: [], spans: [], connAt: hasConn ? w.findIndex((x, q) => q > 0 && LOW.test(x.t)) : -1 };
      e.starts.push(toks[i].s); e.spans.push([toks[i].s, end]); found.set(k, e);
    }
  }
  const out = [];
  for (const c of found.values()) {
    if (surfaceSet.has(c.key)) continue;
    // an initial with its period before a surname the cast already holds is evidence enough in one mention
    const need = c.kind === "connector" ? RECUR.connector : c.kind === "initial" && surfaceSet.has(c.key.split(" ").slice(-1)[0]) ? 1 : RECUR.unit;
    if (c.spans.length < need) continue;
    // written capitalised more often than not: the same string in this exact case is the majority of its case-blind occurrences
    const body = c.key.split(" ").map(esc).join("[ \\t]+");
    const count = (flags) => (text.match(new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, flags)) ?? []).length;
    if (count("gu") * 2 <= count("giu")) continue;
    if (c.kind === "joiner" && !c.key.includes(" ") && c.spans.length < need) continue;
    if (c.kind === "connector" || c.kind === "number") {
      // the unit is how the text first introduces its left side: the first mention of that run stands inside the unit's first mention
      const w = c.key.split(" "), at = c.kind === "connector" ? c.connAt : w.findIndex((x, q) => q > 0 && NUM.test(x));
      const L = w.slice(0, at).join(" ");
      const first = text.search(new RegExp(`(?<![\\p{L}\\p{N}])${L.split(" ").map(esc).join("[ \\t]+")}(?![\\p{L}\\p{N}])`, "u"));
      if (first < 0 || first !== Math.min(...c.starts)) continue;
    }
    out.push(c);
  }
  // a candidate wholly explained by a longer one with the same count is dropped
  return out.filter((c) => c.kind === "long" || c.kind === "headed" || !out.some((d) => d !== c && d.key.length > c.key.length && d.key.includes(c.key) && c.spans.every((x) => d.spans.some((y) => inside(x, y)))));
}

const lettersOf = (s) => s.replace(/[^\p{L}\p{N}]/gu, "");
const initials = (name) => words(name).filter((w) => CAP.test(w)).map((w) => w[0]).join("");
const shares = (a, b) => { const A = new Set(words(a).map((w) => lc(lettersOf(bare(w)))).filter((w) => w.length > 1)); return words(b).some((w) => A.has(lc(lettersOf(bare(w))))); };
const subrun = (short, long) => (" " + long + " ").includes(" " + short + " ");

/**
 * CLAIMS — "Name (Short)" and "Name (Short or Other)". The parenthesis holds nothing but capitalised runs, numbers and lower-case
 * joining tokens; each capitalised run is a claimed form of the name when it is the name's initialism, or shares a token with it without
 * being a part of it. `name` is the longest tail of the capitalised run before "(" whose first token is not positional.
 */
export function claims(text, { toks, positional }) {
  const out = [];
  for (const m of text.matchAll(/\(([^()\n]{2,100})\)/g)) {
    const open = m.index; if (text[open - 1] !== " ") continue;
    const q = toks.findIndex((x) => x.e === open - 1); if (q < 0) continue;
    let p = q;
    while (p > 0 && sameLine(text, toks[p - 1], toks[p]) && (CAP.test(toks[p - 1].t) || NUM.test(toks[p - 1].t))) p--;
    if (q - p < 1) continue;
    if (m[1].replace(TOK, "").replace(/[\s,;]/g, "").length) continue;
    const forms = []; let cur = [];
    for (const w of m[1].split(/[\s,;]+/).filter(Boolean)) { if (LOW.test(w)) { if (cur.length) forms.push(cur.join(" ")); cur = []; } else cur.push(w); }
    if (cur.length) forms.push(cur.join(" "));
    for (let s = p; s < q; s++) {
      const name = toks.slice(s, q + 1).map((x) => x.t).join(" ");
      const claimed = forms.filter((f) => f !== name && !subrun(f, name) && !subrun(name, f) && ((lettersOf(f).length > 1 && lettersOf(f).toUpperCase() === initials(name).toUpperCase()) || shares(f, name)));
      if (claimed.length) { for (const f of claimed) out.push({ name, form: f }); break; }
    }
  }
  return out;
}

/**
 * @param {object} a
 * @param {string} a.text         the newline-normalised text the rows' spans index
 * @param {Array}  a.rows         [{ ref, surfaces, spans, standing, represent }] the base cast
 * @param {Function} a.mentionsOf (text, surfaces) → spans, the base's own matcher
 * @param {Set}    a.abbreviations this read's abbreviation set
 * @param {Function} a.nominalOk   (token) → is it a noun, a name or an adjective by the part-of-speech prior (so a lower-case twin of it may continue a name)?
 * @param {Function} a.connectorOk (lower-case token) → may it join two capitalised runs of a name? (the read's own part-of-speech prior decides)
 * @param {object} a.options      { lead, rescue, claims, unmerge, fold, casing, spans } each on unless false
 * @returns {{ rows, refMap: Map<string,string>, report }}
 */
export function castIdentity({ text, rows, mentionsOf, abbreviations = new Set(), connectorOk = () => true, nominalOk = () => true, options = {} }) {
  const on = (k) => options[k] !== false;
  const report = { rescued: [], claimed: [], dropped: [], unmerged: [], folded: [], gaps: [], spansFixed: 0, recur: RECUR };
  const refMap = new Map();
  let work = rows.map((r) => ({ ref: r.ref, surfaces: [...r.surfaces], spans: r.spans.map((s) => [...s]), represent: r.represent, dirty: false, dest: null }));
  const sc = scan(text);
  const mo = (surfaces) => spansFor(text, surfaces, mentionsOf, on("casing"), nominalOk);
  const respan = (r) => { r.spans = r.surfaces.length ? mo(r.surfaces) : []; r.dirty = false; };
  const owners = () => { const m = new Map(); for (const r of work) for (const s of r.surfaces) if (!m.has(s)) m.set(s, r); return m; };
  const settle = () => { for (const r of work) if (r.dirty) respan(r); for (const r of work) if (!r.surfaces.length && r.dest) refMap.set(r.ref, r.dest); work = work.filter((r) => r.surfaces.length); };

  // LEAD
  if (on("lead")) {
    const own = owners();
    for (const r of work) for (const s of [...r.surfaces]) {
      const w = words(s); if (w.length < 2) continue;
      const sp = mentionsOf(text, [s]); if (!sp.length) continue;
      let rest = null;
      // a lower-case-attested capital at the head, most mentions opening a sentence
      if (CAP.test(w[0]) && sc.positional(w[0]) && own.has(w.slice(1).join(" ")) && sp.filter(([a]) => opensSentence(text, a)).length * 2 > sp.length) rest = w.slice(1).join(" ");
      // a surface every mention of which runs across a line or a sentence's end: the name is what stands before the break
      else if (sp.every(([a, b]) => crossesBreak(text.slice(a, b), abbreviations))) { for (let k = w.length - 1; k >= 1 && !rest; k--) if (own.has(w.slice(0, k).join(" "))) rest = w.slice(0, k).join(" "); }
      if (rest === null || own.get(rest) === r && r.surfaces.length < 2) continue;
      r.surfaces = r.surfaces.filter((x) => x !== s); r.dirty = true; r.dest = own.get(rest).ref;
      report.dropped.push({ surface: s, into: rest });
    }
    settle();
  }

  // RESCUE
  if (on("rescue")) {
    const have = new Set(work.flatMap((r) => r.surfaces));
    for (const c of rescue(text, sc, have, connectorOk)) {
      const spans = mo([c.key]);
      if (spans.length < 1) continue;
      work.push({ ref: refOfKey(c.key), surfaces: [c.key], spans, represent: c.key, dirty: false, dest: null });
      report.rescued.push({ surface: c.key, kind: c.kind, mentions: spans.length });
    }
  }

  // CLAIMS
  if (on("claims")) {
    for (const { name, form } of claims(text, sc)) {
      const own = owners(); const to = own.get(name); if (!to) continue;
      const from = own.get(form); if (from === to) continue;
      if (from) { from.surfaces = from.surfaces.filter((x) => x !== form); from.dirty = true; if (!from.surfaces.length) from.dest = to.ref; }
      to.surfaces.push(form); to.dirty = true;
      report.claimed.push({ form, of: name, from: from?.surfaces?.[0] ?? null });
    }
    settle();
  }

  // INITIALS — an all-capital short form that is the capitals of exactly one multi-token name in this text belongs to that name
  if (on("initials")) {
    for (const x of work) for (const s of [...x.surfaces]) {
      if (words(s).length !== 1 || lettersOf(s).length < 2 || s !== s.toUpperCase()) continue;
      const own = owners(); const c = new Set();
      for (const [k, o] of own) if (words(k).length > 1 && initials(k).toUpperCase() === lettersOf(s)) c.add(o);
      if (c.has(x)) continue;
      if (c.size > 1) { report.gaps.push({ gap: "cast_identity_initials_tie", surface: s, between: [...c].map((o) => longest(o.surfaces)) }); continue; }
      if (c.size !== 1) continue;
      const to = [...c][0];
      x.surfaces = x.surfaces.filter((q) => q !== s); x.dirty = true; if (!x.surfaces.length) x.dest = to.ref;
      to.surfaces.push(s); to.dirty = true;
      report.claimed.push({ form: s, of: longest(to.surfaces), by: "initials" });
    }
    settle();
  }

  // UNMERGE
  if (on("unmerge")) {
    const added = [];
    for (const r of work) {
      if (r.surfaces.length < 2) continue;
      const long = r.surfaces.filter((x) => words(x).length > 1); const leave = new Set();
      for (const L of long) {
        const lSp = mentionsOf(text, [L]); if (!lSp.length) continue;
        for (const S of r.surfaces) {
          if (S === L || !subrun(S, L) || L.endsWith(" " + S)) continue;
          const sSp = mentionsOf(text, [S]); const out = sSp.filter((x) => !lSp.some((y) => inside(x, y)));
          // a short form mostly used before the long name was first written, or mostly used outside it, is not that name's mention
          if (out.length && (out.filter((x) => x[0] < lSp[0][0]).length * 2 > out.length || out.length * 2 > sSp.length)) leave.add(S);
        }
      }
      // two full names neither of whose words the other holds are two beings: the one with fewer mentions leaves, with what only it holds
      const fold = (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const set = (x) => new Set(words(x).map((w) => fold(bare(w))));
      const held = (X, Y) => [...X].every((w) => Y.has(w));
      for (let a = 0; a < long.length; a++) for (let b = a + 1; b < long.length; b++) {
        const A = set(long[a]), B = set(long[b]);
        if (held(A, B) || held(B, A) || abbreviations.has(words(long[a])[0]) || abbreviations.has(words(long[b])[0])) continue;
        const go = mentionsOf(text, [long[a]]).length <= mentionsOf(text, [long[b]]).length ? long[a] : long[b], stay = go === long[a] ? long[b] : long[a];
        leave.add(go);
        for (const x of r.surfaces) if (x !== go && subrun(x, go) && !subrun(x, stay)) leave.add(x);
      }
      if (!leave.size || leave.size >= r.surfaces.length) continue;
      const gone = r.surfaces.filter((x) => leave.has(x));
      r.surfaces = r.surfaces.filter((x) => !leave.has(x)); r.dirty = true;
      for (const g of gone) report.unmerged.push({ surface: g, from: longest(r.surfaces) });
      let ref = refOfKey(longest(gone)); for (let n = 2; work.some((w) => w.ref === ref) || added.some((w) => w.ref === ref); n++) ref = `${refOfKey(longest(gone))}~${n}`;
      added.push({ ref, surfaces: gone, spans: [], represent: longest(gone), dirty: true, dest: null });
    }
    work.push(...added);
    // a lone all-capital short form that is the capitals of exactly one multi-token name joins that name
    for (const x of added) {
      if (!work.includes(x)) continue;
      const own = owners(); const c = new Set();
      for (const s of x.surfaces) if (words(s).length === 1 && lettersOf(s).length > 1 && s === s.toUpperCase()) for (const [k, o] of own) if (o !== x && words(k).length > 1 && initials(k).toUpperCase() === lettersOf(s)) c.add(o);
      if (c.size === 1) { const to = [...c][0]; to.surfaces.push(...x.surfaces); to.dirty = true; x.surfaces = []; x.dest = to.ref; report.claimed.push({ form: longest(to.surfaces), by: "initials" }); }
    }
    settle();
  }

  // FOLD
  if (on("fold")) {
    for (const r of work) if (r.dirty || on("casing")) respan(r);
    const lenOf = (r) => longest(r.surfaces).length;
    const parent = new Map();
    for (const S of work) {
      if (!S.spans.length) continue;
      const cands = [];
      for (const P of work) {
        if (P === S || !P.spans.length || lenOf(P) <= lenOf(S) || !subrun(longest(S.surfaces).toLowerCase(), longest(P.surfaces).toLowerCase())) continue;
        cands.push({ P, k: insideCount(S.spans, P.spans) });
      }
      if (!cands.length) continue;
      const maj = cands.filter((c) => c.k * 2 > S.spans.length).sort((a, b) => b.k - a.k);
      if (maj.length) {
        if (maj.length > 1 && maj[0].k === maj[1].k) {
          if (maj[0].P.spans.length === maj[1].P.spans.length) { report.gaps.push({ gap: "cast_identity_tie", surface: longest(S.surfaces), between: [longest(maj[0].P.surfaces), longest(maj[1].P.surfaces)] }); continue; }
          parent.set(S, maj[0].P.spans.length < maj[1].P.spans.length ? maj[0].P : maj[1].P); continue;
        }
        parent.set(S, maj[0].P); continue;
      }
      // a short form the text first writes inside a longer name was introduced by it ("Everest" in "Mount Everest")
      const intro = cands.filter((c) => c.P.spans.some((y) => inside(S.spans[0], y)));
      if (intro.length) {
        intro.sort((a, b) => lenOf(b.P) - lenOf(a.P));
        if (intro.length > 1 && lenOf(intro[0].P) === lenOf(intro[1].P) && intro[0].P.ref !== intro[1].P.ref) { report.gaps.push({ gap: "cast_identity_tie", surface: longest(S.surfaces), between: [longest(intro[0].P.surfaces), longest(intro[1].P.surfaces)] }); continue; }
        parent.set(S, intro[0].P);
      }
    }
    const root = (r) => { let x = r, n = 0; while (parent.has(x) && n++ < 50) x = parent.get(x); return x; };
    const groups = new Map();
    for (const r of work) { const g = root(r); (groups.get(g) ?? groups.set(g, []).get(g)).push(r); }
    const next = [];
    for (const [g, members] of groups) {
      if (members.length === 1) { next.push(g); continue; }
      for (const m of members) if (m !== g) { refMap.set(m.ref, g.ref); report.folded.push({ surface: longest(m.surfaces), into: longest(g.surfaces) }); }
      next.push({ ...g, surfaces: [...new Set([...g.surfaces, ...members.flatMap((m) => m.surfaces)])], spans: maximal(members.flatMap((m) => m.spans)) });
    }
    work = next;
  }

  // SPANS
  if (on("spans")) {
    // one place, one being: the longer mention keeps it
    const all = work.flatMap((r) => r.spans.map((s) => ({ r, s })));
    for (const r of work) r.spans = r.spans.filter((s) => !all.some((o) => o.r !== r && o.s[1] - o.s[0] > s[1] - s[0] && o.s[0] < s[1] && s[0] < o.s[1]));
    for (const r of work) {
      const out = [];
      for (let [a, b] of r.spans) {
        const nl = text.slice(a, b).search(/\s*\n/);
        if (nl > 0) b = a + nl;
        while (b > a && text[b - 1] === ".") {
          const tok = text.slice(a, b - 1).match(/[\p{L}\p{N}][\p{L}\p{N}'’.]*$/u)?.[0] ?? "";
          const next = text.slice(b).match(/^[ \t]*(\S)/)?.[1] ?? "";
          if (abbreviations.has(tok) || tok.includes(".") || (/^\p{Lu}$/u.test(tok) && /^\p{Lu}$/u.test(next))) break;
          b--; report.spansFixed++;
        }
        if (b > a) out.push([a, b]);
      }
      r.spans = maximal(out);
    }
  }

  return { rows: work.filter((r) => r.spans.length).map(({ dirty, dest, ...r }) => r), refMap, report };
}
