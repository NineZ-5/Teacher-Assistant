/* ═══════════════════════════════════════════════════════════
   src/calendar.js — إدارة وعرض التقويم والمواعيد
   ═══════════════════════════════════════════════════════════ */

import { toDateISO, escapeHtml, escapeAttr, showNotify, genId } from './utils.js';
import { data, saveData, saveDataAsync, queueDelete } from './storage.js';
import { getTeacherTimezone, convertTimeBetweenTimezones, getTimezoneOffsetMinutes } from './timezone.js';

export var calendarViewDate = new Date();
export var currentCalendarView = 'monthly';

function svgIcon(name, size){
  if (typeof window.svgIcon === 'function') return window.svgIcon(name, size);
  var c = (window.SVG_ICONS && window.SVG_ICONS[name]) || '';
  size = size || (window.ICON_SIZES && window.ICON_SIZES.md) || 16;
  var sw = (size <= 14) ? 1.75 : 2;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0">'+c+'</svg>';
}

export function formatMobileTime(time24){
  if (!time24) return '';
  var parts = String(time24).split(':');
  if (parts.length < 2) return time24;
  var h = String(parseInt(parts[0], 10));
  var m = parts[1];
  return (m === '00') ? h : (h + ':' + m);
}

export function shortGroupName(name){
  if (!name) return '';
  return String(name).trim().replace(/^(أسرة|مجموعة|جروب|فريق)\s+/i, '');
}

export function getPendingCount(days){
  var count = 0;
  var now = new Date();
  for (var d = 0; d < days; d++){
    var pd = new Date(now);
    pd.setDate(pd.getDate() - d);
    pd.setHours(0,0,0,0);
    getOccurrencesForDate(pd).forEach(function(o){ if (o.status === 'pending') count++; });
  }
  return count;
}

export function getOccurrencesForDate(dateObj){
  var dateISO = toDateISO(dateObj);
  var day = dateObj.getDay();
  var res = [];
  var tTZ = getTeacherTimezone();
  var today = new Date(); today.setHours(0,0,0,0);
  var cD = new Date(dateObj); cD.setHours(0,0,0,0);
  var isPast = cD < today;
  data.groups.forEach(function(g){
    if(!g.schedule) return;
    g.schedule.forEach(function(rule){
      if(rule.dayOfWeek !== day) return;
      var cancel = data.appointments.find(function(a){ return a.groupId === g.id && a.date === dateISO && a.type === 'cancel' && a.ruleId === rule.id; });
      var del = data.appointments.find(function(a){ return a.groupId === g.id && a.date === dateISO && a.type === 'delete' && a.ruleId === rule.id; });
      if(del) return;
      var s = data.sessions.find(function(x){ return x.groupId === g.id && x.date === dateISO; });
      if(!s && rule.createdAt && dateISO < rule.createdAt) return;
      var st;
      if(cancel) st = 'cancelled';
      else if(s) st = 'completed';
      else if(isPast) st = 'pending';
      else st = 'upcoming';
      res.push({ groupId: g.id, groupName: g.name, time: rule.time, ruleId: rule.id, status: st, sessionId: s ? s.id : null, teacherTZ: tTZ, studentTZ: g.timezone || tTZ, dateISO: dateISO });
    });
  });
  data.appointments.filter(function(a){ return a.type === 'extra' && a.date === dateISO; }).forEach(function(ex){
    var g = data.groups.find(function(x){ return x.id === ex.groupId; }); if(!g) return;
    var s = data.sessions.find(function(x){ return x.groupId === g.id && x.date === dateISO; });
    var st; if(s) st = 'completed'; else if(isPast) st = 'pending'; else st = 'upcoming';
    res.push({ groupId: g.id, groupName: g.name, time: ex.time, ruleId: null, extraId: ex.id, status: st, sessionId: s ? s.id : null, teacherTZ: tTZ, studentTZ: g.timezone || tTZ, dateISO: dateISO, isExtra: true });
  });
  res.sort(function(a,b){ return a.time.localeCompare(b.time); });
  return res;
}

