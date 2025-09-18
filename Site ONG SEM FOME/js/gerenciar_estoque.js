let entradas = [];
let estoque = [];
let estoqueFiltrado = [];
let movimentos = [];

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
  entradas = Array.isArray(payload) ? payload : (payload.data || []);
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
      id: e.id,
      data: e.data,
      doador: e.doador,
      quantidade: qtd,
      unidade: e.unidade,
      campanha: e.campanha,
      obs: e.obs,
    });
    map.set(key, atual);
  });
  estoque = Array.from(map.values())
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.unidade.localeCompare(b.unidade));
}

// Constrói lista de movimentações cronológicas com saldo por (categoria, unidade)
function buildMovimentos(list) {
  const sorted = list.slice().sort((a, b) => {
    // order by date desc, then created_at desc, then id desc (newest first)
    const ad = (b.data || '').localeCompare(a.data || '');
    if (ad !== 0) return ad;
    const ta = parseDateTime(a.criado_em);
    const tb = parseDateTime(b.criado_em);
    if (ta && tb && ta.getTime() !== tb.getTime()) return tb - ta;
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return (b.id || 0) - (a.id || 0);
  });
  const saldo = new Map();
  // To compute running balance correctly per category/unidade we need chronological ascending per cat/unid;
  // we'll compute saldo using an ascending copy for accuracy, then map saldo back to sorted order by matching key+id sequence.
  const asc = list.slice().sort((a, b) => {
    const ad = (a.data || '').localeCompare(b.data || '');
    if (ad !== 0) return ad;
    const ta = parseDateTime(a.criado_em);
    const tb = parseDateTime(b.criado_em);
    if (ta && tb && ta.getTime() !== tb.getTime()) return ta - tb;
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return (a.id || 0) - (b.id || 0);
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
    saldoPorMov.set(`${key}__${e.id}`, novo);
  });
  movimentos = sorted.map((e) => {
    const cat = String(e.categoria || '').trim();
    const un = String(e.unidade || '').trim().toLowerCase();
    const key = `${cat.toLowerCase()}__${un}`;
    const qtd = Number(e.quantidade) || 0;
    const novo = saldoPorMov.get(`${key}__${e.id}`) ?? qtd; // fallback
    const tipo = qtd >= 0 ? 'Entrada' : 'Saída';
    return {
      id: e.id,
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
  const q = (document.getElementById('filtroBusca')?.value || '').trim().toLowerCase();
  const list = movimentos.filter((m) => {
    const matchCat = !cat || m.categoria === cat;
    const matchUnd = !und || m.unidade === und;
    const matchCamp = !camp || (m.campanha || '-') === camp;
    const matchTipo = !tipo || m.tipo === tipo;
    const matchBusca = !q ||
      m.categoria.toLowerCase().includes(q) ||
      m.unidade.toLowerCase().includes(q) ||
      (m.obs || '').toLowerCase().includes(q) ||
      (m.doador || '').toLowerCase().includes(q) ||
      (m.campanha || '').toLowerCase().includes(q);
    return matchCat && matchUnd && matchCamp && matchTipo && matchBusca;
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
      <td>${m.doador}</td>
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

// CRUD helpers
async function editarEntrada(id) {
  const item = entradas.find(e => e.id === id);
  if (!item) return alert('Entrada não encontrada');
  const data = prompt('Data (YYYY-MM-DD):', item.data);
  if (!data) return;
  const doador = prompt('Doador:', item.doador);
  if (doador == null) return;
  const categoria = prompt('Categoria:', item.categoria);
  if (!categoria) return;
  const quantidadeStr = prompt('Quantidade:', String(item.quantidade));
  if (quantidadeStr == null) return;
  const quantidade = Number(quantidadeStr);
  if (!Number.isFinite(quantidade)) return alert('Quantidade inválida');
  const unidade = prompt('Unidade:', item.unidade);
  if (!unidade) return;
  const campanha = prompt('Campanha (opcional):', item.campanha || '');
  const obs = prompt('Observações (opcional):', item.obs || '');
  const r = await fetch(`/api/entradas/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, doador, categoria, quantidade, unidade, campanha: campanha || null, obs: obs || null })
  });
  if (!r.ok) return alert('Falha ao atualizar entrada');
  await reloadAfterChange();
}

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

async function editarSaidaByEntradaId(entradaId) {
  const ent = entradas.find(e => e.id === entradaId);
  if (!ent) return alert('Movimentação não encontrada');
  const saidaId = parseSaidaIdFromObs(ent.obs);
  if (!saidaId) return alert('Vínculo da saída não encontrado');
  const r = await fetch(`/api/saidas/${saidaId}`);
  if (!r.ok) return alert('Falha ao carregar saída');
  const s = await r.json();
  const data = prompt('Data (YYYY-MM-DD):', s.data);
  if (!data) return;
  const familia_id_str = prompt('ID da família:', String(s.familia_id || ''));
  const familia_id = Number(familia_id_str);
  if (!Number.isInteger(familia_id)) return alert('Família inválida');
  const responsavel = prompt('Responsável:', s.responsavel || '');
  if (!responsavel) return;
  const qtdStr = prompt('Quantidade de cestas:', String(s.qtd || ''));
  const qtd = Number(qtdStr);
  if (!Number.isInteger(qtd) || qtd <= 0) return alert('Quantidade inválida');
  const obs = prompt('Observações (opcional):', s.obs || '');
  const r2 = await fetch(`/api/saidas/${saidaId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, familia_id, responsavel, qtd, obs: obs || null })
  });
  if (!r2.ok) {
    const msg = await r2.text();
    return alert('Falha ao atualizar saída: ' + msg);
  }
  await reloadAfterChange();
}

async function excluirSaidaByEntradaId(entradaId) {
  const ent = entradas.find(e => e.id === entradaId);
  if (!ent) return alert('Movimentação não encontrada');
  const saidaId = parseSaidaIdFromObs(ent.obs);
  if (!saidaId) return alert('Vínculo da saída não encontrado');
  if (!confirm('Excluir esta saída? O estoque será reajustado.')) return;
  const r = await fetch(`/api/saidas/${saidaId}`, { method: 'DELETE' });
  if (r.status !== 204) return alert('Falha ao excluir saída');
  await reloadAfterChange();
}

async function reloadAfterChange() {
  const r = await fetch('/api/entradas?limit=10000');
  if (!r.ok) return location.reload();
  const payload = await r.json();
  entradas = Array.isArray(payload) ? payload : (payload.data || []);
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
    tr.innerHTML = `
      <td>${formatDate(e.data)}</td>
      <td>${e.doador || '-'}</td>
      <td>${e.quantidade}</td>
      <td>${(e.unidade || '').toLowerCase()}</td>
      <td>${e.campanha || '-'}</td>
      <td>${e.obs || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

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
// Pagination controls
const prevEstoqueBtn = document.getElementById('prevEstoque');
const nextEstoqueBtn = document.getElementById('nextEstoque');
const prevDetalhesBtn = document.getElementById('prevDetalhes');
const nextDetalhesBtn = document.getElementById('nextDetalhes');
const prevMovBtn = document.getElementById('prevMov');
const nextMovBtn = document.getElementById('nextMov');
// Details modal filter elements
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
if (movClear) movClear.addEventListener('click', () => {
  if (movCat) movCat.value = '';
  if (movUnd) movUnd.value = '';
  if (movCamp) movCamp.value = '';
  if (movTipo) movTipo.value = '';
  pageMov = 1;
  renderMovimentacoes();
});
// Mov per-page selector
if (movPerPage) movPerPage.addEventListener('change', () => {
  const v = Number(movPerPage.value);
  if (Number.isInteger(v) && v > 0) {
    limitMov = v;
    pageMov = 1;
    renderMovimentacoes();
  }
});
// Details modal filters listeners
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
};

// Inicializa
loadEntradasForEstoque();
