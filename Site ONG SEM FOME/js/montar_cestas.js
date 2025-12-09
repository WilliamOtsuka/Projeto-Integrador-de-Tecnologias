let estoque = [];
let itensSelecionados = [];
let solicitacoesCesta = [];
const helpMontagemSteps = [
  {
    titulo: "1. Defina a montagem",
    descricao:
      "Informe data, responsável e quantidade de cestas. Esses campos determinam quando e por quem a montagem será realizada.",
  },
  {
    titulo: "2. Vincule solicitações e observações",
    descricao:
      "Selecione uma solicitação aprovada, se aplicável, e registre observações importantes para rastreabilidade.",
  },
  {
    titulo: "3. Adicione itens do estoque",
    descricao:
      "Escolha cada item disponível, informe a quantidade por cesta e clique em Adicionar. Use ao menos três itens diferentes.",
  },
  {
    titulo: "4. Valide e salve",
    descricao:
      "Verifique se há saldo suficiente para todas as cestas e clique em \"Salvar Montagem\" para atualizar o estoque automaticamente.",
  },
];
let helpMontagemStepIndex = 0;

async function carregarEstoque() {
  const r = await fetch("/api/entradas?limit=10000");
  if (!r.ok) throw new Error("Falha ao carregar entradas");
  const payload = await r.json();
  const entradas = Array.isArray(payload) ? payload : (payload.data || []);
  const map = new Map();
  for (const e of entradas) {
    const key = `${(e.categoria || "").trim().toLowerCase()}__${(
      e.unidade || ""
    )
      .trim()
      .toLowerCase()}`;
    const atual = map.get(key) || {
      categoria: e.categoria,
      unidade: e.unidade.toLowerCase(),
      quantidade: 0,
    };
    atual.quantidade += Number(e.quantidade) || 0;
    map.set(key, atual);
  }
  estoque = Array.from(map.values()).filter((i) => i.quantidade > 0);
  // Filtra itens com saldo positivo e exclui a própria cesta básica
  estoque = Array.from(map.values()).filter((i) => {
    if (!i || !i.quantidade || i.quantidade <= 0) return false;
    const cat = String(i.categoria || "")
      .trim()
      .toLowerCase();
    const un = String(i.unidade || "")
      .trim()
      .toLowerCase();
    // Não permitir usar cestas como insumo
    if (cat === "cesta básica" || un === "cesta") return false;
    return true;
  });
  popularSeletorItens();
}

async function carregarSolicitacoesCestaBasica() {
  try {
    const r = await fetch('/api/solicitacoes?limit=1000');
    if (!r.ok) return;
    const payload = await r.json();
    const lista = Array.isArray(payload) ? payload : (payload.data || []);
    solicitacoesCesta = lista.filter(s => {
      const statusAtual = String(s.status || '').toLowerCase();
      const categoriaNome = (s.categoria_nome || s.categoria || '').toLowerCase();
      return (statusAtual === 'aprovado' || statusAtual === 'em compra') && categoriaNome === 'cesta básica';
    });
    const sel = document.getElementById('mcSolicitacao');
    if (!sel) return;
    sel.innerHTML = '<option value="">Não vincular</option>';
    solicitacoesCesta.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      const qtdTxt = (s.quantidade != null ? ` - ${s.quantidade} ${s.unidade || ''}` : '');
      opt.textContent = `#${s.id} - ${s.titulo || 'Cesta Básica'}${qtdTxt}`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Falha ao carregar solicitações de Cesta Básica', e);
  }
}

async function carregarResponsaveisMontagem() {
  const sel = document.getElementById('mcResp');
  if (!sel) return;
  try {
    const r = await fetch('/api/colaboradores?limit=1000');
    if (!r.ok) throw new Error('Falha ao carregar colaboradores');
    const payload = await r.json();
    const lista = Array.isArray(payload) ? payload : (payload.data || []);
    sel.innerHTML = '<option value="" disabled selected>Selecione o responsável</option>';
    lista
      .slice()
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
      .forEach((col) => {
        const opt = document.createElement('option');
        const id = col.id ?? col.id_colaborador;
        opt.value = id;
        opt.textContent = col.nome;
        sel.appendChild(opt);
      });
  } catch (e) {
    console.error('Falha ao carregar responsáveis', e);
    sel.innerHTML = '<option value="" disabled selected>Falha ao carregar responsáveis</option>';
  }
}

