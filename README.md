# Sistema de Monitoramento da Pureza do Ar

Projeto acadêmico de integração entre Sistemas Embarcados, Linguagens de Programação, Inteligência Artificial e Desenvolvimento de Aplicativos.

O projeto simula um sistema de monitoramento da qualidade do ar para uma sala limpa (*clean room*) utilizada na entrada de uma linha de produção de CPUs.

Em ambientes de fabricação de semicondutores, a presença de partículas e contaminantes no ar é um fator importante para a qualidade do processo. Neste projeto, um potenciômetro ou trimpot é utilizado como representação de um sensor de concentração de partículas. A posição do potenciômetro representa a concentração de partículas presente no ambiente.

O sistema realiza a aquisição da leitura através de um STM32, transmite os dados para um computador utilizando USB CDC, processa as informações em uma aplicação C#, envia os dados para uma API REST e utiliza um modelo de Machine Learning para classificar automaticamente a condição do ambiente.

A classificação final deverá indicar se a condição do ambiente é adequada, intermediária ou inadequada para a entrada na linha de produção.

## Arquitetura

O fluxo principal do sistema é:

```text
Potenciômetro / Trimpot
        ↓
      ADC
        ↓
      STM32
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
  Modelo de Machine Learning
        ↓
    Classificação
        ↓
  data/dados.json
        ↓
   Interface Web
```

## Conceito do projeto

O potenciômetro conectado ao STM32 simula um sensor de concentração de partículas no ar.

O valor produzido pelo ADC representa a quantidade de partículas detectada pelo sensor simulado. O STM32 converte a leitura do ADC para a escala de concentração utilizada pelo projeto.

A interpretação conceitual é:

```text
Menor concentração de partículas
            ↓
       Ar mais limpo
            ↓
      Melhor condição
```

e:

```text
Maior concentração de partículas
            ↓
       Ar mais contaminado
            ↓
      Pior condição
```

A classificação automática será realizada por um modelo de Machine Learning, utilizando os valores de concentração como entrada.

As categorias previstas inicialmente são:

```text
Bom
Médio
Ruim
```

Os intervalos definitivos utilizados no treinamento do modelo deverão ser definidos de acordo com a escala de concentração adotada pelo projeto.

## 1. Aquisição de dados — STM32

O STM32F103C8 realiza a leitura do potenciômetro conectado ao pino:

```text
PA1 → ADC1_IN1
```

O ADC do STM32F103C8 possui resolução de 12 bits, produzindo valores entre:

```text
0 → 4095
```

A leitura é convertida pelo firmware para uma escala de concentração utilizada pelo sistema.

Atualmente, a conversão é realizada pela função:

```c
uint16_t ConverterConcentracao(uint16_t adc)
{
    return ((uint32_t) adc * 1000) / 4095;
}
```

Dessa forma:

```text
ADC = 0       → concentração = 0
ADC = 4095    → concentração = 1000
```

A escala de `0` a `1000` representa a concentração utilizada pelo modelo do projeto. Ela não representa diretamente uma medição física real de PM2.5 em µg/m³; o potenciômetro é uma simulação do sensor.

### Filtragem

O STM32 possui um GPIO responsável por ativar ou desativar o pré-processamento da leitura.

Quando o filtro está desativado, a concentração convertida é enviada diretamente.

Quando o filtro está ativado, é aplicada uma média móvel.

A implementação atual utiliza uma janela de 8 amostras:

```text
FILTER_SIZE = 8
```

A média móvel reduz oscilações instantâneas na leitura e produz uma representação mais estável da concentração.

A primeira leitura utilizada pelo filtro inicializa todas as posições da janela, evitando que as primeiras médias sejam artificialmente reduzidas por valores inicialmente indefinidos.

### Protocolo de transmissão

O STM32 transmite os dados pela USB CDC utilizando o formato:

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

O segundo campo pode assumir:

```text
0 → filtro desativado
1 → filtro ativado
```

Cada transmissão termina com `\r\n`, permitindo que a aplicação C# realize a leitura utilizando `ReadLine()`.

### Estado atual

A aquisição já possui:

* leitura do ADC1;
* utilização do PA1 como ADC1_IN1;
* conversão do ADC para a escala de concentração;
* filtro de média móvel;
* ativação/desativação do filtro através de GPIO;
* transmissão através de USB CDC;
* protocolo serial definido.

## 2. Comunicação — C#

A aplicação em C# funciona como intermediária entre o STM32 e o servidor.

Suas responsabilidades são:

1. Abrir a Porta COM.
2. Receber continuamente as medições.
3. Interpretar os dados recebidos.
4. Validar as informações.
5. Organizar cada leitura em um objeto.
6. Adicionar um timestamp.
7. Converter a leitura para JSON.
8. Enviar o JSON para a API através de HTTP.
9. Receber e apresentar a resposta da API.

### Estrutura da leitura

Cada leitura é representada pela classe:

```csharp
class Leitura
{
    public int Valor { get; set; }
    public bool Filtro { get; set; }
    public DateTime Timestamp { get; set; }
}
```

Uma mensagem recebida do STM32:

```text
512;1
```

