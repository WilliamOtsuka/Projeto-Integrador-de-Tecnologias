let categorias = [
  { id: 1, nome: 'Cestas Básicas' },
  { id: 2, nome: 'Higiene' }
];

function renderTabelaCategorias() {
  const tbody = document.querySelector('#tabelaCategorias tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  categorias.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nome}</td>
      <td>
        <button class="btn-edit" onclick="editarCategoria(${c.id})">Editar</button>
        <button class="btn-delete" onclick="excluirCategoria(${c.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function abrirModalCategoria(editar = false, cat = {}) {
  const modal = document.getElementById('modalCategoria');
  modal.classList.remove('saindo');
  modal.style.display = 'block';
  void modal.offsetWidth;
  modal.classList.add('mostrar');
  document.getElementById('tituloModalCategoria').textContent = editar ? 'Editar Categoria' : 'Adicionar Categoria';
  document.getElementById('categoriaId').value = cat.id || '';
  document.getElementById('nomeCategoria').value = cat.nome || '';
}

function fecharModalCategoria() {
  const modal = document.getElementById('modalCategoria');
  modal.classList.remove('mostrar');
  modal.classList.add('saindo');
  const content = modal.querySelector('.modal-conteudo');
  const done = () => { modal.style.display = 'none'; modal.classList.remove('saindo'); if(content) content.removeEventListener('transitionend', onEnd); };
  const onEnd = (e) => { if(e.target===content) done(); };
  if(content){ content.addEventListener('transitionend', onEnd); } else { setTimeout(done, 240); }
}

document.getElementById('btnAdicionarCategoria').onclick = () => abrirModalCategoria();

document.getElementById('fecharModalCategoria').onclick = fecharModalCategoria;

document.getElementById('fecharModalCategoriaBtn').onclick = fecharModalCategoria;

window.onclick = function (event) {
  if (event.target == document.getElementById('modalCategoria')) fecharModalCategoria();
};

document.getElementById('formCategoria').onsubmit = function (e) {
  e.preventDefault();
  const id = document.getElementById('categoriaId').value;
  const nome = document.getElementById('nomeCategoria').value;
  const nomeOk=(nome||'').trim().length>=2;
  document.getElementById('nomeCategoria').setCustomValidity(nomeOk?'':'Informe o nome da categoria');
  if(!nomeOk){ (document.getElementById('formCategoria')).reportValidity(); return; }
  if (id) {
    const idx = categorias.findIndex(f => f.id == id);
    if (idx > -1) categorias[idx] = { id: Number(id), nome };
  } else {
    const novoId = categorias.length ? Math.max(...categorias.map(f => f.id)) + 1 : 1;
    categorias.push({ id: novoId, nome });
  }
  fecharModalCategoria();
  renderTabelaCategorias();
};

window.editarCategoria = function (id) {
  const cat = categorias.find(f => f.id == id);
  if (cat) abrirModalCategoria(true, cat);
};

window.excluirCategoria = function (id) {
  if (confirm('Tem certeza que deseja excluir esta categoria?')) {
    categorias = categorias.filter(f => f.id != id);
    renderTabelaCategorias();
  }
};

renderTabelaCategorias();

const nomeInput=document.getElementById('nomeCategoria');
if(nomeInput){ nomeInput.addEventListener('input',e=>e.target.setCustomValidity((e.target.value||'').trim().length>=2?'':'Informe o nome da categoria')); }
