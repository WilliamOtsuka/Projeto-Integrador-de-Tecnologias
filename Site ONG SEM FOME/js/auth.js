document.addEventListener("DOMContentLoaded", () => {
  const navbarLogin = document.querySelector('.navbar-login');
  const menuPrincipal = document.querySelector('.menu-principal');
  const ADMIN_PAGES = new Set([
    'cadastro_doador.html',
    'distribuir_cestas.html',
    'gerenciar_campanhas.html',
    'gerenciar_categorias.html',
    'gerenciar_colaboradores.html',
    'gerenciar_doadores.html',
    'gerenciar_estoque.html',
    'gerenciar_familias.html',
    'gerenciar_solicitacoes.html',
  ]);

  const currentPage = (() => {
    try { return window.location.pathname.split('/').pop() || 'index.html'; } catch { return 'index.html'; }
  })();

  (function injectAdminStyles(){
    const id = 'admin-dropdown-styles';
    if (document.getElementById(id)) return;
    const css = `
      .admin-menu { display:flex; align-items:center; gap:.4rem; position:relative; }
      .admin-menu .dropdown { position:relative; }
      .admin-menu .dropdown-menu { position:absolute; right:0; top:calc(100% + 6px); min-width: 240px; background:#fff; color:#333; border:1px solid #ddd; border-radius:6px; box-shadow:0 6px 18px rgba(0,0,0,.12); padding:.4rem 0; display:none; z-index:1000; }
      .admin-menu .dropdown-menu a { display:block; padding:.5rem .9rem; color:#333; text-decoration:none; }
      .admin-menu .dropdown-menu a:hover { background:#f2f2f2; }
      .admin-menu .open { display:block; }
    `;
    const style = document.createElement('style'); style.id = id; style.textContent = css; document.head.appendChild(style);
  })();

  async function getSession() {
    try {
      const resp = await fetch('/api/me');
      if (!resp.ok) return { authenticated: false };
      return await resp.json();
    } catch { return { authenticated: false }; }
  }

  function isAdminUser(me) {
    return Boolean(me?.authenticated && me.user && String(me.user.name).toLowerCase() === 'admin');
  }

  async function ensureAdminIfNeeded() {
    if (!ADMIN_PAGES.has(currentPage)) return; // página pública
    const me = await getSession();
    if (!isAdminUser(me)) {
      // bloqueia acesso a páginas administrativas
      window.location.href = 'login_page.html';
    }
  }
  
  function renderAdminDropdown() {
    if (!navbarLogin) return;
    const links = [
      { href: 'gerenciar_estoque.html', label: 'Gerenciar Estoque' },
      { href: 'gerenciar_solicitacoes.html', label: 'Solicitações' },
      { href: 'gerenciar_doadores.html', label: 'Gerenciar Doadores' },
      { href: 'gerenciar_familias.html', label: 'Gerenciar Famílias' },
      { href: 'gerenciar_colaboradores.html', label: 'Gerenciar Colaboradores' },
      { href: 'gerenciar_categorias.html', label: 'Gerenciar Categorias' },
      { href: 'gerenciar_campanhas.html', label: 'Gerenciar Campanhas' },
    ];
    navbarLogin.innerHTML = `
      <div class="admin-menu">
        <div class="dropdown">
          <a id="adminMenuBtn" class="dropdown-adm" role="button" title="Abrir menu">Olá, admin ▾</a>
          <div id="adminDropdown" class="dropdown-menu">
            ${links.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
          </div>
        </div>
      </div>
        <a id="btnLogout" class="btn-login" role="button" title="Sair">Sair</a>
    `;
    const btn = document.getElementById('btnLogout');
    if (btn) btn.addEventListener('click', async () => { try { await fetch('/api/logout', { method:'POST' }); } finally { window.location.href = 'login_page.html'; } });
    const menuBtn = document.getElementById('adminMenuBtn');
    const dd = document.getElementById('adminDropdown');
    if (menuBtn && dd) {
      menuBtn.addEventListener('click', (e) => { e.preventDefault(); dd.classList.toggle('open'); });
      document.addEventListener('click', (ev) => {
        if (!dd.contains(ev.target) && ev.target !== menuBtn) dd.classList.remove('open');
      });
    }
  }

  (async function init() {
    await ensureAdminIfNeeded();
    // Para todos: esconder o menu principal do topo (admin ficará no dropdown)
    // Renderiza UI conforme sessão
    const me = await getSession();
    if (isAdminUser(me)) renderAdminDropdown();
    // Usuário comum verá apenas o cabeçalho genérico (sem menu principal)
  })();
});
