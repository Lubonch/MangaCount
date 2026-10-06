import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import { env } from 'node:process';

// Configuración local-first: sin certificados ni proxy /api (el renderer
// habla por IPC en Electron o usa el adaptador con fallback), puerto 5173 estándar.
// MANGACOUNT_DEV_URL debe apuntar a este puerto (ver electron/main/index.js).
export default defineConfig({
    // Rutas relativas para que el bundle funcione con `loadFile` de Electron
    // (file://) y en dev por HTTP.
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
