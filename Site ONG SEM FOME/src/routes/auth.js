const pool = require('../config/db.js')
const express = require('express');
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
