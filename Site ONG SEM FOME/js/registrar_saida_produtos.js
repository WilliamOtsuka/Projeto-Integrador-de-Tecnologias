const unidadesValidasSaida = new Set(["un","kg","g","l","ml","cx","pct","sac","kit","lata"]);
const normalizaUnidade = (v = "") => v.trim().toLowerCase();
const apenasDigitos = (v = "") => v.replace(/\D/g, "");
const normalizaTexto = (v = "") => v.trim().toLowerCase();

const categoriaSaidaEl = document.getElementById("spCategoria");
const itemSaidaEl = document.getElementById("spItem");
const campoItemSaida = document.getElementById("campoItemSaida");
const unidadeSaidaEl = document.getElementById("spUnidade");
const quantidadeSaidaEl = document.getElementById("spQuantidade");
const saldoInfoEl = document.getElementById("spSaldoInfo");
const tipoSaidaEl = document.getElementById("spTipoSaida");
const campoFamiliaSaida = document.getElementById("campoFamiliaSaida");
const familiaSaidaEl = document.getElementById("spFamilia");
const responsavelEl = document.getElementById("spResponsavel");
const dataEl = document.getElementById("spData");
const obsEl = document.getElementById("spObs");
const formSaidaProdutos = document.getElementById("formSaidaProdutos");

const estoqueAggregado = new Map();

function categoriaSelecionadaAtual() {
  if (!categoriaSaidaEl) return "";
  const opt = categoriaSaidaEl.options[categoriaSaidaEl.selectedIndex];
  if (!opt) return "";
  const tipo = opt.dataset?.tipo || "simples";
  if (tipo === "composta") {
    return (itemSaidaEl.value || "").trim();
  }
  return (opt.dataset?.nome || opt.textContent || "").trim();
}

function unidadesDisponiveisParaCategoria(nomeCategoria) {
  if (!nomeCategoria) return [];
  const catNorm = normalizaTexto(nomeCategoria);
  const unidades = [];
  estoqueAggregado.forEach((qtd, chave) => {
    if (!chave.includes("||")) return;
    const [cat, un] = chave.split("||");
    if (cat === catNorm && Number(qtd || 0) > 0 && !unidades.includes(un)) {
      unidades.push(un);
    }
  });
  return unidades;
}

function atualizarUnidadesParaCategoria() {
  if (!unidadeSaidaEl) return;
  const unidades = unidadesDisponiveisParaCategoria(categoriaSelecionadaAtual());
  const valorAtual = unidadeSaidaEl.value;
  unidadeSaidaEl.innerHTML = '<option value="" disabled selected>Selecione...</option>';
  if (!unidades.length) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "Sem unidades disponíveis";
    opt.disabled = true;
    unidadeSaidaEl.appendChild(opt);
    unidadeSaidaEl.value = "";
    unidadeSaidaEl.setCustomValidity("Selecione uma categoria com saldo disponível");
    return;
  }
  unidadeSaidaEl.setCustomValidity("");
  unidades.forEach((un) => {
    unidadesValidasSaida.add(un);
    const opt = document.createElement('option');
    opt.value = un;
    opt.textContent = un;
    unidadeSaidaEl.appendChild(opt);
  });
  if (valorAtual && unidades.includes(valorAtual)) {
    unidadeSaidaEl.value = valorAtual;
  } else {
    unidadeSaidaEl.selectedIndex = 0;
  }
}

