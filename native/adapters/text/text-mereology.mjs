// text-mereology.mjs — the whole text as ONE tree of addressed parts: document > paragraph > sentence > phrase > token.
//
// The holograph's first property (native/docs/THE-HOLOGRAPH.md §1): every part points at the whole, by an address
// into the source the record can expand. This module gives every row of the read such an address and a place in one
// part-whole structure, so any part (a token, a phrase, a clause, a sentence) can be re-expanded to its whole and any
// whole decomposed into its parts:
//
//   token     one parse row, addressed by [start, end) in the SOURCE text (UTF-16 units) and in UTF-8 bytes
//   phrase    a head row's projection (the head and everything it governs): the dependency tree read as parthood
//   sentence  the projection of the sentence's root
//   paragraph a run of text between blank lines (layout, not language)
//   document  the whole source
//
// Parthood is the tree: each node has exactly one parent, so the mereology is a tree order (reflexive, antisymmetric,
// transitive; siblings disjoint; each whole is the sum of its parts). `checkMereology` verifies that on the built
// structure instead of assuming it. Each phrase carries the Pāṇinian relation of its head (karaka-total.mjs), so the
// part says what it IS to its whole; each action (kriyā) gets a FRAME: its participants by kāraka, as node ids.
//
// WHY ALIGNMENT IS NEEDED: the reader normalises a sentence before parsing (CRLF -> LF, quote and dash folding,
// clitic slicing), so a row's start/end are offsets into the CLEANED sentence, not the source. Measured on a CRLF
// Gutenberg file (Douglass, Narrative, 6000 chars, 2026-11-23, exploratory): 415/1232 rows addressed the source
// exactly. Here each row is re-found in the source by its form, in order, under a declared folding of format
// characters (line endings, typographic quotes, dashes, ellipsis, PTB bracket tokens); a row that cannot be found is
// a typed gap (`row_unaligned`), never a guessed span. Non-whitespace source characters no token covers are listed
// (`unread`), so 100% is a measured number, not an assumption.
import { isParticipant } from "./karaka-total.mjs";

export const MEREOLOGY_SCHEMA = "TextMereology@1";

const isWs = (c) => c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12 || c === 0x85 || c === 0xA0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200B) || c === 0x2028 || c === 0x2029 || c === 0x202F || c === 0x205F || c === 0x3000 || c === 0xFEFF;

// format folding (declared; these are typography and encoding, not language). Source side: one source unit -> folded text.
const SRC_FOLD = new Map([
  [0x2018, "'"], [0x2019, "'"], [0x201A, "'"], [0x201B, "'"], [0x2032, "'"], [0x00B4, "'"], [0x0060, "'"],
  [0x201C, '"'], [0x201D, '"'], [0x201E, '"'], [0x201F, '"'], [0x2033, '"'], [0x00AB, '"'], [0x00BB, '"'],
  [0x2014, "--"], [0x2015, "--"], [0x2013, "-"], [0x2212, "-"], [0x2010, "-"], [0x2011, "-"],
  [0x2026, "..."], [0x00A0, " "],
]);
// form side: a token the parser wrote in a treebank convention -> the folded source it stands for
const FORM_FOLD = new Map([["``", '"'], ["''", '"'], ["-LRB-", "("], ["-RRB-", ")"], ["-LSB-", "["], ["-RSB-", "]"], ["-LCB-", "{"], ["-RCB-", "}"]]);
const foldForm = (form) => {
  const f = String(form ?? "");
  if (FORM_FOLD.has(f)) return FORM_FOLD.get(f);
  let out = "";
  for (const ch of f) { const m = SRC_FOLD.get(ch.codePointAt(0)); out += m === undefined ? ch : m; }
  return out;
};

