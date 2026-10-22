export function setupPwa() {
  const $ = (id) => document.getElementById(id);
  let offlineReady = false;
  let registration;
  let deferredPrompt;
  let updateRequested = false;

  function connectionStatus() {
    $("offline-status").dataset.ready = String(offlineReady);
    $("offline-text").textContent = offlineReady
      ? navigator.onLine
        ? "Pronto para usar offline"
        : "Sem internet · pronto para usar"
      : navigator.onLine
        ? "Uso offline indisponível neste acesso"
        : "Sem internet · reabra online para preparar";
  }
  window.addEventListener("online", connectionStatus);
  window.addEventListener("offline", connectionStatus);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    $("install-button").hidden = false;
  });
  $("install-button").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    $("install-button").hidden = true;
    await prompt.prompt();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    $("install-button").hidden = true;
  });

  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    connectionStatus();
    return;
  }

  function showUpdate() {
    $("update-notice").hidden = !(
      navigator.serviceWorker.controller && registration?.waiting
    );
  }
  $("update-button").addEventListener("click", () => {
    if (!registration?.waiting) return;
    updateRequested = true;
    registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  });
  let hasSeenController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    showUpdate();
    const shouldReload = updateRequested || hasSeenController;
    hasSeenController = true;
    if (shouldReload) window.location.reload();
  });

  navigator.serviceWorker
    .register("./sw.js", { scope: "./", updateViaCache: "none" })
    .then(async (installed) => {
      registration = installed;
      showUpdate();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" || worker.state === "activated")
            showUpdate();
          if (worker.state === "redundant" && !registration.active)
            connectionStatus();
        });
      });
      // ready resolves only after successful pre-caching and activation.
      await navigator.serviceWorker.ready;
      offlineReady = true;
      connectionStatus();
    })
    .catch(connectionStatus);
}
