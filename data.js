/* ═══════════════════════════════════════════════════════════
   data.js — الثوابت والبيانات الثابتة
   الإصدار: v22 — متصفح مدمج، تقويم بالنقاط، مفضلة بالبطاقات
   ═══════════════════════════════════════════════════════════ */

/* ─── Storage keys ─── */
const DATA_KEY = 'quran_data_v4';
const DRAFT_KEY = 'quran_draft_v4';
const LAST_BACKUP_KEY = 'quran_last_backup_v4';
const BACKUP_LOG_KEY = 'quran_backup_log_v1';
const BROWSER_FAVS_KEY = 'quran_browser_favs_v1';

/* ─── Months & days ─── */
const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAY_NAMES = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

/* ─── Icon size scale (unified) ─── */
const ICON_SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 };

/* ─── Favorite card colors (for letter fallback) ─── */
const FAV_COLORS = ['#2dd4bf','#60a5fa','#fbbf24','#f87171','#818cf8','#fb923c','#4ade80','#a78bfa'];

/* ─── Attendance labels ─── */
const ATT_LABELS = { present:'حاضر', excused:'غائب بعذر', absent:'غائب بدون عذر' };

/* ─── Row type labels ─── */
const ALL_ROW_TYPES = ['تسميع جديد','تسميع مراجعة','قراءة','حفظ جديد','مراجعة'];
const SECTION_LABELS = { study: 'دراسة اليوم', homework: 'المطلوب' };
const FORM_LABELS = { 'surah-ayat': 'سورة وآيات', 'free-text': 'نص حر' };
const MODE_LABELS = { full: 'سطر كامل', suffix: 'لاحقة' };
const SUBJECT_LABELS_ST = { quran: 'قرآن', arabic: 'عربية', islamic: 'شرعية' };

/* ─── Quran surahs (name → ayah count) ─── */
const quranData = {"الفاتحة":7,"البقرة":286,"آل عمران":200,"النساء":176,"المائدة":120,"الأنعام":165,"الأعراف":206,"الأنفال":75,"التوبة":129,"يونس":109,"هود":123,"يوسف":111,"الرعد":43,"إبراهيم":52,"الحجر":99,"النحل":128,"الإسراء":111,"الكهف":110,"مريم":98,"طه":135,"الأنبياء":112,"الحج":78,"المؤمنون":118,"النور":64,"الفرقان":77,"الشعراء":227,"النمل":93,"القصص":88,"العنكبوت":69,"الروم":60,"لقمان":34,"السجدة":30,"الأحزاب":73,"سبأ":54,"فاطر":45,"يس":83,"الصافات":182,"ص":88,"الزمر":75,"غافر":85,"فصلت":54,"الشورى":53,"الزخرف":89,"الدخان":59,"الجاثية":37,"الأحقاف":35,"محمد":38,"الفتح":29,"الحجرات":18,"ق":45,"الذاريات":60,"الطور":49,"النجم":62,"القمر":55,"الرحمن":78,"الواقعة":96,"الحديد":29,"المجادلة":22,"الحشر":24,"الممتحنة":13,"الصف":14,"الجمعة":11,"المنافقون":11,"التغابن":18,"الطلاق":12,"التحريم":12,"الملك":30,"القلم":52,"الحاقة":52,"المعارج":44,"نوح":28,"الجن":28,"المزمل":20,"المدثر":56,"القيامة":40,"الإنسان":31,"المرسلات":50,"النبأ":40,"النازعات":46,"عبس":42,"التكوير":29,"الانفطار":19,"المطففين":36,"الانشقاق":25,"البروج":22,"الطارق":17,"الأعلى":19,"الغاشية":26,"الفجر":30,"البلد":20,"الشمس":15,"الليل":21,"الضحى":11,"الشرح":8,"التين":8,"العلق":19,"القدر":5,"البينة":8,"الزلزلة":8,"العاديات":11,"القارعة":11,"التكاثر":8,"العصر":3,"الهمزة":9,"الفيل":5,"قريش":4,"الماعون":7,"الكوثر":3,"الكافرون":6,"النصر":3,"المسد":5,"الإخلاص":4,"الفلق":5,"الناس":6};
const surahNames = Object.keys(quranData);

