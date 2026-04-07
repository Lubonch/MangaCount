function findEntries(entries, query) {
    const q = query.toLowerCase();
    const exact = entries.filter(e => e.manga.title.toLowerCase().includes(q));
    return exact;
}

async function handleBuscar(msg, session, query) {
    if (!query) {
        await msg.reply('Usá: *buscar [título]*\nEjemplo: buscar berserk');
        return;
    }

    const results = findEntries(session.entries, query);

    if (results.length === 0) {
        // Sugerencias: títulos que comparten alguna palabra del query
        const words = query.split(' ').filter(w => w.length > 2);
        const suggestions = session.entries
            .filter(e => words.some(w => e.manga.title.toLowerCase().includes(w)))
            .slice(0, 4)
            .map(e => `   • ${e.manga.title}`)
            .join('\n');

        const sugg = suggestions ? `\n¿Quizás quisiste decir?\n${suggestions}` : '';
        await msg.reply(`❌ No encontré *${query}* en tu colección.${sugg}`);
        return;
    }

    const lines = results.map(e => {
        const { manga, quantity } = e;
        const total = manga.totalVolumes;
        const status = total > 0
            ? (quantity >= total ? '✅ Completo' : `📖 ${quantity}/${total} vol. (${total - quantity} pendientes)`)
            : `📖 ${quantity} vol. (en curso)`;
        const format = manga.format?.name || '';
        const publisher = manga.publisher?.name || '';
        const priority = e.isPriority ? '⭐ ' : '';

        return `${priority}*${manga.title}*\n  ${format} · ${publisher}\n  ${status}`;
    });

    await msg.reply(`🔍 Resultados para "*${query}*":\n\n${lines.join('\n\n')}`);
}

module.exports = { handleBuscar };
