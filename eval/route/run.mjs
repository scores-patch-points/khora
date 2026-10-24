// eval/route/run.mjs [--held] — route the battery and score it (PREREG.md). `--held` measures the held-out set.
import { BATTERY, KINDS } from "./battery.mjs";
import { HELD } from "./battery-held.mjs";
import { ADV } from "./battery-adv.mjs";
import { routeOf } from "../../opencode-route.mjs";
const items = process.argv.includes("--held") ? HELD : process.argv.includes("--adv") ? ADV : BATTERY;
// followups and thanks happen mid-conversation: they are routed with a previous turn in the history
const withHistory = (it) => it.kind === "followup" || it.id === "X11" || /thanks/i.test(it.ask);
const rows = [];
for (const it of items) {
  const r = await routeOf(it.ask, { history: withHistory(it) ? [{ role: "assistant", text: "…" }] : [] });
  const got = r.kind ?? "GAP";
  rows.push({ ...it, got, why: r.why ?? r.detail, gap: r.gap });
  if (got !== it.kind) console.log(`${it.id} ${it.ask.padEnd(60)} want ${it.kind.padEnd(10)} got ${got.padEnd(10)} ${r.why ?? r.gap + ": " + r.detail}`);
}
const right = rows.filter((r) => r.got === r.kind).length;
const adv = rows.filter((r) => r.adv);
const skipped = rows.filter((r) => ["account", "search"].includes(r.kind) && !["account", "search"].includes(r.got)).length;
const wasted = rows.filter((r) => !["account", "search"].includes(r.kind) && ["account", "search"].includes(r.got)).length;
console.log(`\n${items === HELD ? "HELD-OUT" : items === ADV ? "ADVERSARIAL" : "DEV"}: ${right}/${rows.length} right (${Math.round((100 * right) / rows.length)}%), GAP ${rows.filter((r) => r.got === "GAP").length}`);
console.log(`R1 >=80%: ${right / rows.length >= 0.8}   R2 research skipped ${skipped} (<=1: ${skipped <= 1}), research wasted ${wasted} (<=2: ${wasted <= 2})`);
console.log(`R3 typed gaps: ${rows.filter((r) => r.got === "GAP").every((r) => r.gap && r.why)}   R4 adv ${adv.filter((r) => r.got === r.kind).length}/${adv.length} (>=50%: ${adv.length ? adv.filter((r) => r.got === r.kind).length / adv.length >= 0.5 : "n/a"})`);
const m = {}; for (const r of rows) { m[r.kind] ??= {}; m[r.kind][r.got] = (m[r.kind][r.got] ?? 0) + 1; }
console.log("confusion (row = label):"); for (const k of KINDS) console.log(" ", k.padEnd(10), JSON.stringify(m[k] ?? {}));
