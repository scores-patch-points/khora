// opencode-gather-senses.mjs — what a topic word means, before anything is read.
// A web search answers the commonest use of a word on the web: "jaguar" returns dealerships, "mercury" a bank. The pages agree with each
// other, so no comparison among them can tell they are the wrong sense. Wikipedia's own structure says what the word's primary use is (a page
// of that name that is not a disambiguation page) or that there is none (a disambiguation page, whose links carry one-line descriptions).
// Two requests at most, cached on disk. This is the "wiki lookups on demand" rule: made only for a short topic of an account, never in bulk.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API = "https://en.wikipedia.org/w/api.php";
const UA = "foldcode-gather/1 (https://github.com/scores-patch-points; sense lookup, one request per topic)";
const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
export const LIMITS = { words: 3, senses: 12, ttlMs: 30 * 24 * 3600 * 1000 };

const get = async (params, fetchImpl, timeoutMs) => {
  const r = await fetchImpl(`${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`wikipedia ${r.status}`);
  return r.json();
};

/** { kind: "primary" | "disambiguation" | "none", title, description, senses: [{ title, description }] } */
export async function sensesOf(topic, { fetchImpl = globalThis.fetch, dir = null, timeoutMs = 5000, now = Date.now } = {}) {
  const q = clean(topic);
  if (!q || q.split(" ").length > LIMITS.words) return { kind: "none", senses: [] };
  const file = dir ? path.join(dir, `s-${crypto.createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 24)}.json`) : null;
  if (file) { try { const c = JSON.parse(fs.readFileSync(file, "utf8")); if (now() - c.at < LIMITS.ttlMs) return c.value; } catch { /* no cache */ } }
  let value = { kind: "none", senses: [] };
  try {
    const a = await get({ action: "query", redirects: "1", titles: q, prop: "pageprops|description", ppprop: "disambiguation" }, fetchImpl, timeoutMs);
    const page = a.query?.pages?.[0];
    if (page && !page.missing) {
      if (page.pageprops && "disambiguation" in page.pageprops) {
        const l = await get({ action: "query", generator: "links", titles: page.title, gpllimit: "60", gplnamespace: "0", prop: "description" }, fetchImpl, timeoutMs);
        const senses = (l.query?.pages ?? []).filter((p) => clean(p.description) && !/disambiguation|topics referred/i.test(`${p.title} ${p.description}`)).slice(0, LIMITS.senses).map((p) => ({ title: p.title, description: clean(p.description) }));
        value = { kind: "disambiguation", title: page.title, senses };
      } else value = { kind: "primary", title: page.title, description: clean(page.description), senses: [] };
    }
  } catch { return { kind: "none", senses: [], failed: true }; }
  if (file) { try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ at: now(), value })); } catch { /* cache is optional */ } }
  return value;
}

/** Queries that bring the primary sense's pages into the corpus: its title and its own one-line description. */
export const anchorQueries = (sense) => (sense?.kind === "primary" && sense.description ? [`${sense.title} ${sense.description}`.slice(0, 120)] : []);

/** The page of the corpus that IS the sense (its Wikipedia article), if it was read. */
export const anchorPage = (kept, title) => {
  if (!title) return null;
  const want = clean(title).replace(/ /g, "_").toLowerCase();
  return kept.find((s) => { try { const u = new URL(s.url); return /wikipedia\.org$/.test(u.hostname) && decodeURIComponent(u.pathname.replace(/^\/wiki\//, "")).toLowerCase() === want; } catch { return false; } }) ?? null;
};

export const sensePrompt = (ask, senses) =>
  [`Request: ${ask}`, "The topic word has several meanings. Each is a card: [number] title | one-line description.", ...senses.map((s, i) => `[${i + 1}] ${s.title} | ${s.description}`),
    'Which meaning does the request intend? Answer with one line, "SENSE: " and its number, or "SENSE: none" if the request does not say.'].join("\n");

/** The number on the reply's SENSE line, as an index into `senses`; null for no answer or "none". */
export const parseSense = (reply, count) => {
  const m = /(?:^|\n)\s*SENSE\s*:\s*([^\n]*)/i.exec(String(reply ?? ""));
  if (!m || /\bnone\b/i.test(m[1])) return null;
  const n = +(/\d+/.exec(m[1])?.[0] ?? 0);
  return n >= 1 && n <= count ? n - 1 : null;
};

const ASK_STOP = new Set(["write", "about", "essay", "tell", "explain", "article", "report", "paper", "describe", "please", "the", "and", "its"]);
const askWords = (t) => (String(t).toLowerCase().match(/\p{L}{3,}/gu) ?? []).filter((w) => !ASK_STOP.has(w));

/** The sense the ask's own words point at: the one listed sense sharing the most words with the ask (its topic word removed), and strictly more
 *  than any other. No shared word, or a tie, is no choice: an ask that does not say which meaning it wants is not guessed at. Measured
 *  2026-10-20 on 7 asks against a 2B local model and the frontier: 6 right, none confidently wrong, no tokens. */
export const pickByOverlap = (ask, topic, senses) => {
  const own = new Set(askWords(topic));
  const aw = new Set(askWords(ask).filter((w) => !own.has(w) && !own.has(w.replace(/s$/, ""))));
  const scored = senses.map((x, i) => ({ i, n: askWords(`${x.title} ${x.description}`).filter((w) => aw.has(w)).length })).sort((a, b) => b.n - a.n);
  return scored[0]?.n > 0 && scored[0].n > (scored[1]?.n ?? 0) ? scored[0].i : null;
};
