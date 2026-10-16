import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createProfile, getProfileById } from '../db/repositories/profiles.js';
import {
  saveProfilePicture,
  profilePicturePath,
  profileImageUrl,
  PROFILE_IMAGE_SCHEME,
} from './files.js';

describe('services/files', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcfiles-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rechaza buffer vacío o ausente', () => {
    assert.throws(
      () => saveProfilePicture(db, dir, 1, { originalName: 'a.png', buffer: Buffer.alloc(0) }),
      /vacío/
    );
    assert.throws(() => saveProfilePicture(db, dir, 1, { originalName: 'a.png' }), /vacío/);
  });

  it('rechaza extensiones no permitidas y nombre ausente', () => {
    assert.throws(
      () => saveProfilePicture(db, dir, 1, { originalName: 'virus.exe', buffer: Buffer.from([1]) }),
      /imágenes/
    );
    assert.throws(() => saveProfilePicture(db, dir, 1, { buffer: Buffer.from([1]) }), /imágenes/);
  });

  it('guarda la imagen, normaliza la extensión y actualiza el perfil', () => {
    const profile = createProfile(db, 'yo');
    const { fileName, url } = saveProfilePicture(db, dir, profile.id, {
      originalName: 'FOTO.PNG',
      buffer: Buffer.from([1, 2, 3]),
    });

    assert.ok(fileName.startsWith(`profile_${profile.id}_`));
    assert.equal(path.extname(fileName), '.png');
    assert.equal(url, `mangacount://profiles/${fileName}`);
    assert.ok(fs.existsSync(path.join(dir, 'profiles', fileName)));
    assert.equal(getProfileById(db, profile.id).profilePicture, url);
  });

  it('el upload vale aunque falle la persistencia del perfil (catch)', () => {
    const throwingDb = {
      prepare() {
        throw new Error('db rota');
      },
    };
    const { fileName, url } = saveProfilePicture(throwingDb, dir, 42, {
      originalName: 'x.Jpg',
      buffer: Buffer.from([9]),
    });
    assert.ok(fileName.startsWith('profile_42_'));
    assert.equal(path.extname(fileName), '.jpg');
    assert.equal(url, `mangacount://profiles/${fileName}`);
  });

  it('profileImageUrl y profilePicturePath (basename evita traversal)', () => {
    assert.equal(PROFILE_IMAGE_SCHEME, 'mangacount');
    assert.equal(profileImageUrl('a.png'), 'mangacount://profiles/a.png');
    assert.equal(profilePicturePath('/data', 'a.png'), path.join('/data', 'profiles', 'a.png'));
    assert.equal(
      profilePicturePath('/data', '../evil.png'),
      path.join('/data', 'profiles', 'evil.png')
    );
  });
});