export function renderCalendar(){
  var b = document.getElementById('calendarBody'); if(!b) return;
  if(!currentCalendarView) currentCalendarView = 'monthly';
  document.querySelectorAll('.cal-view-btn').forEach(function(x){ x.classList.toggle('active', x.dataset.view === currentCalendarView); });
  if(currentCalendarView === 'monthly') renderCalendarMonthlyView(b);
  else if(currentCalendarView === 'weekly') renderCalendarWeeklyView(b);
  else renderCalendarListView(b);
}

export function renderCalendarMonthlyView(body){
  var title = document.getElementById('calendarTitle');
  var y = calendarViewDate.getFullYear();
  var m = calendarViewDate.getMonth();
  var monthNames = window.MONTH_NAMES || ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  if(title) title.textContent = monthNames[m] + ' ' + y;
  var first = new Date(y, m, 1);
  var start = new Date(first); start.setDate(start.getDate() - start.getDay());
  var html = '<div class="cal-grid">';
  dayNames.forEach(function(d){ html += '<div class="cal-header-day">' + d + '</div>'; });
  var today = new Date(); today.setHours(0,0,0,0);
  var cursor = new Date(start);
  for(var w = 0; w < 6; w++){
    for(var d = 0; d < 7; d++){
      var isOM = cursor.getMonth() !== m;
      var isToday = cursor.toDateString() === today.toDateString();
      var cursorISO = toDateISO(cursor);
      var occs = isOM ? [] : getOccurrencesForDate(cursor);
      var hasLessons = occs.length > 0;
      var cls = 'cal-cell';
      if(isOM) cls += ' other-month';
      if(isToday) cls += ' today';
      if(hasLessons && !isOM) cls += ' has-lessons';
      var clickAttr = (hasLessons && !isOM) ? ' onclick="calendarCellClick(\'' + cursorISO + '\')"' : '';
      html += '<div class="' + cls + '"' + clickAttr + '>';
      html += '<div class="cal-day-num">' + cursor.getDate() + '</div>';
      if(!isOM && hasLessons){
        // ═══ سطح المكتب: نص كامل ═══
        occs.forEach(function(o){
          html += '<div class="cal-occ ' + o.status + '">' + escapeHtml(o.groupName.substring(0, 12)) + ' · ' + escapeHtml(o.time) + '</div>';
        });
        // ═══ الهاتف: حتى حصتان + "＋N" ═══
        var mobileShow = Math.min(occs.length, 2);
        var mobileRemaining = occs.length - mobileShow;
        html += '<div class="cal-mobile-lessons">';
        for (var mi = 0; mi < mobileShow; mi++){
          var mo = occs[mi];
          var mt = formatMobileTime(mo.time);
          var mn = shortGroupName(mo.groupName);
          html += '<div class="cal-m-lesson ' + mo.status + '">' + escapeHtml(mt) + ' ' + escapeHtml(mn) + '</div>';
        }
        if (mobileRemaining > 0){
          html += '<div class="cal-m-more">+' + mobileRemaining + '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  html += '</div>';
  body.innerHTML = html;
}

export function calendarCellClick(dateISO){
  showDayDetails(dateISO);
}

export function showDayDetails(dateISO){
  var d = new Date(dateISO + 'T00:00:00');
  var dateDisplay = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var dayName = dayNames[d.getDay()];
  var occs = getOccurrencesForDate(d);
  if(!occs.length){
    showNotify('لا حصص في هذا اليوم');
    return;
  }
  var statusMeta = {
    upcoming: { label: 'قادمة', icon: 'clock' },
    pending: { label: 'بدون تقرير', icon: 'alert-triangle' },
    completed: { label: 'مكتملة', icon: 'check-circle' },
    cancelled: { label: 'ملغاة', icon: 'x-circle' }
  };
  var body = '<div class="day-details-list">';
  occs.forEach(function(o){
    var meta = statusMeta[o.status] || statusMeta.upcoming;
    var actions = '';
    if(o.status === 'upcoming' || o.status === 'pending'){
      actions = '<button class="btn btn-primary btn-sm" onclick="closeGenericModal();startLessonFromCalendar(\'' + o.groupId + '\',\'' + o.dateISO + '\',\'' + o.time + '\')">' + svgIcon('edit-3', 14) + ' فتح</button>'
        + '<button class="btn btn-secondary btn-sm" onclick="closeGenericModal();showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')">' + svgIcon('more-horizontal', 14) + '</button>';
    } else if(o.status === 'completed' && o.sessionId){
      actions = '<button class="btn btn-primary btn-sm" onclick="closeGenericModal();viewSession(\'' + o.sessionId + '\')">' + svgIcon('search', 14) + ' عرض التقرير</button>';
    } else {
      actions = '<button class="btn btn-secondary btn-sm" onclick="closeGenericModal();showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')">' + svgIcon('more-horizontal', 14) + ' تفاصيل</button>';
    }
    body += '<div class="day-detail-item">'
      + '<div class="dd-header">'
      + '<span class="dd-time">' + svgIcon('clock', 14) + ' ' + escapeHtml(o.time) + '</span>'
      + '<span class="dd-group">' + escapeHtml(o.groupName) + '</span>'
      + '<span class="dd-status ' + o.status + '">' + svgIcon(meta.icon, 14) + ' ' + meta.label + '</span>'
      + '</div>'
      + '<div class="dd-actions">' + actions + '</div>'
      + '</div>';
  });
  body += '</div>';
  body += '<div class="day-detail-extra" style="margin-top:12px"><button onclick="closeGenericModal();addExtraAppointmentPromptForDate(\'' + dateISO + '\')">' + svgIcon('plus', 14) + ' إضافة حصة استثنائية في هذا اليوم</button></div>';
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal(svgIcon('calendar', 20) + ' ' + dayName + '، ' + dateDisplay, body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
  }
}

export function addExtraAppointmentPromptForDate(dateISO){
  if(!data.groups.length){ showNotify('لا توجد مجموعات'); return; }
  var opts = data.groups.map(function(g){ return '<option value="'+g.id+'">'+escapeHtml(g.name)+'</option>'; }).join('');
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal('حصة استثنائية',
      '<div class="form-field"><label>المجموعة</label><select id="extraApptGroupId">'+opts+'</select></div>'
      +'<div class="form-field"><label>الساعة</label><input type="time" id="extraApptTime" value="18:00"></div>',
      '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveExtraAppointmentFromDay(\'' + dateISO + '\')">' + svgIcon('save', 14) + ' حفظ</button>');
  }
}

export function saveExtraAppointmentFromDay(dateISO){
  var groupId = document.getElementById('extraApptGroupId').value;
  var time = document.getElementById('extraApptTime').value;
  if(!groupId || !time){ showNotify('أكمل البيانات'); return; }
  if(!data.appointments) data.appointments = [];
  var conflict = data.appointments.find(function(a){ return a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'extra'; });
  if(conflict){ showNotify('موجودة بالفعل'); return; }
  data.appointments.push({ id: genId(), groupId: groupId, date: dateISO, time: time, ruleId: null, type: 'extra' });
  saveData();
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  showNotify('تمت الإضافة');
  renderCalendar();
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
}

export function renderCalendarWeeklyView(body){
  var ref = new Date(calendarViewDate); ref.setHours(0,0,0,0);
  var ws = new Date(ref); ws.setDate(ws.getDate() - ws.getDay());
  var we = new Date(ws); we.setDate(we.getDate() + 6);
  var title = document.getElementById('calendarTitle');
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  if(title) title.textContent = 'أسبوع ' + ws.getDate() + '/' + (ws.getMonth()+1) + ' — ' + we.getDate() + '/' + (we.getMonth()+1) + '/' + we.getFullYear();
  var today = new Date(); today.setHours(0,0,0,0);
  var html = '<div class="cal-weekly">';
  for(var i=0; i<7; i++){
    var day = new Date(ws); day.setDate(day.getDate() + i);
    var isToday = day.toDateString() === today.toDateString();
    var isPast = day < today && !isToday;
    var cls = 'cal-weekly-day';
    if(isToday) cls += ' today';
    if(isPast) cls += ' past';
    html += '<div class="' + cls + '"><div class="cal-weekly-day-header">' + dayNames[day.getDay()] + '<span class="date">' + day.getDate() + '/' + (day.getMonth()+1) + '</span></div>';
    var occs = getOccurrencesForDate(day);
    if(!occs.length){
      html += '<div class="cal-week-empty">—</div>';
    } else {
      occs.forEach(function(o){
        var mt = formatMobileTime(o.time);
        var mn = shortGroupName(o.groupName);
        html += '<div class="cal-week-occ ' + o.status + '" onclick="showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')">' + escapeHtml(mt) + ' · ' + escapeHtml(mn) + '</div>';
      });
    }
    html += '</div>';
  }
  html += '</div>'; body.innerHTML = html;
}

