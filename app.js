const STORAGE_KEY = "salahcircle-state-v1";
const PRAYERS = [
  { key: "Fajr", label: "Fajr", glyph: "☼", caption: "Dawn" },
  { key: "Sunrise", label: "Sunrise", glyph: "◌", caption: "Sunrise" },
  { key: "Dhuhr", label: "Dhuhr", glyph: "☀", caption: "Midday" },
  { key: "Asr", label: "Asr", glyph: "◒", caption: "Afternoon" },
  { key: "Maghrib", label: "Maghrib", glyph: "☾", caption: "Sunset" },
  { key: "Isha", label: "Isha", glyph: "✦", caption: "Night" }
];
const DEFAULTS = { locationName:"Ambernath, India", latitude:19.20, longitude:73.19, method:"1", notifications:false, adhanEnabled:false, adhanUrl:"", dhikrTarget:33, dhikrCount:0, dhikrPhrase:"SubhanAllah", lastReminder:"" };
let state = loadState();
let timings = [];
let deferredInstallPrompt = null;
let toastTimeout = null;
const $ = (id) => document.getElementById(id);
function loadState() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return { ...DEFAULTS }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function showToast(message) {
  const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
}
function formatTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "—";
  const date = new Date(); date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
}
function timeDate(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const date = new Date(); date.setHours(Number(match[1]), Number(match[2]), 0, 0); return date;
}
function upcomingPrayer() {
  const now = new Date();
  const main = timings.filter((p) => p.key !== "Sunrise");
  const next = main.find((p) => timeDate(p.time) && timeDate(p.time) > now);
  if (next) return { prayer:next, date:timeDate(next.time) };
  const fajr = main.find((p) => p.key === "Fajr");
  const tomorrow = fajr ? timeDate(fajr.time) : null;
  if (tomorrow) tomorrow.setDate(tomorrow.getDate() + 1);
  return { prayer:fajr, date:tomorrow };
}
function updateHeader() {
  $("today-label").textContent = new Date().toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" });
  $("location-label").textContent = state.locationName || (state.latitude + ", " + state.longitude);
}
function renderPrayers() {
  const now = new Date(); const active = upcomingPrayer().prayer;
  $("prayer-list").innerHTML = timings.map((p) => {
    const date = timeDate(p.time); const passed = date && date < now; const isActive = active && active.key === p.key;
    return '<div class="prayer-row ' + (isActive ? "active" : "") + " " + (passed && !isActive ? "passed" : "") + '">' +
      '<div class="prayer-glyph" aria-hidden="true">' + p.glyph + '</div><div><div class="prayer-name">' + p.label + '</div><div class="prayer-caption">' + p.caption + (isActive ? " · Up next" : "") + '</div></div><time class="prayer-time">' + formatTime(p.time) + '</time></div>';
  }).join("");
}
function renderNextPrayer() {
  if (!timings.length) return;
  const next = upcomingPrayer(); if (!next.prayer || !next.date) return;
  $("next-prayer-name").textContent = next.prayer.label;
  $("next-prayer-meta").textContent = formatTime(next.prayer.time) + " · " + next.date.toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" });
  const diff = Math.max(0, next.date.getTime() - Date.now());
  const parts = [Math.floor(diff / 3600000), Math.floor((diff % 3600000) / 60000), Math.floor((diff % 60000) / 1000)];
  $("countdown").textContent = parts.map((v) => String(v).padStart(2, "0")).join(":");
  renderPrayers();
}
async function fetchPrayerTimes() {
  const button = $("refresh-times"); button.disabled = true; button.textContent = "Loading…";
  $("prayer-list").innerHTML = '<div class="loading-row">Finding today’s prayer times…</div>';
  try {
    const params = new URLSearchParams({ latitude:String(state.latitude), longitude:String(state.longitude), method:state.method, school:"1" });
    const response = await fetch("https://api.aladhan.com/v1/timings/" + Math.floor(Date.now() / 1000) + "?" + params, { cache:"no-store" });
    if (!response.ok) throw new Error("Prayer-time service is unavailable.");
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data || !payload.data.timings) throw new Error("Prayer times could not be loaded.");
    const source = payload.data.timings;
    timings = PRAYERS.map((p) => ({ ...p, time:source[p.key] })).filter((p) => p.time);
    if (!timings.length) throw new Error("No prayer timings were returned.");
    updateHeader(); renderNextPrayer();
    $("times-note").textContent = "Calculation: " + ((payload.data.meta && payload.data.meta.method && payload.data.meta.method.name) || "selected method") + " · Asr: Hanafi. Confirm timings with your local mosque if needed.";
    scheduleReminders();
  } catch (error) {
    $("prayer-list").innerHTML = '<div class="loading-row">Could not load prayer times. Check your connection and try again.</div>';
    $("next-prayer-name").textContent = "Prayer times unavailable"; $("next-prayer-meta").textContent = "Check your connection or location settings"; $("countdown").textContent = "--:--:--";
    showToast(error.message || "Could not load prayer times.");
  } finally { button.disabled = false; button.textContent = "↻ Refresh"; }
}
function renderDhikr() {
  $("dhikr-count").textContent = state.dhikrCount; $("dhikr-phrase").value = state.dhikrPhrase;
  $("target-label").textContent = state.dhikrTarget;
  $("dhikr-progress").style.width = Math.min(100, state.dhikrCount / state.dhikrTarget * 100) + "%";
}
function scheduleReminders() {
  if (window.reminderInterval) clearInterval(window.reminderInterval);
  if (!state.notifications && !state.adhanEnabled) return;
  window.reminderInterval = setInterval(checkDuePrayer, 15000); checkDuePrayer();
}
function checkDuePrayer() {
  if (!timings.length) return;
  const now = new Date(); const today = now.toDateString();
  for (const prayer of timings.filter((p) => p.key !== "Sunrise")) {
    const date = timeDate(prayer.time);
    if (!date || Math.abs(now.getTime() - date.getTime()) > 20000) continue;
    const key = today + ":" + prayer.key; if (state.lastReminder === key) continue;
    state.lastReminder = key; saveState();
    if (state.notifications && "Notification" in window && Notification.permission === "granted") {
      try { new Notification("It’s time for " + prayer.label, { body:"A gentle Salah reminder · " + state.locationName, icon:"./icons/icon.svg", tag:key }); } catch { /* Browser may restrict notification delivery. */ }
    }
    if (state.adhanEnabled && state.adhanUrl) playAdhan(false);
  }
}
async function enableNotifications() {
  if (!("Notification" in window)) { state.notifications = false; $("notifications-enabled").checked = false; showToast("Notifications are not supported in this browser."); return; }
  const permission = await Notification.requestPermission(); state.notifications = permission === "granted";
  $("notifications-enabled").checked = state.notifications; saveState();
  showToast(state.notifications ? "Prayer reminders enabled while the app is open." : "Notification permission was not granted."); scheduleReminders();
}
async function playAdhan(showFeedback = true) {
  const audio = $("adhan-audio"); const url = state.adhanUrl.trim();
  if (!url) { if (showFeedback) showToast("Add a direct Adhan audio URL in Settings first."); return; }
  try {
    const parsed = new URL(url); if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Use an HTTPS audio URL.");
    audio.src = parsed.href; await audio.play(); if (showFeedback) showToast("Playing Adhan audio.");
  } catch { if (showFeedback) showToast("Audio could not play. Check the URL and browser permissions."); }
}
function openSettings() {
  $("location-name").value = state.locationName; $("latitude").value = state.latitude; $("longitude").value = state.longitude;
  $("calc-method").value = state.method; $("notifications-enabled").checked = state.notifications;
  $("adhan-enabled").checked = state.adhanEnabled; $("adhan-url").value = state.adhanUrl; $("dhikr-target").value = state.dhikrTarget;
  $("settings-dialog").showModal();
}
function saveSettings(event) {
  event.preventDefault(); const form = $("settings-form"); if (!form.reportValidity()) return;
  const previousLocation = [state.latitude, state.longitude, state.method].join(",");
  state.locationName = $("location-name").value.trim() || "My location"; state.latitude = Number($("latitude").value);
  state.longitude = Number($("longitude").value); state.method = $("calc-method").value;
  state.notifications = $("notifications-enabled").checked; state.adhanEnabled = $("adhan-enabled").checked;
  state.adhanUrl = $("adhan-url").value.trim(); state.dhikrTarget = Math.max(1, Number($("dhikr-target").value) || 33);
  saveState(); $("settings-dialog").close(); renderDhikr(); updateHeader();
  if (state.notifications && "Notification" in window && Notification.permission !== "granted") {
    state.notifications = false; saveState(); showToast("Enable notifications again to grant browser permission.");
  }
  scheduleReminders();
  if (previousLocation !== [state.latitude, state.longitude, state.method].join(",")) fetchPrayerTimes();
  else showToast("Settings saved on this device.");
}
$("settings-open").addEventListener("click", openSettings);
$("refresh-times").addEventListener("click", fetchPrayerTimes);
$("settings-form").addEventListener("submit", saveSettings);
$("counter-button").addEventListener("click", () => {
  state.dhikrCount += 1; saveState(); renderDhikr();
  if (state.dhikrCount === state.dhikrTarget) showToast("Alhamdulillah, you reached your target.");
});
$("undo-count").addEventListener("click", () => { state.dhikrCount = Math.max(0, state.dhikrCount - 1); saveState(); renderDhikr(); });
$("reset-count").addEventListener("click", () => { state.dhikrCount = 0; saveState(); renderDhikr(); showToast("Counter reset."); });
$("dhikr-phrase").addEventListener("change", (event) => { state.dhikrPhrase = event.target.value; saveState(); });
$("notifications-enabled").addEventListener("change", async (event) => {
  if (event.target.checked) await enableNotifications();
  else { state.notifications = false; saveState(); scheduleReminders(); }
});
$("test-adhan").addEventListener("click", () => { state.adhanUrl = $("adhan-url").value.trim(); playAdhan(true); });
$("install-button").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null; $("install-button").hidden = true;
});
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; $("install-button").hidden = false; });
window.addEventListener("appinstalled", () => { $("install-button").hidden = true; showToast("SalahCircle installed."); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) { renderNextPrayer(); checkDuePrayer(); } });
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
renderDhikr(); updateHeader(); fetchPrayerTimes(); setInterval(renderNextPrayer, 1000);
