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

router.post('/baixas', requireAuth, asyncHandler(async (req, res) => {
  const {
    data,
    categoria,
    unidade,
    quantidade,
    motivo,
    tipo_saida,
    destinatario,
    responsavel,
    obs,
  } = req.body || {};

  const qtd = Number(quantidade || 0);
  const categoriaNome = (categoria || '').trim();
  const unidadeNome = (unidade || '').trim().toLowerCase();
  if (!data || !categoriaNome || !unidadeNome || !Number.isFinite(qtd) || qtd <= 0) {
    return res.status(400).json({ error: 'Dados inválidos para baixa de estoque' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[saldoRow]] = await conn.execute(
      `SELECT COALESCE(SUM(quantidade),0) AS saldo
         FROM entradas
        WHERE TRIM(LOWER(categoria)) = TRIM(LOWER(?))
          AND TRIM(LOWER(unidade)) = TRIM(LOWER(?))`,
      [categoriaNome, unidadeNome]
    );
    const saldo = Number(saldoRow?.saldo || 0);
    if (saldo < qtd) {
      await conn.rollback();
      return res.status(400).json({
        error: `Saldo insuficiente para ${categoriaNome} (${unidadeNome}). Disponível: ${saldo}, solicitado: ${qtd}`,
      });
    }

    const detalhes = [
      'Baixa manual de estoque',
      tipo_saida ? `tipo: ${tipo_saida}` : '',
      motivo ? `motivo: ${motivo}` : '',
      destinatario ? `destino: ${destinatario}` : '',
      responsavel ? `responsável: ${responsavel}` : '',
      obs ? obs : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const [ins] = await conn.execute(
      'INSERT INTO entradas (data, doador, doador_id, categoria, quantidade, unidade, campanha_id, obs, tipo, fornecedor, forma_pagamento, solicitacao_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        data,
        responsavel || 'RETIRADA',
        null,
        categoriaNome,
        -Math.abs(qtd),
        unidadeNome,
        null,
        detalhes || null,
        'saida',
        null,
        null,
        null,
      ]
    );

    await conn.commit();
    res.status(201).json({
      id: ins.insertId,
      data,
      categoria: categoriaNome,
      unidade: unidadeNome,
      quantidade: qtd,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

module.exports = router;
