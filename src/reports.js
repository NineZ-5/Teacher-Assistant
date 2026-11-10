/* ═══════════════════════════════════════════════════════════
   src/reports.js — إنشاء التقارير النصية وتصدير Word والتقارير الشهرية
   ═══════════════════════════════════════════════════════════ */

import { normalize, escapeHtml, escapeAttr, showNotify } from './utils.js';
import { data } from './storage.js';

export function durationToWords(durInput){
  var d = parseInt(durInput);
  if(!d || d <= 0) return 'غير محددة';
  var h = Math.floor(d/60), m = d%60;
  var parts = [];
  if(h>0){ if(h===1) parts.push('ساعة'); else if(h===2) parts.push('ساعتان'); else if(h>=3 && h<=10) parts.push(h+' ساعات'); else parts.push(h+' ساعة'); }
  if(m>0) parts.push(m+' دقيقة');
  return parts.join(' و ');
}

export function cleanGroupName(name){
  if(!name) return '';
  return name.replace(/\s*[-–—]\s*\d+\s*$/, '').replace(/\s*\(\d+\)\s*$/, '').trim();
}

export function getSubjectLabel(){
  var subs = window.currentSubjects || { quran: true, arabic: false, islamic: false };
  var a = [];
  if (subs.quran) a.push('القرآن الكريم');
  if (subs.arabic) a.push('اللغة العربية');
  if (subs.islamic) a.push('العلوم الشرعية');
  return a.join(' و ');
}

export function getActiveSuffixes(section, type, grpObj, studentObj){
  var r = [];
  var currentHiddenStaticIds = window.currentHiddenStaticIds || [];
  function check(texts){
    if(!texts) return;
    texts.forEach(function(t){
      if(t.mode === 'suffix' && t.section === section && t.targetType === type && currentHiddenStaticIds.indexOf(t.id) === -1) r.push(t);
    });
  }
  if(grpObj && grpObj.reportSettings) check(grpObj.reportSettings.staticTexts);
  if(studentObj && studentObj.staticTexts) check(studentObj.staticTexts);
  return r;
}

export function getActiveFullTexts(section, subject, grpObj, studentObj){
  var r = [];
  var currentHiddenStaticIds = window.currentHiddenStaticIds || [];
  function check(texts){
    if(!texts) return;
    texts.forEach(function(t){
      if(t.mode === 'full' && t.section === section && (t.subject === subject || !t.subject) && currentHiddenStaticIds.indexOf(t.id) === -1) r.push(t);
    });
  }
  if(grpObj && grpObj.reportSettings) check(grpObj.reportSettings.staticTexts);
  if(studentObj && studentObj.staticTexts) check(studentObj.staticTexts);
  return r;
}

export function getRowText(row, customType){
  var isFreeText = row.classList && row.classList.contains('free-text-row');
  var type = customType || row.querySelector('.row-type-select').value;
  if(isFreeText){
    var txt = (row.querySelector('.free-text-input') || {}).value || '';
    if(!txt.trim()) return '';
    return '⏺ ' + type + ' ' + txt;
  }
  var rangeSel = row.querySelector('.range-type-select');
  var rt = rangeSel ? rangeSel.value : 'ayat';
  var surah = row.querySelector('.main-surah').value;
  if(!surah) return '';

  if(rt === 'surahs'){
    var ts = row.querySelector('.to-surah');
    var toSurah = ts ? ts.value : '';
    if(toSurah && toSurah !== surah) return '⏺ ' + type + ' من سورة ' + surah + ' إلى سورة ' + toSurah;
    return '⏺ ' + type + ' سورة ' + surah + ' كاملة';
  }

  var from = row.querySelector('.from-aya').value;
  var to = row.querySelector('.to-aya').value;
  var qData = window.quranData || {};
  var max = qData[surah];
  var text = '';
  var isReading = type.indexOf('قراءة') !== -1;
  if(from && to && parseInt(from) > parseInt(to)) return '';
  if(to && parseInt(to) === max){
    if(from && parseInt(from) > 1) text = ' من الآية ' + from + ' إلى آخرها';
    else text = isReading ? ' إلى آخرها' : ' كلها';
  } else {
    if(from) text += ' من الآية ' + from;
    if(to) text += ' حتى الآية ' + to;
  }
  return '⏺ ' + type + ' سورة ' + surah + text;
}

