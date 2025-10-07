const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query('SELECT * FROM entradas ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM entradas');
  res.json({ data: rows, total: Number(cnt.total||0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { data, doador, categoria, quantidade, unidade, campanha, obs, tipo, fornecedor, forma_pagamento, solicitacao_id } = req.body;
  const t = (tipo === 'compra') ? 'compra' : 'doacao';
  const [r] = await pool.execute(
    'INSERT INTO entradas (data, doador, categoria, quantidade, unidade, campanha, obs, tipo, fornecedor, forma_pagamento, solicitacao_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [data, doador, categoria, quantidade, unidade, campanha || null, obs || null, t, fornecedor || null, forma_pagamento || null, solicitacao_id || null]
  );
  if (solicitacao_id) {
    try {
      await pool.execute('UPDATE solicitacoes SET status=? WHERE id=?', ['atendida', solicitacao_id]);
    } catch (e) {
      // loga mas não bloqueia a criação da entrada
      // eslint-disable-next-line no-console
      console.error('Falha ao atualizar status da solicitação', e.message);
    }
  }
  res.status(201).json({ id: r.insertId, data, doador, categoria, quantidade, unidade, campanha, obs, tipo: t, fornecedor, forma_pagamento, solicitacao_id });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, doador, categoria, quantidade, unidade, campanha, obs, tipo, fornecedor, forma_pagamento, solicitacao_id } = req.body;
  const t = (tipo === 'compra') ? 'compra' : 'doacao';
  await pool.execute(
    'UPDATE entradas SET data=?, doador=?, categoria=?, quantidade=?, unidade=?, campanha=?, obs=?, tipo=?, fornecedor=?, forma_pagamento=?, solicitacao_id=? WHERE id=?',
    [data, doador, categoria, quantidade, unidade, campanha || null, obs || null, t, fornecedor || null, forma_pagamento || null, solicitacao_id || null, id]
  );
  if (solicitacao_id) {
    try {
      await pool.execute('UPDATE solicitacoes SET status=? WHERE id=?', ['atendida', solicitacao_id]);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Falha ao atualizar status da solicitação', e.message);
    }
  }
  res.json({ id: Number(id), data, doador, categoria, quantidade, unidade, campanha, obs, tipo: t, fornecedor, forma_pagamento, solicitacao_id });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM entradas WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