export function renderCalendarListView(body){
  var sd = new Date(calendarViewDate); sd.setHours(0,0,0,0);
  var days = 14;
  var ed = new Date(sd); ed.setDate(ed.getDate() + days - 1);
  var title = document.getElementById('calendarTitle');
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  if(title) title.textContent = 'الحصص القادمة (' + sd.getDate() + '/' + (sd.getMonth()+1) + ' — ' + ed.getDate() + '/' + (ed.getMonth()+1) + ')';
  var statusMeta = {
    upcoming: { label: 'قادمة', icon: 'clock', color: 'var(--accent-blue)' },
    pending: { label: 'معلقة', icon: 'alert-triangle', color: 'var(--accent-amber)' },
    completed: { label: 'مكتملة', icon: 'check-circle', color: 'var(--accent-green)' },
    cancelled: { label: 'ملغاة', icon: 'x-circle', color: 'var(--accent-red)' }
  };
  var html = '<div class="cal-list">'; var has = false;
  var today = new Date(); today.setHours(0,0,0,0);
  for(var i=0; i<days; i++){
    var day = new Date(sd); day.setDate(day.getDate() + i);
    var occs = getOccurrencesForDate(day);
    if(!occs.length) continue;
    has = true;
    var isToday = day.toDateString() === today.toDateString();
    html += '<div class="cal-list-day-group"><div class="cal-list-day-title">' + svgIcon('calendar', 14) + ' ' + dayNames[day.getDay()] + ' — ' + day.getDate() + '/' + (day.getMonth()+1) + '/' + day.getFullYear() + (isToday ? ' (اليوم)' : '') + '</div>';
    occs.forEach(function(o){
      var meta = statusMeta[o.status] || statusMeta.upcoming;
      html += '<div class="cal-list-item" onclick="showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')"><span class="cal-list-item-time">' + escapeHtml(o.time) + '</span><span class="cal-list-item-name">' + escapeHtml(o.groupName) + '</span><span class="cal-list-item-status" style="color:' + meta.color + ';background:rgba(0,0,0,.1)">' + svgIcon(meta.icon, 12) + ' ' + meta.label + '</span></div>';
    });
    html += '</div>';
  }
  if(!has) html += '<div class="home-empty-elegant" style="margin-top:12px">'
  + '<div class="he-icon">' + svgIcon('calendar', 24) + '</div>'
  + '<div class="he-title">لا توجد حصص في هذه الفترة</div>'
  + '<div class="he-sub">جرّب السابق أو التالي للتنقل</div>'
  + '</div>';
  html += '</div>'; body.innerHTML = html;
}

