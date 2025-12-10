CREATE DATABASE IF NOT EXISTS `ong_sem_fome` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ong_sem_fome`;

-- Doadores
CREATE TABLE IF NOT EXISTS doadores (
  id_doador INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  telefone VARCHAR(32) NOT NULL,
  documento VARCHAR(32) NOT NULL
);

-- Famílias
CREATE TABLE IF NOT EXISTS familias (
  id_familia INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  responsavel VARCHAR(120) NOT NULL,
  contato VARCHAR(32) NOT NULL,
  cep VARCHAR(9) NOT NULL,
  logradouro VARCHAR(160) NOT NULL,
  numero VARCHAR(16) NOT NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL
);

-- Colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id_colaborador INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  telefone VARCHAR(32) NOT NULL,
  cargo VARCHAR(120) NOT NULL
);

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  tipo VARCHAR(32) NOT NULL
);

-- Subitens de categorias compostas
CREATE TABLE IF NOT EXISTS categorias_itens (
  id_item INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT NOT NULL,
  nome_item VARCHAR(120) NOT NULL,
  UNIQUE KEY uq_categoria_item (categoria_id, nome_item),
  CONSTRAINT fk_categorias_itens_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id_categoria)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Campanhas
CREATE TABLE IF NOT EXISTS campanhas (
  id_campanha INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  meta VARCHAR(80) NOT NULL,
  descricao TEXT NULL
);

-- Solicitações
CREATE TABLE IF NOT EXISTS solicitacoes (
  id_solicitacao INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(160) NOT NULL,
  categoria_id INT NOT NULL,
  item_id INT NULL,
  descricao TEXT NULL,
  data_solicitacao DATE NULL,
  solicitante_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  prioridade VARCHAR(20) NOT NULL DEFAULT 'normal',
  quantidade DECIMAL(10,2) NULL,
  unidade VARCHAR(16) NULL,
  atualizacao TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_solicitacoes_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id_categoria)
    ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_item
    FOREIGN KEY (item_id) REFERENCES categorias_itens(id_item)
    ON DELETE SET NULL,
  CONSTRAINT fk_solicitacoes_solicitante
    FOREIGN KEY (solicitante_id) REFERENCES colaboradores(id_colaborador)
    ON DELETE SET NULL
);

-- Entradas
CREATE TABLE IF NOT EXISTS entradas (
  id_entrada INT AUTO_INCREMENT PRIMARY KEY,
  data DATE NOT NULL,
  doador VARCHAR(120) NOT NULL,
  doador_id INT NULL,
  categoria VARCHAR(120) NOT NULL,
  categoria_id INT NULL,
  quantidade INT NOT NULL,
  unidade VARCHAR(16) NOT NULL,
  campanha_id INT NULL,
  obs TEXT NULL,
  tipo VARCHAR(16) NOT NULL DEFAULT 'doacao',
  fornecedor VARCHAR(120) NULL,
  forma_pagamento VARCHAR(32) NULL,
  solicitacao_id INT NULL,
  CONSTRAINT fk_entradas_solicitacao
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id_solicitacao)
    ON DELETE SET NULL,
  CONSTRAINT fk_entradas_campanha
    FOREIGN KEY (campanha_id) REFERENCES campanhas(id_campanha)
    ON DELETE SET NULL,
  CONSTRAINT fk_entradas_doador
    FOREIGN KEY (doador_id) REFERENCES doadores(id_doador)
    ON DELETE SET NULL,
  CONSTRAINT fk_entradas_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id_categoria)
    ON DELETE SET NULL
);

-- Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  id_colaborador INT NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  CONSTRAINT fk_usuarios_colaborador
    FOREIGN KEY (id_colaborador) REFERENCES colaboradores(id_colaborador)
    ON DELETE CASCADE
);

-- Logins
CREATE TABLE IF NOT EXISTS logins (
  id_login INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  senha VARCHAR(100),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_user (id_usuario),
  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--- Montagens (produção de cestas a partir do estoque)
CREATE TABLE IF NOT EXISTS montagens (
  id_montagem INT AUTO_INCREMENT PRIMARY KEY,
  data DATE NOT NULL,
  responsavel VARCHAR(120) NOT NULL,
  responsavel_id INT NOT NULL,
  qtd_cestas INT NOT NULL,
  obs TEXT NULL,
  CONSTRAINT fk_montagens_responsavel
    FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id_colaborador)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS montagens_itens (
  id_montagens_item INT AUTO_INCREMENT PRIMARY KEY,
  montagem_id INT NOT NULL,
  categoria VARCHAR(120) NOT NULL,
  unidade VARCHAR(16) NOT NULL,
  quantidade INT NOT NULL,
  FOREIGN KEY (montagem_id) REFERENCES montagens(id_montagem) ON DELETE CASCADE
);

-- Saídas (distribuição de cestas)
CREATE TABLE IF NOT EXISTS saidas (
  id_saida INT AUTO_INCREMENT PRIMARY KEY,
  data DATE NOT NULL,
  familia_id INT NULL,
  responsavel VARCHAR(120) NULL,
  qtd INT NULL,
  obs TEXT NULL,
  CONSTRAINT fk_saidas_familia FOREIGN KEY (familia_id) REFERENCES familias(id_familia) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------

-- Categorias
INSERT IGNORE INTO categorias (nome, tipo) 
SELECT * FROM (
  SELECT 'Alimentos' AS nome, 'composta' AS tipo
  UNION ALL SELECT 'Higiene', 'composta'
  UNION ALL SELECT 'Limpeza', 'composta'
  UNION ALL SELECT 'Enlatados', 'composta'
  UNION ALL SELECT 'Leite', 'simples'
  UNION ALL SELECT 'Cesta Básica', 'simples'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM categorias);

-- Doadores
INSERT INTO doadores (nome, email, telefone, documento)
SELECT * FROM (
  SELECT 'Maria Silva' AS nome, 'maria.silva@example.com' AS email, '(11) 91234-5678' AS telefone, '123.456.789-00' AS documento
  UNION ALL SELECT 'João Pereira', 'joao.pereira@example.com', '(21) 99876-5432', '987.654.321-00'
  UNION ALL SELECT 'Empresa Solidária LTDA', 'contato@empresasolidaria.com.br', '(11) 4002-8922', '12.345.678/0001-90'
  UNION ALL SELECT 'Associação Cuidar', 'contato@associacaocuidar.org', '(31) 4002-0999', '45.678.123/0001-10'
  UNION ALL SELECT 'Luiza Costa', 'luiza.costa@example.com', '(71) 92345-8876', '456.789.123-11'
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
  UNION ALL SELECT 'Família Lima', 'Roberta Lima', '(41) 95555-1234', '80010-000', 'Rua XV de Novembro', '890', NULL, 'Centro', 'Curitiba', 'PR'
  UNION ALL SELECT 'Família Almeida', 'Paulo Almeida', '(71) 97777-6543', '40015-000', 'Av. Sete de Setembro', '210', 'Casa 02', 'Centro', 'Salvador', 'BA'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM familias);

-- Colaboradores
INSERT INTO colaboradores (nome, email, telefone, cargo)
SELECT * FROM (
  SELECT 'Ana Souza', 'ana.souza@example.com', '(11) 90000-1111', 'Coordenadora'
  UNION ALL SELECT 'Carlos Lima', 'carlos.lima@example.com', '(11) 90000-2222', 'Voluntário'
  UNION ALL SELECT 'Beatriz Nunes', 'beatriz.nunes@example.com', '(11) 90000-3333', 'Assistente Social'
  UNION ALL SELECT 'Ricardo Alves', 'ricardo.alves@example.com', '(21) 90000-4444', 'Logística'
  UNION ALL SELECT 'Fernanda Rocha', 'fernanda.rocha@example.com', '(31) 90000-5555', 'Nutricionista'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM colaboradores);

-- Seed: Usuários (depends on colaboradores)
INSERT INTO usuarios (id_colaborador, tipo)
SELECT id_colaborador, tipo
FROM (
  SELECT (SELECT id_colaborador FROM colaboradores WHERE email = 'ana.souza@example.com' LIMIT 1) AS id_colaborador, 'admin' AS tipo
  UNION ALL SELECT (SELECT id_colaborador FROM colaboradores WHERE email = 'carlos.lima@example.com' LIMIT 1), 'voluntario'
  UNION ALL SELECT (SELECT id_colaborador FROM colaboradores WHERE email = 'beatriz.nunes@example.com' LIMIT 1), 'colaborador'
  UNION ALL SELECT (SELECT id_colaborador FROM colaboradores WHERE email = 'ricardo.alves@example.com' LIMIT 1), 'logistica'
  UNION ALL SELECT (SELECT id_colaborador FROM colaboradores WHERE email = 'fernanda.rocha@example.com' LIMIT 1), 'nutricionista'
) AS tmp
WHERE id_colaborador IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM usuarios);

-- Seed: Logins (depends on usuarios)
INSERT INTO logins (id_usuario, senha)
SELECT id_usuario, senha
FROM (
  SELECT (
      SELECT u.id_usuario
      FROM usuarios u
      JOIN colaboradores c ON c.id_colaborador = u.id_colaborador
      WHERE c.email = 'ana.souza@example.com'
      LIMIT 1
    ) AS id_usuario, 'admin123' AS senha
  UNION ALL SELECT (
      SELECT u.id_usuario
      FROM usuarios u
      JOIN colaboradores c ON c.id_colaborador = u.id_colaborador
      WHERE c.email = 'carlos.lima@example.com'
      LIMIT 1
    ), 'voluntario123'
  UNION ALL SELECT (
      SELECT u.id_usuario
      FROM usuarios u
      JOIN colaboradores c ON c.id_colaborador = u.id_colaborador
      WHERE c.email = 'beatriz.nunes@example.com'
      LIMIT 1
    ), 'colaborador123'
  UNION ALL SELECT (
      SELECT u.id_usuario
      FROM usuarios u
      JOIN colaboradores c ON c.id_colaborador = u.id_colaborador
      WHERE c.email = 'ricardo.alves@example.com'
      LIMIT 1
    ), 'logistica123'
  UNION ALL SELECT (
      SELECT u.id_usuario
      FROM usuarios u
      JOIN colaboradores c ON c.id_colaborador = u.id_colaborador
      WHERE c.email = 'fernanda.rocha@example.com'
      LIMIT 1
    ), 'nutri123'
) AS tmp
WHERE id_usuario IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM logins);

-- Campanhas
INSERT INTO campanhas (nome, meta, descricao)
SELECT * FROM (
  SELECT 'Natal Solidário', '500 cestas', 'Campanha para montar cestas básicas no Natal.'
  UNION ALL SELECT 'Inverno Quentinho', '300 cobertores', 'Arrecadação de roupas e cobertores para o inverno.'
  UNION ALL SELECT 'Doação de Alimentos', '1000 kg', 'Arrecadação contínua de alimentos não perecíveis.'
  UNION ALL SELECT 'Mães Presentes', '250 kits de higiene', 'Apoio a famílias lideradas por mães solo.'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM campanhas);

-- Solicitações
INSERT INTO solicitacoes (titulo, categoria_id, item_id, descricao, data_solicitacao, solicitante_id, status, prioridade, quantidade, unidade)
SELECT * FROM (
  SELECT 'Cesta básica para família Silva',
    (SELECT id_categoria FROM categorias WHERE nome='Cesta Básica' LIMIT 1),
    NULL,
    'Necessidade de cesta básica para família cadastrada.',
    CURDATE(),
    (SELECT id_colaborador FROM colaboradores WHERE nome='Ana Souza' LIMIT 1),
    'pendente',
    'alta',
    1,
    'cesta'
  UNION ALL SELECT 'Leite em pó',
    (SELECT id_categoria FROM categorias WHERE nome='Alimentos' LIMIT 1),
    (SELECT id_item FROM categorias_itens WHERE nome_item='Leite em pó' AND categoria_id=(SELECT id_categoria FROM categorias WHERE nome='Alimentos' LIMIT 1) LIMIT 1),
    'Demanda de leite em pó para crianças.',
    CURDATE(),
    (SELECT id_colaborador FROM colaboradores WHERE nome='Carlos Lima' LIMIT 1),
    'pendente',
    'normal',
    15,
    'lata'
  UNION ALL SELECT 'Kit higiene',
    (SELECT id_categoria FROM categorias WHERE nome='Higiene' LIMIT 1),
    (SELECT id_item FROM categorias_itens WHERE nome_item='Kit higiene' AND categoria_id=(SELECT id_categoria FROM categorias WHERE nome='Higiene' LIMIT 1) LIMIT 1),
    'Solicitação de itens de higiene pessoal.',
    CURDATE(),
    (SELECT id_colaborador FROM colaboradores WHERE nome='Beatriz Nunes' LIMIT 1),
    'atendido',
    'baixa',
    10,
    'kit'
  UNION ALL SELECT 'Sabonetes para abrigo',
    (SELECT id_categoria FROM categorias WHERE nome='Higiene' LIMIT 1),
    (SELECT id_item FROM categorias_itens WHERE nome_item='Sabonete' AND categoria_id=(SELECT id_categoria FROM categorias WHERE nome='Higiene' LIMIT 1) LIMIT 1),
    'Abrigo parceiro solicita sabonetes em barra.',
    CURDATE(),
    (SELECT id_colaborador FROM colaboradores WHERE nome='Ricardo Alves' LIMIT 1),
    'pendente',
    'normal',
    50,
    'unidade'
  UNION ALL SELECT 'Materiais de limpeza comunitária',
    (SELECT id_categoria FROM categorias WHERE nome='Limpeza' LIMIT 1),
    (SELECT id_item FROM categorias_itens WHERE nome_item='Detergente' AND categoria_id=(SELECT id_categoria FROM categorias WHERE nome='Limpeza' LIMIT 1) LIMIT 1),
    'Mutirão de limpeza precisa de detergentes extras.',
    CURDATE(),
    (SELECT id_colaborador FROM colaboradores WHERE nome='Fernanda Rocha' LIMIT 1),
    'pendente',
    'alta',
    30,
    'frasco'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM solicitacoes);

-- Entradas
INSERT INTO entradas (data, doador, doador_id, categoria, categoria_id, quantidade, unidade, campanha_id, obs)
SELECT * FROM (
  SELECT CURDATE(), 'Maria Silva', (SELECT id_doador FROM doadores WHERE email='maria.silva@example.com' LIMIT 1), 'Arroz', (SELECT id_categoria FROM categorias WHERE nome='Alimentos' LIMIT 1), 10, 'kg', (SELECT id_campanha FROM campanhas WHERE nome='Doação de Alimentos' LIMIT 1), 'Doação inicial'
  UNION ALL SELECT CURDATE(), 'Empresa Solidária LTDA', (SELECT id_doador FROM doadores WHERE email='contato@empresasolidaria.com.br' LIMIT 1), 'Feijão', (SELECT id_categoria FROM categorias WHERE nome='Alimentos' LIMIT 1), 20, 'kg', (SELECT id_campanha FROM campanhas WHERE nome='Doação de Alimentos' LIMIT 1), 'Lote corporativo'
  UNION ALL SELECT CURDATE(), 'João Pereira', (SELECT id_doador FROM doadores WHERE email='joao.pereira@example.com' LIMIT 1), 'Leite', (SELECT id_categoria FROM categorias WHERE nome='Leite' LIMIT 1), 30, 'L', (SELECT id_campanha FROM campanhas WHERE nome='Natal Solidário' LIMIT 1), 'Leite longa vida'
  UNION ALL SELECT CURDATE(), 'Associação Cuidar', (SELECT id_doador FROM doadores WHERE email='contato@associacaocuidar.org' LIMIT 1), 'Sabonete', (SELECT id_categoria FROM categorias WHERE nome='Higiene' LIMIT 1), 80, 'un', (SELECT id_campanha FROM campanhas WHERE nome='Mães Presentes' LIMIT 1), 'Doação para kits'
  UNION ALL SELECT CURDATE(), 'Luiza Costa', (SELECT id_doador FROM doadores WHERE email='luiza.costa@example.com' LIMIT 1), 'Detergente', (SELECT id_categoria FROM categorias WHERE nome='Limpeza' LIMIT 1), 40, 'frasco', (SELECT id_campanha FROM campanhas WHERE nome='Volta às Aulas' LIMIT 1), 'Apoio a mutirão'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM entradas);

-- Itens de categorias
INSERT INTO categorias_itens (categoria_id, nome_item)
SELECT c.id_categoria, seeds.nome_item
FROM (
  SELECT 'Alimentos' AS categoria_nome, 'Arroz' AS nome_item
  UNION ALL SELECT 'Alimentos', 'Feijão'
  UNION ALL SELECT 'Alimentos', 'Leite em pó'
  UNION ALL SELECT 'Higiene', 'Sabonete'
  UNION ALL SELECT 'Higiene', 'Shampoo'
  UNION ALL SELECT 'Higiene', 'Kit higiene'
  UNION ALL SELECT 'Limpeza', 'Detergente'
  UNION ALL SELECT 'Limpeza', 'Água Sanitária'
  UNION ALL SELECT 'Limpeza', 'Sabão em pó'
  UNION ALL SELECT 'Enlatados', 'Milho em lata'
  UNION ALL SELECT 'Enlatados', 'Seleta de legumes'
  UNION ALL SELECT 'Alimentos', 'Macarrão'
  UNION ALL SELECT 'Higiene', 'Creme dental'
) AS seeds
JOIN categorias c ON c.nome = seeds.categoria_nome
LEFT JOIN categorias_itens ci
  ON ci.categoria_id = c.id_categoria AND ci.nome_item = seeds.nome_item
WHERE ci.id_item IS NULL;

INSERT INTO saidas (data, familia_id, responsavel, qtd, obs)
SELECT * FROM (
  SELECT CURDATE(), (SELECT id_familia FROM familias WHERE nome='Família Silva'), 'Ana Souza', 1, 'Entrega de cesta básica'
  UNION ALL SELECT CURDATE(), (SELECT id_familia FROM familias WHERE nome='Família Oliveira'), 'Carlos Lima', 1, 'Entrega de cesta básica'
  UNION ALL SELECT CURDATE(), (SELECT id_familia FROM familias WHERE nome='Família Lima'), 'Ricardo Alves', 1, 'Entrega emergencial'
  UNION ALL SELECT CURDATE(), (SELECT id_familia FROM familias WHERE nome='Família Almeida'), 'Fernanda Rocha', 2, 'Kits de higiene e limpeza'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM saidas);
-- ------------------------------------------------------------