const STORAGE_KEY = "salahcircle-state-v1";
const PRAYERS = [
  { key: "Fajr", label: "Fajr", glyph: "☼", caption: "Dawn" },
  { key: "Sunrise", label: "Sunrise", glyph: "◌", caption: "Sunrise" },
  { key: "Dhuhr", label: "Dhuhr", glyph: "☀", caption: "Midday" },
  { key: "Asr", label: "Asr", glyph: "◒", caption: "Afternoon" },
  { key: "Maghrib", label: "Maghrib", glyph: "☾", caption: "Sunset" },
  { key: "Isha", label: "Isha", glyph: "✦", caption: "Night" }
];
const DEFAULTS = { locationName:"Ambernath, India", latitude:19.20, longitude:73.19, method:"1", notifications:false, adhanEnabled:false, adhanUrl:"", dhikrTarget:33, dhikrCount:0, dhikrPhrase:"SubhanAllah", lastReminder:"", familyMembers:[{id:"member-1",name:"Family",role:"Our circle"}], attendance:{}, quranPages:0, quranGoal:5, quranDate:new Date().toLocaleDateString("en-CA"), intentions:[], favourites:[], ramadan:{date:new Date().toLocaleDateString("en-CA"),fast:false,quran:false,charity:false,taraweeh:false} };
let state = loadState();
let timings = [];
let deferredInstallPrompt = null;
let toastTimeout = null;
let reminderInterval = null;
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
  $("hijri-date").textContent = new Intl.DateTimeFormat("en-TN-u-ca-islamic", {day:"numeric",month:"short",year:"numeric"}).format(new Date());
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
  if (reminderInterval) clearInterval(reminderInterval);
  if (!state.notifications && !state.adhanEnabled) return;
  reminderInterval = setInterval(checkDuePrayer, 15000); checkDuePrayer();
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

