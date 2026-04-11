const fs = require('node:fs');

const BROWSER_CANDIDATES = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
];

function resolveBrowserPath(options = {}) {
    const env = options.env || process.env;
    const existsSync = options.existsSync || fs.existsSync;

    if (env.CHROME_BIN) {
        return env.CHROME_BIN;
    }

    return BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
}

module.exports = { resolveBrowserPath };