let entradas = [
    { id: 1, data: '2025-08-01', doador: 'Ana Paula', categoria: 'Alimentos', quantidade: 10, unidade: 'cx', campanha: 'Inverno Solidário', obs: '' },
    { id: 2, data: '2025-08-05', doador: 'Carlos Lima', categoria: 'Higiene', quantidade: 50, unidade: 'un', campanha: '', obs: 'Sabonetes' }
];

// Helpers de validação/máscara
const onlyDigits = (v) => (v || '').replace(/\D/g, '');
const unidadesValidas = new Set(['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct', 'sac', 'kit']);
function normalizaUnidade(v) { return (v || '').trim().toLowerCase(); }
function validaUnidade(v) { return unidadesValidas.has(normalizaUnidade(v)); }
function validaQuantidade(v) { const n = Number(v); return Number.isInteger(n) && n >= 1; }
function todayYYYYMMDD() { const d = new Date(); const mm = (d.getMonth() + 1).toString().padStart(2, '0'); const dd = d.getDate().toString().padStart(2, '0'); return `${d.getFullYear()}-${mm}-${dd}`; }
function validaData(dStr) { if (!dStr) return false; const hoje = new Date(todayYYYYMMDD()); const dt = new Date(dStr); if (Number.isNaN(dt.getTime())) return false; return dt <= hoje; }
function validaTextoMin(v, n) { return ((v || '').trim().length >= n); }

