let solicitacoes = [];
let pageSolic = 1;
const limitSolic = 30;
let totalSolic = 0;
let filtros = { de: '', ate: '', status: '', prioridade: '', busca: '' };
let categoriasCarregadas = false;

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
  for (const opt of sel.options) {
    if (opt.value.toLowerCase() === target) {
      sel.value = opt.value;
      return;
    }
  }
  // Se não encontrou e for unidade, adiciona opção dinâmica para exibir o valor do banco
  if ((selectId === 'unidadeSolicitacao' || selectId === 'categoriaSolicitacao') && target) {
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
      const blob = `${s.titulo||''} ${s.solicitante||''} ${s.categoria||''} ${s.descricao||''}`.toLowerCase();
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

    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.titulo}</td>
  <td>${formatDateDDMMYY(s.data_solicitacao)}</td>
  <td>${s.solicitante || ''}</td>
  <td>${s.status || 'pendente'}</td>
  <td>${s.prioridade ? `<span class="badge ${String(s.prioridade).toLowerCase()==='urgente' ? 'badge-prioridade--urgente' : 'badge-prioridade--normal'}">${s.prioridade}</span>` : ''}</td>
  <td>${(s.quantidade ?? '')}</td>
  <td>${s.unidade || ''}</td>
  <td>${s.categoria}</td>
  <td>${s.descricao}</td>
  <td>${formatDateDDMMYY(s.atualizacao)}</td>
  <td>
  <button class="btn-edit" onclick="editarSolicitacao(${s.id})">Editar</button>
        <button class="btn-delete" onclick="excluirSolicitacao(${s.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Abre o modal e preenche o formulário
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
  const aplicaCategoria = () => setSelectValue("categoriaSolicitacao", item.categoria || "");
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
  document.getElementById("solicitanteSolicitacao").value = item.solicitante || "";
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
  if (event.target == document.getElementById("modalSolicitacao"))
    fecharModalSolicitacao();
};

// Submit do formulário: valida campos e cria/atualiza
document.getElementById("formSolicitacao").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("solicitacaoId").value;
  const titulo = document.getElementById("tituloSolicitacao").value;
  const data_solicitacao = document.getElementById("dataSolicitacao").value;
  const categoria = document.getElementById("categoriaSolicitacao").value;
  const solicitante = document.getElementById("solicitanteSolicitacao").value;
  const status = document.getElementById("statusSolicitacao").value;
  const prioridade = document.getElementById("prioridadeSolicitacao").value;
  const quantidade = (document.getElementById("quantidadeValor").value || '').trim();
  const unidade = document.getElementById("unidadeSolicitacao").value || '';
  const descricao = document.getElementById("descricaoSolicitacao").value;
  const tituloOk = (titulo || "").trim().length >= 2;
  const categoriaOk = (categoria || "").trim().length >= 2;

  document
    .getElementById("tituloSolicitacao")
    .setCustomValidity(tituloOk ? "" : "Informe o título");
  document
    .getElementById("categoriaSolicitacao")
    .setCustomValidity(categoriaOk ? "" : "Informe a categoria");

  if (!tituloOk || !categoriaOk) {
    document.getElementById("formSolicitacao").reportValidity();
    return;
  }
  (async () => {
    try {
      // Se há ID, atualiza; senão, cria
      if (id) {
        await fetch(`/api/solicitacoes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade: quantidade ? Number(quantidade) : null, unidade })
        });
      } else {
        await fetch("/api/solicitacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, categoria, descricao, data_solicitacao, solicitante, status, prioridade, quantidade: quantidade ? Number(quantidade) : null, unidade })
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
    selectEl.innerHTML = '<option value="" disabled selected>Selecione uma categoria</option>';
    cats
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.nome;
        opt.textContent = c.nome;
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
  categoriaInput.addEventListener("change", (e) =>
    e.target.setCustomValidity(
      (e.target.value || "").trim().length >= 2 ? "" : "Informe a categoria"
    )
  );
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
