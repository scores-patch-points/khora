// collect.mjs — shared driver: load days (optionally shuffled controls), build matched pairs per day and stratum, tag with channel / year / language.
import fs from "node:fs";
import { loadDay, listDays, rngOf, shuffleIn } from "./load.mjs";
import { dayPairs } from "./pairs.mjs";
export const SPLIT = JSON.parse(fs.readFileSync(new URL("./split.json", import.meta.url), "utf8"));
export const daysOf = (stage) => { const keys = new Set(SPLIT[stage].map((d) => d.key)); return listDays().filter((d) => keys.has(d.key)); };
/** mode: "real" | "msgshuf" (permute message order within the day, tokens intact) | "wordshuf" (permute tokens inside each message). Gold stays word-defined; speakers travel with their messages. */
export function docOf(d, mode = "real") {
  const x = loadDay(d), r = rngOf("chat-scope", d.key, mode);
  let T = x.msgs.map((m) => m.t.slice()), S = x.msgs.map((m) => m.n);
  if (mode === "msgshuf") { const idx = shuffleIn(T.map((_, k) => k), r); T = idx.map((k) => T[k]); S = idx.map((k) => S[k]); }
  if (mode === "wordshuf") T = T.map((t) => shuffleIn(t, r));
  return { key: d.key, channel: d.channel, lang: d.lang, year: d.year, T, S, nicks: x.nicks, topic: x.topic };
}
export const era = (y) => (y <= 2007 ? "2004-07" : y <= 2011 ? "2008-11" : "2012-15");
export function collect(days, mode = "real", max = 300, onDay = () => {}) {
  const out = { LATER: [], FIRST: [] }, info = [];
  for (const d of days) {
    const doc = docOf(d, mode);
    for (const st of ["LATER", "FIRST"]) {
      const r = dayPairs(doc, st, rngOf("chat-scope", "pairs", d.key, st, mode), max);
      for (const p of r.pairs) { p.day = d.key; p.channel = d.channel; p.lang = d.lang; p.era = era(d.year); p.init = p.pos.init; out[st].push(p); }
      info.push({ day: d.key, st, pairs: r.pairs.length, dropped: r.dropped, exact: r.exact, nPos: r.nPos, nNeg: r.nNeg });
    }
    onDay(d.key);
  }
  return { out, info };
}
