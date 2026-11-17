/* ═══════════════════════════════════════════════════════════
   src/reports.js — إنشاء التقارير النصية وتصدير Word والتقارير الشهرية
   ═══════════════════════════════════════════════════════════ */

import { normalize, escapeHtml, escapeAttr, showNotify } from './utils.js';
import { data } from './storage.js';
import {
  REPORT_I18N,
  translateSurahName,
  translateLessonOrder,
  translateLevel,
  translateDuration,
  translateStandardRowType,
  translateTextsOnline
} from './i18n.js';

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

export function getRowText(row, customType, lang, onlineMap){
  var isEn = lang === 'en';
  onlineMap = onlineMap || {};
  var isFreeText = row.classList && row.classList.contains('free-text-row');
  var rawType = row.querySelector('.row-type-select').value;
  var type = customType || (isEn ? (translateStandardRowType(rawType, 'en') || onlineMap[rawType] || rawType) : rawType);
  if(isFreeText){
    var txt = (row.querySelector('.free-text-input') || {}).value || '';
    if(!txt.trim()) return '';
    var outTxt = isEn ? (onlineMap[txt.trim()] || txt) : txt;
    return '⏺ ' + type + ' ' + outTxt;
  }
  var rangeSel = row.querySelector('.range-type-select');
  var rt = rangeSel ? rangeSel.value : 'ayat';
  var surah = row.querySelector('.main-surah').value;
  if(!surah) return '';

  if(rt === 'surahs'){
    var ts = row.querySelector('.to-surah');
    var toSurah = ts ? ts.value : '';
    if(isEn){
      var sEn = translateSurahName(surah, 'en');
      var tEn = toSurah ? translateSurahName(toSurah, 'en') : '';
      if(toSurah && toSurah !== surah) return '⏺ ' + type + ' from Surah ' + sEn + ' to Surah ' + tEn;
      return '⏺ ' + type + ' Surah ' + sEn + ' (Full Surah)';
    }
    if(toSurah && toSurah !== surah) return '⏺ ' + type + ' من سورة ' + surah + ' إلى سورة ' + toSurah;
    return '⏺ ' + type + ' سورة ' + surah + ' كاملة';
  }

  var from = row.querySelector('.from-aya').value;
  var to = row.querySelector('.to-aya').value;
  var qData = window.quranData || {};
  var max = qData[surah];
  var text = '';
  var isReading = rawType.indexOf('قراءة') !== -1;
  if(from && to && parseInt(from) > parseInt(to)) return '';
  if(isEn){
    var surahEn = translateSurahName(surah, 'en');
    if(to && parseInt(to) === max){
      if(from && parseInt(from) > 1) text = ', from Ayah ' + from + ' to the end';
      else text = isReading ? ' to the end' : ' (Full Surah)';
    } else {
      if(from && to) text = ', Ayah ' + from + ' to ' + to;
      else if(from) text = ', from Ayah ' + from;
      else if(to) text = ', up to Ayah ' + to;
    }
    return '⏺ ' + type + ' Surah ' + surahEn + text;
  }
  if(to && parseInt(to) === max){
    if(from && parseInt(from) > 1) text = ' من الآية ' + from + ' إلى آخرها';
    else text = isReading ? ' إلى آخرها' : ' كلها';
  } else {
    if(from) text += ' من الآية ' + from;
    if(to) text += ' حتى الآية ' + to;
  }
  return '⏺ ' + type + ' سورة ' + surah + text;
}

