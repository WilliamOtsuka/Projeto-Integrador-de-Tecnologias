// Middleware de autenticação de sessão
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'Não autenticado' });
}

// Wrapper para lidar com erros async em rotas
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { requireAuth, asyncHandler };
