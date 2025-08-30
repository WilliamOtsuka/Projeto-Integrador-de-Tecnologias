let campanhas = [
  { id: 1, nome: 'Inverno Solidário', meta: '100 cestas', descricao: 'Campanha para o período de inverno.' },
  { id: 2, nome: 'Natal Sem Fome', meta: '200 cestas', descricao: 'Ação especial de fim de ano.' }
];

function renderTabelaCampanhas() {
  const tbody = document.querySelector('#tabelaCampanhas tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  campanhas.forEach(c => {
    const tr = document.createElement('tr');
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

function abrirModalCampanha(editar = false, camp = {}) {
  const modal = document.getElementById('modalCampanha');
  modal.classList.remove('saindo');
  modal.style.display = 'block';
  void modal.offsetWidth;
  modal.classList.add('mostrar');
  document.getElementById('tituloModalCampanha').textContent = editar ? 'Editar Campanha' : 'Adicionar Campanha';
  document.getElementById('campanhaId').value = camp.id || '';
  document.getElementById('nomeCampanha').value = camp.nome || '';
  document.getElementById('metaCampanha').value = camp.meta || '';
  document.getElementById('descricaoCampanha').value = camp.descricao || '';
}

function fecharModalCampanha() {
  const modal = document.getElementById('modalCampanha');
  modal.classList.remove('mostrar');
  modal.classList.add('saindo');
  const content = modal.querySelector('.modal-conteudo');
  const done = () => { modal.style.display = 'none'; modal.classList.remove('saindo'); if(content) content.removeEventListener('transitionend', onEnd); };
  const onEnd = (e) => { if(e.target===content) done(); };
  if(content){ content.addEventListener('transitionend', onEnd); } else { setTimeout(done, 240); }
}

document.getElementById('btnAdicionarCampanha').onclick = () => abrirModalCampanha();

document.getElementById('fecharModalCampanha').onclick = fecharModalCampanha;

document.getElementById('fecharModalCampanhaBtn').onclick = fecharModalCampanha;

window.onclick = function (event) {
  if (event.target == document.getElementById('modalCampanha')) fecharModalCampanha();
};

document.getElementById('formCampanha').onsubmit = function (e) {
  e.preventDefault();
  const id = document.getElementById('campanhaId').value;
  const nome = document.getElementById('nomeCampanha').value;
  const meta = document.getElementById('metaCampanha').value;
  const descricao = document.getElementById('descricaoCampanha').value;
  const nomeOk=(nome||'').trim().length>=2;
  const metaOk=(meta||'').trim().length>=1;
  document.getElementById('nomeCampanha').setCustomValidity(nomeOk?'':'Informe o nome');
  document.getElementById('metaCampanha').setCustomValidity(metaOk?'':'Informe a meta');
  if(!nomeOk||!metaOk){ (document.getElementById('formCampanha')).reportValidity(); return; }
  if (id) {
    const idx = campanhas.findIndex(f => f.id == id);
    if (idx > -1) campanhas[idx] = { id: Number(id), nome, meta, descricao };
  } else {
    const novoId = campanhas.length ? Math.max(...campanhas.map(f => f.id)) + 1 : 1;
    campanhas.push({ id: novoId, nome, meta, descricao });
  }
  fecharModalCampanha();
  renderTabelaCampanhas();
};

window.editarCampanha = function (id) {
  const camp = campanhas.find(f => f.id == id);
  if (camp) abrirModalCampanha(true, camp);
};

window.excluirCampanha = function (id) {
  if (confirm('Tem certeza que deseja excluir esta campanha?')) {
    campanhas = campanhas.filter(f => f.id != id);
    renderTabelaCampanhas();
  }
};

renderTabelaCampanhas();

const nomeInput=document.getElementById('nomeCampanha');
if(nomeInput){ nomeInput.addEventListener('input',e=>e.target.setCustomValidity((e.target.value||'').trim().length>=2?'':'Informe o nome')); }
const metaInput=document.getElementById('metaCampanha');
if(metaInput){ metaInput.addEventListener('input',e=>e.target.setCustomValidity((e.target.value||'').trim().length>=1?'':'Informe a meta')); }
