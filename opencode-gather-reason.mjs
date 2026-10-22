// opencode-gather-reason.mjs — REASONING OVER THE EOT for a gather: what the pages say about a measured thing, decided by the engine.
//
// The pages are ingested into the task's EOT log as witnessed sources (sha256-anchored, one `read` event per statement with its span).
// The figures those statements give are read mechanically and normalised to a base unit. Whether two pages agree about a name's value
// is NOT decided here: each comparison is handed to Janus (cli/reason.mjs, equations by mathjs) as `abs(stated*factor - reference) <=
// precision`, and Janus's verdict is written back to the log as a `reason` event whose parent is the read it rests on. The ranked
// answer is then PROJECTED FROM THE LOG (projectRanked), not from this process's memory, so what the person is told is exactly what the
// log can re-derive. A model may nominate (a plan: the measure, the order, extra queries) but a nomination is stored `asserted` and can
// only choose what to look at; it cannot read, verify or rank (the log's own firewall refuses that).
import crypto from "node:crypto";
import { reasonEquations } from "./opencode-janus.mjs";
import * as EOT from "./opencode-eot.mjs";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// Physical units are a closed vocabulary, not a word list of the language: each unit and its factor to the class's base unit.
export const CLASSES = Object.freeze({
  length: { base: "m", units: { m: 1, meter: 1, meters: 1, metre: 1, metres: 1, km: 1000, kilometer: 1000, kilometers: 1000, kilometre: 1000, kilometres: 1000, ft: 0.3048, feet: 0.3048, foot: 0.3048, mi: 1609.344, mile: 1609.344, miles: 1609.344, yd: 0.9144, yard: 0.9144, yards: 0.9144 } },
  mass: { base: "kg", units: { kg: 1, kilogram: 1, kilograms: 1, g: 0.001, gram: 0.001, grams: 0.001, lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, pounds: 0.45359237, tonne: 1000, tonnes: 1000 } },
});

const unitOf = (fig) => {
  const token = String(fig?.unit ?? "").toLowerCase().replace(/[^a-z]/g, "");
  for (const [cls, c] of Object.entries(CLASSES)) if (token in c.units) return { cls, token, factor: c.units[token] };
  return null;
};

/** The half-width of what a stated figure claims to know. "6,961" is ±0.5; "22,000" (three trailing zeros) is ±500; "about 22,000" is at
 *  least 0.5 % of its value. A lower or upper bound ("over 22,000", "up to") is not a value and is returned as `vague`. */
export const precisionOf = (raw, value, before = "") => {
  const num = /(\d[\d,]*)(?:\.(\d+))?/.exec(String(raw));
  const decimals = num?.[2]?.length ?? 0;
  const int = (num?.[1] ?? "").replace(/,/g, "");
  const zeros = decimals === 0 ? (/0+$/.exec(int)?.[0].length ?? 0) : 0;
  let p = 0.5 * 10 ** (zeros - decimals);
  const tail = clean(before).slice(-22).toLowerCase();
  if (/(?:over|more than|above|at least|exceeds?|exceeding|under|less than|up to|below|beyond)$/.test(tail)) return { vague: true, p };
  if (/(?:about|approximately|around|roughly|circa|c\.|~|nearly|almost)$/.test(tail)) p = Math.max(p, 0.005 * Math.abs(value));
  return { vague: false, p };
};

/** A figure belongs to one name. A name with only punctuation between it and the figure owns it ("Monte Pissis (6793 m)", "Pissis: 6,793 m",
 *  "Pissis | 6,793 m"); otherwise the sentence's subject owns its FIRST figure ("Aconcagua is the highest mountain ..., at 6,961 m"); else the
 *  name standing right before the figure. Structure of the sentence only, no word of the language. */