function popularSeletorItens() {
  const sel = document.getElementById("mcItem");
  sel.innerHTML = "";
  estoque
    .sort(
      (a, b) =>
        a.categoria.localeCompare(b.categoria) ||
        a.unidade.localeCompare(b.unidade)
    )
    .forEach((i) => {
      const opt = document.createElement("option");
      opt.value = `${i.categoria}||${i.unidade}`;
      opt.textContent = `${i.categoria} (${i.unidade}) — saldo: ${i.quantidade}`;
      sel.appendChild(opt);
    });
  atualizarSaldoInfo();
}

function atualizarSaldoInfo() {
  const sel = document.getElementById("mcItem");
  const info = document.getElementById("mcSaldoInfo");
  const val = sel.value;
  const [cat, un] = val.split("||");
  const item = estoque.find((x) => x.categoria === cat && x.unidade === un);
  info.textContent = item ? `Disponível: ${item.quantidade} ${un}` : "";
}

document
  .getElementById("mcItem")
  .addEventListener("change", atualizarSaldoInfo);

document.getElementById("btnAddItem").addEventListener("click", () => {
  const sel = document.getElementById("mcItem");
  const qtd = parseInt(document.getElementById("mcQtdItem").value, 10) || 0;
  if (!sel.value || qtd <= 0) return;
  const [cat, un] = sel.value.split("||");

  if (
    String(cat).trim().toLowerCase() === "cesta básica" ||
    String(un).trim().toLowerCase() === "cesta"
  ) {
    alert("Não é permitido utilizar cestas como item de montagem");
    return;
  }

  const estoqueItem = estoque.find((x) => x.categoria === cat && x.unidade === un);
  if (!estoqueItem) {
    alert("Item sem saldo no estoque");
    return;
  }
  // Quantidade aqui é por cesta; apenas adiciona, validação total ocorrerá no salvar
  itensSelecionados.push({ categoria: cat, unidade: un, quantidade: qtd });
  renderItensSelecionados();
});

