const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query('SELECT id_categoria AS id, nome, tipo FROM categorias ORDER BY id_categoria DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM categorias');
  res.json({ data: rows, total: Number(cnt.total||0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { nome, tipo } = req.body;
  const t = (String(tipo || 'simples').toLowerCase() === 'composta') ? 'composta' : 'simples';
  const [r] = await pool.execute('INSERT INTO categorias (nome, tipo) VALUES (?, ?)', [nome, t]);
  res.status(201).json({ id: r.insertId, nome, tipo: t });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; const { nome, tipo } = req.body;
  const t = (String(tipo || 'simples').toLowerCase() === 'composta') ? 'composta' : 'simples';
  await pool.execute('UPDATE categorias SET nome=?, tipo=? WHERE id_categoria=?', [nome, t, id]);
  res.json({ id: Number(id), nome, tipo: t });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM categorias WHERE id_categoria=?', [id]);
  res.status(204).end();
}));

module.exports = router;
// Subitens de categoria composta
router.get('/:id/itens', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT id_item AS id, nome_item AS nome FROM categorias_itens WHERE categoria_id = ? ORDER BY nome_item', [id]);
  res.json(rows);
}));

router.post('/:id/itens', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;
  const [r] = await pool.execute('INSERT INTO categorias_itens (categoria_id, nome_item) VALUES (?, ?)', [id, nome]);
  res.status(201).json({ id: r.insertId, nome });
}));

router.delete('/:id/itens/:itemId', requireAuth, asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  await pool.execute('DELETE FROM categorias_itens WHERE id_item = ? AND categoria_id = ?', [itemId, id]);
  res.status(204).end();
}));
