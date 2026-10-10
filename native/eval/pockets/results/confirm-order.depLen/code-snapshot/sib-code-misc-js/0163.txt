// Overview is a new medium of the existing Penelope lifecycle, never a second engine.
import { materializeOverview, verifyMaterialization } from '../overview.mjs';
import { ethosClear, requireClearance } from '../../../../khora/native/organs/ethos.js';
import { logos } from '../../../../khora/native/organs/logos.js';
import { pathosOf, reGroundCondition } from '../../../../khora/native/organs/pathos.js';
export async function readUnits(task, ctx) {
  const clearance = ethosClear(task);
  requireClearance(clearance);
  if (!clearance.cleared) throw new Error('ethos refused: ' + clearance.reason);
  const product = await materializeOverview(ctx.overview);
  const checked = await verifyMaterialization(product);
  if (!checked.ok) throw new Error('overview integrity failed: ' + checked.gap);
  const o = product.overview;
  const cycles = logos(o.blocks.flatMap(b => (b.premises || []).map(p => ({ end1: b.id, label: 'depends-on', end2: p }))));
  if (cycles.length) throw new Error('logos: circular overview support');
  const read = pathosOf({ text: o.blocks.map(b => b.text || '').join('\n'), experiencer: { who: o.frame.experiencer, read: 'overview:' + o.revision }, state: {} });
  // These are rhythm readings of rendered text, NOT measures of human understanding.
  const archons = { ethos: { cleared: clearance.cleared, charterSha256: clearance.charterSha256, compendiumCount: clearance.compendiumCount }, logos: { cycles }, pathos: { read, condition: reGroundCondition(read), limits: 'No user understanding, engagement, or affect measured; curve remains a gap without a reader fold.' } };
  ctx.overviewProduct = product;
  ctx.overviewArchons = archons;
  return [{ name: 'overview-record', spec: task }];
}
export function autofill(u, ctx) { return { code: JSON.stringify(ctx.overviewProduct.overview), address: 'overview:' + ctx.overviewProduct.overview.revision }; }
export const snip = v => v;
export function probeUnit(code, u, ctx) { return { ok: code.trim() === JSON.stringify(ctx.overviewProduct.overview), detail: 'canonical evidence record' }; }
export function testUnits(code, units, ctx) {
  const ok = units.length === 1 && code.trim() === JSON.stringify(ctx.overviewProduct.overview);
  return { ok, reason: ok ? 'overview-replay-verified' : 'altered-overview', archons: ctx.overviewArchons };
}
export function toDocument(value, ctx) { return ctx.overviewProduct.html; }
export default { kind: 'overview', ext: 'json', readUnits, autofill, snip, probeUnit, testUnits, toDocument };
