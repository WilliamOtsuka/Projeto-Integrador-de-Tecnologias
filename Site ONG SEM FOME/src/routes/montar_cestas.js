const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { requireAuth, asyncHandler } = require("../middleware/auth");

async function ensureMontagensSchema(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS montagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL,
    responsavel VARCHAR(120) NOT NULL,
    qtd_cestas INT NOT NULL,
    obs TEXT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'montagens'`
  );
  const have = new Set(cols.map((c) => String(c.COLUMN_NAME).toLowerCase()));
  // Coluna legada de versões antigas: "kit_id" não é mais utilizada
  if (have.has("kit_id")) {
    try {
      // Remover FKs que usam kit_id
      const [fkRows] = await conn.execute(
        `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'montagens' AND COLUMN_NAME = 'kit_id' AND REFERENCED_TABLE_NAME IS NOT NULL`
      );
      for (const fk of fkRows) {
        const name = fk.CONSTRAINT_NAME;
        try {
          await conn.query(`ALTER TABLE montagens DROP FOREIGN KEY \`${name}\``);
        } catch (e) {
          // ignore
        }
      }
      // Remover índices em kit_id (se houver)
      const [idxRows] = await conn.execute(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'montagens' AND COLUMN_NAME = 'kit_id' AND INDEX_NAME <> 'PRIMARY'`
      );
      for (const idx of idxRows) {
        const idxName = idx.INDEX_NAME;
        try {
          await conn.query(`ALTER TABLE montagens DROP INDEX \`${idxName}\``);
        } catch (e) {
          // ignore
        }
      }
      // Tentar remover a coluna por completo
      await conn.query(`ALTER TABLE montagens DROP COLUMN kit_id`);
      have.delete("kit_id");
    } catch (e) {
      try {
        await conn.query(
          `ALTER TABLE montagens MODIFY COLUMN kit_id INT NULL DEFAULT NULL`
        );
      } catch (e2) {
        // Fallback: ignorar se não for possível alterar. Inserções não usam kit_id.
      }
    }
  }
  if (!have.has("responsavel")) {
    await conn.query(
      `ALTER TABLE montagens ADD COLUMN responsavel VARCHAR(120) NOT NULL DEFAULT '' AFTER data`
    );
  }
  if (!have.has("qtd_cestas")) {
    if (have.has("qtd")) {
      await conn.query(
        `ALTER TABLE montagens CHANGE COLUMN qtd qtd_cestas INT NOT NULL`
      );
      have.add("qtd_cestas");
    } else if (have.has("quantidade")) {
      // Renomear coluna legada 'quantidade' usada anteriormente
      try {
        await conn.query(
          `ALTER TABLE montagens CHANGE COLUMN quantidade qtd_cestas INT NOT NULL`
        );
        have.add("qtd_cestas");
        have.delete("quantidade");
      } catch (e) {
        // Se não for possível renomear, ao menos evitar erro de NOT NULL
        try {
          await conn.query(
            `ALTER TABLE montagens MODIFY COLUMN quantidade INT NULL DEFAULT NULL`
          );
        } catch (e2) {}
        // Criar a coluna correta
        await conn.query(
          `ALTER TABLE montagens ADD COLUMN qtd_cestas INT NOT NULL DEFAULT 0 AFTER responsavel`
        );
        have.add("qtd_cestas");
      }
    } else {
      await conn.query(
        `ALTER TABLE montagens ADD COLUMN qtd_cestas INT NOT NULL DEFAULT 0 AFTER responsavel`
      );
      have.add("qtd_cestas");
    }
  } else {
    // Se 'quantidade' existir além de 'qtd_cestas', torná-la opcional para evitar validações NOT NULL
    if (have.has("quantidade")) {
      try {
        await conn.query(
          `ALTER TABLE montagens MODIFY COLUMN quantidade INT NULL DEFAULT NULL`
        );
      } catch (e) {}
    }
  }
  if (!have.has("obs")) {
    await conn.query(`ALTER TABLE montagens ADD COLUMN obs TEXT NULL AFTER qtd_cestas`);
  }

  await conn.query(`CREATE TABLE IF NOT EXISTS montagens_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    montagem_id INT NOT NULL,
    categoria VARCHAR(120) NOT NULL,
    unidade VARCHAR(16) NOT NULL,
    quantidade INT NOT NULL,
    FOREIGN KEY (montagem_id) REFERENCES montagens(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [miCols] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'montagens_itens'`
  );
  const miHave = new Set(miCols.map((c) => String(c.COLUMN_NAME).toLowerCase()));
  if (!miHave.has("categoria")) {
    await conn.query(
      `ALTER TABLE montagens_itens ADD COLUMN categoria VARCHAR(120) NULL`
    );
  }
  if (!miHave.has("unidade")) {
    await conn.query(
      `ALTER TABLE montagens_itens ADD COLUMN unidade VARCHAR(16) NULL`
    );
  }
  if (!miHave.has("quantidade")) {
    await conn.query(
      `ALTER TABLE montagens_itens ADD COLUMN quantidade INT NULL`
    );
  }
}

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data, responsavel, qtd_cestas, obs, itens } = req.body;
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
      await ensureMontagensSchema(conn);

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
      // 2) Entrada das cestas produzidas
      await conn.execute(
        "INSERT INTO entradas (data, doador, categoria, quantidade, unidade, campanha, obs) VALUES (?,?,?,?,?,?,?)",
        [
          data,
          "MONTAGEM",
          "Cesta Básica",
          qtd,
          "cesta",
          null,
          `Produção montagem #${montagemId}`,
        ]
      );

      await conn.commit();
      res
        .status(201)
        .json({ id: montagemId, data, responsavel, qtd_cestas: qtd, obs });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

module.exports = router;
