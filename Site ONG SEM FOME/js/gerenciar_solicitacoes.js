let solicitacoes = [];
let pageSolic = 1;
const limitSolic = 30;
let totalSolic = 0;
let filtros = { de: '', ate: '', status: '', prioridade: '', busca: '' };
let categoriasCarregadas = false;
let colaboradoresCache = null;
const helpSolicitacoesSteps = [
  {
    titulo: "1. Abrir o formulário",
    descricao:
      "Clique em \"Adicionar Solicitação\" para iniciar um novo registro.",
  },
  {
    titulo: "2. Descrever o pedido",
    descricao:
      "Informe título, categoria (e item, se aplicável), quantidade e unidade do que precisa ser comprado.",
  },
  {
    titulo: "3. Definir status e prioridade",
    descricao:
      "Escolha o status atual (ex.: pendente, aprovado) e a prioridade para orientar o time de compras.",
  },
  {
    titulo: "4. Salvar e acompanhar",
    descricao:
      "Clique em \"Salvar\". Use os filtros da tabela para acompanhar o andamento das solicitações.",
  },
];
let helpSolicitacoesStepIndex = 0;
// Cache de categorias (id -> { id, nome, tipo })
const cacheCategorias = new Map();

function formatDateDDMMYY(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

// Helpers de normalização para preencher campos
function toDateInputValue(v) {
  if (!v) return '';
  // Já no formato correto
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  const d = new Date(v);
  if (isNaN(d)) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function setSelectValue(selectId, value) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const target = (value ?? '').toString().trim().toLowerCase();
  if (!target) {
    sel.value = '';
    return;
  }
  const normaliza = (v) => (v || '').toString().trim().toLowerCase();
  for (const opt of sel.options) {
    if (opt.value.toLowerCase() === target) {
      sel.value = opt.value;
      return;
    }
  }
  for (const opt of sel.options) {
    const nome = normaliza(opt.dataset?.nome || opt.textContent || opt.value);
    if (nome === target) {
      sel.value = opt.value;
      return;
    }
  }
  // Se não encontrou e for unidade, adiciona opção dinâmica para exibir o valor do banco
  if ((selectId === 'unidadeSolicitacao') && target) {
    const o = document.createElement('option');
    o.value = target;
    o.textContent = target;
    sel.appendChild(o);
    sel.value = target;
  }
}

function aplicaFiltros(lista) {
  const de = filtros.de ? new Date(filtros.de) : null;
  const ate = filtros.ate ? new Date(filtros.ate) : null;
  const status = (filtros.status || '').toLowerCase();
  const prioridade = (filtros.prioridade || '').toLowerCase();
  const busca = (filtros.busca || '').trim().toLowerCase();
  return lista.filter(s => {
    // Data
    if (de || ate) {
      const sd = s.data_solicitacao ? new Date(s.data_solicitacao) : null;
      if (!sd) return false;
      if (de && sd < de) return false;
      if (ate) {
        const ateEnd = new Date(ate);
        ateEnd.setHours(23,59,59,999);
        if (sd > ateEnd) return false;
      }
    }
    // Status/prioridade
    if (status && String(s.status||'').toLowerCase() !== status) return false;
    if (prioridade && String(s.prioridade||'').toLowerCase() !== prioridade) return false;
    // Busca
    if (busca) {
      const blob = `${s.titulo || ''} ${s.solicitante_nome || s.solicitante || ''} ${s.item_nome || s.item || ''} ${s.categoria_nome || s.categoria || ''} ${s.descricao || ''}`.toLowerCase();
      if (!blob.includes(busca)) return false;
    }
    return true;
  });
}

// Renderiza a tabela com os dados
function renderTabelaSolicitacoes() {
  const tbody = document.querySelector("#tabelaSolicitacoes tbody");

  if (!tbody) return;

  tbody.innerHTML = "";
  const lista = aplicaFiltros(solicitacoes);
  lista.forEach((s) => {
    const tr = document.createElement("tr");
    const categoriaNome = s.categoria_nome || s.categoria || "";
    const itemNome = s.item_nome || s.item || "";
    const categoriaDisplay = categoriaNome && itemNome
      ? `${categoriaNome}: ${itemNome}`
      : (categoriaNome || itemNome || "");

    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.titulo}</td>
  <td>${formatDateDDMMYY(s.data_solicitacao)}</td>
  <td>${s.solicitante_nome || s.solicitante || '-'}</td>
  <td>${s.status || 'pendente'}</td>
  <td>${s.prioridade ? (()=>{ const p=String(s.prioridade).toLowerCase(); const cls = p==='urgente' ? 'badge-prioridade--urgente' : (p==='baixa' ? 'badge-prioridade--baixa' : 'badge-prioridade--normal'); return `<span class="badge ${cls}">${s.prioridade}</span>`; })() : ''}</td>
  <td>${(s.quantidade ?? '')}</td>
  <td>${s.unidade || ''}</td>
  <td>${categoriaDisplay}</td>
  <td>${s.descricao || '-'}</td>
  <td>${formatDateDDMMYY(s.atualizacao)}</td>
  <td>
  <button class="btn-edit" onclick="editarSolicitacao(${s.id})">Editar</button>
        <button class="btn-delete" onclick="excluirSolicitacao(${s.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function prepararSubitemEdicao(itemSelecionado = {}) {
  const alvoId = itemSelecionado?.id ?? '';
  const alvoNome = itemSelecionado?.nome ?? '';
  const opt = document.querySelector('#categoriaSolicitacao option:checked');
  const tipo = opt?.dataset?.tipo || 'simples';
  if (tipo === 'composta') {
    if (campoItemCategoria) campoItemCategoria.style.display = '';
    if (itemSolicitacaoEl) itemSolicitacaoEl.required = true;
    await carregarSubitens(opt?.value || '');
    if (itemSolicitacaoEl) {
      const alvoIdStr = alvoId ? String(alvoId) : '';
      let found = false;
      if (alvoIdStr) {
        for (const option of itemSolicitacaoEl.options) {
          if (option.value === alvoIdStr) {
            itemSolicitacaoEl.value = option.value;
            found = true;
            break;
          }
        }
      }
      if (!found && alvoNome) {
        const alvoLower = alvoNome.toLowerCase();
        for (const option of itemSolicitacaoEl.options) {
          const nomeOpt = (option.dataset?.nome || option.textContent || '').trim().toLowerCase();
          if (nomeOpt === alvoLower) {
            itemSolicitacaoEl.value = option.value;
            found = true;
            break;
          }
        }
      }
      if (!found && (alvoIdStr || alvoNome)) {
        const extra = document.createElement('option');
        extra.value = alvoIdStr || `legacy-${Date.now()}`;
        extra.textContent = alvoNome || 'Item indisponível';
        extra.dataset.nome = alvoNome || extra.textContent;
        itemSolicitacaoEl.appendChild(extra);
        itemSolicitacaoEl.value = extra.value;
      }
      if (!alvoIdStr && !alvoNome) {
        itemSolicitacaoEl.value = '';
      }
    }
  } else {
    ocultarSubitem();
  }
}

// Abre o modal e preenche o formulário
async function garantirColaboradoresSelect(selectedId = "", selectedNome = "") {
  const sel = document.getElementById("solicitanteSolicitacao");
  if (!sel) return;
  sel.disabled = true;
  try {
    if (!Array.isArray(colaboradoresCache)) {
      const r = await fetch('/api/colaboradores?limit=1000');
      if (!r.ok) throw new Error('Falha ao carregar colaboradores');
      const payload = await r.json();
      colaboradoresCache = Array.isArray(payload) ? payload : (payload.data || []);
    }
    const colaboradores = colaboradoresCache || [];
    const atualId = selectedId ? String(selectedId) : '';
    const atualNome = selectedNome || '';
    sel.innerHTML = '<option value="">Selecione o colaborador</option>';
    colaboradores
      .slice()
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
      .forEach((col) => {
        if (!col.nome) return;
        const idVal = String(col.id ?? col.id_colaborador ?? '').trim();
        if (!idVal) return;
        const opt = document.createElement('option');
        opt.value = idVal;
        opt.textContent = col.nome;
        opt.dataset.nome = col.nome;
        sel.appendChild(opt);
      });
    if (atualId) {
      const existe = colaboradores.some((c) => String(c.id ?? c.id_colaborador ?? '').trim() === atualId);
      if (!existe && atualNome) {
        const opt = document.createElement('option');
        opt.value = atualId;
        opt.textContent = `${atualNome} (inativo)`;
        opt.dataset.nome = atualNome;
        sel.appendChild(opt);
      }
      sel.value = atualId;
    } else if (atualNome) {
      const encontrado = colaboradores.find((c) => (c.nome || '').toLowerCase() === atualNome.toLowerCase());
      if (encontrado) {
        sel.value = String(encontrado.id ?? encontrado.id_colaborador);
      } else {
        const opt = document.createElement('option');
        opt.value = '__legacy__';
        opt.textContent = `${atualNome} (sem vínculo)`;
        opt.dataset.nome = atualNome;
        sel.appendChild(opt);
        sel.value = '__legacy__';
      }
    } else {
      sel.value = '';
    }
  } catch (err) {
    console.error('Erro ao carregar colaboradores', err);
    if (!sel.options.length) sel.innerHTML = '<option value="">Selecione o colaborador</option>';
    if (selectedNome) {
      const opt = document.createElement('option');
      opt.value = '__legacy__';
      opt.textContent = selectedNome;
      opt.dataset.nome = selectedNome;
      sel.appendChild(opt);
      sel.value = '__legacy__';
    }
  } finally {
    sel.disabled = false;
  }
}

function abrirModalSolicitacao(editar = false, item = {}) {
  const modal = document.getElementById("modalSolicitacao");

  modal.classList.remove("saindo");
  modal.style.display = "block";
  void modal.offsetWidth;
  modal.classList.add("mostrar");

  document.getElementById("tituloModalSolicitacao").textContent = editar
    ? "Editar Solicitação"
    : "Adicionar Solicitação";
  document.getElementById("solicitacaoId").value = item.id || "";
  document.getElementById("tituloSolicitacao").value = item.titulo || "";
  // mantém a data ISO diretamente, sem conversões, para preservar o valor
  document.getElementById("dataSolicitacao").value = toDateInputValue(item.data_solicitacao);
  // Aguarda categorias carregarem para não perder o valor
  const aplicaCategoria = async () => {
    const alvoCategoria = item.categoria_id ?? item.categoria ?? "";
    setSelectValue("categoriaSolicitacao", alvoCategoria);
    await prepararSubitemEdicao({
      id: item.item_id ?? null,
      nome: item.item_nome ?? item.item ?? "",
    });
  };
  if (!categoriasCarregadas) {
    const sel = document.getElementById("categoriaSolicitacao");
    if (sel) {
      categoriasSelect(sel).then(aplicaCategoria).catch(() => aplicaCategoria());
    } else {
      aplicaCategoria();
    }
  } else {
    aplicaCategoria();
  }
  garantirColaboradoresSelect(item.solicitante_id || "", item.solicitante_nome || item.solicitante || "");
  setSelectValue("statusSolicitacao", (item.status || 'pendente'));
  setSelectValue("prioridadeSolicitacao", (item.prioridade || 'normal'));
  document.getElementById("quantidadeValor").value = (item.quantidade ?? "");
  setSelectValue("unidadeSolicitacao", (item.unidade || ""));
  document.getElementById("descricaoSolicitacao").value = item.descricao || "";
}

// Fecha o modal (fade-out)
function fecharModalSolicitacao() {
  const modal = document.getElementById("modalSolicitacao");

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
document.getElementById("btnAdicionarSolicitacao").onclick = () =>
  abrirModalSolicitacao();

document.getElementById("fecharModalSolicitacao").onclick =
  fecharModalSolicitacao;

document.getElementById("fecharModalSolicitacaoBtn").onclick =
  fecharModalSolicitacao;

// Fecha o modal ao clicar fora do conteúdo
window.onclick = function (event) {
  const modalSolic = document.getElementById("modalSolicitacao");
  const modalHelp = document.getElementById("modalHelpSolicitacoes");
  if (event.target === modalSolic) fecharModalSolicitacao();
  if (event.target === modalHelp) fecharHelpSolicitacoes();
};

// Submit do formulário: valida campos e cria/atualiza
document.getElementById("formSolicitacao").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("solicitacaoId").value;
  const titulo = document.getElementById("tituloSolicitacao").value;
  const data_solicitacao = document.getElementById("dataSolicitacao").value;
  const categoriaOpt = document.querySelector('#categoriaSolicitacao option:checked');
  const categoriaTipo = categoriaOpt?.dataset?.tipo || 'simples';
  const categoriaIdRaw = categoriaOpt?.value || '';
  const categoriaIdNum = Number(categoriaIdRaw);
  const solicitanteRaw = document.getElementById("solicitanteSolicitacao").value;
  const status = document.getElementById("statusSolicitacao").value;
  const prioridade = document.getElementById("prioridadeSolicitacao").value;
  const quantidade = (document.getElementById("quantidadeValor").value || '').trim();
  const unidade = document.getElementById("unidadeSolicitacao").value || '';
  const descricao = document.getElementById("descricaoSolicitacao").value;
  const tituloOk = (titulo || "").trim().length >= 2;
  const categoriaOk = Number.isInteger(categoriaIdNum) && categoriaIdNum > 0;
  const itemSelecionadoRaw = (document.getElementById('itemSolicitacao')?.value || '').trim();
  const itemIdNum = itemSelecionadoRaw ? Number(itemSelecionadoRaw) : null;
  const itemOk = (categoriaTipo === 'composta') ? (Number.isInteger(itemIdNum) && itemIdNum > 0) : true;
  const solicitanteIdNum = solicitanteRaw ? Number(solicitanteRaw) : null;
  const solicitanteId = (Number.isInteger(solicitanteIdNum) && solicitanteIdNum > 0) ? solicitanteIdNum : null;

  document
    .getElementById("tituloSolicitacao")
    .setCustomValidity(tituloOk ? "" : "Informe o título");
  document
    .getElementById("categoriaSolicitacao")
    .setCustomValidity(categoriaOk ? "" : "Informe a categoria");
  const itemEl = document.getElementById('itemSolicitacao');
  if (itemEl) itemEl.setCustomValidity(itemOk ? '' : 'Selecione o item');

  if (!tituloOk || !categoriaOk || !itemOk) {
    document.getElementById("formSolicitacao").reportValidity();
    return;
  }
  (async () => {
    try {
      const itemId = (categoriaTipo === 'composta') ? (Number.isInteger(itemIdNum) && itemIdNum > 0 ? itemIdNum : null) : null;
      // Se há ID, atualiza; senão, cria
      const payload = {
        titulo,
        categoria_id: categoriaIdNum,
        item_id: itemId,
        descricao,
        data_solicitacao,
        solicitante_id: solicitanteId,
        status,
        prioridade,
        quantidade: quantidade ? Number(quantidade) : null,
        unidade,
      };
      if (id) {
        await fetch(`/api/solicitacoes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch("/api/solicitacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      fecharModalSolicitacao();
      await loadSolicitacoes();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar solicitação");
    }
  })();
};

// Modal em modo edição
window.editarSolicitacao = function (id) {
  const item = solicitacoes.find((f) => f.id == id);

  if (item) abrirModalSolicitacao(true, item);
};

// Confirma e exclui
window.excluirSolicitacao = function (id) {
  if (confirm("Tem certeza que deseja excluir esta solicitação?")) {
    (async () => {
      try {
        await fetch(`/api/solicitacoes/${id}`, {
          method: "DELETE",
        });
        await loadSolicitacoes();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir solicitação");
      }
    })();
  }
};

// Carrega solicitações
function updatePaginacaoSolicInfo() {
  const info = document.getElementById("infoSolicitacoes");
  if (!info) return;
  const totalPages = Math.max(1, Math.ceil(totalSolic / limitSolic));
  info.textContent = `Página ${pageSolic} de ${totalPages}`;
  const prev = document.getElementById("prevSolicitacoes");
  const next = document.getElementById("nextSolicitacoes");
  if (prev) prev.disabled = pageSolic <= 1;
  if (next) next.disabled = pageSolic >= totalPages;
}

async function loadSolicitacoes() {
  try {
    const r = await fetch(`/api/solicitacoes?page=${pageSolic}&limit=${limitSolic}`);
    if (!r.ok) {
      if (r.status === 401) {
        alert("Sessão expirada. Faça login.");
        window.location.href = "login_page.html";
        return;
      }
      throw new Error("Falha ao carregar solicitações");
    }
    const payload = await r.json();
    const data = Array.isArray(payload) ? payload : (payload.data || []);
    totalSolic = (Array.isArray(payload) ? data.length : (payload.total ?? data.length)) || 0;
    solicitacoes = data;
    renderTabelaSolicitacoes();
    updatePaginacaoSolicInfo();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar solicitações");
  }
}

// Eventos de paginação
const prevBtnS = document.getElementById("prevSolicitacoes");
const nextBtnS = document.getElementById("nextSolicitacoes");
if (prevBtnS) prevBtnS.addEventListener("click", async () => { if (pageSolic > 1) { pageSolic--; await loadSolicitacoes(); }});
if (nextBtnS) nextBtnS.addEventListener("click", async () => {
  const totalPages = Math.max(1, Math.ceil(totalSolic / limitSolic));
  if (pageSolic < totalPages) { pageSolic++; await loadSolicitacoes(); }
});

loadSolicitacoes();
garantirColaboradoresSelect();

// Help modal
const helpModalSolic = document.getElementById("modalHelpSolicitacoes");
const helpPrevSolic = document.getElementById("btnHelpPrevSolicitacoes");
const helpNextSolic = document.getElementById("btnHelpNextSolicitacoes");
const helpInfoSolic = document.getElementById("helpPassoInfoSolicitacoes");
const helpContentSolic = document.getElementById("helpSolicitacoesPassos");

function renderHelpSolicStep() {
  if (!helpContentSolic) return;
  const step = helpSolicitacoesSteps[helpSolicitacoesStepIndex];
  helpContentSolic.innerHTML = `
    <div class="help-step">
      <h3>${step.titulo}</h3>
      <p>${step.descricao}</p>
    </div>`;
  if (helpInfoSolic)
    helpInfoSolic.textContent = `Passo ${helpSolicitacoesStepIndex + 1} de ${helpSolicitacoesSteps.length}`;
  if (helpPrevSolic)
    helpPrevSolic.disabled = helpSolicitacoesStepIndex === 0;
  if (helpNextSolic)
    helpNextSolic.disabled = helpSolicitacoesStepIndex === helpSolicitacoesSteps.length - 1;
}

function abrirHelpSolicitacoes() {
  helpSolicitacoesStepIndex = 0;
  renderHelpSolicStep();
  if (!helpModalSolic) return;
  helpModalSolic.classList.remove("saindo");
  helpModalSolic.style.display = "block";
  void helpModalSolic.offsetWidth;
  helpModalSolic.classList.add("mostrar");
}

function fecharHelpSolicitacoes() {
  if (!helpModalSolic) return;
  helpModalSolic.classList.remove("mostrar");
  helpModalSolic.classList.add("saindo");
  const content = helpModalSolic.querySelector(".modal-conteudo");
  const done = () => {
    helpModalSolic.style.display = "none";
    helpModalSolic.classList.remove("saindo");
    if (content) content.removeEventListener("transitionend", onEnd);
  };
  const onEnd = (e) => {
    if (e.target === content) done();
  };
  if (content) content.addEventListener("transitionend", onEnd);
  else setTimeout(done, 240);
}

const btnHelpSolicitacoes = document.getElementById("btnHelpSolicitacoes");
if (btnHelpSolicitacoes) btnHelpSolicitacoes.addEventListener("click", abrirHelpSolicitacoes);
const fecharHelpSolicitacoesBtn = document.getElementById("fecharHelpSolicitacoes");
if (fecharHelpSolicitacoesBtn) fecharHelpSolicitacoesBtn.addEventListener("click", fecharHelpSolicitacoes);
if (helpPrevSolic)
  helpPrevSolic.addEventListener("click", () => {
    if (helpSolicitacoesStepIndex > 0) {
      helpSolicitacoesStepIndex--;
      renderHelpSolicStep();
    }
  });
if (helpNextSolic)
  helpNextSolic.addEventListener("click", () => {
    if (helpSolicitacoesStepIndex < helpSolicitacoesSteps.length - 1) {
      helpSolicitacoesStepIndex++;
      renderHelpSolicStep();
    }
  });

// Validações dos campos do formulário
const tituloInput = document.getElementById("tituloSolicitacao");

if (tituloInput) {
  tituloInput.addEventListener("input", (e) =>
    e.target.setCustomValidity(
      (e.target.value || "").trim().length >= 2 ? "" : "Informe o título"
    )
  );
}
const categoriaInput = document.getElementById("categoriaSolicitacao");

// Carrega categorias e preenche o <select>
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
        opt.value = id || nome; // preferir id para buscar subitens
        opt.textContent = nome;
        opt.dataset.nome = nome;
        opt.dataset.tipo = tipo;
        selectEl.appendChild(opt);
      });
    categoriasCarregadas = true;
    return cats;
  } catch (err) {
    console.error(err);
  }
}

if (categoriaInput) {
  categoriasSelect(categoriaInput);
  categoriaInput.addEventListener("change", (e) => {
    e.target.setCustomValidity(
      (e.target.value || "").trim().length >= 1 ? "" : "Informe a categoria"
    );
    if (typeof aoTrocarCategoria === 'function') aoTrocarCategoria();
  });
}

// Subitens: UI e carregamento
const campoItemCategoria = document.getElementById('campoItemCategoria');
const itemSolicitacaoEl = document.getElementById('itemSolicitacao');
function ocultarSubitem(){
  if (campoItemCategoria) campoItemCategoria.style.display = 'none';
  if (itemSolicitacaoEl){
    itemSolicitacaoEl.required = false;
    itemSolicitacaoEl.innerHTML = '<option value="" disabled selected>Selecione o item</option>';
    itemSolicitacaoEl.value = '';
  }
}

async function carregarSubitens(categoriaId){
  if (!itemSolicitacaoEl || !categoriaId) return;
  try {
    itemSolicitacaoEl.innerHTML = '<option value="" disabled selected>Carregando...</option>';
    const r = await fetch(`/api/categorias/${categoriaId}/itens`);
    const itens = r.ok ? await r.json() : [];
    itemSolicitacaoEl.innerHTML = '<option value="" disabled selected>Selecione o item</option>';
    itens.forEach(it => {
      const nome = it.nome || it.nome_item;
      const id = String(it.id ?? it.id_item ?? '')
        .trim();
      if (!id || !nome) return;
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = nome;
      opt.dataset.nome = nome;
      itemSolicitacaoEl.appendChild(opt);
    });
  } catch (err) { console.error(err); }
}

function aoTrocarCategoria(){
  const opt = document.querySelector('#categoriaSolicitacao option:checked');
  const tipo = opt?.dataset?.tipo || 'simples';
  const idVal = opt?.value || '';
  if (tipo === 'composta'){
    if (campoItemCategoria) campoItemCategoria.style.display = '';
    if (itemSolicitacaoEl) itemSolicitacaoEl.required = true;
    carregarSubitens(idVal);
  } else {
    ocultarSubitem();
  }
}

// Filtros
const fDe = document.getElementById('fltDataDe');
const fAte = document.getElementById('fltDataAte');
const fStatus = document.getElementById('fltStatus');
const fPrio = document.getElementById('fltPrioridade');
const fBusca = document.getElementById('fltBusca');
const fClear = document.getElementById('btnLimparFiltros');

function onFiltroChange() {
  filtros.de = fDe?.value || '';
  filtros.ate = fAte?.value || '';
  filtros.status = fStatus?.value || '';
  filtros.prioridade = fPrio?.value || '';
  filtros.busca = fBusca?.value || '';
  renderTabelaSolicitacoes();
}
[fDe, fAte, fStatus, fPrio, fBusca].forEach(el => el && el.addEventListener('input', onFiltroChange));
if (fClear) {
  fClear.addEventListener('click', (e) => {
    e.preventDefault();
    if (fDe) fDe.value = '';
    if (fAte) fAte.value = '';
    if (fStatus) fStatus.value = '';
    if (fPrio) fPrio.value = '';
    if (fBusca) fBusca.value = '';
    filtros = { de: '', ate: '', status: '', prioridade: '', busca: '' };
    renderTabelaSolicitacoes();
  });
}
