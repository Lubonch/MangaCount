const { getEntriesByProfile, updateEntry } = require('../api');
const { getSession, setSession } = require('../session');

async function handleActualizar(msg, session, from, input) {
    // Input esperado: "berserk 43" → último token es el número
    const parts = input.split(' ');
    if (parts.length < 2) {
        await msg.reply('Usá: *actualizar [título] [cantidad]*\nEjemplo: actualizar berserk 43');
        return;
    }

    const newQuantity = parseInt(parts[parts.length - 1]);
    if (isNaN(newQuantity) || newQuantity < 0) {
        await msg.reply('❌ La cantidad tiene que ser un número positivo.');
        return;
    }

    const titleQuery = parts.slice(0, -1).join(' ').toLowerCase();
    const matches = session.entries.filter(e =>
        e.manga.title.toLowerCase().includes(titleQuery)
    );

    if (matches.length === 0) {
        await msg.reply(`❌ No encontré *${titleQuery}* en tu colección.`);
        return;
    }

    if (matches.length > 1) {
        const list = matches.map(e => `   • ${e.manga.title}`).join('\n');
        await msg.reply(`Encontré varias series:\n${list}\n\nSé más específico con el título.`);
        return;
    }

    const entry = matches[0];
    const total = entry.manga.totalVolumes;
    const totalStr = total > 0 ? `/${total}` : '';

    setSession(from, { ...session, awaitingConfirm: { entry, newQuantity } });
    await msg.reply(
        `¿Confirmás la actualización?\n\n` +
        `*${entry.manga.title}*\n` +
        `  Cantidad actual: ${entry.quantity}${totalStr}\n` +
        `  Nueva cantidad:  ${newQuantity}${totalStr}\n\n` +
        `Respondé *si* para confirmar o *no* para cancelar.`
    );
}

async function handleConfirm(msg, session, from) {
    const body = msg.body.trim().toLowerCase();
    const { entry, newQuantity } = session.awaitingConfirm;

    if (body !== 'si' && body !== 'sí') {
        setSession(from, { ...session, awaitingConfirm: null });
        await msg.reply('❎ Actualización cancelada.');
        return;
    }

    try {
        const payload = {
            id: entry.id,
            manga: entry.manga,
            mangaId: entry.manga.id,
            profileId: session.profileId,
            quantity: newQuantity,
            pending: entry.pending,
            priority: entry.isPriority ?? entry.priority ?? false,
        };
        await updateEntry(payload);

        // Refrescar entries en sesión
        const freshEntries = await getEntriesByProfile(session.profileId);
        setSession(from, { ...session, entries: freshEntries, awaitingConfirm: null });

        const total = entry.manga.totalVolumes;
        const totalStr = total > 0 ? `/${total}` : '';
        const done = total > 0 && newQuantity >= total ? ' ✅ ¡Completo!' : '';
        await msg.reply(`✔️ *${entry.manga.title}* actualizado: ${newQuantity}${totalStr}${done}`);
    } catch (err) {
        setSession(from, { ...session, awaitingConfirm: null });
        await msg.reply('❌ Error al actualizar. Intenta de nuevo más tarde.');
    }
}

module.exports = { handleActualizar, handleConfirm };
