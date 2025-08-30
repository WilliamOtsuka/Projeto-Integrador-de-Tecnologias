document.addEventListener('DOMContentLoaded', function () {
    const byId = (id) => document.getElementById(id);

    const onlyDigits = (v) => (v || '').replace(/\D/g, '');

    // Campos de endereço/CEP removidos do cadastro de doador

    // Telefone: (99) 99999-9999 ou (99) 9999-9999
    function maskTelefone(v) {
        const d = onlyDigits(v).slice(0, 11);
        if (d.length <= 10) {
            // (99) 9999-9999
            return d
                .replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, function (_, a, b, c) {
                    let out = '';
                    if (a) out += `(${a}` + (a.length === 2 ? ') ' : '')
                    if (b) out += b + (b.length === 4 && c ? '-' : '');
                    if (c) out += c;
                    return out;
                });
        }
        // 11 dígitos -> (99) 99999-9999
        return d
            .replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, function (_, a, b, c) {
                let out = '';
                if (a) out += `(${a}` + (a.length === 2 ? ') ' : '')
                if (b) out += b + (b.length === 5 && c ? '-' : '');
                if (c) out += c;
                return out;
            });
    }

    function validaTelefone(v) {
        const d = onlyDigits(v);
        return d.length === 10 || d.length === 11;
    }

    // CPF/CNPJ
    function maskCpfCnpj(v) {
        const d = onlyDigits(v).slice(0, 14);
        if (d.length <= 11) {
            // CPF 000.000.000-00
            return d
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        // CNPJ 00.000.000/0000-00
        return d
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }

    function isSequence(str) {
        return /^([0-9])\1+$/.test(str);
    }

    function validaCPF(v) {
        const d = onlyDigits(v);
        if (d.length !== 11 || isSequence(d)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * (10 - i);
        let dv1 = 11 - (sum % 11); dv1 = dv1 > 9 ? 0 : dv1;
        if (dv1 !== parseInt(d[9], 10)) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(d[i], 10) * (11 - i);
        let dv2 = 11 - (sum % 11); dv2 = dv2 > 9 ? 0 : dv2;
        return dv2 === parseInt(d[10], 10);
    }

    function validaCNPJ(v) {
        const d = onlyDigits(v);
        if (d.length !== 14 || isSequence(d)) return false;
        const calc = (base) => {
            const weights = base === 12
                ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
                : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            let sum = 0;
            for (let i = 0; i < weights.length; i++) sum += parseInt(d[i], 10) * weights[i];
            const rest = sum % 11;
            return rest < 2 ? 0 : 11 - rest;
        };
        const dv1 = calc(12);
        if (dv1 !== parseInt(d[12], 10)) return false;
        const dv2 = calc(13);
        return dv2 === parseInt(d[13], 10);
    }

    function validaCpfCnpj(v) {
        const d = onlyDigits(v);
        if (d.length === 11) return validaCPF(d);
        if (d.length === 14) return validaCNPJ(d);
        return false;
    }

    // UF removida

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // CEP removido

    // Telefone
    const telInput = byId('telefone');
    if (telInput) {
        telInput.addEventListener('input', (e) => {
            e.target.value = maskTelefone(e.target.value);
            e.target.setCustomValidity(validaTelefone(e.target.value) ? '' : 'Telefone deve ter DDD e 8-9 dígitos');
        });
        telInput.addEventListener('blur', (e) => {
            e.target.setCustomValidity(validaTelefone(e.target.value) ? '' : 'Telefone inválido');
        });
    }

    // CPF/CNPJ
    const docInput = byId('cpfCnpj');
    if (docInput) {
        docInput.addEventListener('input', (e) => {
            e.target.value = maskCpfCnpj(e.target.value);
            e.target.setCustomValidity(validaCpfCnpj(e.target.value) ? '' : 'Informe um CPF (11) ou CNPJ (14) válido');
        });
        docInput.addEventListener('blur', (e) => {
            e.target.setCustomValidity(validaCpfCnpj(e.target.value) ? '' : 'Documento inválido');
        });
    }

    // UF removida

    // Email
    const emailInput = byId('email');
    if (emailInput) {
        emailInput.addEventListener('blur', (e) => {
            const val = e.target.value.trim();
            e.target.setCustomValidity(val && emailRegex.test(val) ? '' : 'E-mail inválido');
        });
        emailInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            e.target.setCustomValidity(val && emailRegex.test(val) ? '' : '');
        });
    }

    // Nome - simples (mínimo 2 caracteres úteis)
    const nomeInput = byId('nome');
    if (nomeInput) {
        nomeInput.addEventListener('blur', (e) => {
            const ok = (e.target.value || '').trim().length >= 2;
            e.target.setCustomValidity(ok ? '' : 'Informe seu nome');
        });
        nomeInput.addEventListener('input', (e) => {
            const ok = (e.target.value || '').trim().length >= 2;
            e.target.setCustomValidity(ok ? '' : '');
        });
    }

    // Submit
    const form = byId('formCadastroDoador');
    if (form) {
        form.addEventListener('submit', function (e) {
            // checagens finais
            const checks = [];
            if (telInput) checks.push(validaTelefone(telInput.value));
            if (docInput) checks.push(validaCpfCnpj(docInput.value));
            if (emailInput) checks.push(emailRegex.test((emailInput.value || '').trim()));
            if (nomeInput) checks.push(((nomeInput.value || '').trim().length >= 2));
            // Endereço removido

            if (!form.checkValidity() || checks.includes(false)) {
                e.preventDefault();
                form.reportValidity();
                return;
            }

            e.preventDefault();
            alert('Cadastro enviado! Obrigado por se cadastrar como doador.');
            form.reset();
            // Nada a limpar relacionado a CEP
        });
    }
});
