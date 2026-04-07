require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./src/router');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n📱 Escaneá este QR con WhatsApp:\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado y listo');
});

client.on('auth_failure', () => {
    console.error('❌ Falló la autenticación. Borrá la carpeta .wwebjs_auth/ y volvé a escanear el QR.');
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.warn('⚠️  Bot desconectado:', reason);
});

client.on('message', async (msg) => {
    // Ignorar mensajes de grupos y estados
    if (msg.from.endsWith('@g.us') || msg.from === 'status@broadcast') return;

    try {
        await handleMessage(client, msg);
    } catch (err) {
        console.error('Error al procesar mensaje de', msg.from, ':', err.message);
    }
});

client.initialize();
