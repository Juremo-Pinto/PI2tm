# CRMS — Clean Room Monitoring System

Sistema de monitoramento e classificação da qualidade do ar desenvolvido como projeto acadêmico de integração entre Sistemas Embarcados, Linguagens de Programação, Inteligência Artificial e Desenvolvimento de Aplicativos.

O **CRMS (Clean Room Monitoring System)** simula um sistema utilizado para acompanhar a concentração de partículas em uma *clean room* localizada na entrada de uma linha de produção de CPUs.

O projeto utiliza um potenciômetro/trimpot como representação de um sensor de concentração de partículas. A posição do componente representa a concentração de partículas presente no ambiente.

A leitura é realizada por um microcontrolador STM32, transmitida ao computador através de USB CDC, processada por uma aplicação em C#, enviada para uma API REST em Node.js e posteriormente classificada por um modelo de Machine Learning executado através de uma API em Python.

A aplicação web apresenta as leituras, estatísticas, evolução das medições e classificação atual do ambiente.

**Video de Funcionamento:** [LINK]

---

## Objetivo

O objetivo do CRMS é demonstrar, de forma integrada, o fluxo de aquisição, processamento, transmissão, armazenamento e classificação de dados provenientes de um sistema embarcado.

O fluxo principal do projeto é:

```text
Trimpot
   │
   ▼
STM32
   │
   │ USB CDC
   ▼
Aplicação C#
   │
   │ HTTP / JSON
   ▼
API Node.js
   │
   ├──────────────► Armazenamento das leituras
   │
   ▼
API de Machine Learning
   │
   ▼
Classificação do ambiente
   │
   ▼
Interface Web
````

A classificação do ambiente é dividida em três condições:

| Classe | Resultado | Significado                                         |
| ------ | --------- | --------------------------------------------------- |
| 0      | Aprovado  | Condição adequada para entrada na linha de produção |
| 1      | Atenção   | Condição intermediária                              |
| 2      | Reprovado | Condição inadequada                                 |

---

## Arquitetura

O sistema é dividido em quatro componentes principais.

### 1. Firmware — STM32

Responsável pela aquisição do sinal analógico proveniente do potenciômetro/trimpot.

O firmware utiliza o ADC1 do STM32 para realizar a leitura do sinal analógico.

A leitura do ADC possui resolução de 12 bits, produzindo valores entre:

```text
0 — 4095
```

Esse valor é convertido para uma escala de concentração simulada entre:

```text
0 — 1000
```

A conversão utilizada é:

```text
concentração = ADC × 1000 / 4095
```

O firmware também possui um sistema de filtragem através de média móvel.

Quando o filtro está ativo, são armazenadas quatro leituras e calculada a média entre elas:

```text
FILTER_SIZE = 4
```

O estado do filtro é determinado através do pino `PA10`.

A leitura é enviada através da interface USB CDC no seguinte formato:

```text
valor;filtro
```

Exemplo:

```text
483;0
```

ou:

```text
512;1
```

Onde:

```text
0 = filtro inativo
1 = filtro ativo
```

As leituras são transmitidas a cada 5 segundos.

---

### 2. Aplicação de comunicação — C#

A aplicação em C# funciona como intermediária entre o STM32 e o servidor.

Ela estabelece comunicação com a porta serial:

```text
COM5
```

utilizando:

```text
BaudRate: 115200
```

Cada linha recebida do STM32 é interpretada e validada.

O formato recebido:

```text
483;0
```

é convertido para um objeto:

```json
{
    "valor": 483,
    "filtro": false,
    "timestamp": "2026-08-18T08:29:47.6075761-03:00"
}
```

O objeto é então enviado para a API REST através de uma requisição HTTP `POST`.

Endpoint utilizado:

```text
POST http://localhost:3001/leituras
```

---

### 3. Servidor — Node.js

O servidor foi desenvolvido utilizando Node.js e Express.

Sua função é receber as leituras provenientes da aplicação C#, armazená-las e encaminhá-las para o serviço de Machine Learning.

O servidor disponibiliza os seguintes endpoints:

```text
GET  /leituras
GET  /api/leituras
GET  /api/barf
POST /leituras
```

#### `GET /leituras`

Exibe a interface web do CRMS.

#### `GET /api/leituras`

Retorna as leituras armazenadas no sistema.

#### `GET /api/barf`

Retorna os resultados das classificações realizadas pela IA.

O nome `barf` é utilizado internamente pelo projeto para armazenar os registros das classificações.

#### `POST /leituras`

Recebe uma nova leitura da aplicação C#.

O servidor:

1. Recebe o JSON.
2. Armazena a leitura.
3. Envia o valor para a API de Machine Learning.
4. Recebe a classificação.
5. Armazena o resultado da classificação.
6. Retorna a leitura e o resultado da IA.

As leituras são armazenadas em:

```text
data/dados.json
```

Enquanto os resultados das classificações são armazenados em:

```text
data/barf.json
```

---

### 4. Classificação — Python / Flask

O componente de Inteligência Artificial utiliza Python, Flask e um modelo de Machine Learning previamente treinado.

O modelo é carregado a partir do arquivo:

```text
modelo.pkl
```

A API disponibiliza o endpoint:

```text
POST http://127.0.0.1:5000/preview
```

Recebendo:

```json
{
    "valor": 483
}
```

O valor é enviado ao modelo:

```text
modelo.predict([[valor]])
```

A previsão numérica é convertida para uma classificação:

```text
0 → Aprovado
1 → Atenção
2 → Reprovado
```

A API retorna, por exemplo:

```json
{
    "valor": 483,
    "classe": 0,
    "resultado": "Aprovado"
}
```

---

## Interface Web

A interface do CRMS foi desenvolvida em HTML, CSS e JavaScript.

O objetivo visual é representar um sistema administrativo/técnico utilizado em ambientes industriais, evitando uma estética excessivamente moderna ou baseada em dashboards comerciais.

A página apresenta:

* última leitura;
* média geral;
* maior valor registrado;
* menor valor registrado;
* classificação atual da IA;
* classe numérica;
* estado do filtro;
* evolução das medidas;
* variação entre leituras;
* histórico completo das medições;
* data e hora das leituras;
* classificação associada a cada leitura;
* indicação da última atualização;
* alerta visual para condições reprovadas.

O gráfico é desenhado diretamente utilizando `Canvas`, sem dependência de bibliotecas externas.

Quando a última classificação recebida é `Reprovado`, a interface entra em estado crítico e apresenta um alerta visual.

---

## Fluxo de uma leitura

Uma leitura completa percorre o seguinte caminho:

```text
1. O trimpot altera sua tensão de saída.

