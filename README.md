# CRMS — Clean Room Monitoring System
**Vídeo:** [INSERIR LINK]

Sistema integrado de monitoramento e classificação da condição do ambiente de uma *clean room*, desenvolvido para o Projeto Integrado SÉRIE: 34 DS.

O CRMS simula um sistema utilizado para acompanhar a concentração de partículas em uma sala limpa localizada na entrada de uma linha de produção de CPUs. A solução integra um sistema embarcado, comunicação serial, aplicação intermediária, API REST, Machine Learning e interface Web.

> Projeto acadêmico de integração entre Sistemas Embarcados, Linguagens de Programação, Inteligência Artificial e Desenvolvimento de Aplicativos.

---

## Projeto Integrado

**SÉRIE:** 34 DS

**Período:** 04 a 21/08

### Disciplinas

- Sistemas Embarcados (SEB)
- Desenvolvimento de Aplicativos (DAPL)
- Inteligência Artificial (IA)
- Linguagens de Programação (LPR)

### Professores

- Ana Leticia G. Gonçalves
- Daniel Albino Mosca
- José Andery Carneiro

### Integrantes

- Frederico Teodoro Arantes
- Livia Maria dos Reis Chagas

### Avaliação

| Disciplina | Valor |
|---|---:|
| SEB | 50 pts |
| LPR | 50 pts |
| DAPL | 50 pts |
| IA | 50 pts |

---

# Sobre o CRMS

O **Clean Room Monitoring System (CRMS)** é uma simulação de um sistema de monitoramento de partículas destinado a acompanhar a condição de uma sala limpa.

Em ambientes de fabricação de semicondutores, partículas e outros contaminantes presentes no ar podem comprometer processos de fabricação. O projeto utiliza um potenciômetro ou trimpot como representação de um sensor de concentração de partículas.

A posição do potenciômetro representa a concentração de partículas detectada pelo sensor simulado.

O sistema realiza o seguinte processo:

```text
Sensor simulado
      ↓
    STM32
      ↓
    ADC
      ↓
   USB CDC
      ↓
   Porta COM
      ↓
 Aplicação C#
      ↓
     JSON
      ↓
   API REST
      ↓
 Machine Learning
      ↓
 Classificação
      ↓
 Armazenamento
      ↓
 Interface Web
````

A classificação final do ambiente é dividida em três estados:

```text
Aprovado
Atenção
Reprovado
```

Esses estados representam, respectivamente, uma condição adequada, intermediária ou inadequada para a entrada na linha de produção.

---

# Objetivo

O objetivo do projeto é desenvolver uma solução distribuída capaz de realizar aquisição, processamento, comunicação, classificação e visualização de dados.

A arquitetura foi construída de forma semelhante a uma aplicação de Internet das Coisas (IoT), envolvendo:

* aquisição de dados;
* processamento no dispositivo;
* comunicação entre sistemas;
* conversão e transmissão de dados;
* processamento em servidor;
* classificação automática;
* armazenamento;
* visualização em uma interface Web.

O projeto também busca integrar os conceitos das quatro disciplinas envolvidas na atividade.

---

# Arquitetura do sistema

O CRMS é dividido em cinco módulos principais:

```text
┌──────────────────────┐
│  STM32F103C8         │
│                      │
│  Trimpot → ADC       │
│  Filtragem           │
│  USB CDC             │
└──────────┬───────────┘
           │
           │ USB
           ▼
┌──────────────────────┐
│  Aplicação C#        │
│                      │
│  Porta COM           │
│  Validação           │
│  JSON                │
│  HTTP                │
└──────────┬───────────┘
           │
           │ HTTP / JSON
           ▼
┌──────────────────────┐
│  API Node.js         │
│                      │
│  Express             │
│  Armazenamento       │
│  Integração com IA   │
└───────┬────────┬─────┘
        │        │
        │        │ HTTP
        │        ▼
        │  ┌──────────────────┐
        │  │  Modelo de IA    │
        │  │                  │
        │  │  Classificação   │
        │  └──────────────────┘
        │
        ▼
