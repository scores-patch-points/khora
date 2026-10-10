// attack-R1_first_slot_share/postbot.mjs: POST-HOC EXPLORATORY ablation (announced as such): is the rule carried by bot or hub-addresser messages? Usage: node postbot.mjs (never "run").
// ═══ PRE-REGISTRATION (written before the first run of this script; POST-HOC) ═══
// DISCLOSURE. I had read all results of attackA/B/C and postdiag p1-p4 (S0 RC 0.871; strict keys; form-balanced 0.889; ishareMS >= ishare on strict rows). Not yet seen: any ablation that deletes messages of chosen speakers.
// QUESTION. In support IRC the first slot is filled by software: a factoid bot answers "nick: ..." and hubs (helpers) address many users. The SCORE never sees the speaker field; this ablation uses the speaker field only to DELETE messages from the stream (gold-based ablation, not a rule observable).
//   Variants on EN RC (S0 1-1 within day, <= 400 pairs per day; gold nicks recomputed from the remaining speakers): base; dropBots (speaker form matches /bot/ or is chanserv, nickserv); dropTop3 (the 3 most active speakers of the day); dropBotsTop3.
// BARS (post-hoc, interpretation only): the rule is NOT carried by bots/hubs iff every variant keeps AUC >= 0.80; if any variant falls below 0.75 the scope is narrowed to "streams that contain bot/hub addresser traffic".
// PREDICTIONS: dropBots within 0.03 of base (0.8); dropTop3 >= 0.80 (0.6); dropBotsTop3 >= 0.78 (0.55).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, SETS, headerSha, LANG } from "./lib.mjs";
import { matchDay, sumPairs, round } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const SHA = headerSha(import.meta.url), EN = (k) => LANG[k.split("/")[0]] === "en", RC = [...SETS.R, ...SETS.C].filter(EN), t0 = Date.now(), out = { headerSha256: SHA, status: "POST-HOC exploratory", cells: {} };
const isBot = (n) => /bot/i.test(n) || /^(chanserv|nickserv)$/i.test(n);
const V = { base: null, dropBots: (n) => isBot(n), dropTop3: (n, top) => top.slice(0, 3).includes(n), dropBotsTop3: (n, top) => isBot(n) || top.slice(0, 3).includes(n) };
for (const [vn, f] of Object.entries(V)) { const P = []; let dropped = 0, all = 0; for (const k of RC) { const full = loadDay(k), d = loadDay(k, f ? { dropSpeaker: f } : {}); all += full.T.length; dropped += full.T.length - d.T.length; P.push(...matchDay(d, "S0", { max: 400 }).pairs); }
  const s = sumPairs(P, ["ishare"], ["i", "len", "cl", "lc", "b", "rec"], "PB" + vn); s.messagesDroppedShare = round(dropped / all); out.cells[vn] = s; console.error(vn, s.n, s.auc.ishare, s.messagesDroppedShare); }
out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL("./results/post.bot.json", import.meta.url), JSON.stringify(out)); console.log(JSON.stringify({ sha: SHA, seconds: out.seconds }));
