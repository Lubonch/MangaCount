// Guards the electron-builder `files` list against runtime imports that fall
// outside the packaged app.asar. A missing entry crashes the app at startup
// (ERR_MODULE_NOT_FOUND) and the test suite alone cannot catch it, because it
// runs against the repo and not against the bundle. This is what broke 2.2.5:
// `shared/i18n` was imported by the main process but was not in `files`.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { build } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function walkJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJs(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// Minimal glob -> RegExp for the patterns used in `build.files` (`**`, `*`, `!`).
// `**/` matches zero or more directories, as in minimatch.
function globToRegExp(glob) {
  const body = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*');
  return new RegExp(`^${body}$`);
}

const include = build.files.filter((p) => !p.startsWith('!')).map(globToRegExp);
const exclude = build.files.filter((p) => p.startsWith('!')).map((p) => globToRegExp(p.slice(1)));
const isPackaged = (rel) =>
  include.some((re) => re.test(rel)) && !exclude.some((re) => re.test(rel));

describe('packaging: build.files cubre los imports de runtime', () => {
  it('todo import relativo que sale de electron/ está incluido en el asar', () => {
    const missing = new Set();
    for (const file of walkJs(path.join(root, 'electron'))) {
      if (file.endsWith('.test.js')) continue;
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/(?:from|import)\s+'(\.[^']+)'/g)) {
        const target = path.resolve(path.dirname(file), match[1]);
        const rel = path.relative(root, target).split(path.sep).join('/');
        if (rel.startsWith('electron/')) continue;
        if (!isPackaged(rel)) missing.add(rel);
      }
    }
    assert.deepEqual([...missing].sort(), [], `imports fuera del asar: ${[...missing].join(', ')}`);
  });

  it('los directorios compartidos que usa el main están en build.files', () => {
    assert.ok(isPackaged('shared/i18n/index.js'), 'shared/i18n');
    assert.ok(isPackaged('shared/recommendations/recommendationEngine.js'), 'shared/recommendations');
    assert.ok(isPackaged('mangacount.client/dist/index.html'), 'mangacount.client/dist');
  });

  it('los tests no se empaquetan', () => {
    assert.ok(!isPackaged('shared/i18n/i18n.test.js'));
  });
});
