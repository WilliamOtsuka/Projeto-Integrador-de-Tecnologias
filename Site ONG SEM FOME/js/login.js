document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      username: formData.get("username"),
      password: formData.get("password"),
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
});
