// Alcmaeon — the hearing pipeline.
//
// Alcmaeon of Croton (5th c. BCE) is the physician Theophrastus reports as holding that the brain, not the heart, is where
// the senses arrive, and that we hear because the ear holds an empty space which resounds. Named for him because this is
// the sibling of Alhazen: where Alhazen takes a page's pixels and makes them legible, this takes a stream of samples (or a
// stream of words) in the order it arrives and measures what a LISTENER can know without being told what it is.
//
// Pure and dependency-free: no file, no network, no clock, no randomness (shuffles are seeded). Loads as CommonJS
// (`require`), as ESM default import, or as a classic `<script>` (exposes `window.Alcmaeon`). Anything that needs the outside
// world is INJECTED (the cast.js pattern): `surf` and `isGap` come from the caller; decoding, ffmpeg, ONNX and the model
// files live in node/ and are not part of this file.
//
// THE DISCIPLINE (shared with the rest of the fold, native/docs/LEVELS.md):
//   CAUSAL     the Ear is fed chunks as they arrive. Frame i is a function of samples [i*hop, i*hop+N) and nothing later, so
//              the readings after k chunks equal the first frames of a longer read (the heard rule's prefix invariant).
//   STRATA     every reading names its stratum (S0 bytes, S1 script, S2 heard, S3 meaning) and whether it is `mechanical`
//              or `model:<name>`. A model's label is a PROPOSAL, kept apart from what was measured; it is never used to
//              decide what was measured.
//   STANDING   a tempo is stated only when it beats a seeded shuffle of the same signal; a key comes with the best fit that
//              chance gives the same chroma. No typed confidence threshold decides what is true.
//   GAPS       what could not be assessed is said, in `gaps`, not left to be mistaken for "fine". `faces:null`-style absence
//              is never zero.
//   NO LISTS   no stop-word list, no word list of any kind. Closed classes are earned by dispersion (idf), not typed.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Alcmaeon = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";
  const VERSION = "0.1.0";
  const STRATA = Object.freeze({ S0: "bytes", S1: "script", S2: "heard", S3: "meaning" });
  /** every reading is born with its stratum, who made it, and the sentence that says how far to trust it */
  const stamp = (stratum, by, standing, body) => Object.assign({ stratum, by, standing }, body);
  const fmtT = (s) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" : "") + String(m).padStart(h ? 2 : 1, "0") + ":" + x.toFixed(1).padStart(4, "0"); };

  // ── FFT ────────────────────────────────────────────────────────────────────────────────────────
  function makeFFT(n) {
    const rev = new Uint32Array(n), bits = Math.log2(n);
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b); rev[i] = r; }
    const cs = new Float64Array(n / 2), sn = new Float64Array(n / 2); for (let i = 0; i < n / 2; i++) { cs[i] = Math.cos((2 * Math.PI * i) / n); sn[i] = -Math.sin((2 * Math.PI * i) / n); }
    return (re, im) => {
      for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
      for (let size = 2; size <= n; size <<= 1) { const half = size >> 1, step = n / size;
        for (let i = 0; i < n; i += size) for (let j = 0, k = 0; j < half; j++, k += step) { const a = i + j, b = a + half, tr = re[b] * cs[k] - im[b] * sn[k], ti = re[b] * sn[k] + im[b] * cs[k]; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; } }
    };
  }
  const BANDS = [0, 150, 300, 600, 1200, 2400, 4800, 8000];
  const NB = BANDS.length - 1;

  /**
   * createEar({sr, N, hop}) -> { hear(chunk), readings(), n, ... }
   * Feed mono Float32 samples in any chunk sizes. Chunk size never changes a reading: frames are cut at fixed sample offsets.
   * `sr` is the rate of the samples you give it (16000 is what the band edges are tuned for). Non-finite samples are counted
   * and treated as 0, and the count is reported in gaps.
   */
  function createEar({ sr = 16000, N = 2048, hop = 512 } = {}) {
    if (!(N > 0) || (N & (N - 1))) throw new RangeError("Alcmaeon.createEar: N must be a power of two");
    const fft = makeFFT(N), win = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    const re = new Float64Array(N), im = new Float64Array(N), K = N / 2, binHz = sr / N, prev = new Float64Array(K);
    const bandOf = new Int8Array(K).fill(-1), pcOf = new Int8Array(K).fill(-1);
    for (let k = 1; k < K; k++) { const f = k * binHz; for (let b = 0; b < NB; b++) if (f >= BANDS[b] && f < BANDS[b + 1]) bandOf[k] = b; if (f >= 80 && f <= 4000) pcOf[k] = ((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12; }
    const cap = 1 << 12; let nf = 0, rms = new Float32Array(cap), zcr = new Float32Array(cap), cent = new Float32Array(cap), flux = new Float32Array(cap), band = new Float32Array(cap * NB), chroma = new Float32Array(cap * 12);
    const grow = () => { const g = (a) => { const b = new Float32Array(a.length * 2); b.set(a); return b; }; rms = g(rms); zcr = g(zcr); cent = g(cent); flux = g(flux); band = g(band); chroma = g(chroma); };
    let buf = new Float32Array(N * 4), have = 0, samples = 0, clipped = 0, nonFinite = 0, peak = 0;
    const frame = (x, o) => {
      if (nf >= rms.length) grow();
      let e = 0, z = 0; for (let i = 0; i < N; i++) { const v = x[o + i]; e += v * v; if (i && (v >= 0) !== (x[o + i - 1] >= 0)) z++; re[i] = v * win[i]; im[i] = 0; }
      rms[nf] = Math.sqrt(e / N); zcr[nf] = z / N; fft(re, im);
      let fl = 0, num = 0, den = 0; const bsum = new Float64Array(NB), ch = new Float64Array(12);
      for (let k = 1; k < K; k++) { const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]); const lm = Math.log1p(10 * m); if (k * binHz < 4000) fl += Math.max(0, lm - prev[k]); prev[k] = lm; num += m * k * binHz; den += m; if (bandOf[k] >= 0) bsum[bandOf[k]] += m * m; if (pcOf[k] >= 0) ch[pcOf[k]] += m; }
      flux[nf] = fl; cent[nf] = den ? num / den : 0; for (let b = 0; b < NB; b++) band[nf * NB + b] = Math.log10(1e-9 + bsum[b]); let cs = 0; for (let c = 0; c < 12; c++) cs += ch[c]; for (let c = 0; c < 12; c++) chroma[nf * 12 + c] = cs ? ch[c] / cs : 0; nf++;
    };
    function hear(chunk) {
      if (!(chunk instanceof Float32Array)) chunk = Float32Array.from(chunk);
      samples += chunk.length;
      for (let i = 0; i < chunk.length; i++) { const v = chunk[i]; if (!Number.isFinite(v)) { nonFinite++; chunk[i] = 0; continue; } const a = Math.abs(v); if (a >= 0.999) clipped++; if (a > peak) peak = a; }
      if (have + chunk.length > buf.length) { const nb = new Float32Array(Math.max(buf.length * 2, have + chunk.length)); nb.set(buf.subarray(0, have)); buf = nb; }
      buf.set(chunk, have); have += chunk.length;
      let o = 0, made = 0; while (o + N <= have) { frame(buf, o); o += hop; made++; }
      if (o > 0) { buf.copyWithin(0, o, have); have -= o; }
      return made;
    }
    function readings() {
      const s = (a, m = 1) => a.subarray(0, nf * m), gaps = [];
      if (sr < 16000) gaps.push({ what: "bands above Nyquist", why: `sample rate ${sr} < 16000: the upper bands are empty` });
      if (nonFinite) gaps.push({ what: "non-finite samples", why: `${nonFinite} NaN/Infinity samples were treated as 0` });
      if (nf === 0) gaps.push({ what: "no frames", why: `fewer than ${N} samples heard` });
      return stamp("S2", "mechanical", "measured from the samples in the order they arrived; frame i uses only samples [i*hop, i*hop+N)", { sr, N, hop, fps: sr / hop, n: nf, duration: samples / sr, rms: s(rms), zcr: s(zcr), cent: s(cent), flux: s(flux), band: s(band, NB), chroma: s(chroma, 12), clipFrac: samples ? clipped / samples : 0, peak, gaps });
    }
    return { hear, readings, get n() { return nf; }, sr, N, hop, fps: sr / hop };
  }

  /** all samples at once (convenience for tests and short clips); identical to feeding the same samples in chunks */
  function hearAll(samples, opts) { const ear = createEar(opts); ear.hear(samples instanceof Float32Array ? samples : Float32Array.from(samples)); return ear.readings(); }

  /** quiet stretches by frame rms. `db` is dBFS of the frame rms; only runs of at least `minSec` count. Open-ended runs end in null. */
  function silences(r, { db = -50, minSec = 0.5 } = {}) {
    const out = []; let s = null;
    for (let i = 0; i < r.n; i++) { const quiet = 20 * Math.log10(r.rms[i] + 1e-9) <= db; if (quiet && s == null) s = i; if (!quiet && s != null) { if ((i - s) / r.fps >= minSec) out.push([+(s / r.fps).toFixed(2), +(i / r.fps).toFixed(2)]); s = null; } }
    if (s != null && (r.n - s) / r.fps >= minSec) out.push([+(s / r.fps).toFixed(2), null]);
    return stamp("S2", "mechanical", `frame rms at or below ${db} dBFS for at least ${minSec} s; edges are good to about one frame (${(r.N / r.sr * 1000).toFixed(0)} ms window)`, { regions: out, params: { db, minSec } });
  }

  // ── tempo and key: ported verbatim from the tested Slate code (attested against seeded nulls) ─────
  function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32); }
  function acPeak(env, fps, lo = 40, hi = 220) {
    const n = env.length, m = env.reduce((a, b) => a + b, 0) / n, x = env.map((v) => v - m), v0 = x.reduce((a, b) => a + b * b, 0) || 1;
    const l0 = Math.max(2, Math.floor((60 / hi) * fps)), l1 = Math.min(n >> 1, Math.ceil((60 / lo) * fps)); const ac = new Float64Array(l1 + 2);
    for (let l = l0 - 1; l <= l1 + 1; l++) { let s = 0; for (let i = 0; i + l < n; i++) s += x[i] * x[i + l]; ac[l] = s / v0; }
    // all local maxima; the beat period is the SHORTEST lag nearly as strong as the strongest (its multiples are always strong too)
    const pk = []; for (let l = l0; l <= l1; l++) if (ac[l] >= ac[l - 1] && ac[l] >= ac[l + 1] && ac[l] > 0) pk.push(l);
    const gmax = Math.max(...pk.map((l) => ac[l]), 0); let best = pk.find((l) => ac[l] >= 0.85 * gmax) ?? l0, bv = ac[best];
    const a = ac[best - 1], b = ac[best], c = ac[best + 1], d = a - 2 * b + c, off = d ? (0.5 * (a - c)) / d : 0; // parabolic refinement
    const alt = pk.filter((l) => l !== best).map((l) => ({ bpm: +((60 * fps) / l).toFixed(1), strength: +ac[l].toFixed(3) })).sort((a, b) => b.strength - a.strength).slice(0, 2);
    return { lag: best + off, peak: bv, bpm: (60 * fps) / (best + off), alt };
  }
  function tempoOf(flux, fps, { shuffles = 40, seed = 7, block = 16 } = {}) {
    if (flux.length < fps * 6) return null;
    const real = acPeak(Array.from(flux), fps); const rnd = lcg(seed); let nullMax = -Infinity;
    const nb = Math.floor(flux.length / block); // shuffle in blocks so local texture is kept and only the periodic structure is destroyed
    for (let s = 0; s < shuffles; s++) { const ord = Array.from({ length: nb }, (_, i) => i); for (let i = nb - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; } const sh = []; for (const o of ord) for (let i = 0; i < block; i++) sh.push(flux[o * block + i]); nullMax = Math.max(nullMax, acPeak(sh, fps).peak); }
    // phase of the beat grid: offset that maximises onset energy on the comb
    const per = (60 / real.bpm) * fps; let bo = 0, bs = -1; for (let o = 0; o < per; o += 0.5) { let s = 0; for (let t = o; t < flux.length; t += per) s += flux[Math.round(t)] || 0; if (s > bs) { bs = s; bo = o; } }
    return { bpm: +real.bpm.toFixed(1), peak: +real.peak.toFixed(3), nullMax: +nullMax.toFixed(3), attested: real.peak > nullMax, alt: real.alt, grid: { bpm: +real.bpm.toFixed(2), offsetSec: +(bo / fps).toFixed(3) } };
  }
  const KMAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], KMIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const corr = (a, b) => { const ma = a.reduce((x, y) => x + y, 0) / 12, mb = b.reduce((x, y) => x + y, 0) / 12; let n = 0, da = 0, db = 0; for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : 0; };
  function keyOf(chroma, i0, i1, n = 3) {
    if (i1 - i0 < 8) return null;
    const mean = new Array(12).fill(0); for (let i = i0; i < i1; i++) for (let c = 0; c < 12; c++) mean[c] += chroma[i * 12 + c];
    const all = []; for (let k = 0; k < 12; k++) for (const [mode, prof] of [["major", KMAJ], ["minor", KMIN]]) { const rot = Array.from({ length: 12 }, (_, i) => prof[(i - k + 12) % 12]); all.push({ key: `${NOTE[k]} ${mode}`, r: +corr(mean, rot).toFixed(3) }); }
    all.sort((a, b) => b.r - a.r); // closely related keys (relative major/minor) share notes; the runner-up shows the ambiguity honestly
    // chance level: the best key fit of the SAME chroma strengths dealt to random pitch classes. Percussion and 3-note stabs sit near it.
    const rnd = lcg(11); let nullMax = -Infinity; for (let t = 0; t < 40; t++) { const p = mean.slice(); for (let i = 11; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } let b = -2; for (let k = 0; k < 12; k++) for (const prof of [KMAJ, KMIN]) b = Math.max(b, corr(p, Array.from({ length: 12 }, (_, i) => prof[(i - k + 12) % 12]))); nullMax = Math.max(nullMax, b); }
    return { key: all[0].key, r: all[0].r, margin: +(all[0].r - all[1].r).toFixed(3), chanceMax: +nullMax.toFixed(3), aboveChance: all[0].r > nullMax, candidates: all.slice(0, n) };
  }


  // ── class timelines: a heuristic that labels only what the file's own windows separate ────────────
  const mean = (a, i0, i1) => { let s = 0; for (let i = i0; i < i1; i++) s += a[i]; return s / Math.max(1, i1 - i0); };
  const std = (a, i0, i1) => { const m = mean(a, i0, i1); let s = 0; for (let i = i0; i < i1; i++) s += (a[i] - m) ** 2; return Math.sqrt(s / Math.max(1, i1 - i0)); };
  /** Heuristic provider: 3 s windows; separates "speech-like" (syllabic 2-8 Hz modulation, pauses, voiced/unvoiced ZCR swings)
   *  from "sustained" ONLY if the file's own windows form two populations; otherwise it reports "uniform". No trained weights. */
  function heuristicClasses(sig, { win = 3, hopS = 1.5 } = {}) {
    const w = Math.round(win * sig.fps), h = Math.round(hopS * sig.fps), wins = [];
    for (let i = 0; i + w <= sig.n; i += h) {
      const m = mean(sig.rms, i, i + w), db = 20 * Math.log10(m + 1e-9); let low = 0; for (let j = i; j < i + w; j++) if (sig.rms[j] < 0.5 * m) low++;
      // modulation energy of the rms envelope: 2-8 Hz vs 0.5-16 Hz (direct DFT; tiny)
      const e = []; for (let j = i; j < i + w; j++) e.push(sig.rms[j] / (m + 1e-9) - 1); let mod = 0, tot = 0; for (let f = 0.5; f <= 16; f += 0.5) { let a = 0, b = 0; for (let t = 0; t < e.length; t++) { const ph = (2 * Math.PI * f * t) / sig.fps; a += e[t] * Math.cos(ph); b += e[t] * Math.sin(ph); } const pw = a * a + b * b; tot += pw; if (f >= 2 && f <= 8) mod += pw; }
      wins.push({ t0: i / sig.fps, t1: (i + w) / sig.fps, db, low: low / w, zstd: std(sig.zcr, i, i + w), mod: tot ? mod / tot : 0 });
    }
    const live = wins.filter((x) => x.db > -50); const z = (k) => { const v = live.map((x) => x[k]), m = v.reduce((a, b) => a + b, 0) / (v.length || 1), s = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length || 1)) || 1; return (x) => (x[k] - m) / s; };
    const zl = z("low"), zz = z("zstd"), zm = z("mod"); live.forEach((x) => (x.score = (zl(x) + zz(x) + zm(x)) / 3));
    // 1-D 2-means on the score
    let separated = false, c0 = 0, c1 = 0;
    if (live.length >= 6) { const v = live.map((x) => x.score).sort((a, b) => a - b); c0 = v[0]; c1 = v.at(-1); for (let it = 0; it < 30; it++) { const A = v.filter((s) => Math.abs(s - c0) <= Math.abs(s - c1)), B = v.filter((s) => Math.abs(s - c0) > Math.abs(s - c1)); if (!A.length || !B.length) break; c0 = A.reduce((a, b) => a + b, 0) / A.length; c1 = B.reduce((a, b) => a + b, 0) / B.length; }
      const A = v.filter((s) => Math.abs(s - c0) <= Math.abs(s - c1)), B = v.filter((s) => Math.abs(s - c0) > Math.abs(s - c1)); const sd = (a, c) => Math.sqrt(a.reduce((x, y) => x + (y - c) ** 2, 0) / (a.length || 1)); separated = A.length >= 3 && B.length >= 3 && (c1 - c0) > 2 * Math.max(sd(A, c0), sd(B, c1)); }
    return { provider: "heuristic", vocabulary: ["silence", "modulated", "sustained", "uniform"], separated,
      windows: wins.map((x) => { let id; if (x.db <= -50) id = "silence"; else if (!separated) id = "uniform"; else id = x.score > (c0 + c1) / 2 ? "modulated" : "sustained"; return { t0: +x.t0.toFixed(2), t1: +x.t1.toFixed(2), top: [{ id, conf: 1 /* hard label: the heuristic is a two-population split, not a probability */ }] }; }) };
  }

  // ── where the sound changes: class-change peaks and cut merging ───────────────────────────────────
  /** Class change as a SIGNAL, not a label flip: the distance between the label distributions just before and just after each window.
   *  "synthesizer 0.93 / music 0.93" trading places moves it ~0; speech -> music moves it ~1.4 (a full swap). An edge is a local maximum
   *  of at least `minChange` (half of a full swap). Surf is deliberately NOT used here: it flags only what is new relative to its own past,
   *  and a second speech/music change after a first is not new. Each edge is then snapped to the nearest timbre change (class windows are coarse). */
  function classCuts(windows, timbre, { span = 2, minChange = 0.5, snap = 1 } = {}) {
    if (windows.length < 2 * span + 2) return [];
    const ids = [...new Set(windows.flatMap((w) => w.top.map((t) => t.id)))], ix = new Map(ids.map((id, i) => [id, i]));
    const vec = windows.map((w) => { const v = new Float64Array(ids.length); for (const t of w.top) v[ix.get(t.id)] = t.conf; return v; });
    const mean = (a, b) => { const m = new Float64Array(ids.length); for (let i = a; i < b; i++) for (let k = 0; k < ids.length; k++) m[k] += vec[i][k] / (b - a); return m; };
    const d = []; for (let i = span; i <= windows.length - span; i++) { const A = mean(i - span, i), B = mean(i, i + span); let s = 0; for (let k = 0; k < ids.length; k++) s += (A[k] - B[k]) ** 2; d.push({ i, v: Math.sqrt(s) }); }
    const out = [];
    for (let j = 0; j < d.length; j++) { const lo = Math.max(0, j - span), hi = Math.min(d.length, j + span + 1); if (d[j].v < minChange || d.slice(lo, hi).some((x, k) => x.v > d[j].v || (x.v === d[j].v && lo + k < j))) continue;
      let t = windows[d[j].i].t0 + 0.75; // centre of the hop between the two halves
      if (timbre?.dist?.length) { const bs = timbre.blockSec, c = Math.round(t / bs) - 1; let bi = c, bv = -1; for (let k = Math.max(0, c - snap); k <= Math.min(timbre.dist.length - 1, c + snap); k++) if (timbre.dist[k] > bv) { bv = timbre.dist[k]; bi = k; } t = (bi + 1) * bs; }
      out.push({ t: +t.toFixed(2), v: +d[j].v.toFixed(2) }); }
    return out;
  }
  // A pause is not a section: speech is full of 0.5-1 s gaps. Only a silence of at least `silenceEdge` seconds opens/closes a section
  // (the shorter ones stay in loudness.silence for anyone who wants them).
  function combineCuts(duration, { silence, surfCuts, classCutsT }, silenceEdge = 1.5) {
    const cands = [];
    for (const [a, b] of silence || []) { if (b == null || b - a < silenceEdge) continue; cands.push({ t: a, pri: 0, sep: 1.5 }); cands.push({ t: b, pri: 0, sep: 1.5 }); }
    for (const t of surfCuts) cands.push({ t, pri: 1, sep: 1.5 });
    for (const c of classCutsT) cands.push({ t: c.t, pri: 2, sep: 3 }); // class windows are 1.5 s apart: precise edges win over class edges
    cands.sort((x, y) => x.pri - y.pri); const kept = [];
    for (const c of cands) if (c.t > 1.5 && duration - c.t > 1.5 && kept.every((k) => Math.abs(k - c.t) >= c.sep)) kept.push(c.t);
    return [0, ...kept.sort((a, b) => a - b)];
  }


  // ── sections: surf rides the timbre-change signal (band+chroma distance between 1 s blocks); surf is INJECTED ──
  function timbreSections(sig, surf, isGap, { blockSec = 1, minSec = 4, maxSteps = 360, window = 2, draws = 100, seed = 0 } = {}) {
    const bl = Math.round(blockSec * sig.fps), nb = Math.floor(sig.n / bl), D = NB + 1 + 12;
    if (nb < window + 8) return { sections: [{ t0: 0, t1: sig.duration }], surf: { note: "too short for surf" } };
    const vec = []; for (let b = 0; b < nb; b++) { const v = new Float64Array(D); for (let i = b * bl; i < (b + 1) * bl; i++) { for (let k = 0; k < NB; k++) v[k] += sig.band[i * NB + k] / bl; v[NB] += Math.log10(1e-9 + sig.rms[i]) / bl; for (let c = 0; c < 12; c++) v[NB + 1 + c] += sig.chroma[i * 12 + c] / bl; } vec.push(v); }
    const sd = new Float64Array(D); for (let d = 0; d < D; d++) { const m = vec.reduce((a, v) => a + v[d], 0) / nb; sd[d] = Math.sqrt(vec.reduce((a, v) => a + (v[d] - m) ** 2, 0) / nb) || 1; }
    const dist = []; for (let b = 1; b < nb; b++) { let s = 0; for (let d = 0; d < D; d++) s += ((vec[b][d] - vec[b - 1][d]) / sd[d]) ** 2; dist.push(Math.sqrt(s)); }
    const B = Math.max(1, Math.ceil(dist.length / maxSteps)), pooled = []; for (let i = 0; i < dist.length; i += B) pooled.push(Math.max(...dist.slice(i, i + B)));
    const noSurf = typeof surf !== "function" || typeof isGap !== "function"; const r = noSurf ? null : surf({ material: pooled, window, draws, hop: 1, seed }); const cuts = [0];
    if (r && !isGap(r)) { const cand = []; for (const h of r.horizon) if (h.outcome === "broke") { const a = h.anticipated.at * B; let bi = a, bv = -1; for (let j = a; j < Math.min(dist.length, a + window * B); j++) if (dist[j] > bv) { bv = dist[j]; bi = j; } cand.push({ t: (bi + 1) * blockSec, v: bv }); }
      cand.sort((x, y) => y.v - x.v); const kept = []; for (const c of cand) if (c.t >= minSec && sig.duration - c.t >= minSec && kept.every((k) => Math.abs(k - c.t) >= minSec)) kept.push(c.t); cuts.push(...kept.sort((a, b) => a - b)); }
    const sections = cuts.map((t0, i) => ({ t0: +t0.toFixed(2), t1: +(cuts[i + 1] ?? sig.duration).toFixed(2) }));
    return { sections, timbre: { dist, blockSec }, surf: noSurf ? { gap: "no_surf_injected" } : isGap(r) ? { gap: r.gap } : { steps: r.horizon.length, met: r.met, broke: r.broke, flat: r.flat, pool: B }, params: { blockSec, minSec, window, draws, seed } };
  }


  /**
   * listen(readings, { surf, isGap, classes?, silence?, params? }) -> the section map of a recording.
   *   readings   from ear.readings()
   *   surf,isGap INJECTED (eoreader's loops/surf and nul isGap, or any function with the same contract). Never imported here.
   *              OPTIONAL: without them the timbre-change edges are skipped (edges come from silence and class change) and a gap says so.
   *   classes    optional { provider, by, vocabulary, windows:[{t0,t1,top:[{id,conf}]}] } from ANY provider (YAMNet, Apple ...).
   *              When absent the mechanical heuristic is used. A model provider's labels are carried as PROPOSALS (S3).
   *   silence    optional result of silences(); computed from the readings when absent.
   * Section edges come from three mechanical sources: a silence of >= 1.5 s, a timbre change that surf finds, and a change in
   * the class-label distribution. Each section carries its level, an attested-or-not tempo, and a key fit with its chance level.
   */
  function listen(r, { surf, isGap, classes = null, silence = null, params = {} } = {}) {
    if (r.n < 20) return stamp("S2", "mechanical", "too short to section", { duration: r.duration, sections: [], gaps: [{ what: "sections", why: `${r.n} frames heard; at least 20 are needed` }] });
    const sil = silence || silences(r), heur = classes ? null : heuristicClasses(r);
    const cls = classes || { provider: heur.provider, by: "mechanical", vocabulary: heur.vocabulary, separated: heur.separated, windows: heur.windows };
    const model = typeof cls.by === "string" && cls.by.startsWith("model");
    const sec0 = timbreSections(r, surf, isGap, params.timbre || {});
    const surfCuts = sec0.sections.slice(1).map((s) => s.t0), classCutsT = classCuts(cls.windows, sec0.timbre);
    const cuts = combineCuts(r.duration, { silence: sil.regions, surfCuts, classCutsT });
    const sections = cuts.map((t0, i) => ({ t0: +t0.toFixed(2), t1: +(cuts[i + 1] ?? r.duration).toFixed(2) }));
    const why = (t) => ((sil.regions || []).some(([a, b]) => b != null && b - a >= 1.5 && (Math.abs(a - t) < 0.01 || Math.abs(b - t) < 0.01)) ? "silence" : surfCuts.some((c) => Math.abs(c - t) < 0.01) ? "timbre" : t === 0 ? "start" : "class");
    for (const s of sections) {
      const i0 = Math.max(0, Math.round(s.t0 * r.fps)), i1 = Math.min(r.n, Math.round(s.t1 * r.fps)); s.edge = why(s.t0);
      const mix = new Map(); let wt = 0; for (const w of cls.windows) { const ov = Math.min(w.t1, s.t1) - Math.max(w.t0, s.t0); if (ov <= 0) continue; wt += ov; for (const t of w.top.slice(0, 3)) mix.set(t.id, (mix.get(t.id) || 0) + ov * t.conf); }
      s.classes = [...mix].map(([id, v]) => ({ id, share: +(v / (wt || 1)).toFixed(2) })).sort((a, b) => b.share - a.share).slice(0, 4);
      s.classesAre = model ? { stratum: "S3", by: cls.by, status: "proposal" } : { stratum: "S2", by: "mechanical", status: "relative to this recording's own windows" };
      s.levelDb = +(10 * Math.log10((i1 > i0 ? r.rms.slice(i0, i1).reduce((x, y) => x + y * y, 0) / (i1 - i0) : 0) + 1e-12)).toFixed(1);
      if (s.t1 - s.t0 >= 8) { s.tempo = tempoOf(r.flux.slice(i0, i1), r.fps); s.key = keyOf(r.chroma, i0, i1); }
    }
    const gaps = []; if (typeof surf !== "function" || typeof isGap !== "function") gaps.push({ what: "timbre sections", why: "no surf was injected: section edges come from silence and sound-class change only" }); if (!model) gaps.push({ what: "named sounds", why: "no model provider: class labels are relative to this recording (modulated / sustained / silence), not names of sounds" });
    return stamp("S2", "mechanical", "sections from silence, timbre change (surf) and label-distribution change; labels are " + (model ? "model proposals kept apart" : "relative"), {
      duration: +r.duration.toFixed(2), sections, silence: sil, provider: { name: cls.provider, by: cls.by, vocabulary: cls.vocabulary, separated: cls.separated ?? null },
      classWindows: cls.windows, timbre: { blockSec: sec0.timbre?.blockSec, steps: sec0.timbre?.dist?.length }, surf: sec0.surf, params: { ...sec0.params, silenceEdge: 1.5, minChange: 0.5 }, gaps });
  }

  /**
   * describe(listening) -> one mechanical line per section: [{t0,t1,text,proposals?}]. The measured facts come first and are S2.
   * Model labels (S3) sit in their own clause that says so; the text is what a plate is built from, so it is byte-addressable.
   */
  function describe(L) {
    return L.sections.map((s) => {
      const rel = (a) => { const q = a.bpm / s.tempo.bpm; for (const [x, n] of [[2, "double time"], [0.5, "half time"], [1.5, "3:2"], [2 / 3, "2:3"]]) if (Math.abs(q - x) / x < 0.04) return n; return "unrelated period"; };
      const alt = (s.tempo?.alt || []).filter((a) => a.strength > 0).map((a) => `${a.bpm} BPM ${a.strength} (${rel(a)})`).join(", ");
      const tempo = s.tempo?.attested ? `; tempo ${s.tempo.bpm} BPM (pulse attested vs shuffled null: peak ${s.tempo.peak} > ${s.tempo.nullMax}${alt ? `; other periodicities: ${alt}` : ""})` : s.tempo ? "; no attested pulse" : s.t1 - s.t0 < 8 ? "; too short for pulse analysis (under 8 s)" : "";
      const key = s.key ? `; key fit ${s.key.key} r ${s.key.r} (next ${s.key.candidates[1].key} ${s.key.candidates[1].r}; best fit by chance ${s.key.chanceMax}: ${s.key.aboveChance ? "above chance" : "NOT above chance, so treat as unpitched or ambiguous"})` : "";
      const labels = s.classes.map((c) => `${c.id} ${c.share}`).join(", ");
      const cls = s.classesAre.stratum === "S3" ? `; proposed sound labels (${s.classesAre.by}, not verified): ${labels}` : `; relative class in this recording: ${labels}`;
      return { t0: s.t0, t1: s.t1, stratum: "S2", by: "mechanical", text: `${fmtT(s.t0)}-${fmtT(s.t1)} heard: level ${s.levelDb} dB rms; section begins at ${s.edge}${tempo}${key}${cls}` };
    });
  }

  // ── loudness: ITU-R BS.1770-4 integrated loudness, pure. Channels are weighted 1.0 (L/R/C); surround weighting is not applied. ──
  function kWeight(fs) { // the two K-weighting biquads for ANY sample rate (shelf + RLB high-pass), after the published analogue prototypes
    const shelf = (() => { const G = 3.999843853973347, Q = 0.7071752369554196, f0 = 1681.974450955533, A = Math.pow(10, G / 40), w = 2 * Math.PI * f0 / fs, al = Math.sin(w) / (2 * Q), c = Math.cos(w), sA = 2 * Math.sqrt(A) * al;
      const a0 = (A + 1) - (A - 1) * c + sA; return [A * ((A + 1) + (A - 1) * c + sA) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - sA) / a0, 2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - sA) / a0]; })();
    const hp = (() => { const Q = 0.5003270373238773, f0 = 38.13547087602444, w = 2 * Math.PI * f0 / fs, al = Math.sin(w) / (2 * Q), c = Math.cos(w), a0 = 1 + al; return [((1 + c) / 2) / a0, (-(1 + c)) / a0, ((1 + c) / 2) / a0, (-2 * c) / a0, (1 - al) / a0]; })();
    return [shelf, hp];
  }
  /** createLoudnessMeter({sr, channels}) -> { hear([ch0, ch1 ...]), integrated(), peakDb } */
  function createLoudnessMeter({ sr = 48000, channels = 1 } = {}) {
    const stages = kWeight(sr), st = Array.from({ length: channels }, () => stages.map(() => [0, 0, 0, 0])); // x1 x2 y1 y2 per biquad
    const S = Math.round(0.1 * sr), sub = []; let acc = 0, cnt = 0, samples = 0, peak = 0;
    function hear(chs) {
      if (chs.length !== channels) throw new RangeError(`Alcmaeon loudness meter: expected ${channels} channel(s), got ${chs.length}`);
      const n = chs[0].length;
      for (let i = 0; i < n; i++) {
        let p = 0;
        for (let c = 0; c < channels; c++) { let x = chs[c][i]; if (!Number.isFinite(x)) x = 0; const ax = Math.abs(x); if (ax > peak) peak = ax;
          for (let k = 0; k < 2; k++) { const [b0, b1, b2, a1, a2] = stages[k], s = st[c][k], y = b0 * x + b1 * s[0] + b2 * s[1] - a1 * s[2] - a2 * s[3]; s[1] = s[0]; s[0] = x; s[3] = s[2]; s[2] = y; x = y; }
          p += x * x; }
        acc += p; if (++cnt === S) { sub.push(acc / S); acc = 0; cnt = 0; }
      }
      samples += n;
    }
    function integrated() {
      const gaps = [{ what: "true peak", why: "not computed (needs 4x oversampling); samplePeakDb is the plain sample peak" }, { what: "loudness range", why: "not computed" }];
      if (sub.length < 4) return stamp("S2", "mechanical", "BS.1770-4 integrated loudness", { lufs: null, blocks: 0, gaps: gaps.concat([{ what: "integrated loudness", why: "under 400 ms of audio" }]), samplePeakDb: peak ? +(20 * Math.log10(peak)).toFixed(2) : null });
      const z = []; for (let j = 0; j + 4 <= sub.length; j++) z.push((sub[j] + sub[j + 1] + sub[j + 2] + sub[j + 3]) / 4);
      const L = (v) => -0.691 + 10 * Math.log10(v), above = z.filter((v) => L(v) > -70);
      if (!above.length) return stamp("S2", "mechanical", "BS.1770-4 integrated loudness", { lufs: null, blocks: z.length, gaps: gaps.concat([{ what: "integrated loudness", why: "every 400 ms block is quieter than the -70 LUFS absolute gate" }]), samplePeakDb: +(20 * Math.log10(peak || 1e-9)).toFixed(2) });
      const rel = L(above.reduce((a, b) => a + b, 0) / above.length) - 10, kept = above.filter((v) => L(v) > rel);
      return stamp("S2", "mechanical", "BS.1770-4: K-weighted 400 ms blocks at 75% overlap, -70 LUFS absolute gate, -10 LU relative gate; channels weighted 1.0", { lufs: +L(kept.reduce((a, b) => a + b, 0) / kept.length).toFixed(2), blocks: z.length, gated: kept.length, samplePeakDb: +(20 * Math.log10(peak || 1e-9)).toFixed(2), gaps });
    }
    return { hear, integrated, get peakDb() { return peak ? 20 * Math.log10(peak) : -Infinity; } };
  }
  function loudnessOf(channels, sr) { const m = createLoudnessMeter({ sr, channels: channels.length }); m.hear(channels); return m.integrated(); }

  // ── YAMNet post-processing: ported from Holodeck's holodeck-classify.js (pure and deterministic there too) ──────────
  // The MODEL (an ONNX export, 16 kHz mono float32 in, one 521-class AudioSet score vector per 0.48 s patch out) is run by
  // node/yamnet.js or by Holodeck; this file only turns its scores into spans. Labels from it are S3 proposals.
  const yamnet = {
    SAMPLE_RATE: 16000, HOP_S: 0.48, WINDOW_S: 0.96, CLASSES: 521,
    /** argmax runs -> smoothed by a 5-frame majority vote -> merged -> a run under 4 frames (~1.9 s) or 1.5 s is absorbed by the previous span */
    spansFromLabels(labels, duration, hop, names = []) {
      hop = hop || Math.max(yamnet.HOP_S, duration / Math.max(1, labels.length));
      if (!labels.length) return { spans: [], covered: 0 };
      const sm = labels.map((_, i) => { const votes = new Map(); for (let j = Math.max(0, i - 2); j <= Math.min(labels.length - 1, i + 2); j++) votes.set(labels[j], (votes.get(labels[j]) || 0) + 1); let best = labels[i], cnt = 0; votes.forEach((c, v) => { if (c > cnt) { cnt = c; best = v; } }); return best; });
      const spans = []; let cur = null;
      sm.forEach((lab, i) => { const t0 = Math.max(0, Math.min(i * hop, duration)), t1 = Math.max(0, Math.min((i + 1) * hop, duration)); if (cur && cur.label === lab) { cur.end = t1; cur.frames++; return; } if (cur) spans.push(cur); cur = { start: t0, end: Math.max(t0, t1), label: lab, frames: 1, name: names[lab] || ("class " + lab) }; });
      if (cur) spans.push(cur);
      const out = []; for (const sp of spans) { if (!out.length) { out.push(sp); continue; } if (sp.frames < 4 || (sp.end - sp.start) < 1.5) { const prev = out[out.length - 1]; if (prev.end < sp.end) prev.end = sp.end; } else out.push(sp); }
      const covered = out.reduce((a, x) => a + (x.end - x.start), 0);
      return { spans: out, covered: Math.round(covered / Math.max(0.001, duration) * 100) };
    },
    /** scores (Float32Array, frames x classes, row-major) -> the {t0,t1,top[]} windows that listen() takes. S3, by the model. */
    topWindows(scores, frames, names, { hop = 0.48, window = 0.96, k = 6, classes = 521, model = "yamnet" } = {}) {
      const windows = [];
      for (let f = 0; f < frames; f++) {
        const o = f * classes, best = []; // keep the k best in a tiny insertion list
        for (let c = 0; c < classes; c++) { const v = scores[o + c]; if (best.length < k || v > best[best.length - 1].conf) { let p = best.length; while (p > 0 && best[p - 1].conf < v) p--; best.splice(p, 0, { id: names[c] || ("class " + c), conf: +v.toFixed(3) }); if (best.length > k) best.pop(); } }
        windows.push({ t0: +(f * hop).toFixed(2), t1: +(f * hop + window).toFixed(2), top: best });
      }
      return { provider: model, by: "model:" + model, vocabulary: classes + "-class AudioSet ontology (YAMNet)", windows };
    },
  };

  // ── the heard-rule index: text as a LISTENER has it (the words in order), not as a reader has it ────────────────────
  // native/docs/LEVELS.md: "the system must be able to work equally well if it only heard the novel and didn't read it."
  // So: no capitals, no punctuation, no spelling, no language assumed, no word list, no stemmer. Words are runs of letters/digits
  // in ANY script (NFKC, lower-cased); scripts written without spaces (Han, Kana, Thai, Lao, Khmer, Myanmar) are cut into
  // character bigrams, which needs no lexicon. "Closed classes" (the, of, que, של) are not named: they are earned, because a
  // word that occurs in every chunk has idf log(N/df) = 0 and carries no weight.
  const UNSPACED = "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Thai}\\p{Script=Lao}\\p{Script=Khmer}\\p{Script=Myanmar}";
  const WORD = /[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*/gu, RUN = new RegExp(`[${UNSPACED}]+|[^${UNSPACED}]+`, "gu"), ONLY_UNSPACED = new RegExp(`^[${UNSPACED}]+$`, "u");
  const TOKENIZER = "heard@1";
  function tokens(text) {
    const s = String(text == null ? "" : text).normalize("NFKC").toLowerCase(), out = [];
    for (const m of s.matchAll(WORD)) for (const part of m[0].match(RUN)) {
      if (ONLY_UNSPACED.test(part)) { const cp = Array.from(part); if (cp.length === 1) out.push(cp[0]); else for (let i = 0; i + 1 < cp.length; i++) out.push(cp[i] + cp[i + 1]); }
      else out.push(part);
    }
    return out;
  }
  function chunkSegments(segments, { targetSec = 40, maxSec = 75 } = {}) {
    const chunks = []; let cur = null;
    segments.forEach((s, i) => {
      if (!cur) cur = { t0: s.t0, t1: s.t1, segs: [i], text: s.text }; else { cur.t1 = s.t1; cur.segs.push(i); cur.text += " " + s.text; }
      if (cur.t1 - cur.t0 >= targetSec || cur.t1 - cur.t0 >= maxSec) { chunks.push(cur); cur = null; }
    });
    if (cur) chunks.push(cur);
    return chunks.map((c, id) => ({ id, t0: +c.t0.toFixed(2), t1: +c.t1.toFixed(2), segs: c.segs, text: c.text.trim() }));
  }
  function buildIndex(docs, { tokenize = tokens, tok = TOKENIZER } = {}) { // docs: [{id, text}]
    const df = new Map(), tfs = [], lens = [];
    for (const d of docs) { const tf = new Map(), tk = tokenize(d.text); for (const t of tk) tf.set(t, (tf.get(t) || 0) + 1); for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1); tfs.push(Object.fromEntries(tf)); lens.push(tk.length); }
    const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
    return { tok, N: docs.length, avgLen: avg, df: Object.fromEntries(df), tf: tfs, len: lens, ids: docs.map((d) => d.id) };
  }
  function bm25(index, q, { k1 = 1.4, b = 0.75, tokenize = tokens } = {}) {
    const qt = [...new Set(tokenize(q))];
    return index.tf.map((tf, i) => { let s = 0; for (const t of qt) { const f = tf[t]; if (!f) continue; const idf = Math.log(1 + (index.N - index.df[t] + 0.5) / (index.df[t] + 0.5)); s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + (b * index.len[i]) / (index.avgLen || 1))); } return s; });
  }
  /** distinctive terms of a span: tf * log(N/df). A term in every chunk weighs 0: that is how function words are earned, not listed. */
  function topTerms(index, ids, n = 6) {
    const agg = new Map(); for (const i of ids) for (const [t, f] of Object.entries(index.tf[i])) agg.set(t, (agg.get(t) || 0) + f);
    return [...agg.entries()].map(([t, f]) => [t, f * Math.log(index.N / (index.df[t] || 1))]).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([t]) => t);
  }
  function noveltySeries(index, back = 4) {
    return index.tf.map((tf, i) => { const seen = new Set(); for (let j = Math.max(0, i - back); j < i; j++) for (const t of Object.keys(index.tf[j])) seen.add(t); const keys = Object.keys(tf); if (!keys.length) return 0; return keys.filter((t) => !seen.has(t)).length / keys.length; });
  }
  /** chapters = surf waves over lexical novelty; surf and isGap are injected */
  function chapters(index, chunks, { surf, isGap, window = 3, draws = 100, seed = 0 } = {}) {
    const mat = noveltySeries(index), bounds = [0]; let engineNote = "surf";
    if (typeof surf !== "function" || typeof isGap !== "function") engineNote = "no-surf-injected";
    else if (mat.length >= window + 6) { const r = surf({ material: mat, window, draws, hop: 1, seed }); if (isGap(r)) engineNote = "surf-gap:" + r.gap; else for (const h of r.horizon) if (h.outcome === "broke" && h.anticipated.at - bounds[bounds.length - 1] >= 3) bounds.push(h.anticipated.at); } else engineNote = "too-short-for-surf";
    const out = bounds.map((s, k) => { const e = (bounds[k + 1] != null ? bounds[k + 1] : chunks.length) - 1, ids = Array.from({ length: e - s + 1 }, (_, i) => s + i); return { id: k, chunk0: s, chunk1: e, t0: chunks[s].t0, t1: chunks[e].t1, terms: topTerms(index, ids, 6) }; });
    return { chapters: out, engine: engineNote, material: mat.map((x) => +x.toFixed(3)) };
  }
  const heard = { TOKENIZER, tokens, chunkSegments, buildIndex, bm25, topTerms, noveltySeries, chapters };

  const tempo = (flux, fps, o) => { const t = tempoOf(flux, fps, o); return t && stamp("S2", "mechanical", "autocorrelation of the onset envelope; a pulse is stated only when its peak beats a seeded shuffle of the same signal; other periodicities are listed, not hidden", t); };
  const key = (chroma, i0, i1, n) => { const k = keyOf(chroma, i0, i1, n); return k && stamp("S2", "mechanical", "Krumhansl-Schmuckler fit on mean chroma, with the best fit chance gives the same chroma; close keys are listed, not collapsed", k); };
  /** what each reading is, by stratum. S3 appears only for model proposals, which are kept apart from the measured. */
  const READINGS = Object.freeze({
    features: { stratum: "S2", by: "mechanical" }, silence: { stratum: "S2", by: "mechanical" }, loudness: { stratum: "S2", by: "mechanical" },
    tempo: { stratum: "S2", by: "mechanical" }, key: { stratum: "S2", by: "mechanical" }, "relative-classes": { stratum: "S2", by: "mechanical" },
    sections: { stratum: "S2", by: "mechanical" }, description: { stratum: "S2", by: "mechanical", note: "any model labels sit in their own clause" },
    "heard-index": { stratum: "S2", by: "mechanical" }, "sound-labels": { stratum: "S3", by: "model:<provider>", note: "proposals; never used to decide what was measured" },
  });
  return Object.freeze({ VERSION, STRATA, READINGS, stamp, fmtT, createEar, hearAll, silences, tempo, key, heuristicClasses, classCuts, combineCuts, timbreSections, listen, describe, createLoudnessMeter, loudnessOf, yamnet, heard, tempoOf, keyOf });
});
