let entradas = [];
let estoque = [];
let estoqueFiltrado = [];
let movimentos = [];
// Referências modal edição (definidas após DOM)
let modalEditarMov, fecharModalEditarMovBtn, formEditarMov;
let cancelarEditarMovBtn;

// Paginação (itens, detalhes, movimentações)
let pageEstoque = 1;
const limitEstoque = 10;
let totalEstoquePages = 1;

let pageDetalhes = 1;
const limitDetalhes = 10;
let totalDetalhesPages = 1;

let pageMov = 1;
let limitMov = 20;
let totalMovPages = 1;

// Utilitários reutilizados
const onlyDigits = (v) => (v || "").replace(/\D/g, "");
function todayYYYYMMDD() {
  const d = new Date();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function parseDate(dStr) {
  const d = new Date(dStr);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseDateTime(dtStr) {
  if (!dtStr) return null;
  const d = new Date(dtStr);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDate(dStr) {
  const d = parseDate(dStr);
  if (!d) return "-";
  const yyyy = d.getFullYear();
  const yy = String(yyyy).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
}

function formatTime(dtStr) {
  const d = parseDateTime(dtStr);
  if (!d) return "--:--";
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

function formatDateTime(dateStr, createdAt) {
  const datePart = formatDate(dateStr);
  const timePart = formatTime(createdAt);
  return `${datePart} ${timePart}`;
}

// Carrega entradas da API para consolidar estoque
async function loadEntradasForEstoque() {
  try {
    const r = await fetch(`/api/entradas?limit=10000`);
    if (!r.ok) {
      if (r.status === 401) {
        alert("Sessão expirada. Faça login.");
        window.location.href = "login_page.html";
        return;
      }
      throw new Error("Falha ao carregar entradas");
    }
  const payload = await r.json();
  const raw = Array.isArray(payload) ? payload : (payload.data || []);

  entradas = raw.map((e) => ({
    idEntrada: e.idEntrada ?? e.id_entrada ?? e.id,
    data: e.data,
    doador: e.doador,
    categoria: e.categoria,
    quantidade: Number(e.quantidade ?? 0),
    unidade: String(e.unidade || '').toLowerCase(),
    campanha: e.campanha ?? null,
    obs: e.obs ?? null,
    tipo: e.tipo || 'doacao',
    fornecedor: e.fornecedor ?? null,
    forma_pagamento: e.forma_pagamento ?? null,
    solicitacao_id: e.solicitacao_id ?? null,
    criado_em: e.criado_em ?? e.created_at ?? null,
  }));
    buildEstoque(entradas);
    buildMovimentos(entradas);
    renderFiltros();
    applyFilters();
  populateMovFilters();
  renderMovimentacoes();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar estoque");
  }
}

// Consolida o estoque por (categoria, unidade)
function buildEstoque(list) {
  const map = new Map();
  list.forEach((e) => {
    const key = `${(e.categoria || "").trim().toLowerCase()}__${(e.unidade || "").trim().toLowerCase()}`;
    const atual = map.get(key) || {
      categoria: e.categoria || "",
      unidade: (e.unidade || "").toLowerCase(),
      quantidade: 0,
      ultimaEntrada: null,
      itens: [], // detalhes
    };
    const qtd = Number(e.quantidade) || 0;
    atual.quantidade += qtd;
    if (!atual.ultimaEntrada || (e.data && e.data > atual.ultimaEntrada)) {
      atual.ultimaEntrada = e.data || null;
    }
    atual.itens.push({
      id: e.idEntrada,
      data: e.data,
      doador: e.doador,
      quantidade: qtd,
      unidade: e.unidade,
      campanha: e.campanha,
      obs: e.obs,
      tipo: (e.tipo || 'doacao'),
      fornecedor: e.fornecedor || null,
    });
    map.set(key, atual);
  });
  estoque = Array.from(map.values())
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.unidade.localeCompare(b.unidade));
}

// Constrói lista de movimentações cronológicas com saldo por (categoria, unidade)
function buildMovimentos(list) {
  const sorted = list.slice().sort((a, b) => {
    // Ordem decrescente por data, hora de criação, id (mais recente primeiro)
    const ad = (b.data || '').localeCompare(a.data || '');
    if (ad !== 0) return ad;
    const ta = parseDateTime(a.criado_em);
    const tb = parseDateTime(b.criado_em);
    if (ta && tb && ta.getTime() !== tb.getTime()) return tb - ta;
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return (b.idEntrada || 0) - (a.idEntrada || 0);
  });
  const saldo = new Map();
  const asc = list.slice().sort((a, b) => {
    const ad = (a.data || '').localeCompare(b.data || '');
    if (ad !== 0) return ad;
    const ta = parseDateTime(a.criado_em);
    const tb = parseDateTime(b.criado_em);
    if (ta && tb && ta.getTime() !== tb.getTime()) return ta - tb;
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return (a.idEntrada || 0) - (b.idEntrada || 0);
  });
  const saldoPorMov = new Map(); // key: `${cat}__${un}__${id}` -> saldo
  const running = new Map();
  asc.forEach((e) => {
    const cat = String(e.categoria || '').trim();
    const un = String(e.unidade || '').trim().toLowerCase();
    const key = `${cat.toLowerCase()}__${un}`;
    const prev = running.get(key) || 0;
    const qtd = Number(e.quantidade) || 0;
    const novo = prev + qtd;
    running.set(key, novo);
    saldoPorMov.set(`${key}__${e.idEntrada}`, novo);
  });
  movimentos = sorted.map((e) => {
    const cat = String(e.categoria || '').trim();
    const un = String(e.unidade || '').trim().toLowerCase();
    const key = `${cat.toLowerCase()}__${un}`;
    const qtd = Number(e.quantidade) || 0;
    const novo = saldoPorMov.get(`${key}__${e.idEntrada}`) ?? qtd;
    const tipo = qtd >= 0 ? 'Entrada' : 'Saída';
    return {
      id: e.idEntrada,
      data: e.data,
      tipo,
      categoria: cat,
      unidade: un,
      quantidade: qtd,
      doador: e.doador || '-',
      campanha: e.campanha || '-',
      obs: e.obs || '-',
      saldo: novo,
      criado_em: e.criado_em || null,
      entrada_tipo: (e.tipo || 'doacao'),
      fornecedor: e.fornecedor || null,
    };
  });
}

function renderMovimentacoes() {
  const tbody = document.querySelector('#tabelaMovimentacoes tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const cat = (document.getElementById('movFiltroCategoria')?.value || '').trim();
  const und = (document.getElementById('movFiltroUnidade')?.value || '').trim().toLowerCase();
  const camp = (document.getElementById('movFiltroCampanha')?.value || '').trim();
  const tipo = (document.getElementById('movFiltroTipo')?.value || '').trim();
  const de = (document.getElementById('movDataDe')?.value || '').trim();
  const ate = (document.getElementById('movDataAte')?.value || '').trim();
  const order = (document.getElementById('movOrder')?.value || 'desc').trim();
  const q = (document.getElementById('filtroBusca')?.value || '').trim().toLowerCase();
  const list = movimentos.filter((m) => {
    const matchCat = !cat || m.categoria === cat;
    const matchUnd = !und || m.unidade === und;
    const matchCamp = !camp || (m.campanha || '-') === camp;
    const matchTipo = !tipo || m.tipo === tipo;
    const matchDe = !de || (m.data && m.data >= de);
    const matchAte = !ate || (m.data && m.data <= ate);
    const matchBusca = !q ||
      m.categoria.toLowerCase().includes(q) ||
      m.unidade.toLowerCase().includes(q) ||
      (m.obs || '').toLowerCase().includes(q) ||
      (m.doador || '').toLowerCase().includes(q) ||
      (m.campanha || '').toLowerCase().includes(q);
    return matchCat && matchUnd && matchCamp && matchTipo && matchDe && matchAte && matchBusca;
  });
  // Ordenação por data, criado_em e id conforme seleção
  list.sort((a, b) => {
    const ad = (a.data || '').localeCompare(b.data || '');
    if (ad !== 0) return order === 'asc' ? ad : -ad;
    const ta = parseDateTime(a.criado_em);
    const tb = parseDateTime(b.criado_em);
    if (ta && tb && ta.getTime() !== tb.getTime()) return order === 'asc' ? (ta - tb) : (tb - ta);
    if (ta && !tb) return order === 'asc' ? -1 : 1;
    if (!ta && tb) return order === 'asc' ? 1 : -1;
    const idDiff = (a.id || 0) - (b.id || 0);
    return order === 'asc' ? idDiff : -idDiff;
  });
  // Atualiza paginação (mov)
  totalMovPages = Math.max(1, Math.ceil(list.length / limitMov));
  if (pageMov > totalMovPages) pageMov = totalMovPages;
  const start = (pageMov - 1) * limitMov;
  const pageItems = list.slice(start, start + limitMov);
  const infoMov = document.getElementById('infoMov');
  const prevMov = document.getElementById('prevMov');
  const nextMov = document.getElementById('nextMov');
  if (infoMov) infoMov.textContent = `Página ${pageMov} de ${totalMovPages}`;
  if (prevMov) prevMov.disabled = pageMov <= 1;
  if (nextMov) nextMov.disabled = pageMov >= totalMovPages;

  if (!pageItems.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="9" style="text-align:center;color:#666;">Nenhuma movimentação</td>';
    tbody.appendChild(tr);
    return;
  }
  pageItems.forEach((m) => {
    const tr = document.createElement('tr');
    const canEditEntrada = m.doador !== 'SAIDA' && m.doador !== 'MONTAGEM';
    const origem = (function(){
      const t = String(m.entrada_tipo || '').toLowerCase();
      if (t === 'compra') {
        const forn = m.fornecedor ? ` (${m.fornecedor})` : '';
        return `Compra${forn}`;
      }
      const donor = (m.doador && m.doador !== '-') ? ` (${m.doador})` : '';
      return `Doação${donor}`;
    })();
    const isSaida = m.doador === 'SAIDA' || (m.obs || '').startsWith('Saída #');
    const isMontagem = m.doador === 'MONTAGEM' || (m.obs || '').includes('montagem #');
    const acoes = isMontagem ? '' : isSaida ? `
      <div class="table-actions">
        <button class="btn-edit" data-acao="editar-saida" data-id="${m.id}">Editar</button>
        <button class="btn-delete" data-acao="excluir-saida" data-id="${m.id}">Excluir</button>
      </div>
    ` : canEditEntrada ? `
      <div class="table-actions">
        <button class="btn-edit" data-acao="editar-entrada" data-id="${m.id}">Editar</button>
        <button class="btn-delete" data-acao="excluir-entrada" data-id="${m.id}">Excluir</button>
      </div>
    ` : '';
    tr.innerHTML = `
      <td>${formatDateTime(m.data, m.criado_em)}</td>
      <td>${m.tipo}</td>
      <td>${m.categoria}</td>
      <td>${m.unidade}</td>
      <td style="color:${m.quantidade < 0 ? '#b00020' : '#0a7'};">${m.quantidade}</td>
      <td>${isSaida ? m.doador : origem}</td>
      <td>${m.campanha}</td>
      <td>${m.obs}</td>
      <td>${m.saldo}</td>
      <td>${acoes}</td>
    `;
    tr.querySelectorAll('button[data-acao]').forEach((btn) => {
      const acao = btn.getAttribute('data-acao');
      const id = Number(btn.getAttribute('data-id'));
      if (acao === 'editar-entrada') btn.addEventListener('click', () => editarEntrada(id));
      if (acao === 'excluir-entrada') btn.addEventListener('click', () => excluirEntrada(id));
      if (acao === 'editar-saida') btn.addEventListener('click', () => editarSaidaByEntradaId(id));
      if (acao === 'excluir-saida') btn.addEventListener('click', () => excluirSaidaByEntradaId(id));
    });
    tbody.appendChild(tr);
  });
}

// Populate Movimentações filter selects
function populateMovFilters() {
  const cats = new Set();
  const unds = new Set();
  const camps = new Set();
  movimentos.forEach((m) => {
    if (m.categoria) cats.add(m.categoria);
    if (m.unidade) unds.add(m.unidade);
    if (m.campanha && m.campanha !== '-') camps.add(m.campanha);
  });
  const fill = (id, values) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    Array.from(values).sort((a,b)=>String(a).localeCompare(String(b))).forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v; sel.appendChild(opt);
    });
    if (current && Array.from(values).includes(current)) sel.value = current;
  };
  fill('movFiltroCategoria', cats);
  fill('movFiltroUnidade', unds);
  fill('movFiltroCampanha', camps);
}

// Edita entrada
async function editarEntrada(id) {
  const item = entradas.find(e => e.idEntrada === id);
  if (!item) return alert('Entrada não encontrada');
  openEditarMovModal({
    modo: 'entrada',
    id: item.idEntrada,
    data: item.data,
    doador: item.doador,
    categoria: item.categoria,
    quantidade: item.quantidade,
    unidade: item.unidade,
    campanha: item.campanha,
    obs: item.obs
  });
}

// Exclui entrada
async function excluirEntrada(id) {
  if (!confirm('Excluir esta entrada?')) return;
  const r = await fetch(`/api/entradas/${id}`, { method: 'DELETE' });
  if (r.status !== 204) return alert('Falha ao excluir entrada');
  await reloadAfterChange();
}

// Para saídas, a linha de movimentação vem da tabela entradas com obs "Saída #ID ..."
function parseSaidaIdFromObs(obs) {
  const m = String(obs || '').match(/Saída #(\d+)/);
  return m ? Number(m[1]) : null;
}

// Edita saída vinculada à entrada
async function editarSaidaByEntradaId(entradaId) {
  const ent = entradas.find(e => e.idEntrada === entradaId);
  if (!ent) return alert('Movimentação não encontrada');
  const saidaId = parseSaidaIdFromObs(ent.obs);
  if (!saidaId) return alert('Vínculo da saída não encontrado');
  const r = await fetch(`/api/saidas/${saidaId}`);
  if (!r.ok) return alert('Falha ao carregar saída');
  const s = await r.json();
  openEditarMovModal({
    modo: 'saida',
    id: saidaId,
    data: s.data,
    familia_id: s.familia_id,
    responsavel: s.responsavel,
    qtd: s.qtd,
    obs: s.obs
  });
}

// Exclui saída vinculada à entrada
async function excluirSaidaByEntradaId(entradaId) {
  const ent = entradas.find(e => e.idEntrada === entradaId);
  if (!ent) return alert('Movimentação não encontrada');
  const saidaId = parseSaidaIdFromObs(ent.obs);
  if (!saidaId) return alert('Vínculo da saída não encontrado');
  if (!confirm('Excluir esta saída? O estoque será reajustado.')) return;
  const r = await fetch(`/api/saidas/${saidaId}`, { method: 'DELETE' });
  if (r.status !== 204) return alert('Falha ao excluir saída');
  await reloadAfterChange();
}

//  Recarrega entradas e reconstrói tudo após CRUD
async function reloadAfterChange() {
  const r = await fetch('/api/entradas?limit=10000');
  if (!r.ok) return location.reload();
  const payload = await r.json();
  const raw = Array.isArray(payload) ? payload : (payload.data || []);
  entradas = raw.map((e) => ({
    idEntrada: e.idEntrada ?? e.id_entrada ?? e.id,
    data: e.data,
    doador: e.doador,
    categoria: e.categoria,
    quantidade: Number(e.quantidade ?? 0),
    unidade: String(e.unidade || '').toLowerCase(),
    campanha: e.campanha ?? null,
    obs: e.obs ?? null,
    tipo: e.tipo || 'doacao',
    fornecedor: e.fornecedor ?? null,
    forma_pagamento: e.forma_pagamento ?? null,
    solicitacao_id: e.solicitacao_id ?? null,
    criado_em: e.criado_em ?? e.created_at ?? null,
  }));
  buildEstoque(entradas);
  buildMovimentos(entradas);
  applyFilters();
  populateMovFilters();
  renderMovimentacoes();
}

// Renderiza filtros (categoria)
async function renderFiltros() {
  try {
    const select = document.getElementById("filtroCategoria");
    if (!select) return;

    // Carrega categorias da API para o filtro
  const r = await fetch("/api/categorias?limit=1000");
  const payload = r.ok ? await r.json() : [];
  const cats = Array.isArray(payload) ? payload : (payload.data || []);

    // mantém a opção Todas já existente
    // limpa as outras
    while (select.options.length > 1) select.remove(1);

    cats
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.nome;
        opt.textContent = c.nome;
        select.appendChild(opt);
      });
  } catch (err) {
    console.error(err);
  }
}