┌──────────────────────┐
│  Interface Web       │
│                      │
│  Leitura atual       │
│  Classificação       │
│  Histórico           │
│  Estado do sistema   │
└──────────────────────┘
```

---

# 1. Aquisição de dados — STM32

O módulo embarcado utiliza um **STM32F103C8** para realizar a aquisição da variável física simulada.

O potenciômetro ou trimpot representa o sensor de concentração de partículas.

A leitura é realizada pelo ADC do microcontrolador e posteriormente convertida para a escala utilizada pelo sistema.

## ADC

O ADC utilizado possui resolução de 12 bits:

```text
0 → 4095
```

A leitura é convertida para uma escala simulada de:

```text
0 → 1000
```

A conversão utilizada atualmente é:

```text
concentração = ADC × 1000 / 4095
```

Assim:

|                  ADC | Concentração |
| -------------------: | -----------: |
|                    0 |            0 |
| aproximadamente 1024 |          250 |
| aproximadamente 2048 |          500 |
| aproximadamente 3072 |          750 |
|                 4095 |         1000 |

Essa escala é utilizada exclusivamente para a simulação.

Ela não representa diretamente uma medição física de PM2.5, PM10 ou qualquer outra unidade real de concentração. O potenciômetro funciona como um sensor analógico simulado.

## Filtragem

O firmware possui uma opção de pré-processamento da leitura através de GPIO.

O filtro utilizado é uma **média móvel**.

Atualmente, a janela possui quatro posições:

```text
FILTER_SIZE = 4
```

Quando o filtro está ativado, cada nova leitura é adicionada à janela e a média das quatro posições é utilizada como valor final.

A primeira leitura recebida inicializa todas as posições da janela, evitando que os valores iniciais interfiram artificialmente no resultado.

A filtragem tem como objetivo reduzir pequenas oscilações causadas pelo ruído do potenciômetro.

## Controle do filtro

O estado do filtro é determinado pelo pino:

```text
PA10
```

O pino utiliza `GPIO_PULLUP`.

A lógica utilizada é:

```text
PA10 = LOW
    ↓
Filtro ativado

PA10 = HIGH
    ↓
Filtro desativado
```

Dessa forma, o hardware permite alternar entre o valor diretamente convertido e o valor processado pela média móvel.

## Transmissão USB CDC

O STM32 utiliza **USB CDC (Communications Device Class)** para apresentar a comunicação ao computador como uma Porta COM.

Cada leitura é transmitida no formato:

```text
valor;filtro\r\n
```

Exemplo:

```text
512;1\r\n
```

Onde:

```text
512 → concentração simulada
1   → filtro ativado
```

O campo do filtro pode assumir:

```text
0 → desativado
1 → ativado
```

O intervalo entre transmissões é de cinco segundos.

```text
Leitura
   ↓
Processamento
   ↓
Transmissão USB CDC
   ↓
Aguarda 5 segundos
   ↓
Nova leitura
```

---

# 2. Comunicação — C#

A aplicação intermediária foi desenvolvida em **C#** e atua como ponte entre o STM32 e o servidor.

Suas principais responsabilidades são:

1. Abrir a Porta COM.
2. Receber continuamente as leituras do STM32.
3. Validar os dados recebidos.
4. Converter os dados para um objeto C#.
5. Adicionar o timestamp da leitura.
6. Serializar os dados para JSON.
7. Enviar os dados para a API REST.
8. Receber e apresentar a resposta do servidor.

## Porta serial

A aplicação utiliza:

```text
Porta: COM5
BaudRate: 115200
NewLine: \r\n
```

O protocolo utilizado pelo STM32 permite que a aplicação utilize `ReadLine()` para obter cada transmissão completa.

## Processamento da leitura

Uma mensagem recebida:

```text
512;1
```

é convertida para:

```text
Valor     = 512
Filtro    = true
Timestamp = horário atual
```

A estrutura utilizada é:

```csharp
class Leitura
{
    public int Valor { get; set; }
    public bool Filtro { get; set; }
    public DateTime Timestamp { get; set; }
}
```

A aplicação também valida:

* quantidade de campos;
* valor numérico;
* estado do filtro.

Leituras inválidas são descartadas antes de serem enviadas ao servidor.

## JSON

Depois do processamento, a leitura é serializada utilizando `camelCase`.

Exemplo:

```json
{
  "valor": 512,
  "filtro": true,
  "timestamp": "2026-08-18T08:00:00"
}
```

Esse objeto é enviado através de HTTP para:

```text
POST http://localhost:3001/leituras
```

## Organização

As principais responsabilidades estão separadas nas seguintes funções:

```text
ConfigurarPorta()
        ↓