2. O ADC do STM32 realiza a leitura.

3. O valor de 0–4095 é convertido para 0–1000.

4. O estado do filtro é verificado.

5. Caso esteja ativo, é aplicada uma média móvel de 4 leituras.

6. O STM32 envia os dados através de USB CDC.

7. A aplicação C# recebe a linha pela porta serial.

8. A aplicação valida os dados recebidos.

9. A leitura é convertida para JSON.

10. O JSON é enviado para o servidor Node.js.

11. O servidor armazena a leitura.

12. O servidor envia o valor para a API de Machine Learning.

13. O modelo classifica a condição do ambiente.

14. O resultado é armazenado pelo servidor.

15. A interface web consulta os dados.

16. A leitura e sua classificação são exibidas no CRMS.
```

---

## Tecnologias utilizadas

### Firmware

* C
* STM32 HAL
* STM32CubeMX
* ADC
* GPIO
* USB CDC

### Comunicação

* C#
* .NET
* `System.IO.Ports`
* HTTP
* JSON
* REST

### Backend

* Node.js
* Express
* JavaScript
* JSON para armazenamento local

### Inteligência Artificial

* Python
* Flask
* Joblib
* Scikit-learn
* Machine Learning

### Interface

* HTML
* CSS
* JavaScript
* Canvas API

---

## Hardware

O projeto utiliza um microcontrolador STM32 com ADC de 12 bits.

O potenciômetro/trimpot é utilizado como representação do sensor de concentração de partículas.

Também é utilizado um controle conectado ao `PA10` para determinar o estado do filtro.

A comunicação entre o microcontrolador e o computador ocorre através de USB utilizando o protocolo USB CDC.

---

## Estrutura do projeto

Uma possível organização dos componentes é:

```text
CRMS/
│
├── firmware/
│   └── STM32/
│       ├── Core/
│       ├── Drivers/
│       └── ...
│
├── comunicacao/
│   └── Program.cs
│
├── server/
│   ├── public/
│   │   └── index.html
│   │
│   ├── data/
│   │   ├── dados.json
│   │   └── barf.json
│   │
│   └── server.js
│
├── ia/
│   ├── modelo.pkl
│   └── app.py
│
└── README.md
```

A estrutura pode variar de acordo com a organização final dos arquivos.

---

## Execução

Para executar o sistema completo, os componentes devem estar disponíveis simultaneamente.

### 1. STM32

Grave o firmware no microcontrolador e conecte-o ao computador através de USB.

Verifique se o dispositivo está associado à porta serial esperada pela aplicação C#.

No código atual:

```text
COM5
```

O firmware começa a realizar as transmissões após uma espera inicial de 10 segundos.

Depois disso, uma leitura é enviada a cada 5 segundos.

---

### 2. Serviço de Machine Learning

Instale as dependências Python necessárias e execute:

```text
python app.py
```

A API ficará disponível em:

```text
http://127.0.0.1:5000
```

O arquivo `modelo.pkl` deve estar disponível no mesmo diretório utilizado pelo serviço.

---

### 3. Servidor Node.js

Instale as dependências:

```text
npm install
```

Execute o servidor:

```text
node server.js
```

O servidor será iniciado na porta:

```text
3001
```

A interface poderá ser acessada em:

```text
http://localhost:3001/leituras
```

---

### 4. Aplicação C#

Com o STM32 conectado e o servidor Node.js em execução, execute a aplicação de comunicação.

Ela deverá estabelecer conexão com:

```text
COM5
```

e encaminhar continuamente as leituras para:

```text
http://localhost:3001/leituras
```

---

## Formato dos dados

### STM32 → C#

O firmware transmite:

```text
483;0
```

O primeiro campo representa o valor da leitura.

O segundo representa o estado do filtro.

```text
valor;filtro
```

---

### C# → Node.js

A aplicação converte os dados para JSON:

```json
{
    "valor": 483,
    "filtro": false,
    "timestamp": "2026-08-18T08:29:47.6075761-03:00"
}
```

---

### Node.js → Machine Learning

O servidor envia somente o valor utilizado para classificação:

```json
{
    "valor": 483
}
```

---

### Machine Learning → Node.js

A API retorna:

```json
{
    "valor": 483,
    "classe": 0,
    "resultado": "Aprovado"
}
```

---

## Filtragem

O firmware possui dois modos de leitura.

Com o filtro desativado, o valor convertido do ADC é enviado diretamente.

Com o filtro ativado, é utilizada uma média móvel de quatro valores:

```text
Média = (L1 + L2 + L3 + L4) / 4
```

O objetivo é reduzir oscilações provenientes do sinal analógico do potenciômetro/trimpot.

O estado do filtro também é enviado junto com cada leitura, permitindo que a interface identifique quando a filtragem estava ativa.

---

## Modelo de Machine Learning

O modelo recebe como entrada o valor numérico da concentração simulada.

A partir desse valor, realiza a classificação da condição do ambiente.

A saída é convertida para três categorias:

```text
Aprovado
Atenção
Reprovado
```

O modelo é carregado através do arquivo:

```text
modelo.pkl
```

O treinamento do modelo não faz parte do processo de execução do sistema. Durante a operação, o modelo já treinado é utilizado para realizar as previsões.

---

## Persistência

O projeto utiliza arquivos JSON para manter os dados durante a execução.

As leituras ficam em:

```text
data/dados.json
```

As classificações ficam em:

```text
data/barf.json
```

Essa abordagem foi utilizada para manter a implementação simples e adequada ao escopo do projeto acadêmico, sem a necessidade de um banco de dados externo.

---

## Contexto acadêmico

O CRMS foi desenvolvido com o objetivo de integrar diferentes áreas de desenvolvimento em um único sistema.

O projeto envolve:

```text
Sistemas Embarcados
        +
