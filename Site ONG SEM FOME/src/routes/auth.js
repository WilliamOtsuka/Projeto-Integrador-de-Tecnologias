const express = require('express');
const router = express.Router();

// Login simples (somente demonstração)
router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (username === 'admin' && password === '123') {
        req.session.user = { name: username };
        return res.json({ ok: true, user: req.session.user });
    }
    return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
    if (req.session && req.session.user) return res.json({ authenticated: true, user: req.session.user });
    return res.status(401).json({ authenticated: false });
});

module.exports = router;
