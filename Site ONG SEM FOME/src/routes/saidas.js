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
      `SELECT s.*, f.nome AS familia_nome
       FROM saidas s
       LEFT JOIN familias f ON f.id = s.familia_id
       ORDER BY s.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM saidas');
    res.json({ data: rows, total: Number(cnt.total||0), page, limit });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `
    SELECT s.*, f.nome AS familia_nome
    FROM saidas s
    LEFT JOIN familias f ON f.id = s.familia_id
    WHERE s.id=?`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Saída não encontrada" });
    res.json(rows[0]);
  })
);

// Registra saída de cestas
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data, familia_id, responsavel, qtd, obs } = req.body;
    const nQtd = Number(qtd || 0);
    if (
      !data ||
      !familia_id ||
      !responsavel ||
      !Number.isInteger(nQtd) ||
      nQtd <= 0
    ) {
      return res.status(400).json({ error: "Dados inválidos" });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [saldoRows] = await conn.execute(
        "SELECT COALESCE(SUM(quantidade),0) AS saldo FROM entradas WHERE TRIM(categoria) COLLATE utf8mb4_unicode_ci = 'Cesta Básica'"
      );
      const saldo = Number(saldoRows?.[0]?.saldo || 0);
      if (nQtd > saldo) {
        throw new Error(
          `Saldo insuficiente de cestas. Disponível: ${saldo}, necessário: ${nQtd}`
        );
      }

      const [colFamilia] = await conn.execute(
        `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saidas' AND COLUMN_NAME='familia'`
      );
      const [colQtdCestas] = await conn.execute(
        `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saidas' AND COLUMN_NAME='quantidade_cestas'`
      );
      const needFamiliaText =
        Array.isArray(colFamilia) &&
        colFamilia.length > 0 &&
        String(colFamilia[0].IS_NULLABLE || "").toUpperCase() === "NO";
      const haveQtdCestas =
        Array.isArray(colQtdCestas) && colQtdCestas.length > 0;
      const needQtdCestas =
        haveQtdCestas &&
        String(colQtdCestas[0].IS_NULLABLE || "").toUpperCase() === "NO";

      const columns = ["data"];
      const values = [data];
      if (needFamiliaText) {
        const [frows] = await conn.execute(
          "SELECT nome FROM familias WHERE id=?",
          [familia_id]
        );
        const familiaNome = frows?.[0]?.nome || null;
        columns.push("familia");
        values.push(familiaNome);
      }
      columns.push("familia_id", "responsavel", "qtd", "obs");
      values.push(familia_id, responsavel, nQtd, obs || null);
      if (needQtdCestas) {
        columns.push("quantidade_cestas");
        values.push(nQtd);
      }
      const placeholders = columns.map(() => "?").join(",");
      const insertSql = `INSERT INTO saidas (${columns.join(
        ","
      )}) VALUES (${placeholders})`;
      const [ins] = await conn.execute(insertSql, values);
      const saidaId = ins.insertId;

      await conn.execute(
        "INSERT INTO entradas (data, doador, categoria, quantidade, unidade, campanha, obs) VALUES (?,?,?,?,?,?,?)",
        [
          data,
          "SAIDA",
          "Cesta Básica",
          -Math.abs(nQtd),
          "cx",
          null,
          `Saída #${saidaId} - Família ${familia_id}${obs ? " - " + obs : ""}`,
        ]
      );

      await conn.commit();
      res
        .status(201)
        .json({ id: saidaId, data, familia_id, responsavel, qtd: nQtd, obs });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// Atualiza uma saída e ajusta a entrada negativa vinculada
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { data, familia_id, responsavel, qtd, obs } = req.body;
    const nQtd = Number(qtd || 0);
    if (
      !data ||
      !familia_id ||
      !responsavel ||
      !Number.isInteger(nQtd) ||
      nQtd <= 0
    ) {
      return res.status(400).json({ error: "Dados inválidos" });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Atualiza saída
      const [upd] = await conn.execute(
        "UPDATE saidas SET data=?, familia_id=?, responsavel=?, qtd=?, obs=? WHERE id=?",
        [data, familia_id, responsavel, nQtd, obs || null, id]
      );
      if (upd.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Saída não encontrada" });
      }

      // Atualiza entrada negativa correspondente
      await conn.execute(
        "UPDATE entradas SET data=?, quantidade=?, obs=? WHERE obs LIKE ?",
        [
          data,
          -Math.abs(nQtd),
          `Saída #${id} - Família ${familia_id}${obs ? " - " + obs : ""}`,
          `Saída #${id}%`,
        ]
      );

      await conn.commit();
      res.json({
        id: Number(id),
        data,
        familia_id,
        responsavel,
        qtd: nQtd,
        obs,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// Exclui uma saída e remove a entrada negativa correspondente
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Obter dados para montar o padrão da OBS e remover a saída
      const [rows] = await conn.execute("SELECT * FROM saidas WHERE id=?", [
        id,
      ]);
      if (!rows.length) {
        await conn.rollback();
        return res.status(404).json({ error: "Saída não encontrada" });
      }
      const saida = rows[0];

      await conn.execute("DELETE FROM saidas WHERE id=?", [id]);
      await conn.execute("DELETE FROM entradas WHERE obs LIKE ?", [
        `Saída #${id}%`,
      ]);

      await conn.commit();
      res.status(204).end();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

module.exports = router;
