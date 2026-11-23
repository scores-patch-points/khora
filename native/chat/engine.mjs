// native/chat/engine.mjs — THE ENGINE both chats run (the book panel and the thread chat).
//
// One engine: a text is read in order (khora reading-in-order.mjs for a book, the door's per-sentence rows for a thread),
// folded into kāraka frames and a cast of referents, indexed once (ingest), and then ASKED and PROFILED from that fold:
// answer(question) over the frames, wordProfile / tokenProfile / textProfile for a word, a token in its sentence, or any text,
// and propositionsOf(referent): what sets a referent apart from the other people (keyness), said in the book's own clauses.
// No model anywhere: every answer is read off the rows, the frames and the cast. The hyperlexicon is reached only through its
// door (opts.hl), and only for what the givers say about a word.
// Moved out of holograph-viewer/chat-server.mjs on 2026-11-23 so the thread chat (native/demo) and the book panel share one code.

const K = (p) => import(new URL(`../../${p}`, import.meta.url).href);   // khora-root-relative import, as the viewer's K() did

const WH_KARAKA = Object.freeze({ where: ["adhikaraṇa"], when: ["kāla"], why: ["hetu"], how: ["karaṇa", "kriyāviśeṣaṇa"], whence: ["apādāna"], whither: ["karman"], wherefore: ["hetu"] });
const WH = new Set(["who", "whom", "whose", "what", "which", "where", "when", "why", "how", "whence", "whither", "wherefore"]);

// names compared across accents ("Natasha" / "Natásha"): NFD, combining marks U+0300–U+036F dropped, lower-case (a typographic
// fold, declared like the mereology's own; the text's spelling is what every answer shows)
const fold = (x) => { let o = ""; for (const ch of String(x ?? "").normalize("NFD")) { const c = ch.codePointAt(0); if (c < 0x300 || c > 0x36f) o += ch; } return o.toLowerCase(); };
// the labels and their English names are khora's own (karaka-total.mjs), one map for the service and the panel
const { KARAKAS, PANINI_LABELS: EN } = await K("native/adapters/text/karaka-total.mjs");
const PART = new Set([...KARAKAS, "kāraka"]);
const { featsOf, proformClass } = await K("native/adapters/text/gender-from-corpus.js");
const { mergeBy } = await K("native/adapters/text/referents-in-order.mjs");
// KIND INDUCTION is khora's own (kernel/entity-kind-induction.js): kinds are stable basins in the interaction field, held against a
// random-subset null. A referent enters the population once the text returns to it often enough to have a profile of channels
// (declared dial: KIND_MIN_MENTIONS = 20; fewer mentions give too few channels to place a being in a field)
const { induceEntityKindCandidates } = await K("native/kernel/entity-kind-induction.js");
const KIND_MIN_MENTIONS = 20;
// PERSPECTIVES on identity: the read merges nothing across referents; a perspective names the edge kinds that make two referents one
const PERSPECTIVES = Object.freeze({ "as read": [], persons: ["apposition", "title", "predicate"], families: ["apposition", "title", "predicate", "shared-name"], "book-wide": ["apposition", "title", "predicate", "shared-name", "same-head"] });
// a node id of the whole ("s12.t3") → the token it names, so any role or action opens its own profile
// a node id of the whole → the token it is headed by: a token ("s12.t3") or a phrase headed by that token ("s12.x3")
const tokOf = (n) => { if (typeof n !== "string" || n[0] !== "s") return null; const [a, b] = n.slice(1).split("."); return b?.[0] === "t" || b?.[0] === "x" ? { order: Number(a), id: Number(b.slice(1)) } : null; };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

export { EN, KARAKAS, PART, PERSPECTIVES };

