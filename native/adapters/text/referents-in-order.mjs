// referents-in-order.mjs — THE CAST, READ IN ORDER OFF THE TREES (no pattern: rows, heads, deprels, feats).
//
// A name is what the reader marks as one: a PROPN with its flat and compound PROPN parts. In reading order each mention joins
// the one being it can be, or opens a new one (causal: linked against what was read before it, never after):
//   the same written form (of two or more words)                         → that being
//   a shorter form of one of its names ("Natásha" in "Natásha Rostóva"), or a longer form holding one of its names whole
//   ("Anna Pávlovna Schérer" after "Anna Pávlovna")                         → that being; several → the one mentioned last, counted contested
//   otherwise                                                              → a new being ("Anna Mikháylovna" holds neither "Anna Pávlovna" whole
//                                                                            nor is held by it: two beings)
// Names side by side ("Sónya Natásha": a run that holds two beings' names whole) are linked by their head word and widen no being;
// a contested link never widens a being either, so one doubtful mention cannot bridge two.
// Names side by side ("Sónya Natásha", "Petersburg Pierre": the parser chained two names) are split: each word is linked to its
// own being, and none is widened. A contested link never widens a being either, so one doubtful mention cannot bridge two.
// TWO LAYERS (low = possibility, high = probability): the GROUND is the text's own word classes, read off every tree before the fold
// (a word the reader writes in lower case as a common noun RECUR times or more, "the prince", "the countess", is a TITLE, with the POS
// prior's common nouns: context-free, like the prior itself); the FOLD links names causally on that ground. A title stays in the written
// form but never identifies; a title alone ("Prince") is the last being that carried it.
import { boundProforms, proformOf, proformClass, featsOf } from "./gender-from-corpus.js";

const NAME_PART = new Set(["flat", "flat:name", "compound"]);
const key = (s) => String(s).normalize("NFC").toLowerCase();
const within = (a, b) => a.every((t) => b.includes(t));
// how often a word must have been read as a lower-case common noun before it counts as a title (declared: a word seen once could be
// a slip of the parser; the same recurrence the door's cast-identity asks of a unit, RECUR.unit = 2)
export const TITLE_RECUR = 2;
// the salience horizon is this percentile of the gaps between a named being's consecutive mentions (declared: a description reaches
// back about as far as names stay in play; the text's own spread, not a tuned number)
export const HORIZON_PCT = 0.9;
/** the identity edge kinds a perspective may collapse (none is collapsed by the read itself) */
export const EDGE_TYPES = Object.freeze(["apposition", "title", "predicate", "shared-name", "same-head", "possessor"]);
/**
 * mergeBy(cast, types) → Map ref → group ref: ONE perspective on identity. The read keeps every referent apart and every identity as a
 * typed edge; a question chooses which kinds of edge make two referents one ("who": apposition + title + predicate; "the family":
 * + shared-name). `possessor` relates, it never identifies, and is refused here.
 */
export function mergeBy(cast, types = []) {
  const use = new Set(types.filter((t) => t !== "possessor")), up = new Map();
  const find = (x) => { let r = x; while (up.has(r) && up.get(r) !== r) r = up.get(r); return r; };
  for (const e of cast?.edges ?? []) if (use.has(e.type)) { const a = find(e.a), b = find(e.b); if (a !== b) up.set(b, a); }
  const out = new Map(); for (const r of cast?.referents ?? []) out.set(r.ref, find(r.ref)); return out;
}

