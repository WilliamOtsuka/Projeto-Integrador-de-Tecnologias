let categorias = [];
let pageCategorias = 1;
const limitCategorias = 30;
let totalCategorias = 0;
const helpCategoriasSteps = [
  {
    titulo: "1. Abrir o formulário",
    descricao: "Clique em \"Adicionar Categoria\" para iniciar um novo registro.",
  },
  {
    titulo: "2. Definir nome e tipo",
    descricao:
      "Informe o nome da categoria e escolha se será simples ou composta (com subitens).",
  },
  {
    titulo: "3. Gerenciar subitens (opcional)",
    descricao:
      "Se a categoria for composta, utilize a área de subitens para listar cada item disponível.",
  },
  {
    titulo: "4. Salvar",
    descricao:
      "Clique em \"Salvar\" para armazenar e visualizar a categoria na tabela.",
  },
];
let helpCategoriasStepIndex = 0;
let filtroBuscaCategorias = "";

// Renderiza a tabela
function renderTabelaCategorias() {
  const tbody = document.querySelector("#tabelaCategorias tbody");

  if (!tbody) return;
  tbody.innerHTML = "";
  const q = (filtroBuscaCategorias || "").trim().toLowerCase();
  categorias
    .filter((c) => {
      if (!q) return true;
      const tipoVal = String(c.tipo || 'simples').toLowerCase();
      const txt = [c.id, c.nome, tipoVal]
        .map((v) => (v == null ? "" : String(v)).toLowerCase())
        .join(" ");
      return txt.includes(q);
    })
    .forEach((c) => {
    const tr = document.createElement("tr");
    const tipo = String(c.tipo || 'simples').toLowerCase();
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nome}</td>
      <td>
        ${tipo === 'composta' ? 'Composto' : 'Simples'}
        ${tipo === 'composta' ? `<button class="btn-categoria" onclick="verSubitens(${c.id}, '${String(c.nome).replace(/'/g, "\'")}')">Subitens</button>` : ''}
      </td>
      <td>
        <button class="btn-edit" onclick="editarCategoria(${c.id})">Editar</button>
        <button class="btn-delete" onclick="excluirCategoria(${c.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Abre o modal e preenche o formulário
function abrirModalCategoria(editar = false, cat = {}) {
  const modal = document.getElementById("modalCategoria");
  modal.classList.remove("saindo");
  modal.style.display = "block";
  void modal.offsetWidth;
  modal.classList.add("mostrar");
  document.getElementById("tituloModalCategoria").textContent = editar
    ? "Editar Categoria"
    : "Adicionar Categoria";
  const idEl = document.getElementById("categoriaId");
  const nomeEl = document.getElementById("nomeCategoria");
  const tipoEl = document.getElementById("tipoCategoria");
  const wrap = document.getElementById("subitensWrapper");
  const lista = document.getElementById("listaSubitens");
  idEl.value = cat.id || "";
  nomeEl.value = cat.nome || "";
  tipoEl.value = String(cat.tipo || 'simples').toLowerCase();
  if (lista) lista.innerHTML = '';
  // Mostrar seção de subitens se composta
  const isComp = tipoEl.value === 'composta';
  wrap.style.display = isComp ? 'block' : 'none';
  if (isComp && cat.id) {
    carregarSubitens(cat.id);
  }
}

// Fecha o modal (fade-out)
function fecharModalCategoria() {
  const modal = document.getElementById("modalCategoria");
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
document.getElementById("btnAdicionarCategoria").onclick = () =>
  abrirModalCategoria();

document.getElementById("fecharModalCategoria").onclick = fecharModalCategoria;

document.getElementById("fecharModalCategoriaBtn").onclick =
  fecharModalCategoria;

// Fecha o modal ao clicar fora do conteúdo
window.onclick = function (event) {
  const modalCategoriaEl = document.getElementById("modalCategoria");
  const modalHelpEl = document.getElementById("modalHelpCategorias");
  if (event.target === modalCategoriaEl) fecharModalCategoria();
  if (event.target === modalHelpEl) fecharHelpCategorias();
};

// Submit do formulário
document.getElementById("formCategoria").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("categoriaId").value;
  const nome = document.getElementById("nomeCategoria").value;
  const tipo = document.getElementById("tipoCategoria").value;
  const nomeOk = (nome || "").trim().length >= 2;

  document.getElementById("nomeCategoria").setCustomValidity(nomeOk ? "" : "Informe o nome da categoria");

  if (!nomeOk) {
    document.getElementById("formCategoria").reportValidity();
    return;
  }
  (async () => {
    try {
      // Se há ID, atualiza; senão, cria
      if (id)
        await fetch(`/api/categorias/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, tipo }),
        });
      else
        await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, tipo }),
        });
      fecharModalCategoria();
      await loadCategorias();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar categoria");
    }
  })();
};

// Abre edição preenchendo com o item selecionado
window.editarCategoria = function (id) {
  const cat = categorias.find((f) => f.id == id);
  if (cat) abrirModalCategoria(true, cat);
};

// Confirma e exclui
window.excluirCategoria = function (id) {
  if (confirm("Tem certeza que deseja excluir esta categoria?")) {
    (async () => {
      try {
        await fetch(`/api/categorias/${id}`, { method: "DELETE" });
        await loadCategorias();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir categoria");
      }
    })();
  }
};

// Carrega categorias
function updatePaginacaoCategoriasInfo() {
  const info = document.getElementById("infoCategorias");
  if (!info) return;
  const totalPages = Math.max(1, Math.ceil(totalCategorias / limitCategorias));
  info.textContent = `Página ${pageCategorias} de ${totalPages}`;
  const prev = document.getElementById("prevCategorias");
  const next = document.getElementById("nextCategorias");
  if (prev) prev.disabled = pageCategorias <= 1;
  if (next) next.disabled = pageCategorias >= totalPages;
}

// Carrega categorias
async function loadCategorias() {
  try {
    const r = await fetch(`/api/categorias?page=${pageCategorias}&limit=${limitCategorias}`);
    if (!r.ok) {
      if (r.status === 401) {
        alert("Sessão expirada. Faça login.");
        window.location.href = "login_page.html";
        return;
      }
      throw new Error("Falha ao carregar categorias");
    }
    const payload = await r.json();
    const data = Array.isArray(payload) ? payload : (payload.data || []);
    totalCategorias = (Array.isArray(payload) ? data.length : (payload.total ?? data.length)) || 0;
    categorias = data;
    renderTabelaCategorias();
    updatePaginacaoCategoriasInfo();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar categorias");
  }
}

// Subitens handlers
async function carregarSubitens(catId) {
  try {
    const r = await fetch(`/api/categorias/${catId}/itens`);
    if (!r.ok) return;
    const itens = await r.json();
    const lista = document.getElementById('listaSubitens');
    if (!lista) return;
    lista.innerHTML = '';
    itens.forEach(i => {
      const li = document.createElement('li');
      li.innerHTML = `${i.nome} <button class="btn-link" data-item="${i.id}">Remover</button>`;
      lista.appendChild(li);
    });
    // bind removes
    lista.querySelectorAll('button[data-item]')?.forEach(btn => {
      btn.addEventListener('click', async () => {
        const itemId = btn.getAttribute('data-item');
        await fetch(`/api/categorias/${catId}/itens/${itemId}`, { method: 'DELETE' });
        carregarSubitens(catId);
      });
    });
  } catch (e) { console.error(e); }
}

// Visualização de subitens
window.verSubitens = async function (id, nome) {
  const modal = document.getElementById('modalSubitens');
  const titulo = document.getElementById('tituloModalSubitens');
  const ul = document.getElementById('listaSubitensView');
  if (!modal || !ul) return;
  ul.innerHTML = '';
  titulo.textContent = `Subitens de ${nome}`;
  modal.style.display = 'block';
  void modal.offsetWidth; modal.classList.add('mostrar');
  try {
    const r = await fetch(`/api/categorias/${id}/itens`);
    const itens = r.ok ? await r.json() : [];
    if (!Array.isArray(itens) || itens.length === 0) {
      ul.innerHTML = '<li>Nenhum subitem cadastrado.</li>';
      return;
    }
    itens.forEach(i => {
      const li = document.createElement('li');
      li.textContent = i.nome;
      ul.appendChild(li);
    });
  } catch (e) {
    console.error(e);
    ul.innerHTML = '<li>Falha ao carregar subitens</li>';
  }
};

const fecharModalSubitens = document.getElementById('fecharModalSubitens');
if (fecharModalSubitens) {
  fecharModalSubitens.addEventListener('click', () => {
    const modal = document.getElementById('modalSubitens');
    modal.classList.remove('mostrar');
    modal.style.display = 'none';
  });
}

const tipoEl = document.getElementById('tipoCategoria');
if (tipoEl) {
  tipoEl.addEventListener('change', () => {
    const wrap = document.getElementById('subitensWrapper');
    wrap.style.display = (tipoEl.value === 'composta') ? 'block' : 'none';
  });
}

const btnAddSub = document.getElementById('btnAddSubitem');
if (btnAddSub) {
  btnAddSub.addEventListener('click', async () => {
    const id = document.getElementById('categoriaId').value;
    const nome = (document.getElementById('novoSubitem').value || '').trim();
    if (!id || !nome) return;
    await fetch(`/api/categorias/${id}/itens`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome })
    });
    document.getElementById('novoSubitem').value = '';
    carregarSubitens(id);
  });
}

// Inicializa a página
// Eventos de paginação
const prevBtnCat = document.getElementById("prevCategorias");
const nextBtnCat = document.getElementById("nextCategorias");
if (prevBtnCat) prevBtnCat.addEventListener("click", async () => { if (pageCategorias > 1) { pageCategorias--; await loadCategorias(); }});
if (nextBtnCat) nextBtnCat.addEventListener("click", async () => {
  const totalPages = Math.max(1, Math.ceil(totalCategorias / limitCategorias));
  if (pageCategorias < totalPages) { pageCategorias++; await loadCategorias(); }
});

loadCategorias();

// Filtro: busca na tabela de categorias
const fltBuscaCategoriasEl = document.getElementById("fltBuscaCategorias");
if (fltBuscaCategoriasEl) {
  fltBuscaCategoriasEl.addEventListener("input", (e) => {
    filtroBuscaCategorias = (e.target.value || "").toLowerCase();
    renderTabelaCategorias();
  });
}
const btnLimparBuscaCategorias = document.getElementById("btnLimparBuscaCategorias");
if (btnLimparBuscaCategorias && fltBuscaCategoriasEl) {
  btnLimparBuscaCategorias.addEventListener("click", (e) => {
    e.preventDefault();
    filtroBuscaCategorias = "";
    fltBuscaCategoriasEl.value = "";
    renderTabelaCategorias();
  });
}

// Validações do campo de nome
const nomeInput = document.getElementById("nomeCategoria");
if (nomeInput) {
  nomeInput.addEventListener("input", (e) =>
    e.target.setCustomValidity(
      (e.target.value || "").trim().length >= 2
        ? ""
        : "Informe o nome da categoria"
    )
  );
}

// Help modal
const helpModalCategorias = document.getElementById("modalHelpCategorias");
const helpPrevCategorias = document.getElementById("btnHelpPrevCategorias");
const helpNextCategorias = document.getElementById("btnHelpNextCategorias");
const helpInfoCategorias = document.getElementById("helpPassoInfoCategorias");
const helpContentCategorias = document.getElementById("helpCategoriasPassos");

function renderHelpCategoriasStep() {
  if (!helpContentCategorias) return;
  const step = helpCategoriasSteps[helpCategoriasStepIndex];
  helpContentCategorias.innerHTML = `
    <div class="help-step">
      <h3>${step.titulo}</h3>
      <p>${step.descricao}</p>
    </div>`;
  if (helpInfoCategorias)
    helpInfoCategorias.textContent = `Passo ${helpCategoriasStepIndex + 1} de ${helpCategoriasSteps.length}`;
  if (helpPrevCategorias)
    helpPrevCategorias.disabled = helpCategoriasStepIndex === 0;
  if (helpNextCategorias)
    helpNextCategorias.disabled = helpCategoriasStepIndex === helpCategoriasSteps.length - 1;
}

function abrirHelpCategorias() {
  helpCategoriasStepIndex = 0;
  renderHelpCategoriasStep();
  if (!helpModalCategorias) return;
  helpModalCategorias.classList.remove("saindo");
  helpModalCategorias.style.display = "block";
  void helpModalCategorias.offsetWidth;
  helpModalCategorias.classList.add("mostrar");
}

function fecharHelpCategorias() {
  if (!helpModalCategorias) return;
  helpModalCategorias.classList.remove("mostrar");
  helpModalCategorias.classList.add("saindo");
  const content = helpModalCategorias.querySelector(".modal-conteudo");
  const done = () => {
    helpModalCategorias.style.display = "none";
    helpModalCategorias.classList.remove("saindo");
    if (content) content.removeEventListener("transitionend", onEnd);
  };
  const onEnd = (e) => {
    if (e.target === content) done();
  };
  if (content) content.addEventListener("transitionend", onEnd);
  else setTimeout(done, 240);
}

const btnHelpCategoriasEl = document.getElementById("btnHelpCategorias");
if (btnHelpCategoriasEl) btnHelpCategoriasEl.addEventListener("click", abrirHelpCategorias);
const fecharHelpCategoriasBtn = document.getElementById("fecharHelpCategorias");
if (fecharHelpCategoriasBtn) fecharHelpCategoriasBtn.addEventListener("click", fecharHelpCategorias);
if (helpPrevCategorias)
  helpPrevCategorias.addEventListener("click", () => {
    if (helpCategoriasStepIndex > 0) {
      helpCategoriasStepIndex--;
      renderHelpCategoriasStep();
    }
  });
if (helpNextCategorias)
  helpNextCategorias.addEventListener("click", () => {
    if (helpCategoriasStepIndex < helpCategoriasSteps.length - 1) {
      helpCategoriasStepIndex++;
      renderHelpCategoriasStep();
    }
  });