export function buildQuranSection(card, sectionType, grpObj, studentObj){
  var isStudy = sectionType === 'study';
  var containerSel = isStudy ? '.study-rows-container' : '.homework-rows-container';
  var rows = card.querySelectorAll(containerSel + ' .row-item');
  var lines = []; var counts = {}, cur = {};
  rows.forEach(function(r){ var t = r.querySelector('.row-type-select').value; counts[t]=(counts[t]||0)+1; cur[t]=1; });
  rows.forEach(function(r){
    var bt = r.querySelector('.row-type-select').value;
    var dt = bt;
    if(counts[bt]>1) dt = bt + ' (' + (cur[bt]++) + ')';
    var l = getRowText(r, dt);
    if(l){
      getActiveSuffixes(sectionType, bt, grpObj, studentObj).forEach(function(sfx){ l += ' ' + sfx.text; });
      lines.push(l);
    }
  });
  var fulls = getActiveFullTexts(sectionType, 'quran', grpObj, studentObj);
  if(!lines.length && !fulls.length) return '';
  var out = 'القرآن الكريم:\n';
  if(lines.length) out += lines.join('\n') + '\n';
  fulls.forEach(function(ft){ out += '⏺ ' + ft.text + '\n'; });
  return out;
}

export function buildFreeTextSection(card, sectionType, subjectKey, title, grpObj, studentObj){
  var isStudy = sectionType === 'study';
  var cls = subjectKey === 'arabic' ? 'arabic' : 'islamic';
  var containerSel = isStudy ? '.study-' + cls + '-rows-container' : '.homework-' + cls + '-rows-container';
  var rows = card.querySelectorAll(containerSel + ' .arabic-row');
  var lines = [];
  rows.forEach(function(r){ var v = r.querySelector('.arabic-input').value.trim(); if(v) lines.push('⏺ ' + v); });
  var fulls = getActiveFullTexts(sectionType, subjectKey, grpObj, studentObj);
  if(!lines.length && !fulls.length) return '';
  var out = title + ':\n';
  if(lines.length) out += lines.join('\n') + '\n';
  fulls.forEach(function(ft){ out += '⏺ ' + ft.text + '\n'; });
  return out;
}