function renderItensSelecionados() {
  const tbody = document.querySelector("#mcItensTable tbody");
  tbody.innerHTML = "";
  itensSelecionados.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${it.categoria}</td><td>${it.unidade}</td><td>${it.quantidade}</td><td><button class="btn-delete" data-i="${idx}">Remover</button></td>`;
    tr.querySelector("button").addEventListener("click", () => {
      itensSelecionados.splice(idx, 1);
      renderItensSelecionados();
    });
    tbody.appendChild(tr);
  });
}

document
  .getElementById("btnSalvarMontagem")
  .addEventListener("click", async () => {
    const data = document.getElementById("mcData").value;
    const responsavelSel = document.getElementById('mcResp');
    const responsavelId = parseInt(responsavelSel?.value || '0', 10) || 0;
    const qtd_cestas =
      parseInt(document.getElementById("mcQtd").value, 10) || 0;
  const obs = document.getElementById("mcObs").value;
  const solicitacao_id = document.getElementById('mcSolicitacao')?.value || null;
    if (
      !data ||
      !responsavelId ||
      qtd_cestas <= 0 ||
      itensSelecionados.length === 0
    ) {
      alert(
        "Preencha data, responsável, quantidade de cestas e adicione itens"
      );
      return;
    }
    // Exigir ao menos 3 itens distintos (categoria+unidade)
    const distintos = new Set(
      itensSelecionados.map((it) => `${it.categoria}||${it.unidade}`)
    );
    if (distintos.size < 3) {
      alert("A montagem deve conter pelo menos 3 itens distintos");
      return;
    }
    // Validação de estoque: calcular necessidade total por item
    const saldoMap = new Map(estoque.map(i => [`${i.categoria}||${i.unidade}`, Number(i.quantidade) || 0]));
    const agregados = new Map();
    for (const it of itensSelecionados) {
      const key = `${it.categoria}||${it.unidade}`;
      const current = agregados.get(key) || 0;
      agregados.set(key, current + (Number(it.quantidade) || 0));
    }
    const faltas = [];
    agregados.forEach((qtdPorCesta, key) => {
      const [cat, un] = key.split("||");
      const necessario = qtdPorCesta * qtd_cestas;
      const disponivel = saldoMap.get(key) || 0;
      if (necessario > disponivel) {
        faltas.push({ categoria: cat, unidade: un, disponivel, necessario });
      }
    });
    if (faltas.length > 0) {
      const msg = faltas.map(f => `${f.categoria} (${f.unidade}) — disponível: ${f.disponivel}, necessário: ${f.necessario}`).join("; ");
      alert("Estoque insuficiente. " + msg);
      return;
    }

    try {
      const r = await fetch("/api/montagens/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          responsavel_id: responsavelId,
          qtd_cestas,
          obs,
          itens: itensSelecionados,
          solicitacao_id: solicitacao_id ? Number(solicitacao_id) : null,
        }),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || "Erro ao salvar montagem");
      }
      alert("Montagem registrada e estoque atualizado");
      itensSelecionados = [];
      renderItensSelecionados();
      await carregarEstoque();
    } catch (e) {
      console.error(e);
      alert("Falha ao registrar montagem: " + e.message);
    }
  });

Promise.all([carregarEstoque(), carregarSolicitacoesCestaBasica(), carregarResponsaveisMontagem()]).catch((err) => {
  console.error(err);
  if (err?.message?.includes("401")) {
    alert("Sessão expirada. Faça login.");
    window.location.href = "login_page.html";
  }
});

const helpModalMontagem = document.getElementById("modalHelpMontagem");
const helpContentMontagem = document.getElementById("helpMontagemPassos");
const helpInfoMontagem = document.getElementById("helpPassoInfoMontagem");
const helpPrevMontagem = document.getElementById("btnHelpPrevMontagem");
const helpNextMontagem = document.getElementById("btnHelpNextMontagem");

function renderHelpMontagemStep() {
  if (!helpMontagemSteps.length || !helpContentMontagem) return;
  const step = helpMontagemSteps[helpMontagemStepIndex];
  helpContentMontagem.innerHTML = `
    <div class="help-step">
      <h3>${step.titulo}</h3>
      <p>${step.descricao}</p>
    </div>`;
  if (helpInfoMontagem) {
    helpInfoMontagem.textContent = `Passo ${helpMontagemStepIndex + 1} de ${helpMontagemSteps.length}`;
  }
  if (helpPrevMontagem) helpPrevMontagem.disabled = helpMontagemStepIndex === 0;
  if (helpNextMontagem)
    helpNextMontagem.disabled = helpMontagemStepIndex === helpMontagemSteps.length - 1;
}

function abrirHelpMontagem() {
  if (!helpModalMontagem) return;
  helpMontagemStepIndex = 0;
  renderHelpMontagemStep();
  helpModalMontagem.classList.remove("saindo");
  helpModalMontagem.style.display = "block";
  void helpModalMontagem.offsetWidth;
  helpModalMontagem.classList.add("mostrar");
}

function fecharHelpMontagem() {
  if (!helpModalMontagem) return;
  helpModalMontagem.classList.remove("mostrar");
  helpModalMontagem.classList.add("saindo");
  const content = helpModalMontagem.querySelector(".modal-conteudo");
  const done = () => {
    helpModalMontagem.style.display = "none";
    helpModalMontagem.classList.remove("saindo");
    if (content) content.removeEventListener("transitionend", onEnd);
  };
  const onEnd = (event) => {
    if (event.target === content) done();
  };
  if (content) {
    content.addEventListener("transitionend", onEnd);
  } else {
    setTimeout(done, 240);
  }
}

const btnHelpMontagem = document.getElementById("btnHelpMontagem");
const fecharHelpMontagemBtn = document.getElementById("fecharHelpMontagem");
if (btnHelpMontagem) btnHelpMontagem.addEventListener("click", abrirHelpMontagem);
if (fecharHelpMontagemBtn)
  fecharHelpMontagemBtn.addEventListener("click", fecharHelpMontagem);
if (helpPrevMontagem)
  helpPrevMontagem.addEventListener("click", () => {
    if (helpMontagemStepIndex === 0) return;
    helpMontagemStepIndex -= 1;
    renderHelpMontagemStep();
  });
if (helpNextMontagem)
  helpNextMontagem.addEventListener("click", () => {
    if (helpMontagemStepIndex >= helpMontagemSteps.length - 1) return;
    helpMontagemStepIndex += 1;
    renderHelpMontagemStep();
  });

document.addEventListener("click", (event) => {
  if (event.target === helpModalMontagem) {
    fecharHelpMontagem();
  }
});
