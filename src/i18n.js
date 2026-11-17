/* ═══════════════════════════════════════════════════════════
   src/i18n.js — قاموس التقارير والترجمة المحلية والأونلاين (Gemini)
   ═══════════════════════════════════════════════════════════ */

export const TRANS_CACHE_KEY = 'quran_trans_cache_v1';

export const SURAH_EN = {
  'الفاتحة': 'Al-Fatihah',
  'البقرة': 'Al-Baqarah',
  'آل عمران': 'Aal-Imran',
  'النساء': 'An-Nisa',
  'المائدة': "Al-Ma'idah",
  'الأنعام': "Al-An'am",
  'الأعراف': "Al-A'raf",
  'الأنفال': 'Al-Anfal',
  'التوبة': 'At-Tawbah',
  'يونس': 'Yunus',
  'هود': 'Hud',
  'يوسف': 'Yusuf',
  'الرعد': "Ar-Ra'd",
  'إبراهيم': 'Ibrahim',
  'الحجر': 'Al-Hijr',
  'النحل': 'An-Nahl',
  'الإسراء': 'Al-Isra',
  'الكهف': 'Al-Kahf',
  'مريم': 'Maryam',
  'طه': 'Taha',
  'الأنبياء': 'Al-Anbiya',
  'الحج': 'Al-Hajj',
  'المؤمنون': "Al-Mu'minun",
  'النور': 'An-Nur',
  'الفرقان': 'Al-Furqan',
  'الشعراء': "Ash-Shu'ara",
  'النمل': 'An-Naml',
  'القصص': 'Al-Qasas',
  'العنكبوت': 'Al-Ankabut',
  'الروم': 'Ar-Rum',
  'لقمان': 'Luqman',
  'السجدة': 'As-Sajdah',
  'الأحزاب': 'Al-Ahzab',
  'سبأ': 'Saba',
  'فاطر': 'Fatir',
  'يس': 'Ya-Sin',
  'الصافات': 'As-Saffat',
  'ص': 'Sad',
  'الزمر': 'Az-Zumar',
  'غافر': 'Ghafir',
  'فصلت': 'Fussilat',
  'الشورى': 'Ash-Shura',
  'الزخرف': 'Az-Zukhruf',
  'الدخان': 'Ad-Dukhan',
  'الجاثية': 'Al-Jathiyah',
  'الأحقاف': 'Al-Ahqaf',
  'محمد': 'Muhammad',
  'الفتح': 'Al-Fath',
  'الحجرات': 'Al-Hujurat',
  'ق': 'Qaf',
  'الذاريات': 'Adh-Dhariyat',
  'الطور': 'At-Tur',
  'النجم': 'An-Najm',
  'القمر': 'Al-Qamar',
  'الرحمن': 'Ar-Rahman',
  'الواقعة': "Al-Waqi'ah",
  'الحديد': 'Al-Hadid',
  'المجادلة': 'Al-Mujadilah',
  'الحشر': 'Al-Hashr',
  'الممتحنة': 'Al-Mumtahanah',
  'الصف': 'As-Saff',
  'الجمعة': "Al-Jumu'ah",
  'المنافقون': 'Al-Munafiqun',
  'التغابن': 'At-Taghabun',
  'الطلاق': 'At-Talaq',
  'التحريم': 'At-Tahrim',
  'الملك': 'Al-Mulk',
  'القلم': 'Al-Qalam',
  'الحاقة': 'Al-Haqqah',
  'المعارج': "Al-Ma'arij",
  'نوح': 'Nuh',
  'الجن': 'Al-Jinn',
  'المزمل': 'Al-Muzzammil',
  'المدثر': 'Al-Muddaththir',
  'القيامة': 'Al-Qiyamah',
  'الإنسان': 'Al-Insan',
  'المرسلات': 'Al-Mursalat',
  'النبأ': 'An-Naba',
  'النازعات': "An-Nazi'at",
  'عبس': 'Abasa',
  'التكوير': 'At-Takwir',
  'الانفطار': 'Al-Infitar',
  'المطففين': 'Al-Mutaffifin',
  'الانشقاق': 'Al-Inshiqaq',
  'البروج': 'Al-Buruj',
  'الطارق': 'At-Tariq',
  'الأعلى': "Al-A'la",
  'الغاشية': 'Al-Ghashiyah',
  'الفجر': 'Al-Fajr',
  'البلد': 'Al-Balad',
  'الشمس': 'Ash-Shams',
  'الليل': 'Al-Layl',
  'الضحى': 'Ad-Duha',
  'الشرح': 'Ash-Sharh',
  'التين': 'At-Tin',
  'العلق': 'Al-Alaq',
  'القدر': 'Al-Qadr',
  'البينة': 'Al-Bayyinah',
  'الزلزلة': 'Az-Zalzalah',
  'العاديات': 'Al-Adiyat',
  'القارعة': "Al-Qari'ah",
  'التكاثر': 'Al-Takathur',
  'العصر': 'Al-Asr',
  'الهمزة': 'Al-Humazah',
  'الفيل': 'Al-Fil',
  'قريش': 'Quraysh',
  'الماعون': "Al-Ma'un",
  'الكوثر': 'Al-Kawthar',
  'الكافرون': 'Al-Kafirun',
  'النصر': 'An-Nasr',
  'المسد': 'Al-Masad',
  'الإخلاص': 'Al-Ikhlas',
  'الفلق': 'Al-Falaq',
  'الناس': 'An-Nas'
};

