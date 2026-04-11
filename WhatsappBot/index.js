require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { resolveBrowserPath } = require('./src/browser');
const { handleMessage } = require('./src/router');
const { getAllowedNumberCount } = require('./src/authorization');
const { createLogger } = require('./src/logger');

const logger = createLogger({ fileName: 'bot.txt' });
const browserPath = resolveBrowserPath();

if (browserPath) {
    logger.info(`Usando navegador compatible en ${browserPath}.`);
} else {
    logger.warn('No se detecto CHROME_BIN ni una ruta conocida de Chrome/Chromium. Puppeteer intentara resolver el navegador por defecto.');
}

const puppeteerOptions = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
    ]
};

if (browserPath) {
    puppeteerOptions.executablePath = browserPath;
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerOptions,
});

client.on('qr', (qr) => {
    logger.info('QR generado para autenticar el bot de WhatsApp.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    const allowedNumberCount = getAllowedNumberCount();
    if (allowedNumberCount === 0) {
        logger.warn('No hay numeros autorizados configurados en WHATSAPP_ALLOWED_NUMBERS. El bot ignorara todos los mensajes.');
    } else {
        logger.info(`Numeros autorizados configurados: ${allowedNumberCount}`);
    }

    logger.info('Bot conectado y listo.');
});

client.on('auth_failure', () => {
    logger.error('Fallo la autenticacion. Borra la carpeta .wwebjs_auth y vuelve a escanear el QR.');
    process.exit(1);
});

client.on('disconnected', (reason) => {
    logger.warn('Bot desconectado:', reason);
});

client.on('message', async (msg) => {
    // Ignorar mensajes de grupos y estados
    if (msg.from.endsWith('@g.us') || msg.from === 'status@broadcast') return;

    try {
        await handleMessage(client, msg);
    } catch (err) {
        logger.error('Error al procesar mensaje de', msg.from, ':', err);
    }
});

client.initialize();