function hojeISO() {
  const hoje = new Date();
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  const dd = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${mm}-${dd}`;
}

async function carregarResponsaveis() {
  try {
    const r = await fetch("/api/colaboradores?limit=1000");
    if (!r.ok) return;
    const payload = await r.json();
    const colaboradores = Array.isArray(payload) ? payload : payload.data || [];
    responsavelEl.innerHTML = '<option value="" disabled selected>Selecione</option>';
    colaboradores.forEach((col) => {
      const opt = document.createElement("option");
      opt.value = col.nome;
      opt.textContent = col.nome;
      responsavelEl.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar responsáveis", err);
  }
}

async function carregarFamilias() {
  try {
    const r = await fetch("/api/familias?limit=1000");
    if (!r.ok) return;
    const payload = await r.json();
    const familias = Array.isArray(payload) ? payload : payload.data || [];
    familiaSaidaEl.innerHTML = '<option value="" disabled selected>Selecione</option>';
    familias.forEach((fam) => {
      const opt = document.createElement("option");
      opt.value = fam.id_familia || fam.id || "";
      opt.dataset.nome = fam.nome;
      opt.textContent = `${fam.nome} (${fam.responsavel})`;
      familiaSaidaEl.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar famílias", err);
  }
}

async function carregarCategoriasSaida(selectEl) {
  try {
    const r = await fetch("/api/categorias?limit=1000");
    if (!r.ok) throw new Error("Falha ao carregar categorias");
    const payload = await r.json();
    const categorias = Array.isArray(payload) ? payload : payload.data || [];
    selectEl.innerHTML = '<option value="" disabled selected>Selecione a categoria</option>';
    categorias
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((cat) => {
        const opt = document.createElement("option");
        const id = String(cat.id ?? cat.id_categoria ?? "");
        opt.value = id || cat.nome;
        opt.dataset.nome = cat.nome;
        opt.dataset.tipo = String(cat.tipo || "simples").toLowerCase();
        opt.textContent = cat.nome;
        selectEl.appendChild(opt);
      });
  } catch (err) {
    console.error(err);
  }
}

function ocultarItemSaida() {
  campoItemSaida.style.display = "none";
  itemSaidaEl.required = false;
  itemSaidaEl.innerHTML = '<option value="" disabled selected>Selecione o item</option>';
}

async function carregarSubitensSaida(categoriaId) {
  if (!categoriaId) return;
  try {
    itemSaidaEl.innerHTML = '<option value="" disabled selected>Carregando...</option>';
    const r = await fetch(`/api/categorias/${categoriaId}/itens`);
    const itens = r.ok ? await r.json() : [];
    itemSaidaEl.innerHTML = '<option value="" disabled selected>Selecione o item</option>';
    itens.forEach((it) => {
      const opt = document.createElement("option");
      opt.value = it.nome;
      opt.textContent = it.nome;
      itemSaidaEl.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

function chaveEstoque(cat, un) {
  if (!cat || !un) return null;
  return `${cat.trim().toLowerCase()}||${un.trim().toLowerCase()}`;
}

async function carregarEstoqueAgrupado() {
  try {
    const r = await fetch("/api/entradas?limit=10000");
    if (!r.ok) return;
    const payload = await r.json();
    const entradas = Array.isArray(payload) ? payload : payload.data || [];
    estoqueAggregado.clear();
    entradas.forEach((ent) => {
      const cat = (ent.categoria || "").trim().toLowerCase();
      const un = (ent.unidade || "").trim().toLowerCase();
      if (!cat || !un) return;
      const key = chaveEstoque(cat, un);
      const atual = estoqueAggregado.get(key) || 0;
      estoqueAggregado.set(key, atual + Number(ent.quantidade || 0));
    });
    atualizarUnidadesParaCategoria();
  } catch (err) {
    console.error("Erro ao carregar saldo do estoque", err);
  }
}

function saldoDisponivelAtual() {
  if (!categoriaSaidaEl) return 0;
  const opt = categoriaSaidaEl.options[categoriaSaidaEl.selectedIndex];
  if (!opt) return 0;
  const tipo = opt.dataset.tipo || "simples";
  const categNome = tipo === "composta" ? (itemSaidaEl.value || "") : (opt.dataset.nome || opt.textContent || "");
  const unidade = normalizaUnidade(unidadeSaidaEl.value || "");
  const key = chaveEstoque(categNome, unidade);
  if (!key) return 0;
  return Number(estoqueAggregado.get(key) || 0);
}

function atualizarSaldoInfo() {
  const saldo = saldoDisponivelAtual();
  const unidade = normalizaUnidade(unidadeSaidaEl.value || "");
  if (saldoInfoEl) {
    saldoInfoEl.textContent = saldo ? `Disponível: ${saldo} ${unidade}` : "";
  }
}

function atualizarCamposDestino() {
  const tipo = tipoSaidaEl.value;
  if (tipo === "familia") {
    campoFamiliaSaida.style.display = "";
    familiaSaidaEl.required = true;
  } else if (tipo) {
    campoFamiliaSaida.style.display = "none";
    familiaSaidaEl.required = false;
  } else {
    campoFamiliaSaida.style.display = "none";
    familiaSaidaEl.required = false;
  }
}

tipoSaidaEl?.addEventListener("change", atualizarCamposDestino);

categoriaSaidaEl?.addEventListener("change", (e) => {
  const opt = e.target.options[e.target.selectedIndex];
  const tipo = opt?.dataset?.tipo || "simples";
  if (tipo === "composta") {
    campoItemSaida.style.display = "";
    itemSaidaEl.required = true;
    carregarSubitensSaida(opt.value);
  } else {
    ocultarItemSaida();
  }
  atualizarUnidadesParaCategoria();
  atualizarSaldoInfo();
});

itemSaidaEl?.addEventListener("change", () => {
  atualizarUnidadesParaCategoria();
  atualizarSaldoInfo();
});
unidadeSaidaEl?.addEventListener("change", (e) => {
  e.target.value = normalizaUnidade(e.target.value);
  if (!unidadesValidasSaida.has(e.target.value)) {
    e.target.setCustomValidity("Unidade inválida");
  } else {
    e.target.setCustomValidity("");
  }
  atualizarSaldoInfo();
});

quantidadeSaidaEl?.addEventListener("input", (e) => {
  const val = apenasDigitos(e.target.value).replace(/^0+/, "");
  e.target.value = val;
  const qtd = Number(val || 0);
  const saldo = saldoDisponivelAtual();
  if (!qtd || qtd <= 0) {
    e.target.setCustomValidity("Informe uma quantidade");
  } else if (saldo && qtd > saldo) {
    e.target.setCustomValidity("Quantidade maior que o saldo disponível");
  } else {
    e.target.setCustomValidity("");
  }
});

formSaidaProdutos?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const opt = categoriaSaidaEl.options[categoriaSaidaEl.selectedIndex];
  if (!opt) {
    alert("Selecione a categoria");
    return;
  }
  const tipoCategoria = opt.dataset.tipo || "simples";
  const categoriaNome = tipoCategoria === "composta" ? (itemSaidaEl.value || "").trim() : (opt.dataset.nome || opt.textContent || "").trim();
  if (!categoriaNome) {
    alert("Selecione o item da categoria");
    return;
  }
  const unidade = normalizaUnidade(unidadeSaidaEl.value || "");
  const quantidade = parseInt(quantidadeSaidaEl.value, 10) || 0;
  if (!unidadesValidasSaida.has(unidade)) {
    alert("Unidade inválida");
    return;
  }
  if (!quantidade || quantidade <= 0) {
    alert("Informe a quantidade");
    return;
  }
  const saldo = saldoDisponivelAtual();
  if (saldo && quantidade > saldo) {
    alert("Quantidade maior que o saldo disponível");
    return;
  }
  const tipoSaida = tipoSaidaEl.value;
  if (!tipoSaida) {
    alert("Informe o tipo de saída");
    return;
  }
  if (!responsavelEl.value) {
    alert("Selecione o responsável");
    return;
  }
  let destinatario = "";
  if (tipoSaida === "familia") {
    const famOpt = familiaSaidaEl.options[familiaSaidaEl.selectedIndex];
    destinatario = famOpt ? famOpt.textContent : "";
    if (!destinatario) {
      alert("Selecione a família");
      return;
    }
  } else {
    destinatario = tipoSaidaEl.options[tipoSaidaEl.selectedIndex]?.textContent || tipoSaida;
  }
  const motivo = tipoSaidaEl.options[tipoSaidaEl.selectedIndex]?.textContent || tipoSaida;

  const payload = {
    data: dataEl.value,
    categoria: categoriaNome,
    unidade,
    quantidade,
    motivo,
    tipo_saida: tipoSaida,
    destinatario,
    responsavel: responsavelEl.value,
    obs: (obsEl.value || "").trim(),
  };

  try {
    const resp = await fetch("/api/estoque/baixas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || "Falha ao registrar saída");
    }
    alert("Saída registrada com sucesso");
    formSaidaProdutos.reset();
    dataEl.value = hojeISO();
    if (categoriaSaidaEl) categoriaSaidaEl.selectedIndex = 0;
    if (responsavelEl) responsavelEl.selectedIndex = 0;
    if (tipoSaidaEl) tipoSaidaEl.selectedIndex = 0;
    if (familiaSaidaEl) familiaSaidaEl.selectedIndex = 0;
    atualizarCamposDestino();
    ocultarItemSaida();
    await carregarEstoqueAgrupado();
    atualizarUnidadesParaCategoria();
    atualizarSaldoInfo();
  } catch (err) {
    console.error(err);
    alert(`Erro ao registrar saída: ${err.message}`);
  }
});

(async function initSaidaProdutos() {
  dataEl.value = hojeISO();
  await Promise.all([
    carregarResponsaveis(),
    carregarFamilias(),
    carregarCategoriasSaida(categoriaSaidaEl),
    carregarEstoqueAgrupado(),
  ]);
  atualizarCamposDestino();
  atualizarUnidadesParaCategoria();
  atualizarSaldoInfo();
})();
