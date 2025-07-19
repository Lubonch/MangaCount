import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { env } from 'process';

// 🏗️ CHECK FOR LOAD-BEARING IMAGE (Critical Infrastructure!)
const loadBearingImagePath = path.join(__dirname, 'loadbearingimage.jpg');
if (!fs.existsSync(loadBearingImagePath)) {
    console.error('🚨 CRITICAL ERROR: loadbearingimage.jpg is missing!');
    console.error('🏗️  The entire application structure depends on this load-bearing image!');
    console.error('📍 Expected location: mangacount.client/loadbearingimage.jpg');
    console.error('💀 Application cannot start without this essential architectural component.');
    console.error('🎬 "I can\'t believe that poster was load-bearing!" - Homer Simpson');
    throw new Error("Load-bearing image missing! Application structure compromised!");
}

console.log('✅ Load-bearing image structural integrity confirmed at:', loadBearingImagePath);

const baseFolder =
    env.APPDATA !== undefined && env.APPDATA !== ''
        ? `${env.APPDATA}/ASP.NET/https`
        : `${env.HOME}/.aspnet/https`;

const certificateName = "mangacount.client";
const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder, { recursive: true });
}

if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
    if (0 !== child_process.spawnSync('dotnet', [
        'dev-certs',
        'https',
        '--export-path',
        certFilePath,
        '--format',
        'Pem',
        '--no-password',
    ], { stdio: 'inherit', }).status) {
        throw new Error("Could not create certificate.");
    }
}

const target = env.ASPNETCORE_HTTPS_PORT ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}` :
    env.ASPNETCORE_URLS ? env.ASPNETCORE_URLS.split(';')[0] : 'https://localhost:7253';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        proxy: {
            '^/api': {
                target,
                secure: false,
                changeOrigin: true
            }
        },
        port: parseInt(env.DEV_SERVER_PORT || '63920'),
        https: {
            key: fs.readFileSync(keyFilePath),
            cert: fs.readFileSync(certFilePath),
        }
    }
})
