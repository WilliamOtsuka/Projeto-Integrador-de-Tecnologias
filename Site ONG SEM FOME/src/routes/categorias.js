const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query('SELECT * FROM categorias ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM categorias');
  res.json({ data: rows, total: Number(cnt.total||0), page, limit });
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
