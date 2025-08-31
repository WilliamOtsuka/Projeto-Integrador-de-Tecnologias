const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM solicitacoes ORDER BY id DESC');
  res.json(rows);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { titulo, categoria, descricao } = req.body;
  const [r] = await pool.execute('INSERT INTO solicitacoes (titulo, categoria, descricao) VALUES (?,?,?)', [titulo, categoria, descricao || null]);
  res.status(201).json({ id: r.insertId, titulo, categoria, descricao });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; const { titulo, categoria, descricao } = req.body;
  await pool.execute('UPDATE solicitacoes SET titulo=?, categoria=?, descricao=? WHERE id=?', [titulo, categoria, descricao || null, id]);
  res.json({ id: Number(id), titulo, categoria, descricao });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM solicitacoes WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