/** UTF-8 byte offset of every UTF-16 index (length n+1). */
export function byteOffsets(text) {
  const n = text.length, out = new Int32Array(n + 1);
  let b = 0;
  for (let i = 0; i < n; i++) {
    out[i] = b;
    const c = text.charCodeAt(i);
    if (c < 0x80) b += 1; else if (c < 0x800) b += 2;
    else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n) { const d = text.charCodeAt(i + 1); if (d >= 0xDC00 && d <= 0xDFFF) { out[i + 1] = b + 4; b += 4; i++; continue; } b += 3; }
    else b += 3;
  }
  out[n] = b;
  return out;
}

/** Match the folded form at source index i; returns the source end index or -1. */
function matchAt(text, i, f) {
  let k = 0, j = i;
  const n = text.length;
  while (k < f.length) {
    if (j >= n) return -1;
    const c = text.charCodeAt(j);
    const piece = SRC_FOLD.get(c) ?? text[j];
    if (f.startsWith(piece, k)) { k += piece.length; j++; continue; }
    // a CR inside a token (rare: a hyphen-split line) is format, skipped
    if (c === 13) { j++; continue; }
    return -1;
  }
  return j;
}

/**
 * alignRows(text, parse) — give every row a source address. Mutates nothing; returns
 * { spans: Map<"order:id", [s, e]>, unaligned: [{order, id, form}], sentenceSpans: Map<order, [s, e]> }.
 */
export function alignRows(text, parse) {
  const spans = new Map(), unaligned = [], sentenceSpans = new Map();
  const n = text.length;
  let cursor = 0;
  for (const p of parse ?? []) {
    const rows = [...(p.rows ?? [])].sort((a, b) => a.id - b.id);
    let cur = Number.isInteger(p.offset) && p.offset >= cursor && p.offset < n ? p.offset : cursor;
    let first = -1, last = -1;
    for (const r of rows) {
      const f = foldForm(r.form);
      if (!f) { unaligned.push({ order: p.order, id: r.id, form: r.form, why: "empty_form" }); continue; }
      let i = cur;
      while (i < n && isWs(text.charCodeAt(i))) i++;
      let s = -1, e = matchAt(text, i, f);
      if (e >= 0) s = i;
      else {
        // the reader may have dropped or re-cut a few characters: look a short, declared distance ahead
        const window = 64 + 4 * f.length;
        for (let q = i + 1; q < n && q <= i + window; q++) { const ee = matchAt(text, q, f); if (ee >= 0) { s = q; e = ee; break; } }
      }
      if (s < 0) { unaligned.push({ order: p.order, id: r.id, form: r.form, why: "not_found_near", at: i }); continue; }
      spans.set(`${p.order}:${r.id}`, [s, e]);
      cur = e;
      if (first < 0) first = s;
      last = e;
    }
    if (first >= 0) { sentenceSpans.set(p.order, [first, last]); cursor = last; }
  }
  return { spans, unaligned, sentenceSpans };
}

/** Paragraph spans: maximal runs of text between blank lines (a newline, optional blanks, another newline). */
export function paragraphSpans(text) {
  const out = [];
  const n = text.length;
  let start = 0, i = 0;
  const push = (s, e) => { while (s < e && isWs(text.charCodeAt(s))) s++; while (e > s && isWs(text.charCodeAt(e - 1))) e--; if (e > s) out.push([s, e]); };
  while (i < n) {
    if (text.charCodeAt(i) === 10) {
      let j = i + 1;
      while (j < n && (text.charCodeAt(j) === 32 || text.charCodeAt(j) === 9 || text.charCodeAt(j) === 13)) j++;
      if (j < n && text.charCodeAt(j) === 10) { push(start, i); while (j < n && isWs(text.charCodeAt(j))) j++; start = j; i = j; continue; }
    }
    i++;
  }
  push(start, n);
  return out;
}

/**
 * textMereology(text, parse, { address }) — the whole text as one tree of addressed parts, with a kāraka frame per action.
 * `parse` is the read's entry.parse (rows labelled by karaka-total.mjs). Returns TextMereology@1:
 *   { schema, address, nodes, frames, coverage, gaps }
 */
