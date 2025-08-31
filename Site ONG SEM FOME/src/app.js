const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();

// Core middleware
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

// Static assets (mantidos nas pastas existentes na raiz)
const ROOT = path.join(__dirname, "..");
app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/js", express.static(path.join(ROOT, "js")));
app.use("/img", express.static(path.join(ROOT, "img")));
app.use("/", express.static(path.join(ROOT, "html")));

// Health check
app.get("/status", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

// Routes
app.use("/api", require("./routes/auth")); // /api/login, /api/logout, /api/me
app.use("/api/doadores", require("./routes/doadores"));
app.use("/api/familias", require("./routes/familias"));
app.use("/api/colaboradores", require("./routes/colaboradores"));
app.use("/api/categorias", require("./routes/categorias"));
app.use("/api/campanhas", require("./routes/campanhas"));
app.use("/api/solicitacoes", require("./routes/solicitacoes"));
app.use("/api/entradas", require("./routes/entradas"));

// Error handler
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error("Erro na API:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

module.exports = app;
