// ant-adversary / kind_position.mjs — attack (c): are ant-kinds-chat's induced IRC kinds position/frequency bands? message-initial share and median log-count by kind (their DEV kindmap, their DEV days).
import fs from "node:fs";
import path from "node:path";
import { ircDays, loadIrcDay } from "../ant-kinds-chat/lib.mjs";
const km = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "ant-kinds-chat", "results", "kindmap.irc.dev.json"), "utf8")).labels;
const days = ircDays().filter((d) => d.split === "DEV");
const K = {}; let tokAll = 0, initAll = 0;
for (const d of days) { const day = loadIrcDay(d); day.stream.forEach((m, s) => m.forEach((w, i) => { tokAll++; if (i === 0) initAll++; const k = km[w]; if (k === undefined) return; const o = (K[k] ??= { tok: 0, init: 0, gold: 0, goldInit: 0, forms: new Set() }); o.tok++; o.forms.add(w); if (i === 0) o.init++; if (day.gold.has(`${s}:${i}`)) { o.gold++; if (i === 0) o.goldInit++; } })); }
const rows = Object.entries(K).map(([k, o]) => ({ kind: +k, forms: o.forms.size, tokens: o.tok, initShare: +(o.init / o.tok).toFixed(3), goldTokens: o.gold, goldInitShare: o.gold ? +(o.goldInit / o.gold).toFixed(3) : null })).sort((a, b) => b.initShare - a.initShare);
console.log(JSON.stringify({ days: days.length, overallInitShare: +(initAll / tokAll).toFixed(3), kinds: rows.slice(0, 10), nKinds: rows.length, kindsInitShareAbove3x: rows.filter((r) => r.initShare > 3 * initAll / tokAll).map((r) => r.kind) }, null, 0));
