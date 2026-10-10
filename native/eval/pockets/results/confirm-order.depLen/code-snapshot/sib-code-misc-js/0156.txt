// gym/weave.mjs — spec + legend → the tapestry. Deterministic: the same spec
// always weaves the same bytes, and gym/unweave.mjs reads them back to the
// same spec (gym/check-tapestry.mjs proves the round trip every run).
//
//   node gym/weave.mjs        writes TAPESTRY.md (cloth + key) and LEGEND.md
//
// The cloth is symbols; the words live in gym/tapestry.legend.json. Layout is
// the weaver's; MEANING is the spec's and the cube's (organs/cube.mjs): every
// thread is placed on all three faces, so each axis is stated twice over.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { OPERATORS, GRAINS, MODES, DOMAINS, cellOf, actOf } from "../organs/cube.mjs";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.dirname(HERE);
export const W = 78, I = 76;
export const BEGIN = "<!-- tapestry:begin -->", END = "<!-- tapestry:end -->";
export const ZONES = { wheel: "∘ ◆ ◈", helix: "∅ ○ ● | → △ = ⊨ ↬", faces: "◀ ▲ ▶", holons: "↑ ↓", voids: "▫ ■", key: "⟨⟩" };

export const marksOf = (legend) => {
  const inv = (g) => Object.fromEntries(Object.entries(legend[g]).map(([k, v]) => [v.is, k]));
  return { op: inv("operator"), grain: inv("grain"), mode: inv("mode"), domain: inv("domain"), face: inv("face"), status: inv("status") };
};

const pad = (s, n) => { if ([...s].length > n) throw new Error(`weave: line too long (${[...s].length}>${n}): ${s}`); return s + " ".repeat(n - [...s].length); };
const center = (s, n) => { const l = [...s].length; const left = Math.floor((n - l) / 2); return " ".repeat(left) + s + " ".repeat(n - l - left); };
const line = (s) => "║" + pad(s, I) + "║";
const rule = (label) => { const head = `╠═[ ${label} ]`; return head + "═".repeat(W - 1 - [...head].length) + "╣"; };
const wrap = (tokens, width) => { const out = []; let cur = ""; for (const t of tokens) { if (cur && [...cur].length + 1 + [...t].length > width) { out.push(cur); cur = t; } else cur = cur ? cur + " " + t : t; } if (cur) out.push(cur); return out; };

// strongest status of the threads at one cell: woven > referenced > unwoven > void
export const cellStatus = (threads, op, grain, M) => {
  const ts = threads.filter((t) => t.op === op && t.grain === grain);
  if (!ts.length) return "▫";
  for (const s of ["■", "□", "·"]) if (ts.some((t) => t.st === s)) return s;
  return "▫";
};
const codeTok = (t) => t.st + t.id;


