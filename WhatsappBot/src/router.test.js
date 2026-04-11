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
        isNumberAllowed: () => true,
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
        isNumberAllowed: () => true,
    });
    const message = createMessage('desconocido');

    await handleMessage({}, message);

    assert.equal(message.replies.length, 1);
    assert.match(message.replies[0], /buscar/);
    assert.match(message.replies[0], /pendientes/);
    assert.match(message.replies[0], /actualizar/);
});

test('createMessageHandler routes the recommendation command to the recommendation handler', async () => {
    const calls = [];
    const handleMessage = createMessageHandler({
        getSession: () => ({
            profileId: 1,
            profileName: 'Lucas',
            entries: [],
            awaitingConfirm: null,
        }),
        handleRecomendar: async (msg, session) => {
            calls.push({ msg, session });
            await msg.reply('recommendations');
        },
        isNumberAllowed: () => true,
    });
    const message = createMessage('recomendar');

    await handleMessage({}, message);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].session.profileId, 1);
    assert.equal(message.replies[0], 'recommendations');
});

test('createMessageHandler ignores messages from numbers outside the whitelist', async () => {
    const sessions = [];
    const clears = [];
    const handleMessage = createMessageHandler({
        getSession: () => null,
        setSession: (from, session) => sessions.push({ from, session }),
        clearSession: (from) => clears.push(from),
        isNumberAllowed: () => false,
    });
    const message = createMessage('perfil', '5492223334444@c.us');

    await handleMessage({}, message);

    assert.equal(message.replies.length, 0);
    assert.equal(sessions.length, 0);
    assert.equal(clears.length, 1);
    assert.equal(clears[0], '5492223334444@c.us');
});