import { load } from "../../../loaders/planted.mjs";
import { discoverCap, cpuMs } from "./_t_util.mjs";
import { prep } from "../../_phys_prep.mjs";
import { gravStats } from "../../_phys_grav.mjs";
const ps = await load(process.argv.slice(2).length ? process.argv.slice(2) : ["pl-null", "pl-burst", "pl-markov", "pl-frames", "pl-parallel", "pl-null2"]);
for (const p of ps) { const P = prep(discoverCap(p, 50000)), t = cpuMs(() => gravStats(P)); console.log(p.id, P.N, Math.round(t.cpu) + "ms", JSON.stringify(t.r)); }
