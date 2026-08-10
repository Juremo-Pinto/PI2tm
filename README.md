# Sistema de Monitoramento e Classificação de Leituras

Projeto acadêmico de integração entre Sistemas Embarcados, Linguagens de Programação, Inteligência Artificial e Desenvolvimento de Aplicativos.

O sistema realiza a aquisição de uma grandeza física por meio de um sensor analógico conectado a um STM32, transmite as medições para um computador utilizando USB CDC, processa os dados em uma aplicação C#, envia as informações para uma API REST e utiliza um modelo de Machine Learning para classificar automaticamente cada leitura.

## Arquitetura

O fluxo principal do sistema é:

```text
Sensor analógico
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
Modelo de IA
      ↓
 Classificação
      ↓
 Interface Web
```

## Componentes

### 1. Aquisição de dados — STM32

O STM32 realiza a leitura de um sensor analógico, atualmente representado por um potenciômetro ou trimpot.

As leituras são transmitidas periodicamente para o computador através da interface USB CDC, que é reconhecida pelo sistema operacional como uma porta COM.

O sistema também possui um GPIO responsável por ativar ou desativar o pré-processamento da leitura.

Quando o filtro está ativo, é aplicada uma média móvel sobre as leituras. Quando está desativado, o valor original é transmitido diretamente.

O filtro utilizado é uma média móvel com janela de 8 amostras.

Formato atual da transmissão:

```text
valor;filtro
```

Exemplo:

```text
1024;0
```

Onde:

* `1024` é o valor da leitura;
* `0` indica que o filtro está desativado;
* `1` indica que o filtro está ativado.

Cada transmissão termina com `\r\n`, permitindo que a aplicação C# utilize a leitura por linha.

### Requisitos

* Leitura de um sensor analógico.
* Envio periódico das medições via USB CDC.
* Comunicação através de Porta COM.
* Protocolo de serialização compatível com os demais componentes.
* Ativação ou desativação do pré-processamento através de GPIO.
* Utilização de um filtro compatível com a variável física.
* Filtro implementado: média móvel.

### Estado atual

A aquisição de dados e a transmissão USB CDC estão implementadas.

O STM32 atualmente utiliza uma variável de teste para representar a leitura do sensor:

```c
short adc = 1024;
```

A substituição dessa variável pela leitura real do ADC ainda faz parte da implementação da aquisição.

---

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

A aplicação recebe uma mensagem como:

```text
1024;1
```

E transforma os dados em uma estrutura equivalente a:

```json
{
  "Valor": 1024,
  "Filtro": true,
  "Timestamp": "2026-08-10T08:00:00"
}
```

### Organização do código

A aplicação foi dividida em funções para separar as responsabilidades:

* `ConfigurarPorta()` configura e abre a Porta COM.
* `ProcessarLinha()` interpreta e valida os dados recebidos.
* `ConverterParaJson()` realiza a serialização.
* `EnviarParaApi()` realiza a requisição HTTP.
* `Main()` coordena o fluxo principal da aplicação.

### Estado atual

A comunicação entre STM32 e aplicação C# está implementada.

A aplicação atualmente:

* estabelece comunicação com a Porta COM;
* realiza leitura contínua;
* interpreta o protocolo `valor;filtro`;
* valida o valor recebido;
* cria objetos `Leitura`;
* adiciona timestamp;
* converte os dados para JSON;
* realiza requisições HTTP para a API.

A URL da API utilizada atualmente é:

```text
http://localhost:3001/leituras
```

Essa URL deverá ser ajustada conforme a implementação definitiva do servidor.

---

## 3. Inteligência Artificial

O sistema deverá utilizar um modelo de Machine Learning previamente treinado para classificar cada leitura recebida.

A classificação deverá possuir pelo menos três categorias.

Exemplo:

```text
Ruim
Médio
Bom
```

As categorias definitivas deverão ser determinadas de acordo com a grandeza física monitorada e os dados utilizados no treinamento.

### Requisitos

* Utilização de um modelo de classificação.
* Classificação automática de cada nova leitura.
* Integração do modelo com a API REST.

### Estado atual

Ainda não implementado.

---

## 4. Servidor Web — API REST

O servidor será responsável por receber as medições enviadas pela aplicação C# e coordenar a comunicação com o modelo de Inteligência Artificial.

Fluxo esperado:

```text
Aplicação C#
      ↓
POST /leituras
      ↓
Servidor
      ↓
Modelo de IA
      ↓
Classificação
      ↓
Resposta JSON
```

A API deverá:

1. Receber as medições.
2. Validar os dados.
3. Encaminhar a leitura para o modelo de IA.
4. Obter a classificação.
5. Retornar a classificação para o cliente.
6. Armazenar ou disponibilizar os dados necessários para o frontend.

### Endpoint principal

```text
POST /leituras
```

Exemplo de dados enviados:

