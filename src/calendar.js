/* ═══════════════════════════════════════════════════════════
   src/calendar.js — إدارة وعرض التقويم والمواعيد
   ═══════════════════════════════════════════════════════════ */

import { toDateISO, fmtDate, escapeHtml, escapeAttr, showNotify, genId, normalize } from './utils.js';
import { data, saveData, saveDataAsync, queueDelete } from './storage.js';
import { getTeacherTimezone, convertTimeBetweenTimezones, getTimezoneOffsetMinutes, formatTimeDisplay } from './timezone.js';

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
  return formatTimeDisplay(time24, true);
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

export function _ruleMatchesDate(rule, dateObj, dateISO, daySessions){
  if (!rule) return false;
  var day = dateObj.getDay();
  var rep = rule.repeat || 'weekly';
  var ruleStart = rule.startDate || rule.createdAt || null;
  if (rule.endDate && dateISO > rule.endDate) return false;
  if (ruleStart && dateISO < ruleStart) {
    var hasRuleSession = Array.isArray(daySessions) && daySessions.some(function(x){
      return x.ruleId === rule.id;
    });
    if (!hasRuleSession) return false;
  }
  if (rep === 'weekly') {
    var days = (Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length) ? rule.daysOfWeek : [rule.dayOfWeek];
    return days.indexOf(day) !== -1;
  }
  if (rep === 'biweekly') {
    var bDays = (Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length) ? rule.daysOfWeek : [rule.dayOfWeek];
    if (bDays.indexOf(day) === -1) return false;
    var refStart = ruleStart ? new Date(ruleStart + 'T00:00:00') : new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    var wsRef = new Date(refStart.getFullYear(), refStart.getMonth(), refStart.getDate() - refStart.getDay());
    var wsCur = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() - dateObj.getDay());
    var diffWeeks = Math.round((wsCur - wsRef) / (7 * 86400000));
    return diffWeeks >= 0 && (diffWeeks % 2) === 0;
  }
  if (rep === 'daily') {
    var step = Math.max(1, parseInt(rule.interval, 10) || 1);
    var refD = ruleStart ? new Date(ruleStart + 'T00:00:00') : new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    var curD = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    var diffDays = Math.round((curD - refD) / 86400000);
    return diffDays >= 0 && (diffDays % step) === 0;
  }
  if (rep === 'monthly') {
    var refM = ruleStart ? new Date(ruleStart + 'T00:00:00') : dateObj;
    var targetDom = parseInt(rule.monthlyDay, 10) || refM.getDate();
    var lastDayOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
    return dateObj.getDate() === Math.min(targetDom, lastDayOfMonth);
  }
  return false;
}

