const test = require('node:test');
const assert = require('node:assert/strict');

const { createMessageHandler } = require('./router');

function createMessage(body, from = '5491111111111@c.us') {
    const replies = [];

    return {
        from,
        body,
        replies,
        async reply(message) {
            replies.push(message);
        }
    };
}

test('createMessageHandler asks the user to choose a profile when no session exists', async () => {
    const sessions = [];
    const clears = [];
    const handleMessage = createMessageHandler({
        getSession: () => null,
        setSession: (from, session) => sessions.push({ from, session }),
        clearSession: (from) => clears.push(from),
        getProfiles: async () => [
            { id: 1, name: 'Lucas' },
            { id: 2, name: 'Vale' }
        ],
    });
    const message = createMessage('hola');

    await handleMessage({}, message);

    assert.equal(clears.length, 1);
    assert.equal(sessions.length, 1);
    assert.match(message.replies[0], /Lucas/);
    assert.match(message.replies[0], /Vale/);
});

test('createMessageHandler replies with command help for an unknown command', async () => {
    const handleMessage = createMessageHandler({
        getSession: () => ({
            profileId: 1,
            profileName: 'Lucas',
            entries: [],
            awaitingConfirm: null,
        }),
    });
    const message = createMessage('desconocido');

    await handleMessage({}, message);

    assert.equal(message.replies.length, 1);
    assert.match(message.replies[0], /buscar/);
    assert.match(message.replies[0], /pendientes/);
    assert.match(message.replies[0], /actualizar/);
});