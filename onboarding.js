(function (root) {
  "use strict";

  const STORAGE_KEY = "salahcircle-how-to-seen-v1";

  function shouldShowOnboarding(storage) {
    try {
      return storage.getItem(STORAGE_KEY) !== "1";
    } catch (_) {
      return true;
    }
  }

  function markOnboardingSeen(storage) {
    try {
      storage.setItem(STORAGE_KEY, "1");
      return true;
    } catch (_) {
      return false;
    }
  }

  const api = { STORAGE_KEY, shouldShowOnboarding, markOnboardingSeen };
  root.SalahCircleOnboarding = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof document === "undefined") return;

  const dialog = document.getElementById("how-to-dialog");
  const openButton = document.getElementById("how-to-open");
  const settingsButton = document.getElementById("how-to-settings");
  if (!dialog || !openButton || typeof dialog.showModal !== "function") return;

  const showGuide = () => {
    if (!dialog.open) dialog.showModal();
  };

  openButton.addEventListener("click", showGuide);
  dialog.addEventListener("close", () => markOnboardingSeen(root.localStorage));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      dialog.close();
      const settingsDialog = document.getElementById("settings-dialog");
      if (settingsDialog && typeof settingsDialog.showModal === "function" && !settingsDialog.open) {
        settingsDialog.showModal();
      }
    });
  }

  if (shouldShowOnboarding(root.localStorage)) {
    root.requestAnimationFrame(showGuide);
  }
})(globalThis);