export function calendarNavigate(dir){
  if(currentCalendarView === 'monthly') calendarViewDate.setMonth(calendarViewDate.getMonth() + dir);
  else if(currentCalendarView === 'weekly') calendarViewDate.setDate(calendarViewDate.getDate() + dir*7);
  else calendarViewDate.setDate(calendarViewDate.getDate() + dir*14);
  renderCalendar();
}

export function switchCalendarView(view){
  currentCalendarView = view;
  renderCalendar();
}

export function showOccurrenceDetails(dateISO, groupId, time){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  var tTZ = getTeacherTimezone(); var sTZ = g.timezone || tTZ;
  var sTime = convertTimeBetweenTimezones(dateISO, time, tTZ, sTZ);
  var dO = new Date(dateISO + 'T00:00:00');
  var dateDisplay = dO.getDate() + '/' + (dO.getMonth()+1) + '/' + dO.getFullYear();
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var occs = getOccurrencesForDate(dO);
  var occ = occs.find(function(o){ return o.groupId === groupId && o.time === time; });
  var st = occ ? occ.status : 'upcoming';
  var sid = occ ? occ.sessionId : null;
  var isEx = occ ? !!occ.isExtra : false;
  var exId = occ ? occ.extraId : null;
  var rid = occ ? occ.ruleId : null;
  var statusMeta = {
    upcoming: { label: 'قادمة', icon: 'clock', color: 'var(--accent-blue)' },
    pending: { label: 'بانتظار التقرير', icon: 'alert-triangle', color: 'var(--accent-amber)' },
    completed: { label: 'مكتملة', icon: 'check-circle', color: 'var(--accent-green)' },
    cancelled: { label: 'ملغاة', icon: 'x-circle', color: 'var(--accent-red)' }
  };
  var meta = statusMeta[st] || statusMeta.upcoming;
  var body = '<div style="margin-bottom:10px;font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('folder-open', 16) + ' ' + escapeHtml(g.name) + '</div>'
    + '<div style="margin-bottom:6px;display:flex;align-items:center;gap:6px">' + svgIcon('calendar', 14) + ' ' + dayNames[dO.getDay()] + '، ' + dateDisplay + '</div>'
    + '<div style="margin-bottom:6px;display:flex;align-items:center;gap:6px">' + svgIcon('clock', 14) + ' ' + escapeHtml(time) + ' بتوقيتك</div>';
  if(sTZ !== tTZ){
    var diff = getTimezoneOffsetMinutes(sTZ, dO) - getTimezoneOffsetMinutes(tTZ, dO);
    var absD = Math.abs(diff);
    var dh = Math.floor(absD/60); var dm = absD%60;
    var dS = (diff >= 0 ? '+' : '-') + (dh > 0 ? dh + ' س' : '') + (dm > 0 ? ' ' + dm + ' د' : '');
    body += '<div style="margin-bottom:6px;display:flex;align-items:flex-start;gap:6px">' + svgIcon('globe', 14) + '<div>' + escapeHtml(sTime) + ' بتوقيتهم (' + escapeHtml(sTZ) + ')<br><span style="color:var(--accent-blue);font-size:.85rem">الفارق: ' + dS + '</span></div></div>';
  }
  if(isEx) body += '<div style="margin-bottom:6px;font-size:.82rem;color:var(--accent-green);display:flex;align-items:center;gap:5px">' + svgIcon('plus', 12) + ' حصة استثنائية</div>';
  body += '<div style="margin-bottom:12px;font-weight:700;color:' + meta.color + ';display:flex;align-items:center;gap:6px">' + svgIcon(meta.icon, 14) + ' ' + meta.label + '</div>';
  if(g.link && g.link.trim()) body += '<div style="margin-bottom:12px"><button onclick="closeGenericModal();openInAppBrowser(\'' + escapeAttr(g.link) + '\')" style="background:var(--accent-blue);color:#fff;padding:10px 18px;border-radius:8px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:.9rem;display:inline-flex;align-items:center;gap:6px">' + svgIcon('external-link', 14) + ' دخول الحصة</button></div>';
  var footer = '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>';
  if(st === 'upcoming' || st === 'pending'){
    footer += '<button class="btn btn-primary" style="width:auto;margin:0" onclick="startLessonFromCalendar(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\')">' + svgIcon('edit-3', 14) + ' فتح الحصة</button>';
    if(isEx) footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',null,true,\'' + exId + '\')">' + svgIcon('trash-2', 12) + '</button>';
    else footer += '<button class="btn btn-secondary" style="width:auto;margin:0;color:var(--accent-amber);border-color:var(--accent-amber)" onclick="cancelOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\')">' + svgIcon('x-circle', 12) + ' إلغاء</button><button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\',false,null)">' + svgIcon('trash-2', 12) + '</button>';
  } else if(st === 'completed'){
    if(sid) footer += '<button class="btn btn-primary" style="width:auto;margin:0" onclick="closeGenericModal();viewSession(\'' + sid + '\')">' + svgIcon('search', 14) + ' عرض التقرير</button>';
    if(isEx) footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',null,true,\'' + exId + '\')">' + svgIcon('trash-2', 12) + '</button>';
    else footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\',false,null)">' + svgIcon('trash-2', 12) + '</button>';
  } else if(st === 'cancelled'){
    footer += '<button class="btn btn-secondary" style="width:auto;margin:0;color:var(--accent-green);border-color:var(--accent-green)" onclick="restoreOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\')">' + svgIcon('refresh', 14) + ' استعادة</button>';
    if(isEx) footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',null,true,\'' + exId + '\')">' + svgIcon('trash-2', 12) + '</button>';
    else footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\',false,null)">' + svgIcon('trash-2', 12) + '</button>';
  }
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal('تفاصيل الحصة', body, footer);
  }
}

