(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.SalahCirclePrayerTimeCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const KEYS=["Fajr","Dhuhr","Asr","Maghrib","Isha"];
  const END_KEYS={Fajr:"Sunrise",Dhuhr:"Asr",Asr:"Maghrib",Maghrib:"Isha",Isha:"Fajr"};
  function parseClock(value){
    const match=String(value||"").match(/(\d{1,2}):(\d{2})/);
    if(!match)return null;
    let hour=Number(match[1]),minute=Number(match[2]);
    if(hour===24)hour=0;
    if(hour>23||minute>59)return null;
    return{hour,minute};
  }
  function dateKeyParts(key){
    const match=String(key||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match?{year:Number(match[1]),month:Number(match[2]),day:Number(match[3])}:null;
  }
  function addDaysToDateKey(key,amount){
    const p=dateKeyParts(key);if(!p)throw new RangeError("Invalid date key");
    const d=new Date(Date.UTC(p.year,p.month-1,p.day+amount));
    return[d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,"0"),String(d.getUTCDate()).padStart(2,"0")].join("-");
  }
  function dateKeyFromGregorian(value){
    const m=String(value||"").match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    return m?[m[3],m[2].padStart(2,"0"),m[1].padStart(2,"0")].join("-"):null;
  }
  function partsInZone(date,timeZone){
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);
    const out={};parts.forEach(p=>{if(p.type!=="literal")out[p.type]=Number(p.value);});return out;
  }
  function dateKeyInTimezone(date,timeZone){
    const p=partsInZone(date,timeZone);
    return[p.year,String(p.month).padStart(2,"0"),String(p.day).padStart(2,"0")].join("-");
  }
  function zonedDateTime(dateKey,clock,timeZone){
    const d=dateKeyParts(dateKey),t=parseClock(clock);
    if(!d||!t)return null;
    const target=Date.UTC(d.year,d.month-1,d.day,t.hour,t.minute,0,0);
    let candidate=target;
    for(let i=0;i<4;i++){
      const p=partsInZone(new Date(candidate),timeZone);
      const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second||0,0);
      const delta=target-represented;
      if(delta===0)break;
      candidate+=delta;
    }
    const result=new Date(candidate);
    return Number.isNaN(result.getTime())?null:result;
  }
  function formatTime(date,timeZone,locale){
    if(!(date instanceof Date)||Number.isNaN(date.getTime()))return"—";
    return new Intl.DateTimeFormat(locale||undefined,{timeZone,hour:"numeric",minute:"2-digit"}).format(date);
  }
  function buildPrayerWindows(days,timeZone){
    const byDate=new Map((days||[]).map(day=>[day.dateKey,day]));
    return(days||[]).flatMap(day=>{
      const next=byDate.get(addDaysToDateKey(day.dateKey,1));
      return KEYS.flatMap(key=>{
        const endKey=END_KEYS[key];
        const endDay=key==="Isha"?next:day;
        const endValue=endDay&&endDay.timings?endDay.timings[endKey]:null;
        const start=zonedDateTime(day.dateKey,day.timings&&day.timings[key],timeZone);
        const end=zonedDateTime(key==="Isha"&&next?next.dateKey:day.dateKey,endValue,timeZone);
        if(!start||!end||end<=start)return[];
        return[{key,label:key,dateKey:day.dateKey,start,end,endKey}];
      });
    });
  }
  function findActivePrayerWindow(windows,now){
    const stamp=now instanceof Date?now.getTime():Number(now);
    return(windows||[]).find(w=>w.start.getTime()<=stamp&&stamp<w.end.getTime())||null;
  }
  function prayerEventsFromDays(days,timeZone){
    return(days||[]).flatMap(day=>KEYS.map(key=>{
      const date=zonedDateTime(day.dateKey,day.timings&&day.timings[key],timeZone);
      return date?{date,prayer:{key,label:key},dateKey:day.dateKey}:null;
    }).filter(Boolean)).sort((a,b)=>a.date-b.date);
  }
  function prayerAlarmsFromDays(days,timeZone,now){
    const stamp=now instanceof Date?now.getTime():Number(now||Date.now());
    return prayerEventsFromDays(days,timeZone).filter(item=>item.date.getTime()>stamp).map(item=>({
      id:item.dateKey+":"+item.prayer.key,title:item.prayer.label,triggerAtMillis:item.date.getTime()
    }));
  }
  return{parseClock,dateKeyParts,addDaysToDateKey,dateKeyFromGregorian,dateKeyInTimezone,zonedDateTime,formatTime,buildPrayerWindows,findActivePrayerWindow,prayerEventsFromDays,prayerAlarmsFromDays};
});