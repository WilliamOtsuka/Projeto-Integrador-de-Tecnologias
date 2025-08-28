// Dados simulados (substitua por integração real com backend)
let familias = [
	{id: 1, nome: "Família Silva", responsavel: "João Silva", contato: "11999999999", endereco: "Rua A, 123"},
	{id: 2, nome: "Família Souza", responsavel: "Maria Souza", contato: "11988888888", endereco: "Rua B, 456"}
];

function renderTabela() {
	const tbody = document.querySelector("#tabelaFamilias tbody");
	tbody.innerHTML = "";
	familias.forEach(fam => {
		const tr = document.createElement("tr");
		tr.innerHTML = `
			<td>${fam.id}</td>
			<td>${fam.nome}</td>
			<td>${fam.responsavel}</td>
			<td>${fam.contato}</td>
			<td>${fam.endereco}</td>
			<td>
				<button class="btn-edit" onclick="editarFamilia(${fam.id})">Editar</button>
				<button class="btn-delete" onclick="excluirFamilia(${fam.id})">Excluir</button>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

function abrirModal(editar = false, familia = {}) {
	document.getElementById("modalFamilia").style.display = "block";
	document.getElementById("tituloModal").textContent = editar ? "Editar Família" : "Adicionar Família";
	document.getElementById("familiaId").value = familia.id || "";
	document.getElementById("nomeFamilia").value = familia.nome || "";
	document.getElementById("responsavel").value = familia.responsavel || "";
	document.getElementById("contato").value = familia.contato || "";
	document.getElementById("endereco").value = familia.endereco || "";
}

function fecharModal() {
	document.getElementById("modalFamilia").style.display = "none";
}

document.getElementById("btnAdicionarFamilia").onclick = () => abrirModal();

document.getElementById("fecharModal").onclick = fecharModal;

window.onclick = function(event) {
	if (event.target == document.getElementById("modalFamilia")) {
		fecharModal();
	}
};

document.getElementById("formFamilia").onsubmit = function(e) {
	e.preventDefault();
	const id = document.getElementById("familiaId").value;
	const nome = document.getElementById("nomeFamilia").value;
	const responsavel = document.getElementById("responsavel").value;
	const contato = document.getElementById("contato").value;
	const endereco = document.getElementById("endereco").value;

	if (id) {
		// Editar
		const idx = familias.findIndex(f => f.id == id);
		if (idx > -1) {
			familias[idx] = {id: Number(id), nome, responsavel, contato, endereco};
		}
	} else {
		// Adicionar
		const novoId = familias.length ? Math.max(...familias.map(f => f.id)) + 1 : 1;
		familias.push({id: novoId, nome, responsavel, contato, endereco});
	}
	fecharModal();
	renderTabela();
};

window.editarFamilia = function(id) {
	const familia = familias.find(f => f.id == id);
	if (familia) abrirModal(true, familia);
};

window.excluirFamilia = function(id) {
	if (confirm("Tem certeza que deseja excluir esta família?")) {
		familias = familias.filter(f => f.id != id);
		renderTabela();
	}
};

renderTabela();