export async function makeEngine({ hl: hlUrl = "http://127.0.0.1:11450" } = {}) {
const HL = hlUrl.endsWith("/") ? hlUrl.slice(0, -1) : hlUrl;
// ── the hyperlexicon, through its door ───────────────────────────────────────────────────────────────────────────
async function hl(asks) {
  try {
    const r = await fetch(`${HL}/v1/batch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asks }), signal: AbortSignal.timeout(20000) });
    return r.ok ? (await r.json()).answers : null;
  } catch { return null; }
}
let HL_HEAD = null;
const T_START = performance.now();
const mkS = () => ({ ready: false, text: "", read: null, frames: [], verbs: new Set(), verbForms: new Map(), byKriya: new Map(), rowsOf: new Map(), nodeSpan: new Map(), B: null, chapters: [], kriyaNodes: new Map(), nodeKriyas: new Map(), timing: {}, priors: process.env.KHORA_PRIORS_DIR ?? null });
let S = mkS();
// ingest(text, read, { chapters, timing }): fold a text and its ordered read into frames, a cast and every index. Replaces the
// previous state whole (a thread is re-ingested as it grows; the fold of an unchanged thread is not recomputed by the caller).
async function ingest(text, read, { chapters = [], timing = {} } = {}) {
  const t0 = performance.now();
  const r = read;   // the body below is the viewer's original frame builder, which called the ordered read `r`
  S = mkS();
  const { byteOffsets } = await K("native/adapters/text/text-mereology.mjs");
  S.text = text; S.read = read; S.B = byteOffsets(text);
  S.timing = { ...timing, layers: read.timing ?? null }; S.parseBy = read.parseBy ?? null;
  for (const p of read.parse) S.rowsOf.set(p.order, p);
  for (const n of read.mereology.nodes) if (n.span && (n.level === "token" || n.level === "phrase" || n.level === "sentence" || n.level === "paragraph")) S.nodeSpan.set(n.id, n.span);
  S.chapters = chapters;
  // the frame index: action lemma → frames; each role filler with its head word, its proper names and its phrase
  // a mereology node id ("s12", "s12.t3", "s12.x5") → its sentence and the row that heads it (string operations on the id)
  const rowOfNode = (id) => { if (!id.startsWith("s")) return null; const dot = id.indexOf("."); const order = Number(id.slice(1, dot < 0 ? undefined : dot)); const p = S.rowsOf.get(order); if (!p) return null; const rid = dot < 0 ? p.rows.find((x) => x.head === 0)?.id : Number(id.slice(dot + 2)); return { p, row: p.rows.find((x) => x.id === rid) }; };
  for (const f of r.mereology.frames) {
    const k = rowOfNode(f.node); if (!k?.row) continue;
    const kids = new Map(); for (const x of k.p.rows) { if (!kids.has(x.head)) kids.set(x.head, []); kids.get(x.head).push(x); }
    const roles = [];
    for (const [label, ids] of Object.entries(f.roles)) for (const id of ids) {
      const q = rowOfNode(id); if (!q?.row) continue;
      const sub = []; const st = [q.row]; while (st.length) { const x = st.pop(); sub.push(x); for (const c of kids.get(x.id) ?? []) st.push(c); }
      const names = sub.filter((x) => x.upos === "PROPN").map((x) => fold(x.form));
      roles.push({ label, contested: q.row.karakaContested ?? null, head: fold(q.row.lemma ?? q.row.form), form: q.row.form, names, pron: q.row.upos === "PRON", node: id, span: S.nodeSpan.get(id) ?? null });
    }
    const kriya = (k.row.lemma ?? k.row.form).toLowerCase();
    if (k.row.upos === "VERB") {
      S.verbs.add(kriya);
      // the written form the book uses most in a FINITE clause (the verb has a subject): "retreated", not "retreating"
      const finite = (kids.get(k.row.id) ?? []).some((c) => c.deprel === "nsubj" || c.deprel === "nsubj:pass") && !(kids.get(k.row.id) ?? []).some((c) => c.upos === "AUX");
      const fm = S.verbForms.get(kriya) ?? S.verbForms.set(kriya, new Map()).get(kriya); if (finite && k.row.form.toLowerCase() !== kriya) fm.set(k.row.form, (fm.get(k.row.form) ?? 0) + 1);
    }
    const frame = { kriya, form: k.row.form, order: k.p.order, node: f.node, voice: f.voice ?? null, span: S.nodeSpan.get(`s${k.p.order}`) ?? null, roles };
    S.frames.push(frame);
    if (!S.byKriya.has(kriya)) S.byKriya.set(kriya, []); S.byKriya.get(kriya).push(frame);
  }
  // the hyperlexicon's nodes for every action in the book (for synonyms: through the door, forward only)
  const lemmas = [...S.byKriya.keys()];
  const hand = await (async () => { try { const r = await fetch(`${HL}/v1/hyperlexicon`, { signal: AbortSignal.timeout(3000) }); return r.ok ? r.json() : null; } catch { return null; } })();
  HL_HEAD = hand?.head ?? null;
  if (HL_HEAD) {
    for (let i = 0; i < lemmas.length; i += 300) {
      const ans = await hl([{ op: "names", surfaces: lemmas.slice(i, i + 300), lang: "en" }]);
      const sf = ans?.[0]?.surfaces ?? {};
      for (const [w, v] of Object.entries(sf)) for (const x of v.written ?? []) if (x.pos?.includes("verb")) { if (!S.kriyaNodes.has(w)) S.kriyaNodes.set(w, new Set()); S.kriyaNodes.get(w).add(x.node); if (!S.nodeKriyas.has(x.node)) S.nodeKriyas.set(x.node, new Set()); S.nodeKriyas.get(x.node).add(w); }
    }
  }
  buildIndexes();
  S.timing.indexMs = Math.round(performance.now() - t0);
  return S;
}
// ── the whole, indexed for profiles: every word's sentences, every word's places in frames, every node's parent ──────────
function buildIndexes() {
  const chs = S.chapters.length ? S.chapters : [{ title: "Text", book: "Text", start: 0, end: S.text.length }];
  S.chOf = (pos) => { let lo = 0, hi = chs.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (chs[m].start <= pos) lo = m; else hi = m - 1; } return lo; };
  S.wordAt = new Map();      // folded lemma (or proper name) → sentence orders, in reading order
  S.sentenceStart = new Map();
  const spell = new Map();    // folded key → written form → count (a name is shown as the book writes it)
  for (const p of S.read.parse) {
    const sp = S.nodeSpan.get(`s${p.order}`); S.sentenceStart.set(p.order, sp ? sp[0] : p.offset);
    for (const r of p.rows) {
      if (r.upos === "PUNCT") continue;
      for (const key of new Set([fold(r.lemma ?? r.form), fold(r.form)])) { let a = S.wordAt.get(key); if (!a) S.wordAt.set(key, (a = [])); if (a[a.length - 1] !== p.order) a.push(p.order); }
      if (r.upos === "PROPN") { const k = fold(r.form); const m = spell.get(k) ?? spell.set(k, new Map()).get(k); m.set(r.form, (m.get(r.form) ?? 0) + 1); }
    }
  }
  S.spelling = new Map([...spell].map(([k, m]) => [k, [...m].sort((a, b) => b[1] - a[1])[0][0]]));
  // THE BOOK'S OWN FORMS, off its rows' FEATS (no word list): each verb's past and past participle as the book writes them; each
  // pro-form class's subject and possessive form; "be" in the past and the present, by number
  const most = (m) => (m.size ? [...m].sort((a, b) => b[1] - a[1])[0][0] : null);
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  const vf = new Map(), pro = {}, be = { past: { Sing: new Map(), Plur: new Map() }, pres: { Sing: new Map(), Plur: new Map() } };
  for (const p of S.read.parse) for (const r of p.rows) {
    if (r.upos !== "VERB" && r.upos !== "PRON" && r.upos !== "AUX") continue;
    const F = featsOf(r.feats), lower = r.form.toLowerCase();
    if (r.upos === "VERB") {
      const k = String(r.lemma ?? r.form).toLowerCase(); let v = vf.get(k); if (!v) vf.set(k, (v = { past: new Map(), part: new Map() }));
      if (F.Tense === "Past" && F.VerbForm === "Fin") bump(v.past, lower); else if (F.Tense === "Past" && F.VerbForm === "Part") bump(v.part, lower);
    }
    if (r.upos === "PRON" && F.PronType === "Prs") { const c = proformClass(F); if (c) { const q = (pro[c] ??= { nom: new Map(), poss: new Map(), acc: new Map() }); if (F.Case === "Nom") bump(q.nom, lower); else if (r.deprel === "nmod:poss") bump(q.poss, lower); else if (F.Case === "Acc" && F.Reflex !== "Yes") bump(q.acc, lower); } }
    if (String(r.lemma).toLowerCase() === "be" && F.VerbForm === "Fin" && F.Person === "3" && (F.Number === "Sing" || F.Number === "Plur")) { if (F.Tense === "Past") bump(be.past[F.Number], lower); else if (F.Tense === "Pres") bump(be.pres[F.Number], lower); }
  }
  // a lemma the book never writes as a participle takes its own past form ("said", "thought", "had": in English the two coincide for
  // every regular verb), else the lemma; never a form the book does not write
  S.vform = new Map([...vf].map(([k, v]) => [k, { past: most(v.past) ?? most(v.part), part: most(v.part) ?? most(v.past) }]));
  S.pro = Object.fromEntries(Object.entries(pro).map(([c, q]) => [c, { nom: most(q.nom), poss: most(q.poss), acc: most(q.acc) }]));
  S.be = { past: { Sing: most(be.past.Sing), Plur: most(be.past.Plur) }, pres: { Sing: most(be.pres.Sing), Plur: most(be.pres.Plur) } };
  // THE CAST (the ordered read's referents): ref → being; a name's word → the beings that carry it (most mentioned first); ref →
  // the sentences it is in (from every token that points at it, name or bound pro-form)
  const cast = S.read.cast ?? { referents: [], mentionOf: {}, titles: [] };
  S.titles = new Set(cast.titles ?? []);
  S.refByRef = new Map(cast.referents.map((b) => [b.ref, b]));
  S.beingsOfWord = new Map();
  for (const b of cast.referents) if (b.kind !== "nominal") for (const [f] of b.forms) for (const w of f.split(" ")) { const k = fold(w); let a = S.beingsOfWord.get(k); if (!a) S.beingsOfWord.set(k, (a = [])); if (!a.includes(b)) a.push(b); }
  // identity edges by referent, and each perspective's grouping (computed once)
  S.edgesOf = new Map(); for (const e of cast.edges ?? []) for (const [x, y] of [[e.a, e.b], [e.b, e.a]]) { let a = S.edgesOf.get(x); if (!a) S.edgesOf.set(x, (a = [])); a.push({ type: e.type, ref: y, n: e.n }); }
  S.groups = Object.fromEntries(Object.entries(PERSPECTIVES).map(([k, types]) => { const g = mergeBy(cast, types), members = new Map(); for (const [r, root] of g) { let a = members.get(root); if (!a) members.set(root, (a = [])); a.push(r); } return [k, { of: g, members }]; }));
  for (const a of S.beingsOfWord.values()) a.sort((x, y) => y.mentions - x.mentions);
  S.sentencesOfRef = new Map();
  for (const [at, ref] of Object.entries(cast.mentionOf)) { const o = Number(at.split(".")[0]); let a = S.sentencesOfRef.get(ref); if (!a) S.sentencesOfRef.set(ref, (a = new Set())); a.add(o); }
  // ── each referent's CHANNELS: the kāraka roles it fills in the book's frames (agent of "say", patient of "wound"), what the book
  //    calls it (the heads of the descriptions an apposition, title or predicate edge ties to it), and its pro-form; evidence = sentences
  const mOf = cast.mentionOf;
  S.channels = new Map(); S.descOf = new Map();
  const chan = (ref, sig, k, v, order) => { let m = S.channels.get(ref); if (!m) S.channels.set(ref, (m = new Map())); let r = m.get(sig); if (!r) m.set(sig, (r = { featureKey: k, featureValue: v, evidenceIds: new Set(), firstAt: order, lastAt: order })); r.evidenceIds.add(order); r.lastAt = order; };
  for (const f of S.frames) for (const g of f.roles) { if (!KARAKAS.includes(g.label)) continue; const t = tokOf(g.node); const ref = t ? mOf[`${t.order}.${t.id}`] : null; if (ref) chan(ref, `${g.label}:${f.kriya}`, g.label, f.kriya, f.order); }
  for (const e of cast.edges ?? []) { if (!["apposition", "title", "predicate"].includes(e.type)) continue; for (const [x, y] of [[e.a, e.b], [e.b, e.a]]) { const d = S.refByRef.get(y); if (d?.kind !== "nominal" || S.refByRef.get(x)?.kind === "nominal") continue; let m = S.descOf.get(x); if (!m) S.descOf.set(x, (m = new Map())); m.set(d.head, (m.get(d.head) ?? 0) + e.n); chan(x, `desc:${d.head}`, "desc", d.head, d.first); } }
  for (const b of cast.referents) if (b.proform && !b.proform.contested) chan(b.ref, `pro:${b.proform.cls}`, "pro", b.proform.cls, b.first);
  S.framesOfRef = new Map();
  S.frames.forEach((f, fi) => { for (const g of f.roles) { if (!KARAKAS.includes(g.label)) continue; const t = tokOf(g.node); const ref = t ? mOf[`${t.order}.${t.id}`] : null; if (!ref) continue; let a = S.framesOfRef.get(ref); if (!a) S.framesOfRef.set(ref, (a = [])); a.push({ fi, label: g.label }); } });
  S.kriyaCount = new Map(); for (const f of S.frames) S.kriyaCount.set(f.kriya, (S.kriyaCount.get(f.kriya) ?? 0) + 1);
  // THE GROUND for identity: other PEOPLE (named referents whose own clauses give them he or she). Each person's propositions and each
  // proposition's count over all people, so a person's difference is read against everyone else
  S.isPerson = (r) => { const b = S.refByRef.get(r); return !!b && b.kind !== "nominal" && (b.proform?.cls === "m" || b.proform?.cls === "f"); };
  S.propKey = (f, label, self) => { const partners = []; for (const g of f.roles) { if (!KARAKAS.includes(g.label)) continue; const t = tokOf(g.node); const r = t ? mOf[`${t.order}.${t.id}`] : null; if (r && r !== self && S.refByRef.get(r)?.kind !== "nominal") partners.push(`${g.label}=${r}`); } return { key: `${f.kriya}|${label}|${[...new Set(partners)].sort().join(",")}`, partners: [...new Set(partners)] }; };
  S.groundCount = new Map(); S.groundTotal = 0; S.personTotal = new Map();
  for (const [r, uses] of S.framesOfRef) { if (!S.isPerson(r)) continue; const seen = new Set(); for (const { fi, label } of uses) { const f = S.frames[fi], k = S.propKey(f, label, r).key + "@" + f.order; if (seen.has(k)) continue; seen.add(k); const key = k.slice(0, k.lastIndexOf("@")); S.groundCount.set(key, (S.groundCount.get(key) ?? 0) + 1); S.groundTotal++; S.personTotal.set(r, (S.personTotal.get(r) ?? 0) + 1); } }
  // ── KINDS over the referents the text returns to
  const tk = performance.now(), pop = new Map(cast.referents.filter((b) => b.mentions >= KIND_MIN_MENTIONS && S.channels.has(b.ref)).map((b) => [b.ref, S.channels.get(b.ref)]));
  let ind = { candidates: [], diagnostics: {} }; try { ind = induceEntityKindCandidates(pop, { population: "book:referents" }); } catch (e) { log("kind induction failed:", String(e?.message ?? e).slice(0, 200)); }
  S.kinds = ind.candidates.map((c, i) => ({ id: `k${i + 1}`, members: [...c.memberRefs].sort((a, b) => (S.refByRef.get(b)?.mentions ?? 0) - (S.refByRef.get(a)?.mentions ?? 0)), stable: !!c.field?.stable, energy: c.field?.bindingEnergy ?? null, signatures: (c.distinguishingParameters ?? []).map((x) => x.signature ?? String(x)) }));
  S.kindOf = new Map(); for (const k of S.kinds) for (const m of k.members) if (!S.kindOf.has(m)) S.kindOf.set(m, k);
  S.kindStats = { population: pop.size, kinds: S.kinds.length, stable: S.kinds.filter((k) => k.stable).length, ms: Math.round(performance.now() - tk), diagnostics: ind.diagnostics };
  log(`kinds: ${S.kinds.length} (${S.kindStats.stable} stable) over ${pop.size} referents in ${S.kindStats.ms} ms`);
  S.inFrames = new Map();    // folded word → [{ frame, label }]: the roles it fills, and the actions it IS
  S.frames.forEach((f, fi) => {
    f.chapter = f.span ? S.chOf(f.span[0]) : null;
    const put = (key, label) => { let a = S.inFrames.get(key); if (!a) S.inFrames.set(key, (a = [])); a.push({ fi, label }); };
    put(f.kriya, "kriyā");
    for (const g of f.roles) { const keys = new Set([g.head, ...g.names]); for (const k of keys) put(k, g.label); }
  });
  S.parentOf = new Map(); S.levelOf = new Map(); S.labelOf = new Map();
  for (const n of S.read.mereology.nodes) { S.parentOf.set(n.id, n.parent); S.levelOf.set(n.id, n.level); if (n.panini) S.labelOf.set(n.id, n.panini); }
}
const top = (m, n = 8) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, n: v }));
const tally = (arr, key) => { const m = new Map(); for (const x of arr) { const k = key(x); if (k) m.set(k, (m.get(k) ?? 0) + 1); } return m; };
const sentenceOf = (order) => { const p = S.rowsOf.get(order); const sp = S.nodeSpan.get(`s${order}`); return { order, text: clip(sp, 400), address: address(sp), at: sp?.[0] ?? null, chapter: sp ? chapterAt(sp[0]) : null }; };

/** everything the fold knows about one word (a lemma or a proper name), across the whole book, plus what the givers say */
// a referent's name word: the first word of its most written form that is not a title ("Prince Andrew" → "Andrew")
const nameWordOf = (b) => { if (b.kind === "nominal") return b.head; for (const [f] of b.forms) for (const w of f.split(" ")) if (!S.titles.has(w.toLowerCase())) return w; return b.forms[0]?.[0] ?? ""; };
// a pro-form as the book writes it, or null when the read did not decide one (contested, or no evidence)
const pronounOf = (d, source) => (d && !d.contested && S.pro[d.cls]?.nom ? { cls: d.cls, nom: S.pro[d.cls].nom, poss: S.pro[d.cls].poss, was: S.be.past[d.cls === "x" ? "Plur" : "Sing"], is: S.be.pres[d.cls === "x" ? "Plur" : "Sing"], n: d.n, of: d.of, source } : null);
const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);
const listed = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
// ── WHAT THE BOOK SAYS ABOUT A REFERENT: its most meaningful PROPOSITIONS, not a summary stitched from counts.
//    A proposition = an action, the referent's role in it, and the other referents in their roles (pronouns resolved through the cast,
//    so "she loved him" and "Natásha loved Prince Andrew" are one). Meaning is measured, not chosen:
//      specificity  how rare the action is in this book: log(all frames / frames of this action) (said, looked, went weigh little)
//      recurrence   how many times the book states this proposition: log2(1 + statements)
//      relation     a proposition that ties the referent to another referent counts double (who it is to others)
//    Each is SAID in the book's own clause (the action with its roles, its auxiliaries and its negation), every pronoun that points at a
//    referent replaced by that referent's name: the holograph paraphrase. Each cites the sentences that state it.
const POLARITY_KEEP = new Set(["aux", "aux:pass", "cop", "compound:prt", "neg"]);
function clauseTokens(f, self) {
  const p = S.rowsOf.get(f.order); const v = tokOf(f.node); if (!p || !v) return null;
  const mOf = S.read.cast.mentionOf, kids = new Map(); for (const r of p.rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
  const keep = new Set([v.id]), subj = new Set(); const sub = (id, mark) => { const st = [id]; while (st.length) { const x = st.pop(); keep.add(x); if (mark) mark.add(x); for (const c of kids.get(x) ?? []) st.push(c.id); } };
  let selfIsSubject = false;
  for (const c of kids.get(v.id) ?? []) { const F = featsOf(c.feats); if (KARAKAS.includes(c.karaka) || c.karaka === "kāraka" || POLARITY_KEEP.has(c.deprel) || F.Polarity === "Neg") { const isSubj = c.deprel === "nsubj"; sub(c.id, isSubj ? subj : null); if (isSubj && mOf[`${f.order}.${c.id}`] === self) selfIsSubject = true; } }
  const toks = p.rows.filter((r) => keep.has(r.id) && r.upos !== "PUNCT").map((r) => ({ form: r.form, upos: r.upos, deprel: r.deprel, ref: mOf[`${f.order}.${r.id}`] ?? null, inSubject: subj.has(r.id) }));
  return toks.length >= 2 && toks.length <= 22 ? { toks, selfIsSubject } : null;
}
function clauseOf(f, nameOf) {
  const p = S.rowsOf.get(f.order); const v = tokOf(f.node); if (!p || !v) return null;
  const kids = new Map(); for (const r of p.rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
  const keep = new Set([v.id]); const sub = (id) => { const st = [id]; while (st.length) { const x = st.pop(); keep.add(x); for (const c of kids.get(x) ?? []) st.push(c.id); } };
  for (const c of kids.get(v.id) ?? []) { const F = featsOf(c.feats); if (KARAKAS.includes(c.karaka) || c.karaka === "kāraka" || POLARITY_KEEP.has(c.deprel) || F.Polarity === "Neg") sub(c.id); }
  const words = []; for (const r of p.rows) { if (!keep.has(r.id) || r.upos === "PUNCT") continue; const ref = r.upos === "PRON" ? nameOf(`${f.order}.${r.id}`) : null; words.push(ref ?? r.form); }
  if (words.length < 2 || words.length > 22) return null;
  let t = words.join(" "); return t[0].toUpperCase() + t.slice(1) + ".";
}
function propositionsOf(being, { limit = 8 } = {}) {
  const uses = S.framesOfRef.get(being.ref) ?? []; if (!uses.length) return null;
  const mOf = S.read.cast.mentionOf, total = S.frames.length;
  const nameOf = (k) => { const r = mOf[k]; const b = r ? S.refByRef.get(r) : null; return b && b.kind !== "nominal" ? b.forms[0][0] : null; };
  const props = new Map();
  for (const { fi, label } of uses) {
    const f = S.frames[fi], partners = [];
    for (const g of f.roles) { if (!KARAKAS.includes(g.label)) continue; const t = tokOf(g.node); const r = t ? mOf[`${t.order}.${t.id}`] : null; if (r && r !== being.ref && S.refByRef.get(r)?.kind !== "nominal") partners.push(`${g.label}=${r}`); }
    const key = `${f.kriya}|${label}|${[...new Set(partners)].sort().join(",")}`;
    let pr = props.get(key); if (!pr) props.set(key, (pr = { kriya: f.kriya, role: label, partners: [...new Set(partners)], frames: [] })); pr.frames.push(f);
  }
  // IDENTITY = what makes this referent different from other people, bounded by differences that make a difference: each proposition's
  // keyness against the ground (Dunning's log-likelihood G² on the 2×2 of this referent vs all other people), kept only when it is
  // OVER-represented and significant (G² ≥ 3.84, p < 0.05: the conventional level, declared)
  const G2_MIN = 3.84, n1 = Math.max(1, S.personTotal.get(being.ref) ?? new Set(uses.map((u) => S.frames[u.fi].order)).size), N = Math.max(n1 + 1, S.groundTotal);
  const ll = (o, e) => (o > 0 ? o * Math.log(o / e) : 0);
  const scored = [...props.values()].map((pr) => {
    const k1 = new Set(pr.frames.map((f) => f.order)).size, kAll = Math.max(k1, S.isPerson(being.ref) ? (S.groundCount.get(`${pr.kriya}|${pr.role}|${[...pr.partners].sort().join(",")}`) ?? k1) : k1);
    const k2 = kAll - k1, n2 = Math.max(1, N - n1), e1 = (n1 * kAll) / (n1 + n2), e2 = (n2 * kAll) / (n1 + n2);
    const g2 = 2 * (ll(k1, e1) + ll(k2, e2) + ll(n1 - k1, n1 - e1) + ll(n2 - k2, n2 - e2));
    return { ...pr, statements: k1, ground: k2, g2, over: k1 > e1, score: g2 };
  }).filter((x) => x.over && x.g2 >= G2_MIN).sort((a, b) => b.g2 - a.g2);
  const out = [], outFrames = [], seenText = new Set();
  for (const pr of scored) {
    if (out.length >= limit) break;
    // say it in the book's shortest clean clause that states it
    const said = pr.frames.map((f) => ({ f, text: clauseOf(f, nameOf) })).filter((x) => x.text).sort((a, b) => a.text.length - b.text.length)[0];
    if (!said || seenText.has(said.text)) continue; seenText.add(said.text);
    outFrames.push(pr.frames);
    out.push({ text: said.text, kriya: pr.kriya, role: EN[pr.role] ?? pr.role, with: pr.partners.map((x) => { const [lab, r] = x.split("="); return { role: EN[lab] ?? lab, ref: r, label: S.refByRef.get(r)?.forms[0]?.[0] ?? r }; }), statements: pr.statements,
      g2: Number(pr.g2.toFixed(1)), ground: pr.ground, cites: [...new Set(pr.frames.map((f) => f.order))].slice(0, 3).map((o) => ({ order: o, at: S.sentenceStart.get(o) ?? null })) });
  }
  // ── THE LEAD, as a DEFINITION (genus + differentia), not a synthesis: what it is, then what sets it apart, REFORMATTED so the referent
  //    is the subject of every clause. Genus: the title it carries in its own names ("Prince Andrew": a prince), else a character.
  //    Differentia: its strongest significant propositions (G² order). As agent, the book's own predicate (pronouns named); as patient or
  //    recipient, the frame turned to the passive with the book's own participle and "by" (khora's marker table): "was wounded by …".
  const pr = pronounOf(being.proform, "referent") ?? null, display = being.forms[0][0], namesOf = (r) => S.refByRef.get(r)?.forms[0]?.[0] ?? r;
  // the title leads a name ("Prince Andrew"); it is the genus only when it is a real share (a tenth, declared) of the mentions
  const titleCount = new Map(); for (const [f, n] of being.forms) { const w = f.split(" "); if (w.length > 1 && S.titles.has(w[0].toLowerCase())) titleCount.set(w[0].toLowerCase(), (titleCount.get(w[0].toLowerCase()) ?? 0) + n); }
  const top = [...titleCount].sort((a, b) => b[1] - a[1])[0];
  const title = top && top[1] >= 0.1 * being.mentions ? top[0] : null;
  const genus = title ? `${"aeiou".includes(title[0]) ? "an" : "a"} ${title}` : being.kind === "nominal" ? `a ${being.head}` : "a character";
  const say = (tk) => tk.map((t) => (t.ref === being.ref && t.upos === "PRON" && pr ? (t.deprel === "nmod:poss" ? pr.poss : t.deprel.startsWith("nsubj") ? pr.nom : pr.acc ?? pr.nom) : t.ref && t.upos === "PRON" ? namesOf(t.ref) : t.form));
  const preds = [];
  for (let i = 0; i < out.length && preds.length < 5; i++) {
    const o = out[i], f = [...outFrames[i]].sort((a, b) => a.order - b.order)[0]; const c = f ? clauseTokens(f, being.ref) : null;
    if (o.role === "agent" && c?.selfIsSubject) { const w = say(c.toks.filter((x) => !x.inSubject)); if (w.length >= 1 && w.length <= 12) preds.push({ t: w.join(" "), order: f.order }); }
    else if (o.role === "patient" || o.role === "recipient") {
      const part = S.vform.get(o.kriya)?.part, agent = o.with.find((w) => w.role === "agent");
      if (part && part !== o.kriya && agent) preds.push({ t: `${pr?.was ?? "was"} ${part} by ${agent.label}`, order: f?.order ?? 0 });
    }
  }
  const sents = [`${display} is ${genus}${preds.length ? ` who ${listed(preds.map((x) => x.t))}` : ""}.`];
  return { lead: sents.join(" "), leadCites: preds.map((x) => ({ order: x.order, at: S.sentenceStart.get(x.order) ?? null })), propositions: out, of: scored.length, made: `what sets it apart from the book's other people: ${scored.length} propositions over-represented beyond chance (G² ≥ 3.84), the strongest shown, each in the book's own clause with pronouns named; no model` };
}

// ── THE LITTLE DAG: what a referent is, as relations between referents. Not a paragraph about it: who acted on it, what it acted on, and
//    who it is also called, each arrow the book's own verb with the number of sentences behind it (and the first sentences, to jump to).
//    In the frames, an event runs from the one who does it to the one it is done to: an agent → a patient / recipient / source / place.
//    The referent sits in the middle; those that act on it are on its left, those it acts on are on its right (a partner on both sides
//    is drawn on both: the picture stays acyclic). Identity links are not arrows: they are the other names and descriptions it may be.
const PREP = { "sampradāna": "to", "apādāna": "from", "adhikaraṇa": "in", "karaṇa": "with" };
const SAME_WORD = { apposition: "also called", predicate: "is", title: "also called", "shared-name": "same name as" };
function egoGraph(being, { per = 6 } = {}) {
  const mOf = S.read.cast.mentionOf, vfOf = (k, kind) => S.vform.get(k)?.[kind] ?? k;
  const edges = new Map();   // "from|to|label" → { from, to, label, orders:Set }
  const known = (r) => { const b = r && S.refByRef.get(r); return b && (b.kind !== "nominal" || b.mentions > 1) ? b : null; };
  for (const { fi, label } of S.framesOfRef.get(being.ref) ?? []) {
    const f = S.frames[fi]; const mine = label;
    for (const g of f.roles) {
      if (!KARAKAS.includes(g.label) || g === null) continue;
      const t = tokOf(g.node); const r = t ? mOf[`${t.order}.${t.id}`] : null; if (!r || r === being.ref || !known(r)) continue;
      // its own body and belongings are not a relation to someone else ("opened his eyes"): a partner possessed by the referent is skipped
      if ((S.edgesOf.get(r) ?? []).some((e) => e.type === "possessor" && e.ref === being.ref)) continue;
      // the preposition is the book's own word where the participant carries one ("looked AT his sister"), else a fixed fallback
      const prow = t ? S.rowsOf.get(t.order)?.rows : null, hd = prow?.find((x) => x.id === t.id), cw = hd ? prow.find((x) => x.head === hd.id && x.deprel === "case") : null, own = cw ? String(cw.form).toLowerCase() : null;
      let from, to, lab;
      if (mine === "kartṛ" && g.label !== "kartṛ" && ["karman", "sampradāna", "apādāna", "adhikaraṇa", "karaṇa"].includes(g.label)) { from = being.ref; to = r; lab = `${vfOf(f.kriya, "past")}${own ? " " + own : PREP[g.label] ? " " + PREP[g.label] : ""}`; }
      else if (g.label === "kartṛ" && mine !== "kartṛ" && ["karman", "sampradāna", "apādāna", "adhikaraṇa", "karaṇa"].includes(mine)) { from = r; to = being.ref; lab = `${vfOf(f.kriya, "past")}${PREP[mine] ? " " + PREP[mine] : ""}`; }
      else continue;
      const k = `${from}|${to}|${lab}`; let e = edges.get(k); if (!e) edges.set(k, (e = { from, to, label: lab, orders: new Set() })); e.orders.add(f.order);
    }
  }
  const rank = (a, b) => b.orders.size - a.orders.size || (S.refByRef.get(b.from === being.ref ? b.to : b.from)?.mentions ?? 0) - (S.refByRef.get(a.from === being.ref ? a.to : a.from)?.mentions ?? 0);
  const all = [...edges.values()].sort(rank);
  const take = (isOut) => { const seen = new Set(), out = []; for (const e of all) { if ((e.from === being.ref) !== isOut) continue; const other = isOut ? e.to : e.from; if (seen.has(`${other}|${e.label}`)) continue; seen.add(`${other}|${e.label}`); out.push(e); if (out.length >= per) break; } return out; };
  const node = (r) => { const b = S.refByRef.get(r); return { ref: r, label: b?.forms?.[0]?.[0] ?? r, kind: b?.kind ?? "name", mentions: b?.mentions ?? 0 }; };
  const arrow = (e, other) => ({ ...node(other), verb: e.label, n: e.orders.size, orders: [...e.orders].sort((a, b) => a - b).slice(0, 3).map((o) => ({ order: o, at: S.sentenceStart.get(o) ?? null })) });
  const incoming = take(false).map((e) => arrow(e, e.from)), outgoing = take(true).map((e) => arrow(e, e.to));
  const sameBy = new Map();
  for (const e of (S.edgesOf.get(being.ref) ?? []).filter((e) => SAME_WORD[e.type] && known(e.ref)).sort((a, b) => b.n - a.n)) { const nd = node(e.ref), k = `${nd.label.toLowerCase()}|${SAME_WORD[e.type]}`; const o = sameBy.get(k); if (o) o.n += e.n; else sameBy.set(k, { ...nd, how: SAME_WORD[e.type], n: e.n }); }
  const same = [...sameBy.values()].sort((a, b) => b.n - a.n).slice(0, 4);
  return { center: node(being.ref), in: incoming, out: outgoing, same };
}

async function wordProfile(word0, { ref = null, perspective = "as read" } = {}) {
  const pinned = ref ? S.refByRef.get(ref) : null;
  const word = pinned ? nameWordOf(pinned) : word0;
  const key = fold(word), sentences = pinned ? [...(S.sentencesOfRef.get(pinned.ref) ?? [])].sort((a, b) => a - b) : (S.wordAt.get(key) ?? []), places = S.inFrames.get(key) ?? [];
  const chs = S.chapters.length || 1, perChapter = new Array(chs).fill(0);
  for (const o of sentences) { const at = S.sentenceStart.get(o); if (at != null) perChapter[S.chOf(at)]++; }
  const roles = tally(places, (x) => x.label);
  const asRole = (label) => top(tally(places.filter((x) => x.label === label), (x) => String(S.frames[x.fi].kriya).toLowerCase()), 6);
  const withWhom = new Map(); for (const x of places) for (const g of S.frames[x.fi].roles) for (const nm of g.names) if (nm !== key) withWhom.set(nm, (withWhom.get(nm) ?? 0) + 1);
  // as an action: who does it, to whom, where, when, why …
  const asAction = places.filter((x) => x.label === "kriyā").map((x) => S.frames[x.fi]);
  const actionRoles = {};
  for (const lab of KARAKAS) { const m = new Map(); for (const f of asAction) for (const g of f.roles) if (g.label === lab && !g.pron) { const k = g.names[0] ?? g.head; m.set(k, (m.get(k) ?? 0) + 1); } const t = top(m, 6); if (t.length) actionRoles[lab] = t; }
  const spread = sentences.length ? [0, Math.floor(sentences.length / 3), Math.floor((2 * sentences.length) / 3), sentences.length - 1] : [];
  const samples = [...new Set(spread)].map((i) => sentenceOf(sentences[i]));
  // the givers (GIVEN, not the text's)
  let given = null;
  if (HL_HEAD) {
    const [nm, cx] = (await hl([{ op: "names", surfaces: [word, key], lang: "en" }, { op: "context", words: [key], lang: "en", ground: { language: "en" } }])) ?? [];
    const n = nm?.surfaces?.[word] ?? nm?.surfaces?.[key], c = cx?.words?.[key];
    let synonyms = [];
    const verbNodes = (n?.written ?? []).filter((x) => x.pos?.includes("verb")).map((x) => x.node);
    if (verbNodes.length) { const rels = await hl(verbNodes.map((id) => ({ op: "relations", id }))); const syn = new Set(); for (const r of rels ?? []) for (const x of r?.relations ?? []) if (x.rel === "syn") for (const w of S.nodeKriyas.get(x.to) ?? []) if (w !== key) syn.add(w); synonyms = [...syn].slice(0, 12).map((w) => ({ word: w, inText: (S.byKriya.get(w) ?? []).length })); }
    given = { languages: n?.languages ?? 0, senses: (n?.written ?? []).slice(0, 8).map((x) => ({ kind: x.kind, pos: x.pos, of: x.of, giver: x.giver })), corpus: c ? { uses: c.uses ?? null, documents: c.documents ?? null, gap: c.gap ?? null } : null, synonyms, head: HL_HEAD.slice(0, 12) };
  }
  const show = (k) => S.spelling.get(k) ?? k;
  const shown = (arr) => arr.map((x) => ({ ...x, show: show(x.k) }));
  const isName = S.spelling.has(key) || !!pinned;
  const being = pinned ?? (isName ? (S.beingsOfWord.get(key) ?? [])[0] ?? null : null);
  const display = pinned ? pinned.forms[0][0] : isName ? show(key) : word;
  // the pro-form: the referent's own (its clauses' reflexives and possessives), else the word's, else none
  const pron = pronounOf(being?.proform, "referent") ?? pronounOf(S.read.proforms?.[String(word).normalize("NFC").toLowerCase()], "word");
  const others = being && being.kind !== "nominal" ? (S.beingsOfWord.get(key) ?? []).filter((b) => b !== being).slice(0, 6) : [];   // a description has no namesakes
  const labelOf = (r) => { const x = S.refByRef.get(r); return x ? x.forms[0]?.[0] ?? r : r; };
  const P = S.groups[perspective] ? perspective : "as read", group = being ? (S.groups[P].members.get(S.groups[P].of.get(being.ref)) ?? [being.ref]) : [];
  const merged = group.length > 1 ? group.filter((r) => r !== being.ref).map((r) => ({ ref: r, label: labelOf(r), mentions: S.refByRef.get(r)?.mentions ?? 0 })).sort((a, b) => b.mentions - a.mentions).slice(0, 12) : [];
  const edges = being ? (S.edgesOf.get(being.ref) ?? []).filter((e) => e.type !== "same-head" || P === "book-wide").sort((a, b) => b.n - a.n).slice(0, 14).map((e) => ({ ...e, label: labelOf(e.ref) })) : [];
  const referent = being ? { ref: being.ref, kind: being.kind ?? "name", perspective: P, perspectives: Object.keys(PERSPECTIVES), merged, edges, pronouns: (being.pronouns ?? []).slice(0, 8), forms: being.forms.slice(0, 18), mentions: being.mentions, contested: being.contested, proformForms: being.proformForms.slice(0, 8), proform: being.proform, others: others.map((b) => ({ ref: b.ref, label: b.forms[0][0], mentions: b.mentions })) } : null;
  // the book's own verb forms: what it did (past), what was done to it (participle)
  const inflect = (arr, kind) => arr.map((x) => ({ ...x, show: S.vform.get(x.k)?.[kind] ?? x.k }));
  const roleList = top(roles, 12).map((x) => ({ ...x, en: EN[x.k] ?? x.k }));
  // an action section is kept only when acting is a real share of the word's places (a tenth): a name or a pronoun read as an
  // action is the parser's copula reading ("it was in July", "Pierre was …"), not the word's own life
  const keepAction = asAction.length && asAction.length >= 0.1 * places.length;
  // "with whom" never lists the referent's own names ("Pávlovna" beside Anna Pávlovna)
  if (being) for (const [f] of being.forms) for (const w of f.split(" ")) withWhom.delete(fold(w));
  const does = inflect(asRole("kartṛ"), "past"), undergoes = inflect(asRole("karman"), "part"), receives = inflect(asRole("sampradāna"), "part"), withList = shown(top(withWhom, 8));
  // the summary: the profile's own numbers in a sentence (assembled, not written by a model)
  const roleShare = roleList.filter((x) => KARAKAS.includes(x.k)), lead = roleShare[0];
  const parts = [];
  if (sentences.length) parts.push(`${display} appears in ${sentences.length.toLocaleString()} sentence${sentences.length === 1 ? "" : "s"}, from ${chapterAt(S.sentenceStart.get(sentences[0])) ?? "the start"} to ${chapterAt(S.sentenceStart.get(sentences[sentences.length - 1])) ?? "the end"}.`);
  const pct = lead ? Math.round((100 * lead.n) / Math.max(1, roleShare.reduce((a, x) => a + x.n, 0))) : 0;
  if (does.length) parts.push(pron ? `${cap(pron.nom)} ${listed(does.slice(0, 4).map((x) => x.show))}.` : `As the agent: ${listed(does.slice(0, 4).map((x) => x.show))}.`);
  if (withList.length) parts.push(`Most often with ${withList.slice(0, 3).map((x) => x.show).join(", ")}.`);
  if (keepAction) parts.push(`As an action, ${asAction.length.toLocaleString()} times.`);
  if (!sentences.length) parts.push(`The book never uses “${word}”.`);
  const portrait = being ? propositionsOf(being) : null;
  const graph = being ? egoGraph(being) : null;
  return { kind: "word", word: display, key, isName, pronoun: pron, referent, portrait, graph, summary: parts.join(" "), count: sentences.length, framesIn: places.length, perChapter, first: sentences.length ? sentenceOf(sentences[0]) : null, last: sentences.length ? sentenceOf(sentences[sentences.length - 1]) : null,
    roles: roleList, does, undergoes, receives, with: withList, actionRoles: keepAction ? Object.fromEntries(Object.entries(actionRoles).map(([k, v]) => [k, shown(v)])) : {}, actionCount: keepAction ? asAction.length : 0, samples, given };
}

/** one token of the book, in its place: its role, its frame, its chain of wholes; then its word across the book */
async function tokenProfile(order, id) {
  const p = S.rowsOf.get(order); if (!p) return { error: "no such sentence" };
  const r = p.rows.find((x) => x.id === id); if (!r) return { error: "no such token" };
  const chain = []; let cur = `s${order}.t${id}`; const seen = new Set();
  const tokenAt = S.nodeSpan.get(`s${order}.t${id}`)?.[0] ?? S.sentenceStart.get(order) ?? 0;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (cur === "doc") {
      // between the paragraph and the document: its chapter and its book (the edition's own headings)
      const ci = S.chOf(tokenAt), c = S.chapters[ci];
      if (c) { const bk = S.chapters.filter((x) => x.book === c.book); chain.push({ id: `ch${ci}`, level: "chapter", label: null, text: c.title, address: address([c.start, c.end]) }); chain.push({ id: `bk${ci}`, level: "book", label: null, text: c.book, address: address([bk[0].start, bk[bk.length - 1].end]) }); }
    }
    const sp = cur === "doc" ? [0, S.text.length] : S.nodeSpan.get(cur);
    chain.push({ id: cur, level: S.levelOf.get(cur) ?? (cur === "doc" ? "document" : "?"), label: S.labelOf.get(cur) ?? null, en: EN[S.labelOf.get(cur)] ?? null, text: sp ? clip(sp, 110) : null, address: sp ? address(sp) : null });
    cur = S.parentOf.get(cur);
  }
  // the frame this token belongs to: the one whose action it is, or whose participant (or part of one) it is
  const node = `s${order}.t${id}`; const inChain = new Set(chain.map((c) => c.id));
  const fr = S.frames.find((f) => f.order === order && (f.node === node || f.node === `s${order}.x${id}` || f.roles.some((g) => inChain.has(g.node))));
  const frame = fr ? { kriya: fr.kriya, form: fr.form, voice: fr.voice, tok: tokOf(fr.node), roles: fr.roles.map((g) => ({ label: g.label, en: EN[g.label] ?? g.label, text: clip(g.span, 120), contested: g.contested, at: g.span?.[0] ?? null, mine: inChain.has(g.node), tok: tokOf(g.node) })) } : null;
  const word = r.upos === "PROPN" ? r.form : (r.lemma ?? r.form);
  // PROSE IS PLAIN (the owner's rule): role labels live in the tables and on hover, never in a sentence. A pronoun says who it stands for;
  // the sentence card and the action table show the rest.
  const pointed = S.refByRef.get(S.read.cast?.mentionOf?.[`${order}.${id}`]);
  const standsFor = pointed && r.upos === "PRON" ? `“${r.form}” stands for ${pointed.forms[0][0]}.` : "";
  return { kind: "token", summary: standsFor, token: { form: r.form, lemma: r.lemma, upos: r.upos, deprel: r.deprel, label: r.panini, en: EN[r.panini] ?? null, via: r.karakaVia ?? null, contested: r.karakaContested ?? null, span: S.nodeSpan.get(node) ?? null, address: address(S.nodeSpan.get(node)) },
    sentence: sentenceOf(order), chain, frame, pointsAt: S.read.cast?.mentionOf?.[`${order}.${id}`] ?? null, word: await wordProfile(word, { ref: S.read.cast?.mentionOf?.[`${order}.${id}`] ?? null }) };
}

/** any text (a selection, or anything dropped): read with the same reader; its frames, and where the book says the same */
async function textProfile(text) {
  const t = String(text).trim().slice(0, 2000);
  if (t.endsWith("?")) return { kind: "question", ...(await answer(t)) };
  const words = t.split(" ").filter(Boolean);
  if (words.length === 1) return await wordProfile(words[0].normalize("NFC"));
  parser ??= await (await K("native/reading.js")).rowsOfFor("eng");
  const rows = parser.rowsOf(t) ?? [];
  const kids = new Map(); for (const r of rows) { if (!kids.has(r.head)) kids.set(r.head, []); kids.get(r.head).push(r); }
  const frames = [];
  for (const v of rows) {
    const ps = (kids.get(v.id) ?? []).filter((c) => PART.has(c.panini));
    if (!ps.length && v.head !== 0) continue;
    const part = ps.map((c) => { const sub = []; const st = [c]; while (st.length) { const x = st.pop(); sub.push(x); for (const y of kids.get(x.id) ?? []) st.push(y); } const names = sub.filter((x) => x.upos === "PROPN"); return { label: c.panini, en: EN[c.panini] ?? c.panini, text: sub.sort((a, b) => a.id - b.id).map((x) => x.form).join(" "), head: fold(c.lemma ?? c.form), names: names.map((x) => fold(x.form)), word: names.length ? names[0].form : (c.lemma ?? c.form) }; });
    const kriya = (v.lemma ?? v.form).toLowerCase();
    // where the book says the same: the action with at least one of these participants in the same role
    const echoes = (S.byKriya.get(kriya) ?? []).map((f) => ({ f, shared: part.filter((w) => f.roles.some((g) => g.label === w.label && (w.names.length ? w.names.some((n) => g.names.includes(n)) : g.head === w.head))).length })).filter((x) => x.shared > 0).sort((a, b) => b.shared - a.shared || a.f.order - b.f.order).slice(0, 6)
      .map(({ f, shared }) => ({ shared, chapter: f.span ? chapterAt(f.span[0]) : null, sentence: clip(f.span, 220), at: f.span?.[0] ?? null, address: address(f.span) }));
    frames.push({ kriya, form: v.form, word: v.lemma ?? v.form, roles: part, inBook: (S.byKriya.get(kriya) ?? []).length, echoes });
  }
  const content = rows.filter((r) => ["NOUN", "PROPN", "VERB", "ADJ"].includes(r.upos));
  const wordsSeen = content.map((r) => { const k = fold(r.upos === "PROPN" ? r.form : (r.lemma ?? r.form)); return { word: r.form, key: k, upos: r.upos, inBook: (S.wordAt.get(k) ?? []).length }; });
  return { kind: "text", text: t, rows: rows.map((r) => ({ id: r.id, form: r.form, upos: r.upos, deprel: r.deprel, head: r.head, label: r.panini, en: EN[r.panini] ?? null })), frames, words: wordsSeen };
}

// ── a question ───────────────────────────────────────────────────────────────────────────────────────────────────
let parser = null, karakaRows = null;
// A question that inverts an auxiliary ("When DID Napoleon enter Moscow?", "Where WAS Prince Andrew wounded?") puts its clause in an
// order the parser rarely saw in its treebank, and it misreads it (measured: "Napoleon enter Moscow" as one proper-noun compound).
// So that clause is read in declarative order: the words after the auxiliary, minus the question word, split at the verb (the
// first of them the BOOK uses as a verbal action, skipping modifiers), the verb in the book's own most frequent written form,
// a passive or perfect auxiliary kept before it ("Prince Andrew was wounded."). From the rows, never from a pattern.
function declarativeOf(rows, wh) {
  const low = (r) => (r.lemma ?? r.form).toLowerCase();
  const aux = rows.find((r) => r.upos === "AUX" && (!wh || r.id > wh.id)); if (!aux || !wh) return null;
  const whNoun = wh.deprel === "det" ? rows.find((r) => r.id === wh.head) : null;
  const after = rows.filter((r) => r.id > aux.id && r !== wh && r !== whNoun && r.upos !== "PUNCT");
  const verb = after.find((r, i) => i > 0 && S.verbs.has(low(r)) && !["amod", "det", "nummod", "case"].includes(r.deprel)); if (!verb) return null;
  const subj = after.filter((r) => r.id < verb.id), rest = after.filter((r) => r.id > verb.id); if (!subj.length) return null;
  const forms = S.verbForms.get(low(verb)); const bookForm = forms && forms.size ? [...forms].sort((a, b) => b[1] - a[1])[0][0] : verb.form;
  const doSupport = low(aux) === "do";
  const words = [...subj.map((r) => r.form), ...(doSupport ? [] : [aux.form]), doSupport ? bookForm : verb.form, ...rest.map((r) => r.form)];
  return { text: words.join(" ") + ".", verb: low(verb), doSupport, strandedPrep: rest.length && rest[rest.length - 1].upos === "ADP" ? low(rest[rest.length - 1]) : null };
}
async function readQuestion(q) {
  parser ??= await (await K("native/reading.js")).rowsOfFor("eng");
  const asked = parser.rowsOf(q) ?? [];
  const wh0 = asked.find((r) => WH.has(r.form.toLowerCase()));
  const decl = declarativeOf(asked, wh0);
  const rows = decl ? (parser.rowsOf(decl.text) ?? asked) : asked;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const kids = new Map(); for (const r of rows) { if (!kids.has(r.head)) kids.set(r.head, []); kids.get(r.head).push(r); }
  const low = (r) => (r.lemma ?? r.form).toLowerCase();
  const wh = decl ? null : rows.find((r) => WH.has(r.form.toLowerCase()));
  // the action: in a declarative re-reading, the verb itself; else the wh-word's governing verb, else the root
  let root = rows.find((r) => r.head === 0) ?? null;
  let kriya = decl ? (rows.find((r) => low(r) === decl.verb) ?? root) : root;
  if (wh) { let h = byId.get(wh.head); while (h && !(h.upos === "VERB" || h.panini === "kriyā") && h.head) h = byId.get(h.head); if (h) kriya = h; }
  // a misparse can hang the question on a noun ("enter Moscow" → Moscow): the action is then the question's own verb
  if (kriya && kriya.upos !== "VERB" && !(kids.get(kriya.id) ?? []).some((c) => c.deprel === "cop")) {
    // the question's own verb; failing that, its first word that the book itself uses as an action (not a name, a pronoun or an auxiliary)
    const v = rows.find((r) => r.upos === "VERB") ?? rows.find((r) => r !== wh && !["PROPN", "PRON", "AUX", "DET", "ADP", "PUNCT"].includes(r.upos) && S.byKriya.has(low(r)));
    if (v) kriya = v;
  }
  const copular = !!kriya && (kids.get(kriya.id) ?? []).some((c) => c.deprel === "cop");
  // the missing role
  let gap = null, gapVia = null;
  if (decl && wh0) {
    const w = wh0.form.toLowerCase();
    if (WH_KARAKA[w]) { gap = WH_KARAKA[w]; gapVia = `declared: "${w}" asks for ${gap[0]}`; }
    else if (decl.strandedPrep) { gap = ["sampradāna", "karaṇa", "adhikaraṇa"]; gapVia = `"${w} … ${decl.strandedPrep}": the preposition's role (contested)`; }
    else { gap = ["karman"]; gapVia = `"${w}" after an inverted auxiliary: the clause has its subject, so it asks for the patient`; }
  }
  else if (wh) {
    // a determiner wh ("which general") stands for its noun
    const target = wh.deprel === "det" ? byId.get(wh.head) ?? wh : wh;
    const marked = (kids.get(target.id) ?? []).some((c) => c.deprel === "case");
    if (wh.form.toLowerCase() === "whom" && !marked) { gap = ["karman"]; gapVia = "declared: \"whom\" without a preposition asks for the patient"; }
    else if (KARAKAS.includes(target.panini)) { gap = [target.panini, ...(target.karakaContested ?? [])]; gapVia = `the question word's own role (${target.deprel})`; }
    else if (WH_KARAKA[wh.form.toLowerCase()]) { gap = WH_KARAKA[wh.form.toLowerCase()]; gapVia = `declared: "${wh.form.toLowerCase()}" asks for ${gap[0]}`; }
    else if (target.panini === "kāraka") { gap = ["kāraka"]; gapVia = "an undetermined participant"; }
    else if (copular || target === root) { gap = ["samānādhikaraṇa"]; gapVia = "an identity question (what / who is …)"; }
  }
  // the filled roles: the action's participants other than the question word
  const filled = [];
  if (kriya) for (const c of kids.get(kriya.id) ?? []) {
    if (c === wh || (wh && c.id === wh.head && wh.deprel === "det")) continue;
    if (!PART.has(c.panini) && c.deprel !== "nsubj" && c.deprel !== "obj") continue;
    const sub = []; const st = [c]; while (st.length) { const x = st.pop(); sub.push(x); for (const y of kids.get(x.id) ?? []) st.push(y); }
    if (sub.some((x) => WH.has(x.form.toLowerCase()))) continue;
    filled.push({ label: c.panini, head: fold(low(c)), form: c.form, names: sub.filter((x) => x.upos === "PROPN").map((x) => fold(x.form)) });
  }
  const passive = !!kriya && (kids.get(kriya.id) ?? []).some((c) => c.deprel === "aux:pass" || c.deprel === "nsubj:pass");
  return { passive, declarative: decl?.text ?? null, asked: asked.map((r) => r.form).join(" "), rows: rows.map((r) => ({ id: r.id, form: r.form, lemma: r.lemma, upos: r.upos, deprel: r.deprel, head: r.head, panini: r.panini, contested: r.karakaContested ?? null })), wh: (wh ?? wh0)?.form ?? null, kriya: kriya ? low(kriya) : null, kriyaForm: kriya?.form ?? null, copular, gap, gapVia, filled, words: rows.filter((r) => ["NOUN", "PROPN", "VERB", "ADJ"].includes(r.upos)).map((r) => ({ form: r.form, lemma: low(r), upos: r.upos })) };
}

const fillerMatches = (want, got) => want.names.length ? want.names.some((n) => got.names.includes(n) || got.head === n) : got.head === want.head || got.names.includes(want.head);
const address = (span) => (span ? { chars: span, bytes: [S.B[span[0]], S.B[span[1]]] } : null);
const chapterAt = (pos) => { const c = S.chapters.find((x) => x.start <= pos && pos < x.end); return c ? (c.book === c.title ? c.title : `${c.book} · ${c.title}`) : null; };
const clip = (span, n = 320) => (span ? S.text.slice(span[0], Math.min(span[1], span[0] + n)).split("\r\n").join(" ").split("\n").join(" ") : "");

async function answer(q, { upTo = null, limit = 12 } = {}) {
  const t0 = performance.now();
  const Q = await readQuestion(q);
  const out = { question: q, read: Q, answers: [], partial: [], synonyms: [], given: [], gaps: [], limits: ["participants are matched by their word (lemma or a proper name in the phrase), not by a referent: the in-order read has no cast yet", "the hyperlexicon store holds names and relations, no glosses"], scope: upTo ? { upTo, chapter: chapterAt(upTo) } : { whole: true } };
  // the slice: frames of the action, and of its synonyms the hyperlexicon's givers list
  let kriyas = Q.kriya ? [Q.kriya] : [];
  if (Q.kriya && HL_HEAD && !Q.copular) {
    const names = await hl([{ op: "names", surfaces: [Q.kriya], lang: "en" }]);
    const nodes = (names?.[0]?.surfaces?.[Q.kriya]?.written ?? []).filter((x) => x.pos?.includes("verb")).map((x) => x.node);
    const rels = nodes.length ? await hl(nodes.map((id) => ({ op: "relations", id }))) : [];
    const syn = new Set(); for (const r of rels ?? []) for (const x of r?.relations ?? []) if (x.rel === "syn") syn.add(x.to);
    const extra = new Set(); for (const id of syn) for (const w of S.nodeKriyas.get(id) ?? []) if (w !== Q.kriya) extra.add(w);
    out.synonyms = [...extra].slice(0, 20); kriyas = [Q.kriya, ...out.synonyms];
  }
  const inScope = (f) => !upTo || (f.span && f.span[1] <= upTo);
  const cands = kriyas.flatMap((k) => (S.byKriya.get(k) ?? []).map((f) => ({ f, viaSynonym: k !== Q.kriya }))).filter(({ f }) => inScope(f));
  const gapSet = Q.gap ? new Set(Q.gap) : null;
  // a participant the question names must fill the SAME role in the frame; across voices (one passive, one active) agent and
  // patient swap. Only if no frame answers that way are frames that hold the participant in another role offered, marked loose.
  const swap = { "kartṛ": "karman", "karman": "kartṛ" };
  const roleOk = (w, g, f) => g.label === w.label || (!!Q.passive !== (f.voice === "passive") && swap[w.label] === g.label);
  const pass = (strict) => cands.filter(({ f }) => Q.filled.every((w) => f.roles.some((g) => fillerMatches(w, g) && (!strict || roleOk(w, g, f)))));
  let strict = true, kept = pass(true);
  const hasGap = (f) => !Q.gap || f.roles.some((g) => Q.gap.includes(g.label) || (g.contested ?? []).some((c) => Q.gap.includes(c)));
  // frames that hold the named participants only in OTHER roles are context, never answers
  out.loose = [];
  if (!kept.some(({ f }) => hasGap(f))) { const strictSet = new Set(kept.map((x) => x.f)); out.loose = pass(false).filter(({ f }) => !strictSet.has(f) && hasGap(f)).slice(0, 5).map(({ f }) => ({ order: f.order, kriya: f.kriya, chapter: f.span ? chapterAt(f.span[0]) : null, sentence: clip(f.span), at: f.span?.[0] ?? null, address: address(f.span) })); }
  out.matching = "the question's participants in the same roles (agent and patient swap across voices)";
  for (const { f, viaSynonym } of kept) {
    const sameRole = Q.filled.filter((w) => f.roles.some((g) => fillerMatches(w, g) && roleOk(w, g, f))).length;
    const fillers = gapSet ? f.roles.filter((g) => gapSet.has(g.label) || (g.contested ?? []).some((c) => gapSet.has(c))) : [];
    const pronounOnly = fillers.length > 0 && fillers.every((g) => g.pron);
    const used = new Set(fillers.map((g) => g.node));
    const hit = { order: f.order, kriya: f.kriya, viaSynonym, voice: f.voice, sameRole, chapter: f.span ? chapterAt(f.span[0]) : null, sentence: clip(f.span), address: address(f.span), at: f.span?.[0] ?? null,
      roles: f.roles.map((g) => ({ label: g.label, en: EN[g.label] ?? g.label, text: clip(g.span, 120), contested: g.contested, answer: used.has(g.node) })) };
    if (fillers.length) out.answers.push({ ...hit, pronounOnly, answer: fillers.map((g) => ({ text: clip(g.span, 160), label: g.label, contested: g.contested ?? null, address: address(g.span), at: g.span?.[0] ?? null, ...(g.pron ? { note: "a pronoun: its referent is not resolved (no cast in this read yet)" } : {}) })) });
    else if (!Q.gap) out.answers.push({ ...hit, answer: [], confirms: true });
    else out.partial.push(hit);
  }
  const rank = (a, b) => ((a.pronounOnly ? 1 : 0) - (b.pronounOnly ? 1 : 0)) || (b.sameRole - a.sameRole) || (a.viaSynonym - b.viaSynonym) || (a.order - b.order);
  out.answers.sort(rank); out.partial.sort(rank);
  out.counts = { frames: cands.length, answers: out.answers.length, partial: out.partial.length };
  out.answers = out.answers.slice(0, limit); out.partial = out.partial.slice(0, 6);
  if (!Q.kriya) out.gaps.push({ gap: "no_action", detail: "the question has no verb the reader could take as its action" });
  else if (!S.byKriya.has(Q.kriya) && !out.synonyms.length) out.gaps.push({ gap: "action_not_in_text", detail: `the text never uses "${Q.kriya}" as an action${HL_HEAD ? ", and the hyperlexicon's givers list no synonym of it that the text uses" : ""}` });
  else if (!out.answers.length) out.gaps.push({ gap: "the_text_does_not_say", detail: out.partial.length ? `the text has "${Q.kriya}" with these participants ${out.partial.length} time(s), but never says the ${Q.gap?.map((g) => EN[g] ?? g).join(" / ")}` : `no frame of "${Q.kriya}" holds ${Q.filled.map((w) => w.form).join(", ") || "these participants"}` });
  // what the givers say about the question's words (GIVEN, not the text's), and how the text itself uses them
  if (HL_HEAD && Q.words.length) {
    const surfaces = [...new Set(Q.words.map((w) => w.lemma))];
    const [nm, cx] = (await hl([{ op: "names", surfaces, lang: "en" }, { op: "context", words: surfaces, lang: "en", ground: { language: "en" } }])) ?? [];
    for (const w of surfaces) {
      const n = nm?.surfaces?.[w], c = cx?.words?.[w];
      const fw = fold(w), inText = S.frames.filter((f) => f.kriya === w).length + S.frames.reduce((a, f) => a + f.roles.filter((g) => g.head === fw || g.names.includes(fw)).length, 0);
      out.given.push({ word: w, languages: n?.languages ?? 0, senses: (n?.written ?? []).slice(0, 6).map((x) => ({ kind: x.kind, pos: x.pos, of: x.of, giver: x.giver })), corpus: c ? { uses: c.uses ?? null, documents: c.documents ?? null, gap: c.gap ?? null } : null, inText });
    }
  } else if (!HL_HEAD) out.gaps.push({ gap: "hyperlexicon_unreachable", detail: `no answer from ${HL}` });
  out.ms = Math.round(performance.now() - t0);
  return out;
}

return {
  get S() { return S; }, get HL_HEAD() { return HL_HEAD; }, HL, EN, KARAKAS, PART, PERSPECTIVES,
  ingest, wordProfile, tokenProfile, textProfile, answer, propositionsOf, egoGraph, clip,
};
}