export function startLessonFromCalendar(groupId, dateISO, time){
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  if (typeof window.pickGroup === 'function') window.pickGroup(groupId);
  setTimeout(function(){
    var rDate = document.getElementById('reportDate');
    if (rDate) rDate.value = dateISO;
    var curMonth = dateISO.slice(0, 7); /* YYYY-MM */
    var prevCount = data.sessions.filter(function(s){
      return s.groupId === groupId
        && s.date
        && s.date.slice(0, 7) === curMonth
        && s.date <= dateISO;
    }).length;
    var names = [
      'الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة',
      'الحادية عشرة','الثانية عشرة','الثالثة عشرة','الرابعة عشرة','الخامسة عشرة','السادسة عشرة','السابعة عشرة','الثامنة عشرة','التاسعة عشرة','العشرون',
      'الحادية والعشرون','الثانية والعشرون','الثالثة والعشرون','الرابعة والعشرون','الخامسة والعشرون','السادسة والعشرون','السابعة والعشرون','الثامنة والعشرون','التاسعة والعشرون','الثلاثون'
    ];
    var idx = Math.min(prevCount, names.length - 1);
    var ls = document.getElementById('lessonOrder');
    if(ls) ls.value = names[idx];
    if (typeof window.saveDraft === 'function') window.saveDraft();
    if (typeof window.switchTab === 'function') window.switchTab('lesson');
    if (typeof window.showPreviousLesson === 'function') window.showPreviousLesson(groupId, dateISO);
    showNotify('تم تحميل الحصة ' + names[idx]);
  }, 100);
}