Configuração da comunicação serial

ProcessarLinha()
        ↓
Validação e interpretação

ConverterParaJson()
        ↓
Serialização

EnviarParaApi()
        ↓
Requisição HTTP

Main()
        ↓
Coordenação do fluxo
```

---

# 3. Servidor Web — Node.js

O servidor foi desenvolvido utilizando **Node.js** e **Express**.

Ele funciona como o núcleo de integração entre a aplicação C#, o armazenamento, o modelo de Machine Learning e a interface Web.

O fluxo principal é:

```text
C#
 ↓
POST /leituras
 ↓
Node.js
 ↓
Armazena leitura
 ↓
Envia valor para IA
 ↓
Recebe classificação
 ↓
Armazena resultado
 ↓
Retorna resposta
```

## Endpoint de recebimento

```text
POST /leituras
```

Recebe uma leitura no formato:

```json
{
  "valor": 512,
  "filtro": true,
  "timestamp": "2026-08-18T08:00:00"
}
```

A leitura é adicionada ao arquivo:

```text
data/dados.json
```

Depois disso, somente o valor da concentração é enviado para o módulo de IA.

## Endpoint de visualização

```text
GET /leituras
```

Esse endpoint disponibiliza a interface Web principal do sistema.

A página é carregada a partir de:

```text
public/index.html
```

## Endpoint de dados

```text
GET /api/leituras
```

Retorna as leituras armazenadas em formato JSON.

Esse endpoint é utilizado pela interface Web para obter os dados necessários à visualização.

## Endpoint de resultados da IA

```text
GET /api/barf
```

Retorna os resultados de classificação armazenados pelo servidor.

Os resultados são armazenados em:

```text
data/barf.json
```

O arquivo mantém os resultados produzidos pelo modelo para cada leitura processada.

---

# 4. Inteligência Artificial

O CRMS utiliza um modelo de **Machine Learning previamente treinado** para classificar automaticamente cada leitura.

O modelo é carregado através da biblioteca `joblib`:

```text
modelo.pkl
```

O servidor de IA foi desenvolvido utilizando **Python** e **Flask**.

## Fluxo da classificação

```text
Leitura
   ↓
API Node.js
   ↓
valor
   ↓
API Flask
   ↓
modelo.pkl
   ↓
Predição
   ↓
Classe
   ↓
Resultado textual
```

A API recebe uma requisição:

```text
POST /preview
```

Com:

```json
{
  "valor": 512
}
```

O modelo realiza a previsão utilizando o valor recebido.

## Classes

O sistema utiliza três classes:

```text
0 → Aprovado
1 → Atenção
2 → Reprovado
```

A interpretação conceitual é:

```text
Baixa concentração
        ↓
    Aprovado
```

```text
Concentração intermediária
        ↓
     Atenção
```

```text
Alta concentração
        ↓
    Reprovado
```

A definição dos limites e do comportamento do modelo depende do dataset utilizado durante seu treinamento.

## Resposta da IA

Uma resposta bem-sucedida possui a estrutura:

```json
{
  "valor": 512,
  "classe": 0,
  "resultado": "Aprovado"
}
```

O Node.js utiliza o resultado retornado pela IA para montar a resposta final da API.

---

# 5. Interface Web

A interface Web funciona como o painel de acompanhamento do CRMS.

Ela apresenta as informações relevantes sobre o estado atual da sala limpa e o histórico das medições recebidas.

Entre as informações apresentadas estão:

* leitura atual;
* classificação atual;
* estado do filtro;
* horário da última atualização;
* histórico das leituras;
* estado visual do ambiente.

A interface consulta os dados através da API REST e atualiza as informações conforme novas medições são processadas.

A classificação também possui representação visual de acordo com o estado retornado pelo modelo:

```text
APROVADO
    ↓
