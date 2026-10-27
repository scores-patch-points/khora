// eval/referents/folded-card-report.mjs — card sizes on the Russian excerpt (the development text), PREREG-FOLDED-CARD.md "Reported": by referent, question kind and window; Gary's findings; the name-swap's leaks.
//   node eval/referents/folded-card-report.mjs [--text file] [--out f.json]
import fs from "node:fs";
import { readWith } from "../../native/the-fold/read-core.mjs";
import { renderCard, QUESTION_KINDS } from "../../native/adapters/text/folded-card.js";
import { makeGary } from "../../native/organs/gary.js";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const file = arg("--text", "/Users/mlacy/Downloads/workspace/Zenodotus/11-multi-language/war-and-peace/ru/voyna-i-mir_Tolstoy_wikisource.txt");
const prior = JSON.parse(fs.readFileSync(new URL("../../native/priors/declension-rus.json", import.meta.url), "utf8"));
const text = fs.readFileSync(file, "utf8");
const entry = readWith(text, { language: "ru", referents: true, declension: true });
const beings = entry.referents.referents.filter((r) => r.standing === "referent").sort((a, b) => b.mentions.length - a.mentions.length);
const pick = (re) => beings.find((r) => re.test(r.face));
const targets = [["Пьер", pick(/Пьер/), { Пьер: "Борис" }], ["Андрей Болконский", pick(/Андрей Болконский/), { Андрей: "Григорий", Болконский: "Белозёров" }], ["Анна Павловна Шерер", pick(/Анна Павловна/), { Анна: "Зинаида", Павловна: "Ивановна", Шерер: "Белова" }]];
const Q = { identity: "Это один и тот же человек?", contradiction: "Эти два утверждения расходятся?", gap: "Что в карточке сказано о его родителях?", derivation: "Из заданных родственных связей следует ли родство?", free: "Кто это?" };
const gary = makeGary({});
// the report's own window figures are stated here, not defaults of the renderer: characters, about a quarter of a 4k and of an 8k token window at four characters a token
const windows = [null, 4000, 8000];
const rows = [];
for (const [label, R, swap] of targets) {
  if (!R) continue;
  for (const kind of QUESTION_KINDS) for (const window of windows) {
    const c = renderCard(entry, R.id, { forWhom: "a reader of the novel", declension: { prior }, question: { kind, text: Q[kind] }, window, swap: null });
    const g = gary.check(c.messages, { material: c.available.appearances });
    rows.push({ referent: label, kind, window, chars: c.size.chars, approxTokens: c.size.approxTokens, lines: c.size.lines, fits: c.fits, available: c.available, left: c.left, garyStrikeOrRefuse: g.findings.filter((f) => f.severity !== "flag").length, garyFlags: g.findings.filter((f) => f.severity === "flag").map((f) => f.rule) });
  }
  const sw = renderCard(entry, R.id, { forWhom: "a reader of the novel", declension: { prior }, question: { kind: "free", text: Q.free }, window: 8000, swap });
  rows.push({ referent: label, kind: "name-swap", window: 8000, chars: sw.size.chars, leaks: sw.swapped.leaks, leaked: sw.swapped.leaked, unmapped: sw.swapped.unmapped, pairs: sw.swapped.pairs.length });
}
console.log(`text ${file.split("/").pop()}: ${text.length} characters, ${entry.sentences.length} sentences, ${beings.length} beings; Natasha (Наташа) occurs ${(text.match(/Наташ/g) ?? []).length} times in this text`);
console.log("referent               kind           window  chars  ~tokens  lines  fits  left (app/edg/bind/stated)  gary strike|refuse / flags");
for (const r of rows.filter((x) => x.kind !== "name-swap")) console.log(r.referent.padEnd(22), r.kind.padEnd(13), String(r.window ?? "none").padStart(7), String(r.chars).padStart(6), String(r.approxTokens).padStart(8), String(r.lines).padStart(6), String(r.fits).padStart(5), `${r.left.appearances}/${r.left.edges}/${r.left.bindings}/${r.left.stated}`.padStart(14), `  ${r.garyStrikeOrRefuse} / ${r.garyFlags.length}`);
for (const r of rows.filter((x) => x.kind === "name-swap")) console.log("name-swap", r.referent, "chars", r.chars, "pairs", r.pairs, "leaks", r.leaks, JSON.stringify(r.leaked), "unmapped", JSON.stringify(r.unmapped));
const out = arg("--out", null); if (out) fs.writeFileSync(out, `${JSON.stringify({ file, chars: text.length, rows }, null, 2)}\n`);
// note: "unmapped" lists capitalised tokens of the referent's forms that the swap map does not cover (a title such as «Князь» at a sentence start is one); "leaks" counts words that still BEGIN with an old name's stem
