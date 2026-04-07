// Estado por número de teléfono
// { profileId, profileName, entries, awaitingConfirm: { entry, newQuantity } | null }
const sessions = new Map();

function getSession(from) {
    return sessions.get(from) || null;
}

function setSession(from, data) {
    sessions.set(from, data);
}

function clearSession(from) {
    sessions.delete(from);
}

module.exports = { getSession, setSession, clearSession };
