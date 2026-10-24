// sync.mjs — keep the vendored copies current from their own repos, and say when they are not.
//   node scripts/sync.mjs            vendor the-fold and holodeck from a CLEAN detached worktree of each repo's origin/main, then report
//   node scripts/sync.mjs --check    report only: which vendored commit is behind which repo's origin/main (exit 1 when any is)
//   node scripts/sync.mjs --apply    also restore the khora files that origin/main changed and this tree did not (never one with local edits)
// The Fold's judge, the Holodeck's research and khora's own identity/EOT modules are never edited here; the vendor/ copies are made, not written.
// A working tree is never read from: its uncommitted edits are not what the other repos published.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// the repos sit side by side; khora is often reached through a symlink (~/.khora), so the real path is tried too
const parent = [process.env.FOLD_REPOS, path.resolve(root, ".."), path.resolve(fs.realpathSync(root), ".."), path.join(os.homedir(), "Downloads", "workspace")].filter(Boolean).find((d) => fs.existsSync(path.join(d, "the-fold")) && fs.existsSync(path.join(d, "holodeck"))) ?? path.resolve(root, "..");
const args = new Set(process.argv.slice(2));
const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const REPOS = [
  { name: "the-fold", dir: path.join(parent, "the-fold"), vendor: path.join(root, "vendor", "the-fold"), script: "vendor-the-fold.mjs" },
  { name: "holodeck", dir: path.join(parent, "holodeck"), vendor: path.join(root, "vendor", "holodeck"), script: "vendor-holodeck.mjs" },
];
const vendored = (r) => { try { return JSON.parse(fs.readFileSync(path.join(r.vendor, "VENDOR.json"), "utf8")); } catch { return {}; } };
let stale = 0;
for (const r of REPOS) {
  if (!fs.existsSync(r.dir)) { console.log(`${r.name}: no checkout at ${r.dir}`); stale++; continue; }
  try { git(r.dir, "fetch", "-q", "origin"); } catch (e) { console.log(`${r.name}: fetch failed (${String(e.message).split("\n")[0]}); using what is already fetched`); }
  const head = git(r.dir, "rev-parse", "origin/main"), v = vendored(r), have = v.commit ?? v.source?.commit ?? null;
  const behind = have !== head;
  console.log(`${r.name}: vendored ${have ? have.slice(0, 10) : "(unknown)"}  origin/main ${head.slice(0, 10)}  ${behind ? "BEHIND" : "current"}`);
  if (behind) stale++;
  if (behind && !args.has("--check")) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `sync-${r.name}-`));
    try {
      git(r.dir, "worktree", "add", "--detach", "-q", path.join(tmp, "wt"), head);
      execFileSync(process.execPath, [path.join(root, "scripts", r.script), path.join(tmp, "wt")], { cwd: root, stdio: "inherit" });
      stale--;
    } finally { try { git(r.dir, "worktree", "remove", "--force", path.join(tmp, "wt")); } catch { /* gone */ } fs.rmSync(tmp, { recursive: true, force: true }); }
  }
}
// khora itself: what origin/main changed that this tree has not taken
try {
  git(root, "fetch", "-q", "origin");
  const up = git(root, "diff", "--name-only", "HEAD", "origin/main").split("\n").filter(Boolean);
  const blob = (ref, f) => { try { return execFileSync("git", ["show", `${ref}:${f}`], { cwd: root, maxBuffer: 1 << 26 }); } catch { return null; } };
  const mine = (f) => { try { return fs.readFileSync(path.join(root, f)); } catch { return null; } };
  const same = (f, ref) => { const a = mine(f), b = blob(ref, f); return a === null || b === null ? a === b : a.equals(b); };
  const taken = up.filter((f) => same(f, "origin/main")), open_ = up.filter((f) => !taken.includes(f));
  const clean = open_.filter((f) => same(f, "HEAD")), clash = open_.filter((f) => !clean.includes(f));
  console.log(`khora: origin/main differs from HEAD in ${up.length} file(s); ${taken.length} already taken here, ${clean.length} to take${clash.length ? `, ${clash.length} edited here and different upstream (${clash.slice(0, 4).join(", ")})` : ""}`);
  if (open_.length) stale++;
  if (up.length && args.has("--apply") && clean.length) { git(root, "restore", "--source=origin/main", "--worktree", "--", ...clean); console.log(`khora: restored ${clean.length} file(s) from origin/main`); }
} catch (e) { console.log(`khora: could not compare (${String(e.message).split("\n")[0]})`); }
if (args.has("--check")) process.exit(stale ? 1 : 0);
console.log(stale ? "some copies are still behind: see above" : "everything is current; run npm test");
