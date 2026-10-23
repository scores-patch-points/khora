// opencode-gather-gate.mjs — the salience gate on what is read: cards first, full pages only for what the cards leave in doubt.
// The mechanical side scores every page by how much of its own rare vocabulary the corpus shares; most topics are one sense and every page
// is close to the median, so no model is asked anything. When a few pages sit far below it (a football club's depth chart among the pages on
// "dolphins"), those pages and a few ordinary ones are shown as CARDS (host, title, lead line: about 40 tokens each) to a model, which says
// which of the doubtful ones to keep. It can only keep or drop the doubtful pages; it cannot add a page, read one, or rank anything.
// With no model configured the doubtful pages are dropped (the mechanical default), so the gate costs nothing unless it is wanted.

const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

export const LIMITS = { cards: 12, doubtful: 6, anchoredDoubtful: 60, leadChars: 120, titleChars: 90, ratio: 0.5, anchoredRatio: 0.7, anchorHigh: 0.35, anchorSelf: 0.95 };

const medianOf = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[a.length >> 1]; };

/** Pages whose shared-vocabulary share is under `ratio` of the median. Needs enough pages for a median to mean something.
 *  Anchored (the shares are against the chosen sense's own article): the reference is the median of the pages that plainly are that sense,
 *  not of all pages, because when most pages are another sense the median is the wrong sense's. Fewer than two such pages: no reference. */
export const doubtful = (hits, { ratio = LIMITS.ratio, min = 4, anchored = false } = {}) => {
  if (hits.length < min) return [];
  if (anchored) {
    const highs = hits.map((h) => h.share).filter((x) => x >= LIMITS.anchorHigh && x < LIMITS.anchorSelf);
    if (highs.length < 2) return [];
    const ref = medianOf(highs);
    return hits.filter((h) => h.share < ref * LIMITS.anchoredRatio).sort((a, b) => a.share - b.share).slice(0, LIMITS.anchoredDoubtful);
  }
  const median = medianOf(hits.map((h) => h.share));
  return hits.filter((h) => h.share < median * ratio).sort((a, b) => a.share - b.share).slice(0, LIMITS.doubtful);
};

export const cardOf = (s) => ({ n: s.n, host: hostOf(s.url), title: clean(s.title).slice(0, LIMITS.titleChars), lead: clean(String(s.text).split(/\n+/).map(clean).find((l) => l.length >= 40) ?? s.text).slice(0, LIMITS.leadChars) });

/** The cards shown: every doubtful page, then ordinary pages (most relevant first) so the model can see what the topic looks like. */
export const cardsFor = (kept, doubt) => {
  const bad = new Set(doubt.map((h) => h.s.n));
  const rest = kept.filter((s) => !bad.has(s.n)).sort((a, b) => b.rel - a.rel).slice(0, Math.max(4, LIMITS.cards - bad.size));
  return [...doubt.map((h) => h.s), ...rest].map(cardOf);
};

export const gatePrompt = (question, cards, doubtfulNs, sense = null, all = false) =>
  [`Topic: ${question}${sense ? ` (meaning: ${sense})` : ""}`, "Pages were found for this topic. Each is a card: [number] site | title | first line.", ...cards.map((c) => `[${c.n}] ${c.host} | ${c.title} | ${c.lead}`),
    all ? 'Which of these pages are about the topic with that meaning? Answer with one line, "KEEP: " and their numbers comma-separated, or "KEEP: none".'
      : `Pages ${doubtfulNs.join(", ")} look unlike the rest. Which of those are about the topic as the others are? Answer with one line, "KEEP: " and their numbers comma-separated, or "KEEP: none".`].join("\n");

/** The numbers on the reply's `KEEP:` line, restricted to the pages that were in doubt. A reply with no such line is no answer (null), because
 *  a model that says "page 5 is a football page, drop it" has named the page it rejects: reading any number as a pick would keep exactly that page. */
