// atom-select.js — which of a sentence's atoms (atoms.js) to keep, by a LEARNED score: an averaged perceptron trained on judges' verdicts
// (stated / wrong) over earlier held-out sets. Each atom is described by its shape (what kind of predicate, what its arguments are, where it
// came from, how much of the sentence it spans); the weights say which shapes the judges found stated. No rule here names a shape to drop.
//   atomFeatures(atom, { sentence, atoms, title, lang }) → [feature]
//   keepAtoms(atoms, ctx, model) → the atoms whose score passes the model's threshold, each with its score
const bucket = (n, cuts) => { for (const c of cuts) if (n <= c) return String(c); return `>${cuts.at(-1)}`; };
const low = (s) => String(s ?? "").normalize("NFC").toLowerCase();
const argName = (a) => (a && typeof a === "object" ? a.name ?? a.value ?? "" : String(a ?? ""));

export function kindOf(atom) {
  const p = atom.pred ?? "";
  if (p === "is_a" || p === "named") return p;
  if (/^has_/.test(p)) return "figure";
  if ((atom.args ?? []).length === 1) return "adjective";
  if (/^(most|more|less|least):/.test(p)) return "degree";
  if (/^[\p{L}]{1,4}$/u.test(p) && !/_/.test(p)) return "case";
  return /_/.test(p) ? "relation_case" : "relation";
}
export function atomFeatures(atom, { sentence = "", atoms = [], title = "", lang = "en" } = {}) {
  const k = kindOf(atom), args = atom.args ?? [], text = atom.text ?? "";
  const span = atom.start != null && atom.end != null ? atom.end - atom.start : 0, L = Math.max(1, sentence.length);
  const f = [`kind=${k}`, `from=${String(atom.from ?? "-").replace(/\d+$/, "")}`, `fromN=${/\d+$/.exec(atom.from ?? "")?.[0] ?? "-"}`,
    `nargs=${args.length}`, `neg=${atom.neg ? 1 : 0}`, `hedged=${atom.hedged ? 1 : 0}`, `approx=${atom.approx ? 1 : 0}`,
    `span=${bucket(span, [0, 10, 25, 60, 120])}`, `spanShare=${bucket(Math.round((10 * span) / L), [1, 3, 6, 9])}`,
    `inSentence=${bucket(atoms.length, [2, 5, 10, 20])}`, `dup=${atoms.filter((a) => a !== atom && a.text === text).length ? 1 : 0}`];
  if (k === "case" || k === "relation_case" || k === "relation") f.push(`pred=${low(atom.pred)}`);
  args.forEach((a, i) => {
    const n = argName(a), ent = a && typeof a === "object" && a.entity != null;
    f.push(`a${i}=${ent ? "ent" : /^[\d.,\s%-]+$/.test(n) ? "num" : "val"}`, `a${i}len=${bucket(n.split(/\s+/).filter(Boolean).length, [1, 2, 4, 8])}`,
      `a${i}cap=${/^\p{Lu}/u.test(n.replace(/^(the|el|la|le|les|los|las|der|die|das|l')\s+/i, "")) ? 1 : 0}`, `a${i}page=${title && low(n).includes(low(title).split(/[ ,(]/)[0]) ? 1 : 0}`,
      `a${i}odd=${/[^\p{L}\p{N}\s.,'’&-]/u.test(n) ? 1 : 0}`, `a${i}inText=${n && sentence.includes(n) ? 1 : 0}`);
  });
  if (args.length >= 2 && argName(args[0]) && low(argName(args[0])) === low(argName(args[1]))) f.push("selfLoop");
  const out = []; for (const x of f) out.push(x, `${k}|${x}`, `${lang}|${x}`);
  out.push("bias", `bias|${k}`, `bias|${lang}`);
  return out;
}
export const scoreAtom = (fs, model) => fs.reduce((a, x) => a + (model?.w?.[x] ?? 0), 0);
export function keepAtoms(atoms, ctx, model) {
  return atoms.map((a) => ({ ...a, keep: scoreAtom(atomFeatures(a, { ...ctx, atoms }), model) })).filter((a) => a.keep > (model?.threshold ?? 0));
}
export function trainSelector(examples, { epochs = 10, seed = 5 } = {}) {
  const w = {}, tot = {}, ts = {}; let t = 0, r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const upd = (fs, d) => { for (const x of fs) { tot[x] = (tot[x] ?? 0) + (t - (ts[x] ?? 0)) * (w[x] ?? 0); ts[x] = t; w[x] = (w[x] ?? 0) + d; } };
  for (let ep = 0; ep < epochs; ep++) for (const [fs, y] of [...examples].sort(() => rand() - 0.5)) { t++; if ((fs.reduce((a, x) => a + (w[x] ?? 0), 0) > 0) !== y) upd(fs, y ? 1 : -1); }
  const avg = {}; for (const x of Object.keys(w)) { const a = ((tot[x] ?? 0) + (t - (ts[x] ?? 0)) * w[x]) / Math.max(1, t); if (Math.abs(a) > 1e-9) avg[x] = +a.toFixed(5); }
  return { schema: "AtomSelector@1", w: avg, threshold: 0 };
}
