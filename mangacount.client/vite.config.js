import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import { env } from 'node:process';

// Local-first config: no certificates or /api proxy (the renderer talks over IPC
// in Electron or uses the adapter with fallback); standard port 5173.
// MANGACOUNT_DEV_URL must point to this port (see electron/main/index.js).
export default defineConfig({
    // Relative paths so the bundle works with Electron's `loadFile` (file://)
    // and over HTTP in dev.
    base: './',
    plugins: [plugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@shared': fileURLToPath(new URL('../shared', import.meta.url))
        }
    },
    server: {
        fs: {
            allow: [fileURLToPath(new URL('..', import.meta.url))]
        },
        port: parseInt(env.DEV_SERVER_PORT || '5173'),
    }
})
