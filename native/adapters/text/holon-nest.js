// holon-nest.js — nested holons: a whole that is a part of a larger whole, to any depth (identity/novels/PREREG-ROUND28.md).
// A holon has an id, a label, the class names it is an instance of, and parents (the larger wholes it sits in). Nothing here is about places: the same nest holds day inside month inside year, or token inside claim inside text.
// A path runs leaf to root: index 0 is the holon itself, the last index the whole that is part of nothing larger in this nest.

// The path of a holon to its root. A holon can list several parents (a city in its county AND in its state): parents that are themselves ancestors of another listed parent are redundant and dropped (transitive reduction); if more than one parent remains, the nest is ambiguous here and no path is made.
export function pathOf(nodes, id, { maxDepth = 24 } = {}) {
  const path = []; const seen = new Set(); let cur = id;
  while (cur != null) {
    if (seen.has(cur) || path.length > maxDepth) return { ok: false, why: "cycle or too deep" }; seen.add(cur); const n = nodes[cur]; if (!n) return { ok: false, why: `unknown holon ${cur}` };
    path.push(cur); const ps = (n.parents ?? []).filter((p) => nodes[p]);
    if (!ps.length) break;
    const anc = (x) => { const s = new Set(); let c = [x]; while (c.length) { const y = c.pop(); for (const p of nodes[y]?.parents ?? []) if (!s.has(p)) { s.add(p); c.push(p); } } return s; };
    const keep = ps.filter((p) => !ps.some((q) => q !== p && anc(q).has(p)));
    if (keep.length !== 1) return { ok: false, why: "more than one parent that is not an ancestor of another" };
    cur = keep[0];
  }
  return { ok: true, path };
}
export const insideOf = (path, a, b) => { const ia = path.indexOf(a), ib = path.indexOf(b); return ia >= 0 && ib >= 0 && ia < ib; };      // a is strictly inside b on this path
// the lowest holon both paths share (their shared ground); the index in path A, or -1
export function sharedGround(pathA, pathB) { const s = new Set(pathB); const i = pathA.findIndex((x) => s.has(x)); return i; }
