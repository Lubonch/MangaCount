import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../client.js';
import {
  listProfiles,
  getProfileById,
  createProfile,
  renameProfile,
  setProfilePicture,
  deleteProfile,
} from './profiles.js';
import { listMangas, getMangaById, createManga, updateManga } from './mangas.js';
import {
  listEntries,
  getEntryById,
  upsertEntry,
  updateEntry,
  listEntriesByProfiles,
} from './entries.js';
import { formats, publishers } from './catalogs.js';

describe('repositories', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcrepo-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('profiles: CRUD + orden + foto', () => {
    const created = createProfile(db, 'beta');
    assert.equal(created.name, 'beta');
    assert.deepEqual(
      listProfiles(db).map((p) => p.name),
      ['beta', 'Default Profile']
    );
    assert.equal(renameProfile(db, created.id, 'alfa').name, 'alfa');
    assert.equal(setProfilePicture(db, created.id, 'pic.png').profilePicture, 'pic.png');
    deleteProfile(db, created.id);
    assert.equal(getProfileById(db, created.id), null);
  });

  it('mangas: CRUD', () => {
    const created = createManga(db, { name: 'berserk', volumes: 41 });
    assert.equal(created.volumes, 41);
    const updated = updateManga(db, { ...created, volumes: 42 });
    assert.equal(updated.volumes, 42);
    assert.equal(listMangas(db).length, 1);
  });

  it('catalogs: seed + CRUD', () => {
    assert.equal(formats.list(db).length, 5);
    const created = publishers.create(db, 'Kemuri');
    assert.ok(created.id > 0);
    assert.equal(publishers.update(db, created.id, 'Kemuri Ed.').name, 'Kemuri Ed.');
    publishers.remove(db, created.id);
    assert.equal(publishers.getById(db, created.id), null);
  });

  it('entries: upsert con JOIN anidado y conflicto', () => {
    const manga = createManga(db, { name: 'berserk', volumes: 41, formatId: 1, publisherId: 1 });
    const profile = createProfile(db, 'yo');
    const first = upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 3 });
    assert.equal(first.quantity, 3);
    assert.equal(first.manga.name, 'berserk');
    assert.equal(first.manga.format.name, 'Tankoubon');
    assert.equal(first.manga.publisher.name, 'Panini');
    // Mismo par (perfil, manga): actualiza en vez de duplicar (UNIQUE).
    const second = upsertEntry(db, {
      mangaId: manga.id,
      profileId: profile.id,
      quantity: 10,
      priority: true,
    });
    assert.equal(second.id, first.id);
    assert.equal(second.quantity, 10);
    assert.equal(second.priority, true);
    assert.equal(listEntries(db, profile.id).length, 1);
    const updated = updateEntry(db, { ...second, pending: '11-12' });
    assert.equal(updated.pending, '11-12');
    assert.equal(getEntryById(db, 99999), null);
  });

  it('entries: listado por dos perfiles (shared)', () => {
    const manga = createManga(db, { name: 'berserk', volumes: 41 });
    const a = createProfile(db, 'a');
    const b = createProfile(db, 'b');
    upsertEntry(db, { mangaId: manga.id, profileId: a.id, quantity: 1 });
    upsertEntry(db, { mangaId: manga.id, profileId: b.id, quantity: 2 });
    assert.equal(listEntriesByProfiles(db, a.id, b.id).length, 2);
  });
});
