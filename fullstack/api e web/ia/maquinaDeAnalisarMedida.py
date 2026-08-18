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
@app.post("/preview")
def prever():

    data = request.get_json()

    if not data:
        return jsonify({
            "erro": "Nenhum JSON recebido"
        }), 400

    if "valor" not in data:
        return jsonify({
            "erro": "Campo 'valor' não foi enviado"
        }), 400

    value = data["valor"]

    try:
        prediction = modelo.predict([[value]])[0]

        classes = {
            0: "Aprovado",
            1: "Atenção",
            2: "Reprovado"
        }

        result = classes.get(
            int(prediction),
            "Desconhecido"
        )


        return jsonify({
            "valor": value,
            "classe": int(prediction),
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
        debug=False
    )

# im such a fat fucking chud