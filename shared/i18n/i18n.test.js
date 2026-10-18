import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAppTranslator,
  createTranslator,
  interpolate,
  missingKeys,
  resolveLanguage,
  dictionaries,
} from './index.js';

describe('shared/i18n', () => {
  it('traduce y cae a la clave cuando no existe', () => {
    assert.equal(createAppTranslator('en')('language.label'), 'Language');
    assert.equal(createAppTranslator('es')('language.label'), 'Idioma');
    assert.equal(createAppTranslator('en')('no.existe'), 'no.existe');
  });

  it('cae al idioma por defecto si falta la clave en el locale', () => {
    const t = createTranslator('es', { en: { a: 'A' }, es: {} });
    assert.equal(t('a'), 'A');
  });

  it('interpola parámetros y deja el placeholder si faltan', () => {
    assert.equal(interpolate('hola {n}', { n: 3 }), 'hola 3');
    assert.equal(interpolate('hola {n}'), 'hola {n}');
  });

  it('resuelve el idioma por prioridad', () => {
    assert.equal(resolveLanguage({ env: '' }), 'en');
    assert.equal(resolveLanguage({ env: 'es' }), 'es');
    assert.equal(resolveLanguage({ env: '', prefs: { language: 'es' } }), 'es');
    assert.equal(resolveLanguage({ explicit: 'en', env: 'es' }), 'en');
    assert.equal(resolveLanguage({ env: 'fr' }), 'en');
  });

  it('mantiene paridad de claves entre ES y EN', () => {
    assert.deepEqual(missingKeys(dictionaries.en, dictionaries.es), []);
    assert.deepEqual(missingKeys(dictionaries.es, dictionaries.en), []);
  });
});