// ∘ ◆ ◈ — the wheel of 27 stations: nine operators in helix order, turned three times.
// Ground is the hub, Figure the spokes, Pattern the rim (THE-WHEEL.md); nakshatra-wise,
// nine lords cycling three times. Coordinates are shared with unweave, which reads them back.
export const RING = { rows: 27, cx: 37, cy: 13, rx: [8, 17, 26], ry: [3, 7, 11], step: 40 };
export function ringLayout() {
  const { cx, cy, rx, ry, step } = RING;
  const th = (k) => ((-90 + step * k) * Math.PI) / 180;
  const at = (k, g, dx = 0, dy = 0) => [Math.round(cy + (ry[g] + dy) * Math.sin(th(k))), Math.round(cx + (rx[g] + dx) * Math.cos(th(k)))];
  const stations = [], labels = [];
  for (let g = 0; g < 3; g++) for (let k = 0; k < 9; k++) { const [r, c] = at(k, g); stations.push({ k, g, r, c }); }
  for (let k = 0; k < 9; k++) { const [r, c] = at(k, 2, 4, 1.6); labels.push({ k, r, c }); }
  return { stations, labels, at };
}
function ringRows(th, M) {
  const { rows, cx, cy, rx, ry } = RING, L = ringLayout();
  const grid = Array.from({ length: rows }, () => Array(I).fill(" "));
  const put = (r, c, ch) => { if (r >= 0 && r < rows && c >= 0 && c < I) grid[r][c] = ch; };
  for (let g = 0; g < 3; g++) for (let t = 0; t < 360; t += 2) put(Math.round(cy + ry[g] * Math.sin((t * Math.PI) / 180)), Math.round(cx + rx[g] * Math.cos((t * Math.PI) / 180)), "◦");
  GRAINS.forEach((gr, g) => put(cy + ry[g], cx, M.grain[gr]));
  put(cy, cx, "◇");
  for (const s of L.stations) put(s.r, s.c, cellStatus(th, OPERATORS[s.k], GRAINS[s.g]));
  for (const l of L.labels) put(l.r, l.c, M.op[OPERATORS[l.k]]);
  const corner = (r, c, str) => [...str].forEach((ch, i) => put(r, c + i, ch));
  corner(1, 2, `${M.grain.Pattern} ↓ ${M.grain.Ground}`);
  corner(1, I - 7, `${M.grain.Ground} ↑ ${M.grain.Pattern}`);
  return grid.map((r) => r.join(""));
}

// ≣ — does the pipeline follow the helix better than shuffles of the same stages? Kendall t of the
// spine's operator order against the helix, p over a seeded shuffle null (n is a budget, disclosed).
export function helixOrder(spec, n = 20000) {
  const ids = spec.spine.split(/[^A-Z]+/).filter((x) => x.length === 3);
  const byId = Object.fromEntries(spec.threads.map((t) => [t.id, t]));
  const seq = ids.map((i) => OPERATORS.indexOf(byId[i].op));
  const tau = (a) => { let c = 0, d = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { if (a[j] > a[i]) c++; else if (a[j] < a[i]) d++; } return (c - d) / (c + d || 1); };
  const obs = tau(seq);
  let s = 12345;
  const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let ge = 0;
  for (let k = 0; k < n; k++) { const a = seq.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (tau(a) >= obs) ge++; }
  return { tau: obs, p: ge / n, n };
}

function braid() {
  // two strands, one full period over nine rows; the operator sits between them
  const rows = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.round(4 + 3.5 * Math.sin((i * Math.PI) / 4)), b = 8 - a;
    const next = Math.round(4 + 3.5 * Math.sin(((i + 1) * Math.PI) / 4));
    const prev = Math.round(4 + 3.5 * Math.sin(((i - 1) * Math.PI) / 4));
    const slope = i < 8 ? next - a : a - prev;
    const cells = Array(9).fill(" ");
    if (a === b) cells[a] = "╳";
    else { cells[a] = slope > 0 ? "╲" : "╱"; cells[b] = slope > 0 ? "╱" : "╲"; }
    rows.push(cells.join(""));
  }
  return rows;
}

function panel(faceMark, colMarks, rowMarks, cell) {
  const L = 4, C = 21;
  const bar = (l, m, r) => l + "─".repeat(L) + m + ("─".repeat(C) + m).repeat(2) + "─".repeat(C) + r;
  const out = ["  " + bar("┌", "┬", "┐")];
  out.push("  │" + center(faceMark, L) + "│" + colMarks.map((m) => center(m, C)).join("│") + "│");
  rowMarks.forEach((rm, r) => {
    out.push("  " + bar("├", "┼", "┤"));
    const cells = colMarks.map((_, c) => cell(r, c));
    const h = Math.max(...cells.map((x) => 1 + Math.ceil(x.codes.length / 4)));
    const cols = cells.map((x) => { const ls = [" " + x.label]; for (let i = 0; i < x.codes.length; i += 4) ls.push(" " + x.codes.slice(i, i + 4).join(" ")); while (ls.length < h) ls.push(""); return ls.map((s) => pad(s, C)); });
    for (let k = 0; k < h; k++) out.push("  │" + center(k === 0 ? rm : "", L) + "│" + cols.map((cl) => cl[k]).join("│") + "│");
  });
  out.push("  " + bar("└", "┴", "┘"));
  return out;
}

