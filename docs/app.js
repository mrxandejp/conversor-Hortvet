import { convert, resultText, FACTOR } from "./conversion.js";
import { setupPwa } from "./pwa.js";

const $ = (id) => document.getElementById(id);
const input = $("celsius");
const form = $("conversion-form");
let currentResult = null;
let announcementTimer;

function clearResult() {
  currentResult = null;
  clearTimeout(announcementTimer);
  $("result-panel").dataset.state = "empty";
  $("empty-result").hidden = false;
  $("completed-result").hidden = true;
  $("range-marker").hidden = true;
  $("copy-fallback").hidden = true;
  $("copy-text").value = "";
  $("copy-feedback").textContent = "";
  $("result-announcement").textContent = "";
  $("calculation-details").open = false;
}

function clearError() {
  input.removeAttribute("aria-invalid");
  $("input-error").textContent = "";
}

function updateMarker(result) {
  // Decorative scale: the actual classification is exact decimal arithmetic.
  const celsius =
    Number(result.celsius.coefficient) / 10 ** result.celsius.scale;
  const position = ((celsius + 0.548) / 0.048) * 100;
  $("range-marker").style.left = `${Math.min(91, Math.max(9, position))}%`;
  $("marker-label").textContent =
    position < 9
      ? "← abaixo"
      : position > 91
        ? "acima →"
        : `${Number(celsius.toFixed(6)).toString().replace("-", "−").replace(".", ",")} °C`;
  $("range-marker").hidden = false;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearResult();
  clearError();
  try {
    currentResult = convert(input.value);
  } catch (error) {
    input.setAttribute("aria-invalid", "true");
    $("input-error").textContent = error.message;
    input.focus();
    return;
  }
  const result = currentResult;
  $("empty-result").hidden = true;
  $("completed-result").hidden = false;
  $("result-panel").dataset.state = result.status;
  $("hortvet-value").textContent = result.rounded;
  $("result-source").textContent = `A partir de ${result.input} °C`;
  $("status-title").textContent = result.title;
  $("status-symbol").textContent = result.symbol;
  $("status-description").textContent = result.description;
  $("boundary-label").textContent = result.boundaryText;
  $("boundary-label").hidden = !result.boundary;
  $("exact-calculation").textContent =
    `${result.input} °C × ${FACTOR} = ${result.exact} °H`;
  updateMarker(result);
  announcementTimer = setTimeout(() => {
    $("result-announcement").textContent = [
      `${result.rounded} graus Hortvet`,
      result.title,
      result.boundaryText,
      result.description,
    ]
      .filter(Boolean)
      .join(". ");
  }, 50);
});

input.addEventListener("input", () => {
  clearResult();
  clearError();
});
form.addEventListener("reset", (event) => {
  event.preventDefault();
  input.value = "";
  clearResult();
  clearError();
  input.focus();
});
$("negative-sign").addEventListener("click", () => {
  const value = input.value.trim();
  if (!/^[-−]/.test(value)) {
    input.value = `-${value}`;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
});

$("copy-result").addEventListener("click", async () => {
  if (!currentResult) return;
  const result = currentResult;
  const text = resultText(result);
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    if (currentResult === result)
      $("copy-feedback").textContent = "Resultado copiado.";
  } catch {
    if (currentResult !== result) return;
    $("copy-fallback").hidden = false;
    $("copy-text").value = text;
    $("copy-text").focus();
    $("copy-text").select();
    $("copy-feedback").textContent =
      "A cópia automática não está disponível. Copie o texto selecionado.";
  }
});

function openLinkedSection(hash = location.hash) {
  const section = document.querySelector(
    hash === "#install"
      ? "#install"
      : hash === "#references"
        ? "#references"
        : "#calculator",
  );
  if (section instanceof HTMLDetailsElement) section.open = true;
}
window.addEventListener("hashchange", () => openLinkedSection());
document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => openLinkedSection(link.hash));
});
openLinkedSection();
setupPwa();
