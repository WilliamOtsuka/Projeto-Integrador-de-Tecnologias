const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

// GET /api/doacoes - listar doações (opcional)
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM doacoes ORDER BY id DESC');
  res.json(rows);
}));

// POST /api/doacoes - registrar uma nova doação
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { nome_doador, valor, campanha_id } = req.body;

  if (!nome_doador || !valor || !campanha_id) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }

  const [r] = await pool.execute(
    'INSERT INTO doacoes (nome_doador, valor, campanha_id) VALUES (?, ?, ?)',
    [nome_doador, valor, campanha_id]
  );

  res.status(201).json({ id: r.insertId, nome_doador, valor, campanha_id });
}));

module.exports = router;
