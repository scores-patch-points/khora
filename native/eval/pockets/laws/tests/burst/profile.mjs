// prints the repeat-kernel profile (observed P, chance P, ln lift per d) for slices of a real book and of planted worlds
import { load as lp } from "../../../loaders/planted.mjs";
import { load as lb } from "../../../loaders/books.mjs";
import { halves } from "../../../lib/pocket.mjs";
import { prep } from "../../_burst_prep.mjs";
import { kernelDetail } from "../../_burst_kernel.mjs";
const show = (name, units, docOf) => { const P = prep({ units, docOf }), k = kernelDetail(P); console.log(name, "N=" + P.N); console.log("  d      " + k.map((r) => String(r.d).padStart(7)).join("")); console.log("  Pobs   " + k.map((r) => (r.hits / P.N).toFixed(4).padStart(7)).join("")); console.log("  Pchance" + k.map((r) => (r.expected / P.N).toFixed(4).padStart(7)).join("")); console.log("  lnLift " + k.map((r) => r.lift.toFixed(3).padStart(7)).join("")); };
const cap = (u, d, n) => { let t = 0, e = u.length; for (let i = 0; i < u.length; i++) { t += u[i].length; if (t >= n && d[i + 1] !== d[i]) { e = i + 1; break; } } return [u.slice(0, e), d.slice(0, e)]; };
for (const id of ["bk-great-expect"]) { const [p] = await lb([id]); const H = halves(p); show(id, ...cap(H.discover.units, H.discover.docOf, 50000)); }
for (const id of ["pl-null", "pl-burst", "pl-markov", "pl-frames", "pl-parallel"]) { const [p] = await lp([id]); show(id, ...cap(p.units, p.docOf, 50000)); }