Comunicação Serial
        +
Programação em C#
        +
APIs REST
        +
Node.js
        +
Machine Learning
        +
Python
        +
Desenvolvimento Web
```

Apesar de utilizar um potenciômetro/trimpot como representação do sensor, a arquitetura foi projetada para representar o funcionamento de um sistema de monitoramento de partículas em uma *clean room*.

Em um cenário real, o componente poderia ser substituído por um sensor apropriado para medição de partículas ou contaminantes, mantendo a ideia geral de aquisição, transmissão, processamento e classificação dos dados.

---

## Limitações

Este projeto é uma simulação acadêmica e não representa um sistema de controle ambiental certificado.

O potenciômetro/trimpot não realiza uma medição real de partículas.

Os valores utilizados representam uma concentração simulada.

Da mesma forma, o modelo de Machine Learning possui finalidade acadêmica e não deve ser utilizado para determinar a segurança ou conformidade de uma instalação industrial real.

---

## Projeto

**CRMS — Clean Room Monitoring System**

Sistema acadêmico de monitoramento e classificação de condições ambientais para simulação de uma *clean room* aplicada à entrada de uma linha de produção de CPUs.

```text
STM32 → C# → Node.js → Machine Learning → Interface Web
```

Desenvolvido para integração prática entre hardware, software, comunicação, inteligência artificial e desenvolvimento web.