export function buildQuranSection(card, sectionType, grpObj, studentObj, lang, onlineMap){
  var isEn = lang === 'en';
  onlineMap = onlineMap || {};
  var isStudy = sectionType === 'study';
  var containerSel = isStudy ? '.study-rows-container' : '.homework-rows-container';
  var rows = card.querySelectorAll(containerSel + ' .row-item');
  var lines = []; var counts = {}, cur = {};
  rows.forEach(function(r){ var t = r.querySelector('.row-type-select').value; counts[t]=(counts[t]||0)+1; cur[t]=1; });
  rows.forEach(function(r){
    var bt = r.querySelector('.row-type-select').value;
    var dt = isEn ? (translateStandardRowType(bt, 'en') || onlineMap[bt] || bt) : bt;
    if(counts[bt]>1) dt = dt + ' (' + (cur[bt]++) + ')';
    var l = getRowText(r, dt, lang, onlineMap);
    if(l){
      getActiveSuffixes(sectionType, bt, grpObj, studentObj).forEach(function(sfx){
        var stxt = isEn ? (onlineMap[(sfx.text || '').trim()] || sfx.text) : sfx.text;
        l += ' ' + stxt;
      });
      lines.push(l);
    }
  });
  var fulls = getActiveFullTexts(sectionType, 'quran', grpObj, studentObj);
  if(!lines.length && !fulls.length) return '';
  var out = (isEn ? REPORT_I18N.en.quran : 'القرآن الكريم') + ':\n';
  if(lines.length) out += lines.join('\n') + '\n';
  fulls.forEach(function(ft){
    var ftxt = isEn ? (onlineMap[(ft.text || '').trim()] || ft.text) : ft.text;
    out += '⏺ ' + ftxt + '\n';
  });
  return out;
}

export function buildFreeTextSection(card, sectionType, subjectKey, title, grpObj, studentObj, lang, onlineMap){
  var isEn = lang === 'en';
  onlineMap = onlineMap || {};
  var isStudy = sectionType === 'study';
  var cls = subjectKey === 'arabic' ? 'arabic' : 'islamic';
  var containerSel = isStudy ? '.study-' + cls + '-rows-container' : '.homework-' + cls + '-rows-container';
  var rows = card.querySelectorAll(containerSel + ' .arabic-row');
  var lines = [];
  rows.forEach(function(r){
    var v = r.querySelector('.arabic-input').value.trim();
    if(v){
      var tv = isEn ? (onlineMap[v] || v) : v;
      lines.push('⏺ ' + tv);
    }
  });
  var fulls = getActiveFullTexts(sectionType, subjectKey, grpObj, studentObj);
  if(!lines.length && !fulls.length) return '';
  var out = title + ':\n';
  if(lines.length) out += lines.join('\n') + '\n';
  fulls.forEach(function(ft){
    var ftxt = isEn ? (onlineMap[(ft.text || '').trim()] || ft.text) : ft.text;
    out += '⏺ ' + ftxt + '\n';
  });
  return out;
}