```json
{
  "Valor": 1024,
  "Filtro": true,
  "Timestamp": "2026-08-10T08:00:00"
}
```

Exemplo de resposta esperada:

```json
{
  "Valor": 1024,
  "Filtro": true,
  "Timestamp": "2026-08-10T08:00:00",
  "Classificacao": "Bom"
}
```

### Requisitos

* Endpoint para recebimento das medições.
* Comunicação HTTP.
* Utilização de JSON.
* Chamada do modelo de IA.
* Retorno da classificação ao cliente.
* Disponibilização dos dados para o frontend.

### Estado atual

Ainda não implementado.

---

## 5. Interface Web

A interface Web deverá apresentar o estado atual do sistema e o histórico das medições recebidas.

A página deverá apresentar, no mínimo:

* valor atual da leitura;
* classificação produzida pelo modelo de IA;
* histórico das últimas leituras;
* horário da última atualização;
* indicação visual do estado atual do sistema.

A interface deverá ser atualizada conforme novas medições forem processadas.

### Exemplo de estrutura

```text
┌─────────────────────────────────────┐
│        MONITORAMENTO DO SISTEMA     │
├─────────────────────────────────────┤
│                                     │
│  Leitura atual:       1024          │
│  Classificação:       Bom           │
│  Filtro:              Ativo         │
│  Última atualização:  08:00:00      │
│                                     │
├─────────────────────────────────────┤
│          Histórico                  │
│                                     │
│  07:59:50   1018   Bom              │
│  07:59:40   1021   Bom              │
│  07:59:30   1005   Médio            │
│  07:59:20    980   Médio            │
│                                     │
└─────────────────────────────────────┘
```

### Requisitos

* Exibição da leitura atual.
* Exibição da classificação.
* Histórico das últimas medições.
* Horário da última atualização.
* Indicação visual do estado atual.
* Atualização conforme novas medições são recebidas.

### Estado atual

Ainda não implementado.

---

## Protocolo de Comunicação

Atualmente, o STM32 transmite cada leitura no seguinte formato:

```text
valor;filtro\r\n
```

Exemplo:

```text
1024;1\r\n
```

A aplicação C# interpreta os campos separados por `;`.

O primeiro campo representa o valor da leitura:

```text
1024
```

O segundo campo representa o estado do filtro:

```text
1
```

A aplicação converte esse segundo campo para um valor booleano:

```text
1 → true
0 → false
```

Depois disso, a aplicação adiciona o timestamp e serializa a estrutura para JSON.

## Tecnologias

### Sistemas Embarcados

* STM32
* C
* STM32 HAL
* USB CDC
* GPIO
* ADC
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

### Servidor

* API REST
* HTTP
* JSON

### Interface

* Aplicação Web
* Comunicação com a API

## Estrutura prevista do projeto

```text
projeto/
├── firmware/
│   └── stm32/
│
├── comunicacao/
│   └── csharp/
│
├── ia/
│   └── modelo/
│
├── servidor/
│   └── api/
│
└── frontend/
    └── web/
```

## Status do projeto

| Componente                   | Status             |
| ---------------------------- | ------------------ |
| Leitura do sensor            | Em desenvolvimento |
| Filtro de média móvel        | Implementado       |
| GPIO para ativação do filtro | Implementado       |
| USB CDC                      | Implementado       |
| Protocolo STM32 → C#         | Implementado       |
| Leitura da Porta COM         | Implementado       |
| Processamento em C#          | Implementado       |
| Conversão para JSON          | Implementado       |
| HTTP/HttpClient              | Implementado       |
| API REST                     | Pendente           |
| Modelo de Machine Learning   | Pendente           |
| Classificação automática     | Pendente           |
| Interface Web                | Pendente           |
| Histórico de leituras        | Pendente           |

## Fluxo completo planejado

Quando todos os componentes estiverem implementados, o funcionamento esperado será:

```text
1. Sensor gera uma leitura
        ↓
2. STM32 lê o valor pelo ADC
        ↓
3. GPIO determina se o filtro está ativo
        ↓
4. Média móvel é aplicada, se necessário
        ↓
5. STM32 envia "valor;filtro" via USB CDC
        ↓
6. C# recebe a mensagem pela Porta COM
        ↓
7. C# valida e organiza os dados
        ↓
8. C# converte a leitura para JSON
        ↓
9. C# envia POST para a API
        ↓
10. API recebe a leitura
        ↓
11. API chama o modelo de Machine Learning
        ↓
12. Modelo classifica a leitura
        ↓
13. API retorna a classificação
        ↓
14. Dados ficam disponíveis para o frontend
        ↓
15. Interface Web apresenta a leitura,
    classificação e histórico
```

## Desenvolvimento atual

Até o momento, as etapas de Aquisição de Dados e Comunicação estão em desenvolvimento e já possuem uma implementação funcional inicial.

O próximo estágio consiste em finalizar a API REST, integrar o modelo de classificação e posteriormente desenvolver a interface Web.
