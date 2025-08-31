let campanhas = [];

// Renderiza a tabela com os dados atuais
function renderTabelaCampanhas() {
  const tbody = document.querySelector("#tabelaCampanhas tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  campanhas.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nome}</td>
      <td>${c.meta}</td>
      <td>${c.descricao}</td>
      <td>
        <button class="btn-edit" onclick="editarCampanha(${c.id})">Editar</button>
        <button class="btn-delete" onclick="excluirCampanha(${c.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Abre o modal e preenche o formulário quando em modo edição
function abrirModalCampanha(editar = false, camp = {}) {
  const modal = document.getElementById("modalCampanha");
  modal.classList.remove("saindo");
  modal.style.display = "block";
  void modal.offsetWidth;
  modal.classList.add("mostrar");
  document.getElementById("tituloModalCampanha").textContent = editar
    ? "Editar Campanha"
    : "Adicionar Campanha";
  document.getElementById("campanhaId").value = camp.id || "";
  document.getElementById("nomeCampanha").value = camp.nome || "";
  document.getElementById("metaCampanha").value = camp.meta || "";
  document.getElementById("descricaoCampanha").value = camp.descricao || "";
}

// Fecha o modal
function fecharModalCampanha() {
  const modal = document.getElementById("modalCampanha");
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

// Ações de abrir/fechar modal
document.getElementById("btnAdicionarCampanha").onclick = () =>
  abrirModalCampanha();

document.getElementById("fecharModalCampanha").onclick = fecharModalCampanha;

document.getElementById("fecharModalCampanhaBtn").onclick = fecharModalCampanha;

// Fecha o modal ao clicar fora do conteúdo
window.onclick = function (event) {
  if (event.target == document.getElementById("modalCampanha"))
    fecharModalCampanha();
};

// Submit do formulário: valida campos e chama (POST/PUT)
document.getElementById("formCampanha").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("campanhaId").value;
  const nome = document.getElementById("nomeCampanha").value;
  const meta = document.getElementById("metaCampanha").value;
  const descricao = document.getElementById("descricaoCampanha").value;

  // Validações
  const nomeOk = (nome || "").trim().length >= 2; // nome >= 2 chars
  const metaOk = (meta || "").trim().length >= 1; // meta preenchida

  document
    .getElementById("nomeCampanha")
    .setCustomValidity(nomeOk ? "" : "Informe o nome");
  document
    .getElementById("metaCampanha")
    .setCustomValidity(metaOk ? "" : "Informe a meta");

  if (!nomeOk || !metaOk) {
    document.getElementById("formCampanha").reportValidity();
    return;
  }
  (async () => {
    try {
      // Se há ID, atualiza; senão, cria
      if (id)
        await fetch(`/api/campanhas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, meta, descricao }),
        });
      else
        await fetch("/api/campanhas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, meta, descricao }),
        });
      fecharModalCampanha();
      await loadCampanhas();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar campanha");
    }
  })();
};

// Edição preenchendo com o item selecionado
window.editarCampanha = function (id) {
  const camp = campanhas.find((f) => f.id == id);
  if (camp) abrirModalCampanha(true, camp);
};

// Confirma e exclui
window.excluirCampanha = function (id) {
  if (confirm("Tem certeza que deseja excluir esta campanha?")) {
    (async () => {
      try {
        await fetch(`/api/campanhas/${id}`, { method: "DELETE" });
        await loadCampanhas();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir campanha");
      }
    })();
  }
};

// Carrega campanhas
async function loadCampanhas() {
  try {
    const r = await fetch("/api/campanhas");
    if (!r.ok) {
      if (r.status === 401) {
        alert("Sessão expirada. Faça login.");
        window.location.href = "login_page.html";
        return;
      }
      throw new Error("Falha ao carregar campanhas");
    }
    campanhas = await r.json();
    renderTabelaCampanhas();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar campanhas");
  }
}

// Inicializa a página
loadCampanhas();

// Validações do formulário
const nomeInput = document.getElementById("nomeCampanha");
if (nomeInput) {
  nomeInput.addEventListener("input", (e) =>
    e.target.setCustomValidity(
      (e.target.value || "").trim().length >= 2 ? "" : "Informe o nome"
    )
  );
}
const metaInput = document.getElementById("metaCampanha");
if (metaInput) {
  metaInput.addEventListener("input", (e) =>
    e.target.setCustomValidity(
      (e.target.value || "").trim().length >= 1 ? "" : "Informe a meta"
    )
  );
}
