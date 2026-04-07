async function handlePendientes(msg, session) {
    const pending = session.entries.filter(e => {
        const total = e.manga.totalVolumes;
        return total > 0 && e.quantity < total;
    });

    if (pending.length === 0) {
        await msg.reply('🎉 ¡No tenés nada pendiente! Colección al día.');
        return;
    }

    // Primero ⭐ priority, luego por mayor pendiente
    pending.sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        const aPend = a.manga.totalVolumes - a.quantity;
        const bPend = b.manga.totalVolumes - b.quantity;
        return bPend - aPend;
    });

    const lines = pending.map(e => {
        const pend = e.manga.totalVolumes - e.quantity;
        const priority = e.isPriority ? '⭐ ' : '';
        return `${priority}*${e.manga.title}*: ${e.quantity}/${e.manga.totalVolumes} (faltan ${pend})`;
    });

    const total = pending.reduce((acc, e) => acc + (e.manga.totalVolumes - e.quantity), 0);
    await msg.reply(
        `📋 Pendientes (${pending.length} series, ${total} vols.):\n\n${lines.join('\n')}`
    );
}

module.exports = { handlePendientes };
