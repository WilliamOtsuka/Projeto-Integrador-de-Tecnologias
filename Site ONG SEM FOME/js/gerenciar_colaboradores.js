let colaboradores = [];
let pageColabs = 1;
const limitColabs = 30;
let totalColabs = 0;
const helpColaboradoresSteps = [
  {
    titulo: "1. Abrir o formulário",
    descricao:
      "Clique em \"Adicionar Colaborador\" para começar um novo cadastro.",
  },
  {
    titulo: "2. Informar contato e cargo",
    descricao:
      "Preencha nome, e-mail, telefone e cargo para que o colaborador seja identificado pela equipe.",
  },
  {
    titulo: "3. Definir senha de acesso",
    descricao:
      "Digite uma senha temporária (mínimo 4 caracteres). Oriente o colaborador a alterá-la depois.",
  },
  {
    titulo: "4. Salvar",
    descricao:
      "Revise os dados e clique em \"Salvar\". O registro passará a aparecer na tabela.",
  },
];
let helpColaboradoresStepIndex = 0;
let filtroBuscaColab = "";

// Renderiza a tabela com os dados
function renderTabelaColaboradores() {
  const tbody = document.querySelector("#tabelaColaboradores tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const q = (filtroBuscaColab || "").trim().toLowerCase();
  colaboradores
    .filter((c) => {
      if (!q) return true;
      const txt = [c.id, c.nome, c.email, c.telefone, c.cargo]
        .map((v) => (v == null ? "" : String(v)).toLowerCase())
        .join(" ");
      return txt.includes(q);
    })
    .forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nome}</td>
      <td>${c.email}</td>
      <td>${c.telefone}</td>
      <td>${c.cargo}</td>
      <td>
        ${c.senha
       ? `<span class="senha-mask" data-id="${c.id}" data-senha="${c.senha}" data-visible="false">${"\u2022".repeat(c.senha.length)}</span>
         <button type="button" class="btn-link" onclick="toggleSenha(${c.id}, this)">Mostrar</button>`
          : '-'}
      </td>
      <td>
        <button class="btn-edit" onclick="editarColaborador(${c.id})">Editar</button>
        <button class="btn-delete" onclick="excluirColaborador(${c.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Alterna exibição de senha (mascarada/visível)
window.toggleSenha = function (id, btnEl) {
  const span = document.querySelector(`.senha-mask[data-id="${id}"]`);
  if (!span) return;
  const senha = span.getAttribute('data-senha') || '';
  if (!senha) return;
  const visible = span.getAttribute('data-visible') === 'true';
  if (visible) {
    span.textContent = '\u2022'.repeat(senha.length);
    span.setAttribute('data-visible', 'false');
    if (btnEl) btnEl.textContent = 'Mostrar';
  } else {
    span.textContent = senha;
    span.setAttribute('data-visible', 'true');
    if (btnEl) btnEl.textContent = 'Ocultar';
  }
};

// Máscaras/validação
const onlyDigits = (v) => (v || "").replace(/\D/g, "");
function maskTelefone(v) {
  const d = onlyDigits(v).slice(0, 11);

  if (d.length <= 10) {
    return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => {
      let o = "";
      if (a) o += `(${a}` + (a.length === 2 ? ") " : "");
      if (b) o += b + (b.length === 4 && c ? "-" : "");
      if (c) o += c;
      return o;
    });
  }
  return d.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, a, b, c) => {
    let o = "";
    if (a) o += `(${a}` + (a.length === 2 ? ") " : "");
    if (b) o += b + (b.length === 5 && c ? "-" : "");
    if (c) o += c;
    return o;
  });
}