var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const REPORT_I18N = {
  ar: {
    lessonReportTitle: 'تقرير حصة',
    group: 'المجموعة',
    date: 'التاريخ',
    lesson: 'الحصة',
    duration: 'المدة',
    subject: 'المادة',
    student: 'الطالب',
    studyToday: 'دراسة اليوم',
    homework: 'المطلوب (الواجب)',
    level: 'المستوى',
    notes: 'ملاحظات',
    teacher: 'المعلم',
    monthlyReportTitle: 'التقرير الشهري',
    studentName: 'اسم الطالب',
    hoursCount: 'عدد الساعات',
    references: 'المراجع',
    studiedDuringMonth: 'ما تم دراسته خلال الشهر',
    familySchedule: 'مواعيد الأسرة خلال الشهر',
    quran: 'القرآن الكريم',
    arabic: 'اللغة العربية',
    islamic: 'العلوم الشرعية',
    att: {
      present: 'حاضر',
      excused: 'غائب بعذر',
      absent: 'غائب بدون عذر'
    },
    levels: {
      'ممتاز': 'ممتاز',
      'جيد جدًّا': 'جيد جدًّا',
      'جيد جداً': 'جيد جداً',
      'جيد': 'جيد',
      'مقبول': 'مقبول',
      'ضعيف': 'ضعيف'
    },
    lessonOrders: {},
    rowTypes: {
      'تسميع جديد': 'تسميع جديد',
      'تسميع مراجعة': 'تسميع مراجعة',
      'قراءة': 'قراءة',
      'حفظ جديد': 'حفظ جديد',
      'مراجعة': 'مراجعة'
    },
    days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  },
  en: {
    lessonReportTitle: 'Lesson Report',
    group: 'Group',
    date: 'Date',
    lesson: 'Lesson',
    duration: 'Duration',
    subject: 'Subject',
    student: 'Student',
    studyToday: "Today's Study",
    homework: 'Homework',
    level: 'Level',
    notes: 'Notes',
    teacher: 'Teacher',
    monthlyReportTitle: 'Monthly Report',
    studentName: 'Student Name',
    hoursCount: 'Total Duration',
    references: 'References',
    studiedDuringMonth: 'Studied During the Month',
    familySchedule: 'Schedule During the Month',
    quran: 'Holy Quran',
    arabic: 'Arabic Language',
    islamic: 'Islamic Studies',
    att: {
      present: 'Present',
      excused: 'Excused Absence',
      absent: 'Absent'
    },
    levels: {
      'ممتاز': 'Excellent',
      'جيد جدًّا': 'Very Good',
      'جيد جداً': 'Very Good',
      'جيد': 'Good',
      'مقبول': 'Acceptable',
      'ضعيف': 'Weak'
    },
    lessonOrders: {
      'الأولى': '1st',
      'الثانية': '2nd',
      'الثالثة': '3rd',
      'الرابعة': '4th',
      'الخامسة': '5th',
      'السادسة': '6th',
      'السابعة': '7th',
      'الثامنة': '8th',
      'التاسعة': '9th',
      'العاشرة': '10th',
      'الحادية عشرة': '11th',
      'الثانية عشرة': '12th',
      'الثالثة عشرة': '13th',
      'الرابعة عشرة': '14th',
      'الخامسة عشرة': '15th',
      'السادسة عشرة': '16th',
      'السابعة عشرة': '17th',
      'الثامنة عشرة': '18th',
      'التاسعة عشرة': '19th',
      'العشرون': '20th',
      'الحادية والعشرون': '21st',
      'الثانية والعشرون': '22nd',
      'الثالثة والعشرون': '23rd',
      'الرابعة والعشرون': '24th',
      'الخامسة والعشرون': '25th',
      'السادسة والعشرون': '26th',
      'السابعة والعشرون': '27th',
      'الثامنة والعشرون': '28th',
      'التاسعة والعشرون': '29th',
      'الثلاثون': '30th'
    },
    rowTypes: {
      'تسميع جديد': 'New Recitation',
      'تسميع مراجعة': 'Revision Recitation',
      'قراءة': 'Reading',
      'حفظ جديد': 'New Memorization',
      'مراجعة': 'Revision'
    },
    days: DAYS_EN,
    daysEn: DAYS_EN
  }
};

