let solicitacoes = [
  { id: 1, titulo: 'Compra de arroz', categoria: 'Alimentos', descricao: 'Reposição de estoque de arroz 5kg.' },
  { id: 2, titulo: 'Sabonetes', categoria: 'Higiene', descricao: 'Compra de 200 unidades.' }
];

function renderTabelaSolicitacoes() {
  const tbody = document.querySelector('#tabelaSolicitacoes tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  solicitacoes.forEach(s => {
    const tr = document.createElement('tr');
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

function abrirModalSolicitacao(editar = false, item = {}) {
  const modal = document.getElementById('modalSolicitacao');
  modal.classList.remove('saindo');
  modal.style.display = 'block';
  void modal.offsetWidth;
  modal.classList.add('mostrar');
  document.getElementById('tituloModalSolicitacao').textContent = editar ? 'Editar Solicitação' : 'Adicionar Solicitação';
  document.getElementById('solicitacaoId').value = item.id || '';
  document.getElementById('tituloSolicitacao').value = item.titulo || '';
  document.getElementById('categoriaSolicitacao').value = item.categoria || '';
  document.getElementById('descricaoSolicitacao').value = item.descricao || '';
}

function fecharModalSolicitacao() {
  const modal = document.getElementById('modalSolicitacao');
  modal.classList.remove('mostrar');
  modal.classList.add('saindo');
  const content = modal.querySelector('.modal-conteudo');
  const done = () => { modal.style.display = 'none'; modal.classList.remove('saindo'); if(content) content.removeEventListener('transitionend', onEnd); };
  const onEnd = (e) => { if(e.target===content) done(); };
  if(content){ content.addEventListener('transitionend', onEnd); } else { setTimeout(done, 240); }
}

document.getElementById('btnAdicionarSolicitacao').onclick = () => abrirModalSolicitacao();

document.getElementById('fecharModalSolicitacao').onclick = fecharModalSolicitacao;

document.getElementById('fecharModalSolicitacaoBtn').onclick = fecharModalSolicitacao;

window.onclick = function (event) {
  if (event.target == document.getElementById('modalSolicitacao')) fecharModalSolicitacao();
};

document.getElementById('formSolicitacao').onsubmit = function (e) {
  e.preventDefault();
  const id = document.getElementById('solicitacaoId').value;
  const titulo = document.getElementById('tituloSolicitacao').value;
  const categoria = document.getElementById('categoriaSolicitacao').value;
  const descricao = document.getElementById('descricaoSolicitacao').value;
  const tituloOk=(titulo||'').trim().length>=2;
  const categoriaOk=(categoria||'').trim().length>=2;
  document.getElementById('tituloSolicitacao').setCustomValidity(tituloOk?'':'Informe o título');
  document.getElementById('categoriaSolicitacao').setCustomValidity(categoriaOk?'':'Informe a categoria');
  if(!tituloOk||!categoriaOk){ (document.getElementById('formSolicitacao')).reportValidity(); return; }
  if (id) {
    const idx = solicitacoes.findIndex(f => f.id == id);
    if (idx > -1) solicitacoes[idx] = { id: Number(id), titulo, categoria, descricao };
  } else {
    const novoId = solicitacoes.length ? Math.max(...solicitacoes.map(f => f.id)) + 1 : 1;
    solicitacoes.push({ id: novoId, titulo, categoria, descricao });
  }
  fecharModalSolicitacao();
  renderTabelaSolicitacoes();
};

window.editarSolicitacao = function (id) {
  const item = solicitacoes.find(f => f.id == id);
  if (item) abrirModalSolicitacao(true, item);
};

window.excluirSolicitacao = function (id) {
  if (confirm('Tem certeza que deseja excluir esta solicitação?')) {
    solicitacoes = solicitacoes.filter(f => f.id != id);
    renderTabelaSolicitacoes();
  }
};

renderTabelaSolicitacoes();

const tituloInput=document.getElementById('tituloSolicitacao');
if(tituloInput){ tituloInput.addEventListener('input',e=>e.target.setCustomValidity((e.target.value||'').trim().length>=2?'':'Informe o título')); }
const categoriaInput=document.getElementById('categoriaSolicitacao');
if(categoriaInput){ categoriaInput.addEventListener('input',e=>e.target.setCustomValidity((e.target.value||'').trim().length>=2?'':'Informe a categoria')); }
