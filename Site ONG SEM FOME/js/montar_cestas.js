let estoque = [];
let itensSelecionados = [];

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
    const responsavel = document.getElementById("mcResp").value.trim();
    const qtd_cestas =
      parseInt(document.getElementById("mcQtd").value, 10) || 0;
    const obs = document.getElementById("mcObs").value;
    if (
      !data ||
      !responsavel ||
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
          responsavel,
          qtd_cestas,
          obs,
          itens: itensSelecionados,
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

carregarEstoque().catch((err) => {
  console.error(err);
  if (err?.message?.includes("401")) {
    alert("Sessão expirada. Faça login.");
    window.location.href = "login_page.html";
  }
});