Condição adequada

ATENÇÃO
    ↓
Condição intermediária

REPROVADO
    ↓
Condição inadequada
```

---

# 6. Armazenamento

O projeto utiliza arquivos JSON como armazenamento persistente simples.

As leituras são armazenadas em:

```text
data/dados.json
```

Os resultados da classificação são armazenados em:

```text
data/barf.json
```

Uma leitura armazenada possui uma estrutura semelhante a:

```json
{
  "valor": 512,
  "filtro": true,
  "timestamp": "2026-08-18T08:00:00"
}
```

Enquanto o resultado da IA é armazenado separadamente:

```json
{
  "ia": {
    "classe": 0,
    "resultado": "Aprovado"
  }
}
```

Essa separação permite que as medições e as classificações sejam consultadas independentemente.

---

# Protocolo de comunicação

O protocolo utilizado entre o STM32 e a aplicação C# é deliberadamente simples:

```text
valor;filtro\r\n
```

Exemplo:

```text
483;0\r\n
```

Interpretação:

```text
Valor = 483
Filtro = desativado
```

Outro exemplo:

```text
512;1\r\n
```

Interpretação:

```text
Valor = 512
Filtro = ativado
```

Depois de recebida, a aplicação C# transforma a informação em JSON:

```json
{
  "valor": 512,
  "filtro": true,
  "timestamp": "2026-08-18T08:00:00"
}
```

Esse JSON é transmitido para a API através de HTTP.

---

# Escala de concentração

O valor original produzido pelo ADC varia entre:

```text
0 → 4095
```

O firmware converte esse valor para:

```text
0 → 1000
```

A relação é:

```text
concentração = ADC × 1000 / 4095
```

Exemplo:

|  ADC |        Concentração |
| ---: | ------------------: |
|    0 |                   0 |
| 1024 | aproximadamente 250 |
| 2048 | aproximadamente 500 |
| 3072 | aproximadamente 750 |
| 4095 |                1000 |

A escala representa uma variável física simulada e não uma unidade de concentração real.

---

# Tecnologias utilizadas

## Sistemas Embarcados

* STM32F103C8
* C
* STM32 HAL
* ADC
* GPIO
* USB CDC
* Potenciômetro / Trimpot
* Média móvel

## Linguagens de Programação

* C#
* .NET
* `System.IO.Ports`
* `HttpClient`
* JSON
* HTTP

## Inteligência Artificial

* Python
* Flask
* Machine Learning
* `joblib`
* Modelo de classificação

## Desenvolvimento de Aplicativos

* Node.js
* Express
* API REST
* HTML
* CSS
* JavaScript
* JSON

---

# Estrutura do projeto

A organização geral do projeto é:

```text
CRMS/
├── firmware/
│   └── stm32/
│       └── leitorPurezaAr/
│
├── comunicacao/
│   └── comms/
│
├── ia/
│   └── modelo/
│       ├── modelo.pkl
│       └── ...
│
├── servidor/
│   ├── server.js
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── data/
│       ├── dados.json
│       └── barf.json
│
└── README.md
```

---

# Fluxo completo

O funcionamento completo do CRMS ocorre da seguinte maneira:

```text
┌───────────────────────────────┐
│       SENSOR SIMULADO         │
│       Potenciômetro           │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          STM32F103C8          │
│                               │
│ ADC → Conversão → Filtro      │
└───────────────┬───────────────┘
                │
                │ USB CDC
                ▼
┌───────────────────────────────┐
│          APLICAÇÃO C#         │
│                               │
│ COM → Validação → JSON        │
└───────────────┬───────────────┘
                │
                │ HTTP
                ▼
