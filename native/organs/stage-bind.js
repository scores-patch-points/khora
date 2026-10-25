// stage-bind.js — the INS cell of the stage check: which source anchor each claim end is (the stage spec, §7, law 3).
//
// Binding is its own cell, before any verdict. Its product is a map from claim anchor ids to source anchor ids and the typed gaps of the ends
// it could not bind; an end that does not bind is simply absent from the map, so every atom over it reads beyond-reach and no later cell can
// upgrade it. The reserved anchor `holds` binds itself.
//   bindNone(claim, source)            no binding at all: every claim atom is beyond reach (the check of law 1)
//   bindFolded(claim, source)          LEGACY: an end binds the source anchor of its kind that shares a folded name (the string identity of
//                                      stageFromEdges's default, marked so on the binding); kept for comparison, never the arm's binding
// Each returns { how, map: Map(claimId → sourceId), gaps: [{ kind, anchor, detail }] }.
import { HOLDS, fold } from "./stage.js";

const sorted = (xs) => [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export function bindNone(claim) {
  const map = new Map(), gaps = [];
  for (const a of claim.anchors) if (a.id === HOLDS) map.set(HOLDS, HOLDS); else gaps.push({ kind: "no_correspondence", anchor: a.id, detail: "no binding cell ran" });
  return { how: "none", map, gaps };
}

export function bindFolded(claim, source) {
  const map = new Map(), gaps = [], S = sorted(source.anchors);
  for (const a of claim.anchors) {
    if (a.id === HOLDS) { map.set(HOLDS, HOLDS); continue; }
    const names = new Set(a.names.map(fold));
    const hit = S.find((b) => b.kind === a.kind && b.names.some((n) => names.has(fold(n))));
    if (hit) map.set(a.id, hit.id); else gaps.push({ kind: "no_correspondence", anchor: a.id, detail: "no source anchor shares a folded name" });
  }
  return { how: "folded-string", map, gaps };
}
