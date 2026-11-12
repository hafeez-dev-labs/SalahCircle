const test=require("node:test"),assert=require("node:assert/strict"),core=require("../prayer-times-core.js");
const day={dateKey:"2026-11-12",timings:{Fajr:"05:10",Sunrise:"06:30",Dhuhr:"12:05",Asr:"16:10",Maghrib:"18:02",Isha:"19:20"}};
const tomorrow={dateKey:"2026-11-13",timings:{Fajr:"05:11",Sunrise:"06:31",Dhuhr:"12:05",Asr:"16:11",Maghrib:"18:01",Isha:"19:20"}};
test("prayer windows use explicit boundaries including Sunrise and Hanafi Asr",()=>{
 const windows=core.buildPrayerWindows([day,tomorrow],"Asia/Kolkata");
 const byKey=Object.fromEntries(windows.filter(w=>w.dateKey===day.dateKey).map(w=>[w.key,w]));
 assert.equal(core.formatTime(byKey.Fajr.end,"Asia/Kolkata"),"6:30 AM");
 assert.equal(core.formatTime(byKey.Dhuhr.end,"Asia/Kolkata"),"4:10 PM");
 assert.equal(core.formatTime(byKey.Asr.end,"Asia/Kolkata"),"6:02 PM");
 assert.equal(core.formatTime(byKey.Maghrib.end,"Asia/Kolkata"),"7:20 PM");
});
test("Isha ends at the next day's Fajr rather than same-day Fajr",()=>{
 const isha=core.buildPrayerWindows([day,tomorrow],"Asia/Kolkata").find(w=>w.dateKey===day.dateKey&&w.key==="Isha");
 assert.equal(core.formatTime(isha.end,"Asia/Kolkata"),"5:11 AM");
 assert.equal(isha.end.getTime()>isha.start.getTime(),true);
});
test("selected location timezone is used instead of the device timezone",()=>{
 const parsed=core.zonedDateTime("2026-11-12","05:00","Asia/Kolkata");
 assert.equal(parsed.toISOString(),"2026-11-11T23:30:00.000Z");
 assert.equal(core.dateKeyInTimezone(new Date("2026-11-11T23:30:00.000Z"),"Asia/Kolkata"),"2026-11-12");
});
test("date helpers handle month and year rollover",()=>{
 assert.equal(core.addDaysToDateKey("2026-12-31",1),"2027-01-01");
 assert.equal(core.dateKeyFromGregorian("01-01-2027"),"2027-01-01");
});
test("current prayer window is active until its exclusive end boundary",()=>{
 const windows=core.buildPrayerWindows([day,tomorrow],"Asia/Kolkata");
 const active=core.findActivePrayerWindow(windows,core.zonedDateTime("2026-11-12","12:30","Asia/Kolkata"));
 assert.equal(active.key,"Dhuhr");
 assert.equal(core.findActivePrayerWindow(windows,core.zonedDateTime("2026-11-12","16:10","Asia/Kolkata")).key,"Asr");
});
test("native alarm payload contains upcoming obligatory prayers only",()=>{
 const now=core.zonedDateTime("2026-11-12","11:00","Asia/Kolkata").getTime();
 const alarms=core.prayerAlarmsFromDays([day,tomorrow],"Asia/Kolkata",now);
 assert.equal(alarms.some(a=>a.id==="2026-11-12:Sunrise"),false);
 assert.equal(alarms.some(a=>a.id==="2026-11-12:Fajr"),false);
 assert.equal(alarms.some(a=>a.id==="2026-11-12:Dhuhr"),true);
 assert.equal(alarms.some(a=>a.id==="2026-11-13:Fajr"),true);
});