/* ═══════════════════════════════════════════════════════════
   src/timezone.js — معالجة التوقيت والمناطق الزمنية
   ═══════════════════════════════════════════════════════════ */

export function getTeacherTimezone(){
  var d = window.data;
  if (d && d.settings && d.settings.teacherTimezone) return d.settings.teacherTimezone;
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e){ return ''; }
}

export function getTimezoneOffsetMinutes(tz, date){
  try {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    var p = dtf.formatToParts(date);
    var o = {}; p.forEach(function(x){ o[x.type] = x.value; });
    var u = Date.UTC(parseInt(o.year), parseInt(o.month)-1, parseInt(o.day), parseInt(o.hour), parseInt(o.minute), parseInt(o.second));
    return Math.round((u - date.getTime()) / 60000);
  } catch(e){ return 0; }
}

export function convertTimeBetweenTimezones(dateISO, timeHM, fromTZ, toTZ){
  if(!fromTZ || !toTZ || fromTZ === toTZ) return timeHM;
  try {
    var p = dateISO.split('-').map(Number);
    var tm = timeHM.split(':').map(Number);
    var dO = new Date(p[0], p[1]-1, p[2], tm[0], tm[1], 0);
    var fO = getTimezoneOffsetMinutes(fromTZ, dO);
    var tO = getTimezoneOffsetMinutes(toTZ, dO);
    var diff = tO - fO;
    var total = tm[0]*60 + tm[1] + diff;
    var nh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
    var nm = ((total % 60) + 60) % 60;
    return String(nh).padStart(2,'0') + ':' + String(nm).padStart(2,'0');
  } catch(e){ return timeHM; }
}

export function formatUtcOffset(tz, date){
  try {
    var off = getTimezoneOffsetMinutes(tz, date || new Date());
    var sign = off >= 0 ? '+' : '-';
    var a = Math.abs(off);
    var h = Math.floor(a/60);
    var m = a%60;
    return 'UTC' + sign + h + (m>0?':'+String(m).padStart(2,'0'):'');
  } catch(e){ return ''; }
}

export function isDSTActive(tz){
  try {
    var now = new Date();
    var jan = new Date(now.getFullYear(),0,15);
    var jul = new Date(now.getFullYear(),6,15);
    var jO = getTimezoneOffsetMinutes(tz,jan);
    var jlO = getTimezoneOffsetMinutes(tz,jul);
    if (jO === jlO) return false;
    var maxO = Math.max(jO,jlO);
    return getTimezoneOffsetMinutes(tz,now) === maxO;
  } catch(e){ return false; }
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    getTeacherTimezone,
    getTimezoneOffsetMinutes,
    convertTimeBetweenTimezones,
    formatUtcOffset,
    isDSTActive
  });
}
