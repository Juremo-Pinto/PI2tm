from flask import Flask, request, jsonify
import joblib
import os

app = Flask(__name__)

# Caminho do modelo treinado
MODELO_PATH = os.path.join(
    os.path.dirname(__file__),
    "modelo.pkl"
)

# Carrega a IA
modelo = joblib.load(MODELO_PATH)

print("Carregou :D")


# Recebe uma previsão
@app.post("/prever")
def prever():

    # Recebe o JSON
    data = request.get_json()

    if not data:
        return jsonify({
            "erro": "Nenhum JSON recebido"
        }), 400

    # Verifica se recebeu o valor
    if "valor" not in data:
        return jsonify({
            "erro": "Campo 'valor' não foi enviado"
        }), 400

    value = data["valor"]

    # Verifica se é número
    if not isinstance(value, (int, float)):
        return jsonify({
            "erro": "O valor precisa ser um número"
        }), 400

    try:

        # Faz a previsão
        predictions = modelo.predict([[value]])[0]

        # Classes da IA
        classes = {
            0: "Aprovado",
            1: "Atenção",
            2: "Reprovado"
        }

        # Converte classe para texto
        result = classes.get(
            int(predictions),
            "Desconhecido"
        )

        # Retorna o resultado
        return jsonify({
            "valor": value,
            "classe": int(predictions),
            "resultado": result
        })

    except Exception as erro:

        return jsonify({
            "erro": str(erro)
        }), 500


# Inicia o servidor
if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )

# im such a fat fucking chud