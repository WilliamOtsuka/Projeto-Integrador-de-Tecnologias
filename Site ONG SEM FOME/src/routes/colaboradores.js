const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query('SELECT * FROM colaboradores ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM colaboradores');
  res.json({ data: rows, total: Number(cnt.total||0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { nome, email, telefone, cargo } = req.body;
  const [r] = await pool.execute('INSERT INTO colaboradores (nome, email, telefone, cargo) VALUES (?,?,?,?)', [nome, email, telefone, cargo]);
  res.status(201).json({ id: r.insertId, nome, email, telefone, cargo });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; const { nome, email, telefone, cargo } = req.body;
  await pool.execute('UPDATE colaboradores SET nome=?, email=?, telefone=?, cargo=? WHERE id=?', [nome, email, telefone, cargo, id]);
  res.json({ id: Number(id), nome, email, telefone, cargo });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM colaboradores WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
