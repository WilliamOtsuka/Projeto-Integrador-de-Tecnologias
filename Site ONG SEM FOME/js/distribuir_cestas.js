// carrega colaboradores para o select
async function carregarColaboradores() {
  try {
    const r = await fetch("/api/colaboradores?limit=1000"); // carregar todos os colaboradores
    if (!r.ok) return;
    const payload = await r.json();
    const list = Array.isArray(payload) ? payload : payload.data || [];
    const sel = document.getElementById("saResponsavel");
    if (!sel) return;
    sel.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione o colaborador";
    placeholder.disabled = true;
    placeholder.selected = true;
    sel.appendChild(placeholder);
    list.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.nome;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("Falha ao carregar colaboradores", e);
  }
}

// carrega famílias para o select
async function carregarFamilias() {
  try {
    const r = await fetch("/api/familias?limit=1000"); // carregar todas as famílias
    const payload = r.ok ? await r.json() : []; //
    const familias = Array.isArray(payload) ? payload : payload.data || [];
    const sel = document.getElementById("saFamilia");
    sel.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione a família";
    placeholder.disabled = true;
    placeholder.selected = true;
    sel.appendChild(placeholder);
    familias.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `${f.nome} (${f.responsavel})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
  }
}

// carrega e exibe saldo de cestas
async function carregarSaldoCestas() {
  try {
    const r = await fetch("/api/estoque/saldo-cestas");
    if (!r.ok) return;
    const { saldo } = await r.json();
    document.getElementById(
      "saldoCestas"
    ).textContent = `Saldo de cestas: ${saldo}`;
  } catch (e) {
    console.error(e);
  }
}

let pageSaidas = 1;
const limitSaidas = 30;
let totalSaidas = 0;
const helpDistribuicaoSteps = [
  {
    titulo: "1. Confira o saldo",
    descricao:
      "Veja o saldo de cestas disponível no topo da página antes de iniciar uma nova distribuição.",
  },
  {
    titulo: "2. Preencha quem recebe",
    descricao:
      "Selecione a família beneficiada, informe a quantidade de cestas e identifique o responsável pela entrega.",
  },
  {
    titulo: "3. Registre a saída",
    descricao:
      "Informe data e observações relevantes, clique em \"Registrar Saída\" e acompanhe o histórico na tabela.",
  },
];
let helpDistribuicaoStepIndex = 0;
const helpDistribuicaoModal = document.getElementById("modalHelpDistribuicao");
const helpDistribuicaoContent = document.getElementById("helpDistribuicaoPassos");
const helpDistribuicaoInfo = document.getElementById("helpDistribuicaoPassoInfo");
const helpDistribuicaoPrev = document.getElementById("btnHelpDistribuicaoPrev");
const helpDistribuicaoNext = document.getElementById("btnHelpDistribuicaoNext");
const helpDistribuicaoOpen = document.getElementById("btnHelpDistribuicao");
const helpDistribuicaoClose = document.getElementById("fecharHelpDistribuicao");
// atualiza info da paginação
function updatePaginacaoSaidasInfo() {
  const info = document.getElementById("infoSaidas");
  if (!info) return;
  const totalPages = Math.max(1, Math.ceil(totalSaidas / limitSaidas));
  info.textContent = `Página ${pageSaidas} de ${totalPages}`;
  const prev = document.getElementById("prevSaidas");
  const next = document.getElementById("nextSaidas");
  if (prev) prev.disabled = pageSaidas <= 1;
  if (next) next.disabled = pageSaidas >= totalPages;
}

// carrega e exibe saídas recentes
async function carregarSaidasRecentes() {
  try {
    const r = await fetch(
      `/api/saidas?page=${pageSaidas}&limit=${limitSaidas}`
    );
    if (!r.ok) return;
    const payload = await r.json();
    const rows = Array.isArray(payload) ? payload : payload.data || [];
    totalSaidas =
      (Array.isArray(payload) ? rows.length : payload.total ?? rows.length) ||
      0;
    const tbody = document.querySelector("#tabSaidas tbody");
    tbody.innerHTML = "";
    rows.forEach((s) => {
      const tr = document.createElement("tr");
      const d = s.data ? new Date(s.data) : null;
      const dstr =
        d && !Number.isNaN(d.getTime())
          ? `${String(d.getDate()).padStart(2, "0")}/${String(
              d.getMonth() + 1
            ).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`
          : "";
      tr.innerHTML = `<td>${dstr}</td><td>${
        s.familia_nome || ""
      }</td><td>${s.qtd}</td><td>${s.responsavel || ""}</td><td>${
        s.obs || ""
      }</td>`;
      tbody.appendChild(tr);
    });
    updatePaginacaoSaidasInfo();
  } catch (e) {
    console.error(e);
  }
}

// registra nova saída de cestas
async function distribuirCestas() {
  const data = document.getElementById("saData").value;
  const familia_id =
    parseInt(document.getElementById("saFamilia").value, 10) || null;
  const qtd = parseInt(document.getElementById("saQtd").value, 10) || 0;
  const responsavel = document.getElementById("saResponsavel").value;
  const obs = document.getElementById("saObs").value;
  if (!data || !familia_id || !qtd || qtd <= 0 || !responsavel) {
    alert("Preencha data, família, quantidade e responsável");
    return;
  }
  try {
    const r = await fetch("/api/saidas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, familia_id, qtd, responsavel, obs }),
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(txt || "Falha ao registrar saída");
    await carregarSaldoCestas();
    await carregarSaidasRecentes();
    alert("Saída registrada");
  } catch (e) {
    console.error(e);
    alert("Erro: " + e.message);
  }
}

// Inicialização
(function init() {
  document.getElementById("saData").valueAsDate = new Date();
  document
    .getElementById("btnDistribuir")
    .addEventListener("click", distribuirCestas);
  carregarColaboradores();
  carregarFamilias();
  carregarSaldoCestas();
  carregarSaidasRecentes();
  const prev = document.getElementById("prevSaidas");
  const next = document.getElementById("nextSaidas");
  if (prev)
    prev.addEventListener("click", async () => {
      if (pageSaidas > 1) {
        pageSaidas--;
        await carregarSaidasRecentes();
      }
    });
  if (next)
    next.addEventListener("click", async () => {
      const totalPages = Math.max(1, Math.ceil(totalSaidas / limitSaidas));
      if (pageSaidas < totalPages) {
        pageSaidas++;
        await carregarSaidasRecentes();
      }
    });
})();

function renderHelpDistribuicaoStep() {
  if (!helpDistribuicaoContent || !helpDistribuicaoSteps.length) return;
  const step = helpDistribuicaoSteps[helpDistribuicaoStepIndex];
  helpDistribuicaoContent.innerHTML = `
    <div class="help-step">
      <h3>${step.titulo}</h3>
      <p>${step.descricao}</p>
    </div>`;
  if (helpDistribuicaoInfo) {
    helpDistribuicaoInfo.textContent = `Passo ${helpDistribuicaoStepIndex + 1} de ${helpDistribuicaoSteps.length}`;
  }
  if (helpDistribuicaoPrev) {
    helpDistribuicaoPrev.disabled = helpDistribuicaoStepIndex === 0;
  }
  if (helpDistribuicaoNext) {
    helpDistribuicaoNext.disabled = helpDistribuicaoStepIndex === helpDistribuicaoSteps.length - 1;
  }
}

function abrirHelpDistribuicao() {
  if (!helpDistribuicaoModal) return;
  helpDistribuicaoStepIndex = 0;
  renderHelpDistribuicaoStep();
  helpDistribuicaoModal.classList.remove("saindo");
  helpDistribuicaoModal.style.display = "block";
  void helpDistribuicaoModal.offsetWidth;
  helpDistribuicaoModal.classList.add("mostrar");
}

function fecharHelpDistribuicao() {
  if (!helpDistribuicaoModal) return;
  helpDistribuicaoModal.classList.remove("mostrar");
  helpDistribuicaoModal.classList.add("saindo");
  const content = helpDistribuicaoModal.querySelector(".modal-conteudo");
  const done = () => {
    helpDistribuicaoModal.style.display = "none";
    helpDistribuicaoModal.classList.remove("saindo");
    if (content) content.removeEventListener("transitionend", onEnd);
  };
  const onEnd = (event) => {
    if (event.target === content) done();
  };
  if (content) content.addEventListener("transitionend", onEnd);
  else setTimeout(done, 240);
}

helpDistribuicaoOpen?.addEventListener("click", abrirHelpDistribuicao);
helpDistribuicaoClose?.addEventListener("click", fecharHelpDistribuicao);
helpDistribuicaoPrev?.addEventListener("click", () => {
  if (helpDistribuicaoStepIndex === 0) return;
  helpDistribuicaoStepIndex -= 1;
  renderHelpDistribuicaoStep();
});
helpDistribuicaoNext?.addEventListener("click", () => {
  if (helpDistribuicaoStepIndex >= helpDistribuicaoSteps.length - 1) return;
  helpDistribuicaoStepIndex += 1;
  renderHelpDistribuicaoStep();
});

document.addEventListener("click", (event) => {
  if (event.target === helpDistribuicaoModal) fecharHelpDistribuicao();
});
