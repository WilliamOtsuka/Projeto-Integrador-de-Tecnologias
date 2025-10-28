document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('resetForm');
  const msg = document.getElementById('resetMsg');
  const tokenEl = document.getElementById('token');

  // Preenche token da URL quando houver
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (token) tokenEl.value = token;
  } catch {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const token = (tokenEl.value || '').trim();
    const p1 = (document.getElementById('newPassword')?.value || '').trim();
    const p2 = (document.getElementById('confirmPassword')?.value || '').trim();
    if (!token) { msg.textContent = 'Informe o token'; return; }
    if (!p1 || p1.length < 4) { msg.textContent = 'Senha muito curta (mínimo 4)'; return; }
    if (p1 !== p2) { msg.textContent = 'As senhas não conferem'; return; }
    try {
      // valida token antes (opcional)
      const v = await fetch(`/api/password/validate?token=${encodeURIComponent(token)}`);
      if (!v.ok) {
        const err = await v.json().catch(()=>({}));
        msg.textContent = err.error || 'Token inválido ou expirado';
        return;
      }
      const r = await fetch('/api/password/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha: p1 })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { msg.textContent = data.error || 'Falha ao redefinir'; return; }
      msg.textContent = 'Senha redefinida com sucesso! Redirecionando...';
      setTimeout(() => { window.location.href = 'login_page.html'; }, 1200);
    } catch (e) {
      msg.textContent = 'Erro de rede';
    }
  });
});
