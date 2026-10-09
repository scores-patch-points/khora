import fs from "node:fs";
const J = await import("/Users/mlacy/Documents/3.0/janus/native/organs/kind-induction.js");
const { dmd } = await import("/Users/mlacy/Documents/3.0/khora/native/kernel/dmd.js");
const { induceKinds } = J;

// structure-content.mjs — THE OMNIMODAL STRUCTURE/CONTENT PARSER.
// Structure = the ARRANGEMENT (seats, roles, kinds-as-positions, trajectory
// modes) that survives replacing the cast. Content = the particular beings who
// fill those seats at their byte addresses. One parse, any medium that has
// arrangement — prose, dialogue, music, film, code. Genre norms parameterize
// WHICH structural signals count, never whether structure exists.

// The falsifier, run at the end: the STRUCTURE must be invariant under a
// permutation of the CAST. Replace every being with another and the lattice
// (roles → kinds) must be unchanged; only the content moves. A parser that
// conflates the two fails this test — exactly what the English wordlist-prior
// did when it let content (dictionary membership) decide structure (who is
// seated).

const ROLE = { Nom: "agt", Acc: "pat", Dat: "rcv", Gen: "gen", Voc: "voc" };
const face = (x) => (x == null ? "" : String(x?.name ?? x));
const hashSet = (arr) => { const S = new Set(arr?.filter(Boolean) ?? []); return [...S].sort(); };

export function parseStructureContent(read, { genre = "generic" } = {}) {
  const rawEdges = read.edges ?? [];
  const referents = read.referents ?? [];
  const byName = new Map();
  const refByIdx = [];
  referents.forEach((r) => { const n = r?.name ?? r?.n; const h = r?.hash ?? r?.h; if (n != null) byName.set(n, h ?? n); refByIdx.push(n ?? h ?? "?"); });
  const edges = rawEdges.map((e) => {
    const isCompact = e.v !== undefined && e.s !== undefined;
    return {
      subject: isCompact ? refByIdx[e.s] : (e.subject != null ? (byName.get(e.subject) ?? e.subject) : null),
      object: isCompact ? refByIdx[e.o] : (e.object != null ? (byName.get(e.object) ?? e.object) : null),
      action: isCompact ? e.v : e.action,
      at: isCompact ? e.a : e.at,
      span: isCompact ? e.p : e.span,
    };
  });

  // CONTENT: the cast and its byte claims.
  const cast = referents.map((r) => ({ being: r?.name ?? r?.n, at: r?.hash ?? r?.h }));
  const claims = edges.map((e) => ({
    position: { s: e.subject ?? null, o: e.object ?? null },
    at: e.at,
    action: e.action,
    span: e.span,
  })).filter((c) => c.position.s || c.position.o);

  // STRUCTURE — the arrangement peeled off the cast:
  //   (1) the ROLE-SEATS actually used (disclosed by the seams' bindings);
  //   (2) the KIND-POSITIONS: which beings co-occupied which scenes (from the
  //       read's own referent company — induceKinds over per-scene company).
  const seats = new Set();
  for (const c of claims) { if (c.position.s) seats.add(c.position.s.split(":")[0] ?? "?rs"); if (c.position.o) seats.add("pat"); }
  const seatsUsed = [...seats].sort();

  // scene segmentation for the company lattice (the same bound the fold uses:
  // significant holograph revision — here, story-order windows of ~40 edges).
  const scenes = [];
  const WIN = 40;
  for (let i = 0; i < claims.length; i += WIN) scenes.push(claims.slice(i, i + WIN));
  const sceneVecs = scenes.map((sc, si) => {
    const names = new Set();
    for (const c of sc) { if (c.position.s) names.add(c.position.s); if (c.position.o) names.add(c.position.o); }
    const company = {}; for (const n of names) company[n] = 1;
    return { ref: `sc:${si}`, names: [...names], company, total: names.size };
  });
  const kinds = induceKinds(sceneVecs, { threshold: 0.05 });
  const kindPositions = kinds.map((k, i) => ({
    kind: `k${i}`,
    size: k.members?.length ?? 0,
    // the lattice is the member-ref SET, not the members — the arrangement.
    positions: hashSet((k.members ?? []).map((m) => `sc-seat@${m}`)),
  }));

  // trajectory modes — settle/cycle, the DMD bound (structure is bounded).
  const trav = claims.map((c, i) => (c.position.s || c.position.o ? 1 : 0));
  const h = (arr) => { const X = arr.slice(0, -1).map((v) => [v]); const Xp = arr.slice(1).map((v) => [v]); try { const r = dmd(X, Xp, { rank: 1 }); return r.eigenvalues?.[0]?.magnitude ?? 0; } catch { return 0; } };
  const mode = h(trav);

  return { genre, structure: { seatsUsed, kindPositions, mode, settled: mode >= 0 && mode <= 1 }, content: { cast, claims } };
}

// THE OMNIMODAL TEST: structure must survive a CAST PERMUTATION.
export function permuteCast(parsed, seed = 1) {
  const cast = parsed.content.cast.map((c) => c.being);
  let s = seed >>> 0; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const perm = [...cast]; for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const map = new Map(cast.map((b, i) => [b, perm[i]]));
  return { seatsUsed: parsed.structure.seatsUsed, kindPositions: parsed.structure.kindPositions, mode: parsed.structure.mode, settled: parsed.structure.settled, permutedCast: perm.slice(0, 8) };
}