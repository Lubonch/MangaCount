function getDefaultGetRecommendations() {
    const { getRecommendations } = require('../api');
    return getRecommendations;
}

function clampLimit(limit) {
    const parsed = Number.parseInt(limit, 10);

    if (Number.isNaN(parsed)) {
        return 5;
    }

    return Math.min(Math.max(parsed, 1), 10);
}

function formatRecommendationLine(item, index) {
    const metadata = [item.publisher, item.publisherCountry].filter(Boolean).join(' · ');
    const reason = item.reason ? `\n   ${item.reason}` : '';

    return `${index + 1}. *${item.title}*\n   ${metadata}${reason}`;
}

async function handleRecomendar(msg, session, options = {}) {
    const getRecommendations = options.getRecommendations || getDefaultGetRecommendations();
    const limit = clampLimit(options.limit ?? 5);

    try {
        const response = await getRecommendations(session.profileId, limit);

        if (!response?.isConfident || !response?.inferredCountry) {
            await msg.reply('No pude inferir tu mercado local con suficiente confianza. Sumá más series con editoriales no ambiguas y volvé a intentar.');
            return;
        }

        const items = Array.isArray(response.items) ? response.items : [];

        if (items.length === 0) {
            await msg.reply(`No encontré recomendaciones elegibles para ${response.inferredCountry}.`);
            return;
        }

        const importNote = response.blockedByImportCount > 0
            ? `\nSe excluyeron ${response.blockedByImportCount} opciones de importación.`
            : '';

        const lines = items.map(formatRecommendationLine).join('\n\n');
        await msg.reply(
            `Recomendaciones para *${session.profileName}*\n` +
            `País: ${response.inferredCountry}\n` +
            `Proveedor: ${response.provider || 'local'}${importNote}\n\n` +
            `${lines}`
        );
    } catch (error) {
        await msg.reply('No pude obtener recomendaciones en este momento. Intenta de nuevo más tarde.');
    }
}

module.exports = { handleRecomendar, clampLimit };