let doadores = [
  { id: 1, nome: 'Ana Paula', email: 'ana@example.com', telefone: '(11) 90000-0001', documento: '123.456.789-09' },
  { id: 2, nome: 'Carlos Lima', email: 'carlos@example.com', telefone: '(11) 90000-0002', documento: '12.345.678/0001-00' }
];

// Helpers de máscara/validação
const onlyDigits = (v) => (v || '').replace(/\D/g, '');
function maskTelefone(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => {
      let out = '';
      if (a) out += `(${a}` + (a.length === 2 ? ') ' : '');
      if (b) out += b + (b.length === 4 && c ? '-' : '');
      if (c) out += c; return out;
    });
  }
  return d.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, a, b, c) => {
    let out = '';
    if (a) out += `(${a}` + (a.length === 2 ? ') ' : '');
    if (b) out += b + (b.length === 5 && c ? '-' : '');
    if (c) out += c; return out;
  });
}
function validaTelefone(v){ const d = onlyDigits(v); return d.length === 10 || d.length === 11; }
function isSeq(str){ return /^([0-9])\1+$/.test(str); }
function maskCpfCnpj(v){
  const d = onlyDigits(v).slice(0,14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  return d.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
}
function validaCPF(v){
  const d = onlyDigits(v); if (d.length!==11 || isSeq(d)) return false; let s=0; for(let i=0;i<9;i++)s+=+d[i]*(10-i);
  let dv1=11-(s%11); dv1=dv1>9?0:dv1; if(dv1!==+d[9])return false; s=0; for(let i=0;i<10;i++)s+=+d[i]*(11-i);
  let dv2=11-(s%11); dv2=dv2>9?0:dv2; return dv2===+d[10];
}
function validaCNPJ(v){
  const d=onlyDigits(v); if(d.length!==14||isSeq(d))return false; const calc=(len)=>{const w=len===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2]; let s=0; for(let i=0;i<w.length;i++)s+=+d[i]*w[i]; const r=s%11; return r<2?0:11-r;};
  const dv1=calc(12); if(dv1!==+d[12])return false; const dv2=calc(13); return dv2===+d[13];
}
function validaDoc(v){ const d=onlyDigits(v); if(d.length===11) return validaCPF(d); if(d.length===14) return validaCNPJ(d); return false; }
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function renderTabelaDoadores() {
  const tbody = document.querySelector('#tabelaDoadores tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  doadores.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${d.nome}</td>
      <td>${d.email}</td>
      <td>${d.telefone}</td>
      <td>${d.documento}</td>
      <td>
        <button class="btn-edit" onclick="editarDoador(${d.id})">Editar</button>
        <button class="btn-delete" onclick="excluirDoador(${d.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Helpers de animação do modal
function showModalWithAnim(modal){ if(!modal) return; modal.classList.remove('saindo'); modal.style.display='block'; void modal.offsetWidth; modal.classList.add('mostrar'); }
function hideModalWithAnim(modal){ if(!modal) return; modal.classList.remove('mostrar'); modal.classList.add('saindo'); const content=modal.querySelector('.modal-conteudo'); const done=()=>{ modal.style.display='none'; modal.classList.remove('saindo'); if(content) content.removeEventListener('transitionend', onEnd); }; const onEnd=(e)=>{ if(e.target===content) done(); }; if(content){ content.addEventListener('transitionend', onEnd); } else { setTimeout(done,240); } }

function abrirModalDoador(editar = false, doador = {}) {
  showModalWithAnim(document.getElementById('modalDoador'));
  document.getElementById('tituloModalDoador').textContent = editar ? 'Editar Doador' : 'Adicionar Doador';
  document.getElementById('doadorId').value = doador.id || '';
  document.getElementById('nomeDoador').value = doador.nome || '';
  document.getElementById('emailDoador').value = doador.email || '';
  document.getElementById('telefoneDoador').value = doador.telefone || '';
  document.getElementById('documentoDoador').value = doador.documento || '';
}

function fecharModalDoador() { hideModalWithAnim(document.getElementById('modalDoador')); }

document.getElementById('btnAdicionarDoador').onclick = () => abrirModalDoador();

document.getElementById('fecharModalDoador').onclick = fecharModalDoador;

document.getElementById('fecharModalDoadorBtn').onclick = fecharModalDoador;

window.onclick = function (event) {
  if (event.target == document.getElementById('modalDoador')) {
    fecharModalDoador();
  }
};

document.getElementById('formDoador').onsubmit = function (e) {
  e.preventDefault();
  const id = document.getElementById('doadorId').value;
  const nome = document.getElementById('nomeDoador').value;
  const email = document.getElementById('emailDoador').value;
  const telefone = document.getElementById('telefoneDoador').value;
  const documento = document.getElementById('documentoDoador').value;

  // Validações finais
  const nomeOk = (nome||'').trim().length>=2;
  const emailOk = emailRegex.test((email||'').trim());
  const telOk = validaTelefone(telefone);
  const docOk = validaDoc(documento);
  document.getElementById('nomeDoador').setCustomValidity(nomeOk?'' : 'Informe o nome');
  document.getElementById('emailDoador').setCustomValidity(emailOk?'' : 'E-mail inválido');
  document.getElementById('telefoneDoador').setCustomValidity(telOk?'' : 'Telefone inválido');
  document.getElementById('documentoDoador').setCustomValidity(docOk?'' : 'CPF/CNPJ inválido');
  if (!nomeOk || !emailOk || !telOk || !docOk) { (document.getElementById('formDoador')).reportValidity(); return; }

  if (id) {
    const idx = doadores.findIndex(f => f.id == id);
    if (idx > -1) {
      doadores[idx] = { id: Number(id), nome, email, telefone, documento };
    }
  } else {
    const novoId = doadores.length ? Math.max(...doadores.map(f => f.id)) + 1 : 1;
    doadores.push({ id: novoId, nome, email, telefone, documento });
  }
  fecharModalDoador();
  renderTabelaDoadores();
};

window.editarDoador = function (id) {
  const doador = doadores.find(f => f.id == id);
  if (doador) abrirModalDoador(true, doador);
};

window.excluirDoador = function (id) {
  if (confirm('Tem certeza que deseja excluir este doador?')) {
    doadores = doadores.filter(f => f.id != id);
    renderTabelaDoadores();
  }
};

renderTabelaDoadores();

// Máscaras e validação on-the-fly
const nomeInput = document.getElementById('nomeDoador');
if (nomeInput){ nomeInput.addEventListener('input', e=> e.target.setCustomValidity((e.target.value||'').trim().length>=2?'':'Informe o nome')); }
const emailInput = document.getElementById('emailDoador');
if (emailInput){
  emailInput.addEventListener('input', e=> e.target.setCustomValidity(emailRegex.test((e.target.value||'').trim())?'':''));
  emailInput.addEventListener('blur', e=> e.target.setCustomValidity(emailRegex.test((e.target.value||'').trim())?'':'E-mail inválido'));
}
const telInput = document.getElementById('telefoneDoador');
if (telInput){
  telInput.addEventListener('input', e=>{ e.target.value = maskTelefone(e.target.value); e.target.setCustomValidity(validaTelefone(e.target.value)?'':'Telefone inválido'); });
  telInput.addEventListener('blur', e=> e.target.setCustomValidity(validaTelefone(e.target.value)?'':'Telefone inválido'));
}
const docInput = document.getElementById('documentoDoador');
if (docInput){
  docInput.addEventListener('input', e=>{ e.target.value = maskCpfCnpj(e.target.value); e.target.setCustomValidity(validaDoc(e.target.value)?'':'CPF/CNPJ inválido'); });
  docInput.addEventListener('blur', e=> e.target.setCustomValidity(validaDoc(e.target.value)?'':'CPF/CNPJ inválido'));
}
