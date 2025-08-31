const app = require("./app");

const BASE_PORT = Number(process.env.PORT) || 3000;

function startServer(port, attemptsLeft = 5) {
  const server = app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE" && attemptsLeft > 0) {
      const nextPort = port + 1;
      console.warn(
        `Porta ${port} já está em uso. Tentando a porta ${nextPort}...`
      );
      startServer(nextPort, attemptsLeft - 1);
    } else {
      console.error("Falha ao iniciar o servidor:", err);
      process.exit(1);
    }
  });
}

startServer(BASE_PORT);
