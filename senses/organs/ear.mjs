// senses/organs/ear.mjs — the EAR organ: Alcmaeon over a recording's bytes.
//
// An organ NOMINATES; it never decides meaning (senses/registry.mjs). This one returns `text: ""` and its reading in `meta`,
// exactly as cv-khora and sips do, for a reason that is load-bearing here: deltaOf() scores every organ that has `text`
// against the others and the representative ground is the best-agreeing text, and a ground is always the source's OWN
// characters. A description of sound is measured, not written by the source, so it must never enter that comparison.
//
// What it measures is S2 (the heard stratum), mechanical, and says so; any sound LABELS from a model would be S3 proposals
// kept apart (none are produced here). Sections need `surf`, which khora's engine does not carry (the retired eoreader6.1
// loop is refused by native/scripts/check-no-legacy-submodule.mjs), so by default the ear sections by silence and by change
// of sound class only, and says that timbre edges were skipped. If a surf is later promoted into native/legacy-ported, the
// organ picks it up from there with no change (see engineSurf).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const A = require("../vendor/alcmaeon.cjs");
export const EAR_VERSION = `khora-ear@0.1+alcmaeon@${A.VERSION}`;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.resolve(HERE, "../../native/legacy-ported");

let engine;
async function engineSurf() { // khora's own engine only; absent today, so this resolves to null and listen() reports the gap
  if (engine !== undefined) return engine;
  try {
    const s = await import(pathToFileURL(path.join(ENGINE, "packages/engine/loops/surf.js")).href), n = await import(pathToFileURL(path.join(ENGINE, "nul/index.js")).href);
    engine = { surf: s.surf, isGap: n.isGap };
  } catch { engine = null; }
  return engine;
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const toGap = (g) => ({ reason: `${slug(g.what)}_not_assessed`, detail: g.why });

/** bytes -> 16 kHz mono float32 chunks through ffmpeg; a float cut in two by the pipe is carried to the next chunk */
function decode(bytes, ear) {
  return new Promise((resolve) => {
    const p = spawn("ffmpeg", ["-v", "error", "-i", "pipe:0", "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"]);
    let rest = Buffer.alloc(0), err = "", heard = 0;
    p.stdout.on("data", (c) => {
      const b = rest.length ? Buffer.concat([rest, c]) : c, whole = b.length - (b.length % 4);
      rest = whole < b.length ? Buffer.from(b.subarray(whole)) : Buffer.alloc(0);
      if (whole) { const f = new Float32Array(whole / 4); for (let i = 0; i < f.length; i++) f[i] = b.readFloatLE(i * 4); heard += f.length; ear.hear(f); }
    });
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", () => resolve({ code: -1, heard: 0, err: "spawn failed" }));
    p.on("close", (code) => resolve({ code, heard, err }));
    p.stdin.on("error", () => {});
    p.stdin.end(bytes);
  });
}

export async function earOrgan(bytes, { name = "material" } = {}) {
  const ear = A.createEar();
  const d = await decode(bytes, ear);
  if (d.code === -1) return { text: "", via: "alcmaeon", gaps: [{ reason: "ear_decode_unavailable", detail: "ffmpeg not installed: nothing was heard" }] };
  if (!d.heard || d.code !== 0 && !ear.n) return { text: "", via: "alcmaeon", gaps: [{ reason: "ear_nothing_heard", detail: String(d.err).slice(0, 200) || "ffmpeg decoded no audio" }] };
  const r = ear.readings(), eng = await engineSurf(), L = A.listen(r, { surf: eng?.surf, isGap: eng?.isGap });
  const sil = A.silences(r), t = (x) => (x ? { bpm: x.bpm, attested: x.attested, alt: x.alt } : null), k = (x) => (x ? { key: x.key, r: x.r, aboveChance: x.aboveChance, next: x.candidates[1]?.key } : null);
  const meta = {
    schema: "KhoraEar@1", organ: "alcmaeon", version: EAR_VERSION, stratum: L.stratum, by: L.by, standing: L.standing,
    duration: r.duration, clipFraction: r.clipFrac, silence: sil.regions,
    provider: L.provider, sectionsFrom: eng ? "silence + class change + timbre change (surf)" : "silence + class change (no surf in khora's engine)",
    sections: L.sections.map((s) => ({ t0: s.t0, t1: s.t1, edge: s.edge, levelDb: s.levelDb, classes: s.classes, classesAre: s.classesAre, tempo: t(s.tempo), key: k(s.key) })),
    description: A.describe(L).map((l) => l.text).slice(0, 60),
    note: "a DESCRIPTION measured from the bytes of " + name + "; it is not words the file contained",
  };
  return { text: "", via: "alcmaeon", chars: 0, meta, gaps: [...r.gaps, ...L.gaps].map(toGap) };
}
