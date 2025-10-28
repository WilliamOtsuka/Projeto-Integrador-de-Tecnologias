const pool = require('../config/db.js')
const express = require('express');
const crypto = require('crypto');
const { asyncHandler } = require('../middleware/auth');
const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
    //login colaborador ou admin 
    const { email, senha } = req.body;
    const [colab] = await pool.query(
        'SELECT id_colaborador, nome FROM colaboradores WHERE email = ?', [email]);

    if (colab.length) {
        const colaborador = colab[0];
        const [userRows] = await pool.query(
        `SELECT u.id_usuario as usuario_id, u.tipo, l.senha
           FROM usuarios u
           JOIN logins l ON l.id_usuario = u.id_usuario
        WHERE u.id_colaborador = ?`, [colaborador.id_colaborador]);

        const user = userRows[0];
        if (!user || user.senha !== senha)
            return res.status(401).json({ message: 'Usuário ou senha incorretos' });
        req.session.user = {
            id: user.usuario_id,
            nome: colaborador.nome,
            tipo: user.tipo,
        };
        return res.json({ message: 'Login bem-sucedido' });
    }
    //login doador
    const [doadorRows] = await pool.query(
        `SELECT u.id_usuario as usuario_id, u.tipo, l.senha, d.nome
   FROM usuarios u
   JOIN doadores d ON u.id_colaborador = d.id_doador
   JOIN logins l ON l.id_usuario = u.id_usuario
   WHERE d.email = ?`, [email]);

    if (doadorRows.length) {
        const doador = doadorRows[0];
        if (!doador || doador.senha !== senha)
            return res.status(401).json({ message: 'Usuário ou senha incorretos' });

        req.session.user = {
            id: doador.usuario_id,
            nome: doador.nome,
            tipo: 'doador',
        };
        return res.json({ message: 'Login bem-sucedido' });
    }
    return res.status(401).json({ message: 'Usuário não encontrado' });
}));

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
    if (req.session && req.session.user) return res.json({ authenticated: true, user: req.session.user });
    return res.status(401).json({ authenticated: false });
});

module.exports = router;
 
// ---------------- Password recovery ----------------
// POST /api/password/forgot { email }
router.post('/password/forgot', asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Informe o e-mail' });
    // Encontrar usuário por colaborador ou doador, aproveitando mesma lógica do login
    let usuarioId = null;
    let nome = null;
    {
        const [colab] = await pool.query('SELECT id_colaborador, nome FROM colaboradores WHERE email = ?', [email]);
        if (colab.length) {
            const [rows] = await pool.query(
                `SELECT u.id_usuario as usuario_id FROM usuarios u WHERE u.id_colaborador = ?`,
                [colab[0].id_colaborador]
            );
            if (rows.length) { usuarioId = rows[0].usuario_id; nome = colab[0].nome; }
        }
    }
    if (!usuarioId) {
        const [doadorRows] = await pool.query(
            `SELECT u.id_usuario as usuario_id, d.nome
                 FROM usuarios u
                 JOIN doadores d ON u.id_colaborador = d.id_doador
                WHERE d.email = ?`, [email]);
        if (doadorRows.length) { usuarioId = doadorRows[0].usuario_id; nome = doadorRows[0].nome; }
    }
    // Resposta idempotente
    if (!usuarioId) return res.json({ ok: true, message: 'Se o e-mail existir, enviaremos instruções' });
    // Gera token e armazena com expiração (1h)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
        `INSERT INTO password_resets (id_usuario, token, expires_at) VALUES (?, ?, ?)`,
        [usuarioId, token, expires]
    );
    // Aqui poderíamos enviar e-mail; por ora, retornamos a indicação de sucesso e, em dev, o token
    const isProd = process.env.NODE_ENV === 'production';
    return res.json({ ok: true, message: 'Se o e-mail existir, enviaremos instruções', token: isProd ? undefined : token, hint: isProd ? undefined : 'Use o token na página de redefinição' });
}));

// GET /api/password/validate?token=...
router.get('/password/validate', asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ ok: false, error: 'Token ausente' });
    const [rows] = await pool.query(
        `SELECT pr.id, pr.id_usuario, pr.expires_at, pr.used_at
             FROM password_resets pr
            WHERE pr.token = ?`, [token]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Token inválido' });
    const pr = rows[0];
    if (pr.used_at) return res.status(400).json({ ok: false, error: 'Token já utilizado' });
    if (new Date(pr.expires_at) < new Date()) return res.status(400).json({ ok: false, error: 'Token expirado' });
    return res.json({ ok: true });
}));

// POST /api/password/reset { token, senha }
router.post('/password/reset', asyncHandler(async (req, res) => {
    const { token, senha } = req.body || {};
    if (!token || !senha) return res.status(400).json({ error: 'Dados inválidos' });
    const [rows] = await pool.query(
        `SELECT pr.id, pr.id_usuario, pr.expires_at, pr.used_at
             FROM password_resets pr
            WHERE pr.token = ?`, [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Token inválido' });
    const pr = rows[0];
    if (pr.used_at) return res.status(400).json({ error: 'Token já utilizado' });
    if (new Date(pr.expires_at) < new Date()) return res.status(400).json({ error: 'Token expirado' });
    // Atualiza senha (observação: projeto usa senha em texto plano; ideal migrar para hash futuramente)
    await pool.query(
        `UPDATE logins SET senha = ? WHERE id_usuario = ?`,
        [String(senha), pr.id_usuario]
    );
    await pool.query(`UPDATE password_resets SET used_at = NOW() WHERE id = ?`, [pr.id]);
    return res.json({ ok: true, message: 'Senha redefinida com sucesso' });
}));