export const parsePicks = (reply, doubtfulNs) => {
  const line = /(?:^|\n)\s*KEEP\s*:\s*([^\n]*)/i.exec(String(reply ?? ""));
  if (!line) return null;
  if (/\bnone\b/i.test(line[1])) return new Set();
  const nums = [...line[1].matchAll(/\d+/g)].map((m) => +m[0]).filter((n) => doubtfulNs.includes(n));
  return nums.length ? new Set(nums) : null;
};

/** An OpenAI-compatible endpoint (a local model or a frontier one) from the environment; undefined when none is set. */
export const gateFromEnv = (env = process.env, fetchImpl = globalThis.fetch) => {
  if (!env.FOLD_GATE_URL) return undefined;
  return async (prompt) => {
    const r = await fetchImpl(`${env.FOLD_GATE_URL.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", ...(env.FOLD_GATE_KEY ? { authorization: `Bearer ${env.FOLD_GATE_KEY}` } : {}) }, body: JSON.stringify({ model: env.FOLD_GATE_MODEL ?? "gate", temperature: 0, max_tokens: 30, messages: [{ role: "user", content: prompt }] }), signal: AbortSignal.timeout(Number(env.FOLD_GATE_MS) || 8000) });
    if (!r.ok) throw new Error(`gate ${r.status}`);
    return (await r.json()).choices?.[0]?.message?.content ?? "";
  };
};

/** Which doubtful pages to drop. A model that answers keeps the ones it picks; no model, no answer or an error drops them all. */
export const decide = async ({ question, kept, hits, gate, anchored = false, sense = null }) => {
  const doubt = doubtful(hits, { anchored });
  if (!doubt.length) return { drop: new Set(), gate: { asked: false, doubtful: [], by: "none" } };
  const ns = doubt.map((h) => h.s.n);
  if (typeof gate !== "function") return { drop: new Set(ns), gate: { asked: false, doubtful: ns, by: "mechanical" } };
  const cards = cardsFor(kept, doubt);
  let picks = null;
  try { picks = parsePicks(await gate(gatePrompt(question, cards, ns, sense)), ns); } catch { picks = null; }
  if (!picks) return { drop: new Set(ns), gate: { asked: true, doubtful: ns, by: "mechanical", cards: cards.length } };
  return { drop: new Set(ns.filter((n) => !picks.has(n))), gate: { asked: true, doubtful: ns, picked: [...picks], by: "model", cards: cards.length } };
};

/** The card gate over every page, in chunks: the model says which pages are about the topic with the chosen meaning. A chunk whose reply has no
 *  KEEP line falls back to the mechanical decision for that chunk (`fallback`: the pages the mechanical gate would drop). Measured 2026-10-20 on
 *  141 labelled pages: frontier 95% precision and 83% recall at about 750 tokens a topic; a 2B local model 49% and 85%; the mechanical drop 48% and 65%. */
export const decideAll = async ({ question, kept, gate, sense = null, fallback = new Set(), chunk = LIMITS.cards * 2, maxCalls = 3 }) => {
  const order = [...kept].sort((a, b) => b.rel - a.rel), drop = new Set(fallback);
  const info = { asked: true, by: "model", calls: 0, chunks: 0, failed: 0, doubtful: [] };
  for (let at = 0; at < order.length && info.calls < maxCalls; at += chunk) {
    const part = order.slice(at, at + chunk), cards = part.map(cardOf), ns = cards.map((c) => c.n);
    info.chunks++; info.calls++;
    let picks = null;
    try { picks = parsePicks(await gate(gatePrompt(question, cards, ns, sense, true)), ns); } catch { picks = null; }
    if (!picks) { info.failed++; continue; }
    for (const p of part) picks.has(p.n) ? drop.delete(p.n) : drop.add(p.n);
  }
  info.doubtful = [...drop];
  if (info.failed === info.chunks) info.by = "mechanical";
  return { drop, gate: info };
};
