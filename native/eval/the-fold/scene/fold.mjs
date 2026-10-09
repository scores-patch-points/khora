// fold.mjs — THE FOLD IS A PROJECTION OF (the raw text + the record), telling us
// what the spans likely mean. The record (EOT) is omnilingual, referents HASH ids;
// when we TALK about a span, we give pretty names. Query: node fold.mjs <from> <to> [chars]
import fs from "node:fs";
const { readGreek } = await import(`file://${process.cwd()}/reader.mjs`);

const CHARS = Number(process.argv[4] || 150000);
const FROM = Number(process.argv[2]);
const TO = Number(process.argv[3]);
const r = await readGreek({ chars: CHARS, out: `eot-odyssey-${CHARS}.json` });

const talk = (id) => (id ? r.nameOfId(id).replace(/^\?/, "") : null);
const talkVoice = (j) => {
  if (j.kind === "REPEAT") return `"${talk(j.from) ?? "?"}" keeps being the one with "${talk(j.who) ?? "?"}" — every time we see it, that's who it means`;
  if (j.kind === "EVENT") return `here it changes around "${talk(j.who) ?? "?"}"`;
  if (j.kind === "UNKNOWN") return `which one is "${j.surface}"?`;
  return "";
};
const project = (a, b) => {
  const lines = [];
  const hits = r.clauses.filter((c) => c.span[1] >= a && c.span[0] <= b).sort((x, y) => x.span[0] - y.span[0]);
  for (const c of hits) {
    const start = Math.max(a, c.span[0]), end = Math.min(b, c.span[1]);
    const who = talk(r.subjectRefOf(c)) ?? (c.subject ? r.g(String(c.subject.head ?? c.subject)) : null) ?? "?";
    const verb = r.g(c.verb ?? "·");
    const obj = c.object ? r.g(String(c.object.head ?? c.object)) : null;
    const meaning = `${who} → ${verb}${obj ? " " + obj : ""}`.trim();
    const learning = (c.learning ?? 0).toFixed(1);
    lines.push({ kind: "meaning", txt: `${meaning.padEnd(42)} · △${learning} bits` });
    for (const j of r.journal.filter((j) => j.span && j.span[1] >= start && j.span[0] <= end)) lines.push({ kind: "voice", txt: `    (the voice: ${talkVoice(j)})` });
  }
  return lines;
};

const spans = Number.isFinite(FROM) && Number.isFinite(TO) ? [[FROM, TO]] : [[114600, 117400], [29700, 31600], [70400, 72200]];
console.log(`THE FOLD IN ENGLISH — the record's reading of each span, spoken in pretty names\n`);
for (const [a, b] of spans) {
  console.log(`── span ${a}–${b} ` + "·".repeat(30) + "\n");
  const src = r.raw.slice(a, b).replace(/\s+/g, " ").trim();
  console.log(`   [source ${a}–${b}]  ${src.slice(0, 90)}${src.length > 90 ? " …" : ""}\n`);
  for (const l of project(a, b)) console.log("   " + l.txt);
  console.log("");
}