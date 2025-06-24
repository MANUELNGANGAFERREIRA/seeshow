// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

// Config GitHub
const GITHUB_USERNAME = 'MANUELNGANGAFERREIRA';
const GITHUB_REPO = 'seeshow';
const GITHUB_TOKEN = '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';
const GITHUB_BRANCH = 'main';

const GITHUB_API = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents`;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let userPoints = {}; // Armazenamento temporário em memória

function generateId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000);
}

async function listFiles() {
    const res = await axios.get(GITHUB_API, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });
    return res.data.filter(file => file.name.endsWith('.json'));
}

async function getFile(file) {
    const res = await axios.get(file.download_url);
    return res.data;
}

async function deleteFile(file) {
    await axios.delete(`${GITHUB_API}/${file.name}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
        data: { message: 'Remover publicação vista', sha: file.sha },
    });
}

async function createFile(data, count) {
    const content = Buffer.from(JSON.stringify(data)).toString('base64');
    for (let i = 0; i < count; i++) {
        const id = generateId();
        await axios.put(`${GITHUB_API}/${id}.json`, {
            message: `Criar publicação ${id}`,
            content: content,
            branch: GITHUB_BRANCH
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
    }
}

app.get('/', async (req, res) => {
    const user = req.query.user || 'anon';
    const files = await listFiles();
    const points = userPoints[user] || 0;
    if (files.length === 0) return res.send('Sem publicações disponíveis.');

    const pub = await getFile(files[0]);
    res.render('index', { pub, filename: files[0].name, user, points });
});

app.post('/next', async (req, res) => {
    const { user, filename, redirectUrl } = req.body;
    if (!userPoints[user]) userPoints[user] = 0;
    userPoints[user]++;

    const files = await listFiles();
    const file = files.find(f => f.name === filename);
    if (file) await deleteFile(file);

    res.redirect(redirectUrl);
});

app.get('/publish', (req, res) => {
    const user = req.query.user || 'anon';
    const points = userPoints[user] || 0;
    res.render('publish', { user, points });
});

app.post('/publish', async (req, res) => {
    const { user, title, content, redirectUrl } = req.body;
    const points = userPoints[user] || 0;
    if (points === 0) return res.send('Você precisa ver publicações antes de publicar.');

    const pub = { title, content, redirectUrl };
    await createFile(pub, points);
    userPoints[user] = 0;
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
