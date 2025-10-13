const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = (page - 1) * limit;
  // Inclui a senha (se existir) por meio de LEFT JOIN com usuarios/logins
  const [rows] = await pool.query(
    `SELECT c.id_colaborador AS id,
            c.nome,
            c.email,
            c.telefone,
            c.cargo,
            (
              SELECT l.senha
                FROM usuarios u2
                JOIN logins l ON l.id_usuario = u2.id_usuario
               WHERE u2.id_colaborador = c.id_colaborador
               ORDER BY l.id_login DESC
               LIMIT 1
            ) AS senha
       FROM colaboradores c
      ORDER BY c.id_colaborador DESC
      LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS total FROM colaboradores');
  res.json({ data: rows, total: Number(cnt.total || 0), page, limit });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { nome, email, telefone, cargo, senha } = req.body;

  if (!senha || String(senha).trim().length < 4) {
    return res.status(400).json({ error: 'Senha obrigatória (mín. 4 caracteres)' });
  }

  const [existente] = await pool.query(
    'SELECT id_colaborador AS id FROM colaboradores WHERE email = ?',
    [email])
  if (existente.length > 0) {
    return res.status(400).json({ error: 'E-mail já cadastrado' });
  }
  const [r] = await pool.execute('INSERT INTO colaboradores (nome, email, telefone, cargo) VALUES (?,?,?,?)', [nome, email, telefone, cargo]);
  const colaboradorId = r.insertId;

  // Cria usuário e login obrigatoriamente
  const [u] = await pool.execute(
    'INSERT INTO usuarios (id_colaborador, tipo) VALUES (?,?)',
    [colaboradorId, 'colaborador']
  );
  const usuarioId = u.insertId;
  await pool.execute(
    'INSERT INTO logins (id_usuario, senha) VALUES (?,?)',
    [usuarioId, senha]
  );
  res.status(201).json({ id: r.insertId, nome, email, telefone, cargo })
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params; const { nome, email, telefone, cargo, senha } = req.body;
  if (!senha || String(senha).trim().length < 4) {
    return res.status(400).json({ error: 'Senha obrigatória (mín. 4 caracteres)' });
  }
  //verifica se email ja esta cadastrado
  const [existente] = await pool.query(
    'SELECT id_colaborador AS id FROM colaboradores WHERE email = ? and id_colaborador != ?',
    [email, id])
  if (existente.length > 0) {
    return res.status(400).json({ error: 'E-mail já cadastrado' });
  }
  await pool.execute('UPDATE colaboradores SET nome=?, email=?, telefone=?, cargo=? WHERE id_colaborador=?', [nome, email, telefone, cargo, id]);

  const [usuarios] = await pool.query('SELECT id_usuario AS id FROM usuarios WHERE id_colaborador = ?', [id]);
  if (usuarios.length > 0) {
    // Atualiza senha
    await pool.execute('UPDATE logins SET senha=? WHERE id_usuario=?', [senha, usuarios[0].id]);
  } else {
    // Cria usuário e login caso ainda não exista
    const [u] = await pool.execute('INSERT INTO usuarios (id_colaborador, tipo) VALUES (?,?)', [id, 'colaborador']);
    const usuarioId = u.insertId;
    await pool.execute('INSERT INTO logins (id_usuario, senha) VALUES (?,?)', [usuarioId, senha]);
  }
  res.json({ id: Number(id), nome, email, telefone, cargo });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [usuarios] = await pool.query('SELECT id_usuario AS id FROM usuarios WHERE id_colaborador = ?', [id]);

  if (usuarios.length > 0) {
    const usuarioId = usuarios[0].id;
    // Exclui o login e usuario
    await pool.execute('DELETE FROM logins WHERE id_usuario = ?', [usuarioId]);
    await pool.execute('DELETE FROM usuarios WHERE id_usuario = ?', [usuarioId]);
  }
  //Exclui o colaborador
  await pool.execute('DELETE FROM colaboradores WHERE id_colaborador = ?', [id]);

  res.status(204).end();
}));

module.exports = router;
