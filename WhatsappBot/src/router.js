const { getSession, setSession, clearSession } = require('./session');
const { getProfiles, getEntriesByProfile } = require('./api');
const { handleBuscar } = require('./commands/buscar');
const { handlePendientes } = require('./commands/pendientes');
const { handleActualizar, handleConfirm } = require('./commands/actualizar');

async function handleMessage(client, msg) {
    const from = msg.from;
    const body = msg.body.trim().toLowerCase();
    const session = getSession(from);

    // Ping de prueba
    if (body === 'ping') {
        await msg.reply('pong 🏓');
        return;
    }

    // Sin sesión → mostrar lista de perfiles
    if (!session || body === 'perfil') {
        if (body !== 'perfil') clearSession(from);
        const profiles = await getProfiles();
        const list = profiles.map((p, i) => `${i + 1}️⃣  ${p.name}`).join('\n');
        await msg.reply(`📚 *MangaCount*\nHola! ¿Qué perfil querés usar?\n\n${list}\n\nRespondé con el número del perfil.`);
        setSession(from, { choosingProfile: true, profiles });
        return;
    }

    // Eligiendo perfil
    if (session.choosingProfile) {
        const idx = parseInt(body) - 1;
        if (isNaN(idx) || idx < 0 || idx >= session.profiles.length) {
            await msg.reply('❌ Número inválido. Respondé con el número del perfil.');
            return;
        }
        const profile = session.profiles[idx];
        await msg.reply(`⏳ Cargando colección de *${profile.name}*...`);
        const entries = await getEntriesByProfile(profile.id);
        setSession(from, { profileId: profile.id, profileName: profile.name, entries, awaitingConfirm: null });
        await msg.reply(
            `✅ Perfil *${profile.name}* seleccionado. (${entries.length} series)\n\n` +
            `¿Qué querés hacer?\n` +
            `• *buscar [título]* — ver si tenés un manga\n` +
            `• *pendientes* — tus series incompletas\n` +
            `• *actualizar [título] [cantidad]* — marcar volúmenes comprados\n` +
            `• *perfil* — cambiar de perfil`
        );
        return;
    }

    // Confirmación pendiente
    if (session.awaitingConfirm) {
        await handleConfirm(msg, session, from);
        return;
    }

    // Comandos principales
    if (body.startsWith('buscar ')) {
        await handleBuscar(msg, session, body.slice(7).trim());
    } else if (body === 'pendientes') {
        await handlePendientes(msg, session);
    } else if (body.startsWith('actualizar ')) {
        await handleActualizar(msg, session, from, body.slice(11).trim());
    } else {
        await msg.reply(
            `No entendí ese comando. Opciones:\n` +
            `• *buscar [título]*\n` +
            `• *pendientes*\n` +
            `• *actualizar [título] [cantidad]*\n` +
            `• *perfil*`
        );
    }
}

module.exports = { handleMessage };