┌───────────────────────────────┐
│          API NODE.JS          │
│                               │
│ Recepção → Armazenamento      │
└───────────────┬───────────────┘
                │
                │ HTTP
                ▼
┌───────────────────────────────┐
│          MODELO DE IA         │
│                               │
│ Predição → Classificação      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       RESULTADO FINAL         │
│                               │
│ Aprovado / Atenção /          │
│ Reprovado                     │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          INTERFACE WEB        │
│                               │
│ Leitura + Estado + Histórico  │
└───────────────────────────────┘
```

---

# Requisitos obrigatórios

O projeto atende ao escopo definido para a atividade integrada.

## Aquisição

* [x] Leitura de sensor analógico simulado.
* [x] Envio periódico das medições via USB CDC.
* [x] Protocolo de comunicação definido.
* [x] Pré-processamento opcional através de GPIO.
* [x] Filtragem através de média móvel.

## Comunicação

* [x] Comunicação com a Porta COM.
* [x] Leitura contínua das medições.
* [x] Validação dos dados recebidos.
* [x] Conversão para JSON.
* [x] Envio das medições para a API.

## API

* [x] Endpoint para recebimento das medições.
* [x] Armazenamento das leituras.
* [x] Comunicação com o módulo de IA.
* [x] Retorno da classificação ao cliente.
* [x] Endpoint para disponibilização dos dados.

## Inteligência Artificial

* [x] Modelo de classificação treinado.
* [x] Classificação automática de novas leituras.
* [x] Três categorias de classificação.
* [x] Integração com a API REST.

## Interface Web

* [x] Exibição da leitura atual.
* [x] Exibição da classificação.
* [x] Histórico das medições.
* [x] Horário da última atualização.
* [x] Indicação visual do estado do sistema.

---

# Desafios extras

Além das funcionalidades obrigatórias, o projeto pode contemplar funcionalidades adicionais previstas na atividade:

* [ ] Gráficos da evolução das medições.
* [ ] Estatísticas de média, máximo e mínimo.
* [ ] Detecção de tendência de crescimento ou diminuição.
* [ ] Alertas visuais para estados críticos.

---

# Como executar

O sistema é composto por três aplicações que precisam estar disponíveis durante a execução:

```text
STM32
  ↓
Aplicação C#
  ↓
Servidor Node.js
  ↓
Servidor Flask / IA
```

## 1. STM32

Grave o firmware no STM32F103C8 e conecte o dispositivo ao computador através de USB.

O dispositivo deverá disponibilizar uma Porta COM.

O firmware realiza automaticamente a aquisição e transmissão das leituras.

## 2. Aplicação C#

Configure no código a Porta COM utilizada pelo STM32:

```csharp
porta.PortName = "COM5";
```

Execute a aplicação.

Ao estabelecer a comunicação, será exibida uma mensagem semelhante a:

```text
Conectado em COM5
```

A aplicação permanecerá aguardando novas leituras.

## 3. Servidor Node.js

Instale as dependências do servidor:

```bash
npm install
```

Execute:

```bash
node server.js
```

O servidor será disponibilizado por padrão em:

```text
http://localhost:3001
```

## 4. Servidor de IA

Instale as dependências Python necessárias e certifique-se de que o arquivo:

```text
modelo.pkl
```

esteja presente no diretório do modelo.

Execute o servidor Flask.

A API de IA será disponibilizada em:

```text
http://127.0.0.1:5000
```

## 5. Interface Web

Com o servidor Node.js em execução, acesse:

```text
http://localhost:3001/leituras
```

A interface deverá apresentar as medições recebidas e os resultados produzidos pelo modelo.

---

# Tratamento de erros

O sistema possui mecanismos básicos de validação e tratamento de erros em diferentes camadas.

Na aplicação C#, são verificadas:

* quantidade de campos recebidos;
* validade do valor numérico;
* validade do estado do filtro;
* erros de comunicação HTTP.

Na API Node.js, são tratados:

* ausência de arquivos de dados;
* erros de comunicação com a IA;
* respostas inválidas do módulo de Machine Learning.

Na API Flask, são verificadas:

* ausência de JSON;
* ausência do campo `valor`;
* erros durante a execução do modelo.

Quando a IA não está disponível, a API informa que não foi possível realizar a classificação, sem impedir que a leitura recebida seja identificada no retorno.

---

# Decisões de implementação

## Potenciômetro como sensor

Um potenciômetro foi utilizado como representação de um sensor analógico de concentração de partículas.

Isso permite controlar manualmente a variável monitorada e reproduzir diferentes condições de ambiente durante os testes.

## Média móvel

A média móvel foi escolhida como técnica de filtragem por ser simples, adequada para reduzir pequenas oscilações e compatível com o processamento realizado em um microcontrolador.

## USB CDC

A USB CDC permite que o STM32 seja reconhecido pelo computador como uma interface serial, simplificando a comunicação com a aplicação C#.

## JSON

JSON foi utilizado na comunicação entre a aplicação C# e o servidor por ser um formato estruturado e amplamente utilizado em APIs Web.

## Arquitetura distribuída

A separação entre firmware, aplicação C#, servidor e IA permite que cada parte tenha uma responsabilidade específica:

```text
STM32
Aquisição

