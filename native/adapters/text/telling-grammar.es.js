// adapters/text/telling-grammar.es.js — the SPANISH grammar for the research record's telling. Handle: the adapter's own grammar.
//
// Same lens, same propositions, another language: EOT → Spanish grammar → NL. Nothing in organs/cube-telling.js changes for Spanish.
// Copied source bytes are never translated, so two constructions behave differently from English, on purpose:
//   said       Spanish attributes with a colon ("Thune: «…»"). The source's attitude verb is English bytes; it is not realized as a
//              Spanish verb (translating it would classify it, which the record never does). Its address stays in the proposition.
//   said_that  indirect speech would embed an English clause in a Spanish sentence; the construction declines (returns null) and the
//              cell goes silent in Spanish rather than code-switch.
// GIVER: the author (Claude), 2026-10-14 — UNREVIEWED by a native speaker. Lists, dates and plural categories: Unicode CLDR via Intl.
// Number words: zero to nine in letters with gender agreement (RAE, Ortografía 2010 §8.2.1.1, the common style), numerals for every count
// in a sentence once any count is 10 or more (the same consistency rule as English's CMOS 9.7).
import { seg, sentence } from "../../organs/prose-laws.js";
import { wordsOf } from "./telling-grammar.en.js";

export const LANG = "es";
export const GIVER = "Spanish construction table v1 (author, 2026-10-14; unreviewed by a native speaker); CLDR via Intl; RAE Ortografía 2010 for numbers";
export const QUOTES = Object.freeze({ open: "«", close: "»", inner: ["“", "”"] });

const F = seg.frame;
const V = seg.value;
const plural = new Intl.PluralRules("es");
const pick = (k, one, other) => (plural.select(k) === "one" ? one : other);
const WORDS = { m: ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"], f: ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"] };
const nf = new Intl.NumberFormat("es");
/** A count, gendered for the noun it quantifies ("m" | "f"). */
const n = (k, g = "m") => ({ ...V(Number.isInteger(k) && k >= 0 && k <= 9 ? WORDS[g][k] : nf.format(k)), count: k, gender: g });
const lf = new Intl.ListFormat("es", { type: "conjunction" });
export function list(items) {
  if (!items.length) return [];
  const parts = lf.formatToParts(items.map((_, i) => `\u0000${i}\u0000`));
  return parts.flatMap((p) => (p.type === "element" ? items[Number(p.value.replace(/\u0000/g, ""))] : [{ ...V(p.value), cldr: true }]));
}
const dfLong = new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "UTC" });
const dfMonth = new Intl.DateTimeFormat("es", { year: "numeric", month: "long", timeZone: "UTC" });
const date = (iso) => V(dfLong.format(new Date(`${String(iso).slice(0, 10)}T12:00:00Z`)));
const month = (ym) => V(dfMonth.format(new Date(`${ym}-15T12:00:00Z`)));

const Cap = (segs) => { const [h, ...r] = segs; if (!h) return segs; return [{ ...h, t: h.kind === "source" ? h.t : h.t.charAt(0).toUpperCase() + h.t.slice(1) }, ...r]; };
const consistent = (segs) => (segs.some((x) => x.count >= 10) ? segs.map((x) => (x.count != null ? { ...x, t: nf.format(x.count) } : x)) : segs);
export const finish = (segs, grounds) => sentence(Cap(consistent(segs)), grounds);
const qmid = (s) => [F(QUOTES.open), s, F(QUOTES.close)];

