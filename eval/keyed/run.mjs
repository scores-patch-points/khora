// eval/keyed/run.mjs — the entity-property claim battery, both arms (eval/keyed/PREREG.md).
//   node eval/keyed/run.mjs --record    online, through the Wikimedia gate (one request per 10 s), into eval/keyed/recording/
//   node eval/keyed/run.mjs             replay OFFLINE: a request the recording does not hold is an error, never a fetch
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(HERE, "battery.mjs"))).digest("hex");
if (sha !== fs.readFileSync(path.join(HERE, "battery.sha"), "utf8").trim()) throw new Error("battery.mjs changed after freezing");
const RECORD = process.argv.includes("--record");
process.env.FOLD_RESEARCH_CACHE = path.join(HERE, "recording");
process.env.FOLD_RESEARCH_MS = process.env.FOLD_RESEARCH_MS ?? "900000";
process.env.FOLD_RESEARCH_MAX = "8";
if (!RECORD) { process.env.FOLD_WIKI_OFFLINE = "1"; process.env.FOLD_WEB_OFFLINE = "1"; }
const { BATTERY } = await import("./battery.mjs");
const { profileOf, warmFinish } = await import("../../opencode-finish.mjs");
await warmFinish();

const ARMS = { A0: "0", A1: "1", A2: "1", A3: "1", A4: "1", A5: "1" };
if (RECORD && !process.env.BRAVE_API_KEY) console.log("note: BRAVE_API_KEY is not set; arm A5 will record nothing new (searches fail as a typed gap)");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)?.split(",");
const rows = [];
for (const [arm, flag] of Object.entries(ARMS)) {
  process.env.FOLD_KEYED = flag === "1" ? "1" : "0";
  process.env.FOLD_KEYED_SOLE = arm === "A2" || arm === "A3" || arm === "A4" || arm === "A5" ? "1" : "0";
  process.env.FOLD_KEYED_JULIAN_GUARD = arm === "A3" || arm === "A4" || arm === "A5" ? "1" : "0";
  process.env.FOLD_PRIMARY = arm === "A4" || arm === "A5" ? "1" : "0";
  process.env.FOLD_BRAVE = arm === "A5" ? "1" : "0";
  for (const item of BATTERY) {
    if (only && !only.includes(item.id)) continue;
    const t0 = Date.now();
    const r = await profileOf({ draft: item.claim, passages: [], research: true });
    const unit = r.profile.claims.find((c) => c.standing !== "heading" && c.text.startsWith(item.claim.slice(0, 20))) ?? r.profile.claims[0];
    const standing = unit?.standing ?? "missing";
    const verdict = standing === "supported" ? "S" : standing === "contradicted" ? "C" : "U";
    const t = item.truth;
    const outcome = t === null ? (verdict === "U" ? "GAP" : "WRONG") : verdict === "U" ? "GAP" : (verdict === "S") === t ? "RIGHT" : "WRONG";
    const trail = (unit?.searched ?? []).filter((x) => /wikidata key|wikidata:|wikipedia:/.test(x));
    const typed = (unit?.searched ?? []).some((x) => /wikidata key: [a-z_]+/.test(x) || /not researched|ambiguous|none|no item/.test(x)) || (r.profile.beings ?? []).some((b) => b.verdict !== "bound");
    rows.push({ arm, id: item.id, claim: item.claim, truth: t, key: item.key, verdict, outcome, informativeGap: outcome === "GAP" ? typed : null, evidence: unit?.evidence?.ref ?? null, tier: unit?.tier ?? null, primaryHost: unit?.primary?.ref ?? null, why: unit?.why ?? null, trail, ms: Date.now() - t0 });
    console.log(arm, item.id.padEnd(4), outcome.padEnd(5), verdict, (unit?.tier ?? "").padEnd(7), (unit?.evidence?.ref ?? "").padEnd(14), (unit?.why ?? trail.at(-1) ?? "").slice(0, 90));
  }
}
fs.writeFileSync(path.join(HERE, RECORD ? "results-record.json" : "results.json"), JSON.stringify(rows, null, 1));
const tally = (arm, f = () => true) => { const rs = rows.filter((x) => x.arm === arm && f(x)); return { n: rs.length, RIGHT: rs.filter((x) => x.outcome === "RIGHT").length, WRONG: rs.filter((x) => x.outcome === "WRONG").length, GAP: rs.filter((x) => x.outcome === "GAP").length, informative: rs.filter((x) => x.informativeGap).length }; };
console.log("\nA0", JSON.stringify(tally("A0")));
console.log("A1", JSON.stringify(tally("A1")));
console.log("A2", JSON.stringify(tally("A2")));
console.log("A3", JSON.stringify(tally("A3")));
for (const arm of ["A4", "A5"]) console.log(arm, JSON.stringify(tally(arm)), "tiers:", JSON.stringify(rows.filter((x) => x.arm === arm).reduce((a, x) => (x.tier ? ((a[x.tier] = (a[x.tier] ?? 0) + 1), a) : a), {})));
// V4: evidence earned
const v4 = rows.filter((x) => x.arm === "A1" && x.verdict !== "U").every((x) => /^Q\d+#P\d+$/.test(x.evidence ?? "") || /wikipedia|Q\d+#P/.test(x.evidence ?? ""));
console.log("V4 evidence addressed:", v4);
// V5: hosts
const idx = path.join(HERE, "recording", "wikimedia", "index.jsonl");
if (fs.existsSync(idx)) { const hosts = [...new Set(fs.readFileSync(idx, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).host))]; console.log("V5 hosts:", hosts.join(", "), "-> ok:", hosts.every((h) => /(wikipedia|wikidata|wiktionary)\.org$/.test(h))); }

// V5b: what the web tier fetched (A4): hosts of pages read, from the cache index
const widx = path.join(HERE, "recording", "web", "index.jsonl");
if (fs.existsSync(widx)) { const rows2 = fs.readFileSync(widx, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); console.log("web fetched:", rows2.filter((r) => r.kind === "page").length, "pages,", rows2.filter((r) => r.kind === "search").length, "searches; hosts:", [...new Set(rows2.map((r) => r.host))].join(", ")); }
