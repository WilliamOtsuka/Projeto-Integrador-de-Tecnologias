const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, asyncHandler } = require('../middleware/auth');

router.get('/saldo-cestas', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT COALESCE(SUM(quantidade),0) AS saldo FROM entradas WHERE TRIM(categoria) COLLATE utf8mb4_unicode_ci = 'Cesta Básica'"
  );
  const saldo = Number(rows?.[0]?.saldo || 0);
  res.json({ saldo });
}));

module.exports = router;
