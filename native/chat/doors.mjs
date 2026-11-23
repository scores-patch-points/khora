// native/chat/doors.mjs — DOORS: the declared ways the chat reaches outside the thread, each one named, listed, callable by hand
// (a slash command) and callable by the chat itself.
//
// WHAT TRIGGERS RESEARCH IS NOT KNOWING (the owner, 2026-11-23: "a signal for doing research IS not knowing an answer"). A question
// the thread cannot answer ends in a typed gap, and a gap has a SHAPE (no_spouse_fact, unknown_referent, no_answer …). A door
// declares the shapes it can fill (`fills`); the chat matches the gap's shape to the doors that fill it and goes to look, without being
// asked. "go research it" is only the owner saying out loud what the chat is already built to do. Matching is by shape, never by a
// keyword of the question (HOW-WE-ITERATE rule 10).
//
// A door is read-only (it never changes anything outside this process), says what it needs (nothing, the network, janus), says whether
// it is on and, if not, why, and answers with the SOURCE of what it brought back, so the reply can cite it. What a door returns
// enters the thread as a GIVEN sentence (door "given": said by the giver, not by the user) or as a candidate that janus lints.
import { weaveOne } from "./record.mjs";
import { kinRuleOf } from "./janus-lint.mjs";

const UA = "khora-chat/0.1 (read-only research doors)";
const CACHE = new Map(), TTL = 10 * 60e3, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** a GET of JSON: cached for ten minutes (the same question twice asks the giver once), and a 429 or a 5xx is waited out twice, by the service's own Retry-After when it gives one */
export async function fetchJson(url, ms = 8000, { retries = 2 } = {}) {
  const hit = CACHE.get(url); if (hit && Date.now() - hit.at < TTL) return hit.json;
  for (let i = 0; ; i++) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: ac.signal });
      if (r.status === 429 || r.status >= 500) {
        if (i < retries) { const ra = Number(r.headers.get("retry-after")); await sleep(Math.min(ra > 0 ? ra * 1000 : 700 * 2 ** i, 4000)); continue; }
        const e = new Error(`HTTP ${r.status}`); e.rate = r.status === 429; throw e;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json(); CACHE.set(url, { at: Date.now(), json }); return json;
    } finally { clearTimeout(t); }
  }
}

// The giver's own vocabulary, declared as data with where it comes from (Wikidata property and item pages): which property carries a
// kin relation, and which item is which sex. Not a list of English words: a table of the giver's ids.
export const WIKIDATA = Object.freeze({
  api: "https://www.wikidata.org/w/api.php", page: "https://www.wikidata.org/wiki/",
  sex: Object.freeze({ Q6581072: "female", Q6581097: "male" }), sexProperty: "P21",
  property: Object.freeze({ spouse_of: Object.freeze({ any: ["P26"] }), sibling_of: Object.freeze({ any: ["P3373"] }), parent: Object.freeze({ female: ["P25"], male: ["P22"], any: ["P22", "P25"] }), child: Object.freeze({ any: ["P40"] }) }),
});
const propertiesFor = (rule) => rule.rel === "parent_of" ? (rule.end === "a" ? (WIKIDATA.property.parent[rule.sex ?? "any"] ?? WIKIDATA.property.parent.any) : WIKIDATA.property.child.any) : (WIKIDATA.property[rule.rel]?.any ?? []);
const claimIds = (claims, p) => (claims?.[p] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);

const q = (o) => new URLSearchParams(o).toString();

