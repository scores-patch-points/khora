// composer.js — the segment builders every Callimachus lens shares (telling, dossier, claim sheet). Pure.
//
//   makeComposer(record, { slice }) → { F, V, n, S, joinSegs, srcSeg, quoteSeg, nameSegs, names, pageSegs, sentenceOf, ... }
//
// A lens never holds source text it did not slice: names, speakers, verbs, quotations and page titles come back as source segments with
// their versioned addresses (prose-laws.js seg.source); counts, dates and hosts are value segments; only the lens's own declared words are
// frame segments. `slice(address)` is injected (pinax.js quoteOf over the store) and returns the verified bytes or null.
import { seg, sentence, cleanSpan, num } from "./prose-laws.js";

export const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return String(u); } };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthOf = (iso) => { const m = String(iso ?? "").match(/^(\d{4})-(\d{2})/); return m ? `${m[1]}-${m[2]}` : null; };
export const monthName = (ym) => { const [y, m] = ym.split("-"); return `${MONTHS[Number(m) - 1]} ${y}`; };
export const dayName = (iso) => { const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : iso; };

export const F = seg.frame;
export const V = seg.value;
/** A count: a value segment that remembers its number, so CMOS 9.7 can reset a whole sentence into numerals. */
export const n = (k) => ({ ...V(num(k)), count: k });
export const joinSegs = (items) => items.flatMap((it, i) => (i === 0 ? it : i === items.length - 1 ? [F(items.length > 2 ? ", and " : " and "), ...it] : [F(", "), ...it]));
const Cap = (segs) => { const [h, ...r] = segs; if (!h) return segs; return [{ ...h, t: h.kind === "source" ? h.t : h.t.charAt(0).toUpperCase() + h.t.slice(1) }, ...r]; };
// CMOS 9.7: within one sentence, if any count needs numerals (10 or more), every count is set in numerals.
const consistent = (segs) => (segs.some((x) => x.count >= 10) ? segs.map((x) => (x.count != null ? { ...x, t: Number(x.count).toLocaleString("en-US") } : x)) : segs);
export const S = (segs, grounds) => sentence(Cap(consistent(segs)), grounds);

export function makeComposer(record, { slice }) {
  const ent = Object.fromEntries(record.entities.map((e) => [e.id, e]));
  const srcSeg = async (address, extra = {}) => { const t = await slice(address); return t == null ? null : { ...seg.source(t, address), ...extra }; };
  // A quotation, cleaned by narrowing its span (citation markup, bullets, outer marks, trailing commas) — never by editing its bytes.
  const quoteSeg = async (address) => { const raw = await slice(address); if (raw == null) return null; const c = cleanSpan(address, raw); return c ? { ...seg.source(c.text, c.address), quoted: true } : null; };
  // A figure's name: the bytes of its first occurrence, addressed. Falls back to a value only when no occurrence was recorded.
  const nameSegs = async (id) => { const e = ent[id]; if (!e) return null; if (e.at) { const t = await slice(e.at); if (t) return [seg.source(t, e.at)]; } return [V(e.name)]; };
  const names = async (ids) => (await Promise.all(ids.map(nameSegs))).filter(Boolean);
  // A page: its publisher's declared name (raw-layer bytes) when two pages share a host, else its host (a value).
  const hostCount = {};
  for (const s of record.sources) hostCount[hostOf(s.url)] = (hostCount[hostOf(s.url)] ?? 0) + 1;
  const titled = (s) => s.title && !/&\w+;|&#/.test(s.title.text);
  const pageSegs = (s) => (hostCount[hostOf(s.url)] > 1 && titled(s) ? [V(`${hostOf(s.url)} (`), seg.source(s.title.text, s.title.address), V(")")] : [V(hostOf(s.url))]);
  const titleSeg = (s) => (titled(s) ? seg.source(s.title.text, s.title.address) : null);
  // The sentence a quotation sits in: the smallest Link atom on the same page whose span contains the quotation's span.
  const spanOf = (address) => { const m = String(address).match(/^(px_[0-9a-f]+)\/(\w+)@[0-9a-f]+#b(\d+)-(\d+)$/); return m ? { pinax: m[1], start: Number(m[3]), end: Number(m[4]) } : null; };
  const sentenceAround = (atom) => {
    const q = spanOf(atom.span);
    let best = null;
    for (const a of record.atoms) {
      if (a.pinax !== atom.pinax || a.why_kind === "quotation") continue;
      const s = spanOf(a.span);
      if (s && s.start <= q.start && s.end >= q.end && (!best || s.end - s.start < best.end - best.start)) best = { ...s, address: a.span };
    }
    return best?.address ?? null;
  };
  return { ent, srcSeg, quoteSeg, nameSegs, names, pageSegs, titleSeg, sentenceAround, F, V, n, S, joinSegs };
}
