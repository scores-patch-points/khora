// provisional/polarity-map/robust.mjs — POST-HOC robustness of Rule 2's property gradient on the confirmation AND discovery cells (descriptive; not part of any verdict). New file.
// Leave-one-family-out Spearman of rareL_edge vs AUC(DLx) with a one-sided permutation p (B=2000). Written AFTER verdict.json; disclosed as post-hoc.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { rngFor, seedFor, round, mean } from "./lib.mjs";
const RES = path.join(path.dirname(fileURLToPath(import.meta.url)), "results");
const read = (pre) => fs.readdirSync(RES).filter((f) => new RegExp(`^${pre}\\..*\\.jsonl$`).test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j + 1) / 2; i = j; } return r; };
const spear = (a, b) => { const ra = rank(a), rb = rank(b), ma = mean(ra), mb = mean(rb); let s = 0, x = 0, y = 0; for (let i = 0; i < ra.length; i++) { s += (ra[i] - ma) * (rb[i] - mb); x += (ra[i] - ma) ** 2; y += (rb[i] - mb) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; };
const perm = (x, y, tag) => { const obs = spear(x, y), rnd = rngFor(seedFor("polarity-map-confirm", "robust", tag)); let ge = 0; for (let b = 0; b < 2000; b++) { const idx = y.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } if (spear(x, idx.map((i) => y[i])) >= obs) ge++; } return { rho: round(obs), p: round((ge + 1) / 2001), n: x.length }; };
const CL = { ud: "PO", irc: "NK", book: "NAMES", code: "PE" }, out = {};
function points(cells, props) { const pts = []; for (const c of cells) if (c.feats && c.ctl === "real" && c.mode === "FULL" && c.def === CL[c.fam] && c.pairs >= 60 && c.posControlOk && c.reg !== "ud-cmn-hans" && typeof props[c.reg]?.rareL_edge === "number") pts.push({ f: c.fam, x: props[c.reg].rareL_edge, y: c.feats.DLx.auc, r: c.reg }); return pts; }
const conf = read("conf"), confProps = Object.fromEntries(conf.filter((r) => r.props).map((r) => [r.reg, r.props]));
const P2 = JSON.parse(fs.readFileSync(path.join(RES, "props2.disc.json"), "utf8")), disc = read("e");
for (const [tag, pts] of [["confirm", points(conf, confProps)], ["discovery", points(disc, P2)]]) {
  out[tag] = {}; for (const [name, keep] of [["all", () => true], ["noIRC", (p) => p.f !== "irc"], ["noCode", (p) => p.f !== "code"], ["noIRC+noCode (UD+books)", (p) => p.f === "ud" || p.f === "book"], ["UD only", (p) => p.f === "ud"], ["UD+IRC", (p) => p.f === "ud" || p.f === "irc"], ["UD+code", (p) => p.f === "ud" || p.f === "code"]]) { const s = pts.filter(keep); out[tag][name] = perm(s.map((p) => p.x), s.map((p) => p.y), `${tag}:${name}`); }
}
fs.writeFileSync(path.join(RES, "robust.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