export function generateReportText(){
  var currentSubjects = window.currentSubjects || { quran: true, arabic: false, islamic: false };
  var groupRaw = document.getElementById('groupName').value;
  var group = cleanGroupName(groupRaw);
  var teacher = document.getElementById('teacherName').value;
  var dateInput = document.getElementById('reportDate').value;
  var date = dateInput ? dateInput.split('-').reverse().join('/') : '';
  var lesson = document.getElementById('lessonOrder').value;
  var dur = durationToWords(document.getElementById('duration').value);
  var subjLabel = getSubjectLabel();
  var grpObj = data.groups.find(function(g){ return normalize(g.name) === normalize(groupRaw.trim()); });
  var groupConstants = grpObj ? (grpObj.constants || []) : [];
  var report = '🙋🏻🙋🏻‍♀اسم الجروب : ' + group + '\n🗓التاريخ: ' + date + '\nالحصة : ' + lesson + '\n⏱مدة الحصة : ' + dur + '\nالمادة : ' + subjLabel + '\n';
  groupConstants.forEach(function(c){
    if(c.key && c.value && normalize(c.key) !== 'المراجع' && normalize(c.key) !== 'مواعيد الأسرة'){
      report += c.key + ' : ' + c.value + '\n';
    }
  });
  report += '\n';
  var cards = document.querySelectorAll('.student-card');
  var attLabels = window.ATT_LABELS || { present:'حاضر', excused:'غائب بعذر', absent:'غائب بدون عذر' };
  for(var i=0; i<cards.length; i++){
    var card = cards[i];
    var name = card.querySelector('.student-name').value || '(بدون اسم)';
    var att = card.querySelector('.student-attendance').value;
    if(att !== 'present'){ report += '--- ' + name + ' ---\n\n' + attLabels[att] + '\n\n'; continue; }
    var studentObj = null;
    if(grpObj){ studentObj = data.students.find(function(s){ return s.groupId === grpObj.id && normalize(s.name) === normalize(name); }); }
    var studentConstants = studentObj ? (studentObj.constants || []) : [];
    var notesEl = card.querySelector('.student-notes');
    var notes = notesEl ? (notesEl.value || '').trim() : '';
    report += '--- ' + name + ' ---\n\nقمنا بدراسة مايلي :\n';
    if(currentSubjects.quran) report += buildQuranSection(card, 'study', grpObj, studentObj);
    if(currentSubjects.arabic) report += buildFreeTextSection(card, 'study', 'arabic', 'اللغة العربية', grpObj, studentObj);
    if(currentSubjects.islamic) report += buildFreeTextSection(card, 'study', 'islamic', 'العلوم الشرعية', grpObj, studentObj);
    report += '\nالمطلوب :\n';
    if(currentSubjects.quran) report += buildQuranSection(card, 'homework', grpObj, studentObj);
    if(currentSubjects.arabic) report += buildFreeTextSection(card, 'homework', 'arabic', 'اللغة العربية', grpObj, studentObj);
    if(currentSubjects.islamic) report += buildFreeTextSection(card, 'homework', 'islamic', 'العلوم الشرعية', grpObj, studentObj);
    report += '\nالمستوى : ' + ((card.querySelector('.student-level')||{}).value || 'ممتاز') + '\n';
    if(notes) report += '\nملاحظات:\n⏺ ' + notes + '\n';
    if(studentConstants.length){ studentConstants.forEach(function(c){ if(c.key && c.value) report += c.key + ' : ' + c.value + '\n'; }); }
    report += '\n';
  }
  if(teacher.trim() !== '') report += '\nالمعلم: ' + teacher;
  return report;
}

export function generateReport(){
  var text = generateReportText();
  var out = document.getElementById('output');
  if (out) out.value = text;
  var so = document.getElementById('sheetOutput');
  if(so) so.value = text;
  showNotify('تم إنشاء التقرير');
  if(window.innerWidth < 1024 && typeof window.openReportSheet === 'function') {
    window.openReportSheet();
  }
}

