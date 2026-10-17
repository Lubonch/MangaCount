import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLocalFileGrants } from './local-file-grants.js';

describe('services/local-file-grants', () => {
  it('otorga y consume un permiso una sola vez', () => {
    const grants = createLocalFileGrants();
    const source = path.join('/tmp', 'portada.png');

    assert.equal(grants.consume(source), false);
    assert.equal(grants.grant(source), true);
    assert.equal(grants.consume(source), true);
    assert.equal(grants.consume(source), false);
  });

  it('compara rutas resueltas (relativa vs absoluta)', () => {
    const grants = createLocalFileGrants();

    assert.equal(grants.grant('./portada.png'), true);
    assert.equal(grants.consume(path.resolve('portada.png')), true);
  });

  it('ignora valores inválidos sin otorgar permiso', () => {
    const grants = createLocalFileGrants();

    assert.equal(grants.grant(''), false);
    assert.equal(grants.grant('   '), false);
    assert.equal(grants.grant(null), false);
    assert.equal(grants.grant(123), false);
    assert.equal(grants.consume(undefined), false);
    assert.equal(grants.consume(''), false);
  });
});