export function textMereology(text, parse, { address = null } = {}) {
  const src = String(text ?? "");
  const B = byteOffsets(src);
  const { spans, unaligned, sentenceSpans } = alignRows(src, parse);
  const nodes = [], byId = new Map();
  const add = (node) => { nodes.push(node); byId.set(node.id, node); return node; };
  const addr = (span) => (span ? { span, bytes: [B[span[0]], B[span[1]]] } : { span: null, bytes: null });
  const gaps = [];

  add({ id: "doc", level: "document", parent: null, ...addr([0, src.length]), ...(address ? { address } : {}) });
  const paras = paragraphSpans(src);
  paras.forEach((sp, i) => add({ id: `p${i}`, level: "paragraph", parent: "doc", ...addr(sp) }));
  const paragraphOf = (pos) => { // binary search on paragraph starts
    let lo = 0, hi = paras.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paras[mid][0] <= pos) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans < 0 ? (paras.length ? 0 : -1) : ans;
  };

  const frames = [];
  let rowsTotal = 0, rowsInTree = 0, orphans = 0, discontinuous = 0, crossing = 0, multiRoot = 0, noRoot = 0;
  for (const p of parse ?? []) {
    const rows = [...(p.rows ?? [])].sort((a, b) => a.id - b.id);
    rowsTotal += rows.length;
    const k = p.order;
    const kids = new Map();
    for (const r of rows) { if (!kids.has(r.head)) kids.set(r.head, []); kids.get(r.head).push(r); }
    const roots = rows.filter((r) => r.head === 0);
    if (roots.length === 0) noRoot++; else if (roots.length > 1) multiRoot++;
    const root = roots[0] ?? null;
    const tokId = (r) => `s${k}.t${r.id}`;
    const phraseId = (r) => (r === root ? `s${k}` : `s${k}.x${r.id}`);
    const hasKids = (r) => (kids.get(r.id) ?? []).length > 0;
    const nodeOf = (r) => (hasKids(r) ? phraseId(r) : tokId(r)); // the node that stands for r's whole projection

    // reachability from the root (a row outside it is an orphan: a cycle or a head outside the sentence)
    const reach = new Set();
    if (root) { const st = [root]; while (st.length) { const x = st.pop(); if (reach.has(x.id)) continue; reach.add(x.id); for (const c of kids.get(x.id) ?? []) st.push(c); } }
    rowsInTree += reach.size;

    // projection spans (aligned tokens of each subtree) and contiguity
    const proj = new Map();
    const projOf = (r) => {
      if (proj.has(r.id)) return proj.get(r.id);
      proj.set(r.id, null); // cycle guard
      let s = Infinity, e = -Infinity; const ids = [r.id];
      const sp = spans.get(`${k}:${r.id}`); if (sp) { s = sp[0]; e = sp[1]; }
      for (const c of kids.get(r.id) ?? []) { const q = projOf(c); if (!q) continue; ids.push(...q.ids); if (q.span) { s = Math.min(s, q.span[0]); e = Math.max(e, q.span[1]); } }
      const out = { span: s <= e ? [s, e] : null, ids };
      proj.set(r.id, out);
      return out;
    };

    // the sentence node (= the root's projection)
    const sentSpan = root ? projOf(root).span : (sentenceSpans.get(k) ?? null);
    const pIdx = paragraphOf(sentSpan ? sentSpan[0] : (p.offset ?? 0));
    const paraId = pIdx >= 0 ? `p${pIdx}` : "doc";
    const sentence = add({ id: `s${k}`, level: "sentence", parent: paraId, order: k, ...addr(sentSpan), head: root ? tokId(root) : null, panini: root?.panini ?? null });
    if (sentSpan && pIdx >= 0 && sentSpan[1] > paras[pIdx][1]) { sentence.crossesParagraph = true; crossing++; }

    for (const r of rows) {
      const inTree = reach.has(r.id);
      if (!inTree) orphans++;
      // the phrase node for a head with dependents (the root's phrase is the sentence node itself)
      if (hasKids(r) && r !== root && inTree) {
        const q = projOf(r);
        const contiguous = q.ids.length === (q.ids.length ? Math.max(...q.ids) - Math.min(...q.ids) + 1 : 0);
        if (!contiguous) discontinuous++;
        add({ id: phraseId(r), level: "phrase", parent: null, ...addr(q.span), head: tokId(r), panini: r.panini ?? null, karaka: r.karaka ?? null, ...(r.karakaContested ? { contested: r.karakaContested } : {}), ...(contiguous ? {} : { discontinuous: true }) });
      }
      const sp = spans.get(`${k}:${r.id}`) ?? null;
      add({ id: tokId(r), level: "token", parent: null, ...addr(sp), form: r.form, lemma: r.lemma ?? null, upos: r.upos ?? null, deprel: r.deprel ?? null, panini: r.panini ?? null, karaka: r.karaka ?? null, via: r.karakaVia ?? null, ...(r.karakaContested ? { contested: r.karakaContested } : {}), ...(sp ? {} : { unaligned: true }), ...(inTree ? {} : { orphan: true }) });
    }
    // parents: a token sits in its own phrase if it heads one, else in its head's phrase; a phrase sits in its head's phrase
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const wholeOf = (r) => { const h = rowById.get(r.head); return !h || r.head === 0 ? sentence.id : phraseId(h); };
    for (const r of rows) {
      const tok = byId.get(tokId(r));
      if (!reach.has(r.id)) { tok.parent = sentence.id; continue; } // orphan: kept, flagged, placed in its sentence
      if (hasKids(r)) {
        tok.parent = phraseId(r);
        if (r !== root) byId.get(phraseId(r)).parent = wholeOf(r);
      } else tok.parent = wholeOf(r);
    }

    // frames: every head with participants (and every root) is an action; conj-chains of a participant share its role
    for (const v of rows) {
      if (!reach.has(v.id)) continue;
      const roles = {};
      const put = (label, r) => { (roles[label] ??= []).push(nodeOf(r)); };
      for (const c of kids.get(v.id) ?? []) {
        if (!isParticipant(c.panini) || c.karakaVia === "conj") continue;
        put(c.panini, c);
        const st = [...(kids.get(c.id) ?? [])];
        while (st.length) { const x = st.shift(); if (x.karakaVia === "conj") { put(x.panini, x); st.push(...(kids.get(x.id) ?? [])); } }
      }
      if (!Object.keys(roles).length && v !== root) continue;
      const passive = (kids.get(v.id) ?? []).some((c) => c.deprel === "aux:pass" || c.deprel === "nsubj:pass");
      frames.push({ node: nodeOf(v), kriya: v.lemma ?? v.form, sentence: sentence.id, ...(passive ? { voice: "passive" } : {}), roles });
    }
  }

  // character coverage: non-whitespace source characters inside an aligned token
  const covered = new Uint8Array(src.length);
  for (const [, [s, e]] of spans) for (let i = s; i < e; i++) covered[i] = 1;
  let nonWs = 0, coveredNonWs = 0; const unread = [];
  for (let i = 0; i < src.length; i++) {
    if (isWs(src.charCodeAt(i))) continue;
    nonWs++;
    if (covered[i]) { coveredNonWs++; continue; }
    const last = unread[unread.length - 1];
    if (last && last.span[1] >= i - 1) last.span[1] = i + 1; else unread.push({ span: [i, i + 1] });
  }
  for (const u of unread) u.text = src.slice(u.span[0], Math.min(u.span[1], u.span[0] + 60));
  if (unaligned.length) gaps.push({ gap: "row_unaligned", count: unaligned.length, sample: unaligned.slice(0, 10) });
  if (unread.length) gaps.push({ gap: "unread_chars", runs: unread.length, chars: nonWs - coveredNonWs, sample: unread.slice(0, 10) });
  if (orphans) gaps.push({ gap: "row_orphaned", count: orphans });

  const tokens = nodes.filter((x) => x.level === "token").length;
  const coverage = {
    sentences: (parse ?? []).length, singleRoot: (parse ?? []).length - multiRoot - noRoot, multiRoot, noRoot,
    rows: rowsTotal, rowsInTree, orphans, rowsAligned: rowsTotal - unaligned.length, unaligned: unaligned.length,
    tokens, phrases: nodes.filter((x) => x.level === "phrase").length, paragraphs: paras.length, discontinuous, crossesParagraph: crossing,
    nonWhitespaceChars: nonWs, coveredChars: coveredNonWs, unreadRuns: unread.length,
    treeRate: rowsTotal ? rowsInTree / rowsTotal : null, alignedRate: rowsTotal ? (rowsTotal - unaligned.length) / rowsTotal : null,
    charRate: nonWs ? coveredNonWs / nonWs : null, frames: frames.length,
  };
  return { schema: MEREOLOGY_SCHEMA, address, nodes, frames, coverage, gaps };
}

