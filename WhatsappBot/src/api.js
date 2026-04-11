const axios = require('axios');

const BASE_URL = process.env.MANGA_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 8000 });

async function getProfiles() {
    const res = await api.get('/profile');
    return res.data;
}

async function getEntriesByProfile(profileId) {
    const res = await api.get(`/entry?profileId=${profileId}`);
    return res.data;
}

async function getRecommendations(profileId, limit = 5) {
    const res = await api.get('/recommendation', {
        params: { profileId, limit },
    });
    return res.data;
}

async function updateEntry(entry) {
    const res = await api.post('/entry', entry);
    return res.data;
}

module.exports = { getProfiles, getEntriesByProfile, getRecommendations, updateEntry };
