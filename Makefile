.PHONY: demo down

# O comando "demo" sobe todos os serviços definidos no docker-compose.yml [cite: 55]
# A flag --build garante que a imagem Docker seja reconstruída se houver mudanças.
demo:
	@echo "🚀 Subindo o ambiente de demonstração..."
	docker-compose up --build

# O comando "down" para e remove os contêineres.
down:
	@echo "🛑 Parando o ambiente..."
	docker-compose down