/** makeDoors({ know, janus, now, getJson, calculate, rowsOf, sentences }) -> { list, get, fillers, call } */
export function makeDoors({ know = null, janus = null, now = () => new Date(), getJson = fetchJson, calculate, rowsOf, sentences, threadId = "thread", log = null } = {}) {
  const net = (why) => (know ? { on: true } : { on: false, why: why ?? "the givers are not available in this process" });
  const defs = [
    { name: "clock", about: "the date and the time now", usage: "/clock [day | time | date]", example: "What day is it?", fills: ["time_of_now"], needs: "none", status: () => ({ on: true }),
      async run({ args }) { const d = now(), w = String(args ?? "").trim().toLowerCase();
        const text = w === "day" ? `Today is ${d.toLocaleDateString("en-US", { weekday: "long" })}.` : w === "time" ? `It is ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.` : `The date is ${d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}, and it is ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`;
        return { ok: true, text, cites: [{ label: "the clock" }] }; } },
    { name: "calc", about: "arithmetic, read by the reader (no eval)", usage: "/calc 15 % of 80", example: "What is 15% of 80?", fills: ["value_of_expression"], needs: "none", status: () => ({ on: !!calculate }),
      async run({ args }) { const c = calculate(rowsOf(String(args ?? ""))); if (!c) return { ok: false, gap: "not_arithmetic", text: "That isn't arithmetic I can read." }; if (c.error) return { ok: false, gap: "arithmetic_error", text: `That's a ${c.error}, so there is no answer.` };
        return { ok: true, text: `${c.value.toLocaleString("en-US", { maximumFractionDigits: 9 })}.`, cites: [{ label: "arithmetic" }] }; } },
    { name: "define", about: "what a word means (the dictionary and the hyperlexicon)", usage: "/define <word>", example: "What does “dog” mean?", working: (a) => `Looking up “${a}” in the dictionary…`, fills: ["definition_of_word"], needs: "givers", status: () => net(),
      async run({ args }) { const w = String(args ?? "").trim().toLowerCase(); if (!w) return { ok: false, gap: "needs_argument", text: "Define which word?" };
        const d = await know.lookup(w); if (!d?.primary) return { ok: false, gap: "no_definition", text: `No giver I can reach defines “${w}”.` };
        return { ok: true, text: `${w[0].toUpperCase()}${w.slice(1)}: ${d.primary.trim().endsWith(".") ? d.primary.trim().slice(0, -1) : d.primary.trim()}.`, cites: [{ label: "the dictionary (kaikki)" }] }; } },
    { name: "person", about: "who a well-known person is (Wikidata), and make them someone the thread can point to", usage: "/person <name>", example: "Who is Leo Tolstoy?", working: (a) => `Looking up ${a} on Wikidata…`, fills: ["unknown_referent"], needs: "network", status: () => net(),
      async run({ args }, host) { const name = String(args ?? "").trim(); if (!name) return { ok: false, gap: "needs_argument", text: "Which person?" };
        const e = await know.person(name.toLowerCase()); if (!e?.description) return { ok: false, gap: "no_such_person", text: `Wikidata knows no person called “${name}”.` };
        // the first human hit is a candidate, and a rule judges it: every word of the name must be in the label (a search for "marie curie" must not return "Marie de France")
        const have = new Set(String(e.label ?? "").toLowerCase().split(" ")), want = name.toLowerCase().split(" ").filter(Boolean);
        if (!want.every((w) => have.has(w))) return { ok: false, gap: "no_such_person", text: `Wikidata has no person called exactly “${name}”; the closest it found is ${e.label} (${e.description}).`, data: { closest: e.label } };
        const line = `${e.label ?? name}: ${e.description}.`;
        host.setQid([e.label, name, ...String(e.label ?? "").split(" ")], e.id);
        return { ok: true, text: line, introduce: { text: line, source: "Wikidata" }, cites: [{ label: "Wikidata", id: e.id, url: e.id ? `${WIKIDATA.page}${e.id}` : null }], data: { id: e.id, label: e.label } }; } },
    { name: "wiki", about: "read the opening of a Wikipedia article into the thread (as Wikipedia's words), so questions can be answered from it with its sentences", usage: "/wiki <title>", example: "Tell me about Lethal Weapon", working: (a) => `Reading Wikipedia's article on ${a}…`, fills: ["unknown_referent"], needs: "network", status: () => ({ on: true }),
      async run({ args }, host) { const title = String(args ?? "").trim(); if (!title) return { ok: false, gap: "needs_argument", text: "Which article?" };
        const j = await getJson(`https://en.wikipedia.org/w/api.php?${q({ action: "query", prop: "extracts", exintro: "1", explaintext: "1", redirects: "1", titles: title, format: "json", origin: "*" })}`);
        const page = Object.values(j.query?.pages ?? {})[0], ex = page?.extract; if (!ex || page?.missing !== undefined) return { ok: false, gap: "no_article", text: `Wikipedia has no article called “${title}”.` };
        const take = sentences(ex).slice(0, 6).join(" ");
        return { ok: true, text: `I read the opening of Wikipedia's article “${page.title}” into the thread.`, introduce: { text: take, source: "Wikipedia" }, cites: [{ label: "Wikipedia", id: page.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(page.title).split(" ").join("_"))}` }] }; } },
    { name: "search", about: "search Wikipedia for what a question is about, and read the best matches into the thread", usage: "/search <words>", example: "Who did Mel Gibson play in Lethal Weapon?", working: (a) => `Searching Wikipedia for “${a}”…`, fills: ["no_answer"], needs: "network", status: () => ({ on: true }),
      async run({ args }, host) { const query = String(args ?? "").trim(); if (!query) return { ok: false, gap: "needs_argument", text: "Search for what?" };
        const j = await getJson(`https://en.wikipedia.org/w/api.php?${q({ action: "query", list: "search", srsearch: query, srlimit: "3", format: "json", origin: "*" })}`);
        const hits = (j.query?.search ?? []).map((x) => x.title).filter(Boolean); if (!hits.length) return { ok: false, gap: "no_match", text: `Wikipedia has nothing that matches “${query}”.` };
        const read = [], introduce = [];
        for (const title of hits.slice(0, 2)) {   // the best two matches are read, each as Wikipedia's words
          const page = await getJson(`https://en.wikipedia.org/w/api.php?${q({ action: "query", prop: "extracts", exintro: "1", explaintext: "1", redirects: "1", titles: title, format: "json", origin: "*" })}`);
          const p = Object.values(page.query?.pages ?? {})[0]; if (!p?.extract) continue;
          read.push({ title: p.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(p.title).split(" ").join("_"))}` }); introduce.push({ text: sentences(p.extract).slice(0, 6).join(" "), source: "Wikipedia" });
        }
        if (!read.length) return { ok: false, gap: "no_article", text: `Wikipedia matched “${query}” but gave no text to read.` };
        return { ok: true, text: `I read the opening of Wikipedia's ${read.length > 1 ? "articles" : "article"} ${read.map((x) => `“${x.title}”`).join(" and ")}.`, introduce, cites: read.map((x) => ({ label: "Wikipedia", id: x.title, url: x.url })), data: { titles: read.map((x) => x.title) } }; } },
    { name: "relation", about: "who someone's wife, husband, mother, father, child or sibling is, as Wikidata lists it (the term's rule is read from the dictionary's gloss by janus)", usage: "/relation <term> of <name>", example: "Who was Tolstoy's wife?", working: (a) => { const [t, n] = String(a).split(" of "); return `Checking who Wikidata lists as the ${t} of ${n}…`; }, fills: ["no_spouse_fact", "no_parent_fact", "no_sibling_fact"], needs: "network and janus", status: () => (janus?.on ? net() : { on: false, why: janus?.why ?? "janus is not mounted" }),
      async run({ args }, host) {
        const [term, name] = String(args ?? "").split(" of ").map((x) => x.trim()); if (!term || !name) return { ok: false, gap: "needs_argument", text: "Use it as /relation wife of <name>." };
        const rule = kinRuleOf(janus, term); if (!rule) return { ok: false, gap: "not_a_kin_term", text: `“${term}” is not a kin term janus's dictionary rules cover.` };
        let qid = host.qidOf(name);
        if (!qid) { const p = await host.call("person", name); if (!p.ok) return { ok: false, gap: "unknown_referent", text: `I don't know who ${name} is, and could not find out.`, tried: [p] }; qid = host.qidOf(name); }
        if (!qid) return { ok: false, gap: "unknown_referent", text: `No Wikidata entry for ${name}.` };
        const props = propertiesFor(rule); if (!props.length) return { ok: false, gap: "no_property", text: `Wikidata has no property I can map “${term}” to.` };
        const own = (await getJson(`${WIKIDATA.api}?${q({ action: "wbgetentities", ids: qid, props: "claims", format: "json", origin: "*" })}`)).entities?.[qid]?.claims ?? {};
        const ids = [...new Set(props.flatMap((p) => claimIds(own, p)))].slice(0, 8); if (!ids.length) return { ok: false, gap: "giver_has_none", text: `Wikidata lists no ${term} for ${name}.`, cites: [{ label: "Wikidata", id: qid, url: `${WIKIDATA.page}${qid}` }] };
        const ent = (await getJson(`${WIKIDATA.api}?${q({ action: "wbgetentities", ids: ids.join("|"), props: "labels|claims", languages: "en", format: "json", origin: "*" })}`)).entities ?? {};
        const found = ids.map((id) => ({ id, label: ent[id]?.labels?.en?.value ?? id, sex: WIKIDATA.sex[claimIds(ent[id]?.claims, WIKIDATA.sexProperty)[0]] ?? null })).filter((x) => !rule.sex || !x.sex || x.sex === rule.sex);
        if (!found.length) return { ok: false, gap: "giver_has_none", text: `Wikidata lists no ${term} for ${name}.` };
        const names = found.map((x) => x.label);
        return { ok: true, text: `${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]}.`, data: { qid, props, answers: found, term, name },
          cites: [{ label: "Wikidata", id: `${qid} ${props.join("/")}`, url: `${WIKIDATA.page}${qid}` }] }; } },
    { name: "kin", about: "janus's kinship rules over the kin facts the thread itself holds", usage: "/kin <term> of <name>", fills: [], needs: "janus", status: () => (janus?.on ? { on: true } : { on: false, why: janus?.why ?? "janus is not mounted" }),
      async run({ args }, host) { const [term, name] = String(args ?? "").split(" of ").map((x) => x.trim()); if (!term || !name) return { ok: false, gap: "needs_argument", text: "Use it as /kin wife of <name>." };
        const r = host.kin(term, name); if (r.gap) return { ok: false, gap: r.gap.kind, text: `The thread holds no fact that answers it (${r.gap.kind.split("_").join(" ")}).`, cites: [{ label: "janus kinship" }] };
        return { ok: true, text: `${r.answers.join(" and ")}.`, cites: [{ label: "janus kinship" }] }; } },
    { name: "reason", about: "logic and epistemic puzzles (who knows what, in turn)", usage: "/reason <puzzle>", fills: [], needs: "reader for puzzles", status: () => ({ on: false, why: "the reasoner exists (organs/epistemic-core.js: possible worlds and public announcements); reading a puzzle's text into it is not wired yet" }), async run() { return { ok: false, gap: "not_wired", text: "Not wired yet." }; } },
  ];
  const by = new Map(defs.map((d) => [d.name, d]));

  const list = () => defs.map((d) => ({ name: d.name, about: d.about, usage: d.usage, fills: d.fills, needs: d.needs, ...d.status() }));
  const get = (name) => by.get(String(name ?? "").toLowerCase()) ?? null;
  /** the doors that are on and declare that they fill a gap of this shape */
  const fillers = (gap) => defs.filter((d) => d.fills.includes(gap) && d.status().on).map((d) => d.name);

  let n = 0;
  /** call(name, args, host) -> { door, args, ok, text, gap?, cites, … }. Never throws; every call is recorded in the log (kind `tool`). */
  async function call(name, args, host) {
    const d = get(name); if (!d) return { door: name, args, ok: false, gap: "no_such_door", text: `There is no door called /${name}. /doors lists them.`, cites: [] };
    const st = d.status(); let out;
    if (!st.on) out = { ok: false, gap: "door_off", text: `/${d.name} is off: ${st.why}.`, cites: [] };
    else { try { out = await d.run({ args }, host); } catch (e) { out = e?.rate ? { ok: false, gap: "rate_limited", text: `The service behind /${d.name} asked me to slow down; try again in a minute.`, cites: [] } : { ok: false, gap: "door_unreachable", text: `/${d.name} could not be reached (${String(e?.message ?? e).slice(0, 80)}).`, cites: [] }; } }
    const rec = { door: d.name, args, ok: !!out.ok, ...(out.gap ? { gap: out.gap } : {}), cites: out.cites ?? [], ...out };
    if (log) { try { weaveOne(log, { cell: "INS·Figure", kind: "tool", addr: `tool:${threadId}:${++n}`, body: { thread: threadId, door: d.name, args: String(args ?? ""), ok: !!out.ok, ...(out.gap ? { gap: out.gap } : {}), cites: (out.cites ?? []).map((c) => ({ label: c.label, ...(c.id ? { id: c.id } : {}), ...(c.url ? { url: c.url } : {}) })) } }); } catch { /* the record is additive; a miss never blocks an answer */ } }
    return rec;
  }
  return { list, get, fillers, call, names: () => defs.map((d) => d.name) };
}
