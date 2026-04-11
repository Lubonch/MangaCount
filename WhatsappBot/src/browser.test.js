const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveBrowserPath } = require('./browser');

test('resolveBrowserPath prefers CHROME_BIN when it is configured', () => {
    const browserPath = resolveBrowserPath({
        env: { CHROME_BIN: '/custom/chrome' },
        existsSync: () => false,
    });

    assert.equal(browserPath, '/custom/chrome');
});

test('resolveBrowserPath falls back to the first installed Chromium-compatible binary', () => {
    const browserPath = resolveBrowserPath({
        env: {},
        existsSync: (candidate) => candidate === '/usr/bin/chromium-browser',
    });

    assert.equal(browserPath, '/usr/bin/chromium-browser');
});

test('resolveBrowserPath returns undefined when no configured or known binary is available', () => {
    const browserPath = resolveBrowserPath({
        env: {},
        existsSync: () => false,
    });

    assert.equal(browserPath, undefined);
});