export const ownerOf = (st, fig, idx = 0, { strong = null, keyOf = (n) => n.toLowerCase() } = {}) => {
  const names = st.nameSpans ?? [];
  const between = (n) => st.text.slice(n.e, fig.s);
  // a parenthesised figure belongs to the name it stands beside, even across a possessive and a head noun ("Māui’s dolphins ( 1.7 m )"), and
  // not to the sentence's subject
  if (/\(\s*$/.test(st.text.slice(Math.max(0, fig.s - 4), fig.s))) {
    const beside = names.filter((n) => fig.s - n.e >= 0 && fig.s - n.e <= 30).sort((x, y) => y.e - x.e)[0];
    if (beside) return beside.name;
  }
  const tight = names.filter((n) => fig.s - n.e >= 0 && /^[\s(\[:–—\-|,]{0,3}$/.test(between(n))).sort((x, y) => y.e - x.e)[0];
  if (tight) return tight.name;
  const subject = names.find((n) => n.s <= 3);
  if (subject && idx === 0) return subject.name;
  // no punctuation rule applies: of the names before the figure, the one that owns figures firmly elsewhere in this corpus (by the rules
  // above) is the owner; "Argentina" in "...is Aconcagua in Argentina, at 6,961 m" owns almost nothing, Aconcagua owns many
  if (strong) {
    const cands = names.filter((n) => fig.s - n.e >= 0 && fig.s - n.e <= 60);
    const best = cands.map((n) => ({ n, w: strong.get(keyOf(n.name)) ?? 0 })).filter((x) => x.w >= 2).sort((x, y) => y.w - x.w || y.n.e - x.n.e)[0];
    if (best) return best.n.name;
  }
  const near = names.filter((n) => fig.s - n.e >= 0 && fig.s - n.e <= 14).sort((x, y) => y.e - x.e)[0];
  return near?.name ?? null;
};

/** Every measured figure the statements give a name, in a unit class, with its precision. */
export const itemsOf = (sts, { bears = () => true, admit = null, keyOf = (n) => n.toLowerCase(), nameOf = (n) => n } = {}) => {
  const ok = admit ?? ((st) => bears(st.text));
  // pass 1: who owns figures by structure alone (punctuation, sentence subject): the strength of a name as an owner
  const strong = new Map();
  for (const st of sts) for (const [idx, fig] of (st.figs ?? []).entries()) {
    if (!unitOf(fig)) continue;
    const names = st.nameSpans ?? [];
    const tight = names.filter((n) => fig.s - n.e >= 0 && /^[\s(\[:–—\-|,]{0,3}$/.test(st.text.slice(n.e, fig.s))).sort((x, y) => y.e - x.e)[0];
    const owner = tight?.name ?? (idx === 0 ? names.find((n) => n.s <= 3)?.name : null);
    if (owner) strong.set(keyOf(owner), (strong.get(keyOf(owner)) ?? 0) + 1);
  }
  const out = [];
  for (const st of sts) {
    if (!(st.figs?.length) || st.text.length > 300) continue;
    for (const [idx, fig] of st.figs.entries()) {
      const u = unitOf(fig);
      const owner = u && ownerOf(st, fig, idx, { strong, keyOf });
      const name = owner && nameOf(owner);
      if (!u || !name || !Number.isFinite(+fig.value) || !(+fig.value > 0) || !ok(st, keyOf(name))) continue;
      const prec = precisionOf(fig.raw, +fig.value, st.text.slice(Math.max(0, fig.s - 24), fig.s));
      out.push({ name, key: keyOf(name), cls: u.cls, unit: u.token, factor: u.factor, raw: clean(fig.raw), value: +fig.value, base: +fig.value * u.factor, tol: prec.p * u.factor, vague: prec.vague, n: st.n, doc: st.doc, sid: st.id, line: clean(st.text), s: st.s, e: st.e });
    }
  }
  return mergeSuffixes(out);
};

/** A name as the page wrote it can carry the word that opened its sentence ("No. Aconcagua", "While Mount Kilimanjaro"). A leading word that
 *  is common in ordinary English (the background prior) is not part of the name; the asker's own words are never stripped. */
export const cleanName = (name, isCommon = () => false) => {
  const toks = clean(name).split(" ");
  while (toks.length > 1 && isCommon(toks[0].replace(/[^\p{L}'’-]/gu, ""))) toks.shift();
  return toks.join(" ");
};

/** A name that ends with another full name ("Mount Aconcagua" / "Aconcagua") is that name: the shorter, more-said form wins. */
export const mergeSuffixes = (items) => {
  const keys = new Set(items.map((i) => i.key));
  const target = (key) => { const toks = key.split(" "); for (let k = 1; k < toks.length; k++) { const suf = toks.slice(k).join(" "); if (keys.has(suf)) return suf; } return key; };
  const shown = new Map(items.map((i) => [i.key, i.name]));
  return items.map((i) => { const t = target(i.key); return t === i.key ? i : { ...i, key: t, name: shown.get(t) ?? i.name }; });
};

/** Figures of one class on one scale: an item more than a factor of ~3 (or 3 robust deviations of the log) from the median of the class
 *  is a different quantity (a distance among heights), not a disagreement. Statistics over the figures, no word of the language. */
export const onScale = (items) => {
  if (items.length < 4) return { kept: items, off: [] };
  const L = items.map((i) => Math.log10(i.base));
  const med = (a) => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const m = med(L), mad = med(L.map((x) => Math.abs(x - m)));
  const lim = Math.max(0.5, 3 * 1.4826 * mad);
  const kept = [], off = [];
  items.forEach((i, k) => (Math.abs(L[k] - m) <= lim ? kept : off).push(i));
  return { kept, off };
};

/** A disagreement within this share of the value is a dispute about that value. */
export const DISPUTE = 0.01;

const num = (x) => Number(x).toPrecision(12).replace(/\.?0+$/, "").replace(/e\+?/, "e");

/** The reference value for a name: the figure the most pages' figures fall within each other's precision of; ties by the tighter precision. */
const referenceOf = (items) => {
  const usable = items.filter((i) => !i.vague);
  let best = null;
  for (const c of usable) {
    const pages = new Set(usable.filter((i) => Math.abs(i.base - c.base) <= i.tol + c.tol).map((i) => i.n));
    const score = [pages.size, -c.tol, -c.n];
    if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && (score[1] > best.score[1] || (score[1] === best.score[1] && score[2] > best.score[2])))) best = { c, score };
  }
  return best?.c ?? null;
};

/** fieldsFor(items, { measure, order, janus }) -> the fields, ranked: for each name its reference figure and which pages Janus says agree
 *  with it within the precision they state, which dispute it, and which only bound it. `janus` runs the equations (default: the real one). */
export async function reasonFields(items, { measure = null, order = "desc", janus = reasonEquations, top = 12 } = {}) {
  // the unit class the question is about: the nominated one, else the class the most pages give figures in
  const tally = new Map();
  for (const i of items) (tally.get(i.cls) ?? tally.set(i.cls, new Set()).get(i.cls)).add(i.n);
  const cls = measure && CLASSES[measure] ? measure : [...tally.entries()].sort((a, b) => b[1].size - a[1].size)[0]?.[0];
  if (!cls) return { cls: null, fields: [], equations: [], verdicts: new Map() };
  const { kept: scaled, off } = onScale(items.filter((x) => x.cls === cls));
  const byName = new Map();
  for (const i of scaled) (byName.get(i.key) ?? byName.set(i.key, []).get(i.key)).push(i);
  const plan = [];
  let k = 0;
  for (const [, list] of byName) {
    const ref = referenceOf(list);
    if (!ref) continue;
    const rest = list.filter((i) => i !== ref && !i.vague);
    const eqs = [ref, ...rest].map((i) => ({ i, ref: `fld${k++}`, statement: `abs(${num(i.value)}*${num(i.factor)} - ${num(ref.base)}) <= ${num(i.tol + ref.tol)}` }));
    plan.push({ name: ref.name, key: ref.key, ref, list, eqs });
  }
  const verdicts = await janus(plan.flatMap((p) => p.eqs.map((e) => ({ ref: e.ref, statement: e.statement }))));
  const fields = plan.map((p) => {
    const agree = [], dispute = [], elsewhere = [], unchecked = [];
    for (const e of p.eqs) {
      const v = verdicts.get(e.ref);
      const item = { ...e.i, equation: e.statement, finding: v?.finding ?? null };
      // Janus says the figures differ; a difference within a few percent is a dispute about the same value (a survey, a rounding), a larger one is
      // another quantity or another owner, and is counted but not argued with
      if (!v) unchecked.push(item);
      else if (v.holds) agree.push(item);
      else (Math.abs(e.i.base - p.ref.base) <= DISPUTE * p.ref.base ? dispute : elsewhere).push(item);
    }
    return { name: p.name, key: p.key, cls, base: CLASSES[cls].base, ref: p.ref, agree, dispute, elsewhere, unchecked, vague: p.list.filter((i) => i.vague), equations: p.eqs.map((e) => ({ ref: e.ref, statement: e.statement })) };
  }).filter((f) => f.dispute.length + f.elsewhere.length <= f.agree.length) // a name whose pages mostly disagree with its own reference is not one measurable thing
    .sort((a, b) => (order === "asc" ? a.ref.base - b.ref.base : b.ref.base - a.ref.base) || a.name.localeCompare(b.name)).slice(0, top);
  return { cls, fields, offScale: off.length, equations: plan.flatMap((p) => p.eqs.map((e) => ({ ref: e.ref, statement: e.statement }))), verdicts };
}

// ── the EOT log: ingest, and project the ranking back out of it ─────────────────────────────────────────────────────

export const taskOf = (question) => `gather-${sha(clean(question).toLowerCase()).slice(0, 12)}`;
const AGENT = "gather";

/** Write what was read and what Janus decided into the task's EOT log. Pages are `tool` sources anchored by sha256 (witnessed); each
 *  measured statement is a `read` event with its span; each equation's verdict is a `reason` event whose parent is the read it rests on. */
export function ingestEot({ task, kept, fields, now = Date.now(), universe }) {
  const eventOf = new Map(); // statement id -> read event id
  const log = { reads: 0, reasons: 0, refused: [] };
  const read = (i) => {
    // one read per figure, not per statement: a statement can give several figures to different names
    const key = `${i.sid}|${i.name}|${i.raw}`;
    if (eventOf.has(key)) return eventOf.get(key);
    const page = kept.find((k) => k.n === i.n);
    const r = EOT.append({ task, agent: AGENT, stage: "read", source: { kind: "tool", locator: page?.url ?? `page:${i.n}`, meta: { sha256: page?.sha256 ?? sha(page?.text ?? ""), bytes: page?.chars ?? null, via: "gather", title: page?.title ?? null } }, unit: i.sid, range: { start: i.s, end: i.e }, detail: { text: i.line.slice(0, 400), name: i.name, raw: i.raw, unit: i.unit, base: i.base, tol: i.tol, n: i.n }, now, universe });
    if (r.ok) { log.reads++; eventOf.set(key, r.event_id); } else log.refused.push(r.gap);
    return r.ok ? r.event_id : null;
  };
  for (const f of fields) {
    const refEvent = read(f.ref);
    const items = [...f.agree.map((i) => ({ i, holds: true })), ...f.dispute.map((i) => ({ i, holds: false }))];
    for (const { i, holds } of items) {
      read(i);
      const r = EOT.append({ task, agent: AGENT, stage: "reason", source: { kind: "tool", locator: `janus:${sha(i.equation).slice(0, 16)}`, meta: { sha256: sha(i.equation), exit: holds ? 0 : 1, judge: "janus" } }, parent: refEvent, unit: `${f.key}:${i.sid}`, detail: { kind: "field-agreement", name: f.name, key: f.key, cls: f.cls, base: f.base, statement: i.equation, holds, finding: i.finding, ref: { event: refEvent, sid: f.ref.sid, base: f.ref.base, n: f.ref.n }, item: { event: eventOf.get(i.sid) ?? null, sid: i.sid, base: i.base, n: i.n, raw: i.raw, unit: i.unit } }, now, universe });
      if (r.ok) log.reasons++; else log.refused.push(r.gap);
    }
  }
  return log;
}

/** The ranked fields, projected from the task's log alone: the verdicts are the log's `reason` events, the lines are its `read` events. */
export function projectRanked(task, { order = "desc" } = {}) {
  const { events, sources } = EOT.read(task);
  const byId = new Map(events.map((e) => [e.event_id, e]));
  const fields = new Map();
  for (const e of events) {
    if (e.stage !== "reason" || e.detail?.kind !== "field-agreement") continue;
    const d = e.detail;
    const f = fields.get(d.key) ?? fields.set(d.key, { name: d.name, key: d.key, cls: d.cls, base: d.base, refEvent: d.ref.event, refBase: d.ref.base, agree: [], dispute: [] }).get(d.key);
    const rd = byId.get(d.item.event);
    const page = sources.get(rd?.source_id);
    (d.holds ? f.agree : f.dispute).push({ n: d.item.n, sid: d.item.sid, raw: d.item.raw, unit: d.item.unit, base: d.item.base, line: rd?.detail?.text ?? null, url: page?.locator ?? null, title: page?.meta?.title ?? null, standing: e.standing, finding: d.finding });
  }
  return [...fields.values()].map((f) => {
    const rd = byId.get(f.refEvent);
    const page = sources.get(rd?.source_id);
    return { ...f, ref: { n: rd?.detail?.n, raw: rd?.detail?.raw, unit: rd?.detail?.unit, base: f.refBase, line: rd?.detail?.text ?? null, url: page?.locator ?? null, title: page?.meta?.title ?? null, standing: rd?.standing } };
  }).sort((a, b) => (order === "asc" ? a.refBase - b.refBase : b.refBase - a.refBase) || a.name.localeCompare(b.name));
}

// ── the nominator: a model may propose what to look at, and nothing else ──────────────────────────────────────────────

/** A nominated plan is data, never instruction: only these keys, only these values, each capped. Anything else is dropped and said. */
export const validatePlan = (plan) => {
  const out = {};
  if (typeof plan?.question === "string" && clean(plan.question).length >= 3) out.question = clean(plan.question).slice(0, 300);
  if (typeof plan?.measure === "string" && plan.measure in CLASSES) out.measure = plan.measure;
  if (plan?.order === "asc" || plan?.order === "desc") out.order = plan.order;
  if (Array.isArray(plan?.queries)) { const q = plan.queries.filter((x) => typeof x === "string").map((x) => clean(x).slice(0, 200)).filter(Boolean).slice(0, 4); if (q.length) out.queries = q; }
  const dropped = Object.keys(plan && typeof plan === "object" ? plan : {}).filter((k) => !(k in out));
  return { plan: out, dropped };
};

/** The nomination as the log keeps it: a model-origin `claim`, so it is `asserted`: a holder's standpoint, never a fact. */
export const recordPlan = ({ task, plan, dropped = [], now = Date.now() }) =>
  EOT.append({ task, agent: "nominator", stage: "claim", source: { kind: "model", locator: JSON.stringify(plan) }, detail: { kind: "plan", dropped }, now });
