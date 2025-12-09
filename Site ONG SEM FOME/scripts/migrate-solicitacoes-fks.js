#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

function buildConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ong_sem_fome',
    multipleStatements: true,
  };
}

async function columnExists(conn, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitacoes' AND COLUMN_NAME = ? LIMIT 1`,
    [column]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(conn, column, definition) {
  const exists = await columnExists(conn, column);
  if (exists) return;
  console.log(`[migrate] Adicionando coluna ${column}...`);
  await conn.query(`ALTER TABLE solicitacoes ADD COLUMN ${definition}`);
}

async function dropColumnIfExists(conn, column) {
  const exists = await columnExists(conn, column);
  if (!exists) return;
  console.log(`[migrate] Removendo coluna legada ${column}...`);
  await conn.query(`ALTER TABLE solicitacoes DROP COLUMN ${column}`);
}

async function constraintExists(conn, constraintName) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitacoes' AND CONSTRAINT_NAME = ? LIMIT 1`,
    [constraintName]
  );
  return rows.length > 0;
}

async function dropConstraintIfExists(conn, constraintName) {
  const exists = await constraintExists(conn, constraintName);
  if (!exists) return;
  console.log(`[migrate] Removendo constraint ${constraintName}...`);
  await conn.query(`ALTER TABLE solicitacoes DROP FOREIGN KEY ${constraintName}`);
}

(async () => {
  const conn = await mysql.createConnection(buildConfig());
  try {
    console.log('[migrate] Iniciando migração das solicitações...');
    await conn.beginTransaction();

    const hasCategoriaId = await columnExists(conn, 'categoria_id');
    const hasLegacyCategoria = await columnExists(conn, 'categoria');
    if (hasCategoriaId && !hasLegacyCategoria) {
      console.log('[migrate] Estrutura já atualizada. Nada a fazer.');
      await conn.rollback();
      return;
    }

    await addColumnIfMissing(conn, 'categoria_id', 'INT NULL AFTER titulo');
    await addColumnIfMissing(conn, 'item_id', 'INT NULL AFTER categoria_id');
    await addColumnIfMissing(conn, 'solicitante_id', 'INT NULL AFTER data_solicitacao');

    await conn.query(`
      UPDATE solicitacoes s
      LEFT JOIN categorias c ON c.nome = s.categoria
         SET s.categoria_id = c.id_categoria
       WHERE s.categoria IS NOT NULL AND s.categoria_id IS NULL
    `);

    await conn.query(`
      UPDATE solicitacoes s
      LEFT JOIN categorias_itens ci ON ci.nome_item = s.item
      LEFT JOIN categorias cci ON cci.id_categoria = ci.categoria_id
         SET s.item_id = ci.id_item
       WHERE s.item IS NOT NULL
         AND s.item_id IS NULL
         AND (
           (s.categoria_id IS NOT NULL AND s.categoria_id = ci.categoria_id)
           OR (s.categoria_id IS NULL AND s.categoria = cci.nome)
         )
    `);

    await conn.query(`
      UPDATE solicitacoes s
      LEFT JOIN colaboradores col ON col.nome = s.solicitante
         SET s.solicitante_id = col.id_colaborador
       WHERE s.solicitante IS NOT NULL AND s.solicitante_id IS NULL
    `);

    await conn.query(`
      UPDATE solicitacoes s
      JOIN categorias c ON c.id_categoria = s.categoria_id
         SET s.item_id = NULL
       WHERE LOWER(c.tipo) <> 'composta' AND s.item_id IS NOT NULL
    `);

    const [[missingCats]] = await conn.query('SELECT COUNT(*) AS total FROM solicitacoes WHERE categoria_id IS NULL');
    if (Number(missingCats.total || 0) > 0) {
      throw new Error('Ainda existem solicitações sem categoria_id. Relacione-as manualmente antes de prosseguir.');
    }

    await dropConstraintIfExists(conn, 'fk_solicitacoes_categoria');
    await dropConstraintIfExists(conn, 'fk_solicitacoes_item');
    await dropConstraintIfExists(conn, 'fk_solicitacoes_solicitante');

    if (!(await constraintExists(conn, 'fk_solicitacoes_categoria'))) {
      await conn.query(`
        ALTER TABLE solicitacoes
          ADD CONSTRAINT fk_solicitacoes_categoria
            FOREIGN KEY (categoria_id) REFERENCES categorias(id_categoria)
            ON DELETE RESTRICT
      `);
    }

    if (!(await constraintExists(conn, 'fk_solicitacoes_item'))) {
      await conn.query(`
        ALTER TABLE solicitacoes
          ADD CONSTRAINT fk_solicitacoes_item
            FOREIGN KEY (item_id) REFERENCES categorias_itens(id_item)
            ON DELETE SET NULL
      `);
    }

    if (!(await constraintExists(conn, 'fk_solicitacoes_solicitante'))) {
      await conn.query(`
        ALTER TABLE solicitacoes
          ADD CONSTRAINT fk_solicitacoes_solicitante
            FOREIGN KEY (solicitante_id) REFERENCES colaboradores(id_colaborador)
            ON DELETE SET NULL
      `);
    }

    await conn.query('ALTER TABLE solicitacoes MODIFY categoria_id INT NOT NULL');

    await dropColumnIfExists(conn, 'categoria');
    await dropColumnIfExists(conn, 'item');
    await dropColumnIfExists(conn, 'solicitante');

    await conn.commit();
    console.log('[migrate] Migração concluída com sucesso.');
  } catch (err) {
    await conn.rollback();
    console.error('[migrate] Falha ao migrar solicitações:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
