// summariseA2.mjs -- A by class: for chosen variants, per (grain/register class) the base P+/P- pockets: n run, sign agreement, still PRESENT same sign, median v base vs variant. -> A2_summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, median } from "./lib.mjs";
const rows = []; for (const f of fs.readdirSync(HERE).filter((x) => /^A_raw_\d+\.jsonl$/.test(x)).sort()) for (const l of fs.readFileSync(path.join(HERE, f), "utf8").split("\n").filter(Boolean)) rows.push(JSON.parse(l));
const cls = (r) => (r.grain === "code" ? "code" : r.grain === "word" ? "word:" + (["chat", "academic", "novel", "dialect", "drama", "children", "translation", "poetry", "treebank", "memoir"].includes(r.register) ? "plusReg" : ["scripture", "legal", "treatise"].includes(r.register) ? "liturgicalLegal" : "otherWord") : r.grain);
const out = {};
for (const name of ["len10", "t7500m10_r0", "t20000m10_r0", "tok7500_r0", "tok20000_r0", "dedup", "xhap", "xcont", "xlin"]) {
  out[name] = {};
  for (const st of ["P+", "P-"]) for (const r of rows.filter((r) => r.status0 === st)) {
    const v = r.variants[name], key = `${st} ${cls(r)}`; out[name][key] ||= { n: 0, run: 0, sign: 0, keep: 0, v0: [], v1: [] };
    const o = out[name][key]; o.n++; if (!v || v.skipped || v.v == null) continue; o.run++; if (Math.sign(v.v) === Math.sign(r.v0)) o.sign++; if (v.status === st) o.keep++; o.v0.push(r.v0); o.v1.push(v.v);
  }
  for (const o of Object.values(out[name])) { o.medianV0 = o.v0.length ? +median(o.v0).toFixed(4) : null; o.medianV = o.v1.length ? +median(o.v1).toFixed(4) : null; delete o.v0; delete o.v1; }
}
fs.writeFileSync(path.join(HERE, "A2_summary.json"), JSON.stringify(out, null, 1));
for (const [n, o] of Object.entries(out)) { console.log("==", n); for (const [k, v] of Object.entries(o)) console.log("  ", k.padEnd(28), `n ${v.n} run ${v.run} sign ${v.sign} keepP ${v.keep} medV0 ${v.medianV0} medV ${v.medianV}`); }
