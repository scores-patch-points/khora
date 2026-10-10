// explore-limits.mjs — POST-VERDICT DESCRIPTIVE look at R1's limits on the CONFIRM days (natural prevalence, unmatched): which forms are false positives / misses, and how recall depends on history length. No verdict, no new claim.
import { daysOf, docOf } from "./collect.mjs";
import { buildIndex } from "./index.mjs";
const lbound = (a, x) => { if (!a) return 0; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
const G = { EN: (d) => d.lang === "en", DE: (d) => d.channel === "ubuntu-de", ES: (d) => d.channel === "ubuntu-es", IT: (d) => d.channel === "ubuntu-it" };
const out = {};
for (const [g, f] of Object.entries(G)) {
  const fp = new Map(), fn = new Map(), hist = { "0-99": [0, 0], "100-499": [0, 0], "500-1999": [0, 0], "2000+": [0, 0] }, hfp = { "0-99": [0, 0], "100-499": [0, 0], "500-1999": [0, 0], "2000+": [0, 0] };
  for (const d of daysOf("confirm").filter(f)) {
    const doc = docOf(d), ix = buildIndex(doc.T), seen = new Map();
    doc.T.forEach((m, k) => m.forEach((w, i) => {
      const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk < 1) return;
      const nick = doc.nicks.has(w), c = nick ? (!doc.topic.has(w) && w !== doc.S[k] ? 1 : null) : [...w].length >= 3 ? 0 : null; if (c == null) return;
      const s = (lbound(ix.initIdx.get(w), k) + 1) / (lbound(ix.msgIdx.get(w), k) + 2), flag = s >= 0.67, b = k < 100 ? "0-99" : k < 500 ? "100-499" : k < 2000 ? "500-1999" : "2000+";
      if (c === 1) { hist[b][1]++; if (flag) hist[b][0]++; else fn.set(w, (fn.get(w) ?? 0) + 1); } else { hfp[b][1]++; if (flag) { hfp[b][0]++; fp.set(w, (fp.get(w) ?? 0) + 1); } }
    }));
  }
  const top = (m, n = 30) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w, c]) => `${w}:${c}`).join(" ");
  out[g] = { recallByMessageIndex: Object.fromEntries(Object.entries(hist).map(([b, [a, n]]) => [b, `${a}/${n}=${(a / Math.max(1, n)).toFixed(2)}`])), fpRateByMessageIndex: Object.fromEntries(Object.entries(hfp).map(([b, [a, n]]) => [b, `${a}/${n}=${(a / Math.max(1, n)).toFixed(4)}`])), topFP: top(fp), topMissed: top(fn) };
}
console.log(JSON.stringify(out, null, 1));