export function exportToWordFromState(state, report){
  var group = cleanGroupName(state.group || 'تقرير');
  var teacher = state.teacher || '';
  var date = state.date ? state.date.split('-').reverse().join('/') : '';
  var dur = '';
  var di = parseInt(state.duration);
  if(di>0){ var h=Math.floor(di/60), m=di%60; if(h) dur+=h+' س '; if(m) dur+=m+' د'; }
  var subs = state.subjects || (typeof window.subjectsFromString === 'function' ? window.subjectsFromString(state.subject) : { quran: true, arabic: false, islamic: false });
  var activeSubs = [];
  if (subs.quran) activeSubs.push('القرآن الكريم');
  if (subs.arabic) activeSubs.push('اللغة العربية');
  if (subs.islamic) activeSubs.push('العلوم الشرعية');
  var subj = activeSubs.join(' و ');
  var grpObj = data.groups.find(function(g){ return normalize(g.name) === normalize((state.group || '').trim()); });
  var attLabels = window.ATT_LABELS || { present:'حاضر', excused:'غائب بعذر', absent:'غائب بدون عذر' };

  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:10px}th{background:#f2f2f2}</style></head><body><h2>تقرير الحصة</h2><p><b>الجروب:</b> '+escapeHtml(group)+'</p><p><b>التاريخ:</b> '+escapeHtml(date)+'</p><p><b>الحصة:</b> '+escapeHtml(state.lesson||'')+'</p><p><b>المدة:</b> '+escapeHtml(dur)+'</p><p><b>المادة:</b> '+escapeHtml(subj)+'</p><p><b>المعلم:</b> '+escapeHtml(teacher)+'</p><table><thead><tr><th>الطالب</th><th>الحضور</th><th>دراسة اليوم</th><th>المطلوب</th><th>المستوى</th></tr></thead><tbody>';
  (state.students||[]).forEach(function(st){
    var sl = [], hl = [];
    var studentObj = grpObj ? data.students.find(function(x){ return x.groupId === grpObj.id && normalize(x.name) === normalize(st.name || ''); }) : null;
    function renderQuranRow(r, isStudy){
      var form = r.form || 'surah-ayat';
      var tmp = document.createElement('div');
      var renderRowFn = window.renderRow;
      if (typeof renderRowFn === 'function') {
        tmp.innerHTML = renderRowFn(isStudy?'study':'homework', r.type, form);
      }
      var row = tmp.firstElementChild;
      if (!row) return '';
      if(form === 'free-text'){ var fi = row.querySelector('.free-text-input'); if(fi) fi.value = r.text || ''; }
      else {
        row.querySelector('.main-surah').value = r.mainSurah || '';
        var rt = r.rangeType || 'ayat';
        var rSel = row.querySelector('.range-type-select');
        if(rSel) rSel.value = rt;
        if(rt === 'surahs'){
          var ar = row.querySelector('.ayat-range');
          var sr = row.querySelector('.surahs-range');
          if(ar) ar.style.display = 'none';
          if(sr) sr.style.display = 'flex';
          var ts = row.querySelector('.to-surah');
          if(ts) ts.value = r.toSurah || '';
        } else {
          var faEl = row.querySelector('.from-aya');
          var taEl = row.querySelector('.to-aya');
          if(faEl) faEl.value = r.from || '';
          if(taEl) taEl.value = r.to || '';
        }
      }
      var txt = getRowText(row);
      if(txt){
        txt = txt.replace('⏺ ','');
        getActiveSuffixes(isStudy?'study':'homework', r.type, grpObj, studentObj).forEach(function(sfx){ txt += ' ' + sfx.text; });
        return txt;
      }
      return '';
    }
    if(st.attendance === 'present'){
      if(subs.quran){
        (st.studyRows||[]).forEach(function(r){ var t = renderQuranRow(r, true); if(t) sl.push(t); });
        getActiveFullTexts('study','quran',grpObj,studentObj).forEach(function(f){ sl.push(f.text); });
        (st.homeworkRows||[]).forEach(function(r){ var t = renderQuranRow(r, false); if(t) hl.push(t); });
        getActiveFullTexts('homework','quran',grpObj,studentObj).forEach(function(f){ hl.push(f.text); });
      }
      if(subs.arabic){
        (st.arabicStudyRows||[]).forEach(function(txt){ if(txt) sl.push('عربية: ' + txt); });
        getActiveFullTexts('study','arabic',grpObj,studentObj).forEach(function(f){ sl.push('عربية: ' + f.text); });
        (st.arabicHomeworkRows||[]).forEach(function(txt){ if(txt) hl.push('عربية: ' + txt); });
        getActiveFullTexts('homework','arabic',grpObj,studentObj).forEach(function(f){ hl.push('عربية: ' + f.text); });
      }
      if(subs.islamic){
        (st.islamicStudyRows||[]).forEach(function(txt){ if(txt) sl.push('شرعية: ' + txt); });
        getActiveFullTexts('study','islamic',grpObj,studentObj).forEach(function(f){ sl.push('شرعية: ' + f.text); });
        (st.islamicHomeworkRows||[]).forEach(function(txt){ if(txt) hl.push('شرعية: ' + txt); });
        getActiveFullTexts('homework','islamic',grpObj,studentObj).forEach(function(f){ hl.push('شرعية: ' + f.text); });
      }
    }
    var levelDisplay = st.level || '—';
    if(st.notes && st.notes.trim()) levelDisplay += '<br><small><i>ملاحظات: ' + escapeHtml(st.notes.trim()) + '</i></small>';
    html += '<tr><td><b>'+escapeHtml(st.name||'—')+'</b></td><td>'+attLabels[st.attendance||'present']+'</td><td>'+(sl.join('<br>')||'—')+'</td><td>'+(hl.join('<br>')||'—')+'</td><td>'+levelDisplay+'</td></tr>';
  });
  html += '</tbody></table></body></html>';
  var blob = new Blob(['\ufeff', html], {type:'application/msword'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = group+'_تقرير_'+date.replace(/\//g,'-')+'.doc';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  showNotify('تم تصدير Word');
}

export function exportToWord(){
  if (typeof window.collectFormState === 'function') {
    var state = window.collectFormState();
    var out = document.getElementById('output');
    exportToWordFromState(state, out ? out.value : '');
  }
}

export function parseEditedReportForStudent(report, studentName){
  var marker = '--- ' + studentName + ' ---';
  var idx = report.indexOf(marker);
  if(idx === -1) return null;
  var start = idx + marker.length;
  var nx = report.indexOf('--- ', start);
  var end = nx === -1 ? report.length : nx;
  var section = report.substring(start, end);
  var m = section.match(/قمنا بدراسة مايلي\s*:([\s\S]*?)(?=المطلوب\s*:|$)/);
  if(!m) return null;
  var items = []; var cur = 'quran';
  m[1].split('\n').forEach(function(line){
    line = line.trim(); if(!line) return;
    if(line.indexOf('القرآن') !== -1){ cur = 'quran'; return; }
    if(line.indexOf('العربية') !== -1){ cur = 'arabic'; return; }
    if(line.indexOf('الشرعية') !== -1){ cur = 'islamic'; return; }
    if(line.indexOf('⏺') === 0){
      var t = line.replace(/^⏺\s*/, '').trim();
      if(t) items.push({ subject: cur, type: 'دراسة', text: t });
    }
  });
  return { studyItems: items };
}

export function generateMonthlyDraft(ownerType, ownerId, year, month){
  var targetSessions = data.sessions.filter(function(s){
    if(!s.date) return false;
    var y = parseInt(s.date.slice(0,4)); var m = parseInt(s.date.slice(5,7));
    return y === year && m === month && (ownerType === 'group' ? s.groupId === ownerId : (s.studentIds||[]).indexOf(ownerId) !== -1);
  });
  targetSessions.sort(function(a,b){ return a.date.localeCompare(b.date); });
  if(targetSessions.length === 0) return "لا توجد حصص مسجلة في هذا الشهر.";
  var totalMins = targetSessions.reduce(function(sum, s){ return sum + (parseInt(s.duration) || 0); }, 0);
  var durText = durationToWords(totalMins);
  var groupName = ""; var teacherName = data.settings.teacherName || ""; var targetStudents = []; var gidC = null;
  if(ownerType === 'group'){
    var g = data.groups.find(function(x){ return x.id === ownerId; });
    groupName = g ? g.name : ''; gidC = ownerId;
    targetStudents = data.students.filter(function(s){ return s.groupId === ownerId && targetSessions.some(function(ts){ return (ts.studentIds||[]).indexOf(s.id) !== -1; }); });
  } else {
    var s = data.students.find(function(x){ return x.id === ownerId; });
    var g = data.groups.find(function(x){ return x.id === s.groupId; });
    groupName = g ? g.name : ''; gidC = g ? g.id : null;
    targetStudents = [s];
  }
  var getConstantFn = window.getConstant || function(type, id, key, fallback){ return fallback; };
  var refs = gidC ? getConstantFn('group', gidC, 'المراجع', 'القرآن الكريم - منهج اللغة العربية') : 'القرآن الكريم - منهج اللغة العربية';
  var familyTimes = gidC ? getConstantFn('group', gidC, 'مواعيد الأسرة', '[أضف المواعيد هنا]') : '[أضف المواعيد هنا]';
  var draft = '📋 التقرير الشهري\n\n';
  draft += '🔹 اسم الجروب: [ ' + cleanGroupName(groupName) + ' ]\n';
  if(ownerType === 'student' && targetStudents.length > 0) draft += '🔹 اسم الطالب: [ ' + targetStudents[0].name + ' ]\n';
  draft += '🔹 المادة: [ القرآن الكريم واللغة العربية ]\n';
  draft += '🔹 عدد الساعات: [ ' + durText + ' ]\n';
  draft += '🔹 المراجع: [ ' + refs + ' ]\n\n';
  draft += '📖 ما تم دراسته خلال الشهر :\n\n';
  targetStudents.forEach(function(st){
    draft += st.name + ' :\n';
    var sSessions = targetSessions.filter(function(s){ return (s.studentIds||[]).indexOf(st.id) !== -1; });
    var qi = [], ai = [], ii = [];
    sSessions.forEach(function(s){
      if(s.reportEdited && s.report){
        var p = parseEditedReportForStudent(s.report, st.name);
        if(p && p.studyItems.length){
          p.studyItems.forEach(function(it){
            if(it.subject === 'quran') qi.push({type:it.type,text:it.text});
            else if(it.subject === 'arabic') ai.push(it.text);
            else ii.push(it.text);
          });
          return;
        }
      }
      var sd = s.data;
      if(sd && sd.students){
        var sData = sd.students.find(function(x){ return normalize(x.name) === normalize(st.name); });
        if(sData && sData.attendance === 'present'){
          if(sData.studyRows) sData.studyRows.forEach(function(row){
            if(row.form === 'free-text'){ if(row.text) qi.push({type:row.type,text:row.text}); return; }
            if(row.mainSurah){
              var rt;
              if(row.rangeType === 'surahs'){
                rt = 'من سورة ' + row.mainSurah;
                if(row.toSurah) rt += ' إلى سورة ' + row.toSurah;
              } else {
                rt = 'سورة ' + row.mainSurah;
                if(row.from && row.to) rt += ' من ' + row.from + ' حتى ' + row.to;
                else if(row.to) rt += ' حتى ' + row.to;
              }
              qi.push({type:row.type,text:rt});
            }
          });
          if(sData.arabicStudyRows) sData.arabicStudyRows.forEach(function(t){ if(t) ai.push(t); });
          if(sData.islamicStudyRows) sData.islamicStudyRows.forEach(function(t){ if(t) ii.push(t); });
        }
      }
    });
    var qg = {};
    qi.forEach(function(it){ if(!qg[it.type]) qg[it.type] = []; if(qg[it.type].indexOf(it.text) === -1) qg[it.type].push(it.text); });
    var ql = []; for(var t in qg) ql.push(t + ': ' + qg[t].join('، '));
    var aU = []; ai.forEach(function(t){ if(aU.indexOf(t) === -1) aU.push(t); });
    var iU = []; ii.forEach(function(t){ if(iU.indexOf(t) === -1) iU.push(t); });
    if(ql.length) draft += '🪻 القرآن الكريم: (' + ql.join(' - ') + ')\n';
    if(aU.length) draft += '🪻 اللغة العربية: (' + aU.join('، ') + ')\n';
    if(iU.length) draft += '🪻 العلوم الشرعية: (' + iU.join('، ') + ')\n';
    if(!ql.length && !aU.length && !iU.length) draft += '🪻 تمت دراسة الحصص المقررة\n';
    var sc = st.constants || [];
    sc.forEach(function(c){ if(c.key && c.value && normalize(c.key) !== 'المراجع' && normalize(c.key) !== 'مواعيد الأسرة') draft += c.key + ': ' + c.value + '\n'; });
    draft += '\n';
  });
  draft += '🔔مواعيد الأسرة خلال الشهر🔔\n' + familyTimes + '\n\n';
  if(gidC){
    var gO = data.groups.find(function(g){ return g.id === gidC; });
    if(gO && gO.constants){
      var oc = gO.constants.filter(function(c){ return c.key && c.value && normalize(c.key) !== 'المراجع' && normalize(c.key) !== 'مواعيد الأسرة'; });
      if(oc.length){
        draft += '📌 ملاحظات:\n';
        oc.forEach(function(c){ draft += '- ' + c.key + ': ' + c.value + '\n'; });
        draft += '\n';
      }
    }
  }
  if(teacherName) draft += '//' + teacherName + '//';
  return draft;
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    buildQuranSection,
    buildFreeTextSection,
    generateReportText,
    generateReport,
    getRowText,
    durationToWords,
    cleanGroupName,
    getSubjectLabel,
    getActiveSuffixes,
    getActiveFullTexts,
    parseEditedReportForStudent,
    generateMonthlyDraft,
    exportToWordFromState,
    exportToWord
  });
}