export const CONSTRUCTIONS = {
  refused: ({ hosts }) => [n(hosts.length), F(` ${pick(hosts.length, "editor rechazó", "editores rechazaron")} la solicitud de ${pick(hosts.length, "su página", "sus páginas")}: `), ...list(hosts), F(".")],
  search_empty: ({ query }) => [F("La búsqueda de «"), ...query, F("» no devolvió nada.")],
  question_names: ({ figs }) => [F("La pregunta nombra a "), ...list(figs), F(`, y las páginas también ${pick(figs.length, "lo", "los")} nombran.`)],
  question_names_none: () => [F("Nada de lo que nombra la pregunta reaparece en las páginas como figura.")],
  collection: ({ read, search, hand }) => [F("De las "), n(read, "f"), F(" páginas leídas, "), n(search, "f"), F(` ${pick(search, "provino", "provinieron")} de una búsqueda hecha con las propias palabras de la pregunta y `), n(hand, "f"), F(` ${pick(hand, "se añadió", "se añadieron")} a mano.`)],
  declined_names: ({ k }) => [F("De las palabras con mayúscula de estas páginas, "), n(k, "f"), F(` no se ${pick(k, "admitió", "admitieron")} como figuras: son fechas, o nunca actúan en ninguna afirmación.`)],
  most_named: ({ items, total }) => [F("Las figuras nombradas en más páginas son "), ...list(items.map((it, i) => [...it.fig, F(" ("), n(it.pages, "f"), ...(i ? [] : [F(" de "), n(total, "f")]), F(")")])), F(".")],
  figures_total: ({ k, single }) => [F("En total, "), n(k, "f"), F(" figuras reaparecen y actúan en alguna afirmación; "), ...(single ? [n(single, "f"), F(" de ellas aparecen en una sola página.")] : [F("todas aparecen en más de una página.")])],
  unsorted: ({ claims, unsorted }) => [F("De "), n(claims, "f"), F(" afirmaciones, "), n(unsorted, "f"), F(" no nombran ninguna figura de ningún grupo.")],
  groups: ({ k }) => [F("Hay "), n(k), F(` ${pick(k, "grupo", "grupos")} de figuras que se nombran juntas más a menudo de lo que permite el azar.`)],
  groups_none: () => [F("Ningún grupo de figuras se nombra junto más a menudo de lo que permite el azar.")],
  largest_groups: ({ groups }) => [...groups.flatMap((g, i) => [...(i ? [F("; el siguiente reúne a ")] : [F("El mayor reúne a ")]), ...list(g.figs), F(" ("), n(g.claims, "f"), F(` ${pick(g.claims, "afirmación", "afirmaciones")})`)]), F(".")],
  holdings: ({ pages, bytes, passages }) => [F("El registro contiene "), n(pages, "f"), F(" páginas, "), n(bytes), F(" bytes de texto en "), n(passages), F(" pasajes, cada una fijada por un hash de sus bytes exactos.")],
  pub_range: ({ from, to, undated }) => [F("Sus fechas de publicación van del "), date(from), F(" al "), date(to), ...(undated ? [F("; "), n(undated, "f"), F(` ${pick(undated, "página no declara", "páginas no declaran")} ninguna`)] : []), F(".")],
  voices: ({ claims, own, reported, quoted }) => [F("De "), n(claims, "f"), F(" afirmaciones, "), n(own, "f"), F(" están en la voz propia de una página y "), n(reported, "f"), F(" recogen lo que dijo otra persona, "), n(quoted, "f"), F(" de ellas entre comillas.")],
  page_says: ({ page, quote }) => [F("Según "), ...page, F(": "), ...qmid(quote), F(".")],
  both_weigh: ({ a, b }) => [F("Dos lecturas pesan lo mismo aquí: "), ...a, F("; y "), ...b, F(".")],
  both: ({ a, b }) => [F("El registro no puede elegir entre dos lecturas: "), ...a, F("; o "), ...b, F(".")],
  nothing_carries: () => [F("Nada en este registro lleva lo que la pregunta pide: ni sus figuras, ni el tipo de respuesta, ni la relación ni sus palabras aparecen en las páginas.")],
  said: ({ who, quote }) => [who, F(": "), ...qmid(quote), F(".")],
  said_that: () => null,
  collapses: ({ pairs }) => [n(pairs, "m"), F(` ${pick(pairs, "par", "pares")} de páginas que parecen distintas comparten su redacción o se citan entre sí, y cada par cuenta una sola vez.`)],
  agree: ({ k, quote }) => [n(k, "f"), F(" páginas independientes recogen la misma afirmación; una de ellas, con estas palabras: "), ...qmid(quote), F(".")],
  agree_none: () => [F("Ninguna afirmación se repite, en los mismos términos, en dos páginas independientes.")],
  differ: ({ subject, pageA, quoteA, pageB, quoteB }) => [F("Sobre "), ...subject, F(", las páginas se complementan en lugar de contradecirse: "), ...pageA, F(" dice "), ...qmid(quoteA), F(", y "), ...pageB, F(" dice "), ...qmid(quoteB), F(".")],
  undated_claims: () => [F("Ninguna afirmación lleva fecha propia, así que las fechas de aquí son las de publicación de las páginas, no las de cuándo valían las afirmaciones.")],
  periods: ({ items, undated }) => [F("Las páginas se reparten en "), n(items.length), F(` ${pick(items.length, "periodo", "periodos")}: `), ...list(items.map((it) => [month(it.month), F(" ("), n(it.pages, "f"), F(` ${pick(it.pages, "página", "páginas")})`)])), ...(undated ? [F(", y el resto sin fecha")] : []), F(".")],
  fixity: ({ held, reencoded, changed, unreached }) => [F("En una segunda descarga de cada página, los bytes citados seguían donde estaban en "), n(held, "f"), F(` ${pick(held, "página", "páginas")}`), ...(reencoded ? [F(" ("), n(reencoded, "f"), F(` ${pick(reencoded, "página cambió su marcado", "páginas cambiaron su marcado")} pero no su texto)`)] : []), ...(changed ? [F(", y "), n(changed, "f"), F(` ${pick(changed, "página cambió", "páginas cambiaron")}`)] : []), ...(unreached ? [F(", y "), n(unreached, "f"), F(" no se pudieron alcanzar")] : []), F(".")],
  own_voice: ({ pages, own }) => (own === pages ? [F("Todas las páginas hablan sobre todo con su propia voz.")] : own === 0 ? [F("Ninguna página habla sobre todo con su propia voz.")] : [F("De "), n(pages, "f"), F(" páginas, "), n(own, "f"), F(` ${pick(own, "habla", "hablan")} sobre todo con su propia voz.`)]),
  floors: ({ items }) => [F("Las páginas que citan a personas dan la palabra a voces distintas: "), ...items.flatMap((it, i) => [...(i === 0 ? [] : i === items.length - 1 ? [F("; y ")] : [F("; ")]), ...it.page, F(" cita a "), ...list(it.figs)]), F(".")],
  silences: ({ page, figs }) => [F("También hay silencios: "), ...page, F(" nunca nombra a "), ...list(figs), F(`, ${pick(Math.min(3, figs.length), "a quien", "a quienes")} nombran al menos otras dos páginas.`)],
  camps: ({ items }) => [F("Las páginas se dividen en "), n(items.length), F(` ${pick(items.length, "bloque", "bloques")} según lo que ponen en el centro: `), ...items.flatMap((it, i) => [...(i === 0 ? [] : i === items.length - 1 ? [F("; y ")] : [F("; ")]), ...list(it.figs), F(" para "), ...list(it.pages)]), F(".")],
  camps_none: () => [F("Las páginas no se dividen en bloques que el registro pueda detectar.")],
  contested: ({ k }) => (k ? [F("Hay "), n(k, "f"), F(` ${pick(k, "afirmación que aparece", "afirmaciones que aparecen")} con polaridad opuesta en páginas independientes.`)] : [F("Ninguna afirmación se contradice entre páginas independientes.")]),
};

