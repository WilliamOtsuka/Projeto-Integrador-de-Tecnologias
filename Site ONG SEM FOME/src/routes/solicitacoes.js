const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query('SELECT id_solicitacao AS id, titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade, unidade, atualizacao FROM solicitacoes ORDER BY id_solicitacao DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM solicitacoes');
  res.json({ data: rows, total: Number(cnt.total||0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade, unidade } = req.body || {};
  const ds = data_solicitacao || null;
  const sol = solicitante || null;
  const st = status || 'pendente';
  const pr = prioridade || 'normal';
  const q = (quantidade === 0 || quantidade) ? Number(quantidade) : null;
  const un = unidade || null;
  const [r] = await pool.execute(
    'INSERT INTO solicitacoes (titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade, unidade) VALUES (?,?,?,?,?,?,?,?,?)',
    [titulo, categoria, descricao || null, ds, sol, st, pr, q, un]
  );
  res.status(201).json({ id: r.insertId, titulo, categoria, descricao, data_solicitacao: ds, solicitante: sol, status: st, prioridade: pr, quantidade: q, unidade: un });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; 
  const { titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade, unidade } = req.body || {};
  const ds = data_solicitacao || null;
  const sol = solicitante || null;
  const st = status || 'pendente';
  const pr = prioridade || 'normal';
  const q = (quantidade === 0 || quantidade) ? Number(quantidade) : null;
  const un = unidade || null;
  await pool.execute(
    'UPDATE solicitacoes SET titulo=?, categoria=?, descricao=?, data_solicitacao=?, solicitante=?, status=?, prioridade=?, quantidade=?, unidade=? WHERE id_solicitacao=?',
    [titulo, categoria, descricao || null, ds, sol, st, pr, q, un, id]
  );
  res.json({ id: Number(id), titulo, categoria, descricao, data_solicitacao: ds, solicitante: sol, status: st, prioridade: pr, quantidade: q, unidade: un });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM solicitacoes WHERE id_solicitacao=?', [id]);
  res.status(204).end();
}));

module.exports = router;