é interpretada como:

```text
Valor     = 512
Filtro    = true
Timestamp = horário atual
```

A aplicação então converte os dados para JSON utilizando camelCase:

```json
{
  "valor": 512,
  "filtro": true,
  "timestamp": "2026-08-10T08:00:00"
}
```

### Organização do código

A aplicação foi dividida em funções para separar responsabilidades:

* `ConfigurarPorta()` configura e abre a Porta COM.
* `ProcessarLinha()` interpreta e valida os dados recebidos.
* `ConverterParaJson()` realiza a serialização.
* `EnviarParaApi()` realiza a requisição HTTP.
* `Main()` coordena o fluxo principal da aplicação.

### Estado atual

A comunicação já possui:

* leitura contínua da Porta COM;
* validação das informações recebidas;
* conversão para objeto C#;
* geração de timestamp;
* serialização em JSON;
* envio através de HTTP;
* tratamento básico de erros HTTP.

## 3. Inteligência Artificial

O sistema deverá utilizar um modelo de Machine Learning para classificar automaticamente cada leitura de concentração de partículas.

A entrada principal do modelo será a concentração de partículas simulada pelo potenciômetro.

A classificação inicial será dividida em três categorias:

```text
Bom
Médio
Ruim
```

A interpretação conceitual será:

```text
Baixa concentração
       ↓
      Bom
```

```text
Concentração intermediária
       ↓
      Médio
```

```text
Alta concentração
       ↓
      Ruim
```

Os limites exatos entre as categorias serão definidos durante a preparação dos dados utilizados para treinamento e validação do modelo.

O modelo deverá receber uma nova leitura e retornar automaticamente sua classificação.

### Requisitos

* Utilização de um modelo de classificação.
* Classificação automática de cada nova leitura.
* Pelo menos três categorias.
* Integração do modelo com a API REST.

## 4. Servidor Web — API REST

O servidor será responsável por receber as medições enviadas pela aplicação C#, armazenar os dados e posteriormente integrar o processamento de Inteligência Artificial.

O servidor utiliza Node.js e Express.

Fluxo esperado:

```text
Aplicação C#
      ↓
POST /leituras
      ↓
Servidor
      ↓
Armazenamento
      ↓
Modelo de IA
      ↓
Classificação
      ↓
Resposta JSON
```

### Armazenamento

As leituras recebidas serão armazenadas em:

```text
data/dados.json
```

A API realiza a leitura do arquivo, adiciona a nova medição à coleção existente e grava novamente o arquivo em formato JSON.

Estrutura prevista:

```text
servidor/
├── server.js
├── package.json
└── data/
    └── dados.json
```

O arquivo `dados.json` funciona como armazenamento persistente simples para o projeto.

Exemplo:

```json
[
  {
    "valor": 512,
    "filtro": true,
    "timestamp": "2026-08-10T08:00:00"
  }
]
```

### Endpoint de recebimento

```text
POST /leituras
```

Exemplo de requisição:

```json
{
  "valor": 512,
  "filtro": true,
  "timestamp": "2026-08-10T08:00:00"
}
```

A API adiciona essa leitura ao conjunto armazenado em:

```text
data/dados.json
```

### Endpoint de consulta

```text
GET /leituras
```

Retorna as leituras armazenadas no arquivo JSON.

### Integração futura com IA

Após a implementação do modelo de Machine Learning, o fluxo do endpoint deverá ser ampliado para:

```text
POST /leituras
      ↓
Receber leitura
      ↓
Validar dados
      ↓
Enviar valor para o modelo
      ↓
Receber classificação
      ↓
Adicionar classificação à leitura
      ↓
Salvar em dados.json
      ↓
Retornar JSON ao C#
```

Uma leitura armazenada poderá então possuir uma estrutura semelhante a:

```json
{
  "valor": 512,
  "filtro": true,
  "timestamp": "2026-08-10T08:00:00",
  "classificacao": "Bom"
}
```

### Requisitos

* Endpoint para recebimento das medições.
* Comunicação HTTP.
* Utilização de JSON.
* Armazenamento das medições.
* Chamada do modelo de IA.
* Retorno da classificação ao cliente.
* Disponibilização dos dados para o frontend.

## 5. Interface Web

A interface Web deverá apresentar o estado atual do ambiente monitorado e o histórico das medições.

A página deverá apresentar:

* concentração atual de partículas;
* classificação produzida pelo modelo de IA;
* estado do filtro;
* histórico das últimas leituras;
* horário da última atualização;
* indicação visual do estado atual do ambiente.

A interface deverá consultar os dados disponibilizados pela API e ser atualizada conforme novas medições forem recebidas.

### Exemplo de estrutura

```text
┌─────────────────────────────────────┐
│       MONITORAMENTO DA CLEAN ROOM   │
├─────────────────────────────────────┤
│                                     │
│  Concentração atual:     512        │
│  Classificação:          Bom        │
│  Filtro:                 Ativo      │
│  Última atualização:     08:00:00   │
│                                     │
├─────────────────────────────────────┤
│              Histórico              │
│                                     │
│  07:59:50   508   Bom               │
│  07:59:40   512   Bom               │
│  07:59:30   545   Médio             │
│  07:59:20   530   Médio             │
│                                     │
└─────────────────────────────────────┘
```