// Aplica filtros globais (categoria, busca)
function applyFilters() {
  const cat = (document.getElementById("filtroCategoria")?.value || "").trim();
  const q = (document.getElementById("filtroBusca")?.value || "").trim().toLowerCase();

  estoqueFiltrado = estoque.filter((item) => {
    const matchCat = !cat || item.categoria === cat;
    const matchBusca = !q ||
      item.categoria.toLowerCase().includes(q) ||
      item.unidade.toLowerCase().includes(q);
    return matchCat && matchBusca;
  });
  // Reset páginas ao aplicar filtros globais
  pageEstoque = 1;
  pageMov = 1;
  renderTabelaEstoque();
  renderMovimentacoes();
}

// Renderiza tabela de estoque com paginação
function renderTabelaEstoque() {
  const tbody = document.querySelector("#tabelaEstoque tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Atualiza paginação de estoque
  totalEstoquePages = Math.max(1, Math.ceil(estoqueFiltrado.length / limitEstoque));
  if (pageEstoque > totalEstoquePages) pageEstoque = totalEstoquePages;
  const start = (pageEstoque - 1) * limitEstoque;
  const pageItems = estoqueFiltrado.slice(start, start + limitEstoque);
  const info = document.getElementById('infoEstoque');
  const prev = document.getElementById('prevEstoque');
  const next = document.getElementById('nextEstoque');
  if (info) info.textContent = `Página ${pageEstoque} de ${totalEstoquePages}`;
  if (prev) prev.disabled = pageEstoque <= 1;
  if (next) next.disabled = pageEstoque >= totalEstoquePages;

  if (!pageItems.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="5" style="text-align:center;color:#666;">Nenhum item encontrado</td>';
    tbody.appendChild(tr);
    return;
  }

  pageItems.forEach((i, localIdx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i.categoria}</td>
      <td>${i.unidade}</td>
      <td>${i.quantidade}</td>
      <td>${formatDate(i.ultimaEntrada)}</td>
      <td>
        <button class="btn-edit" data-idx="${start + localIdx}">Detalhes</button>
      </td>
    `;
    tr.querySelector("button").addEventListener("click", () => abrirDetalhes(start + localIdx));
    tbody.appendChild(tr);
  });
}

function abrirDetalhes(idx) {
  const item = estoqueFiltrado[idx];
  if (!item) return;

  const modal = document.getElementById("modalDetalhesEstoque");
  const tbody = document.querySelector("#tabelaDetalhesEstoque tbody");
  const title = document.getElementById("tituloModalDetalhes");

  title.textContent = `Detalhes: ${item.categoria} (${item.unidade})`;
  // Save current details in modal dataset for filtering
  modal.dataset.idx = String(idx);
  // Reset paginação de detalhes ao abrir
  pageDetalhes = 1;
  preencherFiltrosDetalhes(item.itens);
  renderDetalhesFiltrados();

  modal.classList.remove("saindo");
  modal.style.display = "block";
  void modal.offsetWidth;
  modal.classList.add("mostrar");
}

// Preenche filtros de detalhes (doador, campanha)
function preencherFiltrosDetalhes(itens) {
  const donors = new Set();
  const camps = new Set();
  itens.forEach((e) => {
    if (e.doador) donors.add(e.doador);
    if (e.campanha) camps.add(e.campanha);
  });
  const fill = (id, set) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    Array.from(set).sort((a,b)=>String(a).localeCompare(String(b))).forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v; sel.appendChild(opt);
    });
    if (cur && Array.from(set).includes(cur)) sel.value = cur;
  };
  fill('detDoador', donors);
  fill('detCampanha', camps);
}

// Renderiza detalhes filtrados com paginação
function renderDetalhesFiltrados() {
  const modal = document.getElementById('modalDetalhesEstoque');
  const idx = Number(modal.dataset.idx || -1);
  const item = estoqueFiltrado[idx];
  const tbody = document.querySelector('#tabelaDetalhesEstoque tbody');
  if (!item || !tbody) return;
  tbody.innerHTML = '';
  const de = document.getElementById('detDataDe')?.value || '';
  const ate = document.getElementById('detDataAte')?.value || '';
  const doador = document.getElementById('detDoador')?.value || '';
  const campanha = document.getElementById('detCampanha')?.value || '';
  const tipo = document.getElementById('detTipo')?.value || '';
  const busca = (document.getElementById('detBusca')?.value || '').toLowerCase().trim();
  const list = item.itens.slice().sort((a,b)=> (a.data||'').localeCompare(b.data||''));
  const filtered = list.filter((e) => {
    const isEntrada = Number(e.quantidade || 0) >= 0;
    const matchTipo = !tipo || (tipo === 'Entrada' ? isEntrada : !isEntrada);
    const matchDoador = !doador || (e.doador || '') === doador;
    const matchCamp = !campanha || (e.campanha || '') === campanha;
    const matchDe = !de || (e.data && e.data >= de);
    const matchAte = !ate || (e.data && e.data <= ate);
    const matchBusca = !busca ||
      (e.doador||'').toLowerCase().includes(busca) ||
      (e.campanha||'').toLowerCase().includes(busca) ||
      (e.obs||'').toLowerCase().includes(busca);
    return matchTipo && matchDoador && matchCamp && matchDe && matchAte && matchBusca;
  });
  // Atualiza paginação detalhes
  totalDetalhesPages = Math.max(1, Math.ceil(filtered.length / limitDetalhes));
  if (pageDetalhes > totalDetalhesPages) pageDetalhes = totalDetalhesPages;
  const start = (pageDetalhes - 1) * limitDetalhes;
  const pageItems = filtered.slice(start, start + limitDetalhes);
  const info = document.getElementById('infoDetalhes');
  const prev = document.getElementById('prevDetalhes');
  const next = document.getElementById('nextDetalhes');
  if (info) info.textContent = `Página ${pageDetalhes} de ${totalDetalhesPages}`;
  if (prev) prev.disabled = pageDetalhes <= 1;
  if (next) next.disabled = pageDetalhes >= totalDetalhesPages;

  if (!pageItems.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" style="text-align:center;color:#666;">Sem resultados</td>';
    tbody.appendChild(tr);
    return;
  }
  pageItems.forEach((e) => {
    const tr = document.createElement('tr');
    const origem = (function(){
      const t = String(e.tipo || '').toLowerCase();
      if (t === 'compra') {
        const forn = e.fornecedor ? ` (${e.fornecedor})` : '';
        return `Compra${forn}`;
      }
      return 'Doação';
    })();
    tr.innerHTML = `
      <td>${formatDate(e.data)}</td>
      <td>${origem}</td>
      <td>${e.quantidade}</td>
      <td>${(e.unidade || '').toLowerCase()}</td>
      <td>${e.campanha || '-'}</td>
      <td>${e.obs || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Fecha modal detalhes
function fecharDetalhes() {
  const modal = document.getElementById("modalDetalhesEstoque");
  modal.classList.remove("mostrar");
  modal.classList.add("saindo");
  const content = modal.querySelector(".modal-conteudo");
  const done = () => {
    modal.style.display = "none";
    modal.classList.remove("saindo");
    if (content) content.removeEventListener("transitionend", onEnd);
  };
  const onEnd = (e) => {
    if (e.target === content) done();
  };
  if (content) content.addEventListener("transitionend", onEnd);
  else setTimeout(done, 240);
}

function exportCSV() {
  // Exporta o estoque filtrado para CSV
  const rows = [
    ["Categoria", "Unidade", "Quantidade", "UltimaEntrada"],
    ...estoqueFiltrado.map((i) => [i.categoria, i.unidade, String(i.quantidade), formatDate(i.ultimaEntrada)]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `estoque-${todayYYYYMMDD()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Eventos
const catSelect = document.getElementById("filtroCategoria");
const buscaInput = document.getElementById("filtroBusca");
const btnCsv = document.getElementById("btnExportCsv");
const fecharBtn = document.getElementById("fecharModalDetalhes");
const movCat = document.getElementById('movFiltroCategoria');
const movUnd = document.getElementById('movFiltroUnidade');
const movCamp = document.getElementById('movFiltroCampanha');
const movTipo = document.getElementById('movFiltroTipo');
const movClear = document.getElementById('movBtnLimpar');
const movPerPage = document.getElementById('movPerPage');
const movDe = document.getElementById('movDataDe');
const movAte = document.getElementById('movDataAte');
const movOrder = document.getElementById('movOrder');

const prevEstoqueBtn = document.getElementById('prevEstoque');
const nextEstoqueBtn = document.getElementById('nextEstoque');
const prevDetalhesBtn = document.getElementById('prevDetalhes');
const nextDetalhesBtn = document.getElementById('nextDetalhes');
const prevMovBtn = document.getElementById('prevMov');
const nextMovBtn = document.getElementById('nextMov');

const detDe = document.getElementById('detDataDe');
const detAte = document.getElementById('detDataAte');
const detDoador = document.getElementById('detDoador');
const detCampanha = document.getElementById('detCampanha');
const detTipo = document.getElementById('detTipo');
const detBusca = document.getElementById('detBusca');
const detClear = document.getElementById('detBtnLimpar');

if (catSelect) catSelect.addEventListener("change", applyFilters);
if (buscaInput) buscaInput.addEventListener("input", applyFilters);
if (btnCsv) btnCsv.addEventListener("click", exportCSV);
if (fecharBtn) fecharBtn.addEventListener("click", fecharDetalhes);
if (movCat) movCat.addEventListener('change', () => { pageMov = 1; renderMovimentacoes(); });
if (movUnd) movUnd.addEventListener('change', () => { pageMov = 1; renderMovimentacoes(); });
if (movCamp) movCamp.addEventListener('change', () => { pageMov = 1; renderMovimentacoes(); });
if (movTipo) movTipo.addEventListener('change', () => { pageMov = 1; renderMovimentacoes(); });
if (movDe) movDe.addEventListener('change', () => { pageMov = 1; renderMovimentacoes(); });
if (movAte) movAte.addEventListener('change', () => { pageMov = 1; renderMovimentacoes(); });
if (movOrder) movOrder.addEventListener('change', () => { pageMov = 1; renderMovimentacoes(); });
if (movClear) movClear.addEventListener('click', () => {
  if (movCat) movCat.value = '';
  if (movUnd) movUnd.value = '';
  if (movCamp) movCamp.value = '';
  if (movTipo) movTipo.value = '';
  if (movDe) movDe.value = '';
  if (movAte) movAte.value = '';
  if (movOrder) movOrder.value = 'desc';
  pageMov = 1;
  renderMovimentacoes();
});

if (movPerPage) movPerPage.addEventListener('change', () => {
  const v = Number(movPerPage.value);
  if (Number.isInteger(v) && v > 0) {
    limitMov = v;
    pageMov = 1;
    renderMovimentacoes();
  }
});

if (detDe) detDe.addEventListener('change', () => { pageDetalhes = 1; renderDetalhesFiltrados(); });
if (detAte) detAte.addEventListener('change', () => { pageDetalhes = 1; renderDetalhesFiltrados(); });
if (detDoador) detDoador.addEventListener('change', () => { pageDetalhes = 1; renderDetalhesFiltrados(); });
if (detCampanha) detCampanha.addEventListener('change', () => { pageDetalhes = 1; renderDetalhesFiltrados(); });
if (detTipo) detTipo.addEventListener('change', () => { pageDetalhes = 1; renderDetalhesFiltrados(); });
if (detBusca) detBusca.addEventListener('input', () => { pageDetalhes = 1; renderDetalhesFiltrados(); });
if (detClear) detClear.addEventListener('click', () => {
  if (detDe) detDe.value = '';
  if (detAte) detAte.value = '';
  if (detDoador) detDoador.value = '';
  if (detCampanha) detCampanha.value = '';
  if (detTipo) detTipo.value = '';
  if (detBusca) detBusca.value = '';
  pageDetalhes = 1;
  renderDetalhesFiltrados();
});

// Pagination controls listeners
if (prevEstoqueBtn) prevEstoqueBtn.addEventListener('click', () => { if (pageEstoque > 1) { pageEstoque--; renderTabelaEstoque(); } });
if (nextEstoqueBtn) nextEstoqueBtn.addEventListener('click', () => { if (pageEstoque < totalEstoquePages) { pageEstoque++; renderTabelaEstoque(); } });
if (prevDetalhesBtn) prevDetalhesBtn.addEventListener('click', () => { if (pageDetalhes > 1) { pageDetalhes--; renderDetalhesFiltrados(); } });
if (nextDetalhesBtn) nextDetalhesBtn.addEventListener('click', () => { if (pageDetalhes < totalDetalhesPages) { pageDetalhes++; renderDetalhesFiltrados(); } });
if (prevMovBtn) prevMovBtn.addEventListener('click', () => { if (pageMov > 1) { pageMov--; renderMovimentacoes(); } });
if (nextMovBtn) nextMovBtn.addEventListener('click', () => { if (pageMov < totalMovPages) { pageMov++; renderMovimentacoes(); } });

window.onclick = function (event) {
  if (event.target == document.getElementById("modalDetalhesEstoque")) {
    fecharDetalhes();
  }
  if (event.target === modalEditarMov) {
    fecharEditarMovModal();
  }
};

// Inicializa
loadEntradasForEstoque();

// ------- Modal Edição Movimentação -------
document.addEventListener('DOMContentLoaded', () => {
  modalEditarMov = document.getElementById('modalEditarMov');
  fecharModalEditarMovBtn = document.getElementById('fecharModalEditarMov');
  formEditarMov = document.getElementById('formEditarMov');
  cancelarEditarMovBtn = document.getElementById('cancelarEditarMov');
  if (fecharModalEditarMovBtn) fecharModalEditarMovBtn.addEventListener('click', fecharEditarMovModal);
  if (cancelarEditarMovBtn) cancelarEditarMovBtn.addEventListener('click', fecharEditarMovModal);
  if (formEditarMov) formEditarMov.addEventListener('submit', onSubmitEditarMov);
});

// Modal editar movimentação
function openEditarMovModal(data) {
  if (!modalEditarMov) return;
  modalEditarMov.style.display = 'block';
  void modalEditarMov.offsetWidth;
  modalEditarMov.classList.add('mostrar');
  const titulo = document.getElementById('tituloModalEditarMov');
  const isEntrada = data.modo === 'entrada';
  const isSaida = data.modo === 'saida';
  if (titulo) titulo.textContent = isEntrada ? 'Editar Entrada' : 'Editar Saída';
  // Campos
  setValue('editMovId', data.id);
  setValue('editMovTipo', data.modo);
  // Formatar data para yyyy-MM-dd (input date)
  const rawData = data.data || '';
  let dateForInput = '';
  if (rawData) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawData)) {
      dateForInput = rawData; 
    } else {
      const d = new Date(rawData);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dateForInput = `${d.getFullYear()}-${mm}-${dd}`;
      }
    }
  }
  setValue('editData', dateForInput);
  setValue('editDoador', data.doador || '');
  // Carregar categorias no select e preparar subitens
  (async () => {
    try {
      const sel = document.getElementById('editCategoria');
      if (sel) {
        await editCategoriasSelect(sel, data.categoria || (isSaida ? 'Cesta Básica' : ''));
        sel.onchange = () => aoTrocarEditCategoria();
        // Subitem começa oculto
        ocultarEditSubitem();
      }
    } catch (e) { console.error(e); }
  })();
  setValue('editQuantidade', isEntrada ? data.quantidade : data.qtd);
  // Preenche unidade no <select>; se não existir, adiciona opção temporária
  (function() {
    const sel = document.getElementById('editUnidade');
    if (!sel) return setValue('editUnidade', data.unidade || (isSaida ? 'cx' : ''));
    const target = String(data.unidade || (isSaida ? 'cx' : '') || '').toLowerCase();
    if (!target) { sel.value = ''; return; }
    let found = false;
    for (const opt of sel.options) {
      if (String(opt.value).toLowerCase() === target) { sel.value = opt.value; found = true; break; }
    }
    if (!found) {
      const o = document.createElement('option');
      o.value = target; o.textContent = target; sel.appendChild(o); sel.value = target;
    }
  })();
  setValue('editCampanha', data.campanha || '');
  setValue('editObs', data.obs || '');
  setValue('editFamiliaId', data.familia_id || '');
  setValue('editResponsavel', data.responsavel || '');
  // Mostrar / ocultar grupos
  toggleDisplay('grpEditDoador', isEntrada);
  toggleDisplay('grpEditFamilia', isSaida);
  toggleDisplay('grpEditResponsavel', isSaida);
}

function fecharEditarMovModal() {
  if (!modalEditarMov) return;
  modalEditarMov.classList.remove('mostrar');
  modalEditarMov.classList.add('saindo');
  const done = () => {
    modalEditarMov.style.display = 'none';
    modalEditarMov.classList.remove('saindo');
  };
  setTimeout(done, 200);
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val == null ? '' : val;
}
function toggleDisplay(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}

// Envio do formulário de edição
async function onSubmitEditarMov(e) {
  e.preventDefault();
  // Confirmação antes de prosseguir com alteração
  if (!confirm('Deseja salvar as alterações desta movimentação?')) {
    return; // usuário cancelou
  }
  const modo = document.getElementById('editMovTipo')?.value;
  const id = Number(document.getElementById('editMovId')?.value);

  const data = document.getElementById('editData')?.value; 
  const obs = document.getElementById('editObs')?.value || null;
  if (modo === 'entrada') {
    const doador = document.getElementById('editDoador')?.value;
    const selCat = document.getElementById('editCategoria');
    const catOpt = selCat?.querySelector('option:checked');
    const catTipo = catOpt?.dataset?.tipo || 'simples';
    const quantidade = Number(document.getElementById('editQuantidade')?.value);
  const unidade = (document.getElementById('editUnidade')?.value || '').toLowerCase();
    const campanha = document.getElementById('editCampanha')?.value || null;
    let categoriaNome = '';
    if (catTipo === 'compra' || catTipo === 'simples') {
      categoriaNome = catOpt?.dataset?.nome || '';
    } else if (catTipo === 'composta') {
      categoriaNome = document.getElementById('editItemCategoria')?.value || '';
    }
    if (!data || !doador || !categoriaNome || !unidade || !Number.isFinite(quantidade)) {
      return alert('Preencha os campos obrigatórios');
    }
    // Preserva campos não editados na UI (tipo/fornecedor/forma_pagamento/solicitacao_id)
    const original = entradas.find(e => e.idEntrada === id) || {};
    const tipo = original.tipo || 'doacao';
    const fornecedor = original.fornecedor ?? null;
    const forma_pagamento = original.forma_pagamento ?? null;
    const solicitacao_id = original.solicitacao_id ?? null;
    const r = await fetch(`/api/entradas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, doador, categoria: categoriaNome, quantidade, unidade, campanha, obs, tipo, fornecedor, forma_pagamento, solicitacao_id })
    });
    if (!r.ok) return alert('Falha ao atualizar entrada');
  } else if (modo === 'saida') {
    const familia_id = Number(document.getElementById('editFamiliaId')?.value);
    const responsavel = document.getElementById('editResponsavel')?.value;
    const qtd = Number(document.getElementById('editQuantidade')?.value);
    if (!data || !Number.isInteger(familia_id) || !responsavel || !Number.isInteger(qtd) || qtd <= 0) {
      return alert('Preencha os campos válidos para saída');
    }
    const r = await fetch(`/api/saidas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, familia_id, responsavel, qtd, obs })
    });
    if (!r.ok) {
      const msg = await r.text();
      return alert('Falha ao atualizar saída: ' + msg);
    }
  } else {
    return alert('Modo inválido');
  }
  fecharEditarMovModal();
  await reloadAfterChange();
}

// ------- Categoria/Itens no modal de edição (Entrada) -------
async function editCategoriasSelect(selectEl, currentCategoriaNome){
  try {
    const r = await fetch(`/api/categorias?limit=1000`);
    if (!r.ok) throw new Error('Falha ao carregar categorias');
    const payload = await r.json();
    const cats = Array.isArray(payload) ? payload : (payload.data || []);
    selectEl.innerHTML = '<option value="">Selecione...</option>';
    cats.slice().sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(c => {
      const id = String(c.id ?? c.id_categoria ?? '');
      const nome = c.nome;
      const tipo = String(c.tipo || 'simples').toLowerCase();
      const opt = document.createElement('option');
      opt.value = id || nome;
      opt.textContent = nome;
      opt.dataset.nome = nome;
      opt.dataset.tipo = tipo;
      selectEl.appendChild(opt);
    });
    // Adiciona opção dinâmica com o valor atual, se houver e não existir match direto
    if (currentCategoriaNome) {
      let matched = false;
      for (const o of selectEl.options) {
        if (String(o.dataset?.nome || '').toLowerCase() === String(currentCategoriaNome).toLowerCase()) { matched = true; selectEl.value = o.value; break; }
      }
      if (!matched) {
        const o = document.createElement('option');
        o.value = `__current__${currentCategoriaNome}`;
        o.textContent = currentCategoriaNome;
        o.dataset.nome = currentCategoriaNome;
        o.dataset.tipo = 'simples';
        selectEl.appendChild(o);
        selectEl.value = o.value;
      }
    }
  } catch (e) { console.error(e); }
}

function ocultarEditSubitem(){
  const grp = document.getElementById('grpEditItemCategoria');
  const sel = document.getElementById('editItemCategoria');
  if (grp) grp.classList.add('hidden');
  if (sel) {
    sel.required = false;
    sel.innerHTML = '<option value="">Selecione o item</option>';
  }
}

async function carregarEditSubitens(categoriaId){
  const sel = document.getElementById('editItemCategoria');
  if (!sel || !categoriaId) return;
  try {
    sel.innerHTML = '<option value="">Carregando...</option>';
    const r = await fetch(`/api/categorias/${categoriaId}/itens`);
    const itens = r.ok ? await r.json() : [];
    sel.innerHTML = '<option value="">Selecione o item</option>';
    itens.forEach(it => {
      const o = document.createElement('option');
      o.value = it.nome;
      o.textContent = it.nome;
      sel.appendChild(o);
    });
  } catch (e) { console.error(e); }
}

function aoTrocarEditCategoria(){
  const sel = document.getElementById('editCategoria');
  const opt = sel?.querySelector('option:checked');
  const tipo = opt?.dataset?.tipo || 'simples';
  const idVal = opt?.value || '';
  if (tipo === 'composta'){
    const grp = document.getElementById('grpEditItemCategoria');
    const itemSel = document.getElementById('editItemCategoria');
    if (grp) grp.classList.remove('hidden');
    if (itemSel) itemSel.required = true;
    carregarEditSubitens(idVal);
  } else {
    ocultarEditSubitem();
  }
}
