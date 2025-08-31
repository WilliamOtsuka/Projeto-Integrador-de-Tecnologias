let solicitacoes = [];

// Renderiza a tabela com os dados
function renderTabelaSolicitacoes() {
  const tbody = document.querySelector("#tabelaSolicitacoes tbody");

  if (!tbody) return;

  tbody.innerHTML = "";
  solicitacoes.forEach((s) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.titulo}</td>
      <td>${s.categoria}</td>
      <td>${s.descricao}</td>
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
  document.getElementById("categoriaSolicitacao").value = item.categoria || "";
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
  const categoria = document.getElementById("categoriaSolicitacao").value;
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
          body: JSON.stringify({ titulo, categoria, descricao }),
        });
      } else {
        await fetch("/api/solicitacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, categoria, descricao }),
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
async function loadSolicitacoes() {
  try {
    const r = await fetch("/api/solicitacoes");
    if (!r.ok) {
      if (r.status === 401) {
        alert("Sessão expirada. Faça login.");
        window.location.href = "login_page.html";
        return;
      }
      throw new Error("Falha ao carregar solicitações");
    }
    solicitacoes = await r.json();
    renderTabelaSolicitacoes();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar solicitações");
  }
}

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
    const r = await fetch("/api/categorias");
    if (!r.ok) throw new Error("Falha ao carregar categorias");
    const cats = await r.json();
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
