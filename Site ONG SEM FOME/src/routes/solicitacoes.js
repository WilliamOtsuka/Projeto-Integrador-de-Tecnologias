const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

async function ensureSolicitacoesSchema(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS solicitacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(160) NOT NULL,
    categoria VARCHAR(120) NOT NULL,
    descricao TEXT NULL,
    data_solicitacao DATE NULL,
    solicitante VARCHAR(120) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    prioridade VARCHAR(20) NOT NULL DEFAULT 'normal',
    quantidade VARCHAR(120) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitacoes'`
  );
  const have = new Set(cols.map(c => String(c.COLUMN_NAME).toLowerCase()));
  const addIfMissing = async (name, def) => {
    if (!have.has(name)) {
      await conn.query(`ALTER TABLE solicitacoes ADD COLUMN ${def}`);
    }
  };
  await addIfMissing('data_solicitacao', "data_solicitacao DATE NULL AFTER descricao");
  await addIfMissing('solicitante', "solicitante VARCHAR(120) NULL AFTER data_solicitacao");
  await addIfMissing('status', "status VARCHAR(20) NOT NULL DEFAULT 'pendente' AFTER solicitante");
  await addIfMissing('prioridade', "prioridade VARCHAR(20) NOT NULL DEFAULT 'normal' AFTER status");
  await addIfMissing('quantidade', "quantidade VARCHAR(120) NULL AFTER prioridade");
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  await ensureSolicitacoesSchema(pool);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query('SELECT * FROM solicitacoes ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM solicitacoes');
  res.json({ data: rows, total: Number(cnt.total||0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  await ensureSolicitacoesSchema(pool);
  const { titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade } = req.body || {};
  const ds = data_solicitacao || null;
  const sol = solicitante || null;
  const st = status || 'pendente';
  const pr = prioridade || 'normal';
  const q = quantidade || null;
  const [r] = await pool.execute(
    'INSERT INTO solicitacoes (titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade) VALUES (?,?,?,?,?,?,?,?)',
    [titulo, categoria, descricao || null, ds, sol, st, pr, q]
  );
  res.status(201).json({ id: r.insertId, titulo, categoria, descricao, data_solicitacao: ds, solicitante: sol, status: st, prioridade: pr, quantidade: q });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  await ensureSolicitacoesSchema(pool);
  const { id } = req.params; 
  const { titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade } = req.body || {};
  await pool.execute(
    'UPDATE solicitacoes SET titulo=?, categoria=?, descricao=?, data_solicitacao=?, solicitante=?, status=?, prioridade=?, quantidade=? WHERE id=?',
    [titulo, categoria, descricao || null, data_solicitacao || null, solicitante || null, status || 'pendente', prioridade || 'normal', quantidade || null, id]
  );
  res.json({ id: Number(id), titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await ensureSolicitacoesSchema(pool);
  const { id } = req.params; await pool.execute('DELETE FROM solicitacoes WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
