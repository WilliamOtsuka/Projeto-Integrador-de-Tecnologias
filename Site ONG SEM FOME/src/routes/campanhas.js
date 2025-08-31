const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM campanhas ORDER BY id DESC');
  res.json(rows);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { nome, meta, descricao } = req.body;
  const [r] = await pool.execute('INSERT INTO campanhas (nome, meta, descricao) VALUES (?,?,?)', [nome, meta, descricao || null]);
  res.status(201).json({ id: r.insertId, nome, meta, descricao });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; const { nome, meta, descricao } = req.body;
  await pool.execute('UPDATE campanhas SET nome=?, meta=?, descricao=? WHERE id=?', [nome, meta, descricao || null, id]);
  res.json({ id: Number(id), nome, meta, descricao });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM campanhas WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
