let entradas = [];
let pageEntradas = 1;
const limitEntradas = 30;
let totalEntradas = 0;

// Cache de categorias (id -> { id, nome, tipo })
const cacheCategorias = new Map();

// Utilidades e validações
const onlyDigits = (v) => (v || "").replace(/\D/g, "");
const unidadesValidas = new Set([
  "un",
  "kg",
  "g",
  "l",
  "ml",
  "cx",
  "pct",
  "sac",
  "kit",
  "lata",
]);
const normalizaUnidade = (v) => (v || "").trim().toLowerCase();
const validaUnidade = (v) => unidadesValidas.has(normalizaUnidade(v));
const validaQuantidade = (v) => {
  const n = Number(v);

  return Number.isInteger(n) && n >= 1;
};
const todayYYYYMMDD = () => {
  const d = new Date();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");

  return `${d.getFullYear()}-${mm}-${dd}`;
};
const validaData = (dStr) => {
  if (!dStr) return false;
  const hoje = new Date(todayYYYYMMDD());
  const dt = new Date(dStr);

  if (Number.isNaN(dt.getTime())) return false;

  return dt <= hoje;
};
const validaTextoMin = (v, n) => (v || "").trim().length >= n;
const formatDateDDMMYY = (dStr) => {
  const d = new Date(dStr);
  if (Number.isNaN(d.getTime())) return "-";
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
};