export function translateSurahName(name, lang){
  if (!name) return '';
  if (lang !== 'en') return name;
  return SURAH_EN[name] || name;
}

export function translateLessonOrder(order, lang){
  if (!order) return '';
  if (lang !== 'en') return order;
  var trimmed = String(order).trim();
  return REPORT_I18N.en.lessonOrders[trimmed] || order;
}

export function translateLevel(level, lang){
  if (!level) return '';
  if (lang !== 'en') return level;
  var trimmed = String(level).trim();
  if (REPORT_I18N.en.levels[trimmed]) return REPORT_I18N.en.levels[trimmed];
  var normalized = trimmed.replace(/[\u064B-\u0652]/g, '');
  if (normalized === 'جيد جدا') return 'Very Good';
  return level;
}

export function translateDuration(durInput, lang){
  var d = parseInt(durInput, 10);
  if (lang !== 'en') {
    if (!d || d <= 0) return 'غير محددة';
    var ah = Math.floor(d / 60), am = d % 60;
    var ap = [];
    if (ah > 0) {
      if (ah === 1) ap.push('ساعة');
      else if (ah === 2) ap.push('ساعتان');
      else if (ah >= 3 && ah <= 10) ap.push(ah + ' ساعات');
      else ap.push(ah + ' ساعة');
    }
    if (am > 0) ap.push(am + ' دقيقة');
    return ap.join(' و ');
  }
  if (!d || d <= 0) return 'Not specified';
  var h = Math.floor(d / 60), m = d % 60;
  var parts = [];
  if (h > 0) parts.push(h === 1 ? '1 hour' : h + ' hours');
  if (m > 0) parts.push(m === 1 ? '1 minute' : m + ' minutes');
  return parts.join(' and ');
}

export function translateStandardRowType(type, lang){
  if (!type) return null;
  if (lang !== 'en') return type;
  var trimmed = String(type).trim();
  return REPORT_I18N.en.rowTypes[trimmed] || null;
}

function _loadTransCache(){
  try {
    if (typeof localStorage === 'undefined') return {};
    var raw = localStorage.getItem(TRANS_CACHE_KEY);
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

function _saveTransCache(cacheObj){
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TRANS_CACHE_KEY, JSON.stringify(cacheObj));
  } catch (e) {}
}

export function getCachedTranslation(text, lang){
  if (!text || !lang) return null;
  var cache = _loadTransCache();
  var bucket = cache[lang];
  if (!bucket || typeof bucket !== 'object') return null;
  var key = String(text).trim();
  return (typeof bucket[key] === 'string' && bucket[key].trim()) ? bucket[key] : null;
}

export function setCachedTranslation(text, lang, translated){
  if (!text || !lang || !translated) return;
  var cache = _loadTransCache();
  if (!cache[lang] || typeof cache[lang] !== 'object') cache[lang] = {};
  cache[lang][String(text).trim()] = String(translated).trim();
  _saveTransCache(cache);
}

export function clearTranslationCache(){
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TRANS_CACHE_KEY);
    }
  } catch (e) {}
}