export function weave(spec, legend) {
  const M = marksOf(legend);
  const th = spec.threads;
  const art = [];
  const selvedge = "░▒▓▒".repeat(19);
  art.push("╔" + "═".repeat(I) + "╗", line(selvedge), line(""));
  const owl = ["  ,___,   ", "  {o,o}   ", "  /)__)   ", '  -"-"-   '];
  const titleRows = ["", "P E N E L O P E".split("").join(" ").replace(/  +/g, "  "), `◇ ${spec.woven} ◇`, "■ □ ·"];
  // the title spells PENELOPE with single spaces between letters: P E N E L O P E
  titleRows[1] = spec.title.split("").join(" ");
  owl.forEach((o, i) => art.push(line(o + "   " + titleRows[i])));
  art.push(line(""));

  // ∘ ◆ ◈ — the wheel: 27 stations, three turns of the helix
  art.push(rule(ZONES.wheel));
  ringRows(th, M).forEach((r) => art.push(line(r)));

  // the helix: nine operators in dependency order; per grain the strongest status; the spine codes at each
  art.push(rule(ZONES.helix));
  const br = braid();
  const spineIds = new Set(spec.spine.split(/[^A-Z]+/).filter((x) => x.length === 3));
  OPERATORS.forEach((op, i) => {
    const a = actOf(op);
    const cells = GRAINS.map((g) => `${M.grain[g]}${cellStatus(th, op, g)}`).join(" ");
    const codes = th.filter((t) => t.op === op && spineIds.has(t.id)).map((t) => codeTok(t) + M.grain[t.grain]);
    art.push(line(" " + br[i] + "  " + M.op[op] + " " + M.mode[a.mode] + M.domain[a.domain] + "  " + cells + "   " + codes.join(" ")));
  });
  art.push(line(""));
  art.push(line("  " + spec.spine));
  const ho = helixOrder(spec);
  art.push(line(`  ≣ t=${ho.tau.toFixed(3)} p=${ho.p.toFixed(3)} n=${ho.n}`));
  art.push(line(""));

  // ◀ ▲ ▶ — the three faces of one cube; every thread stands on all three
  art.push(rule(ZONES.faces));
  const opAt = (m, d) => OPERATORS.find((o) => actOf(o).mode === m && actOf(o).domain === d);
  const tok = (ts) => ts.map(codeTok);
  art.push(...panel(M.face.ACT, MODES.map((m) => M.mode[m]), DOMAINS.map((d) => M.domain[d]), (r, c) => { const op = opAt(MODES[c], DOMAINS[r]); return { label: `${M.op[op]} ${M.mode[MODES[c]]}${M.domain[DOMAINS[r]]}`, codes: tok(th.filter((t) => t.op === op)) }; }).map(line));
  art.push(...panel(M.face.SITE, GRAINS.map((g) => M.grain[g]), DOMAINS.map((d) => M.domain[d]), (r, c) => ({ label: `${M.domain[DOMAINS[r]]}${M.grain[GRAINS[c]]}`, codes: tok(th.filter((t) => actOf(t.op).domain === DOMAINS[r] && t.grain === GRAINS[c])) })).map(line));
  art.push(...panel(M.face.STANCE, GRAINS.map((g) => M.grain[g]), MODES.map((m) => M.mode[m]), (r, c) => ({ label: `${M.mode[MODES[r]]}${M.grain[GRAINS[c]]}`, codes: tok(th.filter((t) => actOf(t.op).mode === MODES[r] && t.grain === GRAINS[c])) })).map(line));

  // ↑ ↓ — the holons: the low sets possibility for the high, the high probability for the low
  art.push(rule(ZONES.holons));
  for (let lvl = 4; lvl >= 0; lvl--) {
    const toks = wrap(th.filter((t) => t.lvl === lvl).map((t) => codeTok(t) + M.op[t.op] + M.grain[t.grain]), 66);
    const arrow = lvl === 4 ? "↑" : lvl === 0 ? "↓" : "│";
    toks.forEach((s, k) => art.push(line(` ${k === 0 ? arrow : "│"} ${k === 0 ? lvl : " "}  ${s}`)));
  }

  // ▫ ■ — the void, defined: a specimen of the shape (constructed, not a run)
  art.push(rule(ZONES.voids));
  art.push(line("   ∅     ▫ ▫ ▫ ▫ ▫ ▫"));
  art.push(line("   ≡∨↻∨●  ≡ ≡ ↻ ● ✗ ▫"));
  art.push(line("   △     ■ ■ ■ ■ ▫ ▫"));
  art.push(line(""), line(selvedge), "╚" + "═".repeat(I) + "╝");

  // ⟨⟩ — the key: every thread, addressed; unweave from here
  const key = [];
  const kh = `╔═[ ${ZONES.key} ]`;
  key.push(kh + "═".repeat(W - 1 - [...kh].length) + "╗");
  wrap(Object.entries(spec.prefixes).map(([k, v]) => `${k}=${v}`), 72).forEach((s) => key.push(line("  " + s)));
  let last = null;
  for (const t of th) {
    if (t.st !== last) { key.push(line("")); key.push(line(`${t.st} ` + "░▒▓▒".repeat(17))); last = t.st; }
    key.push(line(`${t.st}${t.id} ${t.lvl} ${M.op[t.op]}${M.grain[t.grain]} ${t.typing} ${t.name}`));
    wrap(t.refs, 69).forEach((s) => key.push(line("     @ " + s)));
    if (t.ctl) key.push(line("     " + t.ctl + " ⇒✗"));
  }
  key.push(line(""), "╚" + "═".repeat(I) + "╝");
  return { art, key };
}

