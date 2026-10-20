// eval/route/run-multi.mjs — route battery-multi per language and report accuracy per language (PREREG.md, Result 3).
import { BATTERY_MH as BATTERY_M, LANGS_H as LANGS } from "./battery-multi-held.mjs";
import { routeOf } from "../../opencode-route.mjs";
const history = [{ role: "assistant", text: "…" }];
const rows = [];
for (const it of BATTERY_M) {
  const r = await routeOf(it.ask, { history: it.kind === "followup" ? history : [] });
  rows.push({ ...it, got: r.kind ?? "GAP", why: r.why ?? r.detail });
}
const per = {};
for (const r of rows) { per[r.lang] ??= { right: 0, n: 0, skipped: 0, wasted: 0 }; const p = per[r.lang]; p.n++; if (r.got === r.kind) p.right++; const need = ["account", "search"]; if (need.includes(r.kind) && !need.includes(r.got)) p.skipped++; if (!need.includes(r.kind) && need.includes(r.got)) p.wasted++; }
console.log("lang  right/n   research skipped  wasted");
for (const l of LANGS) console.log(l.padEnd(5), `${per[l].right}/${per[l].n}`.padEnd(9), String(per[l].skipped).padEnd(17), per[l].wasted);
if (process.argv.includes("-v")) for (const r of rows) if (r.got !== r.kind) console.log(r.id.padEnd(7), r.ask.padEnd(46), "want", r.kind.padEnd(10), "got", r.got.padEnd(10), r.why ?? "");
