// Seeder simples: aplica schema.sql (DDL + INSERTs de seed) usando credenciais do .env
// Uso: npm run db:seed

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '3306',
    DB_USER = 'root',
    DB_PASSWORD = '',
  } = process.env;

  const schemaPath = path.resolve(__dirname, '..', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql não encontrado em', schemaPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(schemaPath, 'utf8');

// Conectar sem especificar o banco de dados primeiro (schema.sql cria/usa o banco de dados)
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    console.log('Schema e seed executados com sucesso.');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Falha ao aplicar schema/seed:', err.message);
  process.exit(1);
});