/* ─── Timezones ─── */
const COUNTRY_TZ = [
  {ar:'مصر',en:'Egypt',tz:'Africa/Cairo',city:'القاهرة'},{ar:'السعودية',en:'Saudi Arabia',tz:'Asia/Riyadh',city:'الرياض'},{ar:'الإمارات',en:'UAE',tz:'Asia/Dubai',city:'دبي'},{ar:'الأردن',en:'Jordan',tz:'Asia/Amman',city:'عمّان'},{ar:'لبنان',en:'Lebanon',tz:'Asia/Beirut',city:'بيروت'},{ar:'العراق',en:'Iraq',tz:'Asia/Baghdad',city:'بغداد'},{ar:'سوريا',en:'Syria',tz:'Asia/Damascus',city:'دمشق'},{ar:'الكويت',en:'Kuwait',tz:'Asia/Kuwait',city:'مدينة الكويت'},{ar:'قطر',en:'Qatar',tz:'Asia/Qatar',city:'الدوحة'},{ar:'البحرين',en:'Bahrain',tz:'Asia/Bahrain',city:'المنامة'},{ar:'عُمان',en:'Oman',tz:'Asia/Muscat',city:'مسقط'},{ar:'اليمن',en:'Yemen',tz:'Asia/Aden',city:'عدن'},{ar:'فلسطين',en:'Palestine',tz:'Asia/Gaza',city:'غزة'},{ar:'السودان',en:'Sudan',tz:'Africa/Khartoum',city:'الخرطوم'},{ar:'ليبيا',en:'Libya',tz:'Africa/Tripoli',city:'طرابلس'},{ar:'تونس',en:'Tunisia',tz:'Africa/Tunis',city:'تونس'},{ar:'الجزائر',en:'Algeria',tz:'Africa/Algiers',city:'الجزائر'},{ar:'المغرب',en:'Morocco',tz:'Africa/Casablanca',city:'الدار البيضاء'},{ar:'موريتانيا',en:'Mauritania',tz:'Africa/Nouakchott',city:'نواكشوط'},{ar:'جيبوتي',en:'Djibouti',tz:'Africa/Djibouti',city:'جيبوتي'},{ar:'الصومال',en:'Somalia',tz:'Africa/Mogadishu',city:'مقديشو'},{ar:'نيجيريا',en:'Nigeria',tz:'Africa/Lagos',city:'لاغوس'},{ar:'كينيا',en:'Kenya',tz:'Africa/Nairobi',city:'نيروبي'},{ar:'إثيوبيا',en:'Ethiopia',tz:'Africa/Addis_Ababa',city:'أديس أبابا'},{ar:'جنوب أفريقيا',en:'South Africa',tz:'Africa/Johannesburg',city:'جوهانسبرغ'},{ar:'تركيا',en:'Turkey',tz:'Europe/Istanbul',city:'إسطنبول'},{ar:'إيران',en:'Iran',tz:'Asia/Tehran',city:'طهران'},{ar:'باكستان',en:'Pakistan',tz:'Asia/Karachi',city:'كراتشي'},{ar:'الهند',en:'India',tz:'Asia/Kolkata',city:'نيودلهي'},{ar:'بنغلاديش',en:'Bangladesh',tz:'Asia/Dhaka',city:'دكا'},{ar:'أفغانستان',en:'Afghanistan',tz:'Asia/Kabul',city:'كابول'},{ar:'ماليزيا',en:'Malaysia',tz:'Asia/Kuala_Lumpur',city:'كوالالمبور'},{ar:'إندونيسيا',en:'Indonesia',tz:'Asia/Jakarta',city:'جاكرتا'},{ar:'الفلبين',en:'Philippines',tz:'Asia/Manila',city:'مانيلا'},{ar:'الصين',en:'China',tz:'Asia/Shanghai',city:'بكين'},{ar:'اليابان',en:'Japan',tz:'Asia/Tokyo',city:'طوكيو'},{ar:'كوريا الجنوبية',en:'South Korea',tz:'Asia/Seoul',city:'سيول'},{ar:'المملكة المتحدة',en:'UK',tz:'Europe/London',city:'لندن'},{ar:'فرنسا',en:'France',tz:'Europe/Paris',city:'باريس'},{ar:'ألمانيا',en:'Germany',tz:'Europe/Berlin',city:'برلين'},{ar:'إيطاليا',en:'Italy',tz:'Europe/Rome',city:'روما'},{ar:'إسبانيا',en:'Spain',tz:'Europe/Madrid',city:'مدريد'},{ar:'هولندا',en:'Netherlands',tz:'Europe/Amsterdam',city:'أمستردام'},{ar:'بلجيكا',en:'Belgium',tz:'Europe/Brussels',city:'بروكسل'},{ar:'السويد',en:'Sweden',tz:'Europe/Stockholm',city:'ستوكهولم'},{ar:'النرويج',en:'Norway',tz:'Europe/Oslo',city:'أوسلو'},{ar:'الدنمارك',en:'Denmark',tz:'Europe/Copenhagen',city:'كوبنهاغن'},{ar:'فنلندا',en:'Finland',tz:'Europe/Helsinki',city:'هلسنكي'},{ar:'أيرلندا',en:'Ireland',tz:'Europe/Dublin',city:'دبلن'},{ar:'روسيا',en:'Russia',tz:'Europe/Moscow',city:'موسكو'},{ar:'الولايات المتحدة (شرقية)',en:'USA',tz:'America/New_York',city:'نيويورك'},{ar:'الولايات المتحدة (وسطى)',en:'USA',tz:'America/Chicago',city:'شيكاغو'},{ar:'الولايات المتحدة (هادئة)',en:'USA',tz:'America/Los_Angeles',city:'لوس أنجلوس'},{ar:'كندا (شرقية)',en:'Canada',tz:'America/Toronto',city:'تورونتو'},{ar:'كندا (هادئة)',en:'Canada',tz:'America/Vancouver',city:'فانكوفر'},{ar:'البرازيل',en:'Brazil',tz:'America/Sao_Paulo',city:'ساو باولو'},{ar:'أستراليا (شرقية)',en:'Australia',tz:'Australia/Sydney',city:'سيدني'},{ar:'نيوزيلندا',en:'New Zealand',tz:'Pacific/Auckland',city:'أوكلاند'}
];

