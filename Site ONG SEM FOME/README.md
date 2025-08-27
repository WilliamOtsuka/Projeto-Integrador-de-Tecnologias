# ONG SEM FOME - Servidor Express (local)

Este repositório contém páginas estáticas (HTML/CSS) e um servidor Express mínimo para servir os arquivos localmente.

Pré-requisitos
- Node.js 14+ instalado

Instalação
Abra o PowerShell na pasta do projeto e rode:

npm install

Executar
- Rodar em produção:

npm start

- Rodar em desenvolvimento (com hot-reload):

npm run dev

Acesse: http://localhost:3000

Observações
- O diretório `/html` é servido na raiz.
- O CSS está em `/css`.
- Se preferir usar outro servidor (live-server, http-server) também funciona; o Express é apenas uma opção para teste local.
