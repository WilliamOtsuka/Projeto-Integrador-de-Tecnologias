const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "chave-secreta",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

const ROOT = path.join(__dirname, "..");
app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/js", express.static(path.join(ROOT, "js")));
app.use("/img", express.static(path.join(ROOT, "img")));
app.use("/", express.static(path.join(ROOT, "html")));

app.get("/status", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

// Routes
app.use("/api", require("./routes/auth")); // /api/login, /api/logout, /api/me
app.use("/api/cadastro", require("./routes/cadastro"));
app.use("/api/doadores", require("./routes/doadores"));
app.use("/api/familias", require("./routes/familias"));
app.use("/api/colaboradores", require("./routes/colaboradores"));
app.use("/api/categorias", require("./routes/categorias"));
app.use("/api/campanhas", require("./routes/campanhas"));
app.use("/api/solicitacoes", require("./routes/solicitacoes"));
app.use("/api/entradas", require("./routes/entradas"));
app.use("/api/montagens/custom", require("./routes/montar_cestas"));
app.use("/api/saidas", require("./routes/saidas"));
app.use("/api/estoque", require("./routes/estoque.js"));
app.use("/api/doacao", require("./routes/doacao"))

// Error handler
app.use((err, req, res, next) => {
  console.error("Erro na API:", err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  const message = err.message || "Erro interno do servidor";
  res.status(status).json({ error: message });
});

module.exports = app;
