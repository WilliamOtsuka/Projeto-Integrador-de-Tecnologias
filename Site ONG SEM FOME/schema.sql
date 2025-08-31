CREATE DATABASE IF NOT EXISTS `ong_sem_fome` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ong_sem_fome`;

-- Doadores
CREATE TABLE IF NOT EXISTS doadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  telefone VARCHAR(32) NOT NULL,
  documento VARCHAR(32) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Famílias
CREATE TABLE IF NOT EXISTS familias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  responsavel VARCHAR(120) NOT NULL,
  contato VARCHAR(32) NOT NULL,
  cep VARCHAR(9) NOT NULL,
  logradouro VARCHAR(160) NOT NULL,
  numero VARCHAR(16) NOT NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  telefone VARCHAR(32) NOT NULL,
  cargo VARCHAR(120) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campanhas
CREATE TABLE IF NOT EXISTS campanhas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  meta VARCHAR(80) NOT NULL,
  descricao TEXT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Solicitações
CREATE TABLE IF NOT EXISTS solicitacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(160) NOT NULL,
  categoria VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entradas
CREATE TABLE IF NOT EXISTS entradas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data DATE NOT NULL,
  doador VARCHAR(120) NOT NULL,
  categoria VARCHAR(120) NOT NULL,
  quantidade INT NOT NULL,
  unidade VARCHAR(16) NOT NULL,
  campanha VARCHAR(120) NULL,
  obs TEXT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Seed de dados genéricos
-- Observação:
--  - Para tabelas sem UNIQUE, os INSERTs abaixo inserem SOMENTE se a tabela estiver vazia.
-- ------------------------------------------------------------

-- Categorias
INSERT IGNORE INTO categorias (nome) VALUES
  ('Arroz'),
  ('Feijão'),
  ('Macarrão'),
  ('Leite'),
  ('Enlatados'),
  ('Higiene'),
  ('Limpeza');

-- Doadores
INSERT INTO doadores (nome, email, telefone, documento)
SELECT * FROM (
  SELECT 'Maria Silva' AS nome, 'maria.silva@example.com' AS email, '(11) 91234-5678' AS telefone, '123.456.789-00' AS documento
  UNION ALL SELECT 'João Pereira', 'joao.pereira@example.com', '(21) 99876-5432', '987.654.321-00'
  UNION ALL SELECT 'Empresa Solidária LTDA', 'contato@empresasolidaria.com.br', '(11) 4002-8922', '12.345.678/0001-90'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM doadores);

-- Famílias
INSERT INTO familias (
  nome, responsavel, contato, cep, logradouro, numero, complemento, bairro, cidade, uf
)
SELECT * FROM (
  SELECT 'Família Silva', 'Maria Silva', '(11) 91234-5678', '01001-000', 'Praça da Sé', '100', NULL, 'Sé', 'São Paulo', 'SP'
  UNION ALL SELECT 'Família Oliveira', 'Carlos Oliveira', '(21) 99888-7777', '20040-010', 'Rua da Assembleia', '250', 'Ap 302', 'Centro', 'Rio de Janeiro', 'RJ'
  UNION ALL SELECT 'Família Souza', 'Ana Souza', '(31) 98765-4321', '30130-010', 'Av. Afonso Pena', '1500', NULL, 'Centro', 'Belo Horizonte', 'MG'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM familias);

-- Colaboradores
INSERT INTO colaboradores (nome, email, telefone, cargo)
SELECT * FROM (
  SELECT 'Ana Souza', 'ana.souza@example.com', '(11) 90000-1111', 'Coordenadora'
  UNION ALL SELECT 'Carlos Lima', 'carlos.lima@example.com', '(11) 90000-2222', 'Voluntário'
  UNION ALL SELECT 'Beatriz Nunes', 'beatriz.nunes@example.com', '(11) 90000-3333', 'Assistente Social'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM colaboradores);

-- Campanhas
INSERT INTO campanhas (nome, meta, descricao)
SELECT * FROM (
  SELECT 'Natal Solidário', '500 cestas', 'Campanha para montar cestas básicas no Natal.'
  UNION ALL SELECT 'Inverno Quentinho', '300 cobertores', 'Arrecadação de roupas e cobertores para o inverno.'
  UNION ALL SELECT 'Doação de Alimentos', '1000 kg', 'Arrecadação contínua de alimentos não perecíveis.'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM campanhas);

-- Solicitações
INSERT INTO solicitacoes (titulo, categoria, descricao)
SELECT * FROM (
  SELECT 'Cesta básica para família Silva', 'Alimentos', 'Necessidade de cesta básica para família cadastrada.'
  UNION ALL SELECT 'Leite em pó', 'Alimentos', 'Demanda de leite em pó para crianças.'
  UNION ALL SELECT 'Kit higiene', 'Higiene', 'Solicitação de itens de higiene pessoal.'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM solicitacoes);

-- Entradas
INSERT INTO entradas (data, doador, categoria, quantidade, unidade, campanha, obs)
SELECT * FROM (
  SELECT CURDATE(), 'Maria Silva', 'Arroz', 10, 'kg', 'Doação de Alimentos', 'Doação inicial'
  UNION ALL SELECT CURDATE(), 'Empresa Solidária LTDA', 'Feijão', 200, 'kg', 'Doação de Alimentos', 'Lote corporativo'
  UNION ALL SELECT CURDATE(), 'João Pereira', 'Leite', 30, 'L', 'Natal Solidário', 'Leite longa vida'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM entradas);
