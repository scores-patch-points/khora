// stage-arm-bind.js — the INS cell of the stage check: which source anchor each claim end is (the stage spec, §7, law 3).
//
// Binding is its own cell, before any verdict. Its product is a map from claim anchor ids to source anchor ids and the typed gaps of the ends
// it could not bind; an end that does not bind is simply absent from the map, so every atom over it reads beyond-reach and no later cell can
// upgrade it. The reserved anchor `holds` binds itself.
//   bindNone(claim, source)            no binding at all: every claim atom is beyond reach (the check of law 1)
//   bindFolded(claim, source)          LEGACY: an end binds the source anchor of its kind that shares a folded name (the string identity of
//                                      stageFromEdges's default, marked so on the binding); kept for comparison, never the arm's binding
//   makeResolveBind({ … })(claim, source)  THE ARM'S BINDING (M2): janus resolve.mjs over the source page's referents, below
//   derange(binding, source)           the control built to fail: every bound end moved to another anchor
//   bindQuantity                       M3's quantity binding (RC3), passed to makeResolveBind as `quantities`
// Each returns { how, map: Map(claimId → sourceId), gaps: [{ kind, anchor, detail }] }.
import { HOLDS, fold } from "./stage-arm.js";

const sorted = (xs) => [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export function bindNone(claim) {
  const map = new Map(), gaps = [];
  for (const a of claim.anchors) if (a.id === HOLDS) map.set(HOLDS, HOLDS); else gaps.push({ kind: "no_correspondence", anchor: a.id, detail: "no binding cell ran" });
  return { how: "none", map, gaps };
}

export function bindFolded(claim, source) {
  const map = new Map(), gaps = [], S = sorted(source.anchors);
  for (const a of claim.anchors) {
    if (a.id === HOLDS) { map.set(HOLDS, HOLDS); continue; }
    const names = new Set(a.names.map(fold));
    const hit = S.find((b) => b.kind === a.kind && b.names.some((n) => names.has(fold(n))));
    if (hit) map.set(a.id, hit.id); else gaps.push({ kind: "no_correspondence", anchor: a.id, detail: "no source anchor shares a folded name" });
  }
  return { how: "folded-string", map, gaps };
}

// ---- M2: binding by janus's identity organs (injected, never copied: janus native/organs/identity/resolve.mjs and correspond.mjs) ------------
// A claim referent (an entity of the claim's reading, or an end it left unresolved) is bound by resolveReferent: the candidates are the source
// page's referents, each mention's and candidate's company the lemmas of its namings (with English keys, the reader's own glossary giver, when
// the two languages differ), and, for a claim lemma that correspond.mjs's matchPair confirms against its own null, the source lemma it
// corresponds to. resolve's assert binds; its ask (torn between candidates) is an end_unresolved gap, for law 2 — an ambiguous end is never
// resolved here; its gap or refusal is a no_correspondence gap. A kind binds the source kind with the same head (by key across languages)
// whose modifiers include the claim kind's; a name binds the source name with its folded words; a quantity binds nothing yet (M3).
//   makeResolveBind({ resolveReferent, correspond, keysOf, claimLang, sourceLang, claimReading, sourceReading }) → (claim, source) → binding
export function makeResolveBind({ resolveReferent, correspond = null, keysOf = null, claimLang = "en", sourceLang = "en", claimReading = null, sourceReading = null, quantities = null } = {}) {
  if (typeof resolveReferent !== "function") throw new TypeError("makeResolveBind: resolveReferent (janus resolve.mjs) is injected, never re-implemented here");
  const cross = claimLang !== sourceLang;
  const keyNodes = (lang, l) => { if (!cross || !keysOf) return []; const out = []; for (const k of keysOf(lang, l) ?? []) { const f = fold(k); if (!f) continue; out.push(`w:${f}`); const last = f.split(" ").at(-1); if (last && last !== f) out.push(`w:${last}`); } return out; };
  // a side's company nodes: its lemmas, and (across languages) the English keys of the non-English side's lemmas; English stays itself
  const nodesOf = (lemmas, lang, extra = []) => [...new Set([...lemmas.map((l) => `w:${fold(l)}`), ...(lang === "en" ? [] : lemmas.flatMap((l) => keyNodes(lang, l))), ...extra])];
  return function bindResolve(claim, source) {
    const map = new Map(), gaps = [], extra = [], S = sorted(source.anchors);
    // correspondence of claim lemmas to source lemmas, from relations alone, against correspond's own null (rewired source graphs)
    const corr = new Map(); let confirmed = 0;
    if (correspond && claimReading?.rows?.length && sourceReading?.page?.length) {
      const sent = (rows) => rows.map((r) => [fold(r.lemma && r.lemma !== "_" ? r.lemma : r.form), r.upos, r.head, r.deprel]);
      const gA = correspond.graphOf([sent(claimReading.rows)]), gB = correspond.graphOf(sourceReading.page.map((p) => sent(p.rows ?? [])));
      const r = correspond.matchPair(gA, gB, correspond.Q?.seed ?? 20261025);
      for (const [a, b] of r.confirmed ?? []) { corr.set(gA.keys[a], gB.keys[b]); confirmed++; }
    }
    const refs = S.filter((b) => b.kind === "referent" && b.lemmas.length);
    const candidates = refs.map((b) => ({ id: b.id, nodes: nodesOf(b.lemmas, sourceLang) }));
    for (const a of claim.anchors) {
      if (a.id === HOLDS) { map.set(HOLDS, HOLDS); continue; }
      if (a.kind === "referent") {
        const nodes = nodesOf(a.lemmas, claimLang, a.lemmas.map((l) => corr.get(fold(l))).filter(Boolean).map((u) => `w:${u}`));
        const r = resolveReferent({ mention: { nodes }, candidates, lens: { name: "meaning-check binding" }, giver: "janus resolve.mjs" });
        if (r.decision === "assert") map.set(a.id, r.asserted);
        else gaps.push({ kind: r.decision === "ask" ? "end_unresolved" : "no_correspondence", anchor: a.id, detail: r.reason ?? (r.decision === "ask" ? `torn between ${(r.between ?? []).length} candidates` : r.decision) });
        continue;
      }
      if (a.kind === "kind" && a.via === "comparison-class") continue; // bound below, from its parts
      if (a.kind === "kind") {
        const meets = (x, y) => fold(x) === fold(y) || (cross && keysOf && (keysOf(sourceLang, y) ?? []).some((k) => fold(k) === fold(x) || fold(k).split(" ").at(-1) === fold(x)));
        const ks = S.filter((b) => b.kind === "kind" && meets(a.head, b.head) && a.modifiers.every((m) => b.modifiers.some((n) => meets(m, n))));
        const exact = ks.filter((b) => b.modifiers.length === a.modifiers.length);
        const pick = exact.length === 1 ? exact[0] : ks.length === 1 ? ks[0] : null;
        if (pick) map.set(a.id, pick.id); else gaps.push({ kind: ks.length > 1 ? "end_unresolved" : "no_correspondence", anchor: a.id, detail: ks.length > 1 ? `${ks.length} source kinds carry its words` : "no source kind carries its words" });
        continue;
      }
      if (a.kind === "name") {
        const ns = S.filter((b) => b.kind === "name" && fold(b.label) === fold(a.label));
        if (ns.length === 1) map.set(a.id, ns[0].id); else gaps.push({ kind: "no_correspondence", anchor: a.id, detail: "no source name with its words" });
        continue;
      }
      if (a.kind === "quantity") {
        if (!quantities) { gaps.push({ kind: "no_correspondence", anchor: a.id, detail: "quantities are not bound before M3" }); continue; }
        quantities(a, S, map, gaps, extra);
      }
    }
    // a comparison class binds the source class whose parts are the images of its own (its kind, and every place); after the kinds and
    // referents it is made of
    for (const a of claim.anchors.filter((x) => x.via === "comparison-class" && x.parts)) {
      const kind = map.get(a.parts.kind), places = a.parts.places.map((p) => map.get(p));
      const hit = kind && places.every(Boolean) ? S.find((b) => b.via === "comparison-class" && b.parts?.kind === kind && b.parts.places.length === places.length && [...places].sort().every((p, i) => p === [...b.parts.places].sort()[i])) : null;
      if (hit) map.set(a.id, hit.id); else gaps.push({ kind: "no_correspondence", anchor: a.id, detail: "no source comparison class has its kind and places" });
    }
    return { how: quantities ? "resolve+quantities" : "resolve", map, gaps, extra, correspondence: confirmed };
  };
}

/** the control built to fail: every bound claim end re-bound to the next source anchor of its kind in sorted order, so none keeps its binding;
 *  an end whose kind has one anchor goes to the next anchor of any kind. holds stays holds. */
export function derange(binding, source) {
  const S = sorted(source.anchors).filter((b) => b.id !== HOLDS), ids = S.map((b) => b.id), kindOf = new Map(S.map((b) => [b.id, b.kind]));
  const next = (list, x) => { const i = list.indexOf(x); return list.length > 1 ? list[(i + 1) % list.length] : null; };
  const map = new Map();
  for (const [c, s] of binding.map) {
    if (c === HOLDS) { map.set(c, s); continue; }
    const same = ids.filter((x) => kindOf.get(x) === kindOf.get(s));
    const to = (same.length > 1 ? next(same, s) : null) ?? next(ids.includes(s) ? ids : [...ids, s].sort(), s);
    if (to && to !== s) map.set(c, to);
  }
  return { ...binding, how: `${binding.how}+deranged`, map };
}

/** RC3 in the binding cell: a claim quantity binds the source quantity of its measure whose value (base units, or a bracketed equivalent) is
 *  within 2% of its own (the existing meeting test, atom-support.js figMeet); two or more such is an end_unresolved gap; none, and it enters
 *  as a quantity of its own — a value is its own identity, so the cell has decided "different", which only R2 can use, toward contradicted. */
export function bindQuantity(a, S, map, gaps, extra) {
  const vals = (x) => [x.base, ...(x.alts ?? [])].filter((v) => v != null && Number.isFinite(+v)).map(Number);
  if (!a.measure || !vals(a).length) { gaps.push({ kind: "no_correspondence", anchor: a.id, detail: "a figure with no measure or value" }); return; }
  const meet = (x, y) => vals(x).some((u) => vals(y).some((v) => Math.abs(u - v) <= 0.02 * Math.max(Math.abs(u), Math.abs(v), 1e-9)));
  const hits = S.filter((b) => b.kind === "quantity" && b.measure === a.measure && vals(b).length && meet(a, b));
  if (hits.length === 1) map.set(a.id, hits[0].id);
  else if (hits.length > 1) gaps.push({ kind: "end_unresolved", anchor: a.id, detail: `${hits.length} source figures of its measure meet it` });
  else { map.set(a.id, a.id); extra.push({ id: a.id, kind: "quantity" }); }
}