export function generateReportText(){
  var currentSubjects = window.currentSubjects || { quran: true, arabic: false, islamic: false };
  var groupRaw = document.getElementById('groupName').value;
  var group = cleanGroupName(groupRaw);
  var teacher = document.getElementById('teacherName').value;
  var teacherGender = (data.settings && data.settings.teacherGender) || 'male';
  var dateInput = document.getElementById('reportDate').value;
  var date = dateInput ? dateInput.split('-').reverse().join('/') : '';
  var lesson = document.getElementById('lessonOrder').value;
  var dur = durationToWords(document.getElementById('duration').value);
  var subjLabel = getSubjectLabel();
  var grpObj = data.groups.find(function(g){ return normalize(g.name) === normalize(groupRaw.trim()); });
  var groupConstants = grpObj ? (grpObj.constants || []) : [];
  
  var report = '╔══════════════════════════╗\n';
  report += '   📚 تقرير حصة\n';
  report += '╚══════════════════════════╝\n\n';
  report += '🏫 المجموعة: ' + group + '\n';
  report += '📅 التاريخ: ' + date + '\n';
  report += '📖 الحصة: ' + lesson + '\n';
  report += '⏱️ المدة: ' + dur + '\n';
  report += '📚 المادة: ' + subjLabel + '\n';
  
  groupConstants.forEach(function(c){
    if(c.key && c.value && normalize(c.key) !== 'المراجع' && normalize(c.key) !== 'مواعيد الأسرة'){
      report += '🔹 ' + c.key + ' : ' + c.value + '\n';
    }
  });
  report += '\n';
  
  var cards = document.querySelectorAll('.student-card');
  var attLabelsMale = window.ATT_LABELS || { present:'حاضر', excused:'غائب بعذر', absent:'غائب بدون عذر' };
  var attLabelsFemale = { present:'حاضرة', excused:'غائبة بعذر', absent:'غائبة بدون عذر' };
  
  for(var i=0; i<cards.length; i++){
    var card = cards[i];
    var name = card.querySelector('.student-name').value || '(بدون اسم)';
    var att = card.querySelector('.student-attendance').value;
    var studentObj = null;
    if(grpObj){ studentObj = data.students.find(function(s){ return s.groupId === grpObj.id && normalize(s.name) === normalize(name); }); }
    var cardGenderEl = card.querySelector('.student-gender');
    var studentGender = (cardGenderEl && cardGenderEl.value) || (studentObj && studentObj.gender) || 'male';
    var attLabels = studentGender === 'female' ? attLabelsFemale : attLabelsMale;
    var studentPrefix = studentGender === 'female' ? 'الطالبة: ' : 'الطالب: ';
    
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '👤 ' + studentPrefix + name + ' | ' + (att === 'present' ? '✅ ' : '❌ ') + attLabels[att] + '\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    
    if(att !== 'present'){ 
      report += '\n'; 
      continue; 
    }
    
    var studentConstants = studentObj ? (studentObj.constants || []) : [];
    var notesEl = card.querySelector('.student-notes');
    var notes = notesEl ? (notesEl.value || '').trim() : '';
    
    var studyText = '';
    if(currentSubjects.quran) studyText += buildQuranSection(card, 'study', grpObj, studentObj);
    if(currentSubjects.arabic) studyText += buildFreeTextSection(card, 'study', 'arabic', 'اللغة العربية', grpObj, studentObj);
    if(currentSubjects.islamic) studyText += buildFreeTextSection(card, 'study', 'islamic', 'العلوم الشرعية', grpObj, studentObj);
    
    if (studyText.trim()) {
      report += '📖 دراسة اليوم:\n' + studyText + '\n';
    }
    
    var homeText = '';
    if(currentSubjects.quran) homeText += buildQuranSection(card, 'homework', grpObj, studentObj);
    if(currentSubjects.arabic) homeText += buildFreeTextSection(card, 'homework', 'arabic', 'اللغة العربية', grpObj, studentObj);
    if(currentSubjects.islamic) homeText += buildFreeTextSection(card, 'homework', 'islamic', 'العلوم الشرعية', grpObj, studentObj);
    
    if (homeText.trim()) {
      report += '📝 المطلوب (الواجب):\n' + homeText + '\n';
    }
    
    report += '⭐ المستوى: ' + ((card.querySelector('.student-level')||{}).value || 'ممتاز') + '\n';
    if(notes) report += '📌 ملاحظات: ' + notes + '\n';
    if(studentConstants.length){ 
      studentConstants.forEach(function(c){ 
        if(c.key && c.value) report += '🔸 ' + c.key + ' : ' + c.value + '\n'; 
      }); 
    }
    report += '\n';
  }
  
  if(teacher.trim() !== '') {
    var teacherPrefix = teacherGender === 'female' ? '👩🏫 المعلمة: ' : '👨🏫 المعلم: ';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += teacherPrefix + teacher + '\n';
  }
  return report;
}

