import {
  createRecord,
  filterRecords,
  reportModel,
  statusLabel,
  timeLabel,
} from "./records.js";
import {
  listRecords,
  saveRecord,
  deleteRecord,
  clearRecords,
  DB_NAME,
} from "./storage.js";
import { downloadReport, renderPrintReport, clearDownload } from "./reports.js";

export function setupHistory() {
  const $ = (id) => document.getElementById(id);
  let records = [];
  let current = null;
  let ready = false;
  let writing = false;
  let exporting = false;
  let revision = 0;
  let visible = [];
  let filterValid = true;
  let channel;
  try {
    channel = new BroadcastChannel(DB_NAME);
  } catch {
    /* Focus refresh also works without BroadcastChannel. */
  }

  function updateActions() {
    const saved = current && records.some((record) => record.id === current.id);
    $("add-record").disabled = !current || writing || !!saved;
    $("add-record").textContent = writing
      ? "Salvando…"
      : saved
        ? "✓ Adicionado"
        : "Adicionar registro";
    $("clear-history").disabled = !ready || writing || !records.length;
    document.querySelectorAll("[data-report]").forEach((button) => {
      button.disabled = !ready || !filterValid || !visible.length || exporting;
    });
    document.querySelectorAll("[data-delete-record]").forEach((button) => {
      button.disabled = writing;
    });
  }

  function render() {
    const start = $("date-start").value;
    const end = $("date-end").value;
    filterValid = !(
      $("date-start").validity.badInput || $("date-end").validity.badInput
    );
    let error = filterValid ? "" : "Informe uma data válida.";
    try {
      visible = filterRecords(records, start, end);
    } catch (failure) {
      filterValid = false;
      error = failure.message;
    }
    if (!filterValid) visible = [];
    $("filter-error").textContent = error;
    for (const id of ["date-start", "date-end"]) {
      if (filterValid) $(id).removeAttribute("aria-invalid");
      else $(id).setAttribute("aria-invalid", "true");
    }
    const body = $("history-body");
    body.replaceChildren();
    for (const record of visible) {
      const row = body.insertRow();
      row.setAttribute("role", "row");
      const values = [
        timeLabel(record),
        record.celsius,
        record.hortvet,
        statusLabel(record),
      ];
      values.forEach((value, index) => {
        const cell = row.insertCell();
        cell.textContent = value;
        cell.setAttribute("role", "cell");
        cell.setAttribute(
          "headers",
          [
            "history-time",
            "history-celsius",
            "history-hortvet",
            "history-status",
          ][index],
        );
        cell.dataset.label = [
          "Data e hora",
          "Celsius (°C)",
          "Hortvet (°H)",
          "Status",
        ][index];
        if (index === 0) cell.title = record.timeZone;
        if (index === 3) cell.dataset.state = record.status;
      });
      const actions = row.insertCell();
      actions.setAttribute("role", "cell");
      actions.setAttribute("headers", "history-actions");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "text-button delete-record";
      button.textContent = "Excluir";
      button.dataset.deleteRecord = record.id;
      button.setAttribute(
        "aria-label",
        `Excluir registro de ${timeLabel(record)}, ${record.celsius} °C`,
      );
      actions.append(button);
    }
    $("history-table").hidden = !visible.length;
    $("history-empty").hidden = !!visible.length;
    $("history-empty").textContent = !ready
      ? "Histórico indisponível. Tente carregar novamente."
      : !filterValid
        ? "Corrija o período para consultar os registros."
        : records.length
          ? "Nenhum registro neste período."
          : "Seu histórico começa aqui. Converta uma leitura e toque em Adicionar registro.";
    $("history-count").textContent =
      `${visible.length} ${visible.length === 1 ? "registro exibido" : "registros exibidos"} de ${records.length}`;
    updateActions();
  }

  async function refresh() {
    const request = ++revision;
    try {
      const stored = await listRecords();
      if (request !== revision) return;
      records = stored;
      ready = true;
      $("history-error").textContent = "";
      $("retry-history").hidden = true;
    } catch {
      if (request !== revision) return;
      ready = false;
      $("history-error").textContent =
        "Não foi possível carregar o histórico deste aparelho. A calculadora continua disponível.";
      $("retry-history").hidden = false;
    }
    render();
  }

  async function changed() {
    channel?.postMessage({ type: "changed" });
    clearDownload($("report-download"));
    await refresh();
  }

  $("add-record").addEventListener("click", async () => {
    if (
      !current ||
      writing ||
      records.some((record) => record.id === current.id)
    )
      return;
    const record = current;
    writing = true;
    $("save-feedback").textContent = "";
    updateActions();
    try {
      await saveRecord(record);
      // Reflect the committed write even if a following read fails.
      if (!records.some((item) => item.id === record.id)) records.push(record);
      $("save-feedback").textContent =
        "Registro adicionado ao histórico deste aparelho.";
      await changed();
    } catch {
      $("save-feedback").textContent =
        "O registro não foi salvo. Verifique o espaço disponível ou as permissões do navegador e tente novamente.";
    } finally {
      writing = false;
      updateActions();
    }
  });

  async function remove(action, success) {
    writing = true;
    updateActions();
    try {
      await action();
      $("history-feedback").textContent = success;
      await changed();
    } catch {
      $("history-feedback").textContent =
        "Não foi possível excluir. Os registros não foram apagados; tente novamente.";
    } finally {
      writing = false;
      updateActions();
    }
  }

  $("history-body").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-record]");
    if (!button || writing) return;
    const record = records.find(
      (item) => item.id === button.dataset.deleteRecord,
    );
    if (
      !record ||
      !confirm(
        `Excluir o registro de ${timeLabel(record)}, ${record.celsius} °C? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    await remove(() => deleteRecord(record.id), "Registro excluído.");
    $("history-heading").focus();
  });

  $("clear-history").addEventListener("click", async () => {
    if (writing || !ready || !records.length) return;
    if (
      !confirm(
        "Apagar TODO o histórico deste aparelho? Isso remove todos os registros, INCLUSIVE os ocultos pelo filtro. Esta ação não pode ser desfeita.",
      )
    )
      return;
    await remove(clearRecords, "Todo o histórico deste aparelho foi apagado.");
  });
  $("retry-history").addEventListener("click", refresh);
  for (const id of ["date-start", "date-end"])
    $(id).addEventListener("input", () => {
      clearDownload($("report-download"));
      $("report-feedback").textContent = "";
      render();
    });
  $("reset-filter").addEventListener("click", () => {
    $("date-start").value = "";
    $("date-end").value = "";
    clearDownload($("report-download"));
    $("report-feedback").textContent = "";
    render();
  });

  function model() {
    return reportModel(visible, $("date-start").value, $("date-end").value);
  }
  document.querySelectorAll("[data-report]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!ready || !filterValid || !visible.length || exporting) return;
      const report = model(); // Snapshot before an asynchronous export or a change in another tab.
      if (button.dataset.report === "print") {
        renderPrintReport(report, $("print-report"));
        window.print();
        return;
      }
      exporting = true;
      updateActions();
      $("report-feedback").textContent = "Preparando relatório…";
      try {
        await downloadReport(
          report,
          button.dataset.report,
          $("report-download"),
        );
        $("report-feedback").textContent =
          `Relatório preparado: ${report.period}, ${report.count} registros. Se o download não iniciar, use o link abaixo.`;
      } catch {
        $("report-feedback").textContent =
          "Não foi possível gerar o arquivo. Tente novamente. No primeiro acesso, aguarde o preparo para uso offline.";
      } finally {
        exporting = false;
        updateActions();
      }
    });
  });
  window.addEventListener("beforeprint", () => {
    if (!ready) {
      $("print-report").textContent =
        "Histórico indisponível. Carregue os registros para imprimir.";
      return;
    }
    if (filterValid) renderPrintReport(model(), $("print-report"));
    else
      $("print-report").textContent =
        "Período inválido. Corrija as datas para imprimir o relatório.";
  });
  if (channel)
    channel.onmessage = () => {
      clearDownload($("report-download"));
      refresh();
    };
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  refresh();

  return {
    setResult(result) {
      current = result ? createRecord(result) : null;
      $("conversion-time").textContent = current
        ? `Convertido em ${timeLabel(current)}`
        : "";
      $("save-feedback").textContent = "";
      updateActions();
    },
  };
}
