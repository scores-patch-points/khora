// greek-odyssey.mjs — THE ODYSSEY READ THROUGH THE ILIAD AS PRIOR.
// The Iliad is read first; its EARNED verb vocabulary is the prior the Odyssey
// reads through. What the Odyssey uses that the Iliad never taught is SURPRISE
// (new material); what it shares is expected. No model. Houdini + the seam.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekBeings, greekClauses } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));

const read = (p, chars) => fs.readFileSync(p, "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, chars);
const ILIAD = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt";
const ODYSSEY = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt";
const CHARS = Number(process.argv[2] || 80000);

const ALL = confirmedVerbSet(posPrior);   // the received prior (treebank)
const ll = read(ILIAD, CHARS), od = read(ODYSSEY, CHARS);

const sents = (t) => t.split(/(?<=[.;—])/g);
function readBook(text) {
  const verbs = new Set(), clauses = [];
  for (const s of sents(text)) if (s.trim().length > 3) {
    for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { beings: [], articleMode: "soft", minShare: 0.6, minCount: 20 })) {
      if (c.verb) verbs.add(String(c.verb));
      clauses.push(c);
    }
  }
  return { verbs, clauses };
}

console.log(`reading ${CHARS} chars of each …`);
const iliad = readBook(ll);
const odyssey = readBook(od);

// THE ILIAD AS PRIOR: the Odyssey's verbs split by whether the Iliad taught them
const taught = iliad.verbs, newv = new Set();
for (const v of odyssey.verbs) if (!taught.has(v)) newv.add(v);
const shared = [...odyssey.verbs].filter((v) => taught.has(v)).length;

console.log(`\n═══ THE ODYSSEY, READ THROUGH THE ILIAD AS PRIOR ═══`);
console.log(`Iliad   : ${iliad.verbs.size} distinct verbs (${iliad.clauses.length} clauses, first ${CHARS} chars)`);
console.log(`Odyssey : ${odyssey.verbs.size} distinct verbs (${odyssey.clauses.length} clauses)`);
console.log(`verb overlap (taught by the Iliad) : ${shared}`);
console.log(`NOT taught by the Iliad (surprise): ${newv.size}`);
console.log(`\n— Odyssey clauses whose verb the Iliad never used (new material) —`);
const surpriseClauses = odyssey.clauses.filter((c) => c.verb && newv.has(String(c.verb)));
const face = (x) => { if (!x) return ""; let s = typeof x === "string" ? x : String(x.head ?? x.surface ?? x.text ?? ""); return s ? s[0].toUpperCase() + s.slice(1) : ""; };
for (const c of surpriseClauses.slice(0, 30)) {
  console.log(`   ${String((face(c.subject) || "(pro-drop)") + "  " + c.verb + "  " + face(c.object)).slice(0, 70)}`);
}
console.log(`\n— the most "new" —`)
const cnt = new Map(); for (const v of newv) cnt.set(v, 0);
for (const c of odyssey.clauses) if (newv.has(String(c.verb))) cnt.set(String(c.verb), cnt.get(String(c.verb)) + 1);
console.log([...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([v, n]) => `${v}×${n}`).join("  "));