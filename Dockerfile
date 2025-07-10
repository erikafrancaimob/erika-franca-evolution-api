# Use imagem Node.js oficial
FROM node:18

# Diretório da aplicação dentro do container
WORKDIR /app

# Copia os arquivos package.json e package-lock.json
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o restante do código
COPY . .

# Porta padrão
EXPOSE 3000

# Comando para iniciar a API
CMD ["node", "server.js"]