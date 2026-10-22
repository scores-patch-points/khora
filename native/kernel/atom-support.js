// atom-support.js — a claim weighed against its source ATOM BY ATOM (MEANING-ATOMS.md §4). Each claim atom is met when a source atom has the
// same predicate (same word, a dictionary synonym, or a shared English key) over the same referents (the same name, one containing the
// other, the same number, or nouns that are synonyms or share a key), with a compatible standing; it is contradicted when the source holds the
// same atom with the other polarity. A claim is supported when every load-bearing atom is met; one-place facts on a referent (an adjective)
// count too, met by the same adjective or by a source referent whose words carry it. The result names each atom's state, so a verdict is
// explained ("met: …; not met: …").
//   atomSupport(claimAtoms, sourceAtoms, { claimLang, sourceLang, same, keysOf }) → { verdict: "E" | "C" | "N", table: [{ atom, state, by }] }
//   same(lang, a, b, pos): optional, wikt-gloss.js synonymy (true when two words of one language mean the same)
//   keysOf(lang, word): optional, the word's English keys (wikt-gloss.js gloss.all), so words of two languages can meet
const low = (s) => String(s ?? "").normalize("NFKC").toLowerCase();
const ART = /^(the|a|an|el|la|los|las|lo|un|una|le|les|l'|l’|un|une|des|du|de la|der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/u;
const words = (s) => low(s).replace(ART, "").replace(/[’']/g, " ").replace(/[“”"«»()\[\],.:;!?]/g, " ").split(/\s+/).filter(Boolean);
const stem = (w) => low(w).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 5);
const numOf = (s) => { const m = /(\d[\d\s.,']*\d|\d)/u.exec(String(s ?? "")); if (!m) return null; let t = m[1].replace(/[\s']/g, ""); if (/,\d{3}(\D|$)/.test(t) && !/\.\d/.test(t)) t = t.replace(/,/g, ""); else if (/\.\d{3}(\D|$)/.test(t) && /,/.test(t)) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(",", "."); const v = parseFloat(t); return Number.isFinite(v) ? v : null; };
const DEG = /^(most|more|less|least):/;
const argText = (a) => (a && typeof a === "object" ? a.name ?? a.value ?? "" : String(a ?? ""));

// unread: the claim's content words no claim atom carries; a claim with any is never supported (what was not read cannot be checked)
export function atomSupport(C, S, { claimLang = "en", sourceLang = "en", same = null, keysOf = null, unread = [] } = {}) {
  const keys = (lang, w) => { const ks = new Set([stem(w)]); if (keysOf && lang !== "en") for (const k of keysOf(lang, low(w)) ?? []) for (const x of words(k)) ks.add(stem(x)); return ks; };
  const wordMeet = (a, b) => {
    if (stem(a) && stem(a) === stem(b)) return true;
    if (claimLang === sourceLang && same?.(claimLang, low(a), low(b))) return true;
    // a predicate is written in English keys whatever the language (atoms.js glosses it), so two of them can be English synonyms
    if (claimLang !== sourceLang && /^[a-z]+$/.test(low(a)) && /^[a-z]+$/.test(low(b)) && same?.("en", low(a), low(b))) return true;
    const ka = keys(claimLang, a), kb = keys(sourceLang, b); for (const k of ka) if (k.length >= 3 && kb.has(k)) return true;
    return false;
  };
  // the same referent: the same number; the same name or one inside the other; the same head noun (or its synonym or key)
  // every name a referent has on its side: its own and what a named(x, …) atom calls it
  const namesOf = (atoms) => { const m = new Map(); for (const a of atoms) if (a.pred === "named" && a.args?.[0]?.entity != null) { const k = a.args[0].entity; (m.get(k) ?? m.set(k, new Set()).get(k)).add(argText(a.args[1])); } return m; };
  const NC = namesOf(C), NS = namesOf(S);
  const allNames = (a, N) => [argText(a), ...(a?.entity != null ? [...(N.get(a.entity) ?? [])] : [])];
  const refMeet = (x, y) => allNames(x, NC).some((tx) => allNames(y, NS).some((ty) => refMeet1(tx, ty)));
  // two names of one referent: every content word of the claim's is met by a word of the source's
  const STOP = new Set(["de", "del", "des", "du", "of", "von", "vom", "der", "die", "das", "la", "le", "el", "the", "di", "da", "y", "et", "und", "and", "en", "in", "a", "à"]);
  const refMeet1 = (tx, ty) => {
    const nx = numOf(tx), ny = numOf(ty);
    if (nx != null || ny != null) return nx != null && ny != null && Math.abs(nx - ny) <= 0.02 * Math.max(Math.abs(nx), Math.abs(ny), 1e-9);
    const wx = words(tx), wy = words(ty); if (!wx.length || !wy.length) return false;
    const jx = wx.join(" "), jy = wy.join(" ");
    if (jx === jy || jx.includes(jy) || jy.includes(jx)) return true;
    const hx = wx.at(-1), hy = wy.at(-1);
    if (wordMeet(hx, hy) || wordMeet(wx[0], wy[0]) && (wx.length === 1 || wy.length === 1)) return true;
    const cw = wx.filter((w) => !STOP.has(w)), sw = wy.filter((w) => !STOP.has(w));
    if (cw.length && cw.every((a) => sw.some((b) => wordMeet(a, b)))) return true;
    // a name met by its distinctive word ("Titicaca" in "El lago Titicaca")
    const cap = (s) => (s.match(/\p{Lu}[\p{L}'’-]{3,}/gu) ?? []).map(low);
    const cx = cap(tx), cy = cap(ty); return cx.length > 0 && cx.some((w) => cy.includes(w));
  };
  const predWords = (p) => low(p).replace(DEG, "").split(/[_\s]+/).filter((w) => w && w.length > 1);
  // a declared canonical form (MEANING-ATOMS §5.1): a verb of being somewhere with a place is "be_in" — lie, sit, stand, be located or
  // situated, be found (se encuentra, se trouve), exist (ある), with the place's case word
  const LOC = /^(lie|sit|stand|locate|situate|find|exist|be|liegen|befinden|encontrar|ubicar|situar|trouver|situer|trouv|ある|位置)$/;
  const canon = (p) => { const ws = predWords(p); return ws.length >= 1 && ws.length <= 2 && LOC.test(ws[0]) && (ws.length === 2 || /^be_/.test(p) || ws[0] !== "be") ? "be_in" : p; };
  const predMeet = (p, q) => {
    if (p === q || (canon(p) === "be_in" && canon(q) === "be_in")) return true;
    const dp = DEG.exec(p)?.[1] ?? null, dq = DEG.exec(q)?.[1] ?? null; if (dp !== dq) return false;
    if (p === "is_a" || q === "is_a" || p === "named" || q === "named") return p === q;
    if (/^has_/.test(p) && /^has_/.test(q)) return true; // a figure meets a figure; the value decides
    const a = predWords(p), b = predWords(q); return a.some((x) => b.some((y) => wordMeet(x, y)));
  };
  // the claim's arguments in the source atom's, in order (a source atom may carry one more: "occupy(sector, known, 2112 km²)")
  const argsMeet = (cargs, sargs) => { let j = 0; for (const a of cargs) { while (j < sargs.length && !refMeet(a, sargs[j])) j++; if (j >= sargs.length) return false; j++; } return true; };
  // a source that only reports or hedges a fact does not support it asserted
  const standing = (c, s) => !s.hedged || !!c.hedged;
  const table = [];
  for (const c of C) {
    const cargs = c.args ?? [];
    let by = null, contra = null;
    // a one-place fact from a word of the referent's own name ("lago Menor" → menor) identifies it, and is not a further claim
    if (cargs.length === 1) { const w = predWords(c.pred).at(-1), t = argText(cargs[0]); if (w && new RegExp(`(^|\\s)\\p{Lu}`, "u").test(t) && words(t).some((x) => stem(x) === stem(w)) && /\p{Lu}/u.test(t.split(/\s+/).find((x) => stem(x) === stem(w)) ?? "")) { table.push({ atom: c, state: "met", by: null, identifying: true }); continue; } }
    for (const s of S) {
      const sargs = s.args ?? []; if (sargs.length < cargs.length) continue;
      if (cargs.length === 1) {
        // a one-place fact: the same adjective on the same referent, or a source referent whose words carry it
        if (sargs.length === 1 && predMeet(c.pred, s.pred) && refMeet(cargs[0], sargs[0])) { if (!!c.neg === !!s.neg) { if (standing(c, s)) { by = s; break; } continue; } if (!s.hedged) contra ??= s; continue; }
        const w = predWords(c.pred).at(-1);
        if (w && !DEG.test(c.pred) && standing(c, s) && sargs.some((a) => refMeet(cargs[0], a) && words(argText(a)).some((x) => wordMeet(w, x)))) { by = s; break; }
        continue;
      }
      if (!predMeet(c.pred, s.pred)) continue;
      if (!argsMeet(cargs, sargs)) continue;
      if (!!c.neg !== !!s.neg) { if (!s.hedged) contra ??= s; continue; }
      if (!standing(c, s)) continue;
      by = s; break;
    }
    table.push({ atom: c, state: by ? "met" : contra ? "contradicted" : "unmet", by: by ?? contra ?? null });
  }
  const verdict = !table.length ? "N" : table.some((t) => t.state === "contradicted") ? "C" : table.every((t) => t.state === "met") && !unread.length ? "E" : "N";
  return { verdict, table, unread };
}