function renderTabelaEntradas() {
    const tbody = document.querySelector('#tabelaEntradas tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    entradas.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${e.id}</td>
      <td>${e.data}</td>
      <td>${e.doador}</td>
      <td>${e.categoria}</td>
      <td>${e.quantidade}</td>
      <td>${e.unidade}</td>
      <td>${e.campanha || '-'}</td>
      <td>${e.obs || '-'}</td>
      <td>
        <button class="btn-edit" onclick="editarEntrada(${e.id})">Editar</button>
        <button class="btn-delete" onclick="excluirEntrada(${e.id})">Excluir</button>
      </td>`;
        tbody.appendChild(tr);
    });
}

function abrirModalEntrada(editar = false, item = {}) {
    const modal = document.getElementById('modalEntrada');
    modal.classList.remove('saindo');
    modal.style.display = 'block';
    void modal.offsetWidth;
    modal.classList.add('mostrar');
    document.getElementById('tituloModalEntrada').textContent = editar ? 'Editar Entrada' : 'Adicionar Entrada';
    document.getElementById('entradaId').value = item.id || '';
    document.getElementById('dataEntrada').value = item.data || '';
    document.getElementById('doadorEntrada').value = item.doador || '';
    document.getElementById('categoriaEntrada').value = item.categoria || '';
    document.getElementById('quantidadeEntrada').value = item.quantidade || '';
    document.getElementById('unidadeEntrada').value = item.unidade || '';
    document.getElementById('campanhaEntrada').value = item.campanha || '';
    document.getElementById('obsEntrada').value = item.obs || '';

    // limpar mensagens de validade anteriores
    ['dataEntrada', 'doadorEntrada', 'categoriaEntrada', 'quantidadeEntrada', 'unidadeEntrada'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setCustomValidity('');
    });
}

function fecharModalEntrada() {
    const modal = document.getElementById('modalEntrada');
    modal.classList.remove('mostrar');
    modal.classList.add('saindo');
    const content = modal.querySelector('.modal-conteudo');
    const done = () => { modal.style.display = 'none'; modal.classList.remove('saindo'); if(content) content.removeEventListener('transitionend', onEnd); };
    const onEnd = (e) => { if(e.target===content) done(); };
    if(content){ content.addEventListener('transitionend', onEnd); } else { setTimeout(done, 240); }
}

document.getElementById('btnAdicionarEntrada').onclick = () => abrirModalEntrada();

document.getElementById('fecharModalEntrada').onclick = fecharModalEntrada;

document.getElementById('fecharModalEntradaBtn').onclick = fecharModalEntrada;

window.onclick = function (event) {
    if (event.target == document.getElementById('modalEntrada')) fecharModalEntrada();
};

document.getElementById('formEntrada').onsubmit = function (e) {
    e.preventDefault();
    const id = document.getElementById('entradaId').value;
    const data = document.getElementById('dataEntrada').value;
    const doador = document.getElementById('doadorEntrada').value;
    const categoria = document.getElementById('categoriaEntrada').value;
    const quantidadeStr = document.getElementById('quantidadeEntrada').value;
    const unidadeRaw = document.getElementById('unidadeEntrada').value;
    const campanha = document.getElementById('campanhaEntrada').value;
    const obs = document.getElementById('obsEntrada').value;

    // validações
    const dataOk = validaData(data);
    const doadorOk = validaTextoMin(doador, 2);
    const categoriaOk = validaTextoMin(categoria, 2);
    const qtdOk = validaQuantidade(quantidadeStr);
    const unidadeOk = validaUnidade(unidadeRaw);

    const dataEl = document.getElementById('dataEntrada');
    const doadorEl = document.getElementById('doadorEntrada');
    const categoriaEl = document.getElementById('categoriaEntrada');
    const quantidadeEl = document.getElementById('quantidadeEntrada');
    const unidadeEl = document.getElementById('unidadeEntrada');

    dataEl.setCustomValidity(dataOk ? '' : 'Informe uma data válida (não futura)');
    doadorEl.setCustomValidity(doadorOk ? '' : 'Informe o nome do doador');
    categoriaEl.setCustomValidity(categoriaOk ? '' : 'Informe a categoria');
    quantidadeEl.setCustomValidity(qtdOk ? '' : 'Quantidade deve ser inteiro >= 1');
    unidadeEl.setCustomValidity(unidadeOk ? '' : 'Unidade inválida. Use: un, kg, g, l, ml, cx, pct, sac, kit');

    if (!(dataOk && doadorOk && categoriaOk && qtdOk && unidadeOk)) {
        document.getElementById('formEntrada').reportValidity();
        return;
    }

    const quantidade = parseInt(quantidadeStr, 10);
    const unidade = normalizaUnidade(unidadeRaw);
    if (id) {
        const idx = entradas.findIndex(f => f.id == id);
        if (idx > -1) entradas[idx] = { id: Number(id), data, doador, categoria, quantidade, unidade, campanha, obs };
    } else {
        const novoId = entradas.length ? Math.max(...entradas.map(f => f.id)) + 1 : 1;
        entradas.push({ id: novoId, data, doador, categoria, quantidade, unidade, campanha, obs });
    }
    fecharModalEntrada();
    renderTabelaEntradas();
};

window.editarEntrada = function (id) {
    const item = entradas.find(f => f.id == id);
    if (item) abrirModalEntrada(true, item);
};

window.excluirEntrada = function (id) {
    if (confirm('Tem certeza que deseja excluir esta entrada?')) {
        entradas = entradas.filter(f => f.id != id);
        renderTabelaEntradas();
    }
};

const dataEntradaEl = document.getElementById('dataEntrada');
if (dataEntradaEl) {
    dataEntradaEl.addEventListener('change', (e) => {
        e.target.setCustomValidity(validaData(e.target.value) ? '' : 'Informe uma data válida (não futura)');
    });
}
const doadorEntradaEl = document.getElementById('doadorEntrada');
if (doadorEntradaEl) {
    doadorEntradaEl.addEventListener('input', (e) => {
        e.target.setCustomValidity(validaTextoMin(e.target.value, 2) ? '' : 'Informe o nome do doador');
    });
}
const categoriaEntradaEl = document.getElementById('categoriaEntrada');
if (categoriaEntradaEl) {
    categoriaEntradaEl.addEventListener('input', (e) => {
        e.target.setCustomValidity(validaTextoMin(e.target.value, 2) ? '' : 'Informe a categoria');
    });
}
const quantidadeEntradaEl = document.getElementById('quantidadeEntrada');
if (quantidadeEntradaEl) {
    quantidadeEntradaEl.addEventListener('input', (e) => {
        const d = onlyDigits(e.target.value).replace(/^0+/, '');
        e.target.value = d;
        e.target.setCustomValidity(validaQuantidade(e.target.value) ? '' : 'Quantidade deve ser inteiro >= 1');
    });
}
const unidadeEntradaEl = document.getElementById('unidadeEntrada');
if (unidadeEntradaEl) {
    unidadeEntradaEl.addEventListener('input', (e) => {
        e.target.value = normalizaUnidade(e.target.value);
        e.target.setCustomValidity(validaUnidade(e.target.value) ? '' : 'Unidade inválida. Use: un, kg, g, l, ml, cx, pct, sac, kit');
    });
}

renderTabelaEntradas();
