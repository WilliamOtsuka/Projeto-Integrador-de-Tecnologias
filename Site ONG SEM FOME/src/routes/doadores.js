const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM doadores ORDER BY id DESC');
  res.json(rows);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { nome, email, telefone, documento } = req.body;
  const [r] = await pool.execute('INSERT INTO doadores (nome, email, telefone, documento) VALUES (?,?,?,?)', [nome, email, telefone, documento]);
  res.status(201).json({ id: r.insertId, nome, email, telefone, documento });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; const { nome, email, telefone, documento } = req.body;
  await pool.execute('UPDATE doadores SET nome=?, email=?, telefone=?, documento=? WHERE id=?', [nome, email, telefone, documento, id]);
  res.json({ id: Number(id), nome, email, telefone, documento });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM doadores WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
