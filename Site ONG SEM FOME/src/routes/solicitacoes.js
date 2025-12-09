const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'InputError';
    this.status = status;
  }
}

const parseId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

async function fetchSolicitacaoById(id) {
  const [rows] = await pool.query(
    `SELECT s.id_solicitacao AS id,
            s.titulo,
            s.descricao,
            s.data_solicitacao,
            s.status,
            s.prioridade,
            s.quantidade,
            s.unidade,
            s.atualizacao,
            s.categoria_id,
            c.nome AS categoria_nome,
            c.tipo AS categoria_tipo,
            s.item_id,
            ci.nome_item AS item_nome,
            s.solicitante_id,
            col.nome AS solicitante_nome
       FROM solicitacoes s
  LEFT JOIN categorias c ON c.id_categoria = s.categoria_id
  LEFT JOIN categorias_itens ci ON ci.id_item = s.item_id
  LEFT JOIN colaboradores col ON col.id_colaborador = s.solicitante_id
      WHERE s.id_solicitacao = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function resolveCategoriaEItem(categoriaId, itemId) {
  const [[categoria]] = await pool.query('SELECT id_categoria, tipo FROM categorias WHERE id_categoria=? LIMIT 1', [categoriaId]);
  if (!categoria) throw new InputError('Categoria inválida');
  const tipo = String(categoria.tipo || '').toLowerCase();
  if (tipo === 'composta') {
    if (!itemId) throw new InputError('Item obrigatório para categorias compostas');
    const [[item]] = await pool.query('SELECT id_item, categoria_id FROM categorias_itens WHERE id_item=? LIMIT 1', [itemId]);
    if (!item || Number(item.categoria_id) !== Number(categoriaId)) {
      throw new InputError('Item informado não pertence à categoria selecionada');
    }
    return { categoriaId: Number(categoriaId), itemId: Number(itemId) };
  }
  return { categoriaId: Number(categoriaId), itemId: null };
}

async function resolveSolicitanteId(solicitanteId) {
  if (solicitanteId === null) return null;
  const [[colaborador]] = await pool.query('SELECT id_colaborador FROM colaboradores WHERE id_colaborador=? LIMIT 1', [solicitanteId]);
  if (!colaborador) throw new InputError('Colaborador solicitante inválido');
  return Number(solicitanteId);
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    `SELECT s.id_solicitacao AS id,
            s.titulo,
            s.descricao,
            s.data_solicitacao,
            s.status,
            s.prioridade,
            s.quantidade,
            s.unidade,
            s.atualizacao,
            s.categoria_id,
            c.nome AS categoria_nome,
            c.tipo AS categoria_tipo,
            s.item_id,
            ci.nome_item AS item_nome,
            s.solicitante_id,
            col.nome AS solicitante_nome
       FROM solicitacoes s
  LEFT JOIN categorias c ON c.id_categoria = s.categoria_id
  LEFT JOIN categorias_itens ci ON ci.id_item = s.item_id
  LEFT JOIN colaboradores col ON col.id_colaborador = s.solicitante_id
      ORDER BY s.id_solicitacao DESC
      LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM solicitacoes');
  res.json({ data: rows, total: Number(cnt.total || 0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { titulo, categoria_id, item_id, descricao, data_solicitacao, solicitante_id, status, prioridade, quantidade, unidade } = req.body || {};
  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }
  const categoriaId = parseId(categoria_id);
  if (!categoriaId) {
    return res.status(400).json({ error: 'Categoria inválida' });
  }
  const itemId = parseId(item_id);
  const solicitanteId = parseId(solicitante_id);

  try {
    const { categoriaId: resolvedCategoriaId, itemId: resolvedItemId } = await resolveCategoriaEItem(categoriaId, itemId);
    const solicitante = await resolveSolicitanteId(solicitanteId);
    const ds = data_solicitacao || null;
    const st = status || 'pendente';
    const pr = prioridade || 'normal';
    const q = (quantidade === 0 || quantidade) ? Number(quantidade) : null;
    const un = unidade || null;
    const [r] = await pool.execute(
      `INSERT INTO solicitacoes (titulo, categoria_id, item_id, descricao, data_solicitacao, solicitante_id, status, prioridade, quantidade, unidade)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [titulo, resolvedCategoriaId, resolvedItemId, descricao || null, ds, solicitante, st, pr, q, un]
    );
    const created = await fetchSolicitacaoById(r.insertId);
    res.status(201).json(created || { id: r.insertId });
  } catch (err) {
    if (err instanceof InputError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { titulo, categoria_id, item_id, descricao, data_solicitacao, solicitante_id, status, prioridade, quantidade, unidade } = req.body || {};
  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }
  const categoriaId = parseId(categoria_id);
  if (!categoriaId) {
    return res.status(400).json({ error: 'Categoria inválida' });
  }
  const itemId = parseId(item_id);
  const solicitanteId = parseId(solicitante_id);

  try {
    const { categoriaId: resolvedCategoriaId, itemId: resolvedItemId } = await resolveCategoriaEItem(categoriaId, itemId);
    const solicitante = await resolveSolicitanteId(solicitanteId);
    const ds = data_solicitacao || null;
    const st = status || 'pendente';
    const pr = prioridade || 'normal';
    const q = (quantidade === 0 || quantidade) ? Number(quantidade) : null;
    const un = unidade || null;
    await pool.execute(
      `UPDATE solicitacoes
          SET titulo=?,
              categoria_id=?,
              item_id=?,
              descricao=?,
              data_solicitacao=?,
              solicitante_id=?,
              status=?,
              prioridade=?,
              quantidade=?,
              unidade=?
        WHERE id_solicitacao=?`,
      [titulo, resolvedCategoriaId, resolvedItemId, descricao || null, ds, solicitante, st, pr, q, un, id]
    );
    const updated = await fetchSolicitacaoById(id);
    res.json(updated || { id: Number(id) });
  } catch (err) {
    if (err instanceof InputError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM solicitacoes WHERE id_solicitacao=?', [id]);
  res.status(204).end();
}));

module.exports = router;