export async function generateReportTextAsync(lang){
  if(lang !== 'en') return { text: generateReportText(), meta: { missingKey: false, offline: false, failed: false } };

  var t = REPORT_I18N.en;
  var currentSubjects = window.currentSubjects || { quran: true, arabic: false, islamic: false };
  var groupRaw = document.getElementById('groupName').value;
  var group = cleanGroupName(groupRaw);
  var teacher = document.getElementById('teacherName').value;
  var teacherGender = (data.settings && data.settings.teacherGender) || 'male';
  var dateInput = document.getElementById('reportDate').value;
  var date = dateInput ? dateInput.split('-').reverse().join('/') : '';
  var lesson = translateLessonOrder(document.getElementById('lessonOrder').value, 'en');
  var dur = translateDuration(document.getElementById('duration').value, 'en');
  var subjParts = [];
  if(currentSubjects.quran) subjParts.push(t.quran);
  if(currentSubjects.arabic) subjParts.push(t.arabic);
  if(currentSubjects.islamic) subjParts.push(t.islamic);
  var subjLabel = subjParts.join(' & ');

  var grpObj = data.groups.find(function(g){ return normalize(g.name) === normalize(groupRaw.trim()); });
  var groupConstants = grpObj ? (grpObj.constants || []) : [];

  var stringsToTranslate = [];
  if(group) stringsToTranslate.push(group);
  if(teacher.trim()) stringsToTranslate.push(teacher.trim());
  groupConstants.forEach(function(c){
    if(c.key && c.value && normalize(c.key) !== 'المراجع' && normalize(c.key) !== 'مواعيد الأسرة'){
      stringsToTranslate.push(c.key);
      stringsToTranslate.push(c.value);
    }
  });

  var cards = document.querySelectorAll('.student-card');
  var cardInfos = [];
  for(var i = 0; i < cards.length; i++){
    var card = cards[i];
    var rawName = card.querySelector('.student-name').value || '';
    if(rawName.trim()) stringsToTranslate.push(rawName.trim());
    var att = card.querySelector('.student-attendance').value;
    var studentObj = null;
    if(grpObj){ studentObj = data.students.find(function(s){ return s.groupId === grpObj.id && normalize(s.name) === normalize(rawName); }); }
    cardInfos.push({ card: card, rawName: rawName, att: att, studentObj: studentObj });

    if(att !== 'present') continue;

    if(currentSubjects.quran){
      ['study', 'homework'].forEach(function(sec){
        var cSel = sec === 'study' ? '.study-rows-container' : '.homework-rows-container';
        card.querySelectorAll(cSel + ' .row-item').forEach(function(r){
          var bt = r.querySelector('.row-type-select').value;
          if(bt && !translateStandardRowType(bt, 'en')) stringsToTranslate.push(bt);
          if(r.classList && r.classList.contains('free-text-row')){
            var fTxt = ((r.querySelector('.free-text-input') || {}).value || '').trim();
            if(fTxt) stringsToTranslate.push(fTxt);
          }
          getActiveSuffixes(sec, bt, grpObj, studentObj).forEach(function(sfx){
            if(sfx.text && sfx.text.trim()) stringsToTranslate.push(sfx.text.trim());
          });
        });
        getActiveFullTexts(sec, 'quran', grpObj, studentObj).forEach(function(ft){
          if(ft.text && ft.text.trim()) stringsToTranslate.push(ft.text.trim());
        });
      });
    }
    if(currentSubjects.arabic){
      ['.study-arabic-rows-container', '.homework-arabic-rows-container'].forEach(function(sel, idx){
        card.querySelectorAll(sel + ' .arabic-row').forEach(function(r){
          var v = r.querySelector('.arabic-input').value.trim();
          if(v) stringsToTranslate.push(v);
        });
        getActiveFullTexts(idx === 0 ? 'study' : 'homework', 'arabic', grpObj, studentObj).forEach(function(ft){
          if(ft.text && ft.text.trim()) stringsToTranslate.push(ft.text.trim());
        });
      });
    }
    if(currentSubjects.islamic){
      ['.study-islamic-rows-container', '.homework-islamic-rows-container'].forEach(function(sel, idx){
        card.querySelectorAll(sel + ' .arabic-row').forEach(function(r){
          var v = r.querySelector('.arabic-input').value.trim();
          if(v) stringsToTranslate.push(v);
        });
        getActiveFullTexts(idx === 0 ? 'study' : 'homework', 'islamic', grpObj, studentObj).forEach(function(ft){
          if(ft.text && ft.text.trim()) stringsToTranslate.push(ft.text.trim());
        });
      });
    }

    var notesEl = card.querySelector('.student-notes');
    var notes = notesEl ? (notesEl.value || '').trim() : '';
    if(notes) stringsToTranslate.push(notes);

    var studentConstants = studentObj ? (studentObj.constants || []) : [];
    studentConstants.forEach(function(c){
      if(c.key && c.value){
        stringsToTranslate.push(c.key);
        stringsToTranslate.push(c.value);
      }
    });
  }

  var res = await translateTextsOnline(stringsToTranslate, 'en');
  var map = res.map || {};

  var groupEn = group ? (map[group] || group) : '';
  var report = '╔══════════════════════════╗\n';
  report += '   📚 ' + t.lessonReportTitle + '\n';
  report += '╚══════════════════════════╝\n\n';
  report += '🏫 ' + t.group + ': ' + groupEn + '\n';
  report += '📅 ' + t.date + ': ' + date + '\n';
  report += '📖 ' + t.lesson + ': ' + lesson + '\n';
  report += '⏱️ ' + t.duration + ': ' + dur + '\n';
  report += '📚 ' + t.subject + ': ' + subjLabel + '\n';

  groupConstants.forEach(function(c){
    if(c.key && c.value && normalize(c.key) !== 'المراجع' && normalize(c.key) !== 'مواعيد الأسرة'){
      var tk = map[String(c.key).trim()] || c.key;
      var tv = map[String(c.value).trim()] || c.value;
      report += '🔹 ' + tk + ' : ' + tv + '\n';
    }
  });
  report += '\n';

  cardInfos.forEach(function(info){
    var card = info.card;
    var att = info.att;
    var studentObj = info.studentObj;
    var displayName = info.rawName.trim() ? (map[info.rawName.trim()] || info.rawName.trim()) : '(No name)';
    var attLabel = (t.att && t.att[att]) || att;

    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '👤 ' + t.student + ': ' + displayName + ' | ' + (att === 'present' ? '✅ ' : '❌ ') + attLabel + '\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    if(att !== 'present'){
      report += '\n';
      return;
    }

    var studentConstants = studentObj ? (studentObj.constants || []) : [];
    var notesEl = card.querySelector('.student-notes');
    var notes = notesEl ? (notesEl.value || '').trim() : '';

    var studyText = '';
    if(currentSubjects.quran) studyText += buildQuranSection(card, 'study', grpObj, studentObj, 'en', map);
    if(currentSubjects.arabic) studyText += buildFreeTextSection(card, 'study', 'arabic', t.arabic, grpObj, studentObj, 'en', map);
    if(currentSubjects.islamic) studyText += buildFreeTextSection(card, 'study', 'islamic', t.islamic, grpObj, studentObj, 'en', map);

    if(studyText.trim()){
      report += '📖 ' + t.studyToday + ':\n' + studyText + '\n';
    }

    var homeText = '';
    if(currentSubjects.quran) homeText += buildQuranSection(card, 'homework', grpObj, studentObj, 'en', map);
    if(currentSubjects.arabic) homeText += buildFreeTextSection(card, 'homework', 'arabic', t.arabic, grpObj, studentObj, 'en', map);
    if(currentSubjects.islamic) homeText += buildFreeTextSection(card, 'homework', 'islamic', t.islamic, grpObj, studentObj, 'en', map);

    if(homeText.trim()){
      report += '📝 ' + t.homework + ':\n' + homeText + '\n';
    }

    var rawLevel = (card.querySelector('.student-level') || {}).value || 'ممتاز';
    report += '⭐ ' + t.level + ': ' + translateLevel(rawLevel, 'en') + '\n';
    if(notes){
      var tNotes = map[notes] || notes;
      report += '📌 ' + t.notes + ': ' + tNotes + '\n';
    }
    if(studentConstants.length){
      studentConstants.forEach(function(c){
        if(c.key && c.value){
          var tk = map[String(c.key).trim()] || c.key;
          var tv = map[String(c.value).trim()] || c.value;
          report += '🔸 ' + tk + ' : ' + tv + '\n';
        }
      });
    }
    report += '\n';
  });

  if(teacher.trim() !== ''){
    var tTeacher = map[teacher.trim()] || teacher;
    var teacherPrefix = teacherGender === 'female' ? '👩🏫 ' : '👨🏫 ';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += teacherPrefix + t.teacher + ': ' + tTeacher + '\n';
  }

  return { text: report, meta: res };
}

