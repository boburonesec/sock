import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractDocs = [
  'docs/product-requirements.md',
  'docs/DOMAIN_MODEL_V1.md',
  'docs/page-map-v1.md',
  'docs/MVP_KNOWN_LIMITATIONS_V2.md',
  'docs/USER_GUIDE_V1.md',
  'docs/BUSINESS_ACCEPTANCE_WALKTHROUGH_V1.md',
];
const contents = await Promise.all(contractDocs.map(async (file) => [file, await readFile(path.join(root, file), 'utf8')]));

for (const [file, text] of contents) {
  assert.doesNotMatch(text, /notification center is a placeholder|NotificationModule` is an empty|Placeholder shell.*notification/i, `${file}: obsolete notification placeholder wording returned`);
}

const requirements = contents.find(([file]) => file === 'docs/product-requirements.md')[1];
for (const implemented of ['Persistent in-app inbox', 'machine', 'quality recheck', 'inspection']) {
  assert.match(requirements, new RegExp(implemented, 'i'), `requirements must name implemented contract: ${implemented}`);
}
for (const deferred of ['low stock', 'order deadline', 'pending advance', 'generic defect', 'stalled batch', 'overdue debt']) {
  assert.match(requirements, new RegExp(deferred.replace(' ', '\\s+'), 'i'), `requirements must mark future trigger: ${deferred}`);
}
assert.match(requirements, /future scope/i, 'requirements must separate deferred notification triggers');

console.log(`PASS notification contract: ${contractDocs.length} documents checked`);
