const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM familias ORDER BY id DESC');
  res.json(rows);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { nome, responsavel, contato, cep, logradouro, numero, complemento, bairro, cidade, uf } = req.body;
  const [r] = await pool.execute('INSERT INTO familias (nome, responsavel, contato, cep, logradouro, numero, complemento, bairro, cidade, uf) VALUES (?,?,?,?,?,?,?,?,?,?)', [nome, responsavel, contato, cep, logradouro, numero, complemento || null, bairro, cidade, uf]);
  res.status(201).json({ id: r.insertId, nome, responsavel, contato, cep, logradouro, numero, complemento, bairro, cidade, uf });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; const { nome, responsavel, contato, cep, logradouro, numero, complemento, bairro, cidade, uf } = req.body;
  await pool.execute('UPDATE familias SET nome=?, responsavel=?, contato=?, cep=?, logradouro=?, numero=?, complemento=?, bairro=?, cidade=?, uf=? WHERE id=?', [nome, responsavel, contato, cep, logradouro, numero, complemento || null, bairro, cidade, uf, id]);
  res.json({ id: Number(id), nome, responsavel, contato, cep, logradouro, numero, complemento, bairro, cidade, uf });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; await pool.execute('DELETE FROM familias WHERE id=?', [id]);
  res.status(204).end();
}));

module.exports = router;
