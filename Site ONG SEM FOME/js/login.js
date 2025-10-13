document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      email: formData.get("email"),
      senha: formData.get("password"),
    };
    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp
          .json()
          .catch(() => ({ error: "Falha no login" }));
        alert(data.error || "Usuário ou senha incorretos");
        return;
      }
      // sucesso -> vai para home
      window.location.href = "index.html";
    } catch (err) {
      alert("Erro de rede ao tentar logar.");
    }
  });

  // Toggle password visibility
  const pwd = document.getElementById('password');
  const btn = document.getElementById('togglePassword');
  if (pwd && btn) {
    const icon = btn.querySelector('i');
    const updateIcon = () => {
      const visible = pwd.type === 'text';
      if (icon) {
        icon.classList.toggle('fa-eye', visible);
        icon.classList.toggle('fa-eye-slash', !visible);
      }
      btn.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
    };

    // Inicializa corretamente
    updateIcon();

    btn.addEventListener('click', () => {
      pwd.type = pwd.type === 'password' ? 'text' : 'password';
      updateIcon();
    });
  }
});
