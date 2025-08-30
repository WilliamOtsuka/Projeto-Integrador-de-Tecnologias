let colaboradores = [
  { id: 1, nome: 'Bruna Costa', email: 'bruna@example.com', telefone: '(11) 98888-0001', cargo: 'Assistente Social' },
  { id: 2, nome: 'Diego Alves', email: 'diego@example.com', telefone: '(11) 97777-0002', cargo: 'Logística' }
];

function renderTabelaColaboradores() {
  const tbody = document.querySelector('#tabelaColaboradores tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  colaboradores.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nome}</td>
      <td>${c.email}</td>
      <td>${c.telefone}</td>
      <td>${c.cargo}</td>
      <td>
        <button class="btn-edit" onclick="editarColaborador(${c.id})">Editar</button>
        <button class="btn-delete" onclick="excluirColaborador(${c.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Helpers
const onlyDigits = (v)=>(v||'').replace(/\D/g,'');
function maskTelefone(v){
  const d=onlyDigits(v).slice(0,11);
  if(d.length<=10){return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/,(_,a,b,c)=>{let o=''; if(a)o+=`(${a}`+(a.length===2?') ':''); if(b)o+=b+(b.length===4&&c?'-':''); if(c)o+=c; return o;});}
  return d.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/,(_,a,b,c)=>{let o=''; if(a)o+=`(${a}`+(a.length===2?') ':''); if(b)o+=b+(b.length===5&&c?'-':''); if(c)o+=c; return o;});
}
function validaTelefone(v){ const d=onlyDigits(v); return d.length===10||d.length===11; }
const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function abrirModalColaborador(editar = false, colab = {}) {
  // animação de abrir
  const modal = document.getElementById('modalColaborador');
  modal.classList.remove('saindo');
  modal.style.display = 'block';
  void modal.offsetWidth;
  modal.classList.add('mostrar');
  document.getElementById('tituloModalColaborador').textContent = editar ? 'Editar Colaborador' : 'Adicionar Colaborador';
  document.getElementById('colaboradorId').value = colab.id || '';
  document.getElementById('nomeColaborador').value = colab.nome || '';
  document.getElementById('emailColaborador').value = colab.email || '';
  document.getElementById('telefoneColaborador').value = colab.telefone || '';
  document.getElementById('cargoColaborador').value = colab.cargo || '';
}

function fecharModalColaborador() {
  const modal = document.getElementById('modalColaborador');
  modal.classList.remove('mostrar');
  modal.classList.add('saindo');
  const content = modal.querySelector('.modal-conteudo');
  const done = () => { modal.style.display = 'none'; modal.classList.remove('saindo'); if(content) content.removeEventListener('transitionend', onEnd); };
  const onEnd = (e) => { if(e.target===content) done(); };
  if(content){ content.addEventListener('transitionend', onEnd); } else { setTimeout(done, 240); }
}

document.getElementById('btnAdicionarColaborador').onclick = () => abrirModalColaborador();

document.getElementById('fecharModalColaborador').onclick = fecharModalColaborador;

document.getElementById('fecharModalColaboradorBtn').onclick = fecharModalColaborador;

window.onclick = function (event) {
  if (event.target == document.getElementById('modalColaborador')) fecharModalColaborador();
};

document.getElementById('formColaborador').onsubmit = function (e) {
  e.preventDefault();
  const id = document.getElementById('colaboradorId').value;
  const nome = document.getElementById('nomeColaborador').value;
  const email = document.getElementById('emailColaborador').value;
  const telefone = document.getElementById('telefoneColaborador').value;
  const cargo = document.getElementById('cargoColaborador').value;

  const nomeOk=(nome||'').trim().length>=2;
  const emailOk=emailRegex.test((email||'').trim());
  const telOk=validaTelefone(telefone);
  const cargoOk=(cargo||'').trim().length>=2;
  document.getElementById('nomeColaborador').setCustomValidity(nomeOk?'':'Informe o nome');
  document.getElementById('emailColaborador').setCustomValidity(emailOk?'':'E-mail inválido');
  document.getElementById('telefoneColaborador').setCustomValidity(telOk?'':'Telefone inválido');
  document.getElementById('cargoColaborador').setCustomValidity(cargoOk?'':'Informe o cargo');
  if(!nomeOk||!emailOk||!telOk||!cargoOk){ (document.getElementById('formColaborador')).reportValidity(); return; }

  if (id) {
    const idx = colaboradores.findIndex(f => f.id == id);
    if (idx > -1) colaboradores[idx] = { id: Number(id), nome, email, telefone, cargo };
  } else {
    const novoId = colaboradores.length ? Math.max(...colaboradores.map(f => f.id)) + 1 : 1;
    colaboradores.push({ id: novoId, nome, email, telefone, cargo });
  }
  fecharModalColaborador();
  renderTabelaColaboradores();
};

window.editarColaborador = function (id) {
  const colab = colaboradores.find(f => f.id == id);
  if (colab) abrirModalColaborador(true, colab);
};

window.excluirColaborador = function (id) {
  if (confirm('Tem certeza que deseja excluir este colaborador?')) {
    colaboradores = colaboradores.filter(f => f.id != id);
    renderTabelaColaboradores();
  }
};

renderTabelaColaboradores();

// Máscaras ao digitar
const nomeInput=document.getElementById('nomeColaborador');
if(nomeInput){ nomeInput.addEventListener('input',e=>e.target.setCustomValidity((e.target.value||'').trim().length>=2?'':'Informe o nome')); }
const emailInput=document.getElementById('emailColaborador');
if(emailInput){
  emailInput.addEventListener('input',e=>e.target.setCustomValidity(emailRegex.test((e.target.value||'').trim())?'':''));
  emailInput.addEventListener('blur',e=>e.target.setCustomValidity(emailRegex.test((e.target.value||'').trim())?'':'E-mail inválido'));
}
const telInput=document.getElementById('telefoneColaborador');
if(telInput){
  telInput.addEventListener('input',e=>{e.target.value=maskTelefone(e.target.value); e.target.setCustomValidity(validaTelefone(e.target.value)?'':'Telefone inválido');});
  telInput.addEventListener('blur',e=>e.target.setCustomValidity(validaTelefone(e.target.value)?'':'Telefone inválido'));
}
const cargoInput=document.getElementById('cargoColaborador');
if(cargoInput){ cargoInput.addEventListener('input',e=>e.target.setCustomValidity((e.target.value||'').trim().length>=2?'':'Informe o cargo')); }
