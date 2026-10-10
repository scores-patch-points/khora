// days.mjs — freezes the day inventory for the R2 confirmation. LABEL-FREE and SCORE-FREE: it reads file names and earlier agents' day lists only; it loads no IRC text and computes no statistic.
// Partition of all IRC channel-days in ubuntu-irc/: (a) USED14 = used by the registered name tests (name-rule-informal gold.files, name-company(-pairblocks) C3.days);
// (b) SCOPER_DISCOVERY / SCOPER_CONFIRM = split.json of the chat-scope scoper (both were scored by the scoper; SCOPER_CONFIRM was the scoper's single-shot confirm of R2);
// (c) INELIGIBLE20 = scoper's days with < 20 gold nickname-mention occurrences: counted by the scoper, never scored.  My confirm set = USED14 + INELIGIBLE20.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
const R = "/Users/mlacy/Documents/3.0/khora/native/eval/law/results";
const SP = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/khora/native/eval/law/provisional/chat-scope/split.json", "utf8"));
const used = new Set(JSON.parse(fs.readFileSync(path.join(R, "name-rule-informal.irc.json"), "utf8")).gold.files);
for (const d of ["name-company", "name-company-pairblocks"]) for (const k of JSON.parse(fs.readFileSync(path.join(R, d, "report.json"), "utf8")).C3.days) used.add(k);
const all = []; for (const c of fs.readdirSync(ROOT).sort()) for (const f of fs.readdirSync(path.join(ROOT, c)).filter((x) => x.endsWith(".txt")).sort()) all.push(`${c}/${f}`);
const disc = SP.discovery.map((d) => d.key), conf = SP.confirm.map((d) => d.key), inel = SP.ineligible.map((d) => d.key), u14 = [...used].sort();
const parts = { USED14: u14, SCOPER_DISCOVERY: disc, SCOPER_CONFIRM: conf, INELIGIBLE20: inel };
const seen = new Map(); for (const [n, a] of Object.entries(parts)) for (const k of a) { if (seen.has(k)) throw new Error("overlap " + k + " " + seen.get(k) + " " + n); seen.set(k, n); }
const missing = all.filter((k) => !seen.has(k)), extra = [...seen.keys()].filter((k) => !all.includes(k));
const EN = new Set(["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]);
const confirmSet = [...u14, ...inel].sort(), lang = (k) => (EN.has(k.split("/")[0]) ? "en" : "nonen");
const out = { total: all.length, partition: Object.fromEntries(Object.entries(parts).map(([n, a]) => [n, a.length])), unaccounted: missing, notOnDisk: extra, parts,
  confirmSet: { all: confirmSet, EN: confirmSet.filter((k) => lang(k) === "en"), NONEN: confirmSet.filter((k) => lang(k) === "nonen") },
  dryDays: ["kubuntu/2012-03-15.txt", "kubuntu/2013-03-15.txt", "kubuntu/2011-03-15.txt"] };
out.sha256 = createHash("sha256").update(JSON.stringify(out.confirmSet)).digest("hex");
fs.writeFileSync(new URL("./days.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ total: out.total, partition: out.partition, unaccounted: missing.length, notOnDisk: extra.length, EN: out.confirmSet.EN.length, NONEN: out.confirmSet.NONEN.length, sha256: out.sha256 }));
