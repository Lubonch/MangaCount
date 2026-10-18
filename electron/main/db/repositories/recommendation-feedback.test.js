import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../client.js';
import { createProfile, deleteProfile } from './profiles.js';
import {
  dismiss,
  listDismissed,
  clearDismissal,
  markSeen,
  listSeen,
  pruneSeen,
} from './recommendation-feedback.js';

describe('repositories/recommendation-feedback', () => {
  let dir;
  let db;
  let profile;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcrecfb-'));
    db = openDb(dir);
    profile = createProfile(db, 'yo');
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('dismiss/list/clear: descarte permanente por (perfil, provider, externalId)', () => {
    const row = dismiss(db, profile.id, 'anilist', 30001);
    assert.equal(row.externalId, '30001');
    assert.equal(row.provider, 'anilist');
    assert.equal(listDismissed(db, profile.id).length, 1);

    // Idempotente: repetir no duplica.
    dismiss(db, profile.id, 'anilist', 30001);
    assert.equal(listDismissed(db, profile.id).length, 1);

    // Otro perfil no lo ve.
    const other = createProfile(db, 'otro');
    assert.equal(listDismissed(db, other.id).length, 0);

    assert.equal(clearDismissal(db, profile.id, 'anilist', 30001), true);
    assert.equal(clearDismissal(db, profile.id, 'anilist', 30001), false);
    assert.equal(listDismissed(db, profile.id).length, 0);
  });

  it('markSeen/listSeen respeta el corte `since` y refresca SeenAt al repetir', () => {
    markSeen(db, profile.id, 'anilist', 'a', '2026-01-01T00:00:00.000Z');
    markSeen(db, profile.id, 'anilist', 'b', '2026-03-01T00:00:00.000Z');

    assert.equal(listSeen(db, profile.id).length, 2);
    assert.deepEqual(
      listSeen(db, profile.id, '2026-02-01T00:00:00.000Z').map((r) => r.externalId),
      ['b']
    );

    // Repetir actualiza SeenAt (mismo par, sin duplicar).
    markSeen(db, profile.id, 'anilist', 'a', '2026-04-01T00:00:00.000Z');
    assert.equal(listSeen(db, profile.id).length, 2);
    assert.deepEqual(
      listSeen(db, profile.id, '2026-03-15T00:00:00.000Z').map((r) => r.externalId).sort(),
      ['a']
    );
  });

  it('pruneSeen borra solo las vistas anteriores al corte', () => {
    markSeen(db, profile.id, 'anilist', 'old', '2026-01-01T00:00:00.000Z');
    markSeen(db, profile.id, 'anilist', 'new', '2026-06-01T00:00:00.000Z');
    assert.equal(pruneSeen(db, profile.id, '2026-03-01T00:00:00.000Z'), 1);
    assert.deepEqual(
      listSeen(db, profile.id).map((r) => r.externalId),
      ['new']
    );
  });

  it('ON DELETE CASCADE: borrar el perfil limpia descartes y vistos', () => {
    dismiss(db, profile.id, 'anilist', 1);
    markSeen(db, profile.id, 'anilist', 1, '2026-01-01T00:00:00.000Z');
    deleteProfile(db, profile.id);
    assert.equal(listDismissed(db, profile.id).length, 0);
    assert.equal(listSeen(db, profile.id).length, 0);
  });
});
