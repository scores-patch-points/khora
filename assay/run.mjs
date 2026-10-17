// assay/run.mjs — the preregistered cube witness trials (assay/preregistrations.json).
//
// The wired trial: PyDMD against the kernel's own dmd.js, both reading one
// series from a DECLARED linear system with published eigenvalues, plus the
// shuffled null of the same series. The reads and the falsifying control are
// the preregistration's, verbatim; this runner invents no verdict the pair of
// readings does not carry.
//
//   node assay/run.mjs            run and print
//   node assay/run.mjs --record   also append the row to assay/results/pydmd-trial.jsonl
//
// Exit codes: 0 held or not runnable (a missing sidecar is disclosed, never a
// pass); 1 a live reading FALSIFIED a preregistered control.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cube, eigenAgreement } from "../opencode-cube.mjs";

process.env.FOLD_CUBE = "1";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── the declared experiment (parameters declared, never tuned) ──────────────
const SERIES_LENGTH = 64;
const WINDOW = 24; // Hankel rows: the declared embedding
const RANK = 4; // one spare past the three real modes, same for both engines
const MODE_A = { magnitude: 0.9, frequency: 0 }; // x_{t+1} = 0.9 x_t
const MODE_B = { magnitude: 0.97, frequency: (2 * Math.PI) / 7 }; // a decaying rotation
const SHUFFLE_SEED = 7;
const CONTROL_RECOVERY = 0.5; // the read: a reading "recovers" the system when at least half the declared modes match

// The published truth the readings are checked against (discrete eigenvalues).
const DECLARED_EIGEN = [
  { re: MODE_A.magnitude, im: 0 },
  { re: MODE_B.magnitude * Math.cos(MODE_B.frequency), im: MODE_B.magnitude * Math.sin(MODE_B.frequency) },
  { re: MODE_B.magnitude * Math.cos(MODE_B.frequency), im: -MODE_B.magnitude * Math.sin(MODE_B.frequency) },
];

/** Fraction of DECLARED modes a reading recovered, at the declared tolerance.
 *  This is the trial's read — engine-vs-engine agreement is recorded BESIDE it
 *  (two engines can agree on noise; only the declared truth decides). */
const recoveryOf = (values) => {
  if (!Array.isArray(values) || !values.length) return null;
  return eigenAgreement(values, DECLARED_EIGEN).matched / DECLARED_EIGEN.length;
};

const declaredSeries = () =>
  Array.from({ length: SERIES_LENGTH }, (_, t) => MODE_A.magnitude ** t + MODE_B.magnitude ** t * Math.cos(MODE_B.frequency * t));

// mulberry32 — a seeded PRNG so the null is reproducible from the seed alone.
const prng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffled = (series, seed) => {
  const out = series.slice();
  const rand = prng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const trial = async (series, tag, task) => {
  const r = await cube({
    body: { cell: "DEF·Pattern", tool: "pydmd", text: JSON.stringify(series), rank: RANK, frame: WINDOW },
    task,
    agent: "assay",
    stateDir: process.env.FOLD_OPENCODE_STATE ?? null,
  });
  if (r.ok !== true) return { tag, runnable: false, why: `${r.gap}: ${r.why ?? ""}` };
  return {
    tag,
    runnable: true,
    agreement: r.agreement,
    matched: r.matched,
    pairs: r.pairs,
    recoveryJs: recoveryOf(r.values?.js),
    recoveryPy: recoveryOf(r.values?.py),
    standing: r.standing,
    fallback: r.fallback,
    producer: r.producer,
    reading: r.reading,
  };
};

const main = async () => {
  const task = "assay:pydmd";
  const real = await trial(declaredSeries(), "real", task);
  const nullRun = await trial(shuffled(declaredSeries(), SHUFFLE_SEED), "shuffled-null", task);

  const live = real.runnable && real.recoveryJs !== null && real.recoveryPy !== null && nullRun.runnable && nullRun.recoveryJs !== null && nullRun.recoveryPy !== null;
  const recovers = (t) => (t.recoveryJs >= CONTROL_RECOVERY && t.recoveryPy >= CONTROL_RECOVERY);
  const realHeld = live && recovers(real);
  const nullHeld = live && !recovers(nullRun);
  const verdict = !live ? "unrunnable (disclosed — a missing sidecar is a typed gap, never a pass)" : realHeld && nullHeld ? "held" : "FALSIFIED";
  const row = { schema: "CubeTrial@1", at: new Date().toISOString(), trial: "pydmd-vs-dmd", declared: { SERIES_LENGTH, WINDOW, RANK, MODE_A, MODE_B, SHUFFLE_SEED, CONTROL_RECOVERY, DECLARED_EIGEN }, real, null: nullRun, verdict };

  console.log(JSON.stringify(row, null, 2));
  if (process.argv.includes("--record")) {
    fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
    fs.appendFileSync(path.join(HERE, "results", "pydmd-trial.jsonl"), JSON.stringify(row) + "\n");
  }
  if (live && !(realHeld && nullHeld)) {
    console.error(`FALSIFIED: the preregistered control says ${!realHeld ? "an engine failed the real series' declared eigenvalues" : "the shuffled null recovered the declared modes like the real series"} — this is a REC (a changed licence or frame), never a retry (assay/preregistrations.json)`);
    return 1;
  }
  if (!live) console.error("not runnable here: provision the locked venv (fold-door.sh with FOLD_CUBE=1, or uv sync --project cube-tools/py312) — the trial is recorded, not passed");
  return 0;
};

process.exitCode = await main();