// Renderiza a tabela
function renderTabelaEntradas() {
  const tbody = document.querySelector("#tabelaEntradas tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  entradas
    .filter((e) => Number(e.quantidade || 0) > 0)
    .forEach((e) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${e.id}</td>
            <td>${formatDateDDMMYY(e.data)}</td>
            <td>${e.tipo || 'doacao'}</td>
            <td>${e.doador || '-'}</td>
            <td>${e.fornecedor || '-'}</td>
            <td>${e.categoria}</td>
            <td>${e.quantidade}</td>
            <td>${e.unidade}</td>
            <td>${e.campanha || '-'}</td>
            <td>${e.obs || '-'}</td>`;
      tbody.appendChild(tr);
    });
}

// Abre o modal e preenche o formulário
function abrirModalEntrada(editar = false, item = {}) {
  const modal = document.getElementById("modalEntrada");

  modal.classList.remove("saindo");
  modal.style.display = "block";
  void modal.offsetWidth;
  modal.classList.add("mostrar");

  document.getElementById("tituloModalEntrada").textContent = editar
    ? "Editar Entrada"
    : "Adicionar Entrada";
  document.getElementById("entradaId").value = item.id || "";
  document.getElementById("dataEntrada").value = item.data || "";
  document.getElementById("tipoEntrada").value = item.tipo || "doacao";
  document.getElementById("doadorEntrada").value = item.doador || "";
  document.getElementById("categoriaEntrada").value = item.categoria || "";
  document.getElementById("quantidadeEntrada").value = item.quantidade || "";
  document.getElementById("unidadeEntrada").value = item.unidade || "";
  document.getElementById("campanhaEntrada").value = item.campanha || "";
  document.getElementById("obsEntrada").value = item.obs || "";
  document.getElementById("fornecedorEntrada").value = item.fornecedor || "";
  document.getElementById("formaPagamentoEntrada").value = item.forma_pagamento || "";
  document.getElementById("solicitacaoRefEntrada").value = item.solicitacao_id || "";

  toggleCamposPorTipo(document.getElementById("tipoEntrada").value);
  // Reinicia subitem (sempre oculto ao abrir)
  if (typeof ocultarSubitem === 'function') ocultarSubitem();

  // Limpar mensagens de validação anteriores
  [
    "dataEntrada",
    "doadorEntrada",
    "categoriaEntrada",
    "quantidadeEntrada",
    "unidadeEntrada",
    "fornecedorEntrada",
    "formaPagamentoEntrada",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.setCustomValidity("");
  });
}

// Fecha o modal (fade-out) aguardando o fim da transição
function fecharModalEntrada() {
  const modal = document.getElementById("modalEntrada");

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

  if (content) {
    content.addEventListener("transitionend", onEnd);
  } else {
    setTimeout(done, 240);
  }
}

// Abrir/fechar modal
const btnAddEntrada = document.getElementById("btnAdicionarEntrada");
if (btnAddEntrada) btnAddEntrada.onclick = () => abrirModalEntrada();

document.getElementById("fecharModalEntrada").onclick = fecharModalEntrada;
document.getElementById("fecharModalEntradaBtn").onclick = fecharModalEntrada;

// Fecha o modal ao clicar fora do conteúdo
document.addEventListener('click', (event) => {
  const modal = document.getElementById("modalEntrada");
  if (event.target === modal) fecharModalEntrada();
});

function toggleCamposPorTipo(tipo) {
  const isCompra = tipo === 'compra';
  const camposCompra = document.getElementById('camposCompra');
  const campoDoador = document.getElementById('campoDoador');
  if (camposCompra) camposCompra.style.display = isCompra ? '' : 'none';
  if (campoDoador) campoDoador.style.display = isCompra ? 'none' : '';
  // Requireds
  const doadorEl = document.getElementById('doadorEntrada');
  const fornEl = document.getElementById('fornecedorEntrada');
  const formaEl = document.getElementById('formaPagamentoEntrada');
  if (doadorEl) doadorEl.required = !isCompra;
  if (fornEl) fornEl.required = isCompra;
  if (formaEl) formaEl.required = isCompra;
}

const tipoEntradaEl = document.getElementById('tipoEntrada');
if (tipoEntradaEl) {
  tipoEntradaEl.addEventListener('change', (e) => toggleCamposPorTipo(e.target.value));
}

async function loadSolicitacoesAprovadas(selectEl) {
  if (!selectEl) return;
  try {
    const r = await fetch('/api/solicitacoes?limit=1000');
    if (!r.ok) throw new Error('Falha ao carregar solicitações');
    const payload = await r.json();
    const lista = Array.isArray(payload) ? payload : (payload.data || []);
    const aprovadas = lista.filter(s => String(s.status || '').toLowerCase() === 'aprovado' || String(s.status || '').toLowerCase() === 'em compra');
    selectEl.innerHTML = '<option value="">Não vincular</option>';
    aprovadas.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `#${s.id} - ${s.titulo} (${s.quantidade || ''} ${s.unidade || ''})`;
      selectEl.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
  }
}

// Submit do formulário
const formEntrada = document.getElementById("formEntrada");
formEntrada.onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("entradaId").value;
  const data = document.getElementById("dataEntrada").value;
  const tipo = document.getElementById("tipoEntrada").value;
  const doador = document.getElementById("doadorEntrada").value;
  const categoria = document.getElementById("categoriaEntrada").value;
  const categoriaOpt = document.querySelector('#categoriaEntrada option:checked');
  const categoriaTipo = categoriaOpt?.dataset?.tipo || 'simples';
  const quantidadeStr = document.getElementById("quantidadeEntrada").value;
  const unidadeRaw = document.getElementById("unidadeEntrada").value;
  const campanha = document.getElementById("campanhaEntrada").value;
  const obs = document.getElementById("obsEntrada").value;
  const fornecedor = document.getElementById("fornecedorEntrada").value;
  const forma_pagamento = document.getElementById("formaPagamentoEntrada").value;
  const solicitacao_id = document.getElementById("solicitacaoRefEntrada").value || null;

  // Validações
  const dataOk = validaData(data);
  const doadorOk = tipo === 'doacao' ? validaTextoMin(doador, 2) : true;
  const categoriaOk = validaTextoMin(categoria, 1);
  const itemOk = (categoriaTipo === 'composta') ? validaTextoMin(itemEntradaEl?.value || '', 1) : true;
  const qtdOk = validaQuantidade(quantidadeStr);
  const unidadeOk = validaUnidade(unidadeRaw);
  const fornecedorOk = tipo === 'compra' ? validaTextoMin(fornecedor, 2) : true;
  const formaOk = tipo === 'compra' ? validaTextoMin(forma_pagamento, 2) : true;

  const dataEl = document.getElementById("dataEntrada");
  const doadorEl = document.getElementById("doadorEntrada");
  const categoriaEl = document.getElementById("categoriaEntrada");
  const quantidadeEl = document.getElementById("quantidadeEntrada");
  const unidadeEl = document.getElementById("unidadeEntrada");
  const fornecedorEl = document.getElementById("fornecedorEntrada");
  const formaEl = document.getElementById("formaPagamentoEntrada");

  dataEl.setCustomValidity(dataOk ? "" : "Informe uma data válida (não futura)");
  doadorEl.setCustomValidity(doadorOk ? "" : "Informe o nome do doador");
  categoriaEl.setCustomValidity(categoriaOk ? "" : "Informe a categoria");
  if (itemEntradaEl) itemEntradaEl.setCustomValidity(itemOk ? '' : 'Selecione o item');
  quantidadeEl.setCustomValidity(qtdOk ? "" : "Quantidade deve ser inteiro >= 1");
  unidadeEl.setCustomValidity(
    unidadeOk ? "" : "Unidade inválida. Use: un, kg, g, l, ml, cx, pct, sac, kit, lata"
  );
  if (fornecedorEl) fornecedorEl.setCustomValidity(fornecedorOk ? '' : 'Informe o fornecedor');
  if (formaEl) formaEl.setCustomValidity(formaOk ? '' : 'Selecione a forma de pagamento');

  if (!(dataOk && doadorOk && categoriaOk && itemOk && qtdOk && unidadeOk && fornecedorOk && formaOk)) {
    formEntrada.reportValidity();
    return;
  }

  const quantidade = parseInt(quantidadeStr, 10);
  const unidade = normalizaUnidade(unidadeRaw);

  (async () => {
    try {
      const categoriaNome = (categoriaTipo === 'composta')
        ? (itemEntradaEl?.value || '')
        : (categoriaOpt?.dataset?.nome || '');

      const payload = {
        data,
        tipo,
        doador,
        categoria: categoriaNome,
        quantidade,
        unidade,
        campanha,
        obs,
        fornecedor,
        forma_pagamento,
        solicitacao_id: solicitacao_id ? Number(solicitacao_id) : null,
      };
      if (id) {
        await fetch(`/api/entradas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/entradas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      fecharModalEntrada();
      await loadEntradas();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar entrada");
    }
  })();
};

// Listeners de validação
const dataEntradaEl = document.getElementById("dataEntrada");
if (dataEntradaEl) {
  dataEntradaEl.addEventListener("change", (e) => {
    e.target.setCustomValidity(validaData(e.target.value) ? "" : "Informe uma data válida (não futura)");
  });
}
const doadorEntradaEl = document.getElementById("doadorEntrada");
if (doadorEntradaEl) {
  doadorEntradaEl.addEventListener("input", (e) => {
    e.target.setCustomValidity(validaTextoMin(e.target.value, 2) ? "" : "Informe o nome do doador");
  });
}
const categoriaEntradaEl = document.getElementById("categoriaEntrada");
const campoItemCategoria = document.getElementById('campoItemCategoria');
const itemEntradaEl = document.getElementById('itemEntrada');
async function categoriasSelect(selectEl) {
  try {
    const r = await fetch(`/api/categorias?limit=1000`);
    if (!r.ok) throw new Error("Falha ao carregar categorias");
    const payload = await r.json();
    const cats = Array.isArray(payload) ? payload : (payload.data || []);
    cacheCategorias.clear();
    selectEl.innerHTML = '<option value="" disabled selected>Selecione uma categoria</option>';
    cats
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((c) => {
        const id = String(c.id ?? c.id_categoria ?? '');
        const nome = c.nome;
        const tipo = String(c.tipo || 'simples').toLowerCase();
        if (id) cacheCategorias.set(id, { id, nome, tipo });
        const opt = document.createElement("option");
        opt.value = id || nome; // preferir id (para buscar subitens), fallback nome
        opt.textContent = nome;
        opt.dataset.nome = nome;
        opt.dataset.tipo = tipo;
        selectEl.appendChild(opt);
      });
  } catch (err) {
    console.error(err);
  }
}
function ocultarSubitem(){
  if (campoItemCategoria) campoItemCategoria.style.display = 'none';
  if (itemEntradaEl){
    itemEntradaEl.required = false;
    itemEntradaEl.innerHTML = '<option value="" disabled selected>Selecione o item</option>';
  }
}

async function carregarSubitens(categoriaId){
  if (!itemEntradaEl || !categoriaId) return;
  try {
    itemEntradaEl.innerHTML = '<option value="" disabled selected>Carregando...</option>';
    const r = await fetch(`/api/categorias/${categoriaId}/itens`);
    const itens = r.ok ? await r.json() : [];
    itemEntradaEl.innerHTML = '<option value="" disabled selected>Selecione o item</option>';
    itens.forEach(it => {
      const opt = document.createElement('option');
      opt.value = it.nome; // enviaremos o nome do subitem como categoria
      opt.textContent = it.nome;
      itemEntradaEl.appendChild(opt);
    });
  } catch (err) { console.error(err); }
}

function aoTrocarCategoria(){
  const opt = document.querySelector('#categoriaEntrada option:checked');
  const tipo = opt?.dataset?.tipo || 'simples';
  const idVal = opt?.value || '';
  if (tipo === 'composta'){
    if (campoItemCategoria) campoItemCategoria.style.display = '';
    if (itemEntradaEl) itemEntradaEl.required = true;
    carregarSubitens(idVal);
  } else {
    ocultarSubitem();
  }
}

if (categoriaEntradaEl) {
  categoriasSelect(categoriaEntradaEl);
  categoriaEntradaEl.addEventListener("change", (e) => {
    e.target.setCustomValidity(validaTextoMin(e.target.value, 1) ? "" : "Informe a categoria");
    aoTrocarCategoria();
  });
}
const quantidadeEntradaEl = document.getElementById("quantidadeEntrada");
if (quantidadeEntradaEl) {
  quantidadeEntradaEl.addEventListener("input", (e) => {
    const d = onlyDigits(e.target.value).replace(/^0+/, "");
    e.target.value = d;
    e.target.setCustomValidity(validaQuantidade(e.target.value) ? "" : "Quantidade deve ser inteiro >= 1");
  });
}
const unidadeEntradaEl = document.getElementById("unidadeEntrada");
if (unidadeEntradaEl) {
  unidadeEntradaEl.addEventListener("input", (e) => {
    e.target.value = normalizaUnidade(e.target.value);
    e.target.setCustomValidity(
      validaUnidade(e.target.value) ? "" : "Unidade inválida. Use: un, kg, g, l, ml, cx, pct, sac, kit, lata"
    );
  });
}

// Paginação e carga
function updatePaginacaoEntradasInfo() {
  const info = document.getElementById("infoEntradas");
  if (!info) return;
  const totalPages = Math.max(1, Math.ceil(totalEntradas / limitEntradas));
  info.textContent = `Página ${pageEntradas} de ${totalPages}`;
  const prev = document.getElementById("prevEntradas");
  const next = document.getElementById("nextEntradas");
  if (prev) prev.disabled = pageEntradas <= 1;
  if (next) next.disabled = pageEntradas >= totalPages;
}

async function loadEntradas() {
  try {
    const r = await fetch(`/api/entradas?page=${pageEntradas}&limit=${limitEntradas}`);
    if (!r.ok) {
      if (r.status === 401) {
        alert("Sessão expirada. Faça login.");
        window.location.href = "login_page.html";
        return;
      }
      throw new Error("Falha ao carregar entradas");
    }
    const payload = await r.json();
    const data = Array.isArray(payload) ? payload : (payload.data || []);
    totalEntradas = (Array.isArray(payload) ? data.length : (payload.total ?? data.length)) || 0;
    entradas = data;
    renderTabelaEntradas();
    updatePaginacaoEntradasInfo();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar entradas");
  }
}

const prevBtnE = document.getElementById("prevEntradas");
const nextBtnE = document.getElementById("nextEntradas");
if (prevBtnE) prevBtnE.addEventListener("click", async () => { if (pageEntradas > 1) { pageEntradas--; await loadEntradas(); }});
if (nextBtnE) nextBtnE.addEventListener("click", async () => {
  const totalPages = Math.max(1, Math.ceil(totalEntradas / limitEntradas));
  if (pageEntradas < totalPages) { pageEntradas++; await loadEntradas(); }
});

// Inicialização
toggleCamposPorTipo(document.getElementById('tipoEntrada')?.value || 'doacao');
const solicitacaoRefEl = document.getElementById('solicitacaoRefEntrada');
if (solicitacaoRefEl) { loadSolicitacoesAprovadas(solicitacaoRefEl); }
loadEntradas();
