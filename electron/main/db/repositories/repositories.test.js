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
import { listMangas, getMangaById, createManga, updateManga, deleteManga, setMangaIsAdult } from './mangas.js';
import {
  listEntries,
  getEntryById,
  upsertEntry,
  updateEntry,
  listEntriesByProfiles,
} from './entries.js';
import { formats, publishers } from './catalogs.js';
import {
  getRef,
  upsertRef,
  setCoverFile,
  removeRef,
  listRefsByManga,
} from './manga-external-refs.js';

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
    assert.equal(listProfiles(db).length, 0);
    const created = createProfile(db, 'beta');
    assert.equal(created.name, 'beta');
    createProfile(db, 'zeta');
    assert.deepEqual(
      listProfiles(db).map((p) => p.name),
      ['beta', 'zeta']
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

  it('mangas: isAdult en el DTO, alta/edición y setMangaIsAdult', () => {
    const created = createManga(db, { name: 'adult', volumes: 1, isAdult: true });
    assert.equal(created.isAdult, true);
    assert.equal(getMangaById(db, created.id).isAdult, true);
    assert.equal(listMangas(db).find((m) => m.id === created.id).isAdult, true);

    assert.equal(updateManga(db, { ...created, isAdult: false }).isAdult, false);
    assert.equal(setMangaIsAdult(db, created.id, true).isAdult, true);
    assert.equal(createManga(db, { name: 'plain', volumes: 1 }).isAdult, false);
  });

  it('mangas: volúmenes vacío/null/inválido -> 0 (serie en publicación)', () => {
    assert.equal(createManga(db, { name: 'a' }).volumes, 0);
    assert.equal(createManga(db, { name: 'b', volumes: null }).volumes, 0);
    assert.equal(createManga(db, { name: 'c', volumes: '' }).volumes, 0);
    assert.equal(createManga(db, { name: 'd', volumes: -3 }).volumes, 0);
    const m = createManga(db, { name: 'e', volumes: 12 });
    assert.equal(updateManga(db, { ...m, volumes: null }).volumes, 0);
  });

  it('mangas: delete quita el manga y sus entries (CASCADE)', () => {
    const manga = createManga(db, { name: 'borrar', volumes: 5 });
    const profile = createProfile(db, 'yo');
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    assert.equal(deleteManga(db, manga.id), true);
    assert.equal(getMangaById(db, manga.id), null);
    assert.equal(listEntries(db).length, 0);
    assert.equal(deleteManga(db, manga.id), false); // ya no existe
  });

  it('catalogs: CRUD + alta case-insensitive', () => {
    assert.equal(formats.list(db).length, 0);
    // "ivrea" reusa "Ivrea": no crea duplicado.
    const first = publishers.create(db, 'Ivrea');
    const again = publishers.create(db, '  ivrea ');
    assert.equal(again.id, first.id);
    assert.equal(publishers.list(db).length, 1);
    assert.equal(publishers.findByName(db, 'IVREA').id, first.id);

    const created = publishers.create(db, 'Kemuri');
    assert.ok(created.id > 0);
    assert.equal(publishers.update(db, created.id, 'Kemuri Ed.').name, 'Kemuri Ed.');
    publishers.remove(db, created.id);
    assert.equal(publishers.getById(db, created.id), null);
  });

  it('catalogs: nombres vacíos/null, alta y update', () => {
    assert.equal(publishers.findByName(db, null), null);
    assert.equal(publishers.findByName(db, '   '), null);
    assert.equal(publishers.findByName(db, 'NoExiste'), null);
    assert.throws(() => publishers.create(db, '   '), /requerido/i);
    assert.throws(() => publishers.create(db, null), /requerido/i);
    const created = publishers.create(db, 'Kemuri');
    assert.equal(publishers.update(db, created.id, null).name, '');
    assert.equal(publishers.remove(db, created.id), undefined);
    assert.equal(publishers.getById(db, created.id), null);
  });

  it('entries: upsert con JOIN anidado y conflicto', () => {
    const format = formats.create(db, 'Tankoubon');
    const publisher = publishers.create(db, 'Panini');
    const manga = createManga(db, {
      name: 'berserk',
      volumes: 41,
      formatId: format.id,
      publisherId: publisher.id,
    });
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

  it('manga-external-refs: upsert, cover y remove por (manga, provider)', () => {
    const manga = createManga(db, { name: 'berserk', volumes: 41 });
    assert.equal(getRef(db, manga.id, 'anilist'), null);

    const created = upsertRef(db, { mangaId: manga.id, provider: 'anilist', externalId: 30013 });
    assert.equal(created.externalId, '30013');
    assert.equal(created.coverFile, null);
    assert.equal(created.isAdult, false); // default: no adulto

    // El indicador viaja en el DTO y se normaliza a booleano (SQLite guarda 0/1).
    const adult = upsertRef(db, {
      mangaId: manga.id,
      provider: 'anilist',
      externalId: 30013,
      isAdult: true,
    });
    assert.equal(adult.isAdult, true);

    const withCover = setCoverFile(db, manga.id, 'anilist', '3.jpg');
    assert.equal(withCover.coverFile, '3.jpg');
    assert.equal(withCover.isAdult, true);

    // Upsert del mismo par actualiza, no duplica.
    const updated = upsertRef(db, {
      mangaId: manga.id,
      provider: 'anilist',
      externalId: 30014,
      coverFile: 'x.png',
      isAdult: false,
    });
    assert.equal(listRefsByManga(db, manga.id).length, 1);
    assert.equal(getRef(db, manga.id, 'anilist').externalId, '30014');
    assert.equal(updated.isAdult, false);

    assert.equal(removeRef(db, manga.id, 'anilist'), true);
    assert.equal(removeRef(db, manga.id, 'anilist'), false);
  });
});
