#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const schemaPath = path.resolve(__dirname, '..', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('[schema] Arquivo schema.sql não encontrado em', schemaPath);
    process.exit(1);
  }
  const sqlRaw = fs.readFileSync(schemaPath, 'utf8');
  // Remove comentários de linha e separa por ponto e vírgula preservando ordem
  const statements = sqlRaw
    .replace(/--.*$/gm, '') // remove comentários --
    .split(/;\s*\n/)      // divide por ; seguido de quebra de linha
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('[schema] Conectado ao MySQL');
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (e) {
        console.error('[schema] Erro ao executar trecho:', stmt.slice(0,80) + '...', '\n', e.message);
      }
    }
    console.log('[schema] Aplicação do schema concluída');
  } catch (e) {
    console.error('[schema] Falha geral:', e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
