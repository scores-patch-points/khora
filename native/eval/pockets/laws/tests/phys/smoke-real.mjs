import { bookView, cpuMs, tokensOf, round } from "./_t_util.mjs";
import { compute } from "../../phys.mjs";
const BOOK = "01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", BIG = "01-literature-books/gutenberg/pg145_Middlemarch-George-Eliot.txt";
for (const [rel, id, cap] of [[BOOK, "real-pride", 50000], [BIG, "real-middlemarch", 150000]]) {
  const v = bookView(rel, id, cap), runs = [0, 1, 2].map(() => cpuMs(() => compute(v)));
  console.log(id, tokensOf(v), "tokens", v.units.length, "units", new Set(v.docOf).size, "docs", runs.map((r) => Math.round(r.cpu)).join("/"), "ms cpu");
  console.log(JSON.stringify(Object.fromEntries(Object.entries(runs[0].r).map(([k, x]) => [k, round(x, 4)]))));
}
