document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotForm');
  const msg = document.getElementById('forgotMsg');
  const dev = document.getElementById('devTokenHint');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    dev.style.display = 'none'; dev.textContent = '';
    const email = (document.getElementById('email')?.value || '').trim();
    if (!email) { msg.textContent = 'Informe o e-mail'; return; }
    try {
      const r = await fetch('/api/password/forgot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        msg.textContent = data.error || 'Falha ao solicitar recuperação';
        return;
      }
      msg.textContent = 'Se o e-mail existir, enviaremos as instruções para redefinir a senha.';
      if (data.token) {
        dev.style.display = '';
        const url = new URL(window.location.origin + '/resetar_senha.html');
        url.searchParams.set('token', data.token);
        dev.innerHTML = `<a href="${url.toString()}" class="btn-forgot">Abrir página de redefinição</a>`;
      }
    } catch (e) {
      msg.textContent = 'Erro de rede';
    }
  });
});
