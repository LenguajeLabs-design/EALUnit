import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const base = '/EALUnit/';
const html = await readFile('dist/index.html', 'utf8');
const references = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((match) => match[1]);
assert.ok(
  references.some((url) => url.endsWith('.js')),
  'The Pages build needs an application script.',
);
for (const url of references) {
  assert.ok(url.startsWith(base), `Asset is missing the project base: ${url}`);
  await access(path.join('dist', url.slice(base.length)));
}
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  assert.ok(
    (await readdir(`dist/pdf-assets/${folder}`)).length > 0,
    `Missing PDF assets: ${folder}`,
  );
}
assert.ok(
  (await readdir('dist/assets')).some((name) => /^pdf\.worker.*\.mjs$/.test(name)),
  'Missing PDF worker.',
);
console.log(
  'Pages asset paths, PDF worker, fonts, character maps, and WebAssembly files verified.',
);
