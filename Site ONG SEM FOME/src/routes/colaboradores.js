const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM colaboradores ORDER BY id DESC');
  res.json(rows);
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
