const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

// Atualiza o status da solicitação conforme o total de entradas vinculadas
async function recomputeSolicitacaoStatus(solicitacaoId) {
  if (!solicitacaoId) return;
  // Busca quantidade solicitada
  const [[s]] = await pool.query('SELECT quantidade, status FROM solicitacoes WHERE id_solicitacao=?', [solicitacaoId]);
  if (!s) return;
  const reqQtd = Number(s.quantidade || 0);
  // Soma das entradas vinculadas
  const [[tot]] = await pool.query('SELECT COALESCE(SUM(quantidade), 0) AS total FROM entradas WHERE solicitacao_id=?', [solicitacaoId]);
  const recebido = Number(tot.total || 0);
  let novoStatus;
  if (reqQtd > 0 && recebido >= reqQtd) novoStatus = 'atendido';
  else if (recebido > 0) novoStatus = 'em compra';
  else novoStatus = 'aprovado';
  await pool.execute('UPDATE solicitacoes SET status=? WHERE id_solicitacao=?', [novoStatus, solicitacaoId]);
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query('SELECT * FROM entradas ORDER BY id_entrada DESC LIMIT ? OFFSET ?', [limit, offset]);
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
    try { await recomputeSolicitacaoStatus(solicitacao_id); }
    catch (e) { console.error('Falha ao recalcular status da solicitação', e.message); }
  }
  res.status(201).json({ id: r.insertId, data, doador, categoria, quantidade, unidade, campanha, obs, tipo: t, fornecedor, forma_pagamento, solicitacao_id });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, doador, categoria, quantidade, unidade, campanha, obs, tipo, fornecedor, forma_pagamento, solicitacao_id } = req.body;
  const t = (tipo === 'compra') ? 'compra' : 'doacao';
  // Captura o vínculo anterior (se houver) para recomputar depois
  const [[oldRow]] = await pool.query('SELECT solicitacao_id FROM entradas WHERE id_entrada=?', [id]);
  await pool.execute(
  'UPDATE entradas SET data=?, doador=?, categoria=?, quantidade=?, unidade=?, campanha=?, obs=?, tipo=?, fornecedor=?, forma_pagamento=?, solicitacao_id=? WHERE id_entrada=?',
  [data, doador, categoria, quantidade, unidade, campanha || null, obs || null, t, fornecedor || null, forma_pagamento || null, solicitacao_id || null, id]
  );
  // Recalcula status para o antigo vínculo (se mudou) e para o novo
  try {
    const oldId = oldRow && oldRow.solicitacao_id ? Number(oldRow.solicitacao_id) : null;
    if (oldId && (!solicitacao_id || Number(solicitacao_id) !== oldId)) {
      await recomputeSolicitacaoStatus(oldId);
    }
    if (solicitacao_id) await recomputeSolicitacaoStatus(Number(solicitacao_id));
  } catch (e) {
    console.error('Falha ao recalcular status da solicitação (PUT)', e.message);
  }
  res.json({ id: Number(id), data, doador, categoria, quantidade, unidade, campanha, obs, tipo: t, fornecedor, forma_pagamento, solicitacao_id });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Captura o vínculo antes de deletar
  const [[row]] = await pool.query('SELECT solicitacao_id FROM entradas WHERE id_entrada=?', [id]);
  await pool.execute('DELETE FROM entradas WHERE id_entrada=?', [id]);
  // Recalcula status da solicitação vinculada (se houver)
  const sId = row && row.solicitacao_id ? Number(row.solicitacao_id) : null;
  if (sId) {
    try { await recomputeSolicitacaoStatus(sId); }
    catch (e) { console.error('Falha ao recalcular status da solicitação (DELETE)', e.message); }
  }
  res.status(204).end();
}));

module.exports = router;
