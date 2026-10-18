import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPaginationStore, renderPage, totalPages, PAGINATION_TTL_MS } from './discord-pagination.js';

const t = (key, params = {}) =>
  ({ 'bot.pagerFooter': `Page ${params.page} of ${params.pages} (Total: ${params.total} series)` }[key] ?? key);

describe('services/discord-pagination', () => {
  it('pagina las líneas y arma el descriptor de botones', () => {
    const store = createPaginationStore();
    const lines = Array.from({ length: 45 }, (_, i) => `Serie ${i}`);
    const token = store.create({ lines, pageSize: 20, userId: 'u1', header: 'Pendientes' });
    const item = store.get(token);
    assert.equal(totalPages(item), 3);

    const first = renderPage(item, 1, t);
    assert.equal(first.page, 1);
    assert.equal(first.pages, 3);
    assert.ok(first.content.includes('Serie 0'));
    assert.ok(!first.content.includes('Serie 20'));
    assert.ok(first.content.includes('Page 1 of 3 (Total: 45 series)'));
    assert.equal(first.prevDisabled, true);
    assert.equal(first.nextDisabled, false);

    const last = renderPage(item, 3, t);
    assert.equal(last.page, 3);
    assert.equal(last.nextDisabled, true);
    assert.equal(last.prevDisabled, false);
    assert.ok(last.content.includes('Serie 44'));
  });

  it('clampea páginas fuera de rango', () => {
    const store = createPaginationStore();
    const token = store.create({ lines: ['a', 'b'], pageSize: 10, userId: 'u1' });
    const item = store.get(token);
    assert.equal(renderPage(item, 99, t).page, 1);
    assert.equal(renderPage(item, 0, t).page, 1);
    assert.equal(renderPage(item, -5, t).page, 1);
  });

  it('expira por TTL y remove lo borra', () => {
    let now = 0;
    const store = createPaginationStore({ ttlMs: 100, now: () => now });
    const token = store.create({ lines: ['a'], pageSize: 1, userId: 'u1' });
    assert.ok(store.get(token));
    now = 101;
    assert.equal(store.get(token), null);

    const other = store.create({ lines: ['a'], pageSize: 1, userId: 'u1' });
    store.remove(other);
    assert.equal(store.get(other), null);
  });

  it('una sola página cuando todo entra', () => {
    const store = createPaginationStore();
    const token = store.create({ lines: ['a', 'b'], pageSize: 20, userId: 'u1' });
    const page = renderPage(store.get(token), 1, t);
    assert.equal(page.pages, 1);
    assert.equal(page.prevDisabled, true);
    assert.equal(page.nextDisabled, true);
  });

  it('expone el TTL por defecto', () => {
    assert.equal(PAGINATION_TTL_MS, 300000);
  });
});