/** referentsInOrder(parse, { commonNoun }) → { referents: [...], mentionOf: { "order.id": ref }, mentions, contested, titles } */
export function referentsInOrder(parse, { commonNoun = () => false, genderOf = null } = {}) {
  // the ground: the text's own lower-case common nouns, from every tree
  const lowerNoun = new Map();
  for (const p of parse ?? []) for (const r of p?.rows ?? []) if (r.upos === "NOUN") { const k = key(r.form); if (k === r.form) lowerNoun.set(k, (lowerNoun.get(k) ?? 0) + 1); }
  const memo = new Map(), isTitle = (t) => { let v = memo.get(t); if (v === undefined) memo.set(t, (v = !!commonNoun(t) || (lowerNoun.get(t) ?? 0) >= TITLE_RECUR)); return v; };
  const beings = [], bySurface = new Map(), byToken = new Map(), titleOf = new Map(), mentionOf = {};
  let mentions = 0, contested = 0;
  const open = (order) => { const bi = beings.length; beings.push({ ref: `r${bi + 1}`, forms: new Map(), idents: [], calledBy: new Set(), proforms: new Map(), classes: {}, mentions: 0, contested: 0, first: order, last: order }); return bi; };
  // the beings a name (its identifying words) can be: one of whose names holds it whole ("in"), or whose name it holds whole ("ext")
  const fitsFor = (id) => { const cand = new Set(); for (const t of id) for (const b of byToken.get(t) ?? []) cand.add(b); return [...cand].map((b) => ({ b, rel: beings[b].idents.some((F) => within(id, F)) ? "in" : beings[b].idents.some((F) => within(F, id)) ? "ext" : null })).filter((x) => x.rel); };
  // several beings fit: the ONE already called by exactly this name, in a link without doubt ("Mary" for Princess Mary, whose first
  // mention was "Princess Mary Bolkónskaya", not Mary Ivánovna) takes it without doubt; else the one read last, contested
  const exactOf = (fit, id) => { const k = id.join(" "), e = fit.filter((x) => beings[x.b].calledBy.has(k)); return e.length === 1 ? e[0].b : null; };
  const pick = (fit) => fit.map((x) => x.b).sort((a, b) => beings[b].last - beings[a].last || b - a)[0];
  const nameGaps = [], titleHist = new Map();   // for the second pass: how far back a name stays salient; who carried each title when
  const note = (bi, form, order, wasContested) => { const b = beings[bi]; if (b.mentions) nameGaps.push(order - b.last); b.forms.set(form, (b.forms.get(form) ?? 0) + 1); b.mentions++; b.last = order; mentions++; if (wasContested) { b.contested++; contested++; } };
  const widen = (bi, id) => { const b = beings[bi]; if (b.idents.some((F) => within(id, F))) return; b.idents.push(id); for (const t of id) { let s = byToken.get(t); if (!s) byToken.set(t, (s = new Set())); s.add(bi); } };
  for (const p of parse ?? []) {
    const rows = p?.rows; if (!Array.isArray(rows) || !rows.length) continue;
    const byId = new Map(), kids = new Map();
    for (const r of rows) { byId.set(r.id, r); const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
    for (const r of rows) {
      if (r.upos !== "PROPN") continue;
      if (NAME_PART.has(r.deprel) && byId.get(r.head)?.upos === "PROPN") continue; // a part of a name, not its head
      const parts = [r, ...(kids.get(r.id) ?? []).filter((c) => NAME_PART.has(c.deprel) && c.upos === "PROPN")].sort((a, b) => a.id - b.id);
      const surface = parts.map((x) => x.form).join(" "), toks = parts.map((x) => key(x.form)), ident = toks.filter((t) => !isTitle(t));
      let bi = ident.length > 1 ? bySurface.get(key(surface)) : undefined, headBeing;
      if (bi !== undefined) { note(bi, surface, p.order, false); headBeing = bi; for (const x of parts) mentionOf[`${p.order}.${x.id}`] = beings[bi].ref; }
      else if (!ident.length) { // a title alone: the last being that carried it
        const t = toks.find((x) => titleOf.has(x)); bi = t !== undefined ? titleOf.get(t) : open(p.order);
        note(bi, surface, p.order, false); headBeing = bi; for (const x of parts) mentionOf[`${p.order}.${x.id}`] = beings[bi].ref;
      } else {
        const fit = fitsFor(ident), ext = new Set(fit.filter((x) => x.rel === "ext").map((x) => x.b));
        const joined = fit.length === 1 ? fit[0].b : null;
        // names side by side: the run holds two beings' names whole, or the being it would join does not hold a word another being holds
        const side = ident.length > 1 && (ext.size > 1 || (joined !== null && ident.some((t) => !beings[joined].idents.some((F) => F.includes(t)) && [...(byToken.get(t) ?? [])].some((o) => o !== joined))));
        if (side) {
          for (const x of parts) {
            const t = key(x.form); if (isTitle(t)) continue;
            const f1 = fitsFor([t]), ex1 = f1.length > 1 ? exactOf(f1, [t]) : null; const b1 = f1.length === 1 ? f1[0].b : ex1 ?? (f1.length ? pick(f1) : open(p.order));
            if (!f1.length) widen(b1, [t]);
            note(b1, x.form, p.order, f1.length > 1 && ex1 === null); if (f1.length <= 1 || ex1 !== null) beings[b1].calledBy.add(t); mentionOf[`${p.order}.${x.id}`] = beings[b1].ref; if (x === r || headBeing === undefined) headBeing = b1;
          }
          for (const x of parts) if (!mentionOf[`${p.order}.${x.id}`]) mentionOf[`${p.order}.${x.id}`] = beings[headBeing].ref;
        } else {
          const ex = fit.length > 1 ? exactOf(fit, ident) : null, wasContested = fit.length > 1 && ex === null;
          bi = joined ?? ex ?? (wasContested ? pick(fit) : open(p.order));
          if (!wasContested) { widen(bi, ident); beings[bi].calledBy.add(ident.join(" ")); if (ident.length > 1) bySurface.set(key(surface), bi); }
          note(bi, surface, p.order, wasContested); headBeing = bi; for (const x of parts) mentionOf[`${p.order}.${x.id}`] = beings[bi].ref;
        }
      }
      for (const t of toks) if (isTitle(t)) { titleOf.set(t, headBeing); let h = titleHist.get(t); if (!h) titleHist.set(t, (h = [])); h.push([p.order, headBeing]); }
      if (r.deprel === "nsubj" || r.deprel === "nsubj:pass") {
        const v = byId.get(r.head), b = beings[headBeing];
        // the bound pro-form points at the same node: "her" in "Natásha raised her head" is a form of Natásha's referent
        if (v) for (const { row, cls } of boundProforms(kids, v, r)) { const f = key(row.form); b.proforms.set(f, (b.proforms.get(f) ?? 0) + 1); b.classes[cls] = (b.classes[cls] ?? 0) + 1; mentionOf[`${p.order}.${row.id}`] = b.ref; }
      }
    }
  }
  // ── PASS B: every other mention of a being, in reading order on the same trees, on top of the names ───────────────────────────
  // THE HORIZON a description or a pronoun reaches back: as far as a NAMED being stays salient in this text, the 90th percentile of the
  // gaps (in sentences) between a name's consecutive mentions (measured on the names pass; declared, not tuned)
  nameGaps.sort((a, b) => a - b);
  const horizon = nameGaps.length ? Math.max(1, nameGaps[Math.min(nameGaps.length - 1, Math.floor(HORIZON_PCT * nameGaps.length))]) : 1;
  const nominals = [], edges = new Map(), byHead = new Map(), byForm = new Map(), byPoss = new Map(), recent = [];
  let nomMentions = 0, pronounsBound = 0, pronounsContested = 0;
  const all = (ref) => (ref[0] === "n" ? nominals[Number(ref.slice(1)) - 1] : beings[Number(ref.slice(1)) - 1]);
  const edge = (a, b, type, order) => { if (!a || !b || a === b) return; const [x, y] = a < b ? [a, b] : [b, a], k = `${x}|${y}|${type}`, e = edges.get(k); if (e) e.n++; else edges.set(k, { a: x, b: y, type, n: 1, first: order }); };
  const touch = (ref, order) => { const i = recent.indexOf(ref); if (i >= 0) recent.splice(i, 1); recent.push(ref); all(ref).seen = order; while (recent.length && order - all(recent[0]).seen > horizon) recent.shift(); };
  const openN = (order, head, number, of) => { const n = { ref: `n${nominals.length + 1}`, kind: "nominal", head, number, of: of ?? null, forms: new Map(), proforms: new Map(), classes: {}, mentions: 0, links: {}, first: order, last: order, seen: order }; nominals.push(n); return n; };
  const lastWithin = (m, k, order) => { const n = m.get(k); return n && order - n.last <= horizon ? n : null; };
  // a title names a CLASS of beings only if two or more beings carried it ("prince", "count"; not "day" from "Saint Nicholas Day");
  // its carrier is the last being that carried it, and only while that being is still in view (within the horizon)
  const titleBeings = new Map([...titleHist].map(([t, h]) => [t, new Set(h.map((x) => x[1])).size]));
  const carrierOf = (t, order) => { if ((titleBeings.get(t) ?? 0) < 2) return null; const h = titleHist.get(t); let lo = 0, hi = h.length - 1, best = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (h[mid][0] <= order) { best = h[mid]; lo = mid + 1; } else hi = mid - 1; } return best && order - best[0] <= horizon ? beings[best[1]].ref : null; };
  // a being's pro-form so far: the class its own clauses lean to (lean) and whether the sign test decides it (sure)
  // a being with no pronoun evidence of its own takes the given-name table's lean (genderOf(words) → "m" | "f" | null): an OVERCOMEABLE prior,
  // never "sure"; the text's own evidence replaces it as soon as a clause binds a pronoun to the being
  const priorOf = (x) => (genderOf && x.idents ? genderOf(x.idents.flat()) ?? null : null);
  // ... and one that a pronoun was ASSUMED to point at (bound with no evidence either way): once "she" is taken to be Mina, "he" is not Mina
  const assumedOf = (x) => { const a = Object.entries(x.assumed ?? {}).sort((p, q) => q[1] - p[1])[0]; return a ? a[0] : null; };
  const classNow = (x) => { const d = proformOf({ classes: x.classes }); return d ? { lean: d.cls, sure: !d.contested } : { lean: x.kind === "nominal" ? null : priorOf(x) ?? assumedOf(x), sure: false }; };
  for (const b of beings) b.seen = -Infinity;
  for (const p of parse ?? []) {
    const rows = p?.rows; if (!Array.isArray(rows) || !rows.length) continue;
    const byId = new Map(), kids = new Map();
    for (const r of rows) { byId.set(r.id, r); const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
    const at = (r) => mentionOf[`${p.order}.${r.id}`] ?? null;
    // the names of this sentence are present now (their recency is the presence a pronoun reads)
    // the SUBJECT is touched last, so it is the most salient of the sentence (what "she" most likely continues)
    for (const subj of [false, true]) for (const r of rows) { const ref = at(r); if (ref && ref[0] === "r" && r.upos === "PROPN" && (r.deprel === "nsubj" || r.deprel === "nsubj:pass") === subj) touch(ref, p.order); }
    for (const r of rows) {
      // (1) A NOUN PHRASE is a mention: its head with its determiner, adjectives, compounds and numerals; the possessor is its own mention
      if (r.upos === "NOUN" && !NAME_PART.has(r.deprel) && r.deprel !== "fixed" && !at(r)) {
        const ch = kids.get(r.id) ?? [], det = ch.find((c) => c.deprel === "det"), D = featsOf(det?.feats), F = featsOf(r.feats);
        const mods = ch.filter((c) => c.deprel === "amod" || c.deprel === "compound" || c.deprel === "nummod").sort((a, b) => a.id - b.id);
        const poss = ch.find((c) => c.deprel === "nmod:poss"), possRef = poss ? at(poss) : null;
        const number = F.Number === "Plur" ? "Plur" : "Sing", head = key(r.lemma ?? r.form);
        const formKey = [...mods.map((m) => key(m.lemma ?? m.form)), head, number].join(" ");
        const surface = [det, ...mods, r].filter(Boolean).sort((a, b) => a.id - b.id).map((x) => x.form).join(" ");
        const indefinite = D.Definite === "Ind" || D.PronType === "Ind" || D.PronType === "Neg" || D.PronType === "Tot";
        let n = null, via;
        if (possRef) { n = byPoss.get(`${head}|${number}|${possRef}`) ?? null; via = "possessed"; if (!n) { n = openN(p.order, head, number, possRef); byPoss.set(`${head}|${number}|${possRef}`, n); edge(n.ref, possRef, "possessor", p.order); } }
        else if (indefinite) { n = openN(p.order, head, number); via = "opened"; }
        else {
          n = (mods.length ? lastWithin(byForm, formKey, p.order) : null); via = "same-form";
          if (!n) { n = lastWithin(byHead, `${head}|${number}`, p.order); via = "definite"; }
          if (!n) { const before = byHead.get(`${head}|${number}`); n = openN(p.order, head, number); via = "opened"; if (before) edge(n.ref, before.ref, "same-head", p.order); }   // the same description after the horizon: maybe the same thing again (a perspective decides)
          if (isTitle(head)) edge(n.ref, carrierOf(head, p.order), "title", p.order);   // "the old prince" → the last being who carried "prince"
        }
        n.forms.set(surface, (n.forms.get(surface) ?? 0) + 1); n.mentions++; n.last = p.order; n.links[via] = (n.links[via] ?? 0) + 1; nomMentions++;
        byHead.set(`${head}|${number}`, n); if (mods.length) byForm.set(formKey, n);
        for (const x of [r, det, ...mods].filter(Boolean)) mentionOf[`${p.order}.${x.id}`] = n.ref;
        touch(n.ref, p.order);
        if (r.deprel === "nsubj" || r.deprel === "nsubj:pass") { const v = byId.get(r.head); if (v) for (const { row, cls } of boundProforms(kids, v, r)) { const f = key(row.form); n.proforms.set(f, (n.proforms.get(f) ?? 0) + 1); n.classes[cls] = (n.classes[cls] ?? 0) + 1; mentionOf[`${p.order}.${row.id}`] = n.ref; } }
      }
    }
    for (const r of rows) {
      // (2) A PRONOUN no clause has bound yet: the most recent present being whose pro-form (so far) agrees, never a co-argument of its
      //     own verb ("he saw him": not him); a being whose pro-form is not yet known is a fallback, and choosing it is contested
      if (r.upos === "PRON" && !at(r)) {
        const F = featsOf(r.feats); if (F.PronType !== "Prs" || F.Reflex === "Yes" || F.Person !== "3") continue;
        const cls = proformClass(F); if (!cls) continue;
        const coArgs = new Set((kids.get(r.head) ?? []).map((c) => at(c)).filter(Boolean)); const v = byId.get(r.head); if (v) { const own = at(v); if (own) coArgs.add(own); }
        let match = null, fallback = null, second = null, sure = false;
        for (let i = recent.length - 1; i >= 0; i--) {
          const ref = recent[i]; if (coArgs.has(ref)) continue; const x = all(ref), c = classNow(x);
          // evidence leaning the other way excludes a being (Pierre's "his" rules him out for "she"); no evidence at all is a fallback
          if (c.lean === cls) { if (!match) { match = ref; sure = c.sure; } else if (!second) second = ref; } else if (c.lean === null && !fallback && (cls === "m" || cls === "f" ? ref[0] === "r" : ref[0] === "n" && (x.number === "Plur") === (cls === "x"))) fallback = ref;   // with no evidence: he/she only a name, it a singular noun phrase, they a plural one
          if (match && second) break;
        }
        const ref = match ?? fallback; if (!ref) continue;
        const doubt = !match || !sure || (second && all(second).seen === all(match).seen);
        mentionOf[`${p.order}.${r.id}`] = ref; const x = all(ref); const f = key(r.form); x.pronouns = x.pronouns ?? new Map(); x.pronouns.set(f, (x.pronouns.get(f) ?? 0) + 1);
        if (!match) { x.assumed = x.assumed ?? {}; x.assumed[cls] = (x.assumed[cls] ?? 0) + 1; }   // bound with no evidence: an assumption, recorded as one
        pronounsBound++; if (doubt) pronounsContested++; touch(ref, p.order);
      }
      // (3) IDENTITY ACROSS REFERENTS is an edge, never a merge: an apposition ("Prince Andrew Bolkónski, the little princess’ husband")
      //     and a copular predicate ("Pierre was the son of …") say two referents may be one; a perspective decides (mergeBy)
      if (r.deprel === "appos") edge(at(r), at(byId.get(r.head) ?? {}), "apposition", p.order);
      if (r.upos === "NOUN" && (kids.get(r.id) ?? []).some((c) => c.deprel === "cop")) { const sj = (kids.get(r.id) ?? []).find((c) => c.deprel === "nsubj"); if (sj) edge(at(sj), at(r), "predicate", p.order); }
    }
  }
  // a surname or short name that fit several beings: the beings it could be are linked by a shared name (family, namesakes)
  for (const b of beings) for (const f of b.calledBy) for (const o of byToken.get(f) ?? []) if (beings[o] !== b && !f.includes(" ")) edge(b.ref, beings[o].ref, "shared-name", b.first);
  const byCount = (m) => [...(m ?? [])].sort((a, b) => b[1] - a[1]);
  const named = beings.map((b) => ({ ref: b.ref, kind: "name", names: b.idents.map((F) => F.join(" ")), forms: byCount(b.forms), mentions: b.mentions, contested: b.contested, first: b.first, last: b.last, proformForms: byCount(b.proforms), pronouns: byCount(b.pronouns), proform: proformOf({ classes: b.classes }) }));
  const nominal = nominals.map((n) => ({ ref: n.ref, kind: "nominal", head: n.head, number: n.number, of: n.of, forms: byCount(n.forms), mentions: n.mentions, links: n.links, first: n.first, last: n.last, proformForms: byCount(n.proforms), pronouns: byCount(n.pronouns), proform: proformOf({ classes: n.classes }) }));
  return {
    referents: [...named, ...nominal], mentionOf, mentions, contested, titles: [...memo].filter(([, v]) => v).map(([k]) => k),
    edges: [...edges.values()], horizon, nominalMentions: nomMentions, pronounsBound, pronounsContested,
  };
}
