let categorias = [];
let pageCategorias = 1;
const limitCategorias = 30;
let totalCategorias = 0;

// Renderiza a tabela
function renderTabelaCategorias() {
  const tbody = document.querySelector("#tabelaCategorias tbody");

  if (!tbody) return;
  tbody.innerHTML = "";
  categorias.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nome}</td>
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
  document.getElementById("categoriaId").value = cat.id || "";
  document.getElementById("nomeCategoria").value = cat.nome || "";
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
  if (event.target == document.getElementById("modalCategoria"))
    fecharModalCategoria();
};

// Submit do formulário
document.getElementById("formCategoria").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("categoriaId").value;
  const nome = document.getElementById("nomeCategoria").value;
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
          body: JSON.stringify({ nome }),
        });
      else
        await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome }),
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