export function cancelOccurrence(groupId, dateISO, time, ruleId){
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  if(!confirm('إلغاء هذه الحصة؟')) return;
  if(!data.appointments) data.appointments = [];
  var ex = data.appointments.find(function(a){ return a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'cancel'; });
  if(ex){ showNotify('ملغاة بالفعل'); return; }
  data.appointments.push({ id: genId(), groupId: groupId, date: dateISO, time: time, ruleId: ruleId, type: 'cancel' });
  saveData(); renderCalendar();
  showNotify('تم الإلغاء');
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
}

export function restoreOccurrence(groupId, dateISO, time, ruleId){
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  if(!data.appointments) return;
  data.appointments = data.appointments.filter(function(a){ return !(a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'cancel'); });
  saveData(); renderCalendar();
  showNotify('تم الاستعادة');
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
}

export async function deleteOccurrence(groupId, dateISO, time, ruleId, isEx, exId){
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  if(!confirm(isEx ? 'حذف هذه الحصة الاستثنائية؟' : 'حذف هذه الحصة من التقويم؟')) return;
  if(!data.appointments) data.appointments = [];
  if(isEx && exId){
    queueDelete('appointments', exId);
    data.appointments = data.appointments.filter(function(a){ return a.id !== exId; });
  }
  else {
    data.appointments = data.appointments.filter(function(a){ return !(a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'cancel'); });
    data.appointments.push({ id: genId(), groupId: groupId, date: dateISO, time: time, ruleId: ruleId, type: 'delete' });
  }
  await saveDataAsync();
  if (typeof window.scheduleAutoSync === 'function') window.scheduleAutoSync();
  renderCalendar();
  showNotify('تم الحذف');
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
}

