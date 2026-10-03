import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const files = readdirSync('dist/assets').filter(name => name.endsWith('.js'));
assert.ok(files.length > 0, 'Production JavaScript must exist');
for (const file of files) assert.ok(!readFileSync(`dist/assets/${file}`, 'utf8').includes('__snake'), 'Test interface must be absent from production');
console.log('Production verification passed: test interface is absent.');
