document.addEventListener("DOMContentLoaded", () => {
  const navbarLogin = document.querySelector(".navbar-login");

  if (!navbarLogin) return;

  async function checkAuth() {
    try {
      const resp = await fetch("/api/me", {
        method: "GET",
      });
      if (!resp.ok) return; // não autenticado

      const data = await resp.json();

      if (data && data.authenticated && data.user) {
        // mostra usuário logado e botão sair
        navbarLogin.innerHTML = `
                    <span class="usuario-logado" style="color:#fff;font-weight:bold;margin-right:.6em;">Olá, ${data.user.name}</span>
                    <a id="btnLogout" class="btn-login" role="button" title="Sair">Sair</a>
                    `;
        const btn = document.getElementById("btnLogout");

        if (btn) {
          btn.addEventListener("click", async () => {
            try {
              await fetch("/api/logout", { method: "POST" });
            } finally {
              // após logout, volta para a página de login
              window.location.href = "login_page.html";
            }
          });
        }
      }
    } catch {}
  }

  checkAuth();
});