export function addExtraAppointmentPrompt(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  var today = new Date(); var dd = toDateISO(today);
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal('حصة استثنائية', '<div class="form-field"><label>التاريخ</label><input type="date" id="extraApptDate" value="' + dd + '"></div><div class="form-field"><label>الساعة</label><input type="time" id="extraApptTime" value="18:00"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveExtraAppointment(\'' + groupId + '\')">' + svgIcon('save', 14) + ' حفظ</button>');
  }
}

export function saveExtraAppointment(groupId){
  var date = document.getElementById('extraApptDate').value;
  var time = document.getElementById('extraApptTime').value;
  if(!date || !time){ showNotify('أدخل التاريخ والوقت'); return; }
  if(!data.appointments) data.appointments = [];
  var c = data.appointments.find(function(a){ return a.groupId === groupId && a.date === date && a.time === time && a.type === 'extra'; });
  if(c){ showNotify('موجودة بالفعل'); return; }
  data.appointments.push({ id: genId(), groupId: groupId, date: date, time: time, ruleId: null, type: 'extra' });
  saveData();
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  showNotify('تمت الإضافة');
  if (typeof window.currentViewGroupId !== 'undefined' && window.currentViewGroupId === groupId && typeof window.openGroupDetail === 'function') {
    window.openGroupDetail(groupId);
  }
  if (document.getElementById('tab-calendar') && document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
}

export function renderGroupExceptions(groupId){
  if(!data.appointments || !data.appointments.length) return '<div class="cfg-empty">لا توجد استثناءات</div>';
  var f = data.appointments.filter(function(a){ return a.groupId === groupId; });
  if(!f.length) return '<div class="cfg-empty">لا توجد استثناءات</div>';
  f.sort(function(a,b){ return (a.date + a.time).localeCompare(b.date + b.time); });
  var html = '';
  f.forEach(function(a){
    var isCancel = a.type === 'cancel';
    var isDelete = a.type === 'delete';
    var lbl = isCancel ? 'ملغاة' : (isDelete ? 'محذوفة' : 'استثنائية');
    var icon = isCancel ? 'x-circle' : (isDelete ? 'trash-2' : 'plus');
    var col = isCancel ? 'var(--accent-red)' : (isDelete ? 'var(--text-muted)' : 'var(--accent-green)');
    html += '<div class="sched-row"><div class="sched-row-info"><div class="sched-row-title" style="color:' + col + '">' + svgIcon(icon, 12) + ' ' + lbl + '</div><div class="sched-row-meta">' + svgIcon('calendar', 12) + ' ' + escapeHtml(a.date.split('-').reverse().join('/')) + ' — ' + svgIcon('clock', 12) + ' ' + escapeHtml(a.time) + '</div></div><button class="btn btn-danger btn-sm" onclick="removeAppointmentException(\'' + a.id + '\')">إزالة</button></div>';
  });
  return html;
}

export async function removeAppointmentException(id){
  if(!confirm('إزالة هذا الاستثناء؟')) return;
  queueDelete('appointments', id);
  data.appointments = (data.appointments || []).filter(function(a){ return a.id !== id; });
  await saveDataAsync();
  if (typeof window.scheduleAutoSync === 'function') window.scheduleAutoSync();
  if (typeof window.currentViewGroupId !== 'undefined' && window.currentViewGroupId && typeof window.openGroupDetail === 'function') {
    window.openGroupDetail(window.currentViewGroupId);
  }
  if (document.getElementById('tab-calendar') && document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
  showNotify('تمت الإزالة');
}

export function renderSchedule(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if(!g || !g.schedule || !g.schedule.length) return '<div class="cfg-empty">لا توجد مواعيد متكررة</div>';
  var tz = g.timezone || getTeacherTimezone();
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var html = '';
  g.schedule.forEach(function(r){
    html += '<div class="sched-row"><div class="sched-row-info"><div class="sched-row-title">' + svgIcon('calendar', 12) + ' كل ' + dayNames[r.dayOfWeek] + ' — ' + escapeHtml(r.time) + '</div><div class="sched-row-meta">' + svgIcon('globe', 12) + ' ' + escapeHtml(tz) + '</div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editSchedulePrompt(\''+groupId+'\',\''+r.id+'\')" title="تعديل">' + svgIcon('edit-3', 12) + '</button><button class="btn btn-danger btn-sm" onclick="deleteScheduleRule(\''+groupId+'\',\''+r.id+'\')" title="حذف">' + svgIcon('trash-2', 12) + '</button></div></div>';
  });
  return html;
}

export function addSchedulePrompt(groupId){
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var opts = dayNames.map(function(n, i){ return '<option value="'+i+'">'+n+'</option>'; }).join('');
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal('موعد متكرر', '<div class="form-field"><label>اليوم</label><select id="newSchedDay">'+opts+'</select></div><div class="form-field"><label>الساعة</label><input type="time" id="newSchedTime" value="18:00"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveScheduleRule(\''+groupId+'\', null)">' + svgIcon('save', 14) + ' حفظ</button>');
  }
}

export function editSchedulePrompt(groupId, ruleId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  var r = g.schedule.find(function(x){ return x.id === ruleId; }); if(!r) return;
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var opts = dayNames.map(function(n, i){ return '<option value="'+i+'"'+(i===r.dayOfWeek?' selected':'')+'>'+n+'</option>'; }).join('');
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal('تعديل الموعد', '<div class="form-field"><label>اليوم</label><select id="newSchedDay">'+opts+'</select></div><div class="form-field"><label>الساعة</label><input type="time" id="newSchedTime" value="'+escapeAttr(r.time)+'"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveScheduleRule(\''+groupId+'\', \''+ruleId+'\')">' + svgIcon('save', 14) + ' حفظ</button>');
  }
}

