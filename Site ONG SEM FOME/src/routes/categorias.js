const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM categorias ORDER BY id DESC');
  res.json(rows);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { nome } = req.body;
  const [r] = await pool.execute('INSERT INTO categorias (nome) VALUES (?)', [nome]);
  res.status(201).json({ id: r.insertId, nome });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; const { nome } = req.body;
  await pool.execute('UPDATE categorias SET nome=? WHERE id=?', [nome, id]);
  res.json({ id: Number(id), nome });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM categorias WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
