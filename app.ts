type FamilyMember = { id:string; name:string; role:string };
type FamilyIntention = { id:string; text:string; done:boolean };
type AppState = { locationName:string; latitude:number; longitude:number; method:string; notifications:boolean; adhanEnabled:boolean; adhanUrl:string; dhikrTarget:number; dhikrCount:number; dhikrPhrase:string; lastReminder:string; familyMembers:FamilyMember[]; attendance:Record<string,Record<string,boolean>>; quranPages:number; quranGoal:number; quranDate:string; intentions:FamilyIntention[]; favourites:string[]; ramadan:{date:string;fast:boolean;quran:boolean;charity:boolean;taraweeh:boolean} };
const STORAGE_KEY = "salahcircle-state-v1";
const PRAYERS = [
  { key: "Fajr", label: "Fajr", glyph: "☼", caption: "Dawn" },
  { key: "Sunrise", label: "Sunrise", glyph: "◌", caption: "Sunrise" },
  { key: "Dhuhr", label: "Dhuhr", glyph: "☀", caption: "Midday" },
  { key: "Asr", label: "Asr", glyph: "◒", caption: "Afternoon" },
  { key: "Maghrib", label: "Maghrib", glyph: "☾", caption: "Sunset" },
  { key: "Isha", label: "Isha", glyph: "✦", caption: "Night" }
];
const DEFAULTS = { locationName:"Ambernath, India", latitude:19.20, longitude:73.19, method:"1", notifications:false, adhanEnabled:false, adhanUrl:"./assets/adhan.ogg", dhikrTarget:33, dhikrCount:0, dhikrPhrase:"SubhanAllah", lastReminder:"", familyMembers:[{id:"member-1",name:"Family",role:"Our circle"}], attendance:{}, quranPages:0, quranGoal:5, quranDate:new Date().toLocaleDateString("en-CA"), intentions:[], favourites:[], ramadan:{date:new Date().toLocaleDateString("en-CA"),fast:false,quran:false,charity:false,taraweeh:false} };
let state: AppState = loadState();
let timings = [];
let timingsDate = "";
let prayerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
let prayerDateKey = "";
let calendarDays: any[] = [];
let prayerWindows: any[] = [];
const PrayerTimeCore: any = (window as any).SalahCirclePrayerTimeCore;
let deferredInstallPrompt = null;
let toastTimeout = null;
let reminderInterval = null;
const $ = (id: string): any => document.getElementById(id);
function loadState(): AppState {
  try { const saved = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Partial<AppState> }; saved.adhanUrl = DEFAULTS.adhanUrl; return saved; }
  catch { return { ...DEFAULTS }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function showToast(message) {
  const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
}
function formatTime(value, dateKey = prayerDateKey) {
  const date = value instanceof Date ? value : PrayerTimeCore.zonedDateTime(dateKey || prayerTodayKey(), value, prayerTimezone);
  return date ? PrayerTimeCore.formatTime(date, prayerTimezone) : "—";
}
function timeDate(value, dateKey = prayerDateKey) {
  return PrayerTimeCore.zonedDateTime(dateKey || prayerTodayKey(), value, prayerTimezone);
}
function prayerTodayKey() {
  return PrayerTimeCore.dateKeyInTimezone(new Date(), prayerTimezone);
}
function upcomingPrayer() {
  const now = Date.now();
  const events = PrayerTimeCore.prayerEventsFromDays(calendarDays, prayerTimezone);
  const event = events.find((item) => item.date.getTime() > now);
  return event ? { prayer: event.prayer, date: event.date } : { prayer: null, date: null };
}
function currentPrayerWindow() {
  return PrayerTimeCore.findActivePrayerWindow(prayerWindows, new Date());
}
function updateHeader() {
  $("today-label").textContent = new Date().toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" });
  $("location-label").textContent = state.locationName || (state.latitude + ", " + state.longitude);
  $("hijri-date").textContent = new Intl.DateTimeFormat("en-TN-u-ca-islamic", {day:"numeric",month:"short",year:"numeric"}).format(new Date());
}
function renderPrayers() {
  const now = new Date();
  const active = currentPrayerWindow();
  const today = prayerTodayKey();
  $("prayer-list").innerHTML = timings.map((p) => {
    const date = timeDate(p.time, today);
    const window = prayerWindows.find((item) => item.dateKey === today && item.key === p.key);
    const passed = date && date < now;
    const isActive = active && active.key === p.key && active.dateKey === today;
    const deadline = window ? formatTime(window.end) : "—";
    return '<div class="prayer-row ' + (isActive ? "active" : "") + " " + (passed && !isActive ? "passed" : "") + '">' +
      '<div class="prayer-glyph" aria-hidden="true">' + p.glyph + '</div><div><div class="prayer-name">' + p.label + '</div><div class="prayer-caption">' + p.caption + (isActive ? " · In time" : "") + '</div></div><time class="prayer-time">' + formatTime(p.time, today) + '</time><div class="prayer-deadline"><small>Pray by</small><time>' + deadline + '</time></div></div>';
  }).join("");
}
function renderNextPrayer() {
  if (!timings.length) return;
  const active = currentPrayerWindow();
  const next = upcomingPrayer();
  let target = null;
  if (active) {
    $("next-prayer-kicker").textContent = "PRAYER WINDOW OPEN";
    $("next-prayer-name").textContent = active.label;
    $("next-prayer-meta").textContent = "Pray by " + formatTime(active.end, active.dateKey) + " · " + active.dateKey;
    target = active.end;
    $("countdown-label").textContent = "time remaining to pray";
  } else if (next.prayer && next.date) {
    $("next-prayer-kicker").textContent = "UP NEXT";
    $("next-prayer-name").textContent = next.prayer.label;
    $("next-prayer-meta").textContent = formatTime(next.date) + " · " + next.date.toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" });
    target = next.date;
    $("countdown-label").textContent = "starts in";
  } else {
    return;
  }
  const diff = Math.max(0, target.getTime() - Date.now());
  const parts = [Math.floor(diff / 3600000), Math.floor((diff % 3600000) / 60000), Math.floor((diff % 60000) / 1000)];
  $("countdown").textContent = parts.map((v) => String(v).padStart(2, "0")).join(":");
  renderPrayers();
}
async function fetchPrayerCalendar(todayKey, todaySource) {
  const [year, month] = todayKey.split("-").map(Number);
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const months = [{ year, month }, { year: nextMonthDate.getUTCFullYear(), month: nextMonthDate.getUTCMonth() + 1 }];
  const params = new URLSearchParams({ latitude:String(state.latitude), longitude:String(state.longitude), method:state.method, school:"1" });
  const entries = new Map();
  const responses = await Promise.allSettled(months.map(async (item) => {
    const response = await fetch("https://api.aladhan.com/v1/calendar/" + item.year + "/" + item.month + "?" + params, { cache:"no-store" });
    if (!response.ok) throw new Error("Prayer calendar is unavailable.");
    const payload = await response.json();
    if (payload.code !== 200 || !Array.isArray(payload.data)) throw new Error("Prayer calendar could not be loaded.");
    return payload.data;
  }));
  responses.forEach((result) => {
    if (result.status !== "fulfilled") return;
    result.value.forEach((entry) => {
      const key = PrayerTimeCore.dateKeyFromGregorian(entry.date && entry.date.gregorian && entry.date.gregorian.date);
      if (key && entry.timings) entries.set(key, { dateKey:key, timings:entry.timings });
    });
  });
  entries.set(todayKey, { dateKey:todayKey, timings:todaySource });
  const tomorrowKey = PrayerTimeCore.addDaysToDateKey(todayKey, 1);
  if (!entries.has(tomorrowKey)) {
    const [ty, tm, td] = tomorrowKey.split("-");
    const response = await fetch("https://api.aladhan.com/v1/timings/" + td + "-" + tm + "-" + ty + "?" + params, { cache:"no-store" });
    if (!response.ok) throw new Error("Tomorrow's Fajr time is unavailable.");
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data || !payload.data.timings) throw new Error("Tomorrow's Fajr time could not be loaded.");
    entries.set(tomorrowKey, { dateKey:tomorrowKey, timings:payload.data.timings });
  }
  return Array.from(entries.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}
function syncNativePrayerAlarms() {
  const bridge = (window as any).SalahCircleAndroid;
  if (!bridge || !calendarDays.length || !PrayerTimeCore) return;
  if (!state.adhanEnabled) {
    bridge.schedulePrayerAlarms("[]");
    return;
  }
  let selected = ["Fajr","Dhuhr","Asr","Maghrib","Isha"];
  try {
    const preferences = JSON.parse(localStorage.getItem("salahcircle-extended-v1") || "{}");
    if (Array.isArray(preferences.adhanPrayers)) selected = selected.filter((key) => preferences.adhanPrayers.includes(key));
  } catch {}
  const alarms = PrayerTimeCore.prayerAlarmsFromDays(calendarDays, prayerTimezone, Date.now())
    .filter((item) => selected.includes(item.title));
  bridge.schedulePrayerAlarms(JSON.stringify(alarms));
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
    prayerTimezone = payload.data.meta && payload.data.meta.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    prayerDateKey = prayerTodayKey();
    calendarDays = await fetchPrayerCalendar(prayerDateKey, source);
    const today = calendarDays.find((day) => day.dateKey === prayerDateKey);
    const tomorrow = calendarDays.find((day) => day.dateKey === PrayerTimeCore.addDaysToDateKey(prayerDateKey, 1));
    timings = PRAYERS.map((p) => ({ ...p, time:(today && today.timings[p.key]) || source[p.key] })).filter((p) => p.time);
    if (!timings.length) throw new Error("No prayer timings were returned.");
    prayerWindows = PrayerTimeCore.buildPrayerWindows(calendarDays, prayerTimezone);
    timingsDate = prayerDateKey;
    updateHeader(); renderNextPrayer();
    $("times-note").textContent = "Calculation: " + ((payload.data.meta && payload.data.meta.method && payload.data.meta.method.name) || "selected method") + " · Asr: Hanafi · Location timezone: " + prayerTimezone + ". Confirm timings with your local mosque; methods and local timetables can differ.";
    if (!tomorrow || !tomorrow.timings.Fajr) $("times-note").textContent += " Tomorrow's Fajr boundary could not be confirmed.";
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
  syncNativePrayerAlarms();
  if (!state.notifications && !state.adhanEnabled) return;
  reminderInterval = setInterval(() => { if (timingsDate !== prayerTodayKey()) { fetchPrayerTimes(); return; } checkDuePrayer(); }, 15000); checkDuePrayer();
}
function checkDuePrayer() {
  if (!timings.length) return;
  const now = new Date(); const today = prayerTodayKey();
  for (const prayer of timings.filter((p) => p.key !== "Sunrise")) {
    const date = timeDate(prayer.time, today);
    if (!date) continue;
    const delay = now.getTime() - date.getTime();
    if (delay < 0 || delay > 5 * 60 * 1000) continue;
    const key = today + ":" + prayer.key;
    const firedKey = "salahcircle-fired-" + key;
    if (localStorage.getItem(firedKey) === "1") continue;
    localStorage.setItem(firedKey, "1");
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
  const audio = $("adhan-audio");
  state.adhanUrl = DEFAULTS.adhanUrl;
  try {
    audio.src = new URL(DEFAULTS.adhanUrl, document.baseURI).href;
    await audio.play();
    if (showFeedback) showToast("Playing the built-in Adhan recording.");
  } catch {
    if (showFeedback) showToast("Audio could not play. Tap Test Adhan first and check your device volume.");
  }
}
function useDeviceLocation() {
  if (!navigator.geolocation) { showToast("Device location is not supported by this browser."); return; }
  const button = $("use-device-location");
  button.disabled = true; button.textContent = "Finding location…";
  navigator.geolocation.getCurrentPosition(position => {
    $("latitude").value = position.coords.latitude.toFixed(6);
    $("longitude").value = position.coords.longitude.toFixed(6);
    $("location-name").value = "Current device location";
    button.disabled = false; button.textContent = "◎ Use device location";
    showToast("Location found. Save settings to refresh prayer times.");
  }, error => {
    button.disabled = false; button.textContent = "◎ Use device location";
    showToast(error.code === 1 ? "Location permission was denied." : "Could not determine your location. Enter coordinates manually.");
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
function openSettings() {
  $("location-name").value = state.locationName; $("latitude").value = state.latitude; $("longitude").value = state.longitude;
  $("calc-method").value = state.method; $("notifications-enabled").checked = state.notifications;
  $("adhan-enabled").checked = state.adhanEnabled; $("dhikr-target").value = state.dhikrTarget;
  $("settings-dialog").showModal();
}
function saveSettings(event) {
  event.preventDefault(); const form = $("settings-form"); if (!form.reportValidity()) return;
  const previousLocation = [state.latitude, state.longitude, state.method].join(",");
  state.locationName = $("location-name").value.trim() || "My location"; state.latitude = Number($("latitude").value);
  state.longitude = Number($("longitude").value); state.method = $("calc-method").value;
  state.notifications = $("notifications-enabled").checked; state.adhanEnabled = $("adhan-enabled").checked;
  state.adhanUrl = DEFAULTS.adhanUrl; state.dhikrTarget = Math.max(1, Number($("dhikr-target").value) || 33);
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
$("use-device-location").addEventListener("click", useDeviceLocation);
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
$("test-adhan").addEventListener("click", () => { state.adhanUrl = DEFAULTS.adhanUrl; playAdhan(true); });
$("install-button").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null; $("install-button").hidden = true;
});
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; $("install-button").hidden = false; });
window.addEventListener("appinstalled", () => { $("install-button").hidden = true; showToast("SalahCircle installed."); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) { renderNextPrayer(); checkDuePrayer(); syncNativePrayerAlarms(); } });
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
renderDhikr(); updateHeader(); renderFamily(); renderQuran(); renderReflection(); renderIntentions(); renderRamadan(); fetchPrayerTimes(); setInterval(renderNextPrayer, 1000);
