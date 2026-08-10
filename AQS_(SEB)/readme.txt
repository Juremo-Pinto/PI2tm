Aquisição de dados (Sistemas Embarcados)
O STM32 deverá realizar a leitura de um sensor analógico (simulado por um trimpot ou
potenciômetro) e enviar periodicamente as medições para o computador através da
interface USB utilizando comunicação serial (USB CDC / Porta COM).
Cada transmissão deverá conter, no mínimo, o valor medido pelo sensor

OBRIGATÓRIO:
● Leitura de um sensor analógico.
● Envio periódico das medições via USB CDC (Porta COM)
● Protocolo de serialização compatível com o sistema.
● Opção de ativação de pré-processamento (filtragem) através de GPIO (escolha do tipo de filtro deve
ser compatível com o tipo de variável física).

Filtro usado: Média móvel