// results/confirm-comp.asym/confirm-extra.mjs — NEW FILE written after the header was hashed: ADV-6 leakage checks -> leak.json.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function modeLeak({ PREREG, HERE, POCKETS }) {
  const out = { irc: {}, code: {}, ud: {}, prose: {} };
  // (a) IRC: verbatim overlap of held-out messages (>= 6 tokens) with the atlas pockets of #ubuntu
  const org = await import(pathToFileURL(path.join(POCKETS, "loaders/organic.mjs")).href), chat = await (await import(pathToFileURL(path.join(POCKETS, "loaders/_sibling-asym-chat.mjs")).href)).load(null);
  const kinIds = ["oc-irc-ubuntu-0406", "oc-irc-ubuntu-0607", "oc-irc-ubuntu-0809", "oc-irc-ubuntu-0910", "oc-irc-ubuntu-1112", "oc-irc-ubuntu-1315"], atlas = {};
  for (const id of kinIds) atlas[id] = new Set(org.PARTS.find((x) => x.id === id).build().units.filter((u) => u.length >= 6).map((u) => u.join(" ")));
  for (const p of chat) {
    const mine = p.units.filter((u) => u.length >= 6).map((u) => u.join(" ")), kin = p.meta.atlasKin, row = { messagesGe6: mine.length, verbatimInKin: mine.filter((m) => atlas[kin].has(m)).length, verbatimInAnyUbuntu: mine.filter((m) => kinIds.some((k) => atlas[k].has(m))).length };
    row.shareInKin = row.verbatimInKin / row.messagesGe6; row.shareInAnyUbuntu = row.verbatimInAnyUbuntu / row.messagesGe6; row.kin = kin; out.irc[p.id] = row;
  }
  // (b) code: loader counters; (c) UD: leak counters from the loader meta
  const code = await (await import(pathToFileURL(path.join(POCKETS, "loaders/_sibling-asym-code.mjs")).href)).load(null);
  for (const p of code) out.code[p.id] = p.meta.notes;
  const ud = await (await import(pathToFileURL(path.join(POCKETS, "loaders/_sibling-asym-ud.mjs")).href)).load(null);
  for (const p of ud) out.ud[p.id] = p.meta.leak;
  // (d) prose: is any source file loaded by an atlas pocket? (manifest pockets' source fields)
  const man = fs.readdirSync(path.join(POCKETS, "loaders")).filter((f) => f.endsWith(".manifest.json")).flatMap((f) => (JSON.parse(fs.readFileSync(path.join(POCKETS, "loaders", f), "utf8")).pockets ?? []).map((p) => ({ f, id: p.id, s: JSON.stringify([p.source, p.sources, p.files, p.path]) })));
  for (const key of ["pg32773", "pg15807", "pg2542", "pg43668", "pg14200", "pg2148", "pg160_", "pg74987", "pg76749", "doctor-faustus-1604"]) out.prose[key] = man.filter((m) => m.s.includes(key)).map((m) => `${m.f}:${m.id}`);
  fs.writeFileSync(path.join(HERE, "leak.json"), JSON.stringify(out, null, 1)); console.error("leak.json written", JSON.stringify(out.irc), JSON.stringify(out.prose));
}
