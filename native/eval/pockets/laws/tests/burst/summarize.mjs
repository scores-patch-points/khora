// Collects the test outputs of the "burst" family into summary.json: PRESENT cells (|z| >= 4, same sign, in both slices), iid-world false-positive rate, calibration, timing, size.
import fs from "node:fs";
const ids = ["burstB","burstBmid","burstM","repAdj","kerSlope","kerCurv","kerFar","persist","driftSlope","driftTail","hurst"];
const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const slices = ["a", "b", "c", "d"].flatMap((n) => rd(`planted-${n}.json`)).concat(rd("real-ge.json"), rd("real-dracula.json"));
const byPocket = {}; for (const r of slices) (byPocket[r.pocket] ??= []).push(r);
const sum = { cells: {}, iid: {}, calibration: {}, timing: rd("checks-timing.json"), determinism: rd("checks-determinism.json"), size: rd("checks-size.json"), edge: Object.fromEntries(Object.entries(rd("checks-edge.json")).map(([k, v]) => [k, v.error ? v : { nonFinite: v.nonFinite, nullStats: v.nulls }])) };
for (const [p, rs] of Object.entries(byPocket)) {
  sum.cells[p] = {}; for (const s of ids) { const z = rs.map((r) => r.stats[s].z), v = rs.map((r) => r.stats[s].v); const present = z.every((x) => x != null && Math.abs(x) >= 4) && Math.sign(z[0]) === Math.sign(z[1]); sum.cells[p][s] = { v: v.map((x) => (x == null ? null : +x.toFixed(4))), z: z.map((x) => (x == null ? null : +x.toFixed(2))), status: present ? (z[0] > 0 ? "PRESENT+" : "PRESENT-") : z.every((x) => x != null && Math.abs(x) < 2) ? "ABSENT" : "AMBIGUOUS" }; }
}
for (const p of ["pl-null", "pl-null2"]) { let n = 0, big = 0, big3 = 0; for (const r of byPocket[p]) for (const s of ids) { const z = r.stats[s].z; if (z == null) continue; n++; if (Math.abs(z) >= 4) big++; if (Math.abs(z) >= 3) big3++; } sum.iid[p] = { cellsWithZ: n, absZge4: big, absZge3: big3 }; }
const C = [...rd("calib-a.json"), ...rd("calib-b.json")], ex = C.filter((c) => c.id !== "pl-markov");
for (const s of ids) { const zs = ex.map((c) => c.z[s]).filter((x) => x != null); const m = zs.reduce((a, b) => a + b, 0) / zs.length; sum.calibration[s] = { slices: zs.length, absZge3: zs.filter((x) => Math.abs(x) >= 3).length, absZge4: zs.filter((x) => Math.abs(x) >= 4).length, sdOfZ: +Math.sqrt(zs.reduce((a, b) => a + (b - m) ** 2, 0) / (zs.length - 1)).toFixed(2), meanZ: +m.toFixed(2) }; }
sum.calibration._note = "calib-*.json: 12-slice set of exchangeable-unit worlds (pl-null, pl-null2, pl-length) + pl-markov (excluded here: its within-unit flow is a planted law for the kernel statistics); z uses the first 10 of 40 null draws, as the atlas does";
fs.writeFileSync("summary.json", JSON.stringify(sum, null, 1));
const w = (x, n) => String(x).padEnd(n);
console.log(w("pocket", 12) + ids.map((s) => s.padStart(11)).join(""));
for (const p of Object.keys(sum.cells)) console.log(w(p, 12) + ids.map((s) => ({ "PRESENT+": "+", "PRESENT-": "-", ABSENT: "0", AMBIGUOUS: "?" }[sum.cells[p][s].status]).padStart(11)).join(""));
console.log(JSON.stringify(sum.iid), JSON.stringify(sum.calibration));
