const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());

const DADOS_PATH = path.join(__dirname, 'data', 'dados.json');
const BARF_PATH = path.join(__dirname, 'braf', 'barf.json')

app.get('/leituras', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'public', 'leituras.html')
    );
});

app.get('/api/leituras', (req, res) => {
    if (!fs.existsSync(DADOS_PATH)) {
        return res.json([]);
    }

    const dados = JSON.parse(
        fs.readFileSync(DADOS_PATH, 'utf-8')
    );

    res.json(dados);
});

function lerDados() {
    if (!fs.existsSync(DADOS_PATH)) {
        return [];
    }

    return JSON.parse(fs.readFileSync(DADOS_PATH, 'utf-8'));
}

function lerBarf() {
    if (!fs.existsSync(BARF_PATH)) {
        return [];
    }

    return JSON.parse(fs.readFileSync(BARF_PATH, 'utf-8'));
}

function salvarBarf(barf) {
    fs.writeFileSync(
        BARF_PATH,
        JSON.stringify(barf, null, 2)
    );
}

async function enviarParaIA(valor) {
    const resposta = await fetch('http://localhost:5000/preview', {
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

    try {

        // Envia toda leitura para a IA
        const resultadoIA = await enviarParaIA(
            leitura.valor
        );

        const registro = {
            ia: {
                classe: resultadoIA.classe,
                resultado: resultadoIA.resultado
            }
        };

        const barf = lerBarf();

        barf.push(registro);

        salvarBarf(barf);


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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});