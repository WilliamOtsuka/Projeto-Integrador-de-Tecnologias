const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { requireAuth, asyncHandler } = require("../middleware/auth");

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      "SELECT id_familia AS id, nome, responsavel, contato, cep, logradouro, numero, complemento, bairro, cidade, uf FROM familias ORDER BY id_familia DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    const [[cnt]] = await pool.query("SELECT COUNT(*) AS total FROM familias");
    res.json({ data: rows, total: Number(cnt.total || 0), page, limit });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      nome,
      responsavel,
      contato,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
    } = req.body;
    const [r] = await pool.execute(
      "INSERT INTO familias (nome, responsavel, contato, cep, logradouro, numero, complemento, bairro, cidade, uf) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        nome,
        responsavel,
        contato,
        cep,
        logradouro,
        numero,
        complemento || null,
        bairro,
        cidade,
        uf,
      ]
    );
    res
      .status(201)
      .json({
        id: r.insertId,
        nome,
        responsavel,
        contato,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
      });
  })
);

router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      nome,
      responsavel,
      contato,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
    } = req.body;
    await pool.execute(
      "UPDATE familias SET nome=?, responsavel=?, contato=?, cep=?, logradouro=?, numero=?, complemento=?, bairro=?, cidade=?, uf=? WHERE id_familia=?",
      [
        nome,
        responsavel,
        contato,
        cep,
        logradouro,
        numero,
        complemento || null,
        bairro,
        cidade,
        uf,
        id,
      ]
    );
    res.json({
      id: Number(id),
      nome,
      responsavel,
      contato,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
    });
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.execute("DELETE FROM familias WHERE id_familia=?", [id]);
    res.status(204).end();
  })
);

module.exports = router;