async function _callGeminiGenerateJson(apiKey, promptText){
  var models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
  var lastErr = null;
  for (var i = 0; i < models.length; i++) {
    var model = models[i];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(apiKey);
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    if (res.status === 404 && i < models.length - 1) {
      lastErr = new Error('Model not found: ' + model);
      continue;
    }
    var json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    if (!res.ok) {
      var msg = (json && json.error && json.error.message) ? json.error.message : ('HTTP ' + res.status);
      throw new Error(msg);
    }
    var rawText = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
    if (!rawText) throw new Error('Empty response from Gemini');
    var cleaned = String(rawText).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
  }
  throw lastErr || new Error('Gemini request failed');
}

export async function translateTextsOnline(texts, targetLang){
  targetLang = targetLang || 'en';
  var map = {};
  if (!Array.isArray(texts) || !texts.length) {
    return { map: map, missingKey: false, offline: false, failed: false };
  }

  var unique = [];
  texts.forEach(function(item){
    if (item === null || typeof item === 'undefined') return;
    var s = String(item).trim();
    if (!s) return;
    if (unique.indexOf(s) === -1) unique.push(s);
  });

  if (!unique.length) {
    return { map: map, missingKey: false, offline: false, failed: false };
  }

  var uncached = [];
  unique.forEach(function(s){
    var cached = getCachedTranslation(s, targetLang);
    if (cached) {
      map[s] = cached;
    } else {
      map[s] = s;
      uncached.push(s);
    }
  });

  if (!uncached.length) {
    return { map: map, missingKey: false, offline: false, failed: false };
  }

  var apiKey = (typeof window !== 'undefined' && window.data && window.data.settings && window.data.settings.geminiApiKey || '').trim();
  var isOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);

  if (!apiKey || isOffline) {
    return { map: map, missingKey: !apiKey, offline: isOffline, failed: false };
  }

  var prompt = 'Translate the following Arabic strings into clear English for a Quran and Islamic studies teaching report.\n'
    + 'Rules:\n'
    + '- Return ONLY a single valid JSON object.\n'
    + '- The JSON object keys MUST be the EXACT original Arabic strings from the input array below, and each value MUST be its English translation.\n'
    + '- Use clean, natural English transliteration for person and group/family names (for example: "أحمد" -> "Ahmed", "أسرة النذير" -> "Al-Nadheer").\n'
    + '- Use clear pedagogical and Islamic terminology for teacher notes, custom lesson row labels, Arabic language topics, and Islamic studies lessons.\n'
    + 'Input JSON array:\n' + JSON.stringify(uncached);

  try {
    var parsed = await _callGeminiGenerateJson(apiKey, prompt);
    if (parsed && typeof parsed === 'object') {
      uncached.forEach(function(orig){
        var tr = parsed[orig];
        if (typeof tr === 'string' && tr.trim()) {
          var cleanTr = tr.trim();
          map[orig] = cleanTr;
          setCachedTranslation(orig, targetLang, cleanTr);
        }
      });
    }
    return { map: map, missingKey: false, offline: false, failed: false };
  } catch (err) {
    console.warn('translateTextsOnline failed:', err);
    return { map: map, missingKey: false, offline: false, failed: true, errorMsg: err && err.message ? err.message : 'Translation failed' };
  }
}

export async function testGeminiApiKey(apiKey){
  var key = String(apiKey || '').trim();
  if (!key) return { ok: false, error: 'يرجى إدخال مفتاح Gemini API أولاً' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: 'لا يوجد اتصال بالإنترنت' };
  }
  try {
    var prompt = 'Translate the Arabic name "أحمد" to English and return ONLY a JSON object like {"أحمد":"Ahmed"}.';
    var parsed = await _callGeminiGenerateJson(key, prompt);
    if (parsed && typeof parsed === 'object') {
      return { ok: true };
    }
    return { ok: false, error: 'استجابة غير متوقعة من الخادم' };
  } catch (err) {
    return { ok: false, error: (err && err.message) ? err.message : 'فشل الاتصال بـ Gemini' };
  }
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    TRANS_CACHE_KEY,
    SURAH_EN,
    REPORT_I18N,
    translateSurahName,
    translateLessonOrder,
    translateLevel,
    translateDuration,
    translateStandardRowType,
    getCachedTranslation,
    setCachedTranslation,
    clearTranslationCache,
    translateTextsOnline,
    testGeminiApiKey
  });
}