export function saveScheduleRule(groupId, ruleId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  if(!g.schedule) g.schedule = [];
  var d = parseInt(document.getElementById('newSchedDay').value);
  var t = document.getElementById('newSchedTime').value;
  if(!t || !/^\d{2}:\d{2}$/.test(t)){ showNotify('وقت غير صالح'); return; }
  if(ruleId){
    var r = g.schedule.find(function(x){ return x.id === ruleId; }); if(!r) return;
    r.dayOfWeek = d; r.time = t;
  } else g.schedule.push({ id: genId(), dayOfWeek: d, time: t, createdAt: toDateISO(new Date()) });
  saveData();
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  var c = document.getElementById('groupScheduleContainer'); if(c) c.innerHTML = renderSchedule(groupId);
  showNotify('تم الحفظ');
  if (document.getElementById('tab-calendar') && document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
}

export async function deleteScheduleRule(groupId, ruleId){
  if(!confirm('حذف هذا الموعد؟')) return;
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g || !g.schedule) return;
  g.schedule = g.schedule.filter(function(r){ return r.id !== ruleId; });
  (data.appointments || []).filter(function(a){ return a.ruleId === ruleId; }).forEach(function(a){ queueDelete('appointments', a.id); });
  data.appointments = (data.appointments || []).filter(function(a){ return a.ruleId !== ruleId; });
  await saveDataAsync();
  if (typeof window.scheduleAutoSync === 'function') window.scheduleAutoSync();
  var c = document.getElementById('groupScheduleContainer'); if(c) c.innerHTML = renderSchedule(groupId);
  var e = document.getElementById('groupExceptionsContainer'); if(e) e.innerHTML = renderGroupExceptions(groupId);
  showNotify('تم الحذف');
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    calendarViewDate,
    currentCalendarView,
    formatMobileTime,
    shortGroupName,
    getPendingCount,
    getOccurrencesForDate,
    renderCalendar,
    renderCalendarMonthlyView,
    renderCalendarWeeklyView,
    renderCalendarListView,
    calendarNavigate,
    switchCalendarView,
    calendarCellClick,
    showDayDetails,
    showOccurrenceDetails,
    startLessonFromCalendar,
    cancelOccurrence,
    restoreOccurrence,
    deleteOccurrence,
    addExtraAppointmentPrompt,
    addExtraAppointmentPromptForDate,
    saveExtraAppointment,
    saveExtraAppointmentFromDay,
    addSchedulePrompt,
    editSchedulePrompt,
    saveScheduleRule,
    deleteScheduleRule,
    renderSchedule,
    renderGroupExceptions,
    removeAppointmentException
  });
}
