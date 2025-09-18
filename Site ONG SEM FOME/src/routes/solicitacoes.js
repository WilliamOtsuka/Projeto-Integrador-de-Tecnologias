const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query('SELECT * FROM solicitacoes ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM solicitacoes');
  res.json({ data: rows, total: Number(cnt.total||0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
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
  const { id } = req.params; 
  const { titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade } = req.body || {};
  await pool.execute(
    'UPDATE solicitacoes SET titulo=?, categoria=?, descricao=?, data_solicitacao=?, solicitante=?, status=?, prioridade=?, quantidade=? WHERE id=?',
    [titulo, categoria, descricao || null, data_solicitacao || null, solicitante || null, status || 'pendente', prioridade || 'normal', quantidade || null, id]
  );
  res.json({ id: Number(id), titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM solicitacoes WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
