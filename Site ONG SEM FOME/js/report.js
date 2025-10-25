(function () {
  const Report = {
    openForTable({
      tableSelector,
      filename = "relatorio.csv",
      rowFilter = null,
    }) {
      const table = document.querySelector(tableSelector);
      if (!table) {
        alert("Tabela não encontrada para o relatório.");
        return;
      }
      const headersRaw = Array.from(table.querySelectorAll("thead th")).map(
        (th, i) => ({
          index: i,
          label: th.textContent.trim() || `Coluna ${i + 1}`,
        })
      );
      const headers = headersRaw.filter((h) => !isExcludedHeader(h.label));
      if (!headers.length) {
        alert("Tabela sem cabeçalho para exportar.");
        return;
      }
      ensureModal();
      const list = document.getElementById("repColList");
      list.innerHTML = "";
      headers.forEach((h) => {
        const li = document.createElement("div");
        const id = `repcol_${h.index}`;
        li.className = "checkbox";
        li.style.display = "flex";
        li.style.margin = "4px 0";
        li.innerHTML = `
        <label for="${id}" class="modal-label">${h.label}</label>
        <input type="checkbox" class="modal-checkbox" id="${id}" data-colidx="${h.index}" checked>`;
        list.appendChild(li);
      });

      const modal = document.getElementById("reportModal");
      const title = document.getElementById("repModalTitle");
      title.textContent = "Gerar Relatório";
      modal.style.display = "block";
      void modal.offsetWidth;
      modal.classList.add("mostrar");

      const btnCancel = document.getElementById("repBtnCancel");

      const btnDrop = document.getElementById("repBtnDropdown");
      const dropMenu = document.getElementById("repDropdownMenu");
      const optCsv = document.getElementById("repOptCsv");
      const optXls = document.getElementById("repOptXls");
      const optPdf = document.getElementById("repOptPdf");

      const cleanup = () => {
        btnCancel.removeEventListener("click", onCancel);
        btnDrop && btnDrop.removeEventListener("click", onToggleDrop);
        optCsv && optCsv.removeEventListener("click", onGenerateCsv);
        optXls && optXls.removeEventListener("click", onGenerateXls);
        optPdf && optPdf.removeEventListener("click", onGeneratePdf);
        document
          .getElementById("reportModal")
          .removeEventListener("click", onBackdrop);
      };

      const onBackdrop = (ev) => {
        if (ev.target === modal) closeModal();
      };
      const onCancel = () => {
        closeModal();
      };
      const onGenerateCsv = () => {
        const selectedIdx = Array.from(
          list.querySelectorAll('input[type="checkbox"]:checked')
        ).map((cb) => parseInt(cb.getAttribute("data-colidx"), 10));
        if (!selectedIdx.length) {
          alert("Selecione ao menos uma coluna.");
          return;
        }
        const csv = tableToCsv(table, selectedIdx, rowFilter);
        downloadCsv(csv, filename);
        closeModal();
      };
      const onGenerateXls = () => {
        const selectedIdx = Array.from(
          list.querySelectorAll('input[type="checkbox"]:checked')
        ).map((cb) => parseInt(cb.getAttribute("data-colidx"), 10));
        if (!selectedIdx.length) {
          alert("Selecione ao menos uma coluna.");
          return;
        }
        const html = tableToHtml(table, selectedIdx, rowFilter);
        const name =
          filename && filename.toLowerCase().endsWith(".xls")
            ? filename
            : String(filename || "relatorio").replace(/\.[^/.]+$/, "") + ".xls";
        downloadXls(html, name);
        closeModal();
      };
      const onGeneratePdf = () => {
        const selectedIdx = Array.from(
          list.querySelectorAll('input[type="checkbox"]:checked')
        ).map((cb) => parseInt(cb.getAttribute("data-colidx"), 10));
        if (!selectedIdx.length) {
          alert("Selecione ao menos uma coluna.");
          return;
        }
        if (window.jspdf || window.jsPDF) {
          alert(
            "Geração PDF via jsPDF não foi implementada neste módulo. Recomendo usar html2pdf.js ou autoTable."
          );
          return;
        }

        const htmlDoc = printableHtml(table, selectedIdx, rowFilter);
        const w = window.open("", "_blank");
        if (!w) {
          alert(
            "Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups."
          );
          return;
        }
        w.document.open();
        w.document.write(htmlDoc);
        w.document.close();
        w.focus();

        setTimeout(() => {
          w.print();
        }, 200);
      };

      const onToggleDrop = (ev) => {
        ev.stopPropagation();
        if (!dropMenu) return;
        const opened = dropMenu.getAttribute("data-open") === "1";
        dropMenu.setAttribute("data-open", opened ? "0" : "1");
      };

      modal.addEventListener("click", onBackdrop);
      btnCancel.addEventListener("click", onCancel);
      btnDrop && btnDrop.addEventListener("click", onToggleDrop);
      optCsv && optCsv.addEventListener("click", onGenerateCsv);
      optXls && optXls.addEventListener("click", onGenerateXls);
      optPdf && optPdf.addEventListener("click", onGeneratePdf);

      function closeModal() {
        modal.classList.remove("mostrar");
        modal.classList.add("saindo");
        const content = modal.querySelector(".modal-conteudo");
        const done = () => {
          modal.style.display = "none";
          modal.classList.remove("saindo");
          content && content.removeEventListener("transitionend", onEnd);
          cleanup();
        };
        const onEnd = (e) => {
          if (e.target === content) done();
        };
        if (content) content.addEventListener("transitionend", onEnd);
        else setTimeout(done, 240);
      }
    },
  };

  function normalizeLabel(str) {
    try {
      return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")  
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    } catch {
      return String(str).toLowerCase();
    }
  }

  function isExcludedHeader(label) {
    const n = normalizeLabel(label);
    return n === "acoes" || n === "acao" || n === "actions";
  }

  function tableToCsv(table, colIndexes, rowFilter) {
    const rows = [];
    const sep = ",";
    const headerCells = Array.from(table.querySelectorAll("thead th"));
    rows.push(
      colIndexes
        .map((i) => csvCell(headerCells[i]?.textContent || ""))
        .join(sep)
    );
    const allRows = Array.from(table.querySelectorAll("tbody tr"));
    const bodyRows = rowFilter
      ? allRows.filter((tr) => {
          try {
            return !!rowFilter(tr);
          } catch (_) {
            return true;
          }
        })
      : allRows;
    bodyRows.forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      const line = colIndexes.map((i) =>
        csvCell((tds[i]?.textContent || "").trim())
      );
      rows.push(line.join(sep));
    });
    return "\uFEFF" + rows.join("\r\n");
  }

  function csvCell(val) {
    const v = String(val).replace(/"/g, '""');
    if (/[",\n\r]/.test(v)) return '"' + v + '"';
    return v;
  }

  function downloadCsv(csv, filename) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function tableToHtml(table, colIndexes, rowFilter) {
    const headers = Array.from(table.querySelectorAll("thead th"));
    const allRows = Array.from(table.querySelectorAll("tbody tr"));
    const bodyRows = rowFilter
      ? allRows.filter((tr) => {
          try {
            return !!rowFilter(tr);
          } catch (_) {
            return true;
          }
        })
      : allRows;

    const thead =
      "<tr>" +
      colIndexes
        .map((i) => `<th>${headers[i]?.textContent || ""}</th>`)
        .join("") +
      "</tr>";
    const tbody = bodyRows
      .map((tr) => {
        const tds = tr.querySelectorAll("td");
        const trow = colIndexes
          .map((i) => `<td>${tds[i]?.textContent || "".trim()}</td>`)
          .join("");
        return `<tr>${trow}</tr>`;
      })
      .join("");

    const style = `
      <style>
        table { border-collapse: collapse; font-family: Arial, sans-serif; }
        th, td { border: 1px solid #cccccc; padding: 6px 8px; text-align: left; }
        th { background: #f2f2f2; font-weight: bold; }
      </style>
    `;

    const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        ${style}
      </head>
      <body>
        <table>
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </body>
    </html>`;
    return "\uFEFF" + html;
  }

  function downloadXls(html, filename) {
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function ensureModal() {
    if (document.getElementById("reportModal")) return;
    const modal = document.createElement("div");
    modal.id = "reportModal";
    modal.className = "modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal-conteudo" style="max-width:520px;">
        <span class="fechar" id="repCloseBtn" title="Fechar">&times;</span>
        <h2 id="repModalTitle">Gerar Relatório</h2>
        <div class="form-grid">
          <div class="form-field full-width-field">
            <label>Colunas a incluir:</label>
            <div id="repColList" style="max-height:240px; overflow:auto; border:1px solid #ddd; padding:.5rem; border-radius:.3rem;"></div>
            <div class="form-actions" style="display:flex; gap:.6rem; justify-content:flex-end; align-items:center;">
              <button type="button" class="btn-secondary" id="repBtnCancel">Cancelar</button>
              <div class="dropdown" id="repDropdown">
                <button type="button" class="btn-primary" id="repBtnDropdown">Baixar ▾</button>
                <div class="dropdown-menu" id="repDropdownMenu" data-open="0">
                  <button type="button" class="dropdown-item" id="repOptCsv">CSV</button>
                  <button type="button" class="dropdown-item" id="repOptXls">XLS (tabela)</button>
                  <button type="button" class="dropdown-item" id="repOptPdf">PDF</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById("repCloseBtn").addEventListener("click", () => {
      document.getElementById("repBtnCancel").click();
    });
  }

  window.Report = Report;
})();

function tableToMatrix(table, colIndexes, rowFilter) {
  const headers = Array.from(table.querySelectorAll("thead th"));
  const allRows = Array.from(table.querySelectorAll("tbody tr"));
  const bodyRows = rowFilter
    ? allRows.filter((tr) => {
        try {
          return !!rowFilter(tr);
        } catch (_) {
          return true;
        }
      })
    : allRows;
  const matrix = [];
  matrix.push(colIndexes.map((i) => (headers[i]?.textContent || "").trim()));
  bodyRows.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    matrix.push(colIndexes.map((i) => (tds[i]?.textContent || "").trim()));
  });
  return matrix;
}

function printableHtml(table, colIndexes, rowFilter) {
  const headers = Array.from(table.querySelectorAll("thead th"));
  const allRows = Array.from(table.querySelectorAll("tbody tr"));
  const bodyRows = rowFilter
    ? allRows.filter((tr) => {
        try {
          return !!rowFilter(tr);
        } catch (_) {
          return true;
        }
      })
    : allRows;
  const thead =
    "<tr>" +
    colIndexes
      .map((i) => `<th>${escapeHtml(headers[i]?.textContent || "")}</th>`)
      .join("") +
    "</tr>";
  const tbody = bodyRows
    .map((tr) => {
      const tds = tr.querySelectorAll("td");
      const trow = colIndexes
        .map(
          (i) => `<td>${escapeHtml((tds[i]?.textContent || "").trim())}</td>`
        )
        .join("");
      return `<tr>${trow}</tr>`;
    })
    .join("");
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Relatório</title>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; } }
        body { font-family: Arial, sans-serif; padding: 16px; }
        h1 { font-size: 18px; margin: 0 0 10px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Relatório</h1>
      <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
    </body>
  </html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