export const COMPLEMENTISER = /^que\s+/i;
export function lawsOf(s) {
  const v = [];
  if (/^\s*[«“"(¿¡]?\d/.test(s.text)) v.push({ law: "PL3", detail: s.text.slice(0, 12) });
  const numeralMode = s.segs.some((x) => x.count >= 10);
  for (const x of s.segs.filter((y) => (y.kind === "frame" || y.kind === "value") && !y.cldr && !y.count)) {
    if (!numeralMode) for (const m of x.t.matchAll(/(?<![\d.,])\b([0-9])\b(?![\d.,%])/g)) v.push({ law: "PL4", detail: `“${m[0]}” en “${x.t.trim()}”` });
  }
  return v;
}
export const CAUSAL = /\b(porque|por lo tanto|por eso|por consiguiente|debido a|a causa de|caus[óa]|provoc[óa])\b/i;
export const MACHINERY = /\b(átomos?|referentes?|pinax|facetas?|terrenos?|holones?|sha256|EOT|GFP|nulos?)\b/i;
export const FRAME_WORDS = Object.fromEntries(Object.entries(CONSTRUCTIONS).map(([k, fn]) => [k, new Set([...wordsOf(fn)])]));

export const TITLES = Object.freeze({ Void: "Lo que falta", Entity: "A quién se nombra", Kind: "Qué se nombra junto", Field: "Qué se leyó", Link: "Quién dice qué", Network: "Qué se sostiene entre páginas", Atmosphere: "Cuándo, y si se mantuvo", Lens: "Dónde se sitúa cada página", Paradigm: "Cómo se dividen las páginas" });

export default Object.freeze({ titles: TITLES, lang: LANG, giver: GIVER, quotes: QUOTES, constructions: CONSTRUCTIONS, list, finish, lawsOf, causal: CAUSAL, machinery: MACHINERY, maxFrameWords: 40, frameWords: FRAME_WORDS, complementiser: COMPLEMENTISER });
