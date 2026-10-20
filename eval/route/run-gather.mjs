// eval/route/run-gather.mjs — the gather session's battery (battery-gather.mjs), scored as that session scored it: any accepted kind is right.
import { GATHER } from "./battery-gather.mjs";
import { routeOf } from "../../opencode-route.mjs";
let right = 0; const miss = [];
for (const it of GATHER) {
  const r = await routeOf(it.ask, { history: it.history ? [{ role: "assistant", text: "…" }] : [] });
  const got = r.kind ?? "GAP";
  if (it.ok.includes(got.toLowerCase())) right++; else miss.push(`${it.id} want ${it.ok.join("|")} got ${got} | ${JSON.stringify(it.ask.slice(0, 60))} | topic ${r.topic ?? "-"} | ${r.why ?? r.detail ?? ""}`);
}
for (const m of miss) console.log(m);
console.log(`\nGATHER DEV: ${right}/${GATHER.length}`);
