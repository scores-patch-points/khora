// eval/attention/gates.mjs — the two gates of PREREG-ATTENTION.md that need no corpus.
//   G1  grep gate: attention-binder.js keeps no noun, synonym or kind list (no Set / array / Map / regex alternation of words in its code)
//   G2  he/she regression gate: the files the he/she resolver reads are byte-identical to the base commit, priors.js only gained lines,
//       and the existing pronoun tests pass
//   node eval/attention/gates.mjs [--base 15f82fc]
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "15f82fc";
const git = (...a) => execFileSync("git", a, { encoding: "utf8" });
let ok = true;
const report = (name, pass, detail) => { ok &&= pass; console.log(`${pass ? "PASS" : "FAIL"} ${name}: ${detail}`); };

const src = fs.readFileSync("native/adapters/text/attention-binder.js", "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/\s\/\/.*$/, "")).join("\n");
const offenders = [];
if (/new (Set|Map)\(\s*\[\s*[\[\"'`]/.test(src)) offenders.push("Set/Map built from a literal");
if (/\[\s*["'`][\p{L}-]+["'`]\s*,\s*["'`][\p{L}-]+["'`]/u.test(src)) offenders.push("array of two or more word literals");
if (/\/[^/\n]*\b[a-z]+\|[a-z]+\|[a-z]+/i.test(src.replace(/\\p\{[^}]*\}/g, ""))) offenders.push("regex alternation of three or more words");
report("G1 no word list in attention-binder.js", offenders.length === 0, offenders.length ? offenders.join("; ") : "no Set/Map/array literal of words, no word alternation in its code");

const frozen = ["native/adapters/text/pronouns.js", "native/adapters/text/non-personal.js", "native/memory/activation.js", "native/kernel/activation.js", "native/organs/hypergraph.js", "native/reading.js", "native/the-fold/corpus-session.js", "native/kernel/eot-claim-match.js"];
const changed = frozen.filter((f) => git("diff", base, "--", f).length > 0);
report("G2a the he/she resolver's files are byte-identical to base", changed.length === 0, changed.length ? `changed: ${changed.join(", ")}` : `${frozen.length} files, git diff ${base} empty`);
const importers = execFileSync("git", ["grep", "-l", "-E", "attention-(binder|switch)", "--", "native"], { encoding: "utf8" }).split("\n").filter((f) => f && !/^native\/adapters\/text\/attention-/.test(f) && f !== "native/adapters/text/priors.js"); // priors.js only names it in a comment
report("G3 nothing existing imports the binder (separate, switchable, off)", importers.length === 0, importers.length ? importers.join(", ") : "no file outside attention-* and eval/ refers to it");
const num = git("diff", "--numstat", base, "--", "native/adapters/text/priors.js").trim().split(/\s+/);
report("G2b priors.js only gained lines", num[1] === "0", `+${num[0]} -${num[1]}`);
// One existing test ("readDocument with a lexicon hands the resolver…") needs the Wiktionary pack, which is not on every machine; it fails the same
// way at the base commit here. It is the only failure tolerated, and it is named in the report.
const NEEDS_PACK = /readDocument with a lexicon hands the resolver the referents the givers rule non-personal/;
let out = "";
try { out = execFileSync("node", ["--test", "native/adapters/text/pronoun-gaps.test.mjs", "native/adapters/text/pronoun-presence.test.mjs", "native/adapters/text/non-personal.test.mjs", "native/adapters/text/attention-binder.test.mjs"], { encoding: "utf8" }); }
catch (e) { out = String(e.stdout ?? ""); }
const failed = [...new Set([...out.matchAll(/✖ ([^\n(]+)\(/g)].map((m) => m[1].trim()))].filter((t) => !/failing tests/.test(t));
const pass = /ℹ pass (\d+)/.exec(out)?.[1];
const unexpected = failed.filter((t) => !NEEDS_PACK.test(t));
report("G2c existing pronoun / non-personal tests and the binder's own pass", unexpected.length === 0 && pass !== undefined, `pass ${pass}; failed ${failed.length ? failed.join(" | ") : "none"}${failed.length && !unexpected.length ? " (needs the Wiktionary pack; fails the same at the base commit on this machine)" : ""}`);
process.exit(ok ? 0 : 1);
