const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const { asyncHandler } = require('../middleware/auth')

router.post('/', asyncHandler(async (req, res) => {
  const { nome, email, telefone, documento, senha } = req.body

  const [[existente]] = await pool.query(
    'SELECT id_doador AS id FROM doadores WHERE documento = ?', [documento])

  if (existente) {
    return res.status(400).json({ error: 'Documento já cadastrado' })
  }
const [emailExist] = await pool.query(
  'SELECT id_doador AS id FROM doadores WHERE email = ?',
  [email])
  if (emailExist.length > 0) {
    return res.status(400).json({ error: 'E-mail já cadastrado' });
  }
  const [r] = await pool.execute(
    'INSERT INTO doadores (nome, email, telefone, documento) VALUES (?,?,?,?)',
    [nome, email, telefone, documento])
  const doadorId = r.insertId;

  if (senha) {
    const [u] = await pool.execute(
      'INSERT INTO usuarios (id_colaborador, tipo) VALUES (?, ?)', [doadorId, 'doador'])
    const usuarioId = u.insertId

    await pool.execute(
      'INSERT INTO logins (id_usuario, senha) VALUES (?, ?)', [usuarioId, senha])
  }

  res.status(201).json({ id: doadorId, nome, email, telefone, documento })
}))

module.exports = router
