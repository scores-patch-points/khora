import fs from "node:fs";
const R = JSON.parse(fs.readFileSync(new URL("./results-real.json", import.meta.url), "utf8"));
for (const [id, b] of Object.entries(R.books)) {
  console.log("==", id, b.tokens, "tokens", b.units, "units", b.cpuMs, "ms cpu; hard rigid", JSON.stringify(b.rigidHard));
  const cols = [["real", b.cells], ...Object.entries(b.controls).map(([k, c]) => [k, c.cells])];
  console.log("stat".padEnd(9), cols.map(([k]) => k.padEnd(22)).join(""));
  for (const s of Object.keys(b.cells)) console.log(s.padEnd(9), cols.map(([, c]) => `${c[s].v ?? "-"}/${c[s].z ?? "-"}`.padEnd(22)).join(""));
}
