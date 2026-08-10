const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());

const DADOS_PATH = path.join(__dirname, 'data', 'dados.json');

function lerDados() {
    if (!fs.existsSync(DADOS_PATH)) {
        return [];
    }

    return JSON.parse(fs.readFileSync(DADOS_PATH, 'utf-8'));
}

function salvarDados(dados) {
    fs.writeFileSync(
        DADOS_PATH,
        JSON.stringify(dados, null, 2)
    );
}

app.post('/leituras', (req, res) => {
    const leitura = req.body;

    const dados = lerDados();

    dados.push(leitura);

    salvarDados(dados);

    res.status(201).json(leitura);
});

app.get('/leituras', (req, res) => {
    const dados = lerDados();

    res.json(dados);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));