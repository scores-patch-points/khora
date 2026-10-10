// exploration: is edgeGap / initEnt biased on iid worlds? observed v only, many replicates. node explore-edge.mjs
import { iidWorld } from "./_t_worlds.mjs";
import * as fam from "../../comp.mjs";
const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length, sd = (a) => Math.sqrt(a.reduce((p, q) => p + (q - mean(a)) ** 2, 0) / (a.length - 1));
const eg = [], ie = [], fe = [];
for (let r = 0; r < 300; r++) { const c = fam.compute(iidWorld(`edge${r}`, 30000, r % 2 ? { len: "D2", alpha: 1.3 } : { len: "D1", alpha: 1.0 })); eg.push(c.edgeGap); ie.push(c.initEnt); fe.push(c.finEnt); }
console.log("edgeGap mean", mean(eg).toFixed(4), "sd", sd(eg).toFixed(4), "se", (sd(eg) / Math.sqrt(eg.length)).toFixed(4), "| initEnt - finEnt mean", mean(ie.map((x, i) => x - fe[i])).toFixed(4), "sd", sd(ie.map((x, i) => x - fe[i])).toFixed(4));
