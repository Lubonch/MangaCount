const test = require('node:test');
const assert = require('node:assert/strict');

const { handleRecomendar } = require('./recomendar');

function createMessage() {
    const replies = [];

    return {
        replies,
        async reply(message) {
            replies.push(message);
        }
    };
}

test('handleRecomendar formats successful recommendation results for chat', async () => {
    const message = createMessage();
    const session = { profileId: 7, profileName: 'Lucas' };

    await handleRecomendar(message, session, {
        getRecommendations: async (profileId, limit) => {
            assert.equal(profileId, 7);
            assert.equal(limit, 5);

            return {
                provider: 'local',
                inferredCountry: 'Argentina',
                isConfident: true,
                blockedByImportCount: 2,
                items: [
                    {
                        id: 'monster',
                        title: 'Monster',
                        publisher: 'Ovni Press',
                        publisherCountry: 'Argentina',
                        reason: 'Coincide con tus series de misterio y suspenso.'
                    }
                ]
            };
        },
    });

    assert.equal(message.replies.length, 1);
    assert.match(message.replies[0], /Lucas/);
    assert.match(message.replies[0], /Argentina/);
    assert.match(message.replies[0], /Monster/);
    assert.match(message.replies[0], /Ovni Press/);
    assert.match(message.replies[0], /local/);
    assert.match(message.replies[0], /importaci/i);
});

test('handleRecomendar reports when the country cannot be inferred confidently', async () => {
    const message = createMessage();
    const session = { profileId: 7, profileName: 'Lucas' };

    await handleRecomendar(message, session, {
        getRecommendations: async () => ({
            provider: 'local',
            inferredCountry: null,
            isConfident: false,
            blockedByImportCount: 0,
            items: [],
        }),
    });

    assert.equal(message.replies.length, 1);
    assert.match(message.replies[0], /no pude inferir/i);
});

test('handleRecomendar reports when there are no eligible recommendations', async () => {
    const message = createMessage();
    const session = { profileId: 7, profileName: 'Lucas' };

    await handleRecomendar(message, session, {
        getRecommendations: async () => ({
            provider: 'local',
            inferredCountry: 'Argentina',
            isConfident: true,
            blockedByImportCount: 0,
            items: [],
        }),
    });

    assert.equal(message.replies.length, 1);
    assert.match(message.replies[0], /no encontr/i);
    assert.match(message.replies[0], /Argentina/);
});