function validaTelefone(v) {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Abre o modal e preenche o formulário quando em modo edição
function abrirModalColaborador(editar = false, colab = {}) {
  // animação de abrir
  const modal = document.getElementById("modalColaborador");
  modal.classList.remove("saindo");
  modal.style.display = "block";
  void modal.offsetWidth;
  modal.classList.add("mostrar");
  document.getElementById("tituloModalColaborador").textContent = editar
    ? "Editar Colaborador"
    : "Adicionar Colaborador";
  document.getElementById("colaboradorId").value = colab.id || "";
  document.getElementById("nomeColaborador").value = colab.nome || "";
  document.getElementById("emailColaborador").value = colab.email || "";
  document.getElementById("telefoneColaborador").value = colab.telefone || "";
  document.getElementById("cargoColaborador").value = colab.cargo || "";
  // Preenche a senha quando em modo edição (se existir)
  const senhaEl = document.getElementById("senhaColaborador");
  if (senhaEl) senhaEl.value = colab.senha || "";
}

// Fecha o modal (fade-out)
function fecharModalColaborador() {
  const modal = document.getElementById("modalColaborador");
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
document.getElementById("btnAdicionarColaborador").onclick = () =>
  abrirModalColaborador();

document.getElementById("fecharModalColaborador").onclick =
  fecharModalColaborador;

document.getElementById("fecharModalColaboradorBtn").onclick =
  fecharModalColaborador;

// Fecha o modal ao clicar fora do conteúdo
window.onclick = function (event) {
  const modalColab = document.getElementById("modalColaborador");
  const modalHelp = document.getElementById("modalHelpColaboradores");
  if (event.target === modalColab) fecharModalColaborador();
  if (event.target === modalHelp) fecharHelpColaboradores();
};

// Submit do formulário: valida campos e cria/atualiza via API
document.getElementById("formColaborador").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("colaboradorId").value;
  const nome = document.getElementById("nomeColaborador").value;
  const email = document.getElementById("emailColaborador").value;
  const telefone = document.getElementById("telefoneColaborador").value;
  const cargo = document.getElementById("cargoColaborador").value;
  const senha = document.getElementById("senhaColaborador").value.trim();
  const nomeOk = (nome || "").trim().length >= 2;
  const emailOk = emailRegex.test((email || "").trim());
  const telOk = validaTelefone(telefone);
  const cargoOk = (cargo || "").trim().length >= 2;
  const senhaOk = senha.length >= 4;
  document
    .getElementById("nomeColaborador")
    .setCustomValidity(nomeOk ? "" : "Informe o nome");
  document
    .getElementById("emailColaborador")
    .setCustomValidity(emailOk ? "" : "E-mail inválido");
  document
    .getElementById("telefoneColaborador")
    .setCustomValidity(telOk ? "" : "Telefone inválido");
  document
    .getElementById("cargoColaborador")
    .setCustomValidity(cargoOk ? "" : "Informe o cargo");
  document
    .getElementById("senhaColaborador")
    .setCustomValidity(senhaOk ? "" : "A senha deve ter pelo menos 4 caracteres"); 
  if (!nomeOk || !emailOk || !telOk || !cargoOk || !senhaOk) {
    document.getElementById("formColaborador").reportValidity();
    return;
  }

  const payload = { nome, email, telefone, cargo, senha };
  (async () => {
    try {
      // Se há ID, atualiza; senão, cria
      if (id){
       const res = await fetch(`/api/colaboradores/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao salvar colaborador");
        return;
      }
      }else{
       const res =  await fetch("/api/colaboradores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao salvar colaborador");
        return;
      }
    }
      fecharModalColaborador();
      await loadColaboradores();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar colaborador");
    }
  })();
};

// Modal em modo edição
window.editarColaborador = function (id) {
  const colab = colaboradores.find((f) => f.id == id);

  if (colab) abrirModalColaborador(true, colab);
};

// Confirma e exclui
window.excluirColaborador = function (id) {
  if (confirm("Tem certeza que deseja excluir este colaborador?")) {
    (async () => {
      try {
        await fetch(`/api/colaboradores/${id}`, { method: "DELETE" });
        await loadColaboradores();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir colaborador");
      }
    })();
  }
};

// Carrega colaboradores
function updatePaginacaoColabsInfo() {
  const info = document.getElementById("infoColaboradores");
  if (!info) return;
  const totalPages = Math.max(1, Math.ceil(totalColabs / limitColabs));
  info.textContent = `Página ${pageColabs} de ${totalPages}`;
  const prev = document.getElementById("prevColaboradores");
  const next = document.getElementById("nextColaboradores");
  if (prev) prev.disabled = pageColabs <= 1;
  if (next) next.disabled = pageColabs >= totalPages;
}

async function loadColaboradores() {
  try {
    const r = await fetch(`/api/colaboradores?page=${pageColabs}&limit=${limitColabs}`);

    if (!r.ok) {
      if (r.status === 401) {
        alert("Sessão expirada. Faça login.");
        window.location.href = "login_page.html";
        return;
      }
      throw new Error("Falha ao carregar colaboradores");
    }
    const payload = await r.json();
    const data = Array.isArray(payload) ? payload : (payload.data || []);
    totalColabs = (Array.isArray(payload) ? data.length : (payload.total ?? data.length)) || 0;
    colaboradores = data;
    renderTabelaColaboradores();
    updatePaginacaoColabsInfo();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar colaboradores");
  }
}

// Inicializa a página
// Eventos de paginação
const prevBtnC = document.getElementById("prevColaboradores");
const nextBtnC = document.getElementById("nextColaboradores");
if (prevBtnC) prevBtnC.addEventListener("click", async () => { if (pageColabs > 1) { pageColabs--; await loadColaboradores(); }});
if (nextBtnC) nextBtnC.addEventListener("click", async () => {
  const totalPages = Math.max(1, Math.ceil(totalColabs / limitColabs));
  if (pageColabs < totalPages) { pageColabs++; await loadColaboradores(); }
});

loadColaboradores();

// Help modal
const helpModalColabs = document.getElementById("modalHelpColaboradores");
const helpPrevColabs = document.getElementById("btnHelpPrevColaboradores");
const helpNextColabs = document.getElementById("btnHelpNextColaboradores");
const helpInfoColabs = document.getElementById("helpPassoInfoColaboradores");
const helpContentColabs = document.getElementById("helpColaboradoresPassos");

function renderHelpColabsStep() {
  if (!helpContentColabs) return;
  const step = helpColaboradoresSteps[helpColaboradoresStepIndex];
  helpContentColabs.innerHTML = `
    <div class="help-step">
      <h3>${step.titulo}</h3>
      <p>${step.descricao}</p>
    </div>`;
  if (helpInfoColabs)
    helpInfoColabs.textContent = `Passo ${helpColaboradoresStepIndex + 1} de ${helpColaboradoresSteps.length}`;
  if (helpPrevColabs)
    helpPrevColabs.disabled = helpColaboradoresStepIndex === 0;
  if (helpNextColabs)
    helpNextColabs.disabled = helpColaboradoresStepIndex === helpColaboradoresSteps.length - 1;
}

function abrirHelpColaboradores() {
  helpColaboradoresStepIndex = 0;
  renderHelpColabsStep();
  if (!helpModalColabs) return;
  helpModalColabs.classList.remove("saindo");
  helpModalColabs.style.display = "block";
  void helpModalColabs.offsetWidth;
  helpModalColabs.classList.add("mostrar");
}

function fecharHelpColaboradores() {
  if (!helpModalColabs) return;
  helpModalColabs.classList.remove("mostrar");
  helpModalColabs.classList.add("saindo");
  const content = helpModalColabs.querySelector(".modal-conteudo");
  const done = () => {
    helpModalColabs.style.display = "none";
    helpModalColabs.classList.remove("saindo");
    if (content) content.removeEventListener("transitionend", onEnd);
  };
  const onEnd = (e) => {
    if (e.target === content) done();
  };
  if (content) content.addEventListener("transitionend", onEnd);
  else setTimeout(done, 240);
}

const btnHelpColaboradores = document.getElementById("btnHelpColaboradores");
if (btnHelpColaboradores) btnHelpColaboradores.addEventListener("click", abrirHelpColaboradores);
const fecharHelpColaboradoresBtn = document.getElementById("fecharHelpColaboradores");
if (fecharHelpColaboradoresBtn) fecharHelpColaboradoresBtn.addEventListener("click", fecharHelpColaboradores);
if (helpPrevColabs)
  helpPrevColabs.addEventListener("click", () => {
    if (helpColaboradoresStepIndex > 0) {
      helpColaboradoresStepIndex--;
      renderHelpColabsStep();
    }
  });
if (helpNextColabs)
  helpNextColabs.addEventListener("click", () => {
    if (helpColaboradoresStepIndex < helpColaboradoresSteps.length - 1) {
      helpColaboradoresStepIndex++;
      renderHelpColabsStep();
    }
  });

// Filtro de busca (tabela de colaboradores)
const fltBuscaColabEl = document.getElementById("fltBuscaColab");
if (fltBuscaColabEl) {
  fltBuscaColabEl.addEventListener("input", (e) => {
    filtroBuscaColab = (e.target.value || "").toLowerCase();
    renderTabelaColaboradores();
  });
}
const btnLimparBuscaColab = document.getElementById("btnLimparBuscaColab");
if (btnLimparBuscaColab && fltBuscaColabEl) {
  btnLimparBuscaColab.addEventListener("click", (e) => {
    e.preventDefault();
    filtroBuscaColab = "";
    fltBuscaColabEl.value = "";
    renderTabelaColaboradores();
  });
}

// Validações e máscaras do formulário
const nomeInput = document.getElementById("nomeColaborador");

if (nomeInput) {
  nomeInput.addEventListener("input", (e) =>
    e.target.setCustomValidity(
      (e.target.value || "").trim().length >= 2 ? "" : "Informe o nome"
    )
  );
}
const emailInput = document.getElementById("emailColaborador");

if (emailInput) {
  emailInput.addEventListener("input", (e) =>
    e.target.setCustomValidity(
      emailRegex.test((e.target.value || "").trim()) ? "" : ""
    )
  );
  emailInput.addEventListener("blur", (e) =>
    e.target.setCustomValidity(
      emailRegex.test((e.target.value || "").trim()) ? "" : "E-mail inválido"
    )
  );
}
const telInput = document.getElementById("telefoneColaborador");

if (telInput) {
  telInput.addEventListener("input", (e) => {
    e.target.value = maskTelefone(e.target.value);
    e.target.setCustomValidity(
      validaTelefone(e.target.value) ? "" : "Telefone inválido"
    );
  });
  telInput.addEventListener("blur", (e) =>
    e.target.setCustomValidity(
      validaTelefone(e.target.value) ? "" : "Telefone inválido"
    )
  );
}
const cargoInput = document.getElementById("cargoColaborador");

if (cargoInput) {
  cargoInput.addEventListener("input", (e) =>
    e.target.setCustomValidity(
      (e.target.value || "").trim().length >= 2 ? "" : "Informe o cargo"
    )
  );
}

const senhaInput = document.getElementById("senhaColaborador");

senhaInput.addEventListener("input", () => {
  const senha = senhaInput.value.trim();
  const senhaOk = !senha || senha.length >= 4;
  senhaInput.setCustomValidity(senhaOk ? "" : "A senha deve ter pelo menos 4 caracteres");
});