/** Index of children per node id. */
export function childrenIndex(m) {
  const idx = new Map();
  for (const x of m.nodes) if (x.parent) { if (!idx.has(x.parent)) idx.set(x.parent, []); idx.get(x.parent).push(x.id); }
  return idx;
}

/** The chain from a node up to the document (the whole a part points at). */
export function ancestors(m, id) {
  const byId = new Map(m.nodes.map((x) => [x.id, x]));
  const out = []; let cur = byId.get(id); const seen = new Set();
  while (cur && cur.parent && !seen.has(cur.id)) { seen.add(cur.id); out.push(cur.parent); cur = byId.get(cur.parent); }
  return out;
}

/** Verify the mereology instead of assuming it: one whole, every parent exists, no cycles, every token reaches the
 *  document, token sets nest (a part's tokens are among its whole's), siblings are disjoint, and every addressed
 *  part's span lies inside its addressed whole (except flagged non-projective phrases and paragraph-crossing sentences). */
export function checkMereology(m) {
  const v = [];
  const byId = new Map(m.nodes.map((x) => [x.id, x]));
  const tops = m.nodes.filter((x) => !x.parent);
  if (tops.length !== 1 || tops[0].level !== "document") v.push({ rule: "one-whole", detail: `${tops.length} parentless nodes` });
  for (const x of m.nodes) if (x.parent && !byId.has(x.parent)) v.push({ rule: "parent-exists", node: x.id });
  const depthCap = m.nodes.length + 1;
  for (const x of m.nodes) { let cur = x, d = 0; while (cur?.parent && d < depthCap) { cur = byId.get(cur.parent); d++; } if (d >= depthCap || (cur && cur.level !== "document")) v.push({ rule: "reaches-document", node: x.id }); }
  // token sets per node, bottom-up
  const kids = childrenIndex(m), toks = new Map();
  const tokensOf = (id) => { if (toks.has(id)) return toks.get(id); const n = byId.get(id); const s = new Set(n?.level === "token" ? [id] : []); toks.set(id, s); for (const c of kids.get(id) ?? []) for (const t of tokensOf(c)) s.add(t); return s; };
  for (const [pid, cs] of kids) {
    const seen = new Set();
    for (const c of cs) for (const t of tokensOf(c)) { if (seen.has(t)) v.push({ rule: "siblings-disjoint", parent: pid, token: t }); seen.add(t); }
  }
  for (const x of m.nodes) {
    if (!x.parent || !x.span) continue;
    const w = byId.get(x.parent);
    if (!w?.span || x.discontinuous || w.discontinuous || (x.level === "sentence" && x.crossesParagraph)) continue;
    if (x.span[0] < w.span[0] || x.span[1] > w.span[1]) v.push({ rule: "span-inside-whole", node: x.id, parent: w.id });
  }
  const allTokens = m.nodes.filter((x) => x.level === "token").length;
  if (tokensOf("doc").size !== allTokens) v.push({ rule: "document-is-the-sum", detail: `${tokensOf("doc").size} of ${allTokens} tokens under the document` });
  return { ok: v.length === 0, violations: v };
}