A indicação visual deverá permitir identificar rapidamente a condição atual do ambiente.

### Requisitos

* Exibição da leitura atual.
* Exibição da classificação.
* Histórico das últimas medições.
* Horário da última atualização.
* Indicação visual do estado atual.
* Atualização conforme novas medições são recebidas.

## Protocolo de Comunicação

Atualmente, o STM32 transmite cada leitura no formato:

```text
valor;filtro\r\n
```

Exemplo:

```text
512;1\r\n
```

A aplicação C# separa os campos utilizando `;`.

O primeiro campo representa a concentração:

```text
512
```

O segundo representa o estado do filtro:

```text
1
```

A aplicação converte o segundo campo para booleano:

```text
1 → true
0 → false
```

Em seguida, adiciona o timestamp e serializa os dados para JSON.

O JSON é enviado através de uma requisição HTTP para:

```text
POST /leituras
```

A API recebe o objeto e o armazena em:

```text
data/dados.json
```

## Escala da concentração

O ADC do STM32 possui resolução de 12 bits:

```text
0 → 4095
```

O projeto converte essa faixa para uma escala de concentração simulada:

```text
0 → 1000
```

A relação utilizada atualmente é:

```text
concentração = ADC × 1000 / 4095
```

Portanto:

|                  ADC | Concentração |
| -------------------: | -----------: |
|                    0 |            0 |
| aproximadamente 1024 |          250 |
| aproximadamente 2048 |          500 |
| aproximadamente 3072 |          750 |
|                 4095 |         1000 |

Essa escala é uma representação utilizada para a simulação. Ela não deve ser interpretada como uma medição física real de partículas.

Os intervalos utilizados pela Inteligência Artificial deverão ser definidos sobre essa escala.

## Tecnologias

### Sistemas Embarcados

* STM32F103C8
* C
* STM32 HAL
* USB CDC
* ADC
* GPIO
* Potenciômetro / Trimpot
* Média móvel

### Comunicação

* C#
* .NET
* `System.IO.Ports`
* `HttpClient`
* JSON
* HTTP

### Inteligência Artificial

* Machine Learning
* Modelo de classificação
* Classificação em pelo menos três categorias

### Servidor

* Node.js
* Express
* API REST
* HTTP
* JSON
* Sistema de arquivos

### Interface

* HTML
* CSS
* JavaScript
* API REST

## Estrutura do projeto

A organização prevista atualmente é:

```text
projeto/
├── firmware/
│   └── stm32/
│       └── leitorPurezaAr/
│
├── comunicacao/
│   └── comms/
│
├── ia/
│   └── modelo/
│
├── servidor/
│   ├── server.js
│   ├── package.json
│   └── data/
│       └── dados.json
│
└── frontend/
```

## Estado do desenvolvimento

### Concluído

* [x] Configuração do STM32.
* [x] Leitura do potenciômetro através do ADC1.
* [x] Utilização do PA1 como ADC1_IN1.
* [x] Conversão do ADC para a escala de concentração.
* [x] Média móvel com janela de 8 amostras.
* [x] Ativação/desativação do filtro através de GPIO.
* [x] Comunicação USB CDC.
* [x] Definição do protocolo serial.
* [x] Leitura da Porta COM pela aplicação C#.
* [x] Validação dos dados recebidos.
* [x] Conversão para objeto `Leitura`.
* [x] Geração de timestamp.
* [x] Serialização para JSON.
* [x] Envio HTTP para a API.
* [x] API REST básica.
* [x] Recebimento das leituras pela API.
* [x] Persistência das leituras em `data/dados.json`.

### Em desenvolvimento

* [ ] Definição final dos intervalos de classificação.
* [ ] Criação do dataset.
* [ ] Treinamento do modelo de Machine Learning.
* [ ] Integração do modelo com a API.
* [ ] Retorno da classificação para o cliente.
* [ ] Desenvolvimento da interface Web.
* [ ] Atualização automática da interface.
* [ ] Exibição do histórico das medições.
* [ ] Indicação visual da condição do ambiente.

## Objetivo final

Ao final do projeto, o sistema deverá permitir o seguinte fluxo:

```text
        AMBIENTE SIMULADO
               │
               ▼
     Potenciômetro / Trimpot
               │
               ▼
          STM32 + ADC
               │
               ▼
    Concentração de partículas
               │
          USB CDC / COM
               │
               ▼
         Aplicação C#
               │
             JSON
               │
               ▼
          API REST
               │
               ▼
       Modelo de Machine
          Learning
               │
               ▼
       ┌───────┴───────┐
       │               │
      Bom            Médio/Ruim
       │               │
       └───────┬───────┘
               ▼
          dados.json
               │
               ▼
         Interface Web
               │
               ▼
      Estado da Clean Room
```

O resultado final será uma simulação integrada de monitoramento de partículas em uma sala limpa, demonstrando a comunicação entre hardware, software, API, armazenamento, Inteligência Artificial e interface Web.
