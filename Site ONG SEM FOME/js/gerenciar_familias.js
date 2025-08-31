// Estado local da página (lista de famílias carregadas da API)
let familias = [];

// Helpers de formatação/validação (CEP, UF, telefone, etc.)
const onlyDigits = (v) => (v || "").replace(/\D/g, "");
const UFs = new Set(["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",]);

function normalizaCEP(v) {
  return onlyDigits(v).slice(0, 8);
}

function formatCEP(d) {
  return d.ength > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function normalizaUF(v) {
  return (v || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);
}

function validaUF(v) {
  return UFs.has(normalizaUF(v));
}

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

function enderecoResumo(f) {
  const p1 = [f.logradouro, f.numero].filter(Boolean).join(", ");
  const p2 = [
    f.bairro,
    f.cidade && f.uf ? `${f.cidade}/${f.uf}` : f.cidade || f.uf,
  ]
    .filter(Boolean)
    .join(" - ");
  const cep = f.cep ? ` CEP ${f.cep}` : "";
  return [p1, p2].filter(Boolean).join(" | ") + cep;
}

// Re-renderiza a tabela com os dados atuais em `familias`
function renderTabela() {
  const tbody = document.querySelector("#tabelaFamilias tbody");
  tbody.innerHTML = "";
  familias.forEach((fam) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
			<td>${fam.id}</td>
			<td>${fam.nome}</td>
			<td>${fam.responsavel}</td>
			<td>${fam.contato}</td>
			<td>${enderecoResumo(fam)}</td>
			<td>
				<button class="btn-edit" onclick="editarFamilia(${fam.id})">Editar</button>
				<button class="btn-delete" onclick="excluirFamilia(${fam.id})">Excluir</button>
			</td>
		`;
    tbody.appendChild(tr);
  });
}

// Helpers de animação do modal (fade-in/fade-out)
function showModalWithAnim(modal) {
  if (!modal) return;
  
  modal.classList.remove("saindo");
  modal.style.display = "block";
  void modal.offsetWidth; // force reflow para iniciar transição
  modal.classList.add("mostrar");
}

function hideModalWithAnim(modal) {
  if (!modal) return;

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

// Abre o modal e preenche o formulário quando em modo edição
function abrirModal(editar = false, familia = {}) {
  showModalWithAnim(document.getElementById("modalFamilia"));
  document.getElementById("tituloModal").textContent = editar
    ? "Editar Família"
    : "Adicionar Família";
  document.getElementById("familiaId").value = familia.id || "";
  document.getElementById("nomeFamilia").value = familia.nome || "";
  document.getElementById("responsavel").value = familia.responsavel || "";
  document.getElementById("contato").value = familia.contato || "";
  document.getElementById("cepFamilia").value = familia.cep || "";
  const st = document.getElementById("cepFamiliaStatus");
  if (st) st.textContent = "";
  document.getElementById("logradouroFamilia").value = familia.logradouro || "";
  document.getElementById("numeroFamilia").value = familia.numero || "";
  document.getElementById("complementoFamilia").value =
    familia.complemento || "";
  document.getElementById("bairroFamilia").value = familia.bairro || "";
  document.getElementById("cidadeFamilia").value = familia.cidade || "";
  document.getElementById("ufFamilia").value = familia.uf || "";
}

// Fecha o modal
function fecharModal() {
  hideModalWithAnim(document.getElementById("modalFamilia"));
}

// Ações de abrir/fechar modal
document.getElementById("btnAdicionarFamilia").onclick = () => abrirModal();

document.querySelectorAll("#fecharModalBtn").forEach((el) => {
  el.addEventListener("click", fecharModal);
});

// Fecha o modal ao clicar fora do conteúdo
window.onclick = function (event) {
  if (event.target == document.getElementById("modalFamilia")) {
    fecharModal();
  }
};

// Submit do formulário: valida campos e cria/atualiza via API
document.getElementById("formFamilia").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("familiaId").value;
  const nome = document.getElementById("nomeFamilia").value;
  const responsavel = document.getElementById("responsavel").value;
  const contato = document.getElementById("contato").value;
  // Endereço detalhado
  const cep = formatCEP(
    normalizaCEP(document.getElementById("cepFamilia").value)
  );
  const logradouro = document.getElementById("logradouroFamilia").value;
  const numero = document.getElementById("numeroFamilia").value;
  const complemento = document.getElementById("complementoFamilia").value;
  const bairro = document.getElementById("bairroFamilia").value;
  const cidade = document.getElementById("cidadeFamilia").value;
  const uf = normalizaUF(document.getElementById("ufFamilia").value);

  // Validar campos principais (nome, contato, CEP, endereço, UF, etc.)
  const nomeOk = (nome || "").trim().length >= 2;
  const respOk = (responsavel || "").trim().length >= 2;
  const contatoOk = validaTelefone(contato);
  const cepOk = normalizaCEP(cep).length === 8;
  const logOk = (logradouro || "").trim().length > 0;
  const numOk = (numero || "").trim().length > 0;
  const baiOk = (bairro || "").trim().length > 0;
  const cidOk = (cidade || "").trim().length > 0;
  const ufOk = validaUF(uf);

  document
    .getElementById("nomeFamilia")
    .setCustomValidity(nomeOk ? "" : "Informe o nome da família");
  document
    .getElementById("responsavel")
    .setCustomValidity(respOk ? "" : "Informe o responsável");
  document
    .getElementById("contato")
    .setCustomValidity(contatoOk ? "" : "Telefone inválido");
  document
    .getElementById("cepFamilia")
    .setCustomValidity(cepOk ? "" : "CEP inválido");
  document
    .getElementById("logradouroFamilia")
    .setCustomValidity(logOk ? "" : "Informe a rua");
  document
    .getElementById("numeroFamilia")
    .setCustomValidity(numOk ? "" : "Informe o número");
  document
    .getElementById("bairroFamilia")
    .setCustomValidity(baiOk ? "" : "Informe o bairro");
  document
    .getElementById("cidadeFamilia")
    .setCustomValidity(cidOk ? "" : "Informe a cidade");
  document
    .getElementById("ufFamilia")
    .setCustomValidity(ufOk ? "" : "UF inválida");

  if (
    !(
      nomeOk &&
      respOk &&
      contatoOk &&
      cepOk &&
      logOk &&
      numOk &&
      baiOk &&
      cidOk &&
      ufOk
    )
  ) {
    document.getElementById("formFamilia").reportValidity();
    return;
  }

  const payload = {
    nome,
    responsavel,
    contato,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
  };
  (async () => {
    try {
      // Se há ID, atualiza; senão, cria
      if (id) {
        await fetch(`/api/familias/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/familias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      fecharModal();
      await loadFamilias();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar família");
    }
  })();
};

