using System;
using System.IO.Ports;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Leitura
{
    public int Valor { get; set; }
    public bool Filtro { get; set; }
    public DateTime Timestamp { get; set; }
}

class Program
{
    static SerialPort ConfigurarPorta()
    {
        SerialPort porta = new SerialPort();

        porta.PortName = "COM5";
        porta.BaudRate = 115200;
        porta.NewLine = "\r\n";

        porta.Open();

        return porta;
    }

    static Leitura? ProcessarLinha(string linha)
    {
        string[] partes = linha.Split(';');

        if (partes.Length != 2)
        {
            Console.WriteLine($"Dados inválidos: {linha}");
            return null;
        }

        if (!int.TryParse(partes[0], out int valor))
        {
            Console.WriteLine($"Valor inválido: {partes[0]}");
            return null;
        }

        if (partes[1] != "0" && partes[1] != "1")
        {
            Console.WriteLine($"Filtro inválido: {partes[1]}");
            return null;
        }

        return new Leitura
        {
            Valor = valor,
            Filtro = partes[1] == "1",
            Timestamp = DateTime.Now
        };
    }

    static string ConverterParaJson(Leitura leitura)
    {
        JsonSerializerOptions opcoes = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        return JsonSerializer.Serialize(leitura, opcoes);
    }

    static async Task<HttpResponseMessage> EnviarParaApi(
        HttpClient client,
        string json)
    {
        StringContent conteudo = new StringContent(
            json,
            Encoding.UTF8,
            "application/json"
        );

        return await client.PostAsync(
            "http://localhost:3001/leituras",
            conteudo
        );
    }

    static async Task Main()
    {
        using SerialPort porta = ConfigurarPorta();
        using HttpClient client = new HttpClient();

        Console.WriteLine($"Conectado em {porta.PortName}");

        while (true)
        {
            string linha = porta.ReadLine();

            Leitura? leitura = ProcessarLinha(linha);

            if (leitura == null)
                continue;

            string json = ConverterParaJson(leitura);

            Console.WriteLine($"Enviando: {json}");

            try
            {
                HttpResponseMessage resposta = await EnviarParaApi(
                    client,
                    json
                );

                string respostaApi =
                    await resposta.Content.ReadAsStringAsync();

                if (resposta.IsSuccessStatusCode)
                {
                    Console.WriteLine(
                        $"API: {(int)resposta.StatusCode} {resposta.StatusCode}"
                    );

                    Console.WriteLine($"Resposta: {respostaApi}");
                }
                else
                {
                    Console.WriteLine(
                        $"Erro da API: {(int)resposta.StatusCode} {resposta.StatusCode}"
                    );

                    Console.WriteLine($"Resposta: {respostaApi}");
                }
            }
            catch (HttpRequestException erro)
            {
                Console.WriteLine($"Erro ao enviar para API: {erro.Message}");
            }
        }
    }
}