const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { requireAuth, asyncHandler } = require("../middleware/auth");

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data, responsavel, qtd_cestas, obs, itens, solicitacao_id } = req.body;
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Itens obrigatórios" });
    }
    const normalizados = itens.map((it) => ({
      categoria: String(it.categoria || "").trim(),
      unidade: String(it.unidade || "")
        .trim()
        .toLowerCase(),
      quantidade: Number(it.quantidade || 0),
    }));
    const distintos = new Set(
      normalizados.map((it) => `${it.categoria.toLowerCase()}||${it.unidade}`)
    );
    if (distintos.size < 3) {
      return res
        .status(400)
        .json({ error: "A montagem deve conter pelo menos 3 itens distintos" });
    }
    if (
      normalizados.some(
        (it) =>
          it.categoria.toLowerCase() === "cesta básica" ||
          it.unidade === "cesta"
      )
    ) {
      return res
        .status(400)
        .json({
          error: "Não é permitido utilizar cestas como item de montagem",
        });
    }
    const qtd = Number(qtd_cestas || 0);
    if (!Number.isInteger(qtd) || qtd <= 0) {
      return res.status(400).json({ error: "qtd_cestas inválida" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Se houver solicitação vinculada, validar que é de 'Cesta Básica'
      let solicitacaoIdNum = null;
      if (solicitacao_id != null && solicitacao_id !== '') {
        const sId = Number(solicitacao_id);
        if (!Number.isInteger(sId) || sId <= 0) {
          await conn.rollback();
          return res.status(400).json({ error: 'solicitacao_id inválido' });
        }
  const [[sRow]] = await conn.execute('SELECT id_solicitacao AS id, categoria FROM solicitacoes WHERE id_solicitacao=?', [sId]);
        if (!sRow) {
          await conn.rollback();
          return res.status(404).json({ error: 'Solicitação não encontrada' });
        }
        const cat = String(sRow.categoria || '').trim().toLowerCase();
        if (cat !== 'cesta básica') {
          await conn.rollback();
          return res.status(400).json({ error: 'Apenas solicitações de Cesta Básica podem ser vinculadas à montagem' });
        }
        solicitacaoIdNum = sId;
      }

      // Verifica saldo atual por (categoria, unidade)
      const [entradas] = await conn.execute(
        "SELECT categoria, LOWER(unidade) as unidade, SUM(quantidade) AS saldo FROM entradas GROUP BY categoria, LOWER(unidade)"
      );
      const saldoMap = new Map();
      for (const e of entradas) {
        const key = `${String(e.categoria || "")
          .trim()
          .toLowerCase()}||${String(e.unidade || "")
          .trim()
          .toLowerCase()}`;
        saldoMap.set(key, Number(e.saldo) || 0);
      }

      // Calcula necessidade total = quantidade_por_cesta * qtd_cestas e compara com saldo
      const faltas = [];
      for (const it of normalizados) {
        const key = `${it.categoria.toLowerCase()}||${it.unidade}`;
        const disponivel = saldoMap.get(key) || 0;
        const necessario = Number(it.quantidade || 0) * qtd;
        if (necessario > disponivel) {
          faltas.push({
            categoria: it.categoria,
            unidade: it.unidade,
            disponivel,
            necessario,
          });
        }
      }
      if (faltas.length > 0) {
        const msg = faltas
          .map(
            (f) =>
              `Disponível: ${f.disponivel} ${f.unidade} de ${f.categoria}, necessário: ${f.necessario} ${f.unidade}`
          )
          .join("; ");
        return res.status(400).json({ error: `Estoque insuficiente. ${msg}.` });
      }

      // Registra montagem (compatível com colunas legadas NOT NULL)
      // Verificar colunas existentes e obrigatórias
      const [mCols] = await conn.execute(
        `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'montagens'`
      );
      const mustInclude = new Set(
        mCols
          .filter((c) => String(c.IS_NULLABLE || '').toUpperCase() === 'NO')
          .map((c) => String(c.COLUMN_NAME).toLowerCase())
      );

      const columns = ["data", "responsavel", "qtd_cestas", "obs"];
      const values = [data, responsavel, qtd, obs || null];
      // Se coluna legada 'quantidade' é NOT NULL, preencher com qtd de cestas
      if (mustInclude.has("quantidade") && !columns.includes("quantidade")) {
        columns.push("quantidade");
        values.push(qtd);
      }
      // Caso ainda exista 'kit_id' NOT NULL (cenário extremo), tentar enviar NULL
      if (mustInclude.has("kit_id") && !columns.includes("kit_id")) {
        columns.push("kit_id");
        values.push(null);
      }
      const placeholders = columns.map(() => "?").join(",");
      const sqlIns = `INSERT INTO montagens (${columns.join(",")}) VALUES (${placeholders})`;
      const [r] = await conn.execute(sqlIns, values);
      const montagemId = r.insertId;

      // Guarda itens consumidos
      for (const it of normalizados) {
        const cat = String(it.categoria || "").trim();
        const un = String(it.unidade || "")
          .trim()
          .toLowerCase();
        const q = Number(it.quantidade || 0);
        if (!cat || !un || !Number.isFinite(q) || q <= 0) {
          throw new Error("Item inválido na lista");
        }
        await conn.execute(
          "INSERT INTO montagens_itens (montagem_id, categoria, unidade, quantidade) VALUES (?,?,?,?)",
          [montagemId, cat, un, q]
        );
      }
      // 1) Baixa dos itens consumidos (entradas negativas)
      for (const it of normalizados) {
        const quantidadeTotal = -Math.abs(Number(it.quantidade)) * qtd; // quantidade por cesta x qtd de cestas
        await conn.execute(
          "INSERT INTO entradas (data, doador, categoria, quantidade, unidade, campanha, obs) VALUES (?,?,?,?,?,?,?)",
          [
            data,
            "MONTAGEM",
            it.categoria,
            quantidadeTotal,
            it.unidade,
            null,
            `Baixa montagem #${montagemId}`,
          ]
        );
      }
      // 2) Entrada das cestas produzidas (opcionalmente vinculada à solicitação)
      if (solicitacaoIdNum) {
        await conn.execute(
          "INSERT INTO entradas (data, doador, categoria, quantidade, unidade, campanha, obs, solicitacao_id) VALUES (?,?,?,?,?,?,?,?)",
          [
            data,
            "MONTAGEM",
            "Cesta Básica",
            qtd,
            "cx",
            null,
            `Produção montagem #${montagemId}`,
            solicitacaoIdNum,
          ]
        );
      } else {
        await conn.execute(
          "INSERT INTO entradas (data, doador, categoria, quantidade, unidade, campanha, obs) VALUES (?,?,?,?,?,?,?)",
          [
            data,
            "MONTAGEM",
            "Cesta Básica",
            qtd,
            "cx",
            null,
            `Produção montagem #${montagemId}`,
          ]
        );
      }

      // Recalcula status da solicitação vinculada (se houver)
      if (solicitacaoIdNum) {
  const [[s]] = await conn.execute('SELECT quantidade FROM solicitacoes WHERE id_solicitacao=?', [solicitacaoIdNum]);
        const reqQtd = Number(s?.quantidade || 0);
        const [[tot]] = await conn.execute('SELECT COALESCE(SUM(quantidade),0) AS total FROM entradas WHERE solicitacao_id=?', [solicitacaoIdNum]);
        const recebido = Number(tot.total || 0);
        let novoStatus;
        if (reqQtd > 0 && recebido >= reqQtd) novoStatus = 'atendido';
        else if (recebido > 0) novoStatus = 'em compra';
        else novoStatus = 'aprovado';
  await conn.execute('UPDATE solicitacoes SET status=? WHERE id_solicitacao=?', [novoStatus, solicitacaoIdNum]);
      }

      await conn.commit();
      res
        .status(201)
        .json({ id: montagemId, data, responsavel, qtd_cestas: qtd, obs, solicitacao_id: solicitacaoIdNum });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

module.exports = router;