export const legendMd = (legend) => {
  const out = ["# ◇ legend", "", legend.note, "", "The tapestry carries symbols; this file carries the words. Generated from [`gym/tapestry.legend.json`](gym/tapestry.legend.json) by `gym/weave.mjs`.", ""];
  for (const [g, v] of Object.entries(legend)) {
    if (["schema", "note", "terms"].includes(g)) continue;
    out.push(`## ${g}`, "", "| symbol | is | means |", "|---|---|---|");
    for (const [k, e] of Object.entries(v)) out.push(`| \`${k}\` | ${e.is}${e.eo && e.eo !== k ? ` (EO canon \`${e.eo}\`)` : ""} | ${e.means} |`);
    out.push("");
  }
  out.push("## terms", "", `- **key row**: ${legend.terms.key}`, `- **levels**: ${Object.entries(legend.terms.level).map(([k, v]) => `\`${k}\` ${v}`).join(" · ")}`, `- **prefixes**: ${legend.terms.prefix}`, "");
  return out.join("\n");
};

export const tapestryMd = ({ art, key }) => [
  "# ◇ tapestry", "",
  "[legend](LEGEND.md) · unweave: `node gym/unweave.mjs` · weave: `node gym/weave.mjs` · check: `node gym/check-tapestry.mjs`", "",
  BEGIN, "```text", ...art, "```", "", "```text", ...key, "```", END, "",
].join("\n");

export function load() {
  const spec = JSON.parse(fs.readFileSync(path.join(HERE, "tapestry.spec.json"), "utf8"));
  const legend = JSON.parse(fs.readFileSync(path.join(HERE, "tapestry.legend.json"), "utf8"));
  return { spec, legend };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { spec, legend } = load();
  const w = weave(spec, legend);
  fs.writeFileSync(path.join(ROOT, "TAPESTRY.md"), tapestryMd(w));
  fs.writeFileSync(path.join(ROOT, "LEGEND.md"), legendMd(legend));
  console.log(`woven: cloth ${w.art.length} rows, key ${w.key.length} rows, ${spec.threads.length} threads`);
}
