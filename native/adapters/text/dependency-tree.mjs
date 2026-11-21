// dependency-tree.mjs — the full dependency tree as THE reading: every token, every head/deprel,
// nested so no word is lost (GL-TH-15). The parse rows are flat {id, head, deprel}; this folds them
// into a tree where each node carries its dependents. The ground truth a projection is diffed against.
//
// treeOf(rows) -> { form, upos, deprel, karaka, head, id, children: [...] }
// The root is the row with head === 0.

export function treeOf(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const children = new Map();
  for (const r of rows) {
    const h = r.head;
    if (!children.has(h)) children.set(h, []);
    children.get(h).push(r.id);
  }
  const build = (id) => {
    const r = byId.get(id);
    if (!r) return null;
    const kids = (children.get(id) ?? []).sort((a, b) => a - b);
    return {
      id: r.id, form: r.form, lemma: r.lemma ?? null, upos: r.upos ?? null,
      deprel: r.deprel ?? null, karaka: r.karaka ?? null, head: r.head,
      children: kids.map(build).filter(Boolean),
    };
  };
  const root = rows.find((r) => r.head === 0);
  return root ? build(root.id) : null;
}

/** Count the tokens a tree holds (must equal rows.length for a lossless tree). */
export function treeSize(tree) {
  if (!tree) return 0;
  return 1 + tree.children.reduce((n, c) => n + treeSize(c), 0);
}

/** Max nesting depth of a tree. */
export function treeDepth(tree) {
  if (!tree) return 0;
  return 1 + tree.children.reduce((m, c) => Math.max(m, treeDepth(c)), 0);
}

/** Flatten a tree back to a list of {id, head, deprel, karaka} — must equal the input rows (lossless). */
export function flattenTree(tree, out = []) {
  if (!tree) return out;
  out.push({ id: tree.id, head: tree.head, deprel: tree.deprel, karaka: tree.karaka, form: tree.form });
  for (const c of tree.children) flattenTree(c, out);
  return out;
}