export function getOccurrencesForDate(dateObj){
  var dateISO = toDateISO(dateObj);
  var res = [];
  var tTZ = getTeacherTimezone();
  var today = new Date(); today.setHours(0,0,0,0);
  var cD = new Date(dateObj); cD.setHours(0,0,0,0);
  var isPast = cD < today;
  var activeCountByGroup = {};
  data.groups.forEach(function(g){
    var daySessions = data.sessions.filter(function(x){ return x.groupId === g.id && x.date === dateISO; });
    var activeRules = (g.schedule || []).filter(function(rule){
      if(!_ruleMatchesDate(rule, dateObj, dateISO, daySessions)) return false;
      var del = data.appointments.find(function(a){ return a.groupId === g.id && a.date === dateISO && a.type === 'delete' && a.ruleId === rule.id; });
      if(del) return false;
      return true;
    });
    var extraCount = data.appointments.filter(function(a){ return a.type === 'extra' && a.date === dateISO && a.groupId === g.id; }).length;
    var activeOccCount = activeRules.length + extraCount;
    activeCountByGroup[g.id] = activeOccCount;

    if(!g.schedule) return;
    g.schedule.forEach(function(rule){
      if(!_ruleMatchesDate(rule, dateObj, dateISO, daySessions)) return;
      var cancel = data.appointments.find(function(a){ return a.groupId === g.id && a.date === dateISO && a.type === 'cancel' && a.ruleId === rule.id; });
      var del = data.appointments.find(function(a){ return a.groupId === g.id && a.date === dateISO && a.type === 'delete' && a.ruleId === rule.id; });
      if(del) return;
      var s = daySessions.find(function(x){ return x.ruleId === rule.id; });
      if(!s) s = daySessions.find(function(x){ return x.time && x.time === rule.time; });
      if(!s && activeOccCount === 1) s = daySessions.find(function(x){ return !x.time && !x.ruleId && !x.extraId; });
      var st;
      if(cancel) st = 'cancelled';
      else if(s) st = 'completed';
      else if(isPast) st = 'pending';
      else st = 'upcoming';
      var studentIds = (Array.isArray(rule.studentIds) && rule.studentIds.length) ? rule.studentIds.slice() : null;
      res.push({ groupId: g.id, groupName: g.name, time: rule.time, ruleId: rule.id, status: st, sessionId: s ? s.id : null, teacherTZ: tTZ, studentTZ: g.timezone || tTZ, dateISO: dateISO, studentIds: studentIds });
    });
  });
  data.appointments.filter(function(a){ return a.type === 'extra' && a.date === dateISO; }).forEach(function(ex){
    var g = data.groups.find(function(x){ return x.id === ex.groupId; }); if(!g) return;
    var daySessions = data.sessions.filter(function(x){ return x.groupId === g.id && x.date === dateISO; });
    var activeOccCount = activeCountByGroup[g.id] || 1;
    var s = daySessions.find(function(x){ return x.extraId === ex.id; });
    if(!s) s = daySessions.find(function(x){ return x.time && x.time === ex.time; });
    if(!s && activeOccCount === 1) s = daySessions.find(function(x){ return !x.time && !x.ruleId && !x.extraId; });
    var st; if(s) st = 'completed'; else if(isPast) st = 'pending'; else st = 'upcoming';
    var studentIds = (Array.isArray(ex.studentIds) && ex.studentIds.length) ? ex.studentIds.slice() : null;
    res.push({ groupId: g.id, groupName: g.name, time: ex.time, ruleId: null, extraId: ex.id, status: st, sessionId: s ? s.id : null, teacherTZ: tTZ, studentTZ: g.timezone || tTZ, dateISO: dateISO, isExtra: true, studentIds: studentIds });
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
      else cls += ' cal-clickable';
      if(isToday) cls += ' today';
      if(hasLessons && !isOM) cls += ' has-lessons';
      var clickAttr = !isOM ? (' onclick="calendarCellClick(\'' + cursorISO + '\')"') : '';
      html += '<div class="' + cls + '"' + clickAttr + '>';
      html += '<div class="cal-day-num">' + cursor.getDate() + '</div>';
      if(!isOM && hasLessons){
        // ═══ سطح المكتب: نص كامل ═══
        occs.forEach(function(o){
          html += '<div class="cal-occ ' + o.status + '">' + escapeHtml(o.groupName.substring(0, 12)) + ' · ' + escapeHtml(formatTimeDisplay(o.time)) + '</div>';
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

export function calendarGoToday(){
  calendarViewDate = new Date();
  renderCalendar();
  showNotify('📅 تم الانتقال إلى اليوم');
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
    var emptyBody = '<div class="home-empty-elegant" style="margin-bottom:12px">'
      + '<div class="he-icon">' + svgIcon('calendar', 24) + '</div>'
      + '<div class="he-title">لا توجد حصص في هذا اليوم</div>'
      + '<div class="he-sub">يمكنك جدولة حصة أو موعد متكرر مباشرة</div>'
      + '</div>'
      + '<div class="day-detail-extra"><button type="button" onclick="closeGenericModal();openQuickScheduleModal(\'' + dateISO + '\')">' + svgIcon('plus', 14) + ' جدولة موعد لهذا اليوم</button></div>';
    if (typeof window.openGenericModal === 'function') {
      window.openGenericModal(svgIcon('calendar', 20) + ' ' + dayName + '، ' + dateDisplay, emptyBody, '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
    }
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
        + '<button class="btn btn-secondary btn-sm" onclick="openReminderModal(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')" title="إرسال تذكير">' + svgIcon('bell', 14) + ' تذكير</button>'
        + '<button class="btn btn-secondary btn-sm" onclick="closeGenericModal();showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')">' + svgIcon('more-horizontal', 14) + '</button>';
    } else if(o.status === 'completed' && o.sessionId){
      actions = '<button class="btn btn-primary btn-sm" onclick="closeGenericModal();viewSession(\'' + o.sessionId + '\')">' + svgIcon('search', 14) + ' عرض التقرير</button>';
    } else {
      actions = '<button class="btn btn-secondary btn-sm" onclick="closeGenericModal();showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')">' + svgIcon('more-horizontal', 14) + ' تفاصيل</button>';
    }
    body += '<div class="day-detail-item">'
      + '<div class="dd-header">'
      + '<span class="dd-time">' + svgIcon('clock', 14) + ' ' + escapeHtml(formatTimeDisplay(o.time)) + '</span>'
      + '<span class="dd-group">' + escapeHtml(o.groupName) + '</span>'
      + '<span class="dd-status ' + o.status + '">' + svgIcon(meta.icon, 14) + ' ' + meta.label + '</span>'
      + '</div>'
      + '<div class="dd-actions">' + actions + '</div>'
      + '</div>';
  });
  body += '</div>';
  body += '<div class="day-detail-extra" style="margin-top:12px"><button type="button" onclick="closeGenericModal();openQuickScheduleModal(\'' + dateISO + '\')">' + svgIcon('plus', 14) + ' جدولة موعد في هذا اليوم</button></div>';
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal(svgIcon('calendar', 20) + ' ' + dayName + '، ' + dateDisplay, body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
  }
}

export function addExtraAppointmentPromptForDate(dateISO){
  openQuickScheduleModal(dateISO, null, null);
}

export function saveExtraAppointmentFromDay(dateISO){
  var groupId = document.getElementById('extraApptGroupId').value;
  var time = readTimePickerValue('extraApptTime');
  if(!groupId || !time){ showNotify('أكمل البيانات'); return; }
  if(!data.appointments) data.appointments = [];
  var conflict = data.appointments.find(function(a){ return a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'extra'; });
  if(conflict){ showNotify('موجودة بالفعل'); return; }
  var studentIds = readAppointmentStudentsPicker();
  data.appointments.push({ id: genId(), groupId: groupId, date: dateISO, time: time, ruleId: null, type: 'extra', studentIds: studentIds });
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
    var dayISO = toDateISO(day);
    html += '<div class="' + cls + '"><div class="cal-weekly-day-header cal-clickable" onclick="openQuickScheduleModal(\'' + dayISO + '\')" title="اضغط لإضافة موعد في هذا اليوم">' + dayNames[day.getDay()] + '<span class="date" style="display:flex;justify-content:center;align-items:center;gap:4px">' + day.getDate() + '/' + (day.getMonth()+1) + ' ' + svgIcon('plus', 11) + '</span></div>';
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
      html += '<div class="cal-list-item" onclick="showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')"><span class="cal-list-item-time">' + escapeHtml(formatTimeDisplay(o.time)) + '</span><span class="cal-list-item-name">' + escapeHtml(o.groupName) + '</span><span class="cal-list-item-status" style="color:' + meta.color + ';background:rgba(0,0,0,.1)">' + svgIcon(meta.icon, 12) + ' ' + meta.label + '</span></div>';
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
    + '<div style="margin-bottom:6px;display:flex;align-items:center;gap:6px">' + svgIcon('clock', 14) + ' ' + escapeHtml(formatTimeDisplay(time)) + ' بتوقيتك</div>';
  if(sTZ !== tTZ){
    var diff = getTimezoneOffsetMinutes(sTZ, dO) - getTimezoneOffsetMinutes(tTZ, dO);
    var absD = Math.abs(diff);
    var dh = Math.floor(absD/60); var dm = absD%60;
    var dS = (diff >= 0 ? '+' : '-') + (dh > 0 ? dh + ' س' : '') + (dm > 0 ? ' ' + dm + ' د' : '');
    body += '<div style="margin-bottom:6px;display:flex;align-items:flex-start;gap:6px">' + svgIcon('globe', 14) + '<div>' + escapeHtml(formatTimeDisplay(sTime)) + ' بتوقيتهم (' + escapeHtml(sTZ) + ')<br><span style="color:var(--accent-blue);font-size:.85rem">الفارق: ' + dS + '</span></div></div>';
  }
  var studentsLabel = 'كل طلاب المجموعة';
  if(occ && Array.isArray(occ.studentIds) && occ.studentIds.length){
    var matchedNames = occ.studentIds.map(function(sid){
      var stObj = (data.students || []).find(function(x){ return x.id === sid; });
      return stObj ? stObj.name : '';
    }).filter(Boolean);
    if(matchedNames.length) studentsLabel = matchedNames.join('، ');
  }
  body += '<div style="margin-bottom:6px;display:flex;align-items:flex-start;gap:6px">' + svgIcon('users', 14) + ' <span>الطلاب: ' + escapeHtml(studentsLabel) + '</span></div>';
  if(isEx) body += '<div style="margin-bottom:6px;font-size:.82rem;color:var(--accent-green);display:flex;align-items:center;gap:5px">' + svgIcon('plus', 12) + ' حصة استثنائية</div>';
  body += '<div style="margin-bottom:12px;font-weight:700;color:' + meta.color + ';display:flex;align-items:center;gap:6px">' + svgIcon(meta.icon, 14) + ' ' + meta.label + '</div>';
  if(g.link && g.link.trim()) body += '<div style="margin-bottom:12px"><button onclick="closeGenericModal();openInAppBrowser(\'' + escapeAttr(g.link) + '\')" style="background:var(--accent-blue);color:#fff;padding:10px 18px;border-radius:8px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:.9rem;display:inline-flex;align-items:center;gap:6px">' + svgIcon('external-link', 14) + ' دخول الحصة</button></div>';
  var footer = '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>';
  if(st === 'upcoming' || st === 'pending'){
    footer += '<button class="btn btn-primary" style="width:auto;margin:0" onclick="startLessonFromCalendar(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\')">' + svgIcon('edit-3', 14) + ' فتح الحصة</button>';
    footer += '<button type="button" class="btn btn-secondary" style="width:auto;margin:0" onclick="rescheduleOccurrencePrompt(\'' + dateISO + '\',\'' + groupId + '\',\'' + time + '\',' + (isEx ? 'true' : 'false') + ',\'' + (exId || '') + '\',\'' + (rid || '') + '\')">' + svgIcon('calendar-days', 14) + ' نقل</button>';
    footer += '<button class="btn btn-secondary" style="width:auto;margin:0" onclick="openReminderModal(\'' + dateISO + '\',\'' + groupId + '\',\'' + time + '\')">' + svgIcon('bell', 14) + ' تذكير</button>';
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

export function rescheduleOccurrencePrompt(dateISO, groupId, time, isEx, exId, ruleId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  var body = '<div style="padding:10px 12px;border-radius:10px;background:var(--card-secondary-bg);border:1px solid var(--card-border);margin-bottom:14px;font-size:.86rem">'
    + '<div style="font-weight:700;margin-bottom:4px">' + escapeHtml(g.name) + '</div>'
    + '<div style="color:var(--text-muted)">الموعد الحالي: ' + escapeHtml(fmtDate(dateISO)) + ' — ' + escapeHtml(formatTimeDisplay(time)) + '</div>'
    + '</div>'
    + '<div class="form-field"><label>التاريخ الجديد</label><input type="date" id="reschedNewDate" value="' + escapeAttr(dateISO) + '"></div>'
    + '<div class="form-field"><label>الوقت الجديد</label>' + buildTimePickerHTML('reschedNewTime', time) + '</div>';
  var footer = '<button type="button" class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
    + '<button type="button" class="btn btn-primary" style="width:auto;margin:0" onclick="saveRescheduleOccurrence(\'' + escapeAttr(dateISO) + '\',\'' + escapeAttr(groupId) + '\',\'' + escapeAttr(time) + '\',' + (isEx ? 'true' : 'false') + ',\'' + escapeAttr(exId || '') + '\',\'' + escapeAttr(ruleId || '') + '\')">' + svgIcon('save', 14) + ' حفظ النقل</button>';
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal(svgIcon('calendar-days', 18) + ' نقل / تأجيل الموعد', body, footer);
  }
}

export async function saveRescheduleOccurrence(oldDateISO, groupId, oldTime, isEx, exId, ruleId){
  var newDateEl = document.getElementById('reschedNewDate');
  var newDate = newDateEl ? newDateEl.value : '';
  var newTime = readTimePickerValue('reschedNewTime');
  if(!newDate || !newTime || !/^\d{2}:\d{2}$/.test(newTime)){
    showNotify('أدخل تاريخاً ووقتاً صالحين');
    return;
  }
  if(newDate === oldDateISO && newTime === oldTime){
    showNotify('اختر تاريخاً أو وقتاً مختلفاً عن الموعد الحالي');
    return;
  }
  if(!data.appointments) data.appointments = [];
  var conflict = data.appointments.find(function(a){
    return a.groupId === groupId && a.date === newDate && a.time === newTime && a.type === 'extra' && a.id !== exId;
  });
  if(conflict){
    showNotify('يوجد موعد استثنائي في هذا التاريخ والوقت بالفعل');
    return;
  }
  if(isEx && exId){
    var ex = data.appointments.find(function(a){ return a.id === exId; });
    if(!ex){ showNotify('تعذر العثور على الموعد'); return; }
    ex.date = newDate;
    ex.time = newTime;
  } else {
    var g = data.groups.find(function(x){ return x.id === groupId; });
    var rule = (g && g.schedule) ? g.schedule.find(function(r){ return r.id === ruleId; }) : null;
    var studentIds = (rule && Array.isArray(rule.studentIds) && rule.studentIds.length) ? rule.studentIds.slice() : null;
    data.appointments = data.appointments.filter(function(a){
      return !(a.groupId === groupId && a.date === oldDateISO && a.time === oldTime && a.type === 'cancel');
    });
    data.appointments.push({ id: genId(), groupId: groupId, date: oldDateISO, time: oldTime, ruleId: ruleId, type: 'delete' });
    data.appointments.push({ id: genId(), groupId: groupId, date: newDate, time: newTime, ruleId: null, type: 'extra', studentIds: studentIds });
  }
  await saveDataAsync();
  if (typeof window.scheduleAutoSync === 'function') window.scheduleAutoSync();
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  renderCalendar();
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
  if (typeof window.checkUpcomingReminder === 'function') window.checkUpcomingReminder();
  if (document.getElementById('tab-home') && document.getElementById('tab-home').classList.contains('active') && typeof window.renderHome === 'function') window.renderHome();
  showNotify('✅ تم نقل الموعد بنجاح');
}

export function startLessonFromCalendar(groupId, dateISO, time){
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  var dO = new Date(dateISO + 'T00:00:00');
  var occ = getOccurrencesForDate(dO).find(function(o){ return o.groupId === groupId && o.time === time; });
  var targetStudentIds = (occ && Array.isArray(occ.studentIds) && occ.studentIds.length) ? occ.studentIds.slice() : null;
  if (typeof window.setCurrentLessonContext === 'function') {
    window.setCurrentLessonContext({
      groupId: groupId,
      dateISO: dateISO,
      time: time || '',
      ruleId: occ ? (occ.ruleId || null) : null,
      extraId: occ ? (occ.extraId || null) : null,
      studentIds: targetStudentIds
    });
  }
  if (typeof window.pickGroup === 'function') window.pickGroup(groupId, targetStudentIds, true);
  setTimeout(function(){
    var rDate = document.getElementById('reportDate');
    if (rDate) rDate.value = dateISO;
    var curMonth = dateISO.slice(0, 7); /* YYYY-MM */
    var targetNormNames = null;
    if (targetStudentIds && targetStudentIds.length) {
      targetNormNames = targetStudentIds.map(function(sid){
        var st = (data.students || []).find(function(x){ return x.id === sid; });
        return st ? normalize(st.name || '') : '';
      }).filter(Boolean);
    }
    var prevCount = data.sessions.filter(function(s){
      if (s.groupId !== groupId || !s.date || s.date.slice(0, 7) !== curMonth || s.date > dateISO) return false;
      if (targetStudentIds && targetStudentIds.length) {
        if (Array.isArray(s.studentIds) && s.studentIds.length) {
          return s.studentIds.some(function(sid){ return targetStudentIds.indexOf(sid) !== -1; });
        }
        if (s.data && Array.isArray(s.data.students) && targetNormNames && targetNormNames.length) {
          return s.data.students.some(function(st){
            var nm = normalize(st.name || '');
            return nm && targetNormNames.indexOf(nm) !== -1;
          });
        }
        return false;
      }
      return true;
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
    if (typeof window.showPreviousLesson === 'function') window.showPreviousLesson(groupId, dateISO, targetStudentIds);
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
  openQuickScheduleModal(toDateISO(new Date()), groupId, null);
}

export function saveExtraAppointment(groupId){
  var date = document.getElementById('extraApptDate').value;
  var time = readTimePickerValue('extraApptTime');
  if(!date || !time){ showNotify('أدخل التاريخ والوقت'); return; }
  if(!data.appointments) data.appointments = [];
  var c = data.appointments.find(function(a){ return a.groupId === groupId && a.date === date && a.time === time && a.type === 'extra'; });
  if(c){ showNotify('موجودة بالفعل'); return; }
  var studentIds = readAppointmentStudentsPicker();
  data.appointments.push({ id: genId(), groupId: groupId, date: date, time: time, ruleId: null, type: 'extra', studentIds: studentIds });
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
    html += '<div class="sched-row"><div class="sched-row-info"><div class="sched-row-title" style="color:' + col + '">' + svgIcon(icon, 12) + ' ' + lbl + '</div><div class="sched-row-meta">' + svgIcon('calendar', 12) + ' ' + escapeHtml(a.date.split('-').reverse().join('/')) + ' — ' + svgIcon('clock', 12) + ' ' + escapeHtml(formatTimeDisplay(a.time)) + '</div></div><button class="btn btn-danger btn-sm" onclick="removeAppointmentException(\'' + a.id + '\')">إزالة</button></div>';
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

export function buildTimePickerHTML(prefix, time24){
  var val = (time24 && /^\d{2}:\d{2}$/.test(time24)) ? time24 : '18:00';
  var fmt = (window.data && window.data.settings && window.data.settings.timeFormat) || '12h';
  if (fmt === '24h') {
    return '<input type="time" id="' + prefix + '" value="' + escapeAttr(val) + '">';
  }
  var parts = val.split(':').map(Number);
  var h24 = parts[0] || 0;
  var m = parts[1] || 0;
  var period = (h24 >= 12) ? 'pm' : 'am';
  var h12 = h24 % 12;
  if (h12 === 0) h12 = 12;

  var hOpts = '';
  for (var i = 1; i <= 12; i++) {
    hOpts += '<option value="' + i + '"' + (i === h12 ? ' selected' : '') + '>' + i + '</option>';
  }
  var mOpts = '';
  for (var j = 0; j < 60; j++) {
    var ms = String(j).padStart(2, '0');
    mOpts += '<option value="' + ms + '"' + (j === m ? ' selected' : '') + '>' + ms + '</option>';
  }
  return '<div style="display:flex;gap:6px;align-items:center;direction:ltr">'
    + '<select id="' + prefix + '_hour" style="flex:1;min-width:0;text-align:center">' + hOpts + '</select>'
    + '<span style="font-weight:700;color:var(--text-muted)">:</span>'
    + '<select id="' + prefix + '_min" style="flex:1;min-width:0;text-align:center">' + mOpts + '</select>'
    + '<select id="' + prefix + '_period" dir="rtl" style="flex:0 0 74px;text-align:center;font-weight:700">'
    + '<option value="am"' + (period === 'am' ? ' selected' : '') + '>ص</option>'
    + '<option value="pm"' + (period === 'pm' ? ' selected' : '') + '>م</option>'
    + '</select>'
    + '</div>';
}

export function readTimePickerValue(prefix){
  var direct = document.getElementById(prefix);
  if (direct) return direct.value;
  var hEl = document.getElementById(prefix + '_hour');
  var mEl = document.getElementById(prefix + '_min');
  var pEl = document.getElementById(prefix + '_period');
  if (!hEl || !mEl || !pEl) return '';
  var h = parseInt(hEl.value, 10);
  var m = mEl.value;
  var p = pEl.value;
  if (isNaN(h)) return '';
  if (p === 'am') { if (h === 12) h = 0; }
  else { if (h !== 12) h += 12; }
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function formatScheduleRuleLabel(r){
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var rep = r.repeat || 'weekly';
  var label = '';
  if (rep === 'weekly') {
    var days = (Array.isArray(r.daysOfWeek) && r.daysOfWeek.length) ? r.daysOfWeek : [r.dayOfWeek];
    label = 'كل ' + days.map(function(d){ return dayNames[d] || ''; }).filter(Boolean).join('، ');
  } else if (rep === 'biweekly') {
    var bDays = (Array.isArray(r.daysOfWeek) && r.daysOfWeek.length) ? r.daysOfWeek : [r.dayOfWeek];
    label = 'كل أسبوعين (' + bDays.map(function(d){ return dayNames[d] || ''; }).filter(Boolean).join('، ') + ')';
  } else if (rep === 'daily') {
    var step = Math.max(1, parseInt(r.interval, 10) || 1);
    label = step === 1 ? 'يومياً' : ('كل ' + step + ' أيام');
  } else if (rep === 'monthly') {
    var dom = parseInt(r.monthlyDay, 10) || (r.startDate ? new Date(r.startDate + 'T00:00:00').getDate() : 1);
    label = 'شهرياً (يوم ' + dom + ')';
  } else {
    label = 'كل ' + (dayNames[r.dayOfWeek] || '');
  }
  if (r.endDate) label += ' · حتى ' + fmtDate(r.endDate);
  return label;
}

export function renderSchedule(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if(!g || !g.schedule || !g.schedule.length) return '<div class="cfg-empty">لا توجد مواعيد متكررة</div>';
  var tz = g.timezone || getTeacherTimezone();
  var html = '';
  g.schedule.forEach(function(r){
    html += '<div class="sched-row"><div class="sched-row-info"><div class="sched-row-title">' + svgIcon('calendar', 12) + ' ' + escapeHtml(formatScheduleRuleLabel(r)) + ' — ' + escapeHtml(formatTimeDisplay(r.time)) + '</div><div class="sched-row-meta">' + svgIcon('globe', 12) + ' ' + escapeHtml(tz) + '</div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editSchedulePrompt(\''+groupId+'\',\''+r.id+'\')" title="تعديل">' + svgIcon('edit-3', 12) + '</button><button class="btn btn-danger btn-sm" onclick="deleteScheduleRule(\''+groupId+'\',\''+r.id+'\')" title="حذف">' + svgIcon('trash-2', 12) + '</button></div></div>';
  });
  return html;
}

export function buildAppointmentStudentsPickerHTML(groupId, selectedIds){
  var sts = (data.students || []).filter(function(s){ return s.groupId === groupId; });
  if(!sts.length){
    return '<div class="form-field"><label>الطلاب المعنيون بالموعد</label><div style="font-size:.82rem;color:var(--text-muted);padding:8px 10px;border-radius:8px;border:1px solid var(--card-border)">لا يوجد طلاب مسجلون في هذه المجموعة (سيُطبق على كل طلاب المجموعة)</div></div>';
  }
  var isAll = !Array.isArray(selectedIds) || !selectedIds.length;
  var html = '<div class="form-field" id="apptStudentsPicker">'
    + '<label style="margin-bottom:6px;display:block">الطلاب المعنيون بالموعد</label>'
    + '<div style="display:flex;flex-direction:column;gap:6px;max-height:190px;overflow-y:auto;padding:4px 0">'
    + '<label class="settings-checkbox" style="display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:0;font-size:.86rem;color:var(--text-primary)">'
    + '<input type="checkbox" id="apptAllStudentsChk" onchange="toggleApptAllStudents(this)" style="width:18px;height:18px;flex-shrink:0;margin:0;accent-color:var(--accent-green);cursor:pointer"' + (isAll ? ' checked' : '') + '>'
    + '<span>كل طلاب المجموعة</span>'
    + '</label>';
  sts.forEach(function(s){
    var checked = (!isAll && selectedIds.indexOf(s.id) !== -1) ? ' checked' : '';
    html += '<label class="settings-checkbox" style="display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:0;font-size:.86rem;font-weight:500;color:var(--text-primary)">'
      + '<input type="checkbox" class="appt-student-chk" value="' + escapeAttr(s.id) + '" onchange="onApptStudentCheckChange()" style="width:18px;height:18px;flex-shrink:0;margin:0;accent-color:var(--accent-green);cursor:pointer"' + checked + '>'
      + '<span>' + escapeHtml(s.name) + '</span>'
      + '</label>';
  });
  html += '</div></div>';
  return html;
}

export function toggleApptAllStudents(cb){
  if(!cb) return;
  if(cb.checked){
    document.querySelectorAll('.appt-student-chk').forEach(function(el){ el.checked = false; });
  }
}

export function onApptStudentCheckChange(){
  var anyChecked = false;
  document.querySelectorAll('.appt-student-chk').forEach(function(el){
    if(el.checked) anyChecked = true;
  });
  var allChk = document.getElementById('apptAllStudentsChk');
  if(allChk) allChk.checked = !anyChecked;
}

export function readAppointmentStudentsPicker(){
  var allChk = document.getElementById('apptAllStudentsChk');
  if(allChk && allChk.checked) return null;
  var chks = document.querySelectorAll('.appt-student-chk:checked');
  if(!chks || !chks.length) return null;
  var ids = [];
  chks.forEach(function(c){ if(c.value) ids.push(c.value); });
  return ids.length ? ids : null;
}

export function updateExtraApptStudentsPicker(){
  var sel = document.getElementById('extraApptGroupId');
  var wrap = document.getElementById('extraApptStudentsWrap');
  if(!sel || !wrap) return;
  wrap.innerHTML = buildAppointmentStudentsPickerHTML(sel.value, null);
}

export function openQuickScheduleModal(prefillDateISO, prefillGroupId, editRuleId){
  if (!data.groups || !data.groups.length) {
    showNotify('أنشئ مجموعة أولاً من المكتبة');
    return;
  }
  var todayISO = toDateISO(new Date());
  var isEdit = !!(prefillGroupId && editRuleId);
  var editRule = null;
  if (isEdit) {
    var eg = data.groups.find(function(x){ return x.id === prefillGroupId; });
    editRule = (eg && eg.schedule) ? eg.schedule.find(function(r){ return r.id === editRuleId; }) : null;
    if (!editRule) return;
  }
  var selectedGroupId = prefillGroupId || data.groups[0].id;
  var dateVal = prefillDateISO || todayISO;
  var defaultDay = new Date(dateVal + 'T00:00:00').getDay();
  var timeVal = isEdit ? (editRule.time || '18:00') : '18:00';
  var repeatMode = isEdit ? (editRule.repeat || 'weekly') : (prefillGroupId && !prefillDateISO ? 'weekly' : 'once');
  var selectedDays = isEdit ? ((Array.isArray(editRule.daysOfWeek) && editRule.daysOfWeek.length) ? editRule.daysOfWeek.slice() : [editRule.dayOfWeek]) : [defaultDay];
  var intervalVal = isEdit ? Math.max(1, parseInt(editRule.interval, 10) || 1) : 1;
  var startDateVal = isEdit ? (editRule.startDate || editRule.createdAt || todayISO) : dateVal;
  var endDateVal = isEdit ? (editRule.endDate || '') : '';
  var existingStudentIds = isEdit ? (editRule.studentIds || null) : null;

  var groupOpts = data.groups.map(function(g){
    return '<option value="' + escapeAttr(g.id) + '"' + (g.id === selectedGroupId ? ' selected' : '') + '>' + escapeHtml(g.name) + '</option>';
  }).join('');

  var repOpts = '';
  if (!isEdit) {
    repOpts += '<option value="once"' + (repeatMode === 'once' ? ' selected' : '') + '>مرة واحدة (حصة استثنائية)</option>';
  }
  repOpts += '<option value="weekly"' + (repeatMode === 'weekly' ? ' selected' : '') + '>أسبوعياً (أيام محددة)</option>'
    + '<option value="biweekly"' + (repeatMode === 'biweekly' ? ' selected' : '') + '>كل أسبوعين (أيام محددة)</option>'
    + '<option value="daily"' + (repeatMode === 'daily' ? ' selected' : '') + '>يومياً (كل N أيام)</option>'
    + '<option value="monthly"' + (repeatMode === 'monthly' ? ' selected' : '') + '>شهرياً</option>';

  var shortDays = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  var weekdayPills = shortDays.map(function(lbl, idx){
    var isAct = selectedDays.indexOf(idx) !== -1;
    return '<button type="button" class="sched-day-pill' + (isAct ? ' active' : '') + '" data-day="' + idx + '" onclick="toggleSchedWeekday(this)">' + lbl + '</button>';
  }).join('');

  var showWeekdays = (repeatMode === 'weekly' || repeatMode === 'biweekly');
  var showInterval = (repeatMode === 'daily');
  var showSingleDate = (repeatMode === 'once');

  var body = '<div class="form-field"><label>المجموعة</label><select id="qsGroupId" onchange="onQuickSchedGroupChange()"' + (isEdit ? ' disabled' : '') + '>' + groupOpts + '</select></div>'
    + '<div class="form-field"><label>الساعة</label>' + buildTimePickerHTML('qsTime', timeVal) + '</div>'
    + '<div class="form-field"><label>التكرار</label><select id="qsRepeat" onchange="onQuickSchedRepeatChange()">' + repOpts + '</select></div>'
    + '<div class="form-field" id="qsWeekdaysBox" style="display:' + (showWeekdays ? 'block' : 'none') + '"><label>أيام الأسبوع (يمكن اختيار أكثر من يوم)</label><div class="sched-weekdays-grid">' + weekdayPills + '</div></div>'
    + '<div class="form-field" id="qsIntervalBox" style="display:' + (showInterval ? 'block' : 'none') + '"><label>تتكرر كل (عدد الأيام)</label><input type="number" id="qsInterval" min="1" max="30" value="' + intervalVal + '"></div>'
    + '<div class="form-field" id="qsSingleDateBox" style="display:' + (showSingleDate ? 'block' : 'none') + '"><label>التاريخ</label><input type="date" id="qsDate" value="' + escapeAttr(dateVal) + '"></div>'
    + '<div id="qsRangeDatesBox" style="display:' + (showSingleDate ? 'none' : 'block') + '">'
    + '<div class="form-row-2">'
    + '<div class="form-field"><label>تاريخ البدء</label><input type="date" id="qsStartDate" value="' + escapeAttr(startDateVal) + '"></div>'
    + '<div class="form-field"><label>تاريخ الانتهاء (اختياري)</label><input type="date" id="qsEndDate" value="' + escapeAttr(endDateVal) + '"></div>'
    + '</div>'
    + '<div style="font-size:.75rem;color:var(--text-muted);margin:-6px 0 10px">اترك تاريخ الانتهاء فارغاً للتكرار المفتوح</div>'
    + '</div>'
    + '<div id="qsStudentsWrap">' + buildAppointmentStudentsPickerHTML(selectedGroupId, existingStudentIds) + '</div>';

  var saveArgs = isEdit ? ('\'' + escapeAttr(prefillGroupId) + '\',\'' + escapeAttr(editRuleId) + '\'') : 'null,null';
  var footer = '<button type="button" class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
    + '<button type="button" class="btn btn-primary" style="width:auto;margin:0" onclick="saveQuickSchedule(' + saveArgs + ')">' + svgIcon('save', 14) + ' حفظ</button>';

  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal(isEdit ? (svgIcon('edit-3', 18) + ' تعديل الموعد') : (svgIcon('calendar', 18) + ' جدولة موعد'), body, footer);
  }
}

export function onQuickSchedRepeatChange(){
  var repEl = document.getElementById('qsRepeat');
  if (!repEl) return;
  var rep = repEl.value;
  var wdBox = document.getElementById('qsWeekdaysBox');
  var intBox = document.getElementById('qsIntervalBox');
  var sdBox = document.getElementById('qsSingleDateBox');
  var rngBox = document.getElementById('qsRangeDatesBox');
  if (wdBox) wdBox.style.display = (rep === 'weekly' || rep === 'biweekly') ? 'block' : 'none';
  if (intBox) intBox.style.display = (rep === 'daily') ? 'block' : 'none';
  if (sdBox) sdBox.style.display = (rep === 'once') ? 'block' : 'none';
  if (rngBox) rngBox.style.display = (rep === 'once') ? 'none' : 'block';
}

export function onQuickSchedGroupChange(){
  var sel = document.getElementById('qsGroupId');
  var wrap = document.getElementById('qsStudentsWrap');
  if (!sel || !wrap) return;
  wrap.innerHTML = buildAppointmentStudentsPickerHTML(sel.value, null);
}

export function toggleSchedWeekday(btn){
  if (btn) btn.classList.toggle('active');
}

export function saveQuickSchedule(editGroupId, editRuleId){
  var gSel = document.getElementById('qsGroupId');
  var groupId = editGroupId || (gSel ? gSel.value : '');
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if (!g) return;
  var time = readTimePickerValue('qsTime');
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    showNotify('وقت غير صالح');
    return;
  }
  var repEl = document.getElementById('qsRepeat');
  var repeat = repEl ? repEl.value : 'weekly';
  var studentIds = readAppointmentStudentsPicker();

  if (repeat === 'once') {
    var dateEl = document.getElementById('qsDate');
    var date = dateEl ? dateEl.value : '';
    if (!date) { showNotify('اختر التاريخ'); return; }
    if (!data.appointments) data.appointments = [];
    var conflict = data.appointments.find(function(a){
      return a.groupId === groupId && a.date === date && a.time === time && a.type === 'extra';
    });
    if (conflict) { showNotify('موجودة بالفعل'); return; }
    data.appointments.push({ id: genId(), groupId: groupId, date: date, time: time, ruleId: null, type: 'extra', studentIds: studentIds });
  } else {
    if (!g.schedule) g.schedule = [];
    var sEl = document.getElementById('qsStartDate');
    var eEl = document.getElementById('qsEndDate');
    var startDate = (sEl && sEl.value) ? sEl.value : toDateISO(new Date());
    var endDate = (eEl && eEl.value) ? eEl.value : '';
    if (endDate && endDate < startDate) {
      showNotify('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء');
      return;
    }
    var days = [];
    var interval = 1;
    var monthlyDay = new Date(startDate + 'T00:00:00').getDate();

    if (repeat === 'weekly' || repeat === 'biweekly') {
      document.querySelectorAll('#qsWeekdaysBox .sched-day-pill.active').forEach(function(btn){
        var dv = parseInt(btn.dataset.day, 10);
        if (!isNaN(dv) && days.indexOf(dv) === -1) days.push(dv);
      });
      if (!days.length) { showNotify('اختر يوماً واحداً على الأقل'); return; }
      days.sort(function(a,b){ return a - b; });
    } else if (repeat === 'daily') {
      var intEl = document.getElementById('qsInterval');
      interval = Math.max(1, parseInt(intEl ? intEl.value : '1', 10) || 1);
    }

    var normStuKey = (Array.isArray(studentIds) && studentIds.length) ? studentIds.slice().sort().join(',') : 'ALL';
    var dup = g.schedule.find(function(x){
      if (editRuleId && x.id === editRuleId) return false;
      var xRep = x.repeat || 'weekly';
      if (xRep !== repeat || x.time !== time) return false;
      var xStu = (Array.isArray(x.studentIds) && x.studentIds.length) ? x.studentIds.slice().sort().join(',') : 'ALL';
      if (xStu !== normStuKey) return false;
      if ((x.startDate || x.createdAt || '') !== startDate) return false;
      if ((x.endDate || '') !== endDate) return false;
      if (repeat === 'weekly' || repeat === 'biweekly') {
        var xDays = (Array.isArray(x.daysOfWeek) && x.daysOfWeek.length ? x.daysOfWeek : [x.dayOfWeek]).slice().sort().join(',');
        return xDays === days.join(',');
      }
      if (repeat === 'daily') return (Math.max(1, parseInt(x.interval, 10) || 1)) === interval;
      if (repeat === 'monthly') {
        var xDom = parseInt(x.monthlyDay, 10) || (x.startDate ? new Date(x.startDate + 'T00:00:00').getDate() : 0);
        return xDom === monthlyDay;
      }
      return false;
    });
    if (dup) { showNotify('يوجد موعد مطابق تماماً بالفعل'); return; }

    var fallbackDow = (repeat === 'weekly' || repeat === 'biweekly') ? days[0] : new Date(startDate + 'T00:00:00').getDay();
    if (editRuleId) {
      var r = g.schedule.find(function(x){ return x.id === editRuleId; });
      if (!r) return;
      r.repeat = repeat;
      r.time = time;
      r.studentIds = studentIds;
      r.startDate = startDate;
      r.endDate = endDate || null;
      r.dayOfWeek = fallbackDow;
      if (repeat === 'weekly' || repeat === 'biweekly') {
        r.daysOfWeek = days;
        delete r.interval;
        delete r.monthlyDay;
      } else if (repeat === 'daily') {
        r.interval = interval;
        delete r.daysOfWeek;
        delete r.monthlyDay;
      } else if (repeat === 'monthly') {
        r.monthlyDay = monthlyDay;
        delete r.daysOfWeek;
        delete r.interval;
      }
    } else {
      var newRule = {
        id: genId(),
        repeat: repeat,
        dayOfWeek: fallbackDow,
        time: time,
        createdAt: startDate,
        startDate: startDate,
        endDate: endDate || null,
        studentIds: studentIds
      };
      if (repeat === 'weekly' || repeat === 'biweekly') newRule.daysOfWeek = days;
      if (repeat === 'daily') newRule.interval = interval;
      if (repeat === 'monthly') newRule.monthlyDay = monthlyDay;
      g.schedule.push(newRule);
    }
  }

  saveData();
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  var sc = document.getElementById('groupScheduleContainer');
  if (sc && typeof window.currentViewGroupId !== 'undefined' && window.currentViewGroupId === groupId) sc.innerHTML = renderSchedule(groupId);
  var ec = document.getElementById('groupExceptionsContainer');
  if (ec && typeof window.currentViewGroupId !== 'undefined' && window.currentViewGroupId === groupId) ec.innerHTML = renderGroupExceptions(groupId);
  renderCalendar();
  if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
  if (typeof window.checkUpcomingReminder === 'function') window.checkUpcomingReminder();
  if (document.getElementById('tab-home') && document.getElementById('tab-home').classList.contains('active') && typeof window.renderHome === 'function') window.renderHome();
  showNotify(editRuleId ? '✅ تم تحديث الموعد' : '✅ تم حفظ الموعد');
}

export function addSchedulePrompt(groupId){
  openQuickScheduleModal(null, groupId, null);
}

export function editSchedulePrompt(groupId, ruleId){
  openQuickScheduleModal(null, groupId, ruleId);
}

export function saveScheduleRule(groupId, ruleId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  if(!g.schedule) g.schedule = [];
  var d = parseInt(document.getElementById('newSchedDay').value);
  var t = readTimePickerValue('newSchedTime');
  if(!t || !/^\d{2}:\d{2}$/.test(t)){ showNotify('وقت غير صالح'); return; }
  var dup = g.schedule.find(function(x){ return x.dayOfWeek === d && x.time === t && x.id !== ruleId; });
  if(dup){ showNotify('يوجد موعد بنفس اليوم والوقت بالفعل'); return; }
  var studentIds = readAppointmentStudentsPicker();
  if(ruleId){
    var r = g.schedule.find(function(x){ return x.id === ruleId; }); if(!r) return;
    r.dayOfWeek = d; r.time = t; r.studentIds = studentIds;
  } else g.schedule.push({ id: genId(), dayOfWeek: d, time: t, createdAt: toDateISO(new Date()), studentIds: studentIds });
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
    calendarGoToday,
    _ruleMatchesDate,
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
    rescheduleOccurrencePrompt,
    saveRescheduleOccurrence,
    startLessonFromCalendar,
    cancelOccurrence,
    restoreOccurrence,
    deleteOccurrence,
    addExtraAppointmentPrompt,
    addExtraAppointmentPromptForDate,
    saveExtraAppointment,
    saveExtraAppointmentFromDay,
    openQuickScheduleModal,
    onQuickSchedRepeatChange,
    onQuickSchedGroupChange,
    toggleSchedWeekday,
    saveQuickSchedule,
    addSchedulePrompt,
    editSchedulePrompt,
    saveScheduleRule,
    deleteScheduleRule,
    formatScheduleRuleLabel,
    renderSchedule,
    renderGroupExceptions,
    removeAppointmentException,
    buildTimePickerHTML,
    readTimePickerValue,
    buildAppointmentStudentsPickerHTML,
    toggleApptAllStudents,
    onApptStudentCheckChange,
    readAppointmentStudentsPicker,
    updateExtraApptStudentsPicker
  });
}
