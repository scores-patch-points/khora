// expression-library.js — SAYING THE SAME THING IN OTHER WORDS: formulae people use, grouped by meaning, chosen by trails and a seed.
//
// The owner, 2026-11-23: "very often I have canned responses, but canned responses aren't appreciated that much. It helps when they are analogies
// or idioms specific to a certain genre that spice things up. When I'm going to make a canned response, I tap into a library in my mind of things
// that mean the same thing but have different surfaces. Our system could do this by tapping into its priors, if we really have ingested the
// Zenodotus. And with a little bit of a seed for randomness, it could switch things up." And then: "we need to have it think stigmergically."
//
//   buildInventory(rows)                          -> data      the short phrases at least `minWriters` different people typed, per genre, with the forms they typed
//   makeLibrary(data, { embed, trails })          -> { equivalents(intent), say(intent, opts), outcome(...), genres }
//
// WHAT IS THE SYSTEM'S AND WHAT IS NOT. The caller (the chat's act layer) decides WHAT is to be said: an intent, in whatever words it has for it
// ("you're welcome"). This organ decides HOW it is worded this time. The meaning is not ours: a phrase is an equivalent of the intent when a frozen
// embedder (a codec, never generation) puts it among the intent's nearest neighbours in the inventory, cut at the largest drop in similarity inside
// the first dozen. The surfaces are not ours either: every one is a phrase real people typed in a real corpus, with how many different writers typed it
// and in which genres, so the developer's own idiom never enters (HOW-WE-ITERATE rule 7).
//
// THE WORDING IS A TRAIL, NOT A TABLE. Each equivalent is a ROUTE of the intent (kernel/stigmergy.js). The corpus is the first deposit: the more
// different people typed a phrase, the stronger it starts. After that the thread leaves its own marks: a wording the person went on from (they answered,
// laughed, asked something else) is deposited on, so it comes back more; one they did not take (they said the same thing again, or only “?”) is
// vetoed in that thread only, so it does not come back there. Marks evaporate (a day's half-life by default for a thread), so no conversation
// fossilises; and with a small probability a scout is sent: a phrase this thread has never used is tried instead of the usual one. That chance is the
// “bit of randomness”, and the seed makes it replayable: same seed and same trails, same wording.
//
// GENRE is where the corpus's phrase was typed. Ask for a genre and only phrases at least two of its writers typed are candidates, so “Singlish chat”
// and “support channel” each have their own turns of phrase. WHAT IT CANNOT DO, said now: it does not make a wry analogy; a genre's figurative idiom needs
// a corpus of that genre's longer talk and a way to find its multiword expressions. The inventory is built so such a corpus drops in as another genre.
//
// PURE except the injected embedder and the injected trail store. No fetch, no fs.
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
export const rngOf = (seed) => { let a = (typeof seed === "number" ? seed : fnv(String(seed))) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// DECLARED DIALS, each with its reason (never tuned on the thing it is reported on)
export const DIALS = Object.freeze({
  minWriters: { value: 3, why: "a phrase three different people typed is a phrase; one person's repeats are a habit" },
  maxWords: { value: 4, why: "a formula is short; longer turns carry particulars" },
  window: { value: 12, why: "the nearest dozen is where the intent's own group ends, if it ends at all" },
  prior: { value: 0.5, why: "a square root of the writer counts: the usual phrases lead, the rarer ones still appear" },
  threadWeight: { value: 2, why: "what this person went on from counts for more than what everyone did, but not for everything" },
  explore: { value: 0.1, why: "the trail kernel's own scout rate (EXPLORE_EPSILON): without scouts the colony only ever repeats what it knows" },
  threadHalfLifeDays: { value: 1, why: "a conversation's habits fade in a day; the shared prior keeps the kernel's week" },
  nullSigma: { value: 2.5, why: "a phrase counts as near the intent only above the inventory's own spread of unrelated phrases (mean plus 2.5 sd), the rule the repo's embedders use elsewhere" },
});

const isAlnum = (c) => (c >= "0" && c <= "9") || c.toLowerCase() !== c.toUpperCase();
const trimEdges = (s) => { let a = 0, b = s.length; while (a < b && !isAlnum(s[a])) a++; while (b > a && !isAlnum(s[b - 1])) b--; return s.slice(a, b); };
/** the key surfaces share when only case, edge punctuation and spacing differ; a phrase that is only symbols (an emoticon) keeps itself */
export const keyOf = (s) => { const t = String(s ?? "").trim().toLowerCase(), core = trimEdges(t); return (core || t).split(" ").filter(Boolean).join(" "); };
const EMO = [":)", ";)", ":D", ":-", ":(", ":P", "^^"];
/** the look of a message: lower-case start, a final . ! or ?, an emoticon */
export const lookOf = (s) => { const t = String(s ?? "").trim(), first = [...t].find(isAlnum), last = t.at(-1) ?? ""; return { lower: !!first && first === first.toLowerCase() && first !== first.toUpperCase(), marked: ".!?".includes(last), emo: EMO.some((e) => t.includes(e)) }; };
const particulars = (k) => [...k].some((c) => (c >= "0" && c <= "9") || "/\\<>$|@#~=*".includes(c)) || k.includes("http");   // a number, a path, a command or a link says something particular, and a “*” is a self-correction (“your welcome*”): the writer is saying the first form was wrong

/** buildInventory(rows: [{ text, genre, writer }]) -> data (plain JSON) */
export function buildInventory(rows, { minWriters = DIALS.minWriters.value, maxWords = DIALS.maxWords.value, source = null } = {}) {
  const M = new Map();
  for (const x of rows) {
    const k = keyOf(x.text); if (!k || particulars(k) || String(x.text).includes("*") || k.split(" ").length > maxWords) continue;   // a “*” on the line itself: the writer is correcting a word
    const e = M.get(k) ?? { key: k, forms: new Map(), by: new Map() }; const f = String(x.text).trim(); e.forms.set(f, (e.forms.get(f) ?? 0) + 1);
    const g = e.by.get(x.genre) ?? new Set(); g.add(x.writer); e.by.set(x.genre, g); M.set(k, e);
  }
  const phrases = [...M.values()].map((e) => ({ key: e.key, forms: [...e.forms].sort((a, b) => b[1] - a[1]).slice(0, 6), genres: Object.fromEntries([...e.by].map(([g, s]) => [g, s.size])) }))
    .map((p) => ({ ...p, writers: Object.values(p.genres).reduce((a, n) => a + n, 0) })).filter((p) => p.writers >= minWriters).sort((a, b) => b.writers - a.writers || (a.key < b.key ? -1 : 1));
  return { schema: "ExpressionInventory@1", source, minWriters, maxWords, rows: rows.length, phrases };
}

/** did the person go on from what was said? Not if they said the same thing again, or only asked “?” (no word list: the structure of the two messages) */
export function outcomeOf(previous, next) {
  const a = keyOf(previous), b = keyOf(next), bare = String(next ?? "").trim();
  if (!bare) return null;
  if (a && a === b) return false;
  if ([...bare].every((c) => c === "?" || c === " ")) return false;
  return true;
}

const norm = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Float32Array.from(v, (x) => x / n); };
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** makeLibrary(data, { embed, trails, now }) ; `embed(texts) -> vectors` is a frozen codec; `trails` is a trail store (trail-store.mjs) or null */
export function makeLibrary(data, { embed, trails = null, now = () => Date.now(), limit = 1500 } = {}) {
  if (typeof embed !== "function") throw new TypeError("makeLibrary: an embedder must be supplied (a frozen codec)");
  const P = data.phrases.slice(0, limit), byKey = new Map(P.map((p) => [p.key, p])); let V = null, tau = null;
  const vecs = async (t) => (await embed(t)).map(norm);
  const ready = async () => { if (V) return; V = await vecs(P.map((p) => p.key)); let sum = 0, sq = 0, n = 0; const step = Math.max(1, Math.floor(P.length / 150)); for (let i = 0; i < P.length; i += step) for (let j = i + step; j < P.length; j += step) { const c = dot(V[i], V[j]); sum += c; sq += c * c; n++; } const m = n ? sum / n : 0; tau = m + DIALS.nullSigma.value * Math.sqrt(Math.max(0, n ? sq / n - m * m : 0)); };
  const inGenre = (p, genre) => !genre || (p.genres[genre] ?? 0) >= 2;

  /** equivalents(intent, { genre }) -> [{ key, similarity, writers, genres }] : the phrases that say the same thing, nearest first, cut where the group ends */
  async function equivalents(intent, { genre = null } = {}) {
    await ready(); const [q] = await vecs([String(intent ?? "")]);
    const ranked = P.map((p, i) => ({ p, s: dot(q, V[i]) })).filter((x) => x.s >= tau && inGenre(x.p, genre)).sort((a, b) => b.s - a.s).slice(0, DIALS.window.value);
    // the largest fall inside the window, if there is a real one; the fall from the intent's own wording (similarity about 1) to its nearest neighbour is not the group ending
    let cut = ranked.length, drop = 0; for (let i = 1; i < ranked.length; i++) { if (ranked[i - 1].s > 0.995) continue; const d = ranked[i - 1].s - ranked[i].s; if (d > drop && d > 0.02) { drop = d; cut = i; } }
    return ranked.slice(0, cut).map((x) => ({ key: x.p.key, similarity: +x.s.toFixed(2), writers: x.p.writers, genres: x.p.genres }));
  }
  const surface = (key, look) => { let best = key, bs = -1; for (const [f, n] of byKey.get(key)?.forms ?? []) { const l = lookOf(f), s = (l.lower === look.lower ? 2 : 0) + (l.marked === look.marked ? 1 : 0) + (l.emo === look.emo ? 1 : 0) + n / 1e6; if (s > bs) { bs = s; best = f; } } return best; };
  const headOf = (intent, genre, thread) => ({ shared: `say:${keyOf(intent)}:${genre ?? "any"}`, mine: `say:${keyOf(intent)}:${genre ?? "any"}:${thread}` });
  const strengthOf = (head, routes) => { const m = new Map(); if (trails) for (const s of trails.stats(head, routes)) m.set(s.route, s); return m; };

  /** say(intent, { seed, avoid, genre, look, thread }) -> { text, key, how, pool, ... } | { gap, detail } */
  async function say(intent, { seed = 0, avoid = [], genre = null, look = null, thread = "default" } = {}) {
    const eq = await equivalents(intent, { genre });
    if (!eq.length) return { gap: "no_equivalent", detail: `nothing in the ${genre ?? "pooled"} inventory is nearer “${intent}” than unrelated phrases are to one another` };
    const heads = headOf(intent, genre, thread), routes = eq.map((x) => x.key), sh = strengthOf(heads.shared, routes), me = strengthOf(heads.mine, routes);
    // not a wording used last turn here, and not one this thread turned down (vetoed within the thread's own half-life)
    const bad = new Set(avoid.map(keyOf)); const last = trails?.markOf?.(`last:${heads.mine}`); if (last?.why) bad.add(last.why);
    const declined = (k) => !!trails?.vetoed?.(heads.mine, k, DIALS.threadHalfLifeDays.value * 86400000);
    let pool = eq.filter((x) => !declined(x.key)); if (!pool.length) pool = eq;
    const fresh = pool.filter((x) => !bad.has(x.key)); if (fresh.length) pool = fresh;
    const rand = rngOf(seed), r1 = rand(), r2 = rand();
    const w = (x) => Math.pow(x.writers, DIALS.prior.value) * (1 + (sh.get(x.key)?.strength ?? 0) + DIALS.threadWeight.value * (me.get(x.key)?.strength ?? 0));
    let how = "drawn", pick;
    const unused = pool.filter((x) => !(me.get(x.key)?.deposits > 0));   // a wording this thread has never gone on from
    if (pool.length > 1 && unused.length && r1 < DIALS.explore.value) { pick = unused[Math.floor(r2 * unused.length)]; how = "scout"; }
    else { const ws = pool.map(w), total = ws.reduce((acc, n) => acc + n, 0); let acc = 0; const order = pool.map((x, i) => ({ x, w: ws[i] })).sort((m, n) => n.w - m.w || (m.x.key < n.x.key ? -1 : 1)); pick = order.at(-1).x; for (const o of order) { acc += o.w; if (r2 * total <= acc) { pick = o.x; break; } } }
    trails?.mark?.(`last:${heads.mine}`, now() + 10 * 60000, pick.key);
    const total = pool.reduce((a, x) => a + w(x), 0);
    return { text: surface(pick.key, look ?? lookOf(intent)), key: pick.key, how, genre, seed, similarity: pick.similarity, writers: pick.writers, pool: pool.map((x) => ({ key: x.key, p: +(w(x) / total).toFixed(3) })) };
  }

  /** outcome(intent, key, ok, { genre, thread }): what the person did next. A wording they went on from is deposited on, for everyone and for this thread; one they did not take is vetoed in this thread only */
  function outcome(intent, key, ok, { genre = null, thread = "default" } = {}) {
    if (!trails || ok == null) return;
    const h = headOf(intent, genre, thread);
    if (ok) { trails.deposit(h.shared, key, true, 0); trails.deposit(h.mine, key, true, 0); }
    else { trails.deposit(h.mine, key, false, 0); trails.veto(h.mine, key, "the person said it again or asked what it meant"); }
  }
  return { equivalents, say, outcome, genres: [...new Set(P.flatMap((p) => Object.keys(p.genres)))] };
}
