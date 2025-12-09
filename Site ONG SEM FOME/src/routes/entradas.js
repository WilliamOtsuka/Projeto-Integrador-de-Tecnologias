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
  const [rows] = await pool.query(
    `SELECT e.id_entrada, e.data, e.doador, e.doador_id, e.categoria, e.quantidade, e.unidade,
            c.nome AS campanha, e.obs, e.tipo, e.fornecedor, e.forma_pagamento,
            e.solicitacao_id, e.campanha_id, d.nome AS doador_nome
       FROM entradas e
  LEFT JOIN campanhas c ON c.id_campanha = e.campanha_id
  LEFT JOIN doadores d ON d.id_doador = e.doador_id
   ORDER BY e.id_entrada DESC
      LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM entradas');
  res.json({ data: rows, total: Number(cnt.total||0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { data, doador, doador_id, categoria, quantidade, unidade, campanha_id, obs, tipo, fornecedor, forma_pagamento, solicitacao_id } = req.body;
  const campanhaId = campanha_id === undefined || campanha_id === null || campanha_id === ''
    ? null
    : Number(campanha_id);
  if (campanhaId !== null && (!Number.isInteger(campanhaId) || campanhaId <= 0)) {
    return res.status(400).json({ error: 'campanha_id inválido' });
  }
  const t = (tipo === 'compra') ? 'compra' : (tipo === 'saida' ? 'saida' : 'doacao');
  const rawDoadorId = doador_id ?? req.body?.doadorId ?? null;
  const doadorId = rawDoadorId === '' || rawDoadorId === null || rawDoadorId === undefined ? null : Number(rawDoadorId);
  if (doadorId !== null && (!Number.isInteger(doadorId) || doadorId <= 0)) {
    return res.status(400).json({ error: 'doador_id inválido' });
  }

  let doadorNome = null;
  if (doadorId) {
    const [[dRow]] = await pool.query('SELECT id_doador, nome FROM doadores WHERE id_doador=?', [doadorId]);
    if (!dRow) {
      return res.status(404).json({ error: 'Doador não encontrado' });
    }
    doadorNome = dRow.nome;
  }
  if (t === 'doacao' && !doadorNome) {
    return res.status(400).json({ error: 'doador_id é obrigatório para doações' });
  }
  const doadorTexto = doadorNome || doador || fornecedor || (t === 'saida' ? 'RETIRADA' : 'N/A');
  const [r] = await pool.execute(
    'INSERT INTO entradas (data, doador, doador_id, categoria, quantidade, unidade, campanha_id, obs, tipo, fornecedor, forma_pagamento, solicitacao_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [data, doadorTexto, doadorId, categoria, quantidade, unidade, campanhaId, obs || null, t, fornecedor || null, forma_pagamento || null, solicitacao_id || null]
  );
  if (solicitacao_id) {
    try { await recomputeSolicitacaoStatus(solicitacao_id); }
    catch (e) { console.error('Falha ao recalcular status da solicitação', e.message); }
  }
  res.status(201).json({ id_entrada: r.insertId, data, doador: doadorTexto, doador_id: doadorId, categoria, quantidade, unidade, campanha_id: campanhaId, obs, tipo: t, fornecedor, forma_pagamento, solicitacao_id });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, doador, doador_id, categoria, quantidade, unidade, campanha_id, obs, tipo, fornecedor, forma_pagamento, solicitacao_id } = req.body;
  const campanhaId = campanha_id === undefined || campanha_id === null || campanha_id === ''
    ? null
    : Number(campanha_id);
  if (campanhaId !== null && (!Number.isInteger(campanhaId) || campanhaId <= 0)) {
    return res.status(400).json({ error: 'campanha_id inválido' });
  }
  const t = (tipo === 'compra') ? 'compra' : (tipo === 'saida' ? 'saida' : 'doacao');
  const rawDoadorId = doador_id ?? req.body?.doadorId ?? null;
  const doadorId = rawDoadorId === '' || rawDoadorId === null || rawDoadorId === undefined ? null : Number(rawDoadorId);
  if (doadorId !== null && (!Number.isInteger(doadorId) || doadorId <= 0)) {
    return res.status(400).json({ error: 'doador_id inválido' });
  }
  let doadorNome = null;
  if (doadorId) {
    const [[dRow]] = await pool.query('SELECT id_doador, nome FROM doadores WHERE id_doador=?', [doadorId]);
    if (!dRow) {
      return res.status(404).json({ error: 'Doador não encontrado' });
    }
    doadorNome = dRow.nome;
  }
  if (t === 'doacao' && !doadorNome) {
    return res.status(400).json({ error: 'doador_id é obrigatório para doações' });
  }
  const doadorTexto = doadorNome || doador || fornecedor || (t === 'saida' ? 'RETIRADA' : 'N/A');
  // Captura o vínculo anterior (se houver) para recomputar depois
  const [[oldRow]] = await pool.query('SELECT solicitacao_id FROM entradas WHERE id_entrada=?', [id]);
  await pool.execute(
  'UPDATE entradas SET data=?, doador=?, doador_id=?, categoria=?, quantidade=?, unidade=?, campanha_id=?, obs=?, tipo=?, fornecedor=?, forma_pagamento=?, solicitacao_id=? WHERE id_entrada=?',
  [data, doadorTexto, doadorId, categoria, quantidade, unidade, campanhaId, obs || null, t, fornecedor || null, forma_pagamento || null, solicitacao_id || null, id]
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
  res.json({ id_entrada: Number(id), data, doador: doadorTexto, doador_id: doadorId, categoria, quantidade, unidade, campanha_id: campanhaId, obs, tipo: t, fornecedor, forma_pagamento, solicitacao_id });
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
