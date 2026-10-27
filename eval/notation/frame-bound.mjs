// eval/notation/frame-bound.mjs — earns (or refuses) the notation codec's frame bound, by eval/notation/FRAME-PREREG.md (cd03b6b5).
//   node eval/notation/frame-bound.mjs [--zenodotus=../Zenodotus]
import fs from "node:fs";
import path from "node:path";
import { notationParts, NOTATION_FRAME_BOUND } from "../../native/the-fold/arithmetic.js";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ZEN = path.resolve(arg("zenodotus", path.join(process.cwd(), "..", "Downloads", "workspace", "Zenodotus")));
const SEG = new Intl.Segmenter("und", { granularity: "word" });
const words = (s) => [...SEG.segment(s)].filter((w) => w.isWordLike).length;

// a positive's frame: every word-like segment that is not a number (operator words stay: an upper bound for the symbol form)
const askFrame = (ask) => [...SEG.segment(String(ask).normalize("NFKC"))].filter((w) => w.isWordLike && !/^\p{Nd}+(?:[.,]\p{Nd}+)?$/u.test(w.segment)).length;
const mech = async (f) => { const m = await import(`../route/${f}`); const items = m.default ?? m.ITEMS ?? m.items ?? Object.values(m).find(Array.isArray); return items.filter((x) => x.kind === "mechanical").map((x) => x.ask); };
const P_dev = [...(await mech("battery.mjs")), ...(await mech("battery-multi.mjs"))];
const P_held = [...(await mech("battery-held.mjs")), ...(await mech("battery-multi-held.mjs"))];

// N: real statements carrying one span the codec's other gates admit
const QUESTION_MARK = /[?？؟՞፧;¿]/u;
const SENT = /[^\n.!?。！？؟।]+[.!?。！？؟।]?/gu;
function filesUnder(dir, n) {
  const out = [];
  const walk = (d) => { if (out.length >= n) return; let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } es.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)); for (const e of es) { if (out.length >= n) return; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".txt")) out.push(p); } };
  walk(dir);
  return out;
}
const N = [];
let scanned = 0;
for (const top of ["02-encyclopedic", "05-academic-papers", "08-news-current", "11-multi-language"]) {
  for (const f of filesUnder(path.join(ZEN, top), 400)) {
    let text; try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
    scanned++;
    for (const m of text.matchAll(SENT)) {
      const s = m[0].trim();
      if (s.length < 3 || QUESTION_MARK.test(s)) continue;
      const p = notationParts(s);
      if (p && !p.gap) N.push({ file: path.relative(ZEN, f), s: s.slice(0, 160), frame: p.frameWords });
    }
  }
}

const fd = P_dev.map(askFrame), fh = P_held.map(askFrame);
const Nstar = Math.max(...fd);
const recall = (fr, b) => fr.filter((x) => x <= b).length / fr.length;
const accept = (b) => (N.length ? N.filter((x) => x.frame <= b).length / N.length : null);
const declared = NOTATION_FRAME_BOUND();
const adopt = recall(fh, Nstar) >= 0.95 && (accept(Nstar) ?? 0) <= (accept(declared) ?? 0);
const hist = (fr) => { const h = {}; for (const x of fr) h[x] = (h[x] ?? 0) + 1; return h; };
const out = {
  prereg: "eval/notation/FRAME-PREREG.md @ cd03b6b5",
  P_dev: { n: P_dev.length, frames: hist(fd), max: Nstar },
  P_held: { n: P_held.length, frames: hist(fh), recallAtNstar: recall(fh, Nstar), recallAtDeclared: recall(fh, declared) },
  N: { filesScanned: scanned, n: N.length, frames: hist(N.map((x) => x.frame)), acceptAtNstar: accept(Nstar), acceptAtDeclared: accept(declared), sample: N.filter((x) => x.frame <= Math.max(Nstar, declared)).slice(0, 8) },
  declared, Nstar, adopt,
  falsified: recall(fh, Nstar) < 0.95 ? "P_held recall below 0.95: the bound is not earned" : (accept(adopt ? Nstar : declared) ?? 0) > 0.5 ? "N acceptance above 0.5: the frame bound does not separate asks from statements" : null,
};
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(new URL("./frame-bound-RESULT.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