function todayKey() { const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); }
function safeText(v) { return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function renderFamily() {
  const members=state.familyMembers||DEFAULTS.familyMembers, attendance=state.attendance[todayKey()]||{};
  const complete=members.filter(m=>["Fajr","Dhuhr","Asr","Maghrib","Isha"].every(p=>attendance[m.id+":"+p])).length;
  $("family-summary").textContent=members.length+" "+(members.length===1?"member":"members")+" · "+complete+" completed all five check-ins";
  $("family-board").innerHTML=members.map(m=>'<article class="member-card"><div class="member-top"><span class="member-avatar">'+safeText(m.name.charAt(0).toUpperCase())+'</span><span class="member-meta"><strong>'+safeText(m.name)+'</strong><small>'+safeText(m.role)+'</small></span><button class="quiet-button remove-member" data-id="'+safeText(m.id)+'" aria-label="Remove member">×</button></div><div class="attendance-grid">'+["Fajr","Dhuhr","Asr","Maghrib","Isha"].map(p=>{const key=m.id+":"+p,checked=!!attendance[key];return '<label class="attendance-pill '+(checked?"checked":"")+'"><input type="checkbox" data-attendance="'+key+'" '+(checked?"checked":"")+'><span>'+p+'</span></label>';}).join("")+'</div></article>').join("");
}
function renderQuran() {
  if(state.quranDate!==todayKey()){state.quranDate=todayKey();state.quranPages=0;}
  $("quran-pages").textContent=state.quranPages;$("quran-goal").textContent=state.quranGoal;
  $("quran-progress").style.width=Math.min(100,state.quranPages/state.quranGoal*100)+"%";
  $("quran-status").textContent=state.quranPages>=state.quranGoal?"Daily reading goal reached, mashaAllah.":Math.max(0,state.quranGoal-state.quranPages)+" pages to reach today’s goal";saveState();
}
const REFLECTIONS=[
{id:"13:28",arabic:"أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",meaning:"Surely in the remembrance of Allah do hearts find comfort.",reference:"Qur’an 13:28"},
{id:"20:114",arabic:"رَبِّ زِدْنِي عِلْمًا",meaning:"My Lord, increase me in knowledge.",reference:"Qur’an 20:114"},
{id:"2:201",arabic:"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",meaning:"Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",reference:"Qur’an 2:201"}];
function renderReflection(){const item=REFLECTIONS[Math.floor(Date.now()/86400000)%REFLECTIONS.length];$("reflection-arabic").textContent=item.arabic;$("reflection-meaning").textContent=item.meaning;$("reflection-reference").textContent=item.reference;const saved=state.favourites.includes(item.id);$("save-reflection").textContent=saved?"♥ Saved":"♡ Save reflection";$("save-reflection").dataset.reflection=item.id;$("save-reflection").setAttribute("aria-pressed",String(saved));$("favourite-count").textContent=state.favourites.length;}
function renderIntentions(){$("intention-list").innerHTML=state.intentions.length?state.intentions.map(i=>'<li class="intention-item '+(i.done?"done":"")+'"><label><input type="checkbox" data-intention="'+i.id+'" '+(i.done?"checked":"")+'><span>'+safeText(i.text)+'</span></label><button class="quiet-button delete-intention" data-id="'+i.id+'" aria-label="Delete intention">×</button></li>').join(""):'<li class="empty-state">Add a dua, a hope, or a small act of kindness.</li>';}
function renderRamadan(){if(state.ramadan.date!==todayKey())state.ramadan={date:todayKey(),fast:false,quran:false,charity:false,taraweeh:false};["fast","quran","charity","taraweeh"].forEach(k=>{$("ramadan-"+k).checked=state.ramadan[k];});$("ramadan-progress").textContent=[state.ramadan.fast,state.ramadan.quran,state.ramadan.charity,state.ramadan.taraweeh].filter(Boolean).length+" of 4 intentions";saveState();}
function addFamilyMember(event){event.preventDefault();const input=$("member-name"),name=input.value.trim();if(!name)return;state.familyMembers.push({id:"member-"+Date.now(),name,role:$("member-role").value||"Family"});input.value="";saveState();renderFamily();showToast("Added to this device’s family circle.");}
function addFamilyIntention(event){event.preventDefault();const input=$("intention-input"),text=input.value.trim();if(!text)return;state.intentions.unshift({id:"intention-"+Date.now(),text,done:false});input.value="";saveState();renderIntentions();}

$("family-form").addEventListener("submit",addFamilyMember);
$("family-board").addEventListener("change",event=>{const key=event.target.dataset.attendance;if(!key)return;if(!state.attendance[todayKey()])state.attendance[todayKey()]={};state.attendance[todayKey()][key]=event.target.checked;saveState();renderFamily();});
$("family-board").addEventListener("click",event=>{const button=event.target.closest(".remove-member");if(!button||!confirm("Remove this family member from this device?"))return;state.familyMembers=state.familyMembers.filter(m=>m.id!==button.dataset.id);Object.values(state.attendance).forEach(day=>Object.keys(day).forEach(key=>{if(key.startsWith(button.dataset.id+":"))delete day[key];}));saveState();renderFamily();});
$("quran-log-form").addEventListener("submit",event=>{event.preventDefault();const amount=Number($("quran-pages-input").value);if(!Number.isInteger(amount)||amount<1||amount>604){showToast("Enter pages from 1 to 604.");return;}if(state.quranDate!==todayKey()){state.quranDate=todayKey();state.quranPages=0;}state.quranPages=Math.min(604,state.quranPages+amount);$("quran-pages-input").value="";saveState();renderQuran();});
$("quran-goal-form").addEventListener("submit",event=>{event.preventDefault();const goal=Number($("quran-goal-input").value);if(!Number.isInteger(goal)||goal<1||goal>604){showToast("Choose a goal from 1 to 604 pages.");return;}state.quranGoal=goal;$("quran-goal-input").value="";saveState();renderQuran();showToast("Daily Quran goal updated.");});
$("intention-form").addEventListener("submit",addFamilyIntention);
$("intention-list").addEventListener("change",event=>{const item=state.intentions.find(i=>i.id===event.target.dataset.intention);if(item){item.done=event.target.checked;saveState();renderIntentions();}});
$("intention-list").addEventListener("click",event=>{const button=event.target.closest(".delete-intention");if(!button)return;state.intentions=state.intentions.filter(i=>i.id!==button.dataset.id);saveState();renderIntentions();});
$("save-reflection").addEventListener("click",()=>{const id=$("save-reflection").dataset.reflection;state.favourites=state.favourites.includes(id)?state.favourites.filter(v=>v!==id):[...state.favourites,id];saveState();renderReflection();showToast(state.favourites.includes(id)?"Reflection saved on this device.":"Reflection removed.");});
["fast","quran","charity","taraweeh"].forEach(k=>$("ramadan-"+k).addEventListener("change",event=>{state.ramadan[k]=event.target.checked;saveState();renderRamadan();}));
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
renderDhikr(); updateHeader(); renderFamily(); renderQuran(); renderReflection(); renderIntentions(); renderRamadan(); fetchPrayerTimes(); setInterval(renderNextPrayer, 1000);