C#
Comunicação

Node.js
Integração e API

Python
Classificação

Web
Visualização
```

Essa divisão também representa a integração entre as disciplinas do projeto.

---

# Relação com as disciplinas

O CRMS integra diretamente os conteúdos das quatro disciplinas:

```text
┌─────────────────────────────┐
│ Sistemas Embarcados         │
│                             │
│ ADC + GPIO + USB CDC        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Linguagens de Programação   │
│                             │
│ C# + Serial + HTTP + JSON   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Desenvolvimento de         │
│ Aplicativos                 │
│                             │
│ Node.js + API + Web         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Inteligência Artificial     │
│                             │
│ Dataset + ML + Classificação│
└─────────────────────────────┘
```

O resultado é um único sistema no qual os conhecimentos das quatro áreas são utilizados em conjunto.

---

# Estado do desenvolvimento

### Concluído

* [x] Configuração do STM32.
* [x] Leitura do potenciômetro através do ADC.
* [x] Conversão do ADC para a escala de concentração.
* [x] Média móvel.
* [x] Ativação/desativação do filtro através de GPIO.
* [x] Comunicação USB CDC.
* [x] Protocolo serial.
* [x] Comunicação com a Porta COM.
* [x] Validação dos dados recebidos.
* [x] Conversão para objeto C#.
* [x] Geração de timestamp.
* [x] Serialização para JSON.
* [x] Envio HTTP para a API.
* [x] API REST.
* [x] Persistência das leituras.
* [x] Modelo de Machine Learning.
* [x] Integração entre Node.js e Python.
* [x] Classificação automática.
* [x] Interface Web.
* [x] Exibição do histórico.
* [x] Indicação visual da condição do ambiente.

### Extras

* [X] Gráficos de evolução.
* [X] Estatísticas de média, máximo e mínimo.
* [X] Detecção de tendência.
* [X] Alertas para estados críticos.

---

# Resultado esperado

O CRMS transforma uma leitura analógica simulada em uma decisão apresentada ao usuário:

```text
Trimpot
   ↓
Leitura analógica
   ↓
ADC
   ↓
Concentração simulada
   ↓
Filtragem opcional
   ↓
USB CDC
   ↓
Aplicação C#
   ↓
JSON
   ↓
API REST
   ↓
Machine Learning
   ↓
┌──────────────────────────┐
│ Aprovado                 │
│ Atenção                  │
│ Reprovado                │
└────────────┬─────────────┘
             ↓
       Interface Web
             ↓
     Estado da Clean Room
```

O resultado final é uma simulação integrada de um sistema de monitoramento de uma *clean room*, demonstrando a integração entre hardware, comunicação, processamento, Inteligência Artificial, armazenamento e interface Web.

---

# CRMS

**Clean Room Monitoring System**

Sistema acadêmico integrado para aquisição, classificação e acompanhamento de uma variável ambiental simulada em uma sala limpa.

```