// Prepara modal em modo edição
window.editarFamilia = function (id) {
  const familia = familias.find((f) => f.id == id);

  if (familia) abrirModal(true, familia);
};

// Confirma e exclui
window.excluirFamilia = function (id) {
  if (confirm("Tem certeza que deseja excluir esta família?")) {
    (async () => {
      try {
        await fetch(`/api/familias/${id}`, { method: "DELETE" });
        await loadFamilias();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir família");
      }
    })();
  }
};

// Carrega famílias
async function loadFamilias() {
  try {
    const r = await fetch("/api/familias");
    if (!r.ok) {
      if (r.status === 401) {
        alert("Sessão expirada. Faça login.");
        window.location.href = "login_page.html";
        return;
      }
      throw new Error("Falha ao carregar famílias");
    }
    familias = await r.json();

    renderTabela();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar famílias");
  }
}

loadFamilias();

// ViaCEP: máscara e busca do endereço por CEP
const cepInput = document.getElementById("cepFamilia");

if (cepInput) {
  cepInput.addEventListener("input", (e) => {
    const d = normalizaCEP(e.target.value);
    e.target.value = formatCEP(d);
    e.target.setCustomValidity(
      d.length === 8 ? "" : "CEP deve conter 8 dígitos"
    );
  });
  cepInput.addEventListener("blur", (e) => {
    const d = normalizaCEP(e.target.value);
    e.target.setCustomValidity(
      d.length === 8 ? "" : "CEP deve conter 8 dígitos"
    );

    if (d.length === 8) buscarCEPFamilia(d);
  });
  cepInput.addEventListener("keyup", (e) => {
    const d = normalizaCEP(e.target.value);

    if (d.length === 8) buscarCEPFamilia(d);
  });
}

// Consulta ViaCEP e preenche campos
async function buscarCEPFamilia(cepRaw) {
  const status = document.getElementById("cepFamiliaStatus");
  const cep = normalizaCEP(cepRaw);

  if (status) {
    status.textContent = "Buscando endereço…";
    status.style.color = "#666";
  }
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!resp.ok) throw new Error("Falha na consulta");

    const data = await resp.json();

    if (data.erro) {
      if (status) {
        status.textContent = "CEP não encontrado";
        status.style.color = "#a00";
      }
      return;
    }
    const log = document.getElementById("logradouroFamilia");
    if (log) log.value = data.logradouro || "";
    const bai = document.getElementById("bairroFamilia");
    if (bai) bai.value = data.bairro || "";
    const cid = document.getElementById("cidadeFamilia");
    if (cid) cid.value = data.localidade || "";
    const uf = document.getElementById("ufFamilia");
    if (uf) uf.value = (data.uf || "").toUpperCase();

    if (status) {
      status.textContent = "Endereço sugerido. Confira os dados";
      status.style.color = "#2e7d32";
    }
  } catch (err) {
    if (status) {
      status.textContent = "Erro ao buscar CEP";
      status.style.color = "#a00";
    }
  }
}

// Número e UF
const numeroInput = document.getElementById("numeroFamilia");

if (numeroInput) {
  numeroInput.addEventListener("input", (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 6);
  });
}
const ufInput = document.getElementById("ufFamilia");

if (ufInput) {
  ufInput.addEventListener("input", (e) => {
    e.target.value = normalizaUF(e.target.value);
  });
  ufInput.addEventListener("blur", (e) => {
    e.target.setCustomValidity(validaUF(e.target.value) ? "" : "UF inválida");
  });
}
const contatoInput = document.getElementById("contato");
// Validações e máscaras
if (contatoInput) {
  contatoInput.addEventListener("input", (e) => {
    e.target.value = maskTelefone(e.target.value);
    e.target.setCustomValidity(
      validaTelefone(e.target.value) ? "" : "Telefone inválido"
    );
  });
  contatoInput.addEventListener("blur", (e) => {
    e.target.setCustomValidity(
      validaTelefone(e.target.value) ? "" : "Telefone inválido"
    );
  });
}