/* ─── SVG Icons (Lucide, inline paths) ─── */
const SVG_ICONS = {
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'file-text':'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>',
  paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  calendar:'<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  'calendar-days':'<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'user-round':'<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'alarm-clock':'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>',
  timer:'<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
  play:'<polygon points="6 3 20 12 6 21 6 3"/>',
  pause:'<rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/>',
  square:'<rect width="18" height="18" x="3" y="3" rx="2"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  'plus-circle':'<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'x-circle':'<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  'check-circle':'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  'alert-triangle':'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
  hourglass:'<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  'trash-2':'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  'edit-3':'<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'bar-chart-3':'<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  list:'<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  copy:'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'share-2':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  archive:'<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  'chevron-left':'<path d="m15 18-6-6 6-6"/>',
  'chevron-right':'<path d="m9 18 6-6-6-6"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  'arrow-left':'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'arrow-right':'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'more-horizontal':'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'book-open':'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  bookmark:'<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  'graduation-cap':'<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  trophy:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'star-filled':'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/>',
  'file-word':'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h1l2 6 2-6h1"/>',
  'folder-open':'<path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'external-link':'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'log-in':'<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
  smartphone:'<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  'message-square':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'bell-off':'<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/>',
  'volume-2':'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  vibrate:'<path d="m2 8 2 2-2 2 2 2-2 2"/><path d="m22 8-2 2 2 2-2 2 2 2"/><rect width="8" height="14" x="8" y="5" rx="1"/>',
  globe:'<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  'map-pin':'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  'building-2':'<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  pin:'<line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  cake:'<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>',
  zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  palette:'<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  'arrow-up':'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  'arrow-down':'<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  grip:'<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
  'hard-drive':'<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
  package:'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  history:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'
};

/* ─── Design themes ─── */
const DESIGN_THEMES = ['mint','teal','ocean','indigo','ember'];

/* ─── IndexedDB keys ─── */
const IDB_NAME = 'quran_reports_db_v1';
const IDB_VERSION = 2;
const IDB_STORE = 'main';
const IDB_META_STORE = 'meta';
const IDB_ATTACHMENTS_STORE = 'attachments';
const MIGRATED_AT_KEY = 'quran_migrated_to_idb_at';
const MIGRATED_BACKUP_KEY = 'quran_data_v4_migrated_backup';