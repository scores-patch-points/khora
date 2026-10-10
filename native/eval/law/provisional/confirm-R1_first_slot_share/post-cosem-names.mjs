// post-cosem-names.mjs — POST-HOC descriptive (no verdict weight): where do the nick-like forms seen in CoSEM sit with respect to the first-word slot? End-of-stream counts only.
import fs from "node:fs";
import { toks, streamIndex, ishare } from "./lib.mjs";
const DIR = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/cosem", T = [];
for (const f of fs.readdirSync(DIR).filter((x) => x.startsWith("17CF03")).sort()) { const L = fs.readFileSync(`${DIR}/${f}`, "utf8").split("\n"); let n = 0, k = 0; for (; k < L.length; k++) if (L[k] === "---" && ++n === 2) break; for (const l of L.slice(k + 1)) { const t = toks(l); if (t.length) T.push(t); } }
const ix = streamIndex(T), M = T.length;
for (const w of ["jy", "tjm", "ky", "lhl", "ch", "omg", "haha", "hahaha", "yes", "wah", "hai"]) console.log(w.padEnd(8), "msgs containing", ix.msgIdx.get(w)?.length ?? 0, "first-word", ix.initIdx.get(w)?.length ?? 0, "final ISHARE", ishare(ix, w, M).toFixed(3));