export async function generateReport(lang){
  lang = lang || 'ar';
  var out = document.getElementById('output');
  var so = document.getElementById('sheetOutput');
  if(lang !== 'en'){
    var text = generateReportText();
    if(out){ out.value = text; out.dir = 'rtl'; }
    if(so){ so.value = text; so.dir = 'rtl'; }
    showNotify('تم إنشاء التقرير');
    if(window.innerWidth < 1024 && typeof window.openReportSheet === 'function'){
      window.openReportSheet();
    }
    return;
  }

  var btnEn = document.getElementById('btnGenReportEn');
  if(btnEn) btnEn.disabled = true;
  showNotify('⏳ جاري إنشاء التقرير الإنجليزي...');
  try {
    var result = await generateReportTextAsync('en');
    var enText = result.text || '';
    var meta = result.meta || {};
    if(out){ out.value = enText; out.dir = 'ltr'; }
    if(so){ so.value = enText; so.dir = 'ltr'; }
    if(meta.missingKey){
      showNotify('تم إنشاء التقرير (أضف مفتاح Gemini في الإعدادات لترجمة الأسماء والملاحظات الحرة)');
    } else if(meta.offline){
      showNotify('تم إنشاء التقرير (بدون إنترنت — تم استخدام الترجمة المحلية)');
    } else if(meta.failed){
      showNotify('تم إنشاء التقرير (تعذرت الترجمة الأونلاين؛ تحقق من المفتاح)');
    } else {
      showNotify('✅ تم إنشاء التقرير الإنجليزي');
    }
    if(window.innerWidth < 1024 && typeof window.openReportSheet === 'function'){
      window.openReportSheet();
    }
  } finally {
    if(btnEn) btnEn.disabled = false;
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
  var tGender = state.teacherGender || (data.settings && data.settings.teacherGender) || 'male';

  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:10px}th{background:#f2f2f2}</style></head><body><h2>تقرير الحصة</h2><p><b>الجروب:</b> '+escapeHtml(group)+'</p><p><b>التاريخ:</b> '+escapeHtml(date)+'</p><p><b>الحصة:</b> '+escapeHtml(state.lesson||'')+'</p><p><b>المدة:</b> '+escapeHtml(dur)+'</p><p><b>المادة:</b> '+escapeHtml(subj)+'</p><p><b>'+(tGender==='female'?'المعلمة:':'المعلم:')+'</b> '+escapeHtml(teacher)+'</p><table><thead><tr><th>الطالب</th><th>الحضور</th><th>دراسة اليوم</th><th>المطلوب</th><th>المستوى</th></tr></thead><tbody>';
  (state.students||[]).forEach(function(st){
    var sl = [], hl = [];
    var studentObj = grpObj ? data.students.find(function(x){ return x.groupId === grpObj.id && normalize(x.name) === normalize(st.name || ''); }) : null;
    var stGender = st.gender || (studentObj && studentObj.gender) || 'male';
    var stAttLabels = stGender === 'female' ? { present:'حاضرة', excused:'غائبة بعذر', absent:'غائبة بدون عذر' } : attLabels;
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
    html += '<tr><td><b>'+escapeHtml(st.name||'—')+'</b></td><td>'+stAttLabels[st.attendance||'present']+'</td><td>'+(sl.join('<br>')||'—')+'</td><td>'+(hl.join('<br>')||'—')+'</td><td>'+levelDisplay+'</td></tr>';
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
  if(ownerType === 'student' && targetStudents.length > 0) draft += (targetStudents[0].gender === 'female' ? '🔹 اسم الطالبة: [ ' : '🔹 اسم الطالب: [ ') + targetStudents[0].name + ' ]\n';
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

export async function generateMonthlyDraftAsync(ownerType, ownerId, year, month, lang){
  if(lang !== 'en') return generateMonthlyDraft(ownerType, ownerId, year, month);

  var t = REPORT_I18N.en;
  var targetSessions = data.sessions.filter(function(s){
    if(!s.date) return false;
    var y = parseInt(s.date.slice(0,4)); var m = parseInt(s.date.slice(5,7));
    return y === year && m === month && (ownerType === 'group' ? s.groupId === ownerId : (s.studentIds||[]).indexOf(ownerId) !== -1);
  });
  targetSessions.sort(function(a,b){ return a.date.localeCompare(b.date); });
  if(targetSessions.length === 0) return 'No sessions recorded for this month.';

  var totalMins = targetSessions.reduce(function(sum, s){ return sum + (parseInt(s.duration) || 0); }, 0);
  var durText = translateDuration(totalMins, 'en');
  var groupName = ''; var teacherName = data.settings.teacherName || ''; var targetStudents = []; var gidC = null;
  if(ownerType === 'group'){
    var g = data.groups.find(function(x){ return x.id === ownerId; });
    groupName = g ? g.name : ''; gidC = ownerId;
    targetStudents = data.students.filter(function(s){ return s.groupId === ownerId && targetSessions.some(function(ts){ return (ts.studentIds||[]).indexOf(s.id) !== -1; }); });
  } else {
    var stSingle = data.students.find(function(x){ return x.id === ownerId; });
    var gSingle = stSingle ? data.groups.find(function(x){ return x.id === stSingle.groupId; }) : null;
    groupName = gSingle ? gSingle.name : ''; gidC = gSingle ? gSingle.id : null;
    targetStudents = stSingle ? [stSingle] : [];
  }

  var getConstantFn = window.getConstant || function(type, id, key, fallback){ return fallback; };
  var refs = gidC ? getConstantFn('group', gidC, 'المراجع', 'القرآن الكريم - منهج اللغة العربية') : 'القرآن الكريم - منهج اللغة العربية';
  var familyTimes = gidC ? getConstantFn('group', gidC, 'مواعيد الأسرة', '') : '';
  var groupObj = gidC ? data.groups.find(function(x){ return x.id === gidC; }) : null;
  var groupExtraConstants = (groupObj && groupObj.constants)
    ? groupObj.constants.filter(function(c){ return c.key && c.value && normalize(c.key) !== 'المراجع' && normalize(c.key) !== 'مواعيد الأسرة'; })
    : [];

  var cleanGrp = cleanGroupName(groupName);
  var stringsToTranslate = [];
  if(cleanGrp) stringsToTranslate.push(cleanGrp);
  if(teacherName.trim()) stringsToTranslate.push(teacherName.trim());
  if(refs && refs !== 'القرآن الكريم - منهج اللغة العربية') stringsToTranslate.push(refs);
  if(familyTimes && familyTimes !== '[أضف المواعيد هنا]') stringsToTranslate.push(familyTimes);
  groupExtraConstants.forEach(function(c){
    stringsToTranslate.push(c.key);
    stringsToTranslate.push(c.value);
  });

  var studentBlocks = targetStudents.map(function(st){
    if(st.name) stringsToTranslate.push(st.name);
    var sSessions = targetSessions.filter(function(s){ return (s.studentIds||[]).indexOf(st.id) !== -1; });
    var qi = [], ai = [], ii = [];
    sSessions.forEach(function(s){
      if(s.reportEdited && s.report){
        var p = parseEditedReportForStudent(s.report, st.name);
        if(p && p.studyItems.length){
          p.studyItems.forEach(function(it){
            if(it.type && !translateStandardRowType(it.type, 'en')) stringsToTranslate.push(it.type);
            if(it.text) stringsToTranslate.push(it.text);
            if(it.subject === 'quran') qi.push({ type: it.type, rawFreeText: it.text });
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
            if(row.type && !translateStandardRowType(row.type, 'en')) stringsToTranslate.push(row.type);
            if(row.form === 'free-text'){
              if(row.text){
                stringsToTranslate.push(row.text);
                qi.push({ type: row.type, rawFreeText: row.text });
              }
              return;
            }
            if(row.mainSurah){
              var rt;
              var mSurah = translateSurahName(row.mainSurah, 'en');
              if(row.rangeType === 'surahs'){
                rt = 'from Surah ' + mSurah;
                if(row.toSurah) rt += ' to Surah ' + translateSurahName(row.toSurah, 'en');
              } else {
                rt = 'Surah ' + mSurah;
                if(row.from && row.to) rt += ' from ' + row.from + ' to ' + row.to;
                else if(row.to) rt += ' up to ' + row.to;
              }
              qi.push({ type: row.type, text: rt });
            }
          });
          if(sData.arabicStudyRows) sData.arabicStudyRows.forEach(function(txt){ if(txt){ stringsToTranslate.push(txt); ai.push(txt); } });
          if(sData.islamicStudyRows) sData.islamicStudyRows.forEach(function(txt){ if(txt){ stringsToTranslate.push(txt); ii.push(txt); } });
        }
      }
    });

    var sc = (st.constants || []).filter(function(c){ return c.key && c.value && normalize(c.key) !== 'المراجع' && normalize(c.key) !== 'مواعيد الأسرة'; });
    sc.forEach(function(c){ stringsToTranslate.push(c.key); stringsToTranslate.push(c.value); });

    return { st: st, qi: qi, ai: ai, ii: ii, sc: sc };
  });

  var res = await translateTextsOnline(stringsToTranslate, 'en');
  var map = res.map || {};

  var grpEn = cleanGrp ? (map[cleanGrp] || cleanGrp) : '';
  var refsEn = (refs === 'القرآن الكريم - منهج اللغة العربية')
    ? (t.quran + ' - ' + t.arabic + ' Curriculum')
    : (map[refs.trim()] || refs);
  var familyEn = (!familyTimes || familyTimes === '[أضف المواعيد هنا]')
    ? '[Add schedule here]'
    : (map[familyTimes.trim()] || familyTimes);

  var draft = '📋 ' + t.monthlyReportTitle + '\n\n';
  draft += '🔹 ' + t.group + ': [ ' + grpEn + ' ]\n';
  if(ownerType === 'student' && targetStudents.length > 0){
    var st0Name = map[targetStudents[0].name.trim()] || targetStudents[0].name;
    draft += '🔹 ' + t.studentName + ': [ ' + st0Name + ' ]\n';
  }
  draft += '🔹 ' + t.subject + ': [ ' + t.quran + ' & ' + t.arabic + ' ]\n';
  draft += '🔹 ' + t.hoursCount + ': [ ' + durText + ' ]\n';
  draft += '🔹 ' + t.references + ': [ ' + refsEn + ' ]\n\n';
  draft += '📖 ' + t.studiedDuringMonth + ':\n\n';

  studentBlocks.forEach(function(blk){
    var stEn = map[blk.st.name.trim()] || blk.st.name;
    draft += stEn + ':\n';
    var qg = {};
    blk.qi.forEach(function(it){
      var tLabel = translateStandardRowType(it.type, 'en') || map[String(it.type || '').trim()] || it.type;
      var itemText = it.rawFreeText ? (map[String(it.rawFreeText).trim()] || it.rawFreeText) : it.text;
      if(!qg[tLabel]) qg[tLabel] = [];
      if(qg[tLabel].indexOf(itemText) === -1) qg[tLabel].push(itemText);
    });
    var ql = [];
    for(var tp in qg) ql.push(tp + ': ' + qg[tp].join(', '));
    var aU = [];
    blk.ai.forEach(function(x){ var tx = map[String(x).trim()] || x; if(aU.indexOf(tx) === -1) aU.push(tx); });
    var iU = [];
    blk.ii.forEach(function(x){ var tx = map[String(x).trim()] || x; if(iU.indexOf(tx) === -1) iU.push(tx); });

    if(ql.length) draft += '🪻 ' + t.quran + ': (' + ql.join(' - ') + ')\n';
    if(aU.length) draft += '🪻 ' + t.arabic + ': (' + aU.join(', ') + ')\n';
    if(iU.length) draft += '🪻 ' + t.islamic + ': (' + iU.join(', ') + ')\n';
    if(!ql.length && !aU.length && !iU.length) draft += '🪻 Scheduled lessons completed\n';

    blk.sc.forEach(function(c){
      draft += (map[String(c.key).trim()] || c.key) + ': ' + (map[String(c.value).trim()] || c.value) + '\n';
    });
    draft += '\n';
  });

  draft += '🔔' + t.familySchedule + '🔔\n' + familyEn + '\n\n';
  if(groupExtraConstants.length){
    draft += '📌 ' + t.notes + ':\n';
    groupExtraConstants.forEach(function(c){
      draft += '- ' + (map[String(c.key).trim()] || c.key) + ': ' + (map[String(c.value).trim()] || c.value) + '\n';
    });
    draft += '\n';
  }
  if(teacherName.trim()){
    draft += '//' + (map[teacherName.trim()] || teacherName) + '//';
  }
  return draft;
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    buildQuranSection,
    buildFreeTextSection,
    generateReportText,
    generateReportTextAsync,
    generateReport,
    getRowText,
    durationToWords,
    cleanGroupName,
    getSubjectLabel,
    getActiveSuffixes,
    getActiveFullTexts,
    parseEditedReportForStudent,
    generateMonthlyDraft,
    generateMonthlyDraftAsync,
    exportToWordFromState,
    exportToWord
  });
}
