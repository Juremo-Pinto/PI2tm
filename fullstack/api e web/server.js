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

async function enviarParaIA(valor) {
    const resposta = await fetch('http://localhost:5000/prever', {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            valor: valor
        })
    });

    if (!resposta.ok) {
        throw new Error(
            `IA respondeu com status ${resposta.status}`
        );
    }

    return await resposta.json();
}

app.post('/leituras', async (req, res) => {

    const leitura = req.body;

    const dados = lerDados();

    dados.push(leitura);

    salvarDados(dados);

    try {

        // Envia toda leitura para a IA
        const resultadoIA = await enviarParaIA(
            leitura.valor
        );

        return res.status(201).json({
            leitura: leitura,
            ia: resultadoIA
        });

    } catch (erro) {

        console.error(
            'Erro ao comunicar com a IA:',
            erro.message
        );

        return res.status(201).json({
            leitura: leitura,
            ia: null,
            erro: 'Não foi possível consultar a IA'
        });
    }
});

app.get('/leituras', (req, res) => {
    const dados = lerDados();

    res.json(dados);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});