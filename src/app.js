/* ═══════════════════════════════════════════════════════════
   src/app.js — نقطة الدخول الرئيسية وواجهة المستخدم
   ═══════════════════════════════════════════════════════════ */

import {
  genId,
  escapeHtml,
  escapeAttr,
  normalize,
  safe,
  showNotify,
  deepClone,
  formatBytes,
  formatDuration,
  fmtDate,
  toDateISO,
  currentAttachments,
  setCurrentAttachments
} from './utils.js';

import {
  idbOpen,
  idbGet,
  idbSet,
  idbDelete,
  idbAttachmentSet,
  idbAttachmentGet,
  idbAttachmentDelete,
  compressImage,
  _idb,
  _idbReady
} from './idb.js';

import {
  getTeacherTimezone,
  getTimezoneOffsetMinutes,
  convertTimeBetweenTimezones,
  formatUtcOffset,
  isDSTActive,
  formatTimeDisplay,
  getCurrentClockText
} from './timezone.js';

import {
  data,
  setData,
  loadData,
  saveData,
  saveDataAsync,
  _doSave,
  migrateToIndexedDB,
  initDataLayer,
  migrateScheduleRulesCreatedAt,
  migrateOldData,
  migrateInvalidUUIDs,
  queueDelete,
  loadPendingDeletes,
  clearPendingDeletes,
  flushPendingDeletesToCloud,
  _pendingDeletes
} from './storage.js';

import {
  supabaseClient,
  currentUser,
  getCurrentUser,
  checkSession,
  showAuthOverlay,
  skipAuth,
  handleAuth,
  scheduleAutoSync,
  setupRealtimeSync,
  teardownRealtimeSync,
  uploadToCloud,
  downloadFromCloud,
  restorePreDownloadBackup,
  handleLogout,
  openTrashModal,
  restoreTrashItem,
  cleanupOldTrash
} from './sync.js';

import {
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
  removeAppointmentException,
  getPendingCount,
  calendarViewDate,
  currentCalendarView,
  formatMobileTime,
  shortGroupName
} from './calendar.js';

import {
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
  generateMonthlyDraftAsync,
  exportToWordFromState,
  exportToWord
} from './reports.js';

import {
  REPORT_I18N,
  translateTextsOnline,
  testGeminiApiKey,
  clearTranslationCache
} from './i18n.js';

import {
  browserState,
  createBrowserTab,
  setActiveTab,
  renderTabsBar,
  browserNewTab,
  closeBrowserTab,
  renderTabContent,
  navigateTab,
  goTabHome,
  renderBookmarksBar,
  browserNavigateInActive,
  saveBrowserState,
  loadBrowserState,
  detectConference,
  isMobile,
  getDomain,
  getFavColor,
  getFavIcon,
  loadFavorites,
  saveFavorites,
  isFavorited,
  openLessonLink,
  openExternalUrl,
  openInAppBrowser,
  closeBrowser,
  showBrowserFavorites,
  renderBrowserFavorites,
  openFavoriteUrl,
  removeFavorite,
  setupFavDragDrop,
  showFavCardMenu,
  saveFavoriteEdit,
  promptAddFavorite,
  saveNewFavorite,
  toggleBrowserFavorite,
  updateBrowserFavButton,
  normalizeBrowserUrl,
  browserNavigate,
  navigateBrowser,
  tryBuildDeepLink,
  tryDeepLinkOrFallback,
  loadBrowserUrl,
  updateBrowserTitle,
  showBrowserFallback,
  browserOpenExternal,
  browserGoHome,
  browserBack,
  browserForward,
  browserReload,
  updateBrowserNavButtons,
  showBrowserToast,
  renderSettingsFavs,
  normalizeUrl
} from './browser.js';

if (typeof window !== 'undefined') {
  window.addEventListener('error', function(e){
    var bar = document.getElementById('errorBar');
    if(bar){ bar.style.display = 'block'; bar.innerHTML += '<div>❌ ' + (e.message||'خطأ') + ' (line ' + (e.lineno||'?') + ')</div>'; }
    console.error('Global error:', e.error || e.message);
  });
}

/* ═══════════════ SVG ICON SYSTEM ═══════════════ */
export function svgIcon(name, size){
  var icons = (typeof window !== 'undefined' && window.SVG_ICONS) ? window.SVG_ICONS : {};
  var sizes = (typeof window !== 'undefined' && window.ICON_SIZES) ? window.ICON_SIZES : { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 };
  var c = icons[name] || '';
  size = size || sizes.md;
  var sw = (size <= sizes.sm) ? 1.75 : 2;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0">'+c+'</svg>';
}

export function hydrateIcons(root){
  var sizes = (typeof window !== 'undefined' && window.ICON_SIZES) ? window.ICON_SIZES : { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 };
  (root || document).querySelectorAll('[data-icon]').forEach(function(el){
    if (el.dataset.iconHydrated) return;
    var name = el.dataset.icon;
    var size = parseInt(el.dataset.iconSize, 10) || sizes.md;
    el.innerHTML = svgIcon(name, size);
    el.dataset.iconHydrated = '1';
  });
}

export var _iconObserver = null;

export function setupIconObserver(){
  if (_iconObserver || !window.MutationObserver) return;
  _iconObserver = new MutationObserver(function(mutations){
    var needs = false;
    for (var i = 0; i < mutations.length && !needs; i++){
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++){
        var n = added[j];
        if (n.nodeType !== 1) continue;
        if (n.hasAttribute && n.hasAttribute('data-icon')) { needs = true; break; }
        if (n.querySelector && n.querySelector('[data-icon]:not([data-icon-hydrated])')) { needs = true; break; }
      }
    }
    if (needs) hydrateIcons();
  });
  _iconObserver.observe(document.body, { childList: true, subtree: true });
}

/* ═══════════════ THEME ═══════════════ */
export function applyDesignTheme(themeId){
  var designThemes = window.DESIGN_THEMES || ['mint','teal','ocean','indigo','ember'];
  var id = (designThemes.indexOf(themeId) === -1) ? 'teal' : themeId;
  var root = document.documentElement;
  designThemes.forEach(function(t){ root.classList.remove('theme-' + t); });
  root.classList.add('theme-' + id);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    var colors = {mint:'#fafafa',teal:'#0a0a0b',ocean:'#f8fafc',indigo:'#0a0a0f',ember:'#0f0c0a'};
    meta.setAttribute('content', colors[id] || '#0a0a0b');
  }
}

export function changeDesignTheme(themeId){
  if (!data.settings) data.settings = {};
  data.settings.designTheme = themeId;
  saveData();
  applyDesignTheme(themeId);
  updateThemeSelector();
  showNotify('🎨 تم تطبيق التصميم');
}

export function updateThemeSelector(){
  document.querySelectorAll('.theme-card').forEach(function(card){
    card.classList.toggle('active', card.dataset.theme === (data.settings.designTheme || 'teal'));
  });
}

/* ═══ Dark Mode Auto ═══ */
export function _timeToMin(hm){
  if(!hm) return 0;
  var p = String(hm).split(':').map(Number);
  return (p[0]||0)*60 + (p[1]||0);
}

export function isDayTime(){
  var now = new Date();
  var cm = now.getHours()*60 + now.getMinutes();
  var ds = _timeToMin(data.settings.dayStart || '06:00');
  var ns = _timeToMin(data.settings.nightStart || '19:00');
  if(ds < ns) return cm >= ds && cm < ns;
  return cm >= ds || cm < ns; /* فترة ليلية تعبر منتصف الليل */
}

export function applyAutoTheme(){
  if(data.settings.themeMode !== 'auto') return;
  var target = isDayTime()
    ? (data.settings.dayTheme || 'mint')
    : (data.settings.nightTheme || 'teal');
  if(data.settings.designTheme === target){
    updateThemeSelector();
    return;
  }
  data.settings.designTheme = target;
  saveData();
  applyDesignTheme(target);
  updateThemeSelector();
  var modeSel = document.getElementById('themeModeSelect');
  if (modeSel) modeSel.value = 'auto';
}

export function saveThemeAutoSettings(){
  var mode = (document.getElementById('themeModeSelect') || {}).value || 'manual';
  var dayT = (document.getElementById('dayThemeSelect') || {}).value || 'mint';
  var nightT = (document.getElementById('nightThemeSelect') || {}).value || 'teal';
  var dS = (document.getElementById('dayStartInput') || {}).value || '06:00';
  var nS = (document.getElementById('nightStartInput') || {}).value || '19:00';
  data.settings.themeMode = mode;
  data.settings.dayTheme = dayT;
  data.settings.nightTheme = nightT;
  data.settings.dayStart = dS;
  data.settings.nightStart = nS;
  saveData();
  if(mode === 'auto') applyAutoTheme();
  showNotify('✅ تم حفظ إعدادات الوضع');
  renderThemeAutoUI();
}

export function renderThemeAutoUI(){
  var box = document.getElementById('themeAutoBox');
  if(!box) return;
  var m = data.settings.themeMode || 'manual';
  box.innerHTML =
    '<div class="form-field">'
      + '<label>وضع التبديل</label>'
      + '<select id="themeModeSelect" onchange="saveThemeAutoSettings()">'
      +   '<option value="manual"' + (m==='manual'?' selected':'') + '>يدوي — أنا أختار الثيم</option>'
      +   '<option value="auto"' + (m==='auto'?' selected':'') + '>تلقائي — فاتح نهارًا، داكن ليلًا</option>'
      + '</select>'
    + '</div>'
    + '<div class="form-row-2">'
      + '<div class="form-field"><label>ثيم النهار</label>'
      +   '<select id="dayThemeSelect" onchange="saveThemeAutoSettings()">'
      +   ['mint','ocean'].map(function(t){ return '<option value="'+t+'"'+(data.settings.dayTheme===t?' selected':'')+'>'+ (t==='mint'?'Mint Light':'Ocean Clean') +'</option>'; }).join('')
      +   '</select></div>'
      + '<div class="form-field"><label>ثيم الليل</label>'
      +   '<select id="nightThemeSelect" onchange="saveThemeAutoSettings()">'
      +   ['teal','indigo','ember'].map(function(t){ return '<option value="'+t+'"'+(data.settings.nightTheme===t?' selected':'')+'>'+ (t==='teal'?'Deep Teal':t==='indigo'?'Royal Indigo':'Warm Ember') +'</option>'; }).join('')
      +   '</select></div>'
    + '</div>'
    + '<div class="form-row-2">'
      + '<div class="form-field"><label>بداية النهار</label><input type="time" id="dayStartInput" value="' + escapeAttr(data.settings.dayStart||'06:00') + '" onchange="saveThemeAutoSettings()"></div>'
      + '<div class="form-field"><label>بداية الليل</label><input type="time" id="nightStartInput" value="' + escapeAttr(data.settings.nightStart||'19:00') + '" onchange="saveThemeAutoSettings()"></div>'
    + '</div>';
}

export var _themeAutoTimer = null;

export function startThemeAutoTimer(){
  if(_themeAutoTimer) clearInterval(_themeAutoTimer);
  _themeAutoTimer = setInterval(applyAutoTheme, 60000);
  applyAutoTheme();
}

/* ─── Audio context (lazy) ─── */
export function ensureAudioContext(){
  try {
    if (!window._alarmCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) window._alarmCtx = new AC();
    }
    if (window._alarmCtx && window._alarmCtx.state === 'suspended') window._alarmCtx.resume();
  } catch(e) {}
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', ensureAudioContext, { once: true });
  document.addEventListener('touchstart', ensureAudioContext, { once: true });
}

/* ─── Global form & UI state ─── */
export let currentStudentCount = 1;
export let draftTimer = null;
export let _draftUnsaved = false;
export var studentBackTarget = null;
export var currentViewGroupId = null;
export var currentViewStudentId = null;
export var sessionSortOrder = 'desc';
export var currentSubjects = { quran: true, arabic: false, islamic: false };
if (typeof window !== 'undefined') window.currentSubjects = currentSubjects;
export var currentCustomRowTypes = [];
if (typeof window !== 'undefined') window.currentCustomRowTypes = currentCustomRowTypes;
export var currentHiddenStaticIds = [];
if (typeof window !== 'undefined') window.currentHiddenStaticIds = currentHiddenStaticIds;
export var reminderInterval = null;
export var dismissedReminders = {};
export var _snoozedNotifs = {};
export var _activeBellData = { lessonAlerts: [], missingReports: [] };
export var _tzPickCallback = null;
export var _tzPrevBody = null, _tzPrevFooter = null, _tzPrevTitle = null;
export var _repeatBeepInterval = null;
export var _sessionViewUrls = [];
export var currentGroupSubPage = null;    // null | 'students' | 'schedule' | 'sessions' | 'monthly' | 'custom'
export var currentStudentSubPage = null;  // null | 'sessions' | 'monthly' | 'custom'
export var currentSettingsSubPage = null; // null | 'account' | 'appearance' | 'notifications' | 'data'
var _handlingPopState = false;
var _currentMainTab = 'home';

export function pushAppNavState(tag){
  if (_handlingPopState) return;
  try {
    if (window.history && typeof window.history.pushState === 'function') {
      window.history.pushState({ appNav: true, tag: tag || '' }, '');
    }
  } catch(e){}
}

export function openInAppBrowserWithNav(url){
  var bo = document.getElementById('browserOverlay');
  if (!bo || bo.style.display !== 'flex') pushAppNavState('browser');
  return openInAppBrowser(url);
}

/* ═══════════════ TIMEZONE PICKER ═══════════════ */
export function openTimezonePicker(callback){
  var wasInModal = document.getElementById('genericModal').classList.contains('active');
  if (wasInModal) {
    _tzPrevBody = document.getElementById('genericModalBody').innerHTML;
    _tzPrevFooter = document.getElementById('genericModalFooter').innerHTML;
    _tzPrevTitle = document.getElementById('genericModalTitle').innerText;
  } else { _tzPrevBody = null; _tzPrevFooter = null; _tzPrevTitle = null; }
  _tzPickCallback = callback;
  var countryTz = window.COUNTRY_TZ || [];
  var items = countryTz.map(function(c){
    var nowTime = '';
    try { nowTime = new Date().toLocaleTimeString('ar-EG',{timeZone:c.tz,hour:'2-digit',minute:'2-digit'}); } catch(e){}
    return {
      tz: c.tz,
      displayName: c.city + '، ' + c.ar,
      searchKey: (c.city + ' ' + c.ar + ' ' + c.en + ' ' + c.tz).toLowerCase(),
      nowTime: nowTime,
      utc: formatUtcOffset(c.tz, new Date()),
      dst: isDSTActive(c.tz)
    };
  });
  items.sort(function(a,b){ return a.displayName.localeCompare(b.displayName,'ar'); });
  var body = '<input type="text" id="tzSearchInput" placeholder="ابحث بالدولة أو المدينة..." style="width:100%;margin-bottom:10px" oninput="filterTimezones(this.value)">';
  body += '<div id="tzList" style="max-height:50vh;overflow-y:auto;display:flex;flex-direction:column;gap:4px">';
  items.forEach(function(item){
    var dstBadge = item.dst ? ' <span style="background:var(--warning-bg);color:var(--warning);padding:1px 6px;border-radius:4px;font-size:.65rem;display:inline-flex;align-items:center;gap:3px">' + svgIcon('sun', 12) + ' صيفي</span>' : '';
    body += '<button class="tz-item" data-search="' + escapeAttr(item.searchKey) + '" onclick="pickTimezone(\'' + escapeAttr(item.tz) + '\')" style="padding:10px;background:var(--card-secondary-bg);border:1px solid var(--card-border);border-radius:8px;text-align:right;cursor:pointer;font-family:inherit;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--text-primary)">' + escapeHtml(item.displayName) + dstBadge + '</div><div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">' + escapeHtml(item.utc) + '</div></div><span style="color:var(--accent-green);font-weight:700;font-size:.85rem;white-space:nowrap">' + escapeHtml(item.nowTime) + '</span></button>';
  });
  body += '</div>';
  openGenericModal('اختر الدولة / المنطقة الزمنية', body, '<button class="btn btn-secondary" onclick="cancelTimezonePicker()">إلغاء</button>');
  setTimeout(function(){ var inp = document.getElementById('tzSearchInput'); if (inp) inp.focus(); }, 50);
}

export function filterTimezones(q){
  q = (q||'').toLowerCase().trim();
  document.querySelectorAll('.tz-item').forEach(function(el){
    var s = el.getAttribute('data-search') || '';
    el.style.display = (!q || s.indexOf(q) !== -1) ? 'flex' : 'none';
  });
}

export function cancelTimezonePicker(){
  _tzPickCallback = null;
  if (_tzPrevBody !== null) {
    document.getElementById('genericModalBody').innerHTML = _tzPrevBody;
    document.getElementById('genericModalFooter').innerHTML = _tzPrevFooter;
    document.getElementById('genericModalTitle').innerText = _tzPrevTitle;
    _tzPrevBody = null; _tzPrevFooter = null; _tzPrevTitle = null;
  } else closeGenericModal();
}

export function pickTimezone(tz){
  var cb = _tzPickCallback;
  _tzPickCallback = null;
  if (_tzPrevBody !== null) {
    document.getElementById('genericModalBody').innerHTML = _tzPrevBody;
    document.getElementById('genericModalFooter').innerHTML = _tzPrevFooter;
    document.getElementById('genericModalTitle').innerText = _tzPrevTitle;
    _tzPrevBody = null; _tzPrevFooter = null; _tzPrevTitle = null;
    if (cb) cb(tz);
  } else { closeGenericModal(); if (cb) cb(tz); }
}

/* ═══════════════ WORK LOCATIONS ═══════════════ */
export function renderWorkLocations(){
  var list = document.getElementById('workLocationsList');
  if (!list) return;
  var locs = data.settings.workLocations || [];
  if (!locs.length){ list.innerHTML = '<div class="cfg-empty">لا توجد أماكن مضافة بعد</div>'; return; }
  var html = '';
  locs.forEach(function(loc, i){
    html += '<div class="cfg-row"><div class="cfg-row-info"><div class="cfg-row-title">' + svgIcon('building-2', 14) + ' ' + escapeHtml(loc) + '</div></div><button class="btn btn-danger btn-sm" onclick="deleteWorkLocation(' + i + ')">' + svgIcon('trash-2', 12) + '</button></div>';
  });
  list.innerHTML = html;
}

export function addWorkLocationPrompt(){
  openGenericModal('مكان عمل جديد', '<div class="form-field"><label>اسم المكان</label><input type="text" id="newLocName" placeholder="مثال: مدرسة النور"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveWorkLocation()">حفظ</button>');
  setTimeout(function(){ var i = document.getElementById('newLocName'); if(i) i.focus(); }, 50);
}

export function saveWorkLocation(){
  var v = (document.getElementById('newLocName').value || '').trim();
  if (!v) return;
  if (!data.settings.workLocations) data.settings.workLocations = [];
  if (data.settings.workLocations.indexOf(v) !== -1){ showNotify('الاسم موجود'); return; }
  data.settings.workLocations.push(v);
  saveData(); closeGenericModal(); renderWorkLocations();
  showNotify('✅ تمت الإضافة');
}

export function deleteWorkLocation(i){
  if (!confirm('حذف هذا المكان؟')) return;
  var name = data.settings.workLocations[i];
  data.settings.workLocations.splice(i, 1);
  data.groups.forEach(function(g){ if (g.location === name) g.location = ''; });
  saveData(); renderWorkLocations();
}

/* ═══════════════ LESSON LINK ═══════════════ */
export function updateLessonLinkBar(){
  var bar = document.getElementById('lessonLinkBar');
  if (!bar) return;
  var gEl = document.getElementById('groupName');
  var gName = normalize(gEl ? gEl.value : '');
  var g = data.groups.find(function(x){ return normalize(x.name) === gName; });
  if (g && g.link && g.link.trim()) bar.classList.add('show');
  else bar.classList.remove('show');
}

export function enterCurrentLessonLink(){
  var gEl = document.getElementById('groupName');
  var gName = normalize(gEl ? gEl.value : '');
  var g = data.groups.find(function(x){ return normalize(x.name) === gName; });
  if (g && g.link) openLessonLink(g.link);
}

export function enterLessonAndOpenLink(groupId, dateISO, time){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  startLessonFromCalendar(groupId, dateISO, time);
  if (g && g.link && g.link.trim()) {
    setTimeout(function(){ openLessonLink(g.link); }, 250);
  }
}

export var _currentLessonContext = null;

export function setCurrentLessonContext(ctx){
  _currentLessonContext = ctx ? deepClone(ctx) : null;
}

export function showPreviousLesson(groupId, beforeDate, targetStudentIds){
  var card = document.getElementById('previousLessonCard');
  var content = document.getElementById('previousLessonContent');
  if (!card || !content) return;
  var sessions = data.sessions.filter(function(s){ return s.groupId === groupId && s.date && s.report; });
  if (beforeDate) sessions = sessions.filter(function(s){ return s.date < beforeDate; });
  if (Array.isArray(targetStudentIds) && targetStudentIds.length) {
    var targetNormNames = targetStudentIds.map(function(sid){
      var st = (data.students || []).find(function(x){ return x.id === sid; });
      return st ? normalize(st.name || '') : '';
    }).filter(Boolean);
    sessions = sessions.filter(function(s){
      if (Array.isArray(s.studentIds) && s.studentIds.length) {
        return s.studentIds.some(function(sid){ return targetStudentIds.indexOf(sid) !== -1; });
      }
      if (s.data && Array.isArray(s.data.students) && targetNormNames.length) {
        return s.data.students.some(function(st){
          var nm = normalize(st.name || '');
          return nm && targetNormNames.indexOf(nm) !== -1;
        });
      }
      return false;
    });
  }
  sessions.sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var prev = sessions[0];
  if (!prev) { card.style.display = 'none'; content.textContent = ''; return; }
  card.style.display = 'block';
  content.textContent = prev.report;
}

/* ═══════════════ TEACHER SETTINGS ═══════════════ */
export function saveTeacherDefault(){
  var v = document.getElementById('settingsTeacher').value.trim();
  data.settings.teacherName = v;
  saveData();
  var ti = document.getElementById('teacherName');
  if(ti && !ti.value.trim()){ ti.value = v; saveDraft(); }
  showNotify('✅ تم الحفظ');
}

export function saveTeacherGender(){
  var sel = document.getElementById('settingsTeacherGender');
  data.settings.teacherGender = (sel && sel.value === 'female') ? 'female' : 'male';
  saveData();
  showNotify('✅ تم حفظ الصفة');
}

export function saveGeminiApiKey(){
  var el = document.getElementById('settingsGeminiKey');
  data.settings.geminiApiKey = el ? el.value.trim() : '';
  saveData();
  showNotify('✅ تم حفظ مفتاح الترجمة');
}

export async function testGeminiKeyFromSettings(){
  var el = document.getElementById('settingsGeminiKey');
  var key = (el && el.value.trim()) ? el.value.trim() : (data.settings.geminiApiKey || '');
  var btn = document.getElementById('btnTestGeminiKey');
  if (btn) btn.disabled = true;
  showNotify('⏳ جاري اختبار المفتاح...');
  try {
    var res = await testGeminiApiKey(key);
    if (res && res.ok) {
      if (el && el.value.trim() && data.settings.geminiApiKey !== el.value.trim()) {
        data.settings.geminiApiKey = el.value.trim();
        saveData();
      }
      showNotify('✅ المفتاح يعمل بنجاح');
    } else {
      showNotify('❌ ' + ((res && res.error) ? res.error : 'فشل الاختبار'));
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

export function clearTransCacheFromSettings(){
  clearTranslationCache();
  showNotify('✅ تم مسح ذاكرة الترجمة المحفوظة');
}

export function saveTeacherTimezone(){
  var v = document.getElementById('settingsTimezone').value.trim();
  data.settings.teacherTimezone = v;
  saveData();
  updateLiveClock();
  showNotify('✅ تم الحفظ');
  if(document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
}

export function updateLiveClock(){
  var txt = getCurrentClockText();
  var homeTimeEl = document.getElementById('homeClockTime');
  if (homeTimeEl) homeTimeEl.textContent = txt;

  var appTimeEl = document.getElementById('appClockTime');
  if (appTimeEl) appTimeEl.textContent = txt;

  var tzEl = document.getElementById('appClockTz');
  if (tzEl) {
    var tz = getTeacherTimezone();
    tzEl.textContent = tz ? formatUtcOffset(tz) : '';
  }
}

var _liveClockTimer = null;
export function startLiveClock(){
  updateLiveClock();
  if (_liveClockTimer) clearInterval(_liveClockTimer);
  _liveClockTimer = setInterval(updateLiveClock, 15000);
}

export function saveTimeFormat(){
  var sel = document.getElementById('settingsTimeFormat');
  data.settings.timeFormat = (sel && sel.value === '24h') ? '24h' : '12h';
  saveData();
  updateLiveClock();
  renderHome();
  var calTab = document.getElementById('tab-calendar');
  if (calTab && calTab.classList.contains('active')) renderCalendar();
  showNotify('✅ تم حفظ نظام الوقت');
}

export function detectTimezone(){
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.getElementById('settingsTimezone').value = tz;
    showNotify('تم اكتشاف: ' + tz);
  } catch(e){ showNotify('فشل الاكتشاف'); }
}

/* ═══════════════ SUBJECTS ═══════════════ */
export function subjectsFromString(s){
  if (s === 'arabic') return { quran: false, arabic: true, islamic: false };
  if (s === 'islamic') return { quran: false, arabic: false, islamic: true };
  if (s === 'both') return { quran: true, arabic: true, islamic: false };
  if (s === 'all') return { quran: true, arabic: true, islamic: true };
  return { quran: true, arabic: false, islamic: false };
}

export function getSubjectString(){
  var q = currentSubjects.quran, a = currentSubjects.arabic, i = currentSubjects.islamic;
  if (q && a && i) return 'all';
  if (q && a) return 'both';
  if (q && i) return 'quran_islamic';
  if (a && i) return 'arabic_islamic';
  if (q) return 'quran';
  if (a) return 'arabic';
  if (i) return 'islamic';
  return 'quran';
}

export function toggleSubject(sub){
  currentSubjects[sub] = !currentSubjects[sub];
  if (!currentSubjects.quran && !currentSubjects.arabic && !currentSubjects.islamic){
    currentSubjects[sub] = true;
    showNotify('يجب تفعيل مادة واحدة على الأقل');
    return;
  }
  window.currentSubjects = currentSubjects;
  updateSubjectButtons();
  document.querySelectorAll('.student-card').forEach(updateCardVisibility);
  scheduleSaveDraft();
}

export function updateSubjectButtons(){
  document.querySelectorAll('.subject-btn').forEach(function(b){ b.classList.toggle('active', !!currentSubjects[b.dataset.subject]); });
}

export function updateCardVisibility(card){
  if(!card) return;
  card.querySelectorAll('.quran-block').forEach(function(b){ b.style.display = currentSubjects.quran ? 'block' : 'none'; });
  card.querySelectorAll('.arabic-block').forEach(function(b){ b.style.display = currentSubjects.arabic ? 'block' : 'none'; });
  card.querySelectorAll('.islamic-block').forEach(function(b){ b.style.display = currentSubjects.islamic ? 'block' : 'none'; });
}

/* ═══════════════ CONSTANTS ═══════════════ */
export function getConstant(ownerType, ownerId, key, fallback){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner || !owner.constants) return fallback || '';
  for(var i=0; i<owner.constants.length; i++){
    if(normalize(owner.constants[i].key) === normalize(key)) return owner.constants[i].value;
  }
  return fallback || '';
}

export function renderConstants(ownerType, ownerId){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner) return '';
  if(!owner.constants) owner.constants = [];
  var html = '<div class="constants-list">';
  owner.constants.forEach(function(c, idx){
    html += '<div class="const-row">'
      + '<input type="text" class="const-key" value="' + escapeAttr(c.key) + '" placeholder="المفتاح" onchange="updateConstant(\'' + ownerType + '\',\'' + ownerId + '\',' + idx + ',\'key\',this.value)">'
      + '<input type="text" class="const-val" value="' + escapeAttr(c.value) + '" placeholder="القيمة" onchange="updateConstant(\'' + ownerType + '\',\'' + ownerId + '\',' + idx + ',\'value\',this.value)">'
      + '<button class="remove-btn" onclick="deleteConstant(\'' + ownerType + '\',\'' + ownerId + '\',' + idx + ')" title="حذف">' + svgIcon('x', 14) + '</button>'
      + '</div>';
  });
  return html + '</div>';
}

export function addConstant(ownerType, ownerId){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner) return;
  if(!owner.constants) owner.constants = [];
  owner.constants.push({key:'', value:''});
  saveData();
  refreshConstantsUI(ownerType, ownerId);
}

export function deleteConstant(ownerType, ownerId, idx){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner || !owner.constants) return;
  owner.constants.splice(idx, 1);
  saveData();
  refreshConstantsUI(ownerType, ownerId);
}

export function updateConstant(ownerType, ownerId, idx, field, val){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner || !owner.constants || !owner.constants[idx]) return;
  owner.constants[idx][field] = val;
  saveData();
}

export function refreshConstantsUI(ownerType, ownerId){
  var c = document.getElementById((ownerType === 'group' ? 'group' : 'student') + 'ConstantsContainer');
  if(c){ c.innerHTML = renderConstants(ownerType, ownerId); hydrateIcons(c); }
}

/* ═══════════════ TABS & TRANSITIONS ═══════════════ */
var MAIN_TAB_ORDER = ['home', 'lesson', 'calendar', 'library', 'settings'];

function clearSlideAnimation(el){
  if (!el) return;
  if (el._slideRaf) {
    cancelAnimationFrame(el._slideRaf);
    el._slideRaf = 0;
  }
  if (el._slideTimer) {
    clearTimeout(el._slideTimer);
    el._slideTimer = 0;
  }
  if (el._slideEndHandler) {
    el.removeEventListener('transitionend', el._slideEndHandler);
    el._slideEndHandler = null;
  }
  el.classList.remove('tab-sliding', 'cal-sliding', 'slide-from-left', 'slide-from-right');
  el.style.animation = '';
  el.style.transition = '';
  el.style.transform = '';
  el.style.opacity = '';
  el.style.willChange = '';
  if (el._slideClipParent && el._slideClipPrev !== undefined) {
    el._slideClipParent.style.overflowX = el._slideClipPrev;
    el._slideClipParent = null;
    el._slideClipPrev = undefined;
  }
}

function animateSlideElement(el, dir, options){
  if (!el || !dir) return;
  clearSlideAnimation(el);

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var opts = options || {};
  var distance = opts.distance || 28;
  var duration = opts.duration || 200;
  var startOpacity = (typeof opts.startOpacity === 'number') ? opts.startOpacity : 0;
  var extraClass = opts.extraClass || 'tab-sliding';
  var dirClass = dir > 0 ? 'slide-from-left' : 'slide-from-right';

  var parent = el.parentElement;
  if (parent) {
    el._slideClipParent = parent;
    el._slideClipPrev = parent.style.overflowX;
    parent.style.overflowX = 'clip';
  }

  el.classList.add(extraClass, dirClass);
  el.style.animation = 'none';
  el.style.transition = 'none';
  el.style.willChange = 'transform, opacity';
  el.style.transform = 'translate3d(' + (dir > 0 ? '-' + distance + 'px' : distance + 'px') + ', 0, 0)';
  el.style.opacity = String(startOpacity);

  void el.offsetWidth;

  var done = false;
  var finish = function(){
    if (done) return;
    done = true;
    clearSlideAnimation(el);
  };

  el._slideEndHandler = function(e){
    if (e.target === el && (e.propertyName === 'transform' || e.propertyName === 'opacity')) {
      finish();
    }
  };
  el.addEventListener('transitionend', el._slideEndHandler);
  el._slideTimer = setTimeout(finish, duration + 60);

  el._slideRaf = requestAnimationFrame(function(){
    el._slideRaf = 0;
    if (done) return;
    el.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.22, 1, 0.36, 1), opacity ' + duration + 'ms ease';
    el.style.transform = 'translate3d(0, 0, 0)';
    el.style.opacity = '1';
  });
}

function getTabSlideDirection(prevTab, nextTab){
  var prevIdx = MAIN_TAB_ORDER.indexOf(prevTab);
  var nextIdx = MAIN_TAB_ORDER.indexOf(nextTab);
  if (prevIdx === -1 || nextIdx === -1 || prevIdx === nextIdx) return 0;
  return nextIdx > prevIdx ? 1 : -1;
}

function animateTabPanelSlide(panel, dir){
  animateSlideElement(panel, dir, {
    distance: 28,
    duration: 200,
    startOpacity: 0,
    extraClass: 'tab-sliding'
  });
}

function animateCalendarBodySlide(dir){
  var body = (typeof document !== 'undefined') ? document.getElementById('calendarBody') : null;
  if (!body) return;
  animateSlideElement(body, dir, {
    distance: 24,
    duration: 200,
    startOpacity: 0.25,
    extraClass: 'cal-sliding'
  });
}

export function switchTab(name, slideDir){
  var prevTab = _currentMainTab;
  if (name !== 'home' && _currentMainTab === 'home') pushAppNavState('tab-' + name);
  _currentMainTab = name;
  document.querySelectorAll('.tab-panel').forEach(function(p){
    clearSlideAnimation(p);
    p.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn[data-tab]').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === name); });
  var panel = document.getElementById('tab-' + name);
  if(panel) panel.classList.add('active');
  var clockBar = document.getElementById('appClockBar');
  if (clockBar) clockBar.style.display = (name === 'home') ? 'none' : 'flex';
  updateLiveClock();
  window.scrollTo(0, 0);
  if(name === 'home'){ renderHome(); }
  if(name === 'calendar'){ renderCalendar(); }
  if(name === 'library'){ backToGroups(); backToStudents(); renderGroupsList(); renderStudentsList(); }
  if(name === 'settings'){
    backToSettingsMenu();
    var accEmail = document.getElementById('accountStatusEmail');
    var accMini = document.getElementById('settingsAccountMiniText');
    if (accEmail || accMini) {
      if (accEmail) accEmail.innerHTML = 'جاري التحقق...';
      if (accMini) accMini.innerHTML = 'جاري التحقق...';
      if (window.supabaseClient) {
        window.supabaseClient.auth.getSession().then(function(res) {
          var u = res.data.session ? res.data.session.user : null;
          if (u) {
            window.currentUser = u;
            var htmlLogged = 'مسجل الدخول: <span style="color:var(--accent-green)">' + escapeHtml(u.email) + '</span>';
            if (accEmail) accEmail.innerHTML = htmlLogged;
            if (accMini) accMini.innerHTML = htmlLogged;
          } else {
            var htmlLocal = '<span style="color:var(--accent-amber)">وضع محلي (غير مسجل)</span>';
            if (accEmail) accEmail.innerHTML = htmlLocal;
            if (accMini) accMini.innerHTML = htmlLocal;
          }
        }).catch(function() {
          var htmlLocal = '<span style="color:var(--accent-amber)">وضع محلي (غير مسجل)</span>';
          if (accEmail) accEmail.innerHTML = htmlLocal;
          if (accMini) accMini.innerHTML = htmlLocal;
        });
      } else {
        var htmlLocal = '<span style="color:var(--accent-amber)">وضع محلي (غير مسجل)</span>';
        if (accEmail) accEmail.innerHTML = htmlLocal;
        if (accMini) accMini.innerHTML = htmlLocal;
      }
    }
    document.getElementById('settingsTeacher').value = data.settings.teacherName || '';
    var stGender = document.getElementById('settingsTeacherGender');
    if (stGender) stGender.value = data.settings.teacherGender || 'male';
    document.getElementById('settingsTimezone').value = data.settings.teacherTimezone || '';
    var stTimeFmt = document.getElementById('settingsTimeFormat');
    if (stTimeFmt) stTimeFmt.value = data.settings.timeFormat || '12h';
    var stGemini = document.getElementById('settingsGeminiKey');
    if (stGemini) stGemini.value = data.settings.geminiApiKey || '';
    var ncBefore = document.getElementById('nowCardBeforeMin');
    if (ncBefore) ncBefore.value = String(typeof data.settings.nowCardBeforeMin === 'number' ? data.settings.nowCardBeforeMin : 30);
    var ncAfter = document.getElementById('nowCardAfterMin');
    if (ncAfter) ncAfter.value = String(typeof data.settings.nowCardAfterMin === 'number' ? data.settings.nowCardAfterMin : 60);
    document.getElementById('notifEnabled').checked = data.settings.notifEnabled !== false;
    var nAtStart = document.getElementById('notifAtStart');
    if (nAtStart) nAtStart.checked = data.settings.notifAtStart !== false;
    var nMissEn = document.getElementById('notifMissingReportEnabled');
    if (nMissEn) nMissEn.checked = data.settings.notifMissingReportEnabled !== false;
    var nMissAfter = document.getElementById('notifMissingReportAfter');
    if (nMissAfter) nMissAfter.value = String(typeof data.settings.notifMissingReportAfter === 'number' ? data.settings.notifMissingReportAfter : 60);
    renderNotifRemindersSettings();
    updateNotifPermStatus();
    document.getElementById('notifSound').checked = data.settings.notifSound !== false;
    document.getElementById('notifVibrate').checked = data.settings.notifVibrate !== false;
    document.getElementById('notifSystem').checked = data.settings.notifSystem === true;
    document.getElementById('notifSoundType').value = data.settings.notifSoundType || '1';
    document.getElementById('notifRepeat').checked = !!data.settings.notifRepeat;
    document.getElementById('notifRepeatInterval').value = String(data.settings.notifRepeatInterval || 30);
    document.getElementById('notifVibratePattern').value = data.settings.notifVibratePattern || 'short';
    document.getElementById('quietEnabled').checked = !!data.settings.quietEnabled;
    document.getElementById('quietFrom').value = data.settings.quietFrom || '23:00';
    document.getElementById('quietTo').value = data.settings.quietTo || '07:00';
    updateThemeSelector();
    renderThemeAutoUI();
    updateLastBackupInfo();
    renderBackupLog();
    renderWorkLocations();
    renderSettingsFavs();
  }
  updatePendingBadge();

  if (panel && prevTab && prevTab !== name) {
    var dir = (typeof slideDir === 'number' && slideDir !== 0) ? slideDir : getTabSlideDirection(prevTab, name);
    if (dir !== 0) {
      animateTabPanelSlide(panel, dir);
    }
  }
}

export function switchLibSub(sub){
  document.querySelectorAll('.lib-subtab').forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === sub); });
  document.getElementById('lib-groups-view').style.display = (sub === 'groups') ? 'block' : 'none';
  document.getElementById('lib-students-view').style.display = (sub === 'students') ? 'block' : 'none';
  document.getElementById('lib-search-view').style.display = (sub === 'search') ? 'block' : 'none';
  if (sub === 'search') setTimeout(function(){ var inp = document.getElementById('searchInput'); if (inp) inp.focus(); }, 50);
}

export function switchSettingsSub(sub){
  var titles = {
    account: 'الحساب والملف الشخصي',
    appearance: 'المظهر والتصميم',
    notifications: 'التنبيهات',
    data: 'البيانات والمزامنة'
  };
  if (!currentSettingsSubPage) pushAppNavState('settings-' + sub);
  currentSettingsSubPage = sub;

  var menu = document.getElementById('settingsMenuPage');
  var wrap = document.getElementById('settingsSubPageWrapper');
  var titleEl = document.getElementById('settingsSubPageTitle');
  if (menu) menu.style.display = 'none';
  if (wrap) {
    wrap.style.display = 'block';
    wrap.classList.remove('page-slide-in');
    void wrap.offsetWidth;
    wrap.classList.add('page-slide-in');
  }
  if (titleEl) titleEl.textContent = titles[sub] || 'الإعدادات';

  document.querySelectorAll('.settings-sub-panel').forEach(function(p){
    p.classList.toggle('active', p.dataset.settingsPanel === sub);
  });
  window.scrollTo(0, 0);
  if (sub === 'notifications') {
    renderNotifRemindersSettings();
    updateNotifPermStatus();
  }
  if (sub === 'data' && typeof updateStorageInfo === 'function') {
    setTimeout(updateStorageInfo, 100);
  }
  hydrateIcons(wrap || document.getElementById('tab-settings'));
}

export function backToSettingsMenu(){
  currentSettingsSubPage = null;
  var menu = document.getElementById('settingsMenuPage');
  var wrap = document.getElementById('settingsSubPageWrapper');
  if (wrap) wrap.style.display = 'none';
  if (menu) {
    menu.style.display = 'block';
    menu.classList.remove('page-slide-in');
    void menu.offsetWidth;
    menu.classList.add('page-slide-in');
  }
  document.querySelectorAll('.settings-sub-panel').forEach(function(p){
    p.classList.remove('active');
  });
  window.scrollTo(0, 0);
  hydrateIcons(menu || document.getElementById('tab-settings'));
}

export function switchLessonSub(sub){
  document.getElementById('subtab-btn-lesson').classList.toggle('active', sub === 'lesson');
  document.getElementById('subtab-btn-monthly').classList.toggle('active', sub === 'monthly');
  document.getElementById('lesson-sub-lesson').style.display = (sub === 'lesson') ? 'grid' : 'none';
  document.getElementById('lesson-sub-monthly').style.display = (sub === 'monthly') ? 'block' : 'none';
  if(sub === 'monthly'){
    var gs = document.getElementById('monthlyGroupSelect');
    gs.innerHTML = '<option value="">-- اختر المجموعة --</option>';
    data.groups.forEach(function(g){ gs.innerHTML += '<option value="' + g.id + '">' + escapeHtml(g.name) + '</option>'; });
    var ms = document.getElementById('monthlyMonthSelect');
    ms.innerHTML = '';
    var monthNames = window.MONTH_NAMES || ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    monthNames.forEach(function(m,i){ ms.innerHTML += '<option value="' + (i+1) + '">' + m + '</option>'; });
    var now = new Date();
    ms.value = now.getMonth()+1;
    document.getElementById('monthlyYearInput').value = now.getFullYear();
    document.getElementById('monthlyTabDraftContainer').style.display = 'none';
  }
}

/* ═══════════════ MODALS & SHEETS ═══════════════ */
export function openGenericModal(title, bodyHTML, footerHTML){
  var modalEl = document.getElementById('genericModal');
  var wasOpen = modalEl && modalEl.classList.contains('active');
  if (!wasOpen) pushAppNavState('modal');
  document.getElementById('genericModalTitle').innerHTML = title;
  document.getElementById('genericModalBody').innerHTML = bodyHTML;
  document.getElementById('genericModalFooter').innerHTML = footerHTML;
  modalEl.classList.add('active');
  hydrateIcons(modalEl);
}

export function closeGenericModal(){
  document.getElementById('genericModal').classList.remove('active');
  var urlsToRevoke = _sessionViewUrls;
  _sessionViewUrls = [];
  setTimeout(function(){
    urlsToRevoke.forEach(function(u){ try { URL.revokeObjectURL(u); } catch(e){} });
  }, 5000);
}
document.addEventListener('click', function(e){ if(e.target && e.target.id === 'genericModal') closeGenericModal(); });

export function openReportSheet(){
  var sheetEl = document.getElementById('reportSheet');
  if (sheetEl && !sheetEl.classList.contains('open')) pushAppNavState('sheet');
  var so = document.getElementById('sheetOutput');
  var out = document.getElementById('output');
  if(so && out) so.value = out.value;
  sheetEl.classList.add('open');
  document.getElementById('sheetOverlay').classList.add('open');
}

export function closeReportSheet(){
  document.getElementById('reportSheet').classList.remove('open');
  document.getElementById('sheetOverlay').classList.remove('open');
}

/* ═══════════════ STUDENTS (lesson form) ═══════════════ */
export function changeStudentCount(delta){ var c = currentStudentCount + delta; if(c < 1) c = 1; setStudentCount(c); }
export function setStudentCount(count){ currentStudentCount = count; var inp = document.getElementById('studentCountInput'); if(inp) inp.value = count; renderStudents(); }

export function renderStudents(){
  var container = document.getElementById('studentsContainer');
  if(!container) return;
  var existing = container.children.length;
  for(var i=existing; i<currentStudentCount; i++){
    var t = document.createElement('div');
    t.innerHTML = buildStudentCardHTML(i);
    var card = t.firstElementChild;
    if(!card) continue;
    container.appendChild(card);
    updateAbsenceClass(card);
    updateCardVisibility(card);
  }
  while(container.children.length > currentStudentCount){ container.removeChild(container.lastChild); }
  var all = container.children;
  for(var j=0; j<all.length; j++){
    var av = all[j].querySelector('.student-avatar');
    if(av) av.innerText = currentStudentCount > 1 ? (j+1) : '؟';
  }
  hydrateIcons(container);
}

export function buildStudentCardHTML(i){
  var activeTypes = getCardEffectiveRowTypes(null);
  var studyTypes = activeTypes.filter(function(t){ return t.section === 'study'; });
  var hwTypes = activeTypes.filter(function(t){ return t.section === 'homework'; });
  var studyHtml = studyTypes.map(function(t){ return renderRow('study', t.name, t.form, activeTypes); }).join('');
  var hwHtml = hwTypes.map(function(t){ return renderRow('homework', t.name, t.form, activeTypes); }).join('');
  return '<div class="student-card student-form-card" data-index="' + i + '">'
    + '<div class="student-header">'
    + '<div class="student-avatar">' + (i+1) + '</div>'
    + '<div class="student-info">'
    + '<div class="input-with-btn" style="align-items:center">'
    + '<input type="text" class="student-name" placeholder="اسم الطالب" style="flex:1;min-width:0">'
    + '<button type="button" class="icon-btn" onclick="openStudentPicker(this)" title="اختيار من طلاب المجموعة" style="width:32px;height:32px">' + svgIcon('users', 14) + '</button>'
    + '</div>'
    + '</div>'
    + '<select class="attendance-select student-attendance" onchange="updateAbsenceClass(this.closest(\'.student-card\'))">'
    + '<option value="present">حاضر</option><option value="excused">بعذر</option><option value="absent">غائب</option>'
    + '</select>'
    + '</div>'
    + '<div class="row-label" style="display:flex;align-items:center;justify-content:space-between;gap:8px">'
    + '<span>' + svgIcon('book-open', 12) + ' دراسة اليوم</span>'
    + '<button type="button" class="btn btn-secondary btn-sm" onclick="openQuickRowTypesModal(this)" title="تخصيص أنواع السطور" style="padding:3px 9px;font-size:.75rem;gap:4px">' + svgIcon('list', 12) + ' أنواع السطور</button>'
    + '</div>'
    + '<div class="quran-block study-quran-block">'
    + '<div class="rows-container study-rows-container">' + studyHtml + '</div>'
    + '<button class="add-row-btn" onclick="addDynamicRow(this,\'study\')">' + svgIcon('plus', 12) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="arabic-block study-arabic-block" style="margin-top:10px">'
    + '<div class="row-label arabic-label" style="margin-top:10px">' + svgIcon('book', 12) + ' اللغة العربية</div>'
    + '<div class="arabic-rows-container study-arabic-rows-container">' + renderArabicRow('study') + '</div>'
    + '<button class="add-row-btn" onclick="addArabicRow(this,\'study\')">' + svgIcon('plus', 12) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="islamic-block study-islamic-block" style="margin-top:10px">'
    + '<div class="row-label islamic-label" style="margin-top:10px">' + svgIcon('bookmark', 12) + ' العلوم الشرعية</div>'
    + '<div class="arabic-rows-container study-islamic-rows-container">' + renderArabicRow('study','مثال: معنى الإسلام...') + '</div>'
    + '<button class="add-row-btn" onclick="addIslamicRow(this,\'study\')">' + svgIcon('plus', 12) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="row-label homework-label" style="margin-top:14px">' + svgIcon('bookmark', 12) + ' المطلوب (الواجب)</div>'
    + '<div class="quran-block homework-quran-block">'
    + '<div class="rows-container homework-rows-container">' + hwHtml + '</div>'
    + '<button class="add-row-btn" onclick="addDynamicRow(this,\'homework\')">' + svgIcon('plus', 12) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="arabic-block homework-arabic-block" style="margin-top:10px">'
    + '<div class="row-label arabic-label" style="margin-top:10px">' + svgIcon('book', 12) + ' عربية</div>'
    + '<div class="arabic-rows-container homework-arabic-rows-container">' + renderArabicRow('homework') + '</div>'
    + '<button class="add-row-btn" onclick="addArabicRow(this,\'homework\')">' + svgIcon('plus', 12) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="islamic-block homework-islamic-block" style="margin-top:10px">'
    + '<div class="row-label islamic-label" style="margin-top:10px">' + svgIcon('bookmark', 12) + ' شرعية</div>'
    + '<div class="arabic-rows-container homework-islamic-rows-container">' + renderArabicRow('homework','مثال: مذاكرة الدرس') + '</div>'
    + '<button class="add-row-btn" onclick="addIslamicRow(this,\'homework\')">' + svgIcon('plus', 12) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="student-card-footer" style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
    + '<select class="student-gender student-level-select" onchange="updateStudentCardGender(this.closest(\'.student-card\'))" style="max-width:92px"><option value="male">طالب</option><option value="female">طالبة</option></select>'
    + '<select class="student-level student-level-select"><option>ممتاز</option><option>جيد جدًّا</option><option>جيد</option><option>مقبول</option><option>ضعيف</option></select>'
    + '<input type="text" class="student-notes" placeholder="ملاحظات (اختياري)" style="flex:1;min-width:150px;font-size:.82rem;padding:7px 10px">'
    + '</div>'
    + '</div>';
}

export function updateAbsenceClass(card){
  if(!card) return;
  var sel = card.querySelector('.student-attendance');
  if(!sel) return;
  card.classList.toggle('absent', sel.value !== 'present');
}

export function updateStudentCardGender(card){
  if(!card) return;
  var gSel = card.querySelector('.student-gender');
  var aSel = card.querySelector('.student-attendance');
  if(!gSel || !aSel) return;
  var isFemale = gSel.value === 'female';
  var curVal = aSel.value;
  var opts = aSel.options;
  if(opts[0]) opts[0].text = isFemale ? 'حاضرة' : 'حاضر';
  if(opts[1]) opts[1].text = 'بعذر';
  if(opts[2]) opts[2].text = isFemale ? 'غائبة' : 'غائب';
  aSel.value = curVal;
}

/* ═══════════════ ROW ITEMS ═══════════════ */
export function renderRow(sectionType, defaultLabel, form, rowTypesOverride){
  form = form || 'surah-ayat';
  var isStudy = sectionType === 'study';
  var options = buildTypeOptions(isStudy, defaultLabel, rowTypesOverride);
  var removeBtn = '<button class="remove-sm" onclick="removeRow(this)" title="حذف">' + svgIcon('x', 14) + '</button>';
  if(form === 'free-text'){
    return '<div class="row-item surah-row free-text-row">'
      + '<select class="row-type-select" onchange="handleRowTypeChange(this)">' + options + '</select>'
      + '<input type="text" class="free-text-input" placeholder="نص حر...">'
      + removeBtn
      + '</div>';
  }
  return '<div class="row-item surah-row">'
    + '<select class="row-type-select" onchange="handleRowTypeChange(this)">' + options + '</select>'
    + '<select class="range-type-select" onchange="toggleRangeType(this)"><option value="ayat">آيات</option><option value="surahs">سور</option></select>'
    + '<div class="dropdown-container"><input type="text" class="surah-input main-surah" placeholder="السورة" oninput="handleSurahSearch(this)" onfocus="handleSurahSearch(this)"><div class="surah-dropdown"></div></div>'
    + '<div class="range-inputs ayat-range"><input type="number" class="from-aya" placeholder="من" oninput="validateAya(this)"><input type="number" class="to-aya" placeholder="إلى" oninput="validateAya(this)"></div>'
    + '<div class="range-inputs surahs-range" style="display:none"><div class="dropdown-container"><input type="text" class="surah-input to-surah" placeholder="إلى سورة" oninput="handleSurahSearch(this)" onfocus="handleSurahSearch(this)"><div class="surah-dropdown"></div></div></div>'
    + removeBtn
    + '</div>';
}

export function renderArabicRow(sectionType, placeholder){
  placeholder = placeholder || 'مثال: كان وأخواتها...';
  return '<div class="arabic-row">'
    + '<input type="text" class="arabic-input" placeholder="' + escapeAttr(placeholder) + '">'
    + '<button class="remove-sm" onclick="removeRow(this)" title="حذف">' + svgIcon('x', 14) + '</button>'
    + '</div>';
}

export function addArabicRow(btn, sectionType){ var c = btn.previousElementSibling; if(!c) return; var t = document.createElement('div'); t.innerHTML = renderArabicRow(sectionType); c.appendChild(t.firstElementChild); scheduleSaveDraft(); }
export function addIslamicRow(btn, sectionType){ var c = btn.previousElementSibling; if(!c) return; var t = document.createElement('div'); var ph = sectionType === 'study' ? 'مثال: معنى الإسلام...' : 'مثال: مذاكرة الدرس'; t.innerHTML = renderArabicRow(sectionType, ph); c.appendChild(t.firstElementChild); scheduleSaveDraft(); }
export function addDynamicRow(btn, type){
  var c = btn.previousElementSibling; if(!c) return;
  var card = btn.closest('.student-card');
  var types = getCardEffectiveRowTypes(card);
  var secTypes = types.filter(function(t){ return t.section === type; });
  if(!secTypes.length){ showNotify('لا توجد أنواع سطور مضافة لهذا القسم'); return; }
  var first = secTypes[0];
  var t = document.createElement('div');
  t.innerHTML = renderRow(type, first.name, first.form, types);
  c.appendChild(t.firstElementChild);
  hydrateIcons(c);
  scheduleSaveDraft();
}

export function toggleRangeType(sel){
  var row = sel.closest('.row-item');
  if(!row) return;
  var ar = row.querySelector('.ayat-range');
  var sr = row.querySelector('.surahs-range');
  if(sel.value === 'ayat'){
    if(ar) ar.style.display = 'flex';
    if(sr) sr.style.display = 'none';
  } else {
    if(ar) ar.style.display = 'none';
    if(sr) sr.style.display = 'flex';
  }
  scheduleSaveDraft();
}

export function removeRow(btn){ var r = btn.closest('.row-item, .arabic-row'); if(r) r.remove(); scheduleSaveDraft(); }

export function handleSurahSearch(input){
  var dd = input.nextElementSibling;
  if(!dd) return;
  var v = input.value;
  dd.innerHTML = '';
  var surahNames = window.surahNames || [];
  var f = v ? surahNames.filter(function(s){ return s.indexOf(v)!==-1; }) : surahNames;
  if(!f.length){ dd.style.display = 'none'; return; }
  dd.style.display = 'block';
  f.forEach(function(s){
    var item = document.createElement('div');
    item.className = 'surah-item';
    item.innerText = s;
    item.onmousedown = function(e){
      e.preventDefault();
      input.value = s;
      dd.style.display = 'none';
      if(input.classList.contains('main-surah')){
        var r = input.closest('.row-item');
        var fa = r.querySelector('.from-aya'), ta = r.querySelector('.to-aya');
        if(fa && fa.value) validateAya(fa);
        if(ta && ta.value) validateAya(ta);
      }
      scheduleSaveDraft();
    };
    dd.appendChild(item);
  });
}

export function validateAya(input){
  var row = input.closest('.row-item');
  if(!row) return;
  var s = row.querySelector('.main-surah').value;
  var quranData = window.quranData || {};
  var max = quranData[s] || 999;
  if(input.value !== ''){
    var v = parseInt(input.value);
    if(isNaN(v) || v < 1) input.value = 1;
    else if(v > max) input.value = max;
    else input.value = v;
  }
}

export function setupGlobalClick(){
  document.onclick = function(e){
    if(!e.target.classList || !e.target.classList.contains('surah-input')){
      document.querySelectorAll('.surah-dropdown').forEach(function(d){ d.style.display='none'; });
    }
  };
}

export function setupAutoSave(){
  var grid = document.getElementById('tab-lesson');
  if(!grid) return;
  grid.addEventListener('input', scheduleSaveDraft);
  grid.addEventListener('change', scheduleSaveDraft);
}

export function scheduleSaveDraft(){ clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 500); }

export function saveDraft(){
  try {
    var draftKey = window.DRAFT_KEY || 'quran_draft_v4';
    localStorage.setItem(draftKey, JSON.stringify(collectFormState()));
    _draftUnsaved = true;
  } catch(e){}
}

/* ═══════════════ COLLECT / RESTORE FORM STATE ═══════════════ */
export function collectFormState(){
  var state = {
    group: document.getElementById('groupName').value,
    teacher: document.getElementById('teacherName').value,
    teacherGender: (data.settings && data.settings.teacherGender) || 'male',
    date: document.getElementById('reportDate').value,
    lesson: document.getElementById('lessonOrder').value,
    duration: document.getElementById('duration').value,
    subject: getSubjectString(),
    subjects: { quran: currentSubjects.quran, arabic: currentSubjects.arabic, islamic: currentSubjects.islamic },
    hiddenStaticIds: currentHiddenStaticIds.slice(),
    lessonContext: _currentLessonContext ? deepClone(_currentLessonContext) : null,
    students: []
  };
  document.querySelectorAll('.student-card').forEach(function(c){
    var st = {
      name: c.querySelector('.student-name').value,
      gender: (c.querySelector('.student-gender')||{}).value || 'male',
      attendance: c.querySelector('.student-attendance').value,
      level: (c.querySelector('.student-level')||{}).value || 'ممتاز',
      rowTypes: Array.isArray(c._lessonRowTypes) ? deepClone(c._lessonRowTypes) : null,
      studyRows: [], homeworkRows: [],
      arabicStudyRows: [], arabicHomeworkRows: [],
      islamicStudyRows: [], islamicHomeworkRows: [],
      notes: ''
    };
    c.querySelectorAll('.study-rows-container .row-item').forEach(function(r){ st.studyRows.push(readRow(r)); });
    c.querySelectorAll('.homework-rows-container .row-item').forEach(function(r){ st.homeworkRows.push(readRow(r)); });
    c.querySelectorAll('.study-arabic-rows-container .arabic-row').forEach(function(r){ var v = r.querySelector('.arabic-input').value.trim(); if(v) st.arabicStudyRows.push(v); });
    c.querySelectorAll('.homework-arabic-rows-container .arabic-row').forEach(function(r){ var v = r.querySelector('.arabic-input').value.trim(); if(v) st.arabicHomeworkRows.push(v); });
    c.querySelectorAll('.study-islamic-rows-container .arabic-row').forEach(function(r){ var v = r.querySelector('.arabic-input').value.trim(); if(v) st.islamicStudyRows.push(v); });
    c.querySelectorAll('.homework-islamic-rows-container .arabic-row').forEach(function(r){ var v = r.querySelector('.arabic-input').value.trim(); if(v) st.islamicHomeworkRows.push(v); });
    var notesEl = c.querySelector('.student-notes');
    st.notes = notesEl ? notesEl.value : '';
    state.students.push(st);
  });
  return state;
}

export function readRow(row){
  var type = row.querySelector('.row-type-select').value;
  if(row.classList.contains('free-text-row')){
    return { type: type, form: 'free-text', text: (row.querySelector('.free-text-input') || {}).value || '' };
  }
  var rangeSel = row.querySelector('.range-type-select');
  var rt = rangeSel ? rangeSel.value : 'ayat';
  var fa = row.querySelector('.from-aya');
  var ta = row.querySelector('.to-aya');
  var ts = row.querySelector('.to-surah');
  return {
    type: type,
    form: 'surah-ayat',
    rangeType: rt,
    mainSurah: row.querySelector('.main-surah').value,
    from: fa ? fa.value : '',
    to: ta ? ta.value : '',
    toSurah: ts ? ts.value : ''
  };
}

export function restoreDraft(){
  try {
    var draftKey = window.DRAFT_KEY || 'quran_draft_v4';
    var raw = localStorage.getItem(draftKey);
    if(!raw) return;
    applyState(JSON.parse(raw));
    _draftUnsaved = false;
  } catch(e){}
}

export function applyState(state){
  _currentLessonContext = (state && state.lessonContext) ? deepClone(state.lessonContext) : null;
  document.getElementById('groupName').value = safe(state.group);
  document.getElementById('teacherName').value = safe(state.teacher);
  if(state.date) document.getElementById('reportDate').value = state.date;
  document.getElementById('lessonOrder').value = safe(state.lesson);
  document.getElementById('duration').value = safe(state.duration);
  if (state.subjects && typeof state.subjects === 'object'){
    currentSubjects = { quran: !!state.subjects.quran, arabic: !!state.subjects.arabic, islamic: !!state.subjects.islamic };
  } else if (state.subject){
    currentSubjects = subjectsFromString(state.subject);
  } else {
    currentSubjects = { quran: true, arabic: false, islamic: false };
  }
  if (!currentSubjects.quran && !currentSubjects.arabic && !currentSubjects.islamic) currentSubjects.quran = true;
  window.currentSubjects = currentSubjects;
  updateSubjectButtons();
  currentHiddenStaticIds = state.hiddenStaticIds || [];
  window.currentHiddenStaticIds = currentHiddenStaticIds;
  var grp = data.groups.find(function(g){ return normalize(g.name) === normalize(safe(state.group)); });
  currentCustomRowTypes = (grp && grp.reportSettings && grp.reportSettings.customRowTypes) || [];
  window.currentCustomRowTypes = currentCustomRowTypes;
  var students = state.students || [];
  setStudentCount(students.length || 1);
  rebuildAllRowDropdowns();
  var cards = document.querySelectorAll('.student-card');
  students.forEach(function(st, i){
    var card = cards[i];
    if(!card) return;
    card.querySelector('.student-name').value = safe(st.name);
    card._lessonRowTypes = Array.isArray(st.rowTypes) ? deepClone(st.rowTypes) : null;
    var genderSel = card.querySelector('.student-gender');
    if(genderSel) genderSel.value = st.gender || 'male';
    updateStudentCardGender(card);
    card.querySelector('.student-attendance').value = st.attendance || 'present';
    var levelSel = card.querySelector('.student-level');
    if(levelSel) levelSel.value = st.level || 'ممتاز';
    updateAbsenceClass(card);
    fillRows(card.querySelector('.study-rows-container'), st.studyRows || [], true, card);
    fillRows(card.querySelector('.homework-rows-container'), st.homeworkRows || [], false, card);
    fillArabicRows(card.querySelector('.study-arabic-rows-container'), st.arabicStudyRows || [], 'study');
    fillArabicRows(card.querySelector('.homework-arabic-rows-container'), st.arabicHomeworkRows || [], 'homework');
    fillArabicRows(card.querySelector('.study-islamic-rows-container'), st.islamicStudyRows || [], 'study', 'مثال: معنى الإسلام...');
    fillArabicRows(card.querySelector('.homework-islamic-rows-container'), st.islamicHomeworkRows || [], 'homework', 'مثال: مذاكرة الدرس');
    var notesEl = card.querySelector('.student-notes');
    if(notesEl) notesEl.value = safe(st.notes);
    updateCardVisibility(card);
  });
  renderActiveStaticTexts();
  updateLessonLinkBar();
}

export function fillRows(container, rows, isStudy, card){
  if(!container) return;
  card = card || (container.closest ? container.closest('.student-card') : null);
  var cardTypes = getCardEffectiveRowTypes(card);
  var sec = isStudy ? 'study' : 'homework';
  container.innerHTML = '';
  if(!rows.length){
    var secTypes = cardTypes.filter(function(t){ return t.section === sec; });
    if(secTypes.length){
      container.innerHTML = renderRow(sec, secTypes[0].name, secTypes[0].form, cardTypes);
      hydrateIcons(container);
    }
    return;
  }
  rows.forEach(function(r){
    var form = r.form || 'surah-ayat';
    var wrap = document.createElement('div');
    wrap.innerHTML = renderRow(sec, r.type, form, cardTypes);
    var row = wrap.firstElementChild;
    if(!row) return;
    if(form === 'free-text'){
      var fi = row.querySelector('.free-text-input');
      if(fi) fi.value = safe(r.text);
    } else {
      row.querySelector('.main-surah').value = safe(r.mainSurah);
      var rangeSel = row.querySelector('.range-type-select');
      var ayatRange = row.querySelector('.ayat-range');
      var surahsRange = row.querySelector('.surahs-range');
      var rt = r.rangeType || 'ayat';
      if(rangeSel) rangeSel.value = rt;
      if(rt === 'surahs'){
        if(ayatRange) ayatRange.style.display = 'none';
        if(surahsRange) surahsRange.style.display = 'flex';
        var ts = row.querySelector('.to-surah');
        if(ts) ts.value = safe(r.toSurah);
      } else {
        if(ayatRange) ayatRange.style.display = 'flex';
        if(surahsRange) surahsRange.style.display = 'none';
        var fa = row.querySelector('.from-aya');
        if(fa) fa.value = safe(r.from);
        var ta = row.querySelector('.to-aya');
        if(ta) ta.value = safe(r.to);
      }
    }
    container.appendChild(row);
  });
  hydrateIcons(container);
}

export function fillArabicRows(container, rows, sectionType, placeholder){
  if(!container) return;
  container.innerHTML = '';
  if(!rows.length){ container.innerHTML = renderArabicRow(sectionType, placeholder); return; }
  rows.forEach(function(txt){
    var wrap = document.createElement('div');
    wrap.innerHTML = renderArabicRow(sectionType, placeholder);
    var row = wrap.firstElementChild;
    if(!row) return;
    row.querySelector('.arabic-input').value = safe(txt);
    container.appendChild(row);
  });
}

/* ═══════════════ GROUP PICKER ═══════════════ */
export function openGroupPicker(){
  if(!data.groups.length){
    openGenericModal('اختيار مجموعة', '<p style="text-align:center;padding:30px;color:var(--text-muted)">لا توجد مجموعات محفوظة بعد.</p>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
    return;
  }
  var body = '<div style="display:flex;flex-direction:column;gap:8px">';
  data.groups.forEach(function(g){
    var cnt = data.students.filter(function(s){ return s.groupId === g.id; }).length;
    body += '<button class="btn btn-secondary" style="justify-content:flex-start;text-align:right;padding:14px" onclick="pickGroup(\'' + g.id + '\')"><div style="flex:1"><div style="font-weight:700;color:var(--text-primary)">' + escapeHtml(g.name) + '</div><div style="font-size:.8rem;color:var(--text-muted)">' + cnt + ' طالب</div></div><span style="color:var(--accent-green)">' + svgIcon('check', 14) + '</span></button>';
  });
  body += '</div>';
  openGenericModal('اختر مجموعة', body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>');
}

export function pickGroup(groupId, targetStudentIds, keepContext){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if(!g) return;
  if (!keepContext) _currentLessonContext = null;
  var sts = data.students.filter(function(s){ return s.groupId === groupId; });
  if (Array.isArray(targetStudentIds) && targetStudentIds.length) {
    sts = sts.filter(function(s){ return targetStudentIds.indexOf(s.id) !== -1; });
  }
  document.getElementById('groupName').value = g.name;
  if(g.teacherName) document.getElementById('teacherName').value = g.teacherName;
  currentCustomRowTypes = (g.reportSettings && g.reportSettings.customRowTypes) || [];
  window.currentCustomRowTypes = currentCustomRowTypes;
  setStudentCount(Math.max(1, sts.length));
  setTimeout(function(){
    var inputs = document.querySelectorAll('.student-name');
    var cards = document.querySelectorAll('.student-card');
    if(sts.length){
      sts.forEach(function(s, i){
        if(inputs[i]) inputs[i].value = s.name;
        if(cards[i]){
          cards[i]._lessonRowTypes = null;
          var gSel = cards[i].querySelector('.student-gender');
          if(gSel) gSel.value = s.gender || 'male';
          updateStudentCardGender(cards[i]);
          var eff = getEffectiveRowTypes(s, g);
          var sc = cards[i].querySelector('.study-rows-container');
          var hc = cards[i].querySelector('.homework-rows-container');
          if(sc) sc.innerHTML = eff.filter(function(t){ return t.section === 'study'; }).map(function(t){ return renderRow('study', t.name, t.form, eff); }).join('');
          if(hc) hc.innerHTML = eff.filter(function(t){ return t.section === 'homework'; }).map(function(t){ return renderRow('homework', t.name, t.form, eff); }).join('');
        }
      });
    } else if(cards[0]){
      cards[0]._lessonRowTypes = null;
      var gEff = getEffectiveRowTypes(null, g);
      var sc0 = cards[0].querySelector('.study-rows-container');
      var hc0 = cards[0].querySelector('.homework-rows-container');
      if(sc0) sc0.innerHTML = gEff.filter(function(t){ return t.section === 'study'; }).map(function(t){ return renderRow('study', t.name, t.form, gEff); }).join('');
      if(hc0) hc0.innerHTML = gEff.filter(function(t){ return t.section === 'homework'; }).map(function(t){ return renderRow('homework', t.name, t.form, gEff); }).join('');
    }
    var scContainer = document.getElementById('studentsContainer');
    if(scContainer) hydrateIcons(scContainer);
    rebuildAllRowDropdowns();
    renderActiveStaticTexts();
    updateLessonLinkBar();
    showPreviousLesson(groupId, null, (Array.isArray(targetStudentIds) && targetStudentIds.length) ? targetStudentIds : null);
    saveDraft();
  }, 30);
  if (currentAttachments.length > 0) {
    var keepAtt = confirm('لديك ' + currentAttachments.length + ' مرفق.\n\nموافق = الاحتفاظ بها مع هذه المجموعة\nإلغاء = مسحها والبدء بمرفقات فارغة');
    if (!keepAtt) {
      setCurrentAttachments([]);
      renderAttachmentsUI();
    }
  }
  closeGenericModal();
  showNotify('تم تحميل المجموعة');
}

/* ═══════════════ ATTACHMENTS & SESSIONS ═══════════════ */
export async function renderAttachmentsUI(){
  var list = document.getElementById('attachmentsList');
  if (!list) return;
  list.innerHTML = '';
  if (currentAttachments.length === 0) {
    list.innerHTML = '<div style="font-size:.8rem;color:var(--text-muted)">لا توجد مرفقات بعد</div>';
    return;
  }
  currentAttachments.forEach(function(att) {
    if (!att.url && att.blob) {
      att.url = URL.createObjectURL(att.blob);
    }
    var div = document.createElement('div');
    div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;border:1px solid var(--card-border);background:var(--card-bg);display:flex;align-items:center;justify-content:center;overflow:hidden;';
    if (att.type.startsWith('image/')) {
      div.innerHTML = '<img src="'+att.url+'" style="width:100%;height:100%;object-fit:cover;">';
    } else {
      div.innerHTML = '<span data-icon="file-text" data-icon-size="32" style="color:var(--accent-blue)"></span>';
    }
    var rm = document.createElement('button');
    rm.innerHTML = '×';
    rm.style.cssText = 'position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,0.9);color:#fff;border:none;cursor:pointer;font-size:12px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;';
    rm.onclick = function(e) {
      e.stopPropagation();
      setCurrentAttachments(currentAttachments.filter(function(a){ return a.id !== att.id; }));
      renderAttachmentsUI();
    };
    div.appendChild(rm);
    list.appendChild(div);
  });
  hydrateIcons(list);
}

export async function handleAttachmentUpload(event) {
  var files = event.target.files;
  if (!files || files.length === 0) return;
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var processedFile = file;
    if (file.type.startsWith('image/')) {
      showNotify('⏳ جارٍ ضغط الصورة...');
      try {
        processedFile = await compressImage(file, 1600, 0.8);
      } catch(e) {
        console.error('Compression failed:', e);
        processedFile = file;
      }
    }
    var id = 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    try {
      await idbAttachmentSet(id, processedFile);
      currentAttachments.push({
        id: id,
        name: processedFile.name,
        type: processedFile.type || 'application/octet-stream',
        size: processedFile.size,
        blob: processedFile
      });
    } catch(e) {
      console.error('Save attachment failed:', e);
      showNotify('⚠️ فشل حفظ المرفق');
    }
  }
  event.target.value = '';
  renderAttachmentsUI();
  showNotify('✅ تمت إضافة المرفقات');
}

export function showSaveSuccess(btn){
  if (!btn || btn.dataset.saving) return;
  btn.dataset.saving = '1';
  var origHtml = btn.innerHTML;
  var origBg = btn.style.background;
  var origColor = btn.style.color;
  btn.innerHTML = svgIcon('check', 16) + ' تم الحفظ';
  btn.style.background = 'var(--accent-green)';
  btn.style.color = '#fff';
  btn.disabled = true;
  setTimeout(function(){
    btn.innerHTML = origHtml;
    btn.style.background = origBg;
    btn.style.color = origColor;
    btn.disabled = false;
    delete btn.dataset.saving;
  }, 1800);
}

export async function saveSession(btn){
  try {
    if (data.activeTimer) stopLessonTimer(true);
    var state = collectFormState();
    if(!state.group.trim()){ showNotify('أدخل اسم المجموعة'); return; }
    var gName = normalize(state.group);
    var group = data.groups.find(function(g){ return normalize(g.name) === gName; });

    var ctx = (group && _currentLessonContext && _currentLessonContext.groupId === group.id)
      ? _currentLessonContext
      : ((group && state.lessonContext && state.lessonContext.groupId === group.id) ? state.lessonContext : null);
    var sessTime = ctx ? (ctx.time || '') : '';
    var sessRuleId = ctx ? (ctx.ruleId || null) : null;
    var sessExtraId = ctx ? (ctx.extraId || null) : null;

    if (group && state.date) {
      var dup = data.sessions.find(function(s){
        if (s.groupId !== group.id || s.date !== state.date) return false;
        if (sessTime) {
          if (s.time) return s.time === sessTime;
          if ((s.lessonNumber || '') !== (state.lesson || '')) return false;
          if (ctx && Array.isArray(ctx.studentIds) && ctx.studentIds.length && Array.isArray(s.studentIds) && s.studentIds.length) {
            return s.studentIds.some(function(sid){ return ctx.studentIds.indexOf(sid) !== -1; });
          }
          return true;
        }
        return !s.time && (s.lessonNumber || '') === (state.lesson || '');
      });
      if (dup) {
        var replace = confirm(
          'توجد حصة محفوظة بنفس المجموعة والتاريخ ورقم الحصة.\n\n' +
          '• «موافق» = استبدال الحصة القديمة\n' +
          '• «إلغاء» = إضافة حصة ثانية (نفس اليوم)'
        );
        if (replace) {
          if (dup.attachmentIds && dup.attachmentIds.length > 0) {
            var _newIds = currentAttachments.map(function(a){ return a.id; });
            for (var _k = 0; _k < dup.attachmentIds.length; _k++) {
              if (_newIds.indexOf(dup.attachmentIds[_k]) === -1) {
                try { await idbAttachmentDelete(dup.attachmentIds[_k]); } catch(e) {}
              }
            }
          }
          data.sessions = data.sessions.filter(function(s){ return s.id !== dup.id; });
        }
      }
    }

    if(!group){
      group = {id: genId(), name: state.group.trim(), teacherName: state.teacher || '', constants: [], schedule: [], timezone: '', link: '', location: '', createdAt: new Date().toISOString()};
      data.groups.push(group);
    }
    if(!group.constants) group.constants = [];
    if(!group.schedule) group.schedule = [];
    if(!group.teacherName && state.teacher) group.teacherName = state.teacher;

    var ids = [];
    state.students.forEach(function(st){
      var nm = normalize(st.name);
      if(!nm) return;
      var student = data.students.find(function(x){ return x.groupId === group.id && normalize(x.name) === nm; });
      if(!student){
        student = {id: genId(), name: st.name.trim(), groupId: group.id, constants: [], notes:'', phone:'', country:'', timezone:'', guardianName:'', birthDate:'', currentLevel:'', telegram:'', gender: st.gender || 'male'};
        data.students.push(student);
      } else {
        if (st.gender) student.gender = st.gender;
      }
      if(!student.constants) student.constants = [];
      if (st.attendance === 'present' && st.level) student.currentLevel = st.level;
      ids.push(student.id);
    });

    var report = document.getElementById('output').value || generateReportText();
    data.sessions.push({
      id: genId(), groupId: group.id, studentIds: ids,
      date: state.date || '', time: sessTime, ruleId: sessRuleId, extraId: sessExtraId,
      lessonNumber: state.lesson || '', duration: state.duration || '',
      subject: state.subject, subjects: state.subjects,
      attachmentIds: currentAttachments.map(function(a){ return a.id; }),
      data: state, report: report, savedAt: new Date().toISOString()
    });

    var saved = await saveDataAsync();
    if (saved) {
      _draftUnsaved = false;
      showNotify('✅ تم حفظ الحصة');
      if (btn) showSaveSuccess(btn);
    }

    if(document.getElementById('tab-home').classList.contains('active')) renderHome();
    updatePendingBadge();
  } catch(e){
    console.error(e);
    showNotify('خطأ في الحفظ');
  }
}

/* ═══════════════ SHARE / COPY ═══════════════ */
export function shareReportWhatsApp(){
  var out = document.getElementById('output');
  var txt = (out && out.value) ? out.value : document.getElementById('sheetOutput').value;
  if(!txt || !txt.trim()){ showNotify('أنشئ التقرير أولاً'); return; }
  var grpName = normalize(document.getElementById('groupName').value);
  var grp = data.groups.find(function(g){ return normalize(g.name) === grpName; });
  var studentsWithPhone = [];
  document.querySelectorAll('.student-card').forEach(function(card){
    var sName = (card.querySelector('.student-name').value || '').trim();
    var att = card.querySelector('.student-attendance').value;
    if (!sName || att !== 'present') return;
    var s = grp ? data.students.find(function(x){ return x.groupId === grp.id && normalize(x.name) === normalize(sName); }) : null;
    if (s && s.phone && s.phone.trim()) studentsWithPhone.push({ name: s.name, phone: s.phone.trim() });
  });
  if (studentsWithPhone.length === 0){ doShare(txt, null); return; }
  if (studentsWithPhone.length === 1){ doShare(txt, studentsWithPhone[0].phone); return; }
  var body = '<p style="margin-bottom:12px;font-weight:700">إرسال التقرير إلى:</p>';
  body += '<button class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" onclick="doShareCurrentReport(null)"><span data-icon="globe" data-icon-size="14"></span><span style="margin-right:6px">عام (اختر المحادثة)</span></button>';
  studentsWithPhone.forEach(function(s){
    var cleanPhone = s.phone.replace(/[^0-9]/g,'');
    body += '<button class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" onclick="doShareCurrentReport(\'' + escapeAttr(cleanPhone) + '\')"><div><div style="font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('smartphone', 14) + escapeHtml(s.name) + '</div><div style="font-size:.8rem;color:var(--text-muted)">' + escapeHtml(s.phone) + '</div></div></button>';
  });
  openGenericModal('إرسال واتساب', body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>');
}

export function shareReportTelegram(){
  var out = document.getElementById('output');
  var txt = (out && out.value) ? out.value : document.getElementById('sheetOutput').value;
  if(!txt || !txt.trim()){ showNotify('أنشئ التقرير أولاً'); return; }
  var grpName = normalize(document.getElementById('groupName').value);
  var grp = data.groups.find(function(g){ return normalize(g.name) === grpName; });
  var studentsWithPhone = [];
  document.querySelectorAll('.student-card').forEach(function(card){
    var sName = (card.querySelector('.student-name').value || '').trim();
    var att = card.querySelector('.student-attendance').value;
    if (!sName || att !== 'present') return;
    var s = grp ? data.students.find(function(x){ return x.groupId === grp.id && normalize(x.name) === normalize(sName); }) : null;
    var contactInfo = s ? (s.telegram || s.phone) : '';
    if (s && contactInfo && contactInfo.trim()) studentsWithPhone.push({ name: s.name, phone: contactInfo.trim() });
  });
  if (studentsWithPhone.length === 0){ doShareTelegram(txt, null); return; }
  if (studentsWithPhone.length === 1){ doShareTelegram(txt, studentsWithPhone[0].phone); return; }
  var body = '<p style="margin-bottom:12px;font-weight:700">إرسال التقرير إلى:</p>';
  body += '<button class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" onclick="doShareCurrentReportTelegram(null)"><span data-icon="globe" data-icon-size="14"></span><span style="margin-right:6px">عام (اختر المحادثة)</span></button>';
  studentsWithPhone.forEach(function(s){
    body += '<button class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" onclick="doShareCurrentReportTelegram(\'' + escapeAttr(s.phone) + '\')"><div><div style="font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('send', 14) + escapeHtml(s.name) + '</div><div style="font-size:.8rem;color:var(--text-muted)">' + escapeHtml(s.phone) + '</div></div></button>';
  });
  openGenericModal('إرسال تيليجرام', body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>');
}

export function doShareCurrentReportTelegram(phone){
  closeGenericModal();
  var out = document.getElementById('output');
  var txt = (out && out.value) ? out.value : document.getElementById('sheetOutput').value;
  doShareTelegram(txt, phone);
}

export function doShareTelegram(text, phone){
  if (!text || !text.trim()){ showNotify('لا يوجد تقرير'); return; }
  var encodedText = encodeURIComponent(text);
  
  if (phone && phone.trim()) {
    var contact = phone.trim();
    // رابط عميق لفتح محادثة المستخدم مباشرة
    var url = 'tg://resolve?';
    if (contact.startsWith('@')) {
      url += 'domain=' + contact.substring(1);
    } else {
      url += 'phone=' + contact.replace(/[^0-9]/g, '');
    }
    
    // بسبب قيود تيليجرام الأمنية، لا يمكن تمرير النص في رابط المحادثة المباشرة
    // لذلك ننسخ النص ليقوم المستخدم بلصقه (هذا أفضل حل ممكن تقنياً)
    if(navigator.clipboard) navigator.clipboard.writeText(text);
    window.location.href = url;
    showNotify('تم فتح المحادثة ونسخ التقرير — الصقه في المحادثة');
  } else {
    // رابط عميق لفتح تيليجرام ومشاركة النص مع أي شخص (اختيار المحادثة)
    window.location.href = 'tg://msg_url?text=' + encodedText;
  }
}

export function doShareCurrentReport(phone){
  closeGenericModal();
  var out = document.getElementById('output');
  var txt = (out && out.value) ? out.value : document.getElementById('sheetOutput').value;
  doShare(txt, phone);
}

export function doShare(text, phone){
  if (!text || !text.trim()){ showNotify('لا يوجد تقرير'); return; }
  var cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  var encodedText = encodeURIComponent(text);
  
  // رابط عميق لفتح تطبيق واتساب مباشرة دون المرور بالمتصفح
  var url = cleanPhone 
    ? 'whatsapp://send?phone=' + cleanPhone + '&text=' + encodedText 
    : 'whatsapp://send?text=' + encodedText;
    
  // التوجيه المباشر لنظام الهاتف لفتح التطبيق
  window.location.href = url;
}

export function copyReport(){
  var out = document.getElementById('output');
  var txt = (out && out.value) ? out.value : document.getElementById('sheetOutput').value;
  if(!txt){ showNotify('أنشئ التقرير أولاً'); return; }
  copyText(txt);
}

export function copyText(txt){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){ showNotify('تم النسخ'); }).catch(function(){ fallbackCopy(txt); });
  } else fallbackCopy(txt);
}

export function fallbackCopy(text){
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showNotify('تم النسخ'); } catch(e){ showNotify('فشل النسخ'); }
  document.body.removeChild(ta);
}

export function generateReminderText(dateISO, groupId, time){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  var d = new Date(dateISO + 'T00:00:00');
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var dayName = !isNaN(d.getTime()) ? dayNames[d.getDay()] : '';
  var tTZ = getTeacherTimezone();
  var sTZ = (g && g.timezone) ? g.timezone : tTZ;
  var groupTime = convertTimeBetweenTimezones(dateISO, time, tTZ, sTZ);
  var groupClean = g ? cleanGroupName(g.name) : '';

  return '🔔🔔\n'
    + 'السلام عليكم ورحمة الله وبركاته\n'
    + 'تذكير بموعدنا ' + dayName + ' إن شاء الله الساعة ' + groupTime + '\n'
    + 'بتوقيتكم\n\n'
    + 'اسم الجروب/ ' + groupClean;
}

export async function generateReminderTextAsync(dateISO, groupId, time, lang){
  if (lang !== 'en') return generateReminderText(dateISO, groupId, time);
  var g = data.groups.find(function(x){ return x.id === groupId; });
  var d = new Date(dateISO + 'T00:00:00');
  var daysEn = (REPORT_I18N && REPORT_I18N.en && REPORT_I18N.en.days) || ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var dayNameEn = !isNaN(d.getTime()) ? daysEn[d.getDay()] : '';
  var tTZ = getTeacherTimezone();
  var sTZ = (g && g.timezone) ? g.timezone : tTZ;
  var groupTime = convertTimeBetweenTimezones(dateISO, time, tTZ, sTZ);
  var groupClean = g ? cleanGroupName(g.name) : '';
  var translatedGroup = groupClean;
  if (groupClean) {
    var trRes = await translateTextsOnline([groupClean], 'en');
    if (trRes && trRes.map && trRes.map[groupClean]) {
      translatedGroup = trRes.map[groupClean];
    }
  }
  return '🔔🔔\n'
    + 'Assalamu Alaikum wa Rahmatullahi wa Barakatuh\n'
    + 'Reminder of our session on ' + dayNameEn + ', Insha\'Allah, at ' + groupTime + ' (your local time)\n\n'
    + 'Group: ' + translatedGroup;
}

export async function switchReminderLang(lang){
  lang = (lang === 'en') ? 'en' : 'ar';
  var btnAr = document.getElementById('remLangBtn-ar');
  var btnEn = document.getElementById('remLangBtn-en');
  if (btnAr) btnAr.classList.toggle('active', lang === 'ar');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  var p = window._currentReminderParams;
  if (!p) return;
  var ta = document.getElementById('reminderMessageText');
  if (ta) ta.dir = (lang === 'en') ? 'ltr' : 'rtl';
  var txt = await generateReminderTextAsync(p.dateISO, p.groupId, p.time, lang);
  if (ta) ta.value = txt;
}

export function openReminderModal(dateISO, groupId, time){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if (!g) { showNotify('المجموعة غير موجودة'); return; }
  window._currentReminderParams = { dateISO: dateISO, groupId: groupId, time: time };
  var occs = getOccurrencesForDate(new Date(dateISO + 'T00:00:00'));
  var occ = occs.find(function(o){ return o.groupId === groupId && o.time === time; });
  window._currentReminderTargetStudentIds = (occ && Array.isArray(occ.studentIds) && occ.studentIds.length)
    ? occ.studentIds.slice()
    : null;
  var tTZ = getTeacherTimezone();
  var sTZ = g.timezone ? g.timezone : tTZ;
  var groupTime = convertTimeBetweenTimezones(dateISO, time, tTZ, sTZ);
  var msg = generateReminderText(dateISO, groupId, time);

  var tzNotice = '';
  if (!g.timezone) {
    tzNotice = '<div style="background:var(--warning-bg);color:var(--warning);padding:8px 12px;border-radius:8px;font-size:.78rem;margin-bottom:10px;display:flex;align-items:center;gap:6px">'
      + svgIcon('alert-triangle', 14)
      + '<span>لم يُحدد توقيت خاص لهذه المجموعة — الوقت المعروض بتوقيتك (' + escapeHtml(time) + ')</span></div>';
  } else if (g.timezone !== tTZ) {
    tzNotice = '<div style="background:var(--info-bg);color:var(--accent-blue);padding:8px 12px;border-radius:8px;font-size:.78rem;margin-bottom:10px;display:flex;align-items:center;gap:6px">'
      + svgIcon('globe', 14)
      + '<span>وقتك: ' + escapeHtml(time) + ' ← توقيتهم: ' + escapeHtml(groupTime) + ' (' + escapeHtml(g.timezone) + ')</span></div>';
  } else {
    tzNotice = '<div style="background:var(--card-secondary-bg);color:var(--text-muted);padding:8px 12px;border-radius:8px;font-size:.78rem;margin-bottom:10px;display:flex;align-items:center;gap:6px">'
      + svgIcon('clock', 14)
      + '<span>التوقيت مطابق لتوقيتك (' + escapeHtml(groupTime) + ')</span></div>';
  }

  var langTabs = '<div class="lib-subtabs" style="margin-bottom:10px">'
    + '<button type="button" class="lib-subtab active" id="remLangBtn-ar" onclick="switchReminderLang(\'ar\')">عربي</button>'
    + '<button type="button" class="lib-subtab" id="remLangBtn-en" onclick="switchReminderLang(\'en\')">English</button>'
    + '</div>';

  var body = tzNotice
    + langTabs
    + '<textarea id="reminderMessageText" dir="rtl" style="min-height:170px;height:185px;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7;font-size:.9rem">' + escapeHtml(msg) + '</textarea>'
    + '<p style="font-size:.72rem;color:var(--text-muted);margin:6px 0 0">يمكنك تعديل النص قبل النسخ أو الإرسال</p>';

  var footer = '<button type="button" class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>'
    + '<button type="button" class="btn btn-copy" onclick="copyReminderText()">' + svgIcon('copy', 14) + ' نسخ</button>'
    + '<button type="button" class="btn btn-primary" style="width:auto;margin:0" onclick="shareReminderWhatsApp(\'' + escapeAttr(groupId) + '\')">' + svgIcon('smartphone', 14) + ' واتساب</button>'
    + '<button type="button" class="btn btn-secondary" onclick="shareReminderTelegram(\'' + escapeAttr(groupId) + '\')">' + svgIcon('send', 14) + ' تيليجرام</button>';

  openGenericModal(svgIcon('bell', 18) + ' إرسال تذكير', body, footer);
}

export function copyReminderText(){
  var el = document.getElementById('reminderMessageText');
  var txt = el ? el.value : '';
  if (!txt.trim()) { showNotify('النص فارغ'); return; }
  copyText(txt);
}

export function shareReminderWhatsApp(groupId){
  var el = document.getElementById('reminderMessageText');
  var txt = el ? el.value : '';
  if (!txt.trim()) { showNotify('النص فارغ'); return; }

  var targetIds = (Array.isArray(window._currentReminderTargetStudentIds) && window._currentReminderTargetStudentIds.length)
    ? window._currentReminderTargetStudentIds
    : null;
  var studentsWithPhone = data.students.filter(function(s){
    if (s.groupId !== groupId || !s.phone || !s.phone.trim()) return false;
    if (targetIds && targetIds.indexOf(s.id) === -1) return false;
    return true;
  });

  if (studentsWithPhone.length === 0) {
    doShare(txt, null);
    return;
  }
  if (studentsWithPhone.length === 1) {
    doShare(txt, studentsWithPhone[0].phone.trim());
    return;
  }

  window._pendingReminderText = txt;
  var body = '<p style="margin-bottom:12px;font-weight:700">إرسال التذكير إلى:</p>';
  body += '<button type="button" class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" onclick="doSharePendingReminderWhatsApp(\'\')">' + svgIcon('globe', 14) + '<span style="margin-right:6px">عام (اختر المحادثة)</span></button>';
  studentsWithPhone.forEach(function(s){
    var cleanPhone = s.phone.trim().replace(/[^0-9]/g, '');
    body += '<button type="button" class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" data-phone="' + escapeAttr(cleanPhone) + '" onclick="doSharePendingReminderWhatsApp(this.dataset.phone)">'
      + '<div><div style="font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('smartphone', 14) + escapeHtml(s.name) + '</div>'
      + '<div style="font-size:.8rem;color:var(--text-muted)">' + escapeHtml(s.phone.trim()) + '</div></div></button>';
  });
  openGenericModal('إرسال تذكير واتساب', body, '<button type="button" class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>');
}

export function doSharePendingReminderWhatsApp(phone){
  var txt = window._pendingReminderText || '';
  window._pendingReminderText = '';
  closeGenericModal();
  doShare(txt, phone || null);
}

export function shareReminderTelegram(groupId){
  var el = document.getElementById('reminderMessageText');
  var txt = el ? el.value : '';
  if (!txt.trim()) { showNotify('النص فارغ'); return; }

  var targetIds = (Array.isArray(window._currentReminderTargetStudentIds) && window._currentReminderTargetStudentIds.length)
    ? window._currentReminderTargetStudentIds
    : null;
  var studentsWithTg = data.students.filter(function(s){
    var contact = (s.telegram || s.phone || '').trim();
    if (s.groupId !== groupId || !contact) return false;
    if (targetIds && targetIds.indexOf(s.id) === -1) return false;
    return true;
  }).map(function(s){
    return { name: s.name, contact: (s.telegram || s.phone || '').trim() };
  });

  if (studentsWithTg.length === 0) {
    doShareTelegram(txt, null);
    return;
  }
  if (studentsWithTg.length === 1) {
    doShareTelegram(txt, studentsWithTg[0].contact);
    return;
  }

  window._pendingReminderText = txt;
  var body = '<p style="margin-bottom:12px;font-weight:700">إرسال التذكير إلى:</p>';
  body += '<button type="button" class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" onclick="doSharePendingReminderTelegram(\'\')">' + svgIcon('globe', 14) + '<span style="margin-right:6px">عام (اختر المحادثة)</span></button>';
  studentsWithTg.forEach(function(s){
    body += '<button type="button" class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" data-contact="' + escapeAttr(s.contact) + '" onclick="doSharePendingReminderTelegram(this.dataset.contact)">'
      + '<div><div style="font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('send', 14) + escapeHtml(s.name) + '</div>'
      + '<div style="font-size:.8rem;color:var(--text-muted)">' + escapeHtml(s.contact) + '</div></div></button>';
  });
  openGenericModal('إرسال تذكير تيليجرام', body, '<button type="button" class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>');
}

export function doSharePendingReminderTelegram(contact){
  var txt = window._pendingReminderText || '';
  window._pendingReminderText = '';
  closeGenericModal();
  doShareTelegram(txt, contact || null);
}

/* ═══════════════ HOME ═══════════════ */
export function renderHome(){
  var now = new Date();
  var todayDisplay = now.getDate() + '/' + (now.getMonth()+1) + '/' + now.getFullYear();
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var dayName = dayNames[now.getDay()];
  var tName = data.settings.teacherName || '';

  var greetEl = document.getElementById('homeGreeting');
  if (greetEl) greetEl.textContent = tName ? 'مرحبًا، ' + tName : 'مرحبًا';
  var subEl = document.getElementById('homeSubtitle');
  if (subEl) subEl.textContent = dayName + '، ' + todayDisplay;

  var nowCard = document.getElementById('homeNowCard');
  if (nowCard) {
    var todayOccs = getOccurrencesForDate(now);
    var activeOcc = null;
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var nowBefore = parseInt(data.settings.nowCardBeforeMin, 10);
    if (isNaN(nowBefore) || nowBefore < 0) nowBefore = 30;
    var nowAfter = parseInt(data.settings.nowCardAfterMin, 10);
    if (isNaN(nowAfter) || nowAfter < 5) nowAfter = 60;
    todayOccs.forEach(function(occ){
      if (occ.status === 'cancelled' || occ.status === 'completed') return;
      var p = occ.time.split(':').map(Number);
      var startMin = p[0]*60 + p[1];
      if (startMin - nowBefore <= nowMin && nowMin <= startMin + nowAfter) {
        if (!activeOcc || Math.abs(startMin - nowMin) < Math.abs(activeOcc.startMin - nowMin)) {
          activeOcc = { occ: occ, startMin: startMin };
        }
      }
    });
    if (activeOcc) {
      var minutesAgo = nowMin - activeOcc.startMin;
      var timeText;
      if (minutesAgo < 0) timeText = 'تبدأ بعد ' + Math.abs(minutesAgo) + ' دقيقة';
      else if (minutesAgo === 0) timeText = 'تبدأ الآن';
      else if (minutesAgo <= 60) timeText = 'جارية منذ ' + minutesAgo + ' دقيقة';
      else timeText = 'بدأت منذ ' + minutesAgo + ' دقيقة';
      nowCard.style.display = 'block';
      nowCard.innerHTML = '<div class="now-card">'
        + '<div class="now-badge">' + svgIcon('clock', 12) + ' الآن</div>'
        + '<div class="now-title">' + escapeHtml(activeOcc.occ.groupName) + '</div>'
        + '<div class="now-time">' + svgIcon('clock', 12) + ' ' + escapeHtml(formatTimeDisplay(activeOcc.occ.time)) + ' — ' + escapeHtml(timeText) + '</div>'
        + '<div class="now-actions">'
        + '<button class="btn btn-white" onclick="enterLessonAndOpenLink(\'' + activeOcc.occ.groupId + '\',\'' + activeOcc.occ.dateISO + '\',\'' + activeOcc.occ.time + '\')">' + svgIcon('play', 14) + ' دخول الحصة</button>'
        + '<button class="btn btn-ghost-white" onclick="showOccurrenceDetails(\'' + activeOcc.occ.dateISO + '\',\'' + activeOcc.occ.groupId + '\',\'' + activeOcc.occ.time + '\')">' + svgIcon('more-horizontal', 14) + '</button>'
        + '</div></div>';
    } else { nowCard.style.display = 'none'; nowCard.innerHTML = ''; }
  }

  var pendingCount = getPendingCount(14);
  var pendingCard = document.getElementById('homePendingCard');
  if (pendingCard) {
    if (pendingCount > 0) {
      pendingCard.style.display = 'block';
      pendingCard.innerHTML = '<div style="background:var(--warning-bg);border:1px solid var(--accent-amber);border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">'
        + '<div><div style="font-weight:700;color:var(--accent-amber);font-size:.92rem;display:flex;align-items:center;gap:8px">' + svgIcon('alert-triangle', 16) + '<span>لديك ' + pendingCount + ' حصة بدون تقرير</span></div>'
        + '<div style="font-size:.78rem;color:var(--text-muted);margin-top:4px;padding-right:24px">آخر ١٤ يومًا — سجّلها من التقويم</div></div>'
        + '<button onclick="switchTab(\'calendar\')" style="background:var(--accent-amber);color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;font-size:.82rem;display:inline-flex;align-items:center;gap:6px">' + svgIcon('calendar', 14) + ' عرض</button>'
        + '</div>';
    } else { pendingCard.style.display = 'none'; pendingCard.innerHTML = ''; }
  }

  var todayLessons = getOccurrencesForDate(now);
  var countEl = document.getElementById('homeTodayCount');
  if (countEl) countEl.textContent = todayLessons.length + ' حصة';
  var todayHtml = '';
  if (!todayLessons.length) {
    todayHtml = '<div class="home-empty-elegant">'
      + '<div class="he-icon">' + svgIcon('calendar', 24) + '</div>'
      + '<div class="he-title">لا توجد حصص اليوم</div>'
      + '<div class="he-sub">يوم هادئ — فرصة للاستعداد</div>'
      + '</div>';
  } else {
    var statusMeta = {
      upcoming: { label: 'قادمة', icon: 'clock', cls: 'status-upcoming' },
      pending: { label: 'بدون تقرير', icon: 'alert-triangle', cls: 'status-pending' },
      completed: { label: 'مكتملة', icon: 'check-circle', cls: 'status-completed' },
      cancelled: { label: 'ملغاة', icon: 'x-circle', cls: 'status-cancelled' }
    };
    todayLessons.forEach(function(occ){
      var g = data.groups.find(function(x){ return x.id === occ.groupId; });
      var subjLabel = (g && g.subject) ? g.subject : 'القرآن';
      var meta = statusMeta[occ.status] || statusMeta.upcoming;
      todayHtml += '<div class="lesson-item" onclick="showOccurrenceDetails(\'' + occ.dateISO + '\',\'' + occ.groupId + '\',\'' + occ.time + '\')">'
        + '<div class="lesson-time">' + escapeHtml(formatTimeDisplay(occ.time)) + '</div>'
        + '<div class="lesson-body"><div class="lesson-name">' + escapeHtml(occ.groupName) + '</div><div class="lesson-meta">' + escapeHtml(subjLabel) + '</div></div>'
        + '<span class="lesson-status ' + meta.cls + '">' + svgIcon(meta.icon, 12) + ' ' + meta.label + '</span>'
        + '</div>';
    });
  }
  var todayEl = document.getElementById('homeTodayLessons');
  if (todayEl) todayEl.innerHTML = todayHtml;

  var stats = getWorkStats(null);
  var statsHtml =
    '<div class="stat-pill"><div class="stat-value">' + data.students.length + '</div><div class="stat-label">طالب</div></div>'
    + '<div class="stat-pill"><div class="stat-value">' + data.groups.length + '</div><div class="stat-label">مجموعة</div></div>'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(stats.month) + '</div><div class="stat-label">الشهر</div></div>'
    + '<div class="stat-pill' + (pendingCount > 0 ? ' alert' : '') + '"><div class="stat-value">' + pendingCount + '</div><div class="stat-label">بدون</div></div>';
  var statsEl = document.getElementById('homeStats');
  if (statsEl) statsEl.innerHTML = statsHtml;

  var actionsHtml =
    '<button class="quick-btn" onclick="switchTab(\'lesson\')">' + svgIcon('plus-circle', 24) + '<span>حصة جديدة</span></button>'
    + '<button class="quick-btn" onclick="switchTab(\'calendar\')">' + svgIcon('calendar', 24) + '<span>التقويم</span></button>'
    + '<button class="quick-btn" onclick="openInAppBrowser()">' + svgIcon('globe', 24) + '<span>المتصفح</span></button>'
    + '<button class="quick-btn" onclick="switchTab(\'library\')">' + svgIcon('users', 24) + '<span>المكتبة</span></button>';
  var actEl = document.getElementById('homeActions');
  if (actEl) actEl.innerHTML = actionsHtml;

  /* ═══ حصص الغد ═══ */
  var tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0,0,0,0);
  var tomorrowOccs = getOccurrencesForDate(tomorrow);

  var tomTitleEl = document.getElementById('homeTomorrowTitle');
  if (tomTitleEl) {
    tomTitleEl.textContent = 'حصص الغد — ' + dayNames[tomorrow.getDay()] + ' ' + tomorrow.getDate() + '/' + (tomorrow.getMonth()+1);
  }
  var tomCountEl = document.getElementById('homeTomorrowCount');
  if (tomCountEl) {
    tomCountEl.textContent = tomorrowOccs.length + ' حصة';
  }

  var tomorrowHtml = '';
  if (!tomorrowOccs.length) {
    tomorrowHtml = '<div class="home-empty-elegant">'
      + '<div class="he-icon">' + svgIcon('calendar', 24) + '</div>'
      + '<div class="he-title">لا توجد حصص غدًا</div>'
      + '<div class="he-sub">يوم هادئ — فرصة للاستعداد</div>'
      + '</div>';
  } else {
    var statusMeta2 = {
      upcoming: { label: 'قادمة', icon: 'clock', cls: 'status-upcoming' },
      pending: { label: 'بدون تقرير', icon: 'alert-triangle', cls: 'status-pending' },
      completed: { label: 'مكتملة', icon: 'check-circle', cls: 'status-completed' },
      cancelled: { label: 'ملغاة', icon: 'x-circle', cls: 'status-cancelled' }
    };
    tomorrowOccs.forEach(function(occ){
      var g = data.groups.find(function(x){ return x.id === occ.groupId; });
      var subjLabel = (g && g.subject) ? g.subject : 'القرآن';
      var meta = statusMeta2[occ.status] || statusMeta2.upcoming;
      tomorrowHtml += '<div class="lesson-item" onclick="showOccurrenceDetails(\'' + occ.dateISO + '\',\'' + occ.groupId + '\',\'' + occ.time + '\')">'
        + '<div class="lesson-time">' + escapeHtml(formatTimeDisplay(occ.time)) + '</div>'
        + '<div class="lesson-body"><div class="lesson-name">' + escapeHtml(occ.groupName) + '</div><div class="lesson-meta">' + escapeHtml(subjLabel) + '</div></div>'
        + '<span class="lesson-status ' + meta.cls + '">' + svgIcon(meta.icon, 12) + ' ' + meta.label + '</span>'
        + '</div>';
    });
  }
  var tomEl = document.getElementById('homeTomorrowLessons');
  if (tomEl) tomEl.innerHTML = tomorrowHtml;
  updatePendingBadge();
  hydrateIcons(document.getElementById('tab-home'));
}

/* ═══════════════ LIBRARY — GROUPS ═══════════════ */
export function backToGroups(){ currentGroupSubPage = null; currentViewGroupId = null; currentViewStudentId = null; studentBackTarget = null; window.currentViewGroupId = null; window.currentViewStudentId = null; window.studentBackTarget = null; var gl = document.getElementById('groupsList'); if(gl) gl.style.display = ''; var gd = document.getElementById('groupDetail'); if(gd) gd.style.display = 'none'; }
export function backToStudents(){ currentStudentSubPage = null; currentViewStudentId = null; studentBackTarget = null; window.currentViewStudentId = null; window.studentBackTarget = null; var sl = document.getElementById('studentsList'); if(sl) sl.style.display = ''; var sd = document.getElementById('studentDetail'); if(sd) sd.style.display = 'none'; }
export function backFromStudentDetail(){ if(studentBackTarget){ var gid = studentBackTarget; studentBackTarget = null; switchLibSub('groups'); openGroupDetail(gid); } else backToStudents(); }

export function renderGroupsList(){
  var list = document.getElementById('groupsList'); if(!list) return;
  var searchEl = document.getElementById('groupSearch');
  var q = searchEl ? normalize(searchEl.value) : '';
  list.innerHTML = '';
  if(!data.groups.length){ list.innerHTML = '<div class="home-empty-elegant">'
  + '<div class="he-icon">' + svgIcon('folder-open', 24) + '</div>'
  + '<div class="he-title">لا توجد مجموعات بعد</div>'
  + '<div class="he-sub">اضغط "＋ مجموعة" لإنشاء أول مجموعة</div>'
  + '</div>'; return; }
  var filtered = data.groups.filter(function(g){ return !q || normalize(g.name).indexOf(q) !== -1; });
  if(!filtered.length){ list.innerHTML = '<div class="cfg-empty">لا نتائج مطابقة</div>'; return; }
  filtered.forEach(function(g){
    var students = data.students.filter(function(s){ return s.groupId === g.id; });
    var sessions = data.sessions.filter(function(s){ return s.groupId === g.id; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
    var lastDate = sessions.length && sessions[0].date ? fmtDate(sessions[0].date) : '';
    var row = document.createElement('div');
    row.className = 'lib-row';
    row.onclick = function(){ openGroupDetail(g.id); };
    row.innerHTML = '<div class="lib-row-icon">' + svgIcon('folder-open', 24) + '</div>'
      + '<div class="lib-row-body"><div class="lib-row-name">' + escapeHtml(g.name) + '</div>'
      + '<div class="lib-row-meta"><span>' + svgIcon('user', 12) + ' ' + students.length + ' طالب</span><span>' + svgIcon('calendar', 12) + ' ' + sessions.length + ' حصة</span>' + (lastDate ? '<span>' + svgIcon('clock', 12) + ' آخر: ' + escapeHtml(lastDate) + '</span>' : '') + '</div></div>'
      + '<div class="lib-row-arrow">' + svgIcon('chevron-left', 16) + '</div>';
    list.appendChild(row);
  });
}

export function addGroupPrompt(){
  openGenericModal('مجموعة جديدة', '<div class="form-field"><label>اسم المجموعة</label><input type="text" id="newGroupName" placeholder="مثال: أسرة النذير - 4438"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="createGroup()">إنشاء</button>');
  setTimeout(function(){ var i = document.getElementById('newGroupName'); if(i) i.focus(); }, 50);
}

export function createGroup(){
  var v = document.getElementById('newGroupName').value.trim();
  if(!v){ showNotify('أدخل اسمًا'); return; }
  if(data.groups.find(function(g){ return normalize(g.name) === normalize(v); })){ showNotify('الاسم موجود'); return; }
  data.groups.push({id: genId(), name: v, teacherName: data.settings.teacherName || '', constants: [], schedule: [], timezone: '', link: '', location: '', createdAt: new Date().toISOString()});
  saveData(); closeGenericModal(); renderGroupsList();
  showNotify('تم إنشاء المجموعة');
}

export function openGroupDetail(id){
  var g = data.groups.find(function(x){ return x.id === id; }); if(!g) return;
  var isSameGroup = (id === currentViewGroupId);
  if (!isSameGroup) {
    if (!currentViewGroupId) pushAppNavState('group-' + id);
    currentGroupSubPage = null;
  }
  currentViewGroupId = id; currentViewStudentId = null;
  window.currentViewGroupId = id; window.currentViewStudentId = null;

  var students = data.students.filter(function(s){ return s.groupId === g.id; });
  var sessions = data.sessions.filter(function(s){ return s.groupId === g.id; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var schedCount = (g.schedule || []).length;
  var excCount = (data.appointments || []).filter(function(a){ return a.groupId === g.id; }).length;
  var monthlyCount = data.monthlyReports.filter(function(r){ return r.ownerType === 'group' && r.ownerId === g.id; }).length;

  var detail = document.getElementById('groupDetail');
  document.getElementById('groupsList').style.display = 'none';
  detail.style.display = 'block';
  var linkMeta = g.link ? '<span>' + svgIcon('link', 12) + ' <a href="'+escapeAttr(normalizeUrl(g.link))+'" target="_blank" rel="noopener">دخول</a></span>' : '';
  var locMeta = g.location ? '<span>' + svgIcon('building-2', 12) + ' ' + escapeHtml(g.location) + '</span>' : '';

  if (currentGroupSubPage === null) {
    var schedBadge = schedCount + ' موعد' + (excCount ? ' · ' + excCount + ' استثناء' : '');
    detail.innerHTML = '<div class="page-slide-in">'
      + '<div class="detail-header"><button class="btn btn-secondary btn-sm" onclick="backToGroups()">' + svgIcon('arrow-right', 14) + ' رجوع</button><h2>' + svgIcon('folder-open', 20) + ' ' + escapeHtml(g.name) + '</h2><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editGroup(\''+g.id+'\')">' + svgIcon('edit-3', 12) + ' تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteGroup(\''+g.id+'\')">' + svgIcon('trash-2', 12) + '</button></div></div>'
      + '<div class="detail-meta"><span>' + svgIcon('user', 12) + ' ' + students.length + ' طالب</span><span>' + svgIcon('calendar', 12) + ' ' + sessions.length + ' حصة</span>' + (g.teacherName ? '<span>' + svgIcon('graduation-cap', 12) + ' ' + escapeHtml(g.teacherName) + '</span>' : '') + locMeta + linkMeta + '</div>'
      + '<div style="margin-bottom:20px"><button class="btn btn-primary" style="width:auto;margin:0" onclick="newSessionForGroup(\''+g.id+'\')">' + svgIcon('plus', 14) + ' حصة جديدة</button></div>'
      + '<div class="nav-menu-list">'
      + '<button type="button" class="nav-menu-item" onclick="openGroupSubPage(\'students\')">'
      + '<span class="nav-menu-icon">' + svgIcon('users', 18) + '</span>'
      + '<div class="nav-menu-body"><div class="nav-menu-title">الطلاب</div><div class="nav-menu-sub">عرض طلاب المجموعة أو إضافة طالب</div></div>'
      + '<span class="nav-menu-badge">' + students.length + ' طالب</span>'
      + '<span class="nav-menu-arrow">' + svgIcon('chevron-left', 16) + '</span>'
      + '</button>'
      + '<button type="button" class="nav-menu-item" onclick="openGroupSubPage(\'schedule\')">'
      + '<span class="nav-menu-icon info">' + svgIcon('alarm-clock', 18) + '</span>'
      + '<div class="nav-menu-body"><div class="nav-menu-title">المواعيد والاستثناءات</div><div class="nav-menu-sub">المواعيد المتكررة والحصص الاستثنائية</div></div>'
      + '<span class="nav-menu-badge">' + escapeHtml(schedBadge) + '</span>'
      + '<span class="nav-menu-arrow">' + svgIcon('chevron-left', 16) + '</span>'
      + '</button>'
      + '<button type="button" class="nav-menu-item" onclick="openGroupSubPage(\'sessions\')">'
      + '<span class="nav-menu-icon green">' + svgIcon('calendar', 18) + '</span>'
      + '<div class="nav-menu-body"><div class="nav-menu-title">سجل الحصص</div><div class="nav-menu-sub">تصفح تقارير الحصص المحفوظة</div></div>'
      + '<span class="nav-menu-badge">' + sessions.length + ' حصة</span>'
      + '<span class="nav-menu-arrow">' + svgIcon('chevron-left', 16) + '</span>'
      + '</button>'
      + '<button type="button" class="nav-menu-item" onclick="openGroupSubPage(\'monthly\')">'
      + '<span class="nav-menu-icon amber">' + svgIcon('file-text', 18) + '</span>'
      + '<div class="nav-menu-body"><div class="nav-menu-title">التقارير الشهرية</div><div class="nav-menu-sub">عرض وتوليد تقارير نهاية الشهر</div></div>'
      + '<span class="nav-menu-badge">' + monthlyCount + ' تقرير</span>'
      + '<span class="nav-menu-arrow">' + svgIcon('chevron-left', 16) + '</span>'
      + '</button>'
      + '<button type="button" class="nav-menu-item" onclick="openGroupSubPage(\'custom\')">'
      + '<span class="nav-menu-icon">' + svgIcon('settings', 18) + '</span>'
      + '<div class="nav-menu-body"><div class="nav-menu-title">التخصيص والثوابت</div><div class="nav-menu-sub">الثوابت، أنواع السطور، النصوص الثابتة</div></div>'
      + '<span class="nav-menu-arrow">' + svgIcon('chevron-left', 16) + '</span>'
      + '</button>'
      + '</div></div>';
  } else {
    var subTitles = {
      students: 'الطلاب (' + students.length + ')',
      schedule: 'المواعيد والاستثناءات',
      sessions: 'سجل الحصص (' + sessions.length + ')',
      monthly: 'التقارير الشهرية (' + monthlyCount + ')',
      custom: 'التخصيص والثوابت'
    };
    var bodySection = '';
    if (currentGroupSubPage === 'students') {
      var chips = students.length ? students.map(function(s){ return '<span class="student-chip" onclick="openStudentDetail(\''+s.id+'\',\''+g.id+'\')">' + svgIcon('user', 12) + ' ' + escapeHtml(s.name) + '</span>'; }).join('') : '<div style="color:var(--text-muted);font-size:.9rem">لا يوجد طلاب بعد</div>';
      bodySection = '<div class="detail-section"><h3><span>' + svgIcon('users', 14) + ' الطلاب (' + students.length + ')</span></h3><div>' + chips + '</div><button class="btn btn-secondary btn-sm" style="margin-top:14px" onclick="addStudentToGroup(\''+g.id+'\')">' + svgIcon('plus', 12) + ' إضافة طالب</button></div>';
    } else if (currentGroupSubPage === 'schedule') {
      bodySection = '<div class="detail-section"><h3><span>' + svgIcon('alarm-clock', 14) + ' المواعيد المتكررة</span><button class="btn btn-primary btn-sm" onclick="addSchedulePrompt(\''+g.id+'\')">' + svgIcon('plus', 12) + ' موعد</button></h3><div id="groupScheduleContainer">' + renderSchedule(g.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%" onclick="addExtraAppointmentPrompt(\''+g.id+'\')">' + svgIcon('plus', 12) + ' حصة استثنائية</button></div>'
        + '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' الاستثناءات</span></h3><div id="groupExceptionsContainer">' + renderGroupExceptions(g.id) + '</div></div>';
    } else if (currentGroupSubPage === 'sessions') {
      var tree = buildSessionsTree(sessions);
      bodySection = '<div class="detail-section"><h3><span>' + svgIcon('calendar', 14) + ' الحصص (' + sessions.length + ')</span><button class="btn btn-secondary btn-sm" onclick="toggleSessionSort()">' + (sessionSortOrder==='desc'? svgIcon('chevron-down', 12) + ' الأحدث' : svgIcon('chevron-down', 12) + ' الأقدم') + '</button></h3>' + tree + '</div>';
    } else if (currentGroupSubPage === 'monthly') {
      bodySection = '<div class="detail-section"><h3><span>' + svgIcon('file-text', 14) + ' التقارير الشهرية</span><button class="btn btn-primary btn-sm" onclick="openNewMonthlyReport(\'group\', \''+g.id+'\')">' + svgIcon('plus', 12) + ' تقرير</button></h3>' + buildMonthlyReportsTree('group', g.id) + '</div>';
    } else if (currentGroupSubPage === 'custom') {
      bodySection = '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' الثوابت</span></h3><div id="groupConstantsContainer">' + renderConstants('group', g.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addConstant(\'group\', \''+g.id+'\')">' + svgIcon('plus', 12) + ' إضافة ثابت</button></div>'
        + '<div class="detail-section"><h3><span>' + svgIcon('list', 14) + ' أنواع السطور</span><button class="btn btn-primary btn-sm" onclick="openRowTypeEditor(\'group\', \''+g.id+'\', null)">' + svgIcon('plus', 12) + ' نوع</button></h3><div id="groupRowTypesContainer">' + renderOwnerRowTypes('group', g.id) + '</div></div>'
        + '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' نصوص ثابتة</span><button class="btn btn-primary btn-sm" onclick="openStaticTextEditor(\'group\', \''+g.id+'\', null)">' + svgIcon('plus', 12) + ' نص</button></h3><div id="groupStaticTextsContainer">' + renderStaticTexts('group', g.id) + '</div></div>';
    }
    detail.innerHTML = '<div class="page-slide-in">'
      + '<div class="subpage-header">'
      + '<button type="button" class="btn btn-secondary btn-sm" onclick="backToGroupMain()">' + svgIcon('arrow-right', 14) + ' رجوع للمجموعة</button>'
      + '<div style="flex:1;min-width:0">'
      + '<h2>' + escapeHtml(subTitles[currentGroupSubPage] || '') + '</h2>'
      + '<div style="font-size:.76rem;color:var(--text-muted);margin-top:2px">' + escapeHtml(g.name) + '</div>'
      + '</div>'
      + '</div>'
      + bodySection
      + '</div>';
  }
  hydrateIcons(detail);
}

export function openGroupSubPage(sub){
  if (!currentViewGroupId) return;
  if (!currentGroupSubPage) pushAppNavState('group-sub-' + sub);
  currentGroupSubPage = sub;
  openGroupDetail(currentViewGroupId);
  window.scrollTo(0, 0);
}

export function backToGroupMain(){
  currentGroupSubPage = null;
  if (currentViewGroupId) openGroupDetail(currentViewGroupId);
  window.scrollTo(0, 0);
}

export function editGroup(id){
  var g = data.groups.find(function(x){ return x.id === id; }); if(!g) return;
  var locOpts = '<option value="">— بدون —</option>' + (data.settings.workLocations||[]).map(function(l){ return '<option value="'+escapeAttr(l)+'"'+(g.location===l?' selected':'')+'>'+escapeHtml(l)+'</option>'; }).join('');
  openGenericModal('تعديل المجموعة',
    '<div class="form-field"><label>اسم المجموعة</label><input type="text" id="editGroupName" value="'+escapeAttr(g.name)+'"></div>'
    +'<div class="form-field"><label>اسم المعلم</label><input type="text" id="editGroupTeacher" value="'+escapeAttr(g.teacherName||'')+'"></div>'
    +'<div class="form-field"><label>توقيت الطالب</label><div style="display:flex;gap:8px"><input type="text" id="editGroupTimezone" value="'+escapeAttr(g.timezone||'')+'" readonly placeholder="اضغط للاختيار" onclick="openTimezonePicker(function(tz){document.getElementById(\'editGroupTimezone\').value=tz;})" style="flex:1;cursor:pointer"><button type="button" class="btn btn-secondary" onclick="openTimezonePicker(function(tz){document.getElementById(\'editGroupTimezone\').value=tz;})" style="padding:10px 14px">' + svgIcon('globe', 14) + '</button></div></div>'
    +'<div class="form-field"><label>رابط الحصة</label><input type="url" id="editGroupLink" value="'+escapeAttr(g.link||'')+'" placeholder="https://zoom.us/j/..."></div>'
    +'<div class="form-field"><label>مكان العمل</label><select id="editGroupLocation">'+locOpts+'</select></div>',
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveGroupEdit(\''+id+'\')">حفظ</button>');
}

export function saveGroupEdit(id){
  var g = data.groups.find(function(x){ return x.id === id; }); if(!g) return;
  var n = document.getElementById('editGroupName').value.trim();
  if(!n){ showNotify('أدخل اسمًا'); return; }
  g.name = n;
  g.teacherName = document.getElementById('editGroupTeacher').value.trim();
  g.timezone = document.getElementById('editGroupTimezone').value.trim();
  g.link = normalizeUrl((document.getElementById('editGroupLink')||{}).value || '');
  g.location = (document.getElementById('editGroupLocation')||{}).value || '';
  saveData(); closeGenericModal(); openGroupDetail(id);
  showNotify('تم التعديل');
}

export async function deleteGroup(id){
  if(!confirm('حذف هذه المجموعة وكل طلابها وحصصها؟')) return;
  var _groupSessions = data.sessions.filter(function(s){ return s.groupId === id; });
  for (var _i = 0; _i < _groupSessions.length; _i++) {
    if (_groupSessions[_i].attachmentIds) {
      for (var _j = 0; _j < _groupSessions[_i].attachmentIds.length; _j++) {
        try { await idbAttachmentDelete(_groupSessions[_i].attachmentIds[_j]); } catch(e) {}
      }
    }
  }
  queueDelete('groups', id);
  data.students.filter(function(s){ return s.groupId === id; }).forEach(function(s){ queueDelete('students', s.id); });
  data.sessions.filter(function(s){ return s.groupId === id; }).forEach(function(s){ queueDelete('sessions', s.id); });
  (data.appointments || []).filter(function(a){ return a.groupId === id; }).forEach(function(a){ queueDelete('appointments', a.id); });

  data.groups = data.groups.filter(function(g){ return g.id !== id; });
  data.students = data.students.filter(function(s){ return s.groupId !== id; });
  data.sessions = data.sessions.filter(function(s){ return s.groupId !== id; });
  data.appointments = (data.appointments || []).filter(function(a){ return a.groupId !== id; });
  await saveDataAsync();
  scheduleAutoSync();
  backToGroups(); renderGroupsList();
  showNotify('تم الحذف');
  if(document.getElementById('tab-home').classList.contains('active')) renderHome();
  updatePendingBadge();
}

export async function deleteSession(id){
  if(!confirm('حذف هذه الحصة نهائيًا؟')) return;
  var _session = data.sessions.find(function(s){ return s.id === id; });
  if (_session && _session.attachmentIds) {
    for (var _i = 0; _i < _session.attachmentIds.length; _i++) {
      try { await idbAttachmentDelete(_session.attachmentIds[_i]); } catch(e) {}
    }
  }
  queueDelete('sessions', id);
  data.sessions = data.sessions.filter(function(s){ return s.id !== id; });
  await saveDataAsync();
  scheduleAutoSync();
  showNotify('تم حذف الحصة');
  if(currentViewStudentId) openStudentDetail(currentViewStudentId, studentBackTarget);
  else if(currentViewGroupId) openGroupDetail(currentViewGroupId);
  if(document.getElementById('tab-home').classList.contains('active')) renderHome();
  updatePendingBadge();
}

export function newSessionForGroup(id){
  var g = data.groups.find(function(x){ return x.id === id; }); if(!g) return;
  pickGroup(id); switchTab('lesson');
}

export function addStudentToGroup(groupId){
  openGenericModal('طالب جديد', '<div class="form-field"><label>اسم الطالب</label><input type="text" id="newStudentName"></div><div class="form-field"><label>الجنس</label><select id="newStudentGender"><option value="male">طالب (ذكر)</option><option value="female">طالبة (أنثى)</option></select></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="createStudentInGroup(\''+groupId+'\')">إضافة</button>');
  setTimeout(function(){ var i = document.getElementById('newStudentName'); if(i) i.focus(); }, 50);
}

export function createStudentInGroup(groupId){
  var v = document.getElementById('newStudentName').value.trim();
  if(!v){ showNotify('أدخل اسمًا'); return; }
  if(data.students.find(function(s){ return s.groupId === groupId && normalize(s.name) === normalize(v); })){ showNotify('الاسم موجود'); return; }
  var gender = (document.getElementById('newStudentGender')||{}).value || 'male';
  data.students.push({id: genId(), name: v, groupId: groupId, constants: [], notes:'', phone:'', country:'', timezone:'', guardianName:'', birthDate:'', currentLevel:'', telegram:'', gender: gender});
  saveData(); closeGenericModal(); openGroupDetail(groupId);
  showNotify('تم إضافة الطالب');
}

export function renderStudentsList(){
  var list = document.getElementById('studentsList'); if(!list) return;
  var q = (document.getElementById('studentSearch').value || '').trim();
  list.innerHTML = '';
  var filtered = data.students.filter(function(s){ return !q || normalize(s.name).indexOf(normalize(q)) !== -1; });
  if(!filtered.length){
    var isSearch = q && q.trim();
    list.innerHTML = '<div class="home-empty-elegant">'
      + '<div class="he-icon">' + svgIcon('user', 24) + '</div>'
      + '<div class="he-title">' + (isSearch ? 'لا نتائج مطابقة' : 'لا يوجد طلاب بعد') + '</div>'
      + '<div class="he-sub">' + (isSearch ? 'جرّب كلمة بحث أخرى' : 'أضف طالبًا من صفحة المجموعة') + '</div>'
      + '</div>'; return;
  }
  filtered.forEach(function(s){
    var g = data.groups.find(function(x){ return x.id === s.groupId; });
    var sc = data.sessions.filter(function(x){ return (x.studentIds||[]).indexOf(s.id) !== -1; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
    var lastDate = sc.length && sc[0].date ? fmtDate(sc[0].date) : '';
    var row = document.createElement('div');
    row.className = 'lib-row';
    row.onclick = function(){ openStudentDetail(s.id); };
    row.innerHTML = '<div class="lib-row-icon info">' + svgIcon('user', 24) + '</div>'
      + '<div class="lib-row-body"><div class="lib-row-name">' + escapeHtml(s.name) + '</div>'
      + '<div class="lib-row-meta"><span>' + svgIcon('folder-open', 12) + ' ' + escapeHtml(g?g.name:'—') + '</span><span>' + svgIcon('calendar', 12) + ' ' + sc.length + ' حصة</span>' + (lastDate ? '<span>' + svgIcon('clock', 12) + ' آخر: ' + escapeHtml(lastDate) + '</span>' : '') + '</div></div>'
      + '<div class="lib-row-arrow">' + svgIcon('chevron-left', 16) + '</div>';
    list.appendChild(row);
  });
}

/* ═══════════════ STUDENT DETAIL (FIX 4 APPLIED) ═══════════════ */
export function openStudentDetail(id, fromGroupId){
  var s = data.students.find(function(x){ return x.id === id; }); if(!s) return;
  var isSameStudent = (id === currentViewStudentId);
  if (!isSameStudent) {
    pushAppNavState('student-' + id);
    currentStudentSubPage = null;
  }
  currentViewStudentId = id;
  window.currentViewStudentId = id;
  if (typeof fromGroupId !== 'undefined' && fromGroupId !== null && fromGroupId !== '') {
    currentViewGroupId = fromGroupId;
    studentBackTarget = fromGroupId;
    switchLibSub('students');
  } else if (!isSameStudent) {
    currentViewGroupId = null;
    studentBackTarget = null;
  }
  window.currentViewGroupId = currentViewGroupId;
  window.studentBackTarget = studentBackTarget;

  var g = data.groups.find(function(x){ return x.id === s.groupId; });
  var sessions = data.sessions.filter(function(x){ return (x.studentIds||[]).indexOf(id) !== -1; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var monthlyCount = data.monthlyReports.filter(function(r){ return r.ownerType === 'student' && r.ownerId === s.id; }).length;
  var detail = document.getElementById('studentDetail');
  document.getElementById('studentsList').style.display = 'none';
  detail.style.display = 'block';

  if (currentStudentSubPage === null) {
    var phoneDisplay = s.phone ? '<span>' + svgIcon('smartphone', 12) + ' <a href="https://wa.me/'+escapeAttr(s.phone.replace(/[^0-9]/g,''))+'" target="_blank" rel="noopener">'+escapeHtml(s.phone)+'</a></span>' : '';
    var countryDisplay = s.country ? '<span>' + svgIcon('globe', 12) + ' ' + escapeHtml(s.country)+(s.timezone?' — '+escapeHtml(s.timezone):'')+'</span>' : '';
    var guardianDisplay = s.guardianName ? '<span>' + svgIcon('user-round', 12) + ' ' + escapeHtml(s.guardianName) + '</span>' : '';
    var levelDisplay = s.currentLevel ? '<span>' + svgIcon('graduation-cap', 12) + ' ' + escapeHtml(s.currentLevel) + '</span>' : '';
    var birthDisplay = s.birthDate ? '<span>' + svgIcon('cake', 12) + ' ' + escapeHtml(fmtDate(s.birthDate)) + '</span>' : '';
    var genderDisplay = '<span>' + svgIcon('user', 12) + ' ' + (s.gender === 'female' ? 'طالبة' : 'طالب') + '</span>';
    var metaExtra = [genderDisplay, guardianDisplay, phoneDisplay, countryDisplay, levelDisplay, birthDisplay].filter(Boolean).join('');

    detail.innerHTML = '<div class="page-slide-in">'
      + '<div class="detail-header"><button class="btn btn-secondary btn-sm" onclick="backFromStudentDetail()">' + svgIcon('arrow-right', 14) + ' رجوع</button><h2>' + svgIcon('user', 20) + ' ' + escapeHtml(s.name) + '</h2><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editStudent(\''+s.id+'\')">' + svgIcon('edit-3', 12) + ' تعديل</button><button class="btn btn-danger btn-sm" data-student-id="' + s.id + '" onclick="deleteStudent(this.dataset.studentId)">' + svgIcon('trash-2', 12) + '</button></div></div>'
      + '<div class="detail-meta"><span>' + svgIcon('folder-open', 12) + ' ' + escapeHtml(g?g.name:'—') + '</span><span>' + svgIcon('calendar', 12) + ' ' + sessions.length + ' حصة</span>' + metaExtra + '</div>'
      + '<div class="nav-menu-list">'
      + '<button type="button" class="nav-menu-item" onclick="openStudentSubPage(\'sessions\')">'
      + '<span class="nav-menu-icon green">' + svgIcon('calendar', 18) + '</span>'
      + '<div class="nav-menu-body"><div class="nav-menu-title">سجل الحصص</div><div class="nav-menu-sub">تصفح تقارير حصص الطالب</div></div>'
      + '<span class="nav-menu-badge">' + sessions.length + ' حصة</span>'
      + '<span class="nav-menu-arrow">' + svgIcon('chevron-left', 16) + '</span>'
      + '</button>'
      + '<button type="button" class="nav-menu-item" onclick="openStudentSubPage(\'monthly\')">'
      + '<span class="nav-menu-icon amber">' + svgIcon('file-text', 18) + '</span>'
      + '<div class="nav-menu-body"><div class="nav-menu-title">التقارير الشهرية</div><div class="nav-menu-sub">عرض وتوليد التقارير الشهرية للطالب</div></div>'
      + '<span class="nav-menu-badge">' + monthlyCount + ' تقرير</span>'
      + '<span class="nav-menu-arrow">' + svgIcon('chevron-left', 16) + '</span>'
      + '</button>'
      + '<button type="button" class="nav-menu-item" onclick="openStudentSubPage(\'custom\')">'
      + '<span class="nav-menu-icon">' + svgIcon('settings', 18) + '</span>'
      + '<div class="nav-menu-body"><div class="nav-menu-title">التخصيص والثوابت</div><div class="nav-menu-sub">الثوابت، أنواع السطور، النصوص الثابتة</div></div>'
      + '<span class="nav-menu-arrow">' + svgIcon('chevron-left', 16) + '</span>'
      + '</button>'
      + '</div></div>';
  } else {
    var subTitles = {
      sessions: 'سجل الحصص (' + sessions.length + ')',
      monthly: 'التقارير الشهرية (' + monthlyCount + ')',
      custom: 'التخصيص والثوابت'
    };
    var bodySection = '';
    if (currentStudentSubPage === 'sessions') {
      var tree = buildSessionsTree(sessions);
      bodySection = '<div class="detail-section"><h3><span>' + svgIcon('calendar', 14) + ' سجل الحصص (' + sessions.length + ')</span><button class="btn btn-secondary btn-sm" onclick="toggleSessionSort()">' + (sessionSortOrder==='desc'? svgIcon('chevron-down', 12) + ' الأحدث' : svgIcon('chevron-down', 12) + ' الأقدم') + '</button></h3>' + tree + '</div>';
    } else if (currentStudentSubPage === 'monthly') {
      bodySection = '<div class="detail-section"><h3><span>' + svgIcon('file-text', 14) + ' التقارير الشهرية</span><button class="btn btn-primary btn-sm" onclick="openNewMonthlyReport(\'student\', \''+s.id+'\')">' + svgIcon('plus', 12) + ' تقرير</button></h3>' + buildMonthlyReportsTree('student', s.id) + '</div>';
    } else if (currentStudentSubPage === 'custom') {
      bodySection = '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' الثوابت</span></h3><div id="studentConstantsContainer">' + renderConstants('student', s.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addConstant(\'student\', \''+s.id+'\')">' + svgIcon('plus', 12) + ' إضافة ثابت</button></div>'
        + '<div class="detail-section"><h3><span>' + svgIcon('list', 14) + ' أنواع السطور</span><button class="btn btn-primary btn-sm" onclick="openRowTypeEditor(\'student\', \''+s.id+'\', null)">' + svgIcon('plus', 12) + ' نوع</button></h3><div id="studentRowTypesContainer">' + renderOwnerRowTypes('student', s.id) + '</div></div>'
        + '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' نصوص ثابتة</span><button class="btn btn-primary btn-sm" onclick="openStaticTextEditor(\'student\', \''+s.id+'\', null)">' + svgIcon('plus', 12) + ' نص</button></h3><div id="studentStaticTextsContainer">' + renderStaticTexts('student', s.id) + '</div></div>';
    }
    detail.innerHTML = '<div class="page-slide-in">'
      + '<div class="subpage-header">'
      + '<button type="button" class="btn btn-secondary btn-sm" onclick="backToStudentMain()">' + svgIcon('arrow-right', 14) + ' رجوع للطالب</button>'
      + '<div style="flex:1;min-width:0">'
      + '<h2>' + escapeHtml(subTitles[currentStudentSubPage] || '') + '</h2>'
      + '<div style="font-size:.76rem;color:var(--text-muted);margin-top:2px">' + escapeHtml(s.name) + '</div>'
      + '</div>'
      + '</div>'
      + bodySection
      + '</div>';
  }
  hydrateIcons(detail);
}

export function openStudentSubPage(sub){
  if (!currentViewStudentId) return;
  if (!currentStudentSubPage) pushAppNavState('student-sub-' + sub);
  currentStudentSubPage = sub;
  openStudentDetail(currentViewStudentId, studentBackTarget || undefined);
  window.scrollTo(0, 0);
}

export function backToStudentMain(){
  currentStudentSubPage = null;
  if (currentViewStudentId) openStudentDetail(currentViewStudentId, studentBackTarget || undefined);
  window.scrollTo(0, 0);
}

export function editStudent(id){
  var s = data.students.find(function(x){ return x.id === id; }); if(!s) return;
  var groupsHTML = '<option value="">— بدون —</option>';
  data.groups.forEach(function(g){ groupsHTML += '<option value="'+g.id+'"'+(g.id===s.groupId?' selected':'')+'>'+escapeHtml(g.name)+'</option>'; });
  var countriesHTML = '<option value="">— اختر —</option>';
  var seen = {};
  var countryTz = window.COUNTRY_TZ || [];
  countryTz.forEach(function(c){ if(seen[c.ar]) return; seen[c.ar] = 1; countriesHTML += '<option value="'+escapeAttr(c.ar)+'"'+(s.country===c.ar?' selected':'')+'>'+escapeHtml(c.ar)+'</option>'; });
  var levels = ['ممتاز','جيد جدًّا','جيد','مقبول','ضعيف'];
  var levelOpts = '<option value="">— غير محدد —</option>';
  levels.forEach(function(l){ levelOpts += '<option value="'+l+'"'+(s.currentLevel===l?' selected':'')+'>'+l+'</option>'; });
  openGenericModal('تعديل بيانات الطالب',
    '<div class="form-field"><label>اسم الطالب</label><input type="text" id="editStudentName" value="'+escapeAttr(s.name)+'"></div>'
    +'<div class="form-field"><label>الجنس</label><select id="editStudentGender"><option value="male"'+(s.gender!=='female'?' selected':'')+'>طالب (ذكر)</option><option value="female"'+(s.gender==='female'?' selected':'')+'>طالبة (أنثى)</option></select></div>'
    +'<div class="form-field"><label>المجموعة</label><select id="editStudentGroup">'+groupsHTML+'</select></div>'
    +'<div class="form-field"><label>اسم ولي الأمر</label><input type="text" id="editStudentGuardian" value="'+escapeAttr(s.guardianName||'')+'"></div>'
    +'<div class="form-field"><label>رقم واتساب</label><input type="tel" id="editStudentPhone" value="'+escapeAttr(s.phone||'')+'" placeholder="+201234567890"></div>'
    +'<div class="form-field"><label>اسم مستخدم تيليجرام (اختياري)</label><input type="text" id="editStudentTelegram" value="'+escapeAttr(s.telegram||'')+'" placeholder="@username أو رقم الهاتف"></div>'
    +'<div class="form-row-2">'
    +'<div class="form-field"><label>الدولة</label><select id="editStudentCountry" onchange="onStudentCountryChange()">'+countriesHTML+'</select></div>'
    +'<div class="form-field"><label>المنطقة الزمنية</label><input type="text" id="editStudentTimezone" value="'+escapeAttr(s.timezone||'')+'" readonly placeholder="تلقائي" onclick="openTimezonePicker(function(tz){document.getElementById(\'editStudentTimezone\').value=tz;})" style="cursor:pointer"></div>'
    +'</div>'
    +'<div class="form-row-2">'
    +'<div class="form-field"><label>تاريخ الميلاد</label><input type="date" id="editStudentBirthDate" value="'+escapeAttr(s.birthDate||'')+'"></div>'
    +'<div class="form-field"><label>المستوى الحالي</label><select id="editStudentCurrentLevel">'+levelOpts+'</select></div>'
    +'</div>',
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveStudentEdit(\''+id+'\')">حفظ</button>');
}

export function onStudentCountryChange(){
  var c = document.getElementById('editStudentCountry').value;
  if(!c) return;
  var tz = document.getElementById('editStudentTimezone');
  if(!tz || tz.value.trim()) return;
  var countryTz = window.COUNTRY_TZ || [];
  var e = countryTz.find(function(x){ return x.ar === c; });
  if(e) tz.value = e.tz;
}

export function saveStudentEdit(id){
  var s = data.students.find(function(x){ return x.id === id; }); if(!s) return;
  var n = document.getElementById('editStudentName').value.trim();
  if(!n){ showNotify('أدخل اسمًا'); return; }
  var oldName = s.name;
  var nameChanged = (normalize(oldName) !== normalize(n));
  s.name = n;
  s.gender = (document.getElementById('editStudentGender')||{}).value || 'male';
  var gid = document.getElementById('editStudentGroup').value;
  if(gid) s.groupId = gid;
  s.guardianName = (document.getElementById('editStudentGuardian').value || '').trim();
  s.phone = (document.getElementById('editStudentPhone').value || '').trim();
  s.telegram = (document.getElementById('editStudentTelegram').value || '').trim();
  s.country = (document.getElementById('editStudentCountry').value || '').trim();
  s.timezone = (document.getElementById('editStudentTimezone').value || '').trim();
  s.birthDate = (document.getElementById('editStudentBirthDate').value || '').trim();
  s.currentLevel = (document.getElementById('editStudentCurrentLevel').value || '').trim();
  if (nameChanged) {
    data.sessions.forEach(function(ses){
      if (!ses.data || !ses.data.students) return;
      ses.data.students.forEach(function(st){
        if (normalize(st.name) === normalize(oldName)) st.name = n;
      });
    });
  }
  saveData();
  closeGenericModal();
  openStudentDetail(id);
  showNotify('تم الحفظ' + (nameChanged ? ' (محدَّث في السجل)' : ''));
}

export async function deleteStudent(id){
  if(!confirm('حذف هذا الطالب؟')) return;
  queueDelete('students', id);
  data.students = data.students.filter(function(s){ return s.id !== id; });
  data.sessions.forEach(function(ses){ ses.studentIds = (ses.studentIds||[]).filter(function(sid){ return sid !== id; }); });
  await saveDataAsync();
  scheduleAutoSync();
  backToStudents(); renderStudentsList();
  showNotify('تم الحذف');
}

/* ═══════════════ SESSIONS TREE ═══════════════ */
export function buildSessionsTree(sessions){
  if(!sessions.length) return '<div class="cfg-empty">لا توجد حصص بعد</div>';
  var sorted = sessions.slice().sort(function(a,b){ return sessionSortOrder === 'desc' ? (b.date||'').localeCompare(a.date||'') : (a.date||'').localeCompare(b.date||''); });
  var byYear = {};
  sorted.forEach(function(s){ if(!s.date) return; var y = s.date.slice(0,4), m = s.date.slice(5,7); if(!byYear[y]) byYear[y] = {}; if(!byYear[y][m]) byYear[y][m] = []; byYear[y][m].push(s); });
  var years = Object.keys(byYear).sort();
  if(sessionSortOrder === 'desc') years.reverse();
  var html = '';
  var monthNames = window.MONTH_NAMES || ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  years.forEach(function(y){
    var open = (sessionSortOrder === 'desc' && y === years[0]) ? ' open' : '';
    html += '<details class="year-block"'+open+'><summary><span>' + svgIcon('calendar-days', 16) + ' ' + y + '</span><span style="color:var(--text-muted)">' + svgIcon('chevron-down', 14) + '</span></summary>';
    var months = Object.keys(byYear[y]).sort();
    if(sessionSortOrder === 'desc') months.reverse();
    months.forEach(function(m){
      var mi = parseInt(m,10) - 1;
      html += '<details class="month-block"><summary><span>' + svgIcon('calendar', 14) + ' ' + (monthNames[mi]||m) + '</span><span>' + svgIcon('chevron-down', 12) + '</span></summary><div style="padding:5px 10px">';
      byYear[y][m].sort(function(a,b){ return sessionSortOrder === 'desc' ? (b.date||'').localeCompare(a.date||'') : (a.date||'').localeCompare(b.date||''); }).forEach(function(s){
        var d = s.date ? s.date.slice(8,10)+'/'+s.date.slice(5,7) : '';
        html += '<div class="session-row"><div><div class="session-row-date">' + d + ' — الحصة ' + escapeHtml(s.lessonNumber||'—') + '</div><div class="session-row-sub">' + svgIcon('clock', 12) + ' ' + durationToWords(s.duration) + '</div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="viewSession(\''+s.id+'\')" title="عرض">' + svgIcon('search', 12) + '</button><button class="btn btn-copy btn-sm" onclick="copySessionReport(\''+s.id+'\')" title="نسخ">' + svgIcon('copy', 12) + '</button><button class="btn btn-word btn-sm" onclick="exportSessionWord(\''+s.id+'\')" title="Word">' + svgIcon('file-word', 12) + '</button><button class="btn btn-danger btn-sm" onclick="deleteSession(\''+s.id+'\')" title="حذف">' + svgIcon('trash-2', 12) + '</button></div></div>';
      });
      html += '</div></details>';
    });
    html += '</details>';
  });
  return html;
}

export function toggleSessionSort(){
  sessionSortOrder = sessionSortOrder === 'desc' ? 'asc' : 'desc';
  window.sessionSortOrder = sessionSortOrder;
  if(currentViewStudentId) openStudentDetail(currentViewStudentId, studentBackTarget);
  else if(currentViewGroupId) openGroupDetail(currentViewGroupId);
}

export async function viewSession(id){
  var s = data.sessions.find(function(x){ return x.id === id; }); if(!s) return;
  
  var hasAtt = s.attachmentIds && s.attachmentIds.length > 0;
  var attContainer = hasAtt ? '<div style="margin-top:14px"><h4 style="font-size:.9rem;margin-bottom:8px;color:var(--accent-blue)">📎 المرفقات ('+s.attachmentIds.length+')</h4><div id="viewSessionAttachments" style="display:flex;flex-wrap:wrap;gap:10px"><div style="font-size:.8rem;color:var(--text-muted)">جارٍ التحميل...</div></div></div>' : '';
  
  openGenericModal('تقرير الحصة', '<textarea id="sessionReportView" style="min-height:320px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7;font-size:14px">'+escapeHtml(s.report||'')+'</textarea>' + attContainer, '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveSessionReport(\''+id+'\')">' + svgIcon('save', 14) + ' حفظ</button><button class="btn btn-copy" onclick="copySessionReport(\''+id+'\')">' + svgIcon('copy', 14) + ' نسخ</button>');
  
  if (hasAtt) {
    var cont = document.getElementById('viewSessionAttachments');
    if (cont) {
      cont.innerHTML = '';
      for (var i = 0; i < s.attachmentIds.length; i++) {
        try {
          var file = await idbAttachmentGet(s.attachmentIds[i]);
          if (!file) continue;
          var url = URL.createObjectURL(file);
          _sessionViewUrls.push(url);
          var div = document.createElement('div');
          div.style.cssText = 'position:relative;width:90px;height:90px;border-radius:8px;border:1px solid var(--card-border);background:var(--card-bg);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;';
          if (file.type && file.type.startsWith('image/')) {
            div.innerHTML = '<img src="'+url+'" style="width:100%;height:100%;object-fit:cover;">';
            div.onclick = function(u){ return function(){ window.open(u, '_blank'); }; }(url);
          } else {
            div.innerHTML = '<span style="color:var(--accent-blue);font-size:1.5rem">📄</span><div style="position:absolute;bottom:2px;right:2px;font-size:.6rem;background:rgba(0,0,0,0.6);color:#fff;padding:1px 3px;border-radius:3px">'+(file.name || 'ملف')+'</div>';
            div.onclick = function(u, n){ return function(){ var a = document.createElement('a'); a.href = u; a.download = n || 'file'; a.click(); }; }(url, file.name || 'file.pdf');
          }
          cont.appendChild(div);
        } catch(e) { console.error('Failed to load attachment', s.attachmentIds[i], e); }
      }
      if (cont.children.length === 0) {
        cont.innerHTML = '<div style="font-size:.8rem;color:var(--text-muted)">لم يتم العثور على المرفقات (ربما حُذفت)</div>';
      }
    }
  }
}

export function saveSessionReport(id){
  var s = data.sessions.find(function(x){ return x.id === id; }); if(!s) return;
  s.report = document.getElementById('sessionReportView').value;
  s.reportEdited = true;
  s.reportEditedAt = new Date().toISOString();
  saveData();
  showNotify('تم حفظ التعديل');
}

export function copySessionReport(id){ var s = data.sessions.find(function(x){ return x.id === id; }); if(s) copyText(s.report || ''); }

export function exportSessionWord(id){
  var s = data.sessions.find(function(x){ return x.id === id; }); if(!s) return;
  var savedH = currentHiddenStaticIds; var savedT = currentCustomRowTypes;
  currentHiddenStaticIds = (s.data && s.data.hiddenStaticIds) || [];
  window.currentHiddenStaticIds = currentHiddenStaticIds;
  var grp = data.groups.find(function(g){ return g.id === s.groupId; });
  currentCustomRowTypes = (grp && grp.reportSettings && grp.reportSettings.customRowTypes) || [];
  window.currentCustomRowTypes = currentCustomRowTypes;
  try { exportToWordFromState(s.data || {}, s.report || ''); }
  finally {
    currentHiddenStaticIds = savedH; currentCustomRowTypes = savedT;
    window.currentHiddenStaticIds = savedH; window.currentCustomRowTypes = savedT;
  }
}

export function clearForm(){
  if(!confirm('مسح النموذج وبدء حصة جديدة؟')) return;
  _currentLessonContext = null;
  var draftKey = window.DRAFT_KEY || 'quran_draft_v4';
  localStorage.removeItem(draftKey);
  document.getElementById('groupName').value = '';
  document.getElementById('teacherName').value = data.settings.teacherName || '';
  document.getElementById('lessonOrder').value = '';
  document.getElementById('duration').value = '';
  document.getElementById('reportDate').valueAsDate = new Date();
  document.getElementById('output').value = '';
  var so = document.getElementById('sheetOutput'); if(so) so.value = '';
  currentSubjects = { quran: true, arabic: false, islamic: false };
  window.currentSubjects = currentSubjects;
  updateSubjectButtons();
  setCurrentAttachments([]);
  renderAttachmentsUI();
  currentCustomRowTypes = [];
  currentHiddenStaticIds = [];
  window.currentCustomRowTypes = currentCustomRowTypes;
  window.currentHiddenStaticIds = currentHiddenStaticIds;
  renderActiveStaticTexts(); updateLessonLinkBar();
  var pc = document.getElementById('previousLessonCard'); if(pc) pc.style.display = 'none';
  var c = document.getElementById('studentsContainer'); if(c) c.innerHTML = '';
  currentStudentCount = 0; setStudentCount(1); saveDraft();
  _draftUnsaved = false;
  showNotify('نموذج جديد');
}

/* ═══════════════ BACKUP ARCHITECTURE ═══════════════ */
export async function _saveBlobWithPicker(blob, suggestedName, acceptTypes) {
  if (window.showSaveFilePicker) {
    try {
      var handle = await window.showSaveFilePicker({
        suggestedName: suggestedName,
        types: acceptTypes
      });
      if (!handle) return { saved: false, cancelled: true };
      var writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { saved: true, method: 'fs' };
    } catch (e) {
      if (e.name === 'AbortError') return { saved: false, cancelled: true };
      console.warn('showSaveFilePicker failed, falling back:', e);
    }
  }

  try {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    return { saved: true, method: 'download' };
  } catch (e) {
    return { saved: false, error: e };
  }
}

export async function _getBackupSizes() {
  var jsonStr = JSON.stringify(data);
  var jsonSize = 0;
  try { jsonSize = new Blob([jsonStr]).size; } catch (e) { jsonSize = jsonStr.length; }

  var attachmentsCount = 0;
  var attachmentsSize = 0;

  for (var i = 0; i < data.sessions.length; i++) {
    var s = data.sessions[i];
    if (!s.attachmentIds || !s.attachmentIds.length) continue;
    for (var j = 0; j < s.attachmentIds.length; j++) {
      try {
        var file = await idbAttachmentGet(s.attachmentIds[j]);
        if (file) {
          attachmentsCount++;
          attachmentsSize += (file.size || 0);
        }
      } catch (e) { }
    }
  }

  return {
    jsonSize: jsonSize,
    attachmentsCount: attachmentsCount,
    attachmentsSize: attachmentsSize,
    totalSize: jsonSize + attachmentsSize
  };
}

export function showBackupExportModal() {
  openGenericModal(
    svgIcon('upload', 20) + ' إنشاء نسخة احتياطية',
    '<div id="backupExportBody" style="text-align:center;padding:30px">'
      + '<div style="display:inline-block;width:36px;height:36px;border:3px solid var(--card-border);border-top-color:var(--accent-green);border-radius:50%;animation:spin 1s linear infinite"></div>'
      + '<div style="margin-top:14px;color:var(--text-muted);font-size:.85rem">جاري حساب الأحجام...</div>'
    + '</div>',
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
  );
  _renderBackupExportOptions();
}

export async function _renderBackupExportOptions() {
  var sizes;
  try { sizes = await _getBackupSizes(); }
  catch (e) { sizes = { jsonSize: 0, attachmentsCount: 0, totalSize: 0 }; }

  var body = document.getElementById('backupExportBody');
  if (!body) return;

  var html = '<div style="display:flex;flex-direction:column;gap:12px">';

  html += '<button class="backup-option recommended" onclick="closeGenericModal();exportFullBackup()">'
    + '<div class="backup-option-badge">⭐ موصى به</div>'
    + '<div class="backup-option-icon">' + svgIcon('package', 24) + '</div>'
    + '<div class="backup-option-title">كل البيانات</div>'
    + '<div class="backup-option-size">~' + formatBytes(sizes.totalSize) + ' • ' + sizes.attachmentsCount + ' مرفقًا</div>'
    + '<div class="backup-option-desc">ملف ZIP يشمل التقارير والصور وملفات PDF — الحجم تقديري (قد يكون أصغر بعد الضغط)</div>'
    + '</button>';

  html += '<button class="backup-option" onclick="closeGenericModal();exportBackup()">'
    + '<div class="backup-option-icon">' + svgIcon('file-text', 24) + '</div>'
    + '<div class="backup-option-title">البيانات فقط</div>'
    + '<div class="backup-option-size">' + formatBytes(sizes.jsonSize) + '</div>'
    + '<div class="backup-option-desc">ملف JSON — كل التقارير والبيانات بدون مرفقات (أسرع وأصغر حجمًا)</div>'
    + '</button>';

  html += '</div>';
  body.innerHTML = html;
  hydrateIcons(body);
}

export function showBackupImportModal() {
  document.getElementById('backupSmartFile').click();
}

export async function _handleBackupFileInput(event) {
  var file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  var ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'zip') {
    await _prepareZipImport(file);
  } else if (ext === 'json') {
    await _prepareJsonImport(file);
  } else {
    showNotify('⚠️ صيغة غير مدعومة — استخدم ZIP أو JSON');
  }
}

export async function _prepareZipImport(file) {
  if (typeof JSZip === 'undefined') {
    showNotify('⚠️ مكتبة ZIP غير محمّلة');
    return;
  }
  showNotify('⏳ قراءة الملف...');
  try {
    var zip = await JSZip.loadAsync(file);
    var dataFile = zip.file('data.json');
    if (!dataFile) {
      showNotify('⚠️ الملف لا يحتوي على data.json');
      return;
    }
    var parsed = JSON.parse(await dataFile.async('text'));
    if (!parsed.data) {
      showNotify('⚠️ data.json غير صالح');
      return;
    }
    var importedData = parsed.data;
    var counts = {
      groups: (importedData.groups || []).length,
      students: (importedData.students || []).length,
      sessions: (importedData.sessions || []).length,
      reports: (importedData.monthlyReports || []).length
    };
    var attCount = 0;
    var attFolder = zip.folder('attachments');
    if (attFolder) {
      attCount = Object.keys(attFolder.files).filter(function(p){ return !attFolder.files[p].dir; }).length;
    }
    _pendingRestore = {
      type: 'zip',
      fileName: file.name,
      fileSize: file.size,
      counts: counts,
      attachmentsCount: attCount,
      onMerge: function(){ _doZipImport(zip, importedData, parsed, true); },
      onReplace: function(){ _doZipImport(zip, importedData, parsed, false); }
    };
    window._pendingRestore = _pendingRestore;
    _showRestoreChoiceModal(_pendingRestore);
  } catch (e) {
    console.error('ZIP read failed:', e);
    showNotify('⚠️ فشل قراءة الملف: ' + (e.message || ''));
  }
}

export async function _prepareJsonImport(file) {
  showNotify('⏳ قراءة الملف...');
  try {
    var text = await file.text();
    var d = JSON.parse(text);
    if (!d.data) {
      showNotify('⚠️ الملف لا يحتوي على بيانات صالحة');
      return;
    }
    var importedData = d.data;
    var counts = {
      groups: (importedData.groups || []).length,
      students: (importedData.students || []).length,
      sessions: (importedData.sessions || []).length,
      reports: (importedData.monthlyReports || []).length
    };
    _pendingRestore = {
      type: 'json',
      fileName: file.name,
      fileSize: file.size,
      counts: counts,
      attachmentsCount: 0,
      onMerge: function(){ _doJsonImport(importedData, true); },
      onReplace: function(){ _doJsonImport(importedData, false); }
    };
    window._pendingRestore = _pendingRestore;
    _showRestoreChoiceModal(_pendingRestore);
  } catch (e) {
    console.error('JSON read failed:', e);
    showNotify('⚠️ فشل قراءة الملف: ' + (e.message || ''));
  }
}

export var _pendingRestore = null;

export function _showRestoreChoiceModal(opts) {
  var counts = opts.counts || {};
  var infoLine = (counts.groups || 0) + ' مجموعة • ' + (counts.students || 0) + ' طالب • ' + (counts.sessions || 0) + ' حصة';
  if (opts.attachmentsCount > 0) infoLine += ' • ' + opts.attachmentsCount + ' مرفق';

  var body = '<div class="restore-file-info">'
    + '<div class="restore-file-icon">' + svgIcon(opts.type === 'zip' ? 'package' : 'file-text', 24) + '</div>'
    + '<div>'
    +   '<div class="restore-file-name">' + escapeHtml(opts.fileName) + '</div>'
    +   '<div class="restore-file-meta">' + formatBytes(opts.fileSize) + ' • ' + escapeHtml(infoLine) + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="restore-choice">'
    +   '<button class="restore-choice-btn merge" onclick="_executeRestore(\'merge\')">'
    +     '<span class="restore-choice-icon">' + svgIcon('check-circle', 20) + '</span>'
    +     '<div>'
    +       '<div class="restore-choice-title">دمج ذكي (موصى به)</div>'
    +       '<div class="restore-choice-desc">يحتفظ ببياناتك الحالية، يضيف الجديد، ويُحدّث ما هو أقدم</div>'
    +     '</div>'
    +   '</button>'
    +   '<button class="restore-choice-btn replace" onclick="_executeRestore(\'replace\')">'
    +     '<span class="restore-choice-icon">' + svgIcon('alert-triangle', 20) + '</span>'
    +     '<div>'
    +       '<div class="restore-choice-title">استبدال كامل</div>'
    +       '<div class="restore-choice-desc">يحذف كل البيانات الحالية ثم يستورد — لا يمكن التراجع</div>'
    +     '</div>'
    +   '</button>'
    + '</div>';

  openGenericModal(
    svgIcon('download', 20) + ' استعادة نسخة احتياطية',
    body,
    '<button class="btn btn-secondary" onclick="_pendingRestore=null;closeGenericModal()">إلغاء</button>'
  );
}

export function _executeRestore(mode) {
  var ctx = _pendingRestore || window._pendingRestore;
  if (!ctx) return;
  _pendingRestore = null;
  window._pendingRestore = null;
  closeGenericModal();
  if (mode === 'merge') ctx.onMerge();
  else ctx.onReplace();
}

export async function _doZipImport(zip, importedData, parsed, doMerge) {
  showNotify('⏳ جاري الاستيراد...');
  try {
    var manifest = {};
    var manifestFile = zip.file('attachments.json');
    if (manifestFile) {
      try { manifest = JSON.parse(await manifestFile.async('text')); } catch (e) {}
    }

    if (doMerge) {
      mergeBackupData(importedData);
    } else {
      setData(importedData);
      ['groups','students','sessions','monthlyReports','appointments','workSessions'].forEach(function(k){ if (!data[k]) data[k] = []; });
      if (!data.settings) data.settings = { theme:'dark', teacherName:'', teacherTimezone:'', designTheme:'teal' };
      if (!data.settings.designTheme) data.settings.designTheme = 'teal';
      data.groups.forEach(function(g){ if (!g.constants) g.constants = []; if (!g.schedule) g.schedule = []; if (!g.timezone) g.timezone = ''; if (typeof g.link === 'undefined') g.link = ''; if (typeof g.location === 'undefined') g.location = ''; });
      data.students.forEach(function(s){ if (!s.constants) s.constants = []; });
    }

    var attachmentsFolder = zip.folder('attachments');
    var restoredCount = 0;
    if (attachmentsFolder) {
      var paths = Object.keys(attachmentsFolder.files);
      for (var k = 0; k < paths.length; k++) {
        var path = paths[k];
        if (attachmentsFolder.files[path].dir) continue;
        var filename = path.substring(path.lastIndexOf('/') + 1);
        var attId = filename.substring(0, filename.lastIndexOf('.'));
        try {
          var blob = await attachmentsFolder.files[path].async('blob');
          var meta = manifest[attId] || {};
          var ext = filename.split('.').pop().toLowerCase();
          var mimeMap = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', pdf:'application/pdf' };
          var type = meta.type || mimeMap[ext] || 'application/octet-stream';
          var name = meta.name || filename;
          var f = new File([blob], name, { type: type });
          await idbAttachmentSet(attId, f);
          restoredCount++;
        } catch (e) { console.error('restore failed', path, e); }
      }
    }

    await saveDataAsync();
    addBackupLogEntry('import');
    
    if (currentUser) {
      showNotify('⏳ جاري مزامنة النسخة المستعادة مع السحابة...');
      await uploadToCloud();
    }
    
    showNotify('✅ تم الاستيراد بنجاح (' + restoredCount + ' مرفق)');
    setTimeout(function(){ location.reload(); }, 1500);
  } catch (e) {
    console.error('ZIP import failed:', e);
    showNotify('⚠️ فشل: ' + e.message);
  }
}

export async function _doJsonImport(importedData, doMerge) {
  showNotify('⏳ جاري الاستيراد...');
  try {
    if (doMerge) {
      mergeBackupData(importedData);
    } else {
      setData(importedData);
      ['groups','students','sessions','monthlyReports','appointments','workSessions'].forEach(function(k){ if (!data[k]) data[k] = []; });
      if (!data.settings) data.settings = { theme:'dark', teacherName:'', teacherTimezone:'', designTheme:'teal' };
      if (!data.settings.designTheme) data.settings.designTheme = 'teal';
      data.groups.forEach(function(g){ if (!g.constants) g.constants = []; if (!g.schedule) g.schedule = []; if (!g.timezone) g.timezone = ''; if (typeof g.link === 'undefined') g.link = ''; if (typeof g.location === 'undefined') g.location = ''; });
      data.students.forEach(function(s){ if (!s.constants) s.constants = []; });
    }
    await saveDataAsync();
    addBackupLogEntry('import');
    showNotify('✅ تم استيراد البيانات بنجاح');
    
    if (currentUser) {
      try { await uploadToCloud(true); } catch (e) { console.warn('sync after import failed:', e); }
    }
    
    setTimeout(function(){ location.reload(); }, 1200);
  } catch (e) {
    console.error('JSON import failed:', e);
    showNotify('⚠️ فشل: ' + e.message);
  }
}

export async function exportFullBackup() {
  if (typeof JSZip === 'undefined') {
    showNotify('⚠️ مكتبة ZIP غير محمّلة — تحقق من اتصالك بالإنترنت');
    return;
  }

  var filename = 'teacher-assistant-full-backup-' + new Date().toISOString().slice(0,10) + '.zip';
  var fileHandle = null;
  if (window.showSaveFilePicker) {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
      });
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.warn('save picker failed:', e);
      fileHandle = null;
    }
  }

  showNotify('⏳ جارٍ جمع البيانات...');
  var zip = new JSZip();
  var dataBackup = { __exported_at: new Date().toISOString(), __version: 'v5', data: data };
  zip.file('data.json', JSON.stringify(dataBackup, null, 2));
  var attachmentsFolder = zip.folder('attachments');
  var manifest = {};
  var totalFiles = 0;
  var totalBytes = 0;
  for (var i = 0; i < data.sessions.length; i++) {
    var s = data.sessions[i];
    if (!s.attachmentIds || !s.attachmentIds.length) continue;
    for (var j = 0; j < s.attachmentIds.length; j++) {
      var attId = s.attachmentIds[j];
      try {
        var file = await idbAttachmentGet(attId);
        if (!file) continue;
        var ext = (file.name && file.name.lastIndexOf('.') > 0) ? file.name.split('.').pop() : 'bin';
        attachmentsFolder.file(attId + '.' + ext, file);
        manifest[attId] = { name: file.name || (attId + '.' + ext), type: file.type || 'application/octet-stream', size: file.size || 0 };
        totalFiles++;
        totalBytes += (file.size || 0);
      } catch(e) { console.error('read attachment failed', attId, e); }
    }
  }
  zip.file('attachments.json', JSON.stringify(manifest, null, 2));
  showNotify('⏳ إنشاء ZIP... (' + totalFiles + ' مرفق، ' + formatBytes(totalBytes) + ')');
  try {
    var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

    if (fileHandle) {
      var writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      showNotify('✅ تم حفظ النسخة بنجاح (' + formatBytes(blob.size) + ')');
    } else {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
      showNotify('✅ بدأ التنزيل — تحقق من مجلد التنزيلات (' + formatBytes(blob.size) + ')');
    }

    var lastBackupKey = window.LAST_BACKUP_KEY || 'quran_last_backup_v4';
    localStorage.setItem(lastBackupKey, new Date().toISOString());
    updateLastBackupInfo();
    addBackupLogEntry('export');
  } catch(e) {
    console.error('ZIP export failed:', e);
    showNotify('⚠️ فشل: ' + e.message);
  }
}

export async function exportBackup() {
  try {
    var backup = { __exported_at: new Date().toISOString(), __version: 'v4', data: data };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var filename = 'teacher-assistant-backup-' + new Date().toISOString().slice(0,10) + '.json';

    var result = await _saveBlobWithPicker(blob, filename, [{
      description: 'JSON Backup',
      accept: { 'application/json': ['.json'] }
    }]);

    if (result.cancelled) return;

    if (result.saved) {
      var lastBackupKey = window.LAST_BACKUP_KEY || 'quran_last_backup_v4';
      localStorage.setItem(lastBackupKey, new Date().toISOString());
      updateLastBackupInfo();
      addBackupLogEntry('export');
      if (result.method === 'fs') {
        showNotify('✅ تم حفظ النسخة بنجاح');
      } else {
        showNotify('✅ بدأ التنزيل — تحقق من مجلد التنزيلات');
      }
    } else {
      showNotify('⚠️ تعذّر الحفظ');
    }
  } catch (e) {
    console.error('exportBackup failed:', e);
    showNotify('فشل التصدير');
  }
}

export function mergeBackupData(importedData){
  var stats = { groupsAdded: 0, studentsAdded: 0, sessionsAdded: 0, sessionsUpdated: 0, reportsAdded: 0, appointmentsAdded: 0, workSessionsAdded: 0 };
  (importedData.groups || []).forEach(function(ig){
    var ex = data.groups.find(function(g){ return normalize(g.name) === normalize(ig.name); });
    if(!ex){ data.groups.push(ig); stats.groupsAdded++; }
    else {
      if(ig.constants) ig.constants.forEach(function(c){ if(!ex.constants) ex.constants = []; if(!ex.constants.find(function(e){ return normalize(e.key) === normalize(c.key); })) ex.constants.push(c); });
      if(ig.schedule) ig.schedule.forEach(function(s){ if(!ex.schedule) ex.schedule = []; if(!ex.schedule.find(function(e){ return e.dayOfWeek === s.dayOfWeek && e.time === s.time; })) ex.schedule.push(s); });
    }
  });
  (importedData.students || []).forEach(function(is){
    var ig = importedData.groups.find(function(g){ return g.id === is.groupId; });
    var ourG = ig ? data.groups.find(function(g){ return normalize(g.name) === normalize(ig.name); }) : null;
    var tgid = ourG ? ourG.id : is.groupId;
    var ex = data.students.find(function(s){ return s.groupId === tgid && normalize(s.name) === normalize(is.name); });
    if(!ex){ is.groupId = tgid; data.students.push(is); stats.studentsAdded++; }
  });
  (importedData.sessions || []).forEach(function(ise){
    var ig = importedData.groups.find(function(g){ return g.id === ise.groupId; });
    var ourG = ig ? data.groups.find(function(g){ return normalize(g.name) === normalize(ig.name); }) : null;
    var tgid = ourG ? ourG.id : ise.groupId;
    var ex = data.sessions.find(function(s){
      if (s.groupId !== tgid || s.date !== ise.date) return false;
      if (ise.time && s.time) return s.time === ise.time;
      return !ise.time && !s.time;
    });
    if(!ex){
      ise.groupId = tgid;
      ise.studentIds = (ise.studentIds || []).map(function(sid){
        var ist = importedData.students.find(function(s){ return s.id === sid; });
        if(!ist) return sid;
        var ourSt = data.students.find(function(s){ return s.groupId === tgid && normalize(s.name) === normalize(ist.name); });
        return ourSt ? ourSt.id : sid;
      });
      data.sessions.push(ise); stats.sessionsAdded++;
    } else if((ise.savedAt || '') > (ex.savedAt || '')){
      ex.report = ise.report; ex.data = ise.data; ex.savedAt = ise.savedAt;
      if (ise.time) ex.time = ise.time;
      if (ise.ruleId) ex.ruleId = ise.ruleId;
      if (ise.extraId) ex.extraId = ise.extraId;
      stats.sessionsUpdated++;
    }
  });
  (importedData.monthlyReports || []).forEach(function(ir){
    var ex = data.monthlyReports.find(function(r){ return r.ownerType === ir.ownerType && r.ownerId === ir.ownerId && r.year === ir.year && r.month === ir.month; });
    if(!ex){ data.monthlyReports.push(ir); stats.reportsAdded++; }
  });
  (importedData.appointments || []).forEach(function(ia){
    var ex = data.appointments.find(function(a){ return a.groupId === ia.groupId && a.date === ia.date && a.time === ia.time && a.type === ia.type; });
    if(!ex){ data.appointments.push(ia); stats.appointmentsAdded++; }
  });
  (importedData.workSessions || []).forEach(function(iw){
    var ex = data.workSessions.find(function(w){ return w.id === iw.id; });
    if(!ex){ data.workSessions.push(iw); stats.workSessionsAdded++; }
  });
  return stats;
}

export function updateLastBackupInfo(){
  var el = document.getElementById('lastBackupInfo'); if(!el) return;
  var lastBackupKey = window.LAST_BACKUP_KEY || 'quran_last_backup_v4';
  var raw = localStorage.getItem(lastBackupKey);
  if(!raw){ el.innerHTML = svgIcon('alert-triangle', 12) + ' لم تأخذ نسخة احتياطية بعد'; return; }
  try {
    var d = new Date(raw);
    el.innerHTML = svgIcon('clock', 12) + ' آخر نسخة: ' + d.toLocaleDateString('ar') + ' - ' + d.toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});
  } catch(e){}
}

export async function resetAllData(){
  if(!confirm('حذف كل البيانات نهائيًا؟')) return;
  if(!confirm('تأكيد أخير: هل أخذت نسخة احتياطية؟')) return;

  showNotify('⏳ جارٍ المسح...');

  try {
    if (_idb) {
      var stores = ['main', 'meta', 'attachments'];
      for (var i = 0; i < stores.length; i++) {
        try {
          await new Promise(function(resolve, reject){
            var tx = _idb.transaction(stores[i], 'readwrite');
            var req = tx.objectStore(stores[i]).clear();
            req.onsuccess = function(){ resolve(); };
            req.onerror = function(){ reject(req.error); };
          });
        } catch(e){ console.error('clear store ' + stores[i] + ':', e); }
      }
    }

    var keysToRemove = [
      'quran_data_v4', 'quran_draft_v4', 'quran_last_backup_v4', 'quran_backup_log_v1',
      'quran_browser_favs_v1', 'quran_browser_tabs_v1',
      'quran_migrated_to_idb_at', 'quran_data_v4_migrated_backup', 'quran_pre_download_backup'
    ];
    keysToRemove.forEach(function(k){
      try { localStorage.removeItem(k); } catch(e){}
    });

    if ('caches' in window) {
      try {
        var cacheNames = await caches.keys();
        for (var ci = 0; ci < cacheNames.length; ci++) {
          await caches.delete(cacheNames[ci]);
        }
      } catch(e){ console.error('clear caches:', e); }
    }

    showNotify('✅ تم مسح كل البيانات — إعادة التحميل...');
    setTimeout(function(){ location.reload(); }, 800);

  } catch(e){
    console.error('resetAllData:', e);
    showNotify('⚠️ فشل المسح — جرّب إعادة تحميل الصفحة');
  }
}

export function addBackupLogEntry(type){
  try {
    var backupLogKey = window.BACKUP_LOG_KEY || 'quran_backup_log_v1';
    var log = [];
    try { log = JSON.parse(localStorage.getItem(backupLogKey) || '[]'); } catch(e){ log = []; }
    log.unshift({ type: type, at: new Date().toISOString() });
    if (log.length > 20) log = log.slice(0, 20);
    localStorage.setItem(backupLogKey, JSON.stringify(log));
    renderBackupLog();
  } catch(e){}
}

export function renderBackupLog(){
  var container = document.getElementById('backupLogContainer'); if (!container) return;
  var backupLogKey = window.BACKUP_LOG_KEY || 'quran_backup_log_v1';
  var log = []; try { log = JSON.parse(localStorage.getItem(backupLogKey) || '[]'); } catch(e){}
  if (!log.length){ container.innerHTML = '<div class="cfg-empty">لا توجد عمليات بعد</div>'; return; }
  var html = '<div style="display:flex;flex-direction:column;gap:6px">';
  log.forEach(function(entry){
    var d; try { d = new Date(entry.at); } catch(e){ return; }
    if (isNaN(d.getTime())) return;
    var isEx = entry.type === 'export';
    html += '<div class="cfg-row"><span style="color:'+(isEx?'var(--accent-blue)':'var(--accent-amber)')+';font-weight:700;display:inline-flex;align-items:center;gap:5px">' + svgIcon(isEx?'upload':'download', 12) + ' ' + (isEx?'تصدير':'استيراد') + '</span><span style="color:var(--text-muted);font-size:.78rem">'+d.toLocaleDateString('ar')+' — '+d.toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'})+'</span></div>';
  });
  html += '</div>'; container.innerHTML = html;
}

export function clearBackupLog(){
  if (!confirm('مسح سجل النسخ؟')) return;
  var backupLogKey = window.BACKUP_LOG_KEY || 'quran_backup_log_v1';
  localStorage.removeItem(backupLogKey);
  renderBackupLog();
  showNotify('تم المسح');
}

export async function updateStorageInfo(){
  var el = document.getElementById('storageInfo');
  if (!el) return;
  var lines = [];
  var lsSize = 0;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k) lsSize += k.length + (localStorage.getItem(k) || '').length;
    }
  } catch(e){}
  lines.push('📦 localStorage: ' + formatBytes(lsSize) + ' (الحد ~5MB)');
  if (window._idbReady) {
    try {
      var saved = await idbGet('main');
      var idbSize = saved ? JSON.stringify(saved).length : 0;
      lines.push('🗄️ IndexedDB: ' + formatBytes(idbSize) + ' (المستخدم)');
    } catch(e) {}
    if (navigator.storage && navigator.storage.estimate) {
      try {
        var est = await navigator.storage.estimate();
        lines.push('💾 المتاح: ' + formatBytes((est.quota || 0) - (est.usage || 0)));
      } catch(e) {}
    }
  } else {
    lines.push('⚠️ IndexedDB غير مفعّل — يعمل التطبيق بالوضع القديم');
  }
  el.innerHTML = lines.join('<br>');
}

/* ═══════════════ MONTHLY REPORTS ═══════════════ */
export function buildMonthlyReportsTree(ownerType, ownerId){
  var reports = data.monthlyReports.filter(function(r){ return r.ownerType === ownerType && r.ownerId === ownerId; });
  if(!reports.length) return '<div class="cfg-empty">لا توجد تقارير شهرية</div>';
  reports.sort(function(a,b){ return (b.year + '-' + b.month.toString().padStart(2,'0')).localeCompare(a.year + '-' + a.month.toString().padStart(2,'0')); });
  var html = ''; var cy = null;
  var monthNames = window.MONTH_NAMES || ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  reports.forEach(function(r){
    if(r.year !== cy){
      if(cy !== null) html += '</details>';
      cy = r.year;
      html += '<details class="year-block" open><summary><span>' + svgIcon('calendar-days', 16) + ' ' + cy + '</span></summary>';
    }
    html += '<div class="cfg-row" style="margin:0 12px 8px"><span style="font-weight:700">'+monthNames[r.month-1]+'</span><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="viewMonthlyReport(\''+r.id+'\')" title="عرض">' + svgIcon('search', 12) + '</button><button class="btn btn-copy btn-sm" onclick="copyMonthlyReport(\''+r.id+'\')" title="نسخ">' + svgIcon('copy', 12) + '</button><button class="btn btn-danger btn-sm" onclick="deleteMonthlyReport(\''+r.id+'\')" title="حذف">' + svgIcon('trash-2', 12) + '</button></div></div>';
  });
  if(cy !== null) html += '</details>';
  return html;
}

export function openNewMonthlyReport(ownerType, ownerId){
  var now = new Date(); var mo = '';
  var monthNames = window.MONTH_NAMES || ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  for(var i=0; i<12; i++) mo += '<option value="'+(i+1)+'"'+(i+1===(now.getMonth()+1)?' selected':'')+'>'+monthNames[i]+'</option>';
  openGenericModal(
    'تقرير شهري',
    '<div class="form-row-2"><div class="form-field"><label>الشهر</label><select id="newMonthlyMonth">'+mo+'</select></div><div class="form-field"><label>السنة</label><input type="number" id="newMonthlyYear" value="'+now.getFullYear()+'"></div></div>',
    '<button type="button" class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
    + '<button type="button" class="btn btn-primary" style="width:auto;margin:0" onclick="generateAndOpenMonthlyDraft(\''+ownerType+'\', \''+ownerId+'\', \'ar\')">توليد بالعربية</button>'
    + '<button type="button" class="btn btn-secondary" style="width:auto;margin:0" onclick="generateAndOpenMonthlyDraft(\''+ownerType+'\', \''+ownerId+'\', \'en\')">توليد بالإنجليزية</button>'
  );
}

export async function generateAndOpenMonthlyDraft(ownerType, ownerId, lang){
  lang = lang || 'ar';
  var month = parseInt(document.getElementById('newMonthlyMonth').value);
  var year = parseInt(document.getElementById('newMonthlyYear').value);
  if(!month || !year) return;
  var ex = data.monthlyReports.find(function(r){ return r.ownerType === ownerType && r.ownerId === ownerId && r.year === year && r.month === month; });
  if(ex){ if(!confirm('يوجد تقرير محفوظ. فتحه للتعديل؟')) return; openEditMonthlyReport(ex.id); return; }
  if(lang === 'en') showNotify('⏳ جاري توليد التقرير الشهري بالإنجليزية...');
  var draft = await generateMonthlyDraftAsync(ownerType, ownerId, year, month, lang);
  var dirAttr = lang === 'en' ? 'ltr' : 'rtl';
  openGenericModal('مسودة التقرير الشهري', '<textarea id="monthlyDraftText" dir="'+dirAttr+'" style="min-height:400px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7">'+escapeHtml(draft)+'</textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveNewMonthlyReport(\''+ownerType+'\', \''+ownerId+'\', '+year+', '+month+')">' + svgIcon('save', 14) + ' حفظ</button>');
}

export async function generateMonthlyDraftFromTab(lang){
  lang = lang || 'ar';
  var groupId = document.getElementById('monthlyGroupSelect').value;
  var month = parseInt(document.getElementById('monthlyMonthSelect').value);
  var year = parseInt(document.getElementById('monthlyYearInput').value);
  if(!groupId) return showNotify('اختر المجموعة');
  var btnEn = document.getElementById('btnGenMonthlyEn');
  if(lang === 'en'){
    if(btnEn) btnEn.disabled = true;
    showNotify('⏳ جاري توليد التقرير الشهري بالإنجليزية...');
  }
  try {
    var draft = await generateMonthlyDraftAsync('group', groupId, year, month, lang);
    var ta = document.getElementById('monthlyTabDraft');
    if(ta){
      ta.value = draft;
      ta.dir = (lang === 'en') ? 'ltr' : 'rtl';
    }
    document.getElementById('monthlyTabDraftContainer').style.display = 'block';
    if(lang === 'en') showNotify('✅ تم توليد التقرير الشهري بالإنجليزية');
  } finally {
    if(btnEn) btnEn.disabled = false;
  }
}

export function saveMonthlyDraftFromTab(){
  var groupId = document.getElementById('monthlyGroupSelect').value;
  var month = parseInt(document.getElementById('monthlyMonthSelect').value);
  var year = parseInt(document.getElementById('monthlyYearInput').value);
  var text = document.getElementById('monthlyTabDraft').value;
  if(!text.trim()) return;
  var ex = data.monthlyReports.find(function(r){ return r.ownerType === 'group' && r.ownerId === groupId && r.year === year && r.month === month; });
  if(ex){ if(!confirm('استبدال التقرير المحفوظ؟')) return; ex.text = text; ex.savedAt = new Date().toISOString(); }
  else data.monthlyReports.push({ id: genId(), ownerType: 'group', ownerId: groupId, year: year, month: month, text: text, savedAt: new Date().toISOString() });
  saveData(); showNotify('تم الحفظ');
  switchLessonSub('lesson');
  document.getElementById('monthlyTabDraftContainer').style.display = 'none';
}

export function saveNewMonthlyReport(ownerType, ownerId, year, month){
  var text = document.getElementById('monthlyDraftText').value;
  data.monthlyReports.push({ id: genId(), ownerType: ownerType, ownerId: ownerId, year: year, month: month, text: text, savedAt: new Date().toISOString() });
  saveData(); closeGenericModal();
  showNotify('تم الحفظ');
  if(ownerType === 'group') openGroupDetail(ownerId); else openStudentDetail(ownerId);
}

export function viewMonthlyReport(id){
  var r = data.monthlyReports.find(function(x){ return x.id === id; }); if(!r) return;
  openGenericModal('التقرير الشهري', '<textarea id="monthlyViewText" style="min-height:400px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7" readonly>'+escapeHtml(r.text)+'</textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="openEditMonthlyReport(\''+id+'\')">' + svgIcon('edit-3', 14) + ' تعديل</button><button class="btn btn-copy" onclick="copyMonthlyReport(\''+id+'\')">' + svgIcon('copy', 14) + ' نسخ</button>');
}

export function openEditMonthlyReport(id){
  var r = data.monthlyReports.find(function(x){ return x.id === id; }); if(!r) return;
  openGenericModal('تعديل التقرير الشهري', '<textarea id="monthlyEditText" style="min-height:400px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7">'+escapeHtml(r.text)+'</textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveEditMonthlyReport(\''+id+'\')">' + svgIcon('save', 14) + ' حفظ</button>');
}

export function saveEditMonthlyReport(id){
  var r = data.monthlyReports.find(function(x){ return x.id === id; }); if(!r) return;
  r.text = document.getElementById('monthlyEditText').value;
  saveData(); closeGenericModal();
  showNotify('تم الحفظ');
  if(r.ownerType === 'group') openGroupDetail(r.ownerId); else openStudentDetail(r.ownerId);
}

export function copyMonthlyReport(id){ var r = data.monthlyReports.find(function(x){ return x.id === id; }); if(r) copyText(r.text); }

export async function deleteMonthlyReport(id){
  if(!confirm('حذف هذا التقرير الشهري؟')) return;
  var r = data.monthlyReports.find(function(x){ return x.id === id; });
  queueDelete('monthly_reports', id);
  data.monthlyReports = data.monthlyReports.filter(function(x){ return x.id !== id; });
  await saveDataAsync();
  scheduleAutoSync();
  showNotify('تم الحذف');
  if(r && r.ownerType === 'group') openGroupDetail(r.ownerId); else if(r) openStudentDetail(r.ownerId);
}

/* ═══════════════ CUSTOM ROW TYPES & STATIC TEXTS ═══════════════ */
export function getStandardRowTypes(){
  return [
    { id: 'std_1', name: 'تسميع جديد', section: 'study', form: 'surah-ayat' },
    { id: 'std_2', name: 'تسميع مراجعة', section: 'study', form: 'surah-ayat' },
    { id: 'std_3', name: 'قراءة', section: 'study', form: 'surah-ayat' },
    { id: 'std_4', name: 'حفظ جديد', section: 'homework', form: 'surah-ayat' },
    { id: 'std_5', name: 'مراجعة', section: 'homework', form: 'surah-ayat' }
  ];
}

export function getGroupEffectiveRowTypes(grp){
  if(grp && grp.reportSettings && Array.isArray(grp.reportSettings.rowTypes)){
    return deepClone(grp.reportSettings.rowTypes);
  }
  var base = getStandardRowTypes();
  if(grp && grp.reportSettings && Array.isArray(grp.reportSettings.customRowTypes) && grp.reportSettings.customRowTypes.length){
    grp.reportSettings.customRowTypes.forEach(function(t){
      base.push({
        id: t.id || genId(),
        name: t.name || '',
        section: t.section || 'study',
        form: t.form || 'surah-ayat'
      });
    });
  }
  return base;
}

export function getEffectiveRowTypes(student, grp){
  if(student && student.reportSettings && Array.isArray(student.reportSettings.rowTypes)){
    return deepClone(student.reportSettings.rowTypes);
  }
  return getGroupEffectiveRowTypes(grp);
}

export function getOwnerEffectiveRowTypes(ownerType, ownerId){
  if(ownerType === 'group'){
    var g = data.groups.find(function(x){ return x.id === ownerId; });
    return getGroupEffectiveRowTypes(g);
  }
  var s = data.students.find(function(x){ return x.id === ownerId; });
  var grp = s ? data.groups.find(function(x){ return x.id === s.groupId; }) : null;
  return getEffectiveRowTypes(s, grp);
}

export function getCardEffectiveRowTypes(card){
  if(card && Array.isArray(card._lessonRowTypes)){
    return deepClone(card._lessonRowTypes);
  }
  var gnEl = document.getElementById('groupName');
  var gn = gnEl ? normalize(gnEl.value) : '';
  var grp = gn ? data.groups.find(function(g){ return normalize(g.name) === gn; }) : null;
  var stNameEl = card ? card.querySelector('.student-name') : null;
  var stName = stNameEl ? normalize(stNameEl.value) : '';
  var student = null;
  if(stName){
    if(grp) student = data.students.find(function(s){ return s.groupId === grp.id && normalize(s.name) === stName; }) || null;
    else student = data.students.find(function(s){ return normalize(s.name) === stName; }) || null;
  }
  return getEffectiveRowTypes(student, grp);
}

function _materializeOwnerRowTypes(ownerType, ownerId){
  var o = ownerType === 'group'
    ? data.groups.find(function(x){ return x.id === ownerId; })
    : data.students.find(function(x){ return x.id === ownerId; });
  if(!o) return null;
  if(!o.reportSettings || typeof o.reportSettings !== 'object'){
    o.reportSettings = ownerType === 'group' ? { customRowTypes: [], staticTexts: [] } : {};
  }
  if(!Array.isArray(o.reportSettings.rowTypes)){
    if(ownerType === 'group'){
      o.reportSettings.rowTypes = getGroupEffectiveRowTypes(o);
      o.reportSettings.customRowTypes = [];
    } else {
      var grp = data.groups.find(function(x){ return x.id === o.groupId; }) || null;
      o.reportSettings.rowTypes = getEffectiveRowTypes(o, grp);
    }
  }
  return o.reportSettings.rowTypes;
}

function _refreshOwnerRowTypesUI(ownerType, ownerId){
  var c = document.getElementById(ownerType === 'group' ? 'groupRowTypesContainer' : 'studentRowTypesContainer');
  if(c){
    c.innerHTML = renderOwnerRowTypes(ownerType, ownerId);
    hydrateIcons(c);
  }
  rebuildAllRowDropdowns();
}

export function renderOwnerRowTypes(ownerType, ownerId){
  var o = ownerType === 'group'
    ? data.groups.find(function(x){ return x.id === ownerId; })
    : data.students.find(function(x){ return x.id === ownerId; });
  if(!o) return '';
  var isInherited = !(o.reportSettings && Array.isArray(o.reportSettings.rowTypes));
  var list = getOwnerEffectiveRowTypes(ownerType, ownerId);
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var formLabels = window.FORM_LABELS || { 'surah-ayat': 'سورة وآيات', 'free-text': 'نص حر' };
  var html = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">';
  if(ownerType === 'student'){
    html += isInherited
      ? '<span style="font-size:.78rem;color:var(--text-muted)">موروث من المجموعة (يُحفظ كنسخة مستقلة عند التعديل)</span>'
      : '<span class="cfg-badge blue">مخصص للطالب</span><button type="button" class="btn btn-secondary btn-sm" onclick="resetOwnerRowTypes(\'student\', \''+ownerId+'\')">' + svgIcon('refresh', 12) + ' استعادة من المجموعة</button>';
  } else {
    html += isInherited
      ? '<span style="font-size:.78rem;color:var(--text-muted)">الأنواع القياسية</span>'
      : '<span class="cfg-badge blue">مخصص للمجموعة</span><button type="button" class="btn btn-secondary btn-sm" onclick="resetOwnerRowTypes(\'group\', \''+ownerId+'\')">' + svgIcon('refresh', 12) + ' استعادة القياسي</button>';
  }
  html += '</div>';
  if(!list.length){
    return html + '<div class="cfg-empty">لا توجد أنواع سطور</div>';
  }
  list.forEach(function(t, idx){
    var upBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="moveOwnerRowType(\''+ownerType+'\', \''+ownerId+'\', '+idx+', -1)" title="أعلى"'+(idx===0?' disabled':'')+'>' + svgIcon('arrow-up', 12) + '</button>';
    var downBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="moveOwnerRowType(\''+ownerType+'\', \''+ownerId+'\', '+idx+', 1)" title="أسفل"'+(idx===list.length-1?' disabled':'')+'>' + svgIcon('arrow-down', 12) + '</button>';
    var editBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="openRowTypeEditor(\''+ownerType+'\', \''+ownerId+'\', \''+escapeAttr(t.id)+'\')" title="تعديل">' + svgIcon('edit-3', 12) + '</button>';
    var delBtn = '<button type="button" class="btn btn-danger btn-sm" onclick="deleteOwnerRowType(\''+ownerType+'\', \''+ownerId+'\', \''+escapeAttr(t.id)+'\')" title="حذف">' + svgIcon('trash-2', 12) + '</button>';
    html += '<div class="cfg-row"><div class="cfg-row-info"><div class="cfg-row-title">' + escapeHtml(t.name || '(بدون)') + '</div><div class="cfg-row-meta"><span class="cfg-badge">' + escapeHtml(sectionLabels[t.section] || t.section) + '</span><span class="cfg-badge blue">' + escapeHtml(formLabels[t.form] || t.form) + '</span></div></div><div class="btn-row">' + upBtn + downBtn + editBtn + delBtn + '</div></div>';
  });
  return html;
}

export function openRowTypeEditor(ownerType, ownerId, typeId){
  var list = getOwnerEffectiveRowTypes(ownerType, ownerId);
  var ex = typeId ? list.find(function(t){ return t.id === typeId; }) : null;
  var isE = !!ex;
  var name = ex ? ex.name : '';
  var sec = ex ? ex.section : 'study';
  var form = ex ? ex.form : 'surah-ayat';
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var formLabels = window.FORM_LABELS || { 'surah-ayat': 'سورة وآيات', 'free-text': 'نص حر' };
  var sO = Object.keys(sectionLabels).map(function(k){ return '<option value="'+k+'"'+(k===sec?' selected':'')+'>'+sectionLabels[k]+'</option>'; }).join('');
  var fO = Object.keys(formLabels).map(function(k){ return '<option value="'+k+'"'+(k===form?' selected':'')+'>'+formLabels[k]+'</option>'; }).join('');
  openGenericModal(isE ? 'تعديل نوع سطر' : 'إضافة نوع سطر',
    '<div class="form-field"><label>اسم النوع</label><input type="text" id="rowTypeNameInput" value="'+escapeAttr(name)+'" placeholder="مثال: استكمال المقرأة"></div>'
    + '<div class="form-row-2"><div class="form-field"><label>القسم</label><select id="rowTypeSectionSelect">'+sO+'</select></div>'
    + '<div class="form-field"><label>الشكل</label><select id="rowTypeFormSelect">'+fO+'</select></div></div>',
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveOwnerRowType(\''+ownerType+'\', \''+ownerId+'\', '+(isE ? '\''+escapeAttr(typeId)+'\'' : 'null')+')">' + svgIcon('save', 14) + ' حفظ</button>');
  setTimeout(function(){ var i = document.getElementById('rowTypeNameInput'); if(i) i.focus(); }, 50);
}

export function saveOwnerRowType(ownerType, ownerId, typeId){
  var name = (document.getElementById('rowTypeNameInput').value || '').trim();
  var sec = document.getElementById('rowTypeSectionSelect').value;
  var form = document.getElementById('rowTypeFormSelect').value;
  if(!name){ showNotify('أدخل اسمًا'); return; }
  var list = _materializeOwnerRowTypes(ownerType, ownerId);
  if(!list) return;
  if(list.some(function(t){ return t.id !== typeId && t.section === sec && normalize(t.name) === normalize(name); })){
    showNotify('الاسم موجود بالفعل في هذا القسم'); return;
  }
  if(typeId){
    var ex = list.find(function(t){ return t.id === typeId; });
    if(!ex) return;
    ex.name = name; ex.section = sec; ex.form = form;
  } else {
    list.push({ id: genId(), name: name, section: sec, form: form });
  }
  saveData(); closeGenericModal();
  _refreshOwnerRowTypesUI(ownerType, ownerId);
  showNotify('تم الحفظ');
}

export function deleteOwnerRowType(ownerType, ownerId, typeId){
  if(!confirm('حذف هذا النوع؟')) return;
  var list = _materializeOwnerRowTypes(ownerType, ownerId);
  if(!list) return;
  var o = ownerType === 'group'
    ? data.groups.find(function(x){ return x.id === ownerId; })
    : data.students.find(function(x){ return x.id === ownerId; });
  if(!o || !o.reportSettings) return;
  o.reportSettings.rowTypes = list.filter(function(t){ return t.id !== typeId; });
  saveData();
  _refreshOwnerRowTypesUI(ownerType, ownerId);
  showNotify('تم الحذف');
}

export function moveOwnerRowType(ownerType, ownerId, index, delta){
  var list = _materializeOwnerRowTypes(ownerType, ownerId);
  if(!list) return;
  var target = index + delta;
  if(index < 0 || index >= list.length || target < 0 || target >= list.length) return;
  var tmp = list[index];
  list[index] = list[target];
  list[target] = tmp;
  saveData();
  _refreshOwnerRowTypesUI(ownerType, ownerId);
}

export function resetOwnerRowTypes(ownerType, ownerId){
  var msg = ownerType === 'student'
    ? 'إلغاء تخصيص الطالب واستعادة أنواع المجموعة؟'
    : 'استعادة الأنواع القياسية الخمسة للمجموعة؟';
  if(!confirm(msg)) return;
  var o = ownerType === 'group'
    ? data.groups.find(function(x){ return x.id === ownerId; })
    : data.students.find(function(x){ return x.id === ownerId; });
  if(!o || !o.reportSettings) return;
  delete o.reportSettings.rowTypes;
  if(ownerType === 'group') o.reportSettings.customRowTypes = [];
  saveData();
  _refreshOwnerRowTypesUI(ownerType, ownerId);
  showNotify('تمت الاستعادة');
}

export function renderCustomRowTypes(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if(!g || !g.reportSettings || !g.reportSettings.customRowTypes || !g.reportSettings.customRowTypes.length) return '<div class="cfg-empty">لا توجد أنواع</div>';
  var html = '';
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var formLabels = window.FORM_LABELS || { 'surah-ayat': 'سورة وآيات', 'free-text': 'نص حر' };
  g.reportSettings.customRowTypes.forEach(function(t){
    html += '<div class="cfg-row"><div class="cfg-row-info"><div class="cfg-row-title">'+escapeHtml(t.name || '(بدون)')+'</div><div class="cfg-row-meta"><span class="cfg-badge">'+escapeHtml(sectionLabels[t.section]||t.section)+'</span><span class="cfg-badge blue">'+escapeHtml(formLabels[t.form]||t.form)+'</span></div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="openCustomRowTypeEditor(\'group\', \''+groupId+'\', \''+t.id+'\')" title="تعديل">' + svgIcon('edit-3', 12) + '</button><button class="btn btn-danger btn-sm" onclick="deleteCustomRowType(\''+groupId+'\', \''+t.id+'\')" title="حذف">' + svgIcon('trash-2', 12) + '</button></div></div>';
  });
  return html;
}

export function openCustomRowTypeEditor(ownerType, groupId, typeId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  if(!g.reportSettings) g.reportSettings = { customRowTypes: [], staticTexts: [] };
  if(!g.reportSettings.customRowTypes) g.reportSettings.customRowTypes = [];
  var ex = typeId ? g.reportSettings.customRowTypes.find(function(t){ return t.id === typeId; }) : null;
  var isE = !!ex;
  var name = ex ? ex.name : '';
  var sec = ex ? ex.section : 'study';
  var form = ex ? ex.form : 'surah-ayat';
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var formLabels = window.FORM_LABELS || { 'surah-ayat': 'سورة وآيات', 'free-text': 'نص حر' };
  var sO = Object.keys(sectionLabels).map(function(k){ return '<option value="'+k+'"'+(k===sec?' selected':'')+'>'+sectionLabels[k]+'</option>'; }).join('');
  var fO = Object.keys(formLabels).map(function(k){ return '<option value="'+k+'"'+(k===form?' selected':'')+'>'+formLabels[k]+'</option>'; }).join('');
  openGenericModal(isE ? 'تعديل نوع' : 'نوع جديد', '<div class="form-field"><label>اسم النوع</label><input type="text" id="customTypeName" value="'+escapeAttr(name)+'" placeholder="مثال: استكمال المقرأة"></div><div class="form-row-2"><div class="form-field"><label>القسم</label><select id="customTypeSection">'+sO+'</select></div><div class="form-field"><label>الشكل</label><select id="customTypeForm">'+fO+'</select></div></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveCustomRowType(\''+groupId+'\', '+(isE ? '\''+typeId+'\'' : 'null')+')">' + svgIcon('save', 14) + ' حفظ</button>');
  setTimeout(function(){ var i = document.getElementById('customTypeName'); if(i) i.focus(); }, 50);
}

export function saveCustomRowType(groupId, typeId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  if(!g.reportSettings) g.reportSettings = { customRowTypes: [], staticTexts: [] };
  if(!g.reportSettings.customRowTypes) g.reportSettings.customRowTypes = [];
  var name = (document.getElementById('customTypeName').value || '').trim();
  var sec = document.getElementById('customTypeSection').value;
  var form = document.getElementById('customTypeForm').value;
  if(!name){ showNotify('أدخل اسمًا'); return; }
  if(typeId){
    var ex = g.reportSettings.customRowTypes.find(function(t){ return t.id === typeId; }); if(!ex) return;
    ex.name = name; ex.section = sec; ex.form = form;
  } else g.reportSettings.customRowTypes.push({ id: genId(), name: name, section: sec, form: form });
  saveData(); closeGenericModal();
  var c = document.getElementById('groupCustomRowTypesContainer'); if(c) c.innerHTML = renderCustomRowTypes(groupId);
  showNotify('تم الحفظ');
}

export function deleteCustomRowType(groupId, typeId){
  if(!confirm('حذف هذا النوع؟')) return;
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g || !g.reportSettings || !g.reportSettings.customRowTypes) return;
  g.reportSettings.customRowTypes = g.reportSettings.customRowTypes.filter(function(t){ return t.id !== typeId; });
  saveData();
  var c = document.getElementById('groupCustomRowTypesContainer'); if(c) c.innerHTML = renderCustomRowTypes(groupId);
  showNotify('تم الحذف');
}

export function renderStaticTexts(ownerType, ownerId){
  var o = ownerType === 'group' ? data.groups.find(function(x){ return x.id === ownerId; }) : data.students.find(function(x){ return x.id === ownerId; });
  if(!o) return '';
  var texts = ownerType === 'group' ? (o.reportSettings && o.reportSettings.staticTexts) : o.staticTexts;
  if(!texts || !texts.length) return '<div class="cfg-empty">لا توجد نصوص</div>';
  var html = '';
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var subjectLabelsSt = window.SUBJECT_LABELS_ST || { quran: 'قرآن', arabic: 'عربية', islamic: 'شرعية' };
  var modeLabels = window.MODE_LABELS || { full: 'سطر كامل', suffix: 'لاحقة' };
  texts.forEach(function(t){
    var mL = modeLabels[t.mode] || t.mode;
    var tL = (t.mode === 'suffix' && t.targetType) ? ' (' + escapeHtml(t.targetType) + ')' : '';
    html += '<div class="cfg-row"><div class="cfg-row-info"><div class="cfg-row-title">'+escapeHtml(t.text || '(بدون)')+'</div><div class="cfg-row-meta"><span class="cfg-badge">'+escapeHtml(sectionLabels[t.section]||t.section)+'</span><span class="cfg-badge">'+escapeHtml(subjectLabelsSt[t.subject]||subjectLabelsSt.quran)+'</span><span class="cfg-badge '+(t.mode === 'suffix' ? 'amber' : 'blue')+'">'+escapeHtml(mL)+tL+'</span></div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="openStaticTextEditor(\''+ownerType+'\', \''+ownerId+'\', \''+t.id+'\')" title="تعديل">' + svgIcon('edit-3', 12) + '</button><button class="btn btn-danger btn-sm" onclick="deleteStaticText(\''+ownerType+'\', \''+ownerId+'\', \''+t.id+'\')" title="حذف">' + svgIcon('trash-2', 12) + '</button></div></div>';
  });
  return html;
}

export function openStaticTextEditor(ownerType, ownerId, textId){
  var o = ownerType === 'group' ? data.groups.find(function(x){ return x.id === ownerId; }) : data.students.find(function(x){ return x.id === ownerId; });
  if(!o) return;
  var list;
  if(ownerType === 'group'){ if(!o.reportSettings) o.reportSettings = { customRowTypes: [], staticTexts: [] }; if(!o.reportSettings.staticTexts) o.reportSettings.staticTexts = []; list = o.reportSettings.staticTexts; }
  else { if(!o.staticTexts) o.staticTexts = []; list = o.staticTexts; }
  var ex = textId ? list.find(function(t){ return t.id === textId; }) : null;
  var isE = !!ex;
  var text = ex ? ex.text : '';
  var sec = ex ? ex.section : 'study';
  var sub = ex ? (ex.subject || 'quran') : 'quran';
  var mode = ex ? ex.mode : 'full';
  var tT = ex ? (ex.targetType || 'قراءة') : 'قراءة';
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var subjectLabelsSt = window.SUBJECT_LABELS_ST || { quran: 'قرآن', arabic: 'عربية', islamic: 'شرعية' };
  var modeLabels = window.MODE_LABELS || { full: 'سطر كامل', suffix: 'لاحقة' };
  var ownerTypes = getOwnerEffectiveRowTypes(ownerType, ownerId).map(function(t){ return t.name; });
  var fallbackTypes = window.ALL_ROW_TYPES || ['تسميع جديد','تسميع مراجعة','قراءة','حفظ جديد','مراجعة'];
  var allRowTypes = [];
  (ownerTypes.length ? ownerTypes : fallbackTypes).forEach(function(n){
    if(n && allRowTypes.indexOf(n) === -1) allRowTypes.push(n);
  });
  if(isE && tT && allRowTypes.indexOf(tT) === -1) allRowTypes.push(tT);
  if(!allRowTypes.length) allRowTypes = fallbackTypes.slice();
  var sO = Object.keys(sectionLabels).map(function(k){ return '<option value="'+k+'"'+(k===sec?' selected':'')+'>'+sectionLabels[k]+'</option>'; }).join('');
  var subO = Object.keys(subjectLabelsSt).map(function(k){ return '<option value="'+k+'"'+(k===sub?' selected':'')+'>'+subjectLabelsSt[k]+'</option>'; }).join('');
  var mO = Object.keys(modeLabels).map(function(k){ return '<option value="'+k+'"'+(k===mode?' selected':'')+'>'+modeLabels[k]+'</option>'; }).join('');
  var tO = allRowTypes.map(function(t){ return '<option value="'+escapeAttr(t)+'"'+(t===tT?' selected':'')+'>'+escapeHtml(t)+'</option>'; }).join('');
  openGenericModal(isE ? 'تعديل نص' : 'نص جديد', '<div class="form-field"><label>النص</label><textarea id="staticTextContent" style="min-height:80px;font-family:inherit">'+escapeHtml(text)+'</textarea></div><div class="form-row-2"><div class="form-field"><label>القسم</label><select id="staticTextSection">'+sO+'</select></div><div class="form-field"><label>المادة</label><select id="staticTextSubject">'+subO+'</select></div></div><div class="form-row-2"><div class="form-field"><label>الموضع</label><select id="staticTextMode" onchange="toggleStaticTextTarget()">'+mO+'</select></div><div class="form-field" id="staticTextTargetGroup" style="display:'+(mode==='suffix'?'block':'none')+'"><label>النوع المستهدف</label><select id="staticTextTargetType">'+tO+'</select></div></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveStaticText(\''+ownerType+'\', \''+ownerId+'\', '+(isE ? '\''+textId+'\'' : 'null')+')">' + svgIcon('save', 14) + ' حفظ</button>');
  setTimeout(function(){ var i = document.getElementById('staticTextContent'); if(i) i.focus(); }, 50);
}

export function toggleStaticTextTarget(){
  var m = document.getElementById('staticTextMode').value;
  var g = document.getElementById('staticTextTargetGroup');
  if(g) g.style.display = (m === 'suffix') ? 'block' : 'none';
}

export function saveStaticText(ownerType, ownerId, textId){
  var o = ownerType === 'group' ? data.groups.find(function(x){ return x.id === ownerId; }) : data.students.find(function(x){ return x.id === ownerId; });
  if(!o) return;
  var list;
  if(ownerType === 'group'){ if(!o.reportSettings) o.reportSettings = { customRowTypes: [], staticTexts: [] }; if(!o.reportSettings.staticTexts) o.reportSettings.staticTexts = []; list = o.reportSettings.staticTexts; }
  else { if(!o.staticTexts) o.staticTexts = []; list = o.staticTexts; }
  var text = (document.getElementById('staticTextContent').value || '').trim();
  var sec = document.getElementById('staticTextSection').value;
  var sub = document.getElementById('staticTextSubject').value;
  var mode = document.getElementById('staticTextMode').value;
  var tT = mode === 'suffix' ? document.getElementById('staticTextTargetType').value : '';
  if(!text){ showNotify('أدخل النص'); return; }
  if(textId){
    var ex = list.find(function(t){ return t.id === textId; }); if(!ex) return;
    ex.text = text; ex.section = sec; ex.subject = sub; ex.mode = mode; ex.targetType = tT;
  } else list.push({ id: genId(), text: text, section: sec, subject: sub, mode: mode, targetType: tT });
  saveData(); closeGenericModal();
  var c = document.getElementById(ownerType === 'group' ? 'groupStaticTextsContainer' : 'studentStaticTextsContainer');
  if(c) c.innerHTML = renderStaticTexts(ownerType, ownerId);
  showNotify('تم الحفظ');
}

export function deleteStaticText(ownerType, ownerId, textId){
  if(!confirm('حذف هذا النص؟')) return;
  var o = ownerType === 'group' ? data.groups.find(function(x){ return x.id === ownerId; }) : data.students.find(function(x){ return x.id === ownerId; });
  if(!o) return;
  if(ownerType === 'group'){
    if(!o.reportSettings || !o.reportSettings.staticTexts) return;
    o.reportSettings.staticTexts = o.reportSettings.staticTexts.filter(function(t){ return t.id !== textId; });
  } else {
    if(!o.staticTexts) return;
    o.staticTexts = o.staticTexts.filter(function(t){ return t.id !== textId; });
  }
  saveData();
  var c = document.getElementById(ownerType === 'group' ? 'groupStaticTextsContainer' : 'studentStaticTextsContainer');
  if(c) c.innerHTML = renderStaticTexts(ownerType, ownerId);
  showNotify('تم الحذف');
}

export function getRowTypeForm(typeName, card){
  var types = getCardEffectiveRowTypes(card || null);
  var found = types.find(function(t){ return t.name === typeName; });
  if(found) return found.form || 'surah-ayat';
  var c = currentCustomRowTypes.find(function(t){ return t.name === typeName; });
  return c ? (c.form || 'surah-ayat') : 'surah-ayat';
}

export function buildTypeOptions(isStudy, selectedLabel, rowTypesOverride){
  var sec = isStudy ? 'study' : 'homework';
  var source = Array.isArray(rowTypesOverride) ? rowTypesOverride : getCardEffectiveRowTypes(null);
  var secTypes = source.filter(function(t){ return t.section === sec; });
  var html = ''; var found = false;
  secTypes.forEach(function(t){
    if(t.name === selectedLabel) found = true;
    html += '<option value="'+escapeAttr(t.name)+'"'+(t.name===selectedLabel?' selected':'')+'>'+escapeHtml(t.name)+'</option>';
  });
  if(!found && selectedLabel) html += '<option value="'+escapeAttr(selectedLabel)+'" selected>'+escapeHtml(selectedLabel)+' (محذوف)</option>';
  return html;
}

export function handleRowTypeChange(select){
  var row = select.closest('.row-item'); if(!row) return;
  var card = select.closest('.student-card');
  var nT = select.value;
  var nF = getRowTypeForm(nT, card);
  var cF = row.classList.contains('free-text-row') ? 'free-text' : 'surah-ayat';
  if(cF === nF) return;
  var isStudy = !!row.closest('.study-rows-container');
  var sT = isStudy ? 'study' : 'homework';
  var cardTypes = getCardEffectiveRowTypes(card);
  var w = document.createElement('div');
  w.innerHTML = renderRow(sT, nT, nF, cardTypes);
  var nR = w.firstElementChild; if(!nR) return;
  row.parentNode.replaceChild(nR, row);
  hydrateIcons(nR);
  scheduleSaveDraft();
}

export function rebuildCardRowDropdowns(card){
  if(!card) return;
  var cardTypes = getCardEffectiveRowTypes(card);
  card.querySelectorAll('.row-item').forEach(function(row){
    var s = row.querySelector('.row-type-select'); if(!s) return;
    var isStudy = !!row.closest('.study-rows-container');
    var cv = s.value;
    s.innerHTML = buildTypeOptions(isStudy, cv, cardTypes);
    var has = false;
    for(var i=0; i<s.options.length; i++){ if(s.options[i].value === cv){ has = true; break; } }
    if(!has && s.options.length) s.value = s.options[0].value;
  });
}

export function rebuildAllRowDropdowns(){
  document.querySelectorAll('.student-card').forEach(function(card){
    rebuildCardRowDropdowns(card);
  });
}

export function isRowEmpty(row){
  if(!row) return true;
  if(row.classList.contains('free-text-row')){
    var ft = row.querySelector('.free-text-input');
    return !(ft && ft.value.trim());
  }
  var ms = row.querySelector('.main-surah');
  var fa = row.querySelector('.from-aya');
  var ta = row.querySelector('.to-aya');
  var ts = row.querySelector('.to-surah');
  return !((ms && ms.value.trim()) || (fa && fa.value.trim()) || (ta && ta.value.trim()) || (ts && ts.value.trim()));
}

export function syncCardRowsWithNewTypes(card, newTypes, renameMap){
  if(!card) return;
  renameMap = renameMap || {};
  ['study', 'homework'].forEach(function(sec){
    var container = card.querySelector(sec === 'study' ? '.study-rows-container' : '.homework-rows-container');
    if(!container) return;
    var secTypes = (newTypes || []).filter(function(t){ return t.section === sec; });
    var existingRows = Array.prototype.slice.call(container.querySelectorAll('.row-item'));
    var filledByType = {};
    var filledOrder = [];
    existingRows.forEach(function(r){
      if(isRowEmpty(r)) return;
      var rd = readRow(r);
      if(renameMap[rd.type]) rd.type = renameMap[rd.type];
      var matched = secTypes.find(function(t){ return t.name === rd.type; });
      if(matched && matched.form && matched.form !== rd.form){
        rd.form = matched.form;
      }
      if(!filledByType[rd.type]){
        filledByType[rd.type] = [];
        filledOrder.push(rd.type);
      }
      filledByType[rd.type].push(rd);
    });
    var finalRows = [];
    var usedTypes = {};
    secTypes.forEach(function(t){
      if(filledByType[t.name] && filledByType[t.name].length){
        filledByType[t.name].forEach(function(rd){ finalRows.push(rd); });
        usedTypes[t.name] = true;
      } else {
        finalRows.push({ type: t.name, form: t.form || 'surah-ayat', rangeType: 'ayat', mainSurah: '', from: '', to: '', toSurah: '', text: '' });
      }
    });
    filledOrder.forEach(function(tName){
      if(!usedTypes[tName] && filledByType[tName]){
        filledByType[tName].forEach(function(rd){ finalRows.push(rd); });
      }
    });
    container.innerHTML = '';
    finalRows.forEach(function(rd){
      var wrap = document.createElement('div');
      wrap.innerHTML = renderRow(sec, rd.type, rd.form || 'surah-ayat', newTypes);
      var row = wrap.firstElementChild;
      if(!row) return;
      if((rd.form || 'surah-ayat') === 'free-text'){
        var fi = row.querySelector('.free-text-input');
        if(fi) fi.value = safe(rd.text);
      } else {
        var ms = row.querySelector('.main-surah');
        if(ms) ms.value = safe(rd.mainSurah);
        var rangeSel = row.querySelector('.range-type-select');
        var ayatRange = row.querySelector('.ayat-range');
        var surahsRange = row.querySelector('.surahs-range');
        var rt = rd.rangeType || 'ayat';
        if(rangeSel) rangeSel.value = rt;
        if(rt === 'surahs'){
          if(ayatRange) ayatRange.style.display = 'none';
          if(surahsRange) surahsRange.style.display = 'flex';
          var ts = row.querySelector('.to-surah');
          if(ts) ts.value = safe(rd.toSurah);
        } else {
          if(ayatRange) ayatRange.style.display = 'flex';
          if(surahsRange) surahsRange.style.display = 'none';
          var fa = row.querySelector('.from-aya');
          if(fa) fa.value = safe(rd.from);
          var ta = row.querySelector('.to-aya');
          if(ta) ta.value = safe(rd.to);
        }
      }
      container.appendChild(row);
    });
    hydrateIcons(container);
  });
}

var _quickRowContext = null;
var _quickRowDraft = [];
var _quickRowRenames = {};

function _getQuickRowContext(card){
  var gnEl = document.getElementById('groupName');
  var groupName = gnEl ? gnEl.value.trim() : '';
  var grp = groupName ? data.groups.find(function(g){ return normalize(g.name) === normalize(groupName); }) || null : null;
  var stEl = card ? card.querySelector('.student-name') : null;
  var studentName = stEl ? stEl.value.trim() : '';
  var student = null;
  if(studentName){
    if(grp) student = data.students.find(function(s){ return s.groupId === grp.id && normalize(s.name) === normalize(studentName); }) || null;
    else student = data.students.find(function(s){ return normalize(s.name) === normalize(studentName); }) || null;
  }
  return { card: card, grp: grp, student: student, groupName: groupName, studentName: studentName };
}

export function renderQuickRowModalHTML(){
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var formLabels = window.FORM_LABELS || { 'surah-ayat': 'سورة وآيات', 'free-text': 'نص حر' };
  var ctx = _quickRowContext || {};
  var metaParts = [];
  if(ctx.studentName) metaParts.push('الطالب: <strong>' + escapeHtml(ctx.studentName) + '</strong>');
  if(ctx.groupName) metaParts.push('المجموعة: <strong>' + escapeHtml(ctx.groupName) + '</strong>');
  var html = metaParts.length
    ? '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:10px">' + metaParts.join(' • ') + '</div>'
    : '';
  html += '<div id="quickRowListBox">';
  if(!_quickRowDraft.length){
    html += '<div class="cfg-empty">لا توجد أنواع سطور</div>';
  } else {
    _quickRowDraft.forEach(function(t, idx){
      var upBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="moveQuickRowItem('+idx+', -1)" title="أعلى"'+(idx===0?' disabled':'')+'>' + svgIcon('arrow-up', 12) + '</button>';
      var downBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="moveQuickRowItem('+idx+', 1)" title="أسفل"'+(idx===_quickRowDraft.length-1?' disabled':'')+'>' + svgIcon('arrow-down', 12) + '</button>';
      var editBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="openQuickRowInlineEditor('+idx+')" title="تعديل">' + svgIcon('edit-3', 12) + '</button>';
      var delBtn = '<button type="button" class="btn btn-danger btn-sm" onclick="deleteQuickRowItem('+idx+')" title="حذف">' + svgIcon('trash-2', 12) + '</button>';
      html += '<div class="cfg-row"><div class="cfg-row-info"><div class="cfg-row-title">' + escapeHtml(t.name || '(بدون)') + '</div><div class="cfg-row-meta"><span class="cfg-badge">' + escapeHtml(sectionLabels[t.section] || t.section) + '</span><span class="cfg-badge blue">' + escapeHtml(formLabels[t.form] || t.form) + '</span></div></div><div class="btn-row">' + upBtn + downBtn + editBtn + delBtn + '</div></div>';
    });
  }
  html += '</div>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'
    + '<button type="button" class="btn btn-secondary btn-sm" onclick="openQuickRowInlineEditor(-1)">' + svgIcon('plus', 12) + ' نوع جديد</button>'
    + '<button type="button" class="btn btn-secondary btn-sm" onclick="resetQuickRowList()">' + svgIcon('refresh', 12) + ' استعادة القياسي</button>'
    + '</div>';
  html += '<div id="quickRowInlineBox" style="display:none;margin-top:12px;padding:12px;border:1px solid var(--card-border);border-radius:10px"></div>';
  return html;
}

export function renderQuickRowModalFooter(){
  var ctx = _quickRowContext || {};
  var html = '<button type="button" class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>';
  html += '<button type="button" class="btn btn-primary" style="width:auto;margin:0" onclick="applyQuickRowTypes(\'lesson\')">لهذه الحصة فقط</button>';
  if(ctx.student){
    html += '<button type="button" class="btn btn-secondary" onclick="applyQuickRowTypes(\'student\')">حفظ للطالب</button>';
  }
  if(ctx.grp){
    html += '<button type="button" class="btn btn-secondary" onclick="applyQuickRowTypes(\'group\')">حفظ للمجموعة</button>';
  }
  return html;
}

export function openQuickRowTypesModal(btn){
  var card = btn && btn.closest ? btn.closest('.student-card') : null;
  if(!card) return;
  _quickRowContext = _getQuickRowContext(card);
  _quickRowDraft = deepClone(getCardEffectiveRowTypes(card));
  _quickRowRenames = {};
  openGenericModal('تخصيص أنواع السطور', renderQuickRowModalHTML(), renderQuickRowModalFooter());
}

export function openQuickRowInlineEditor(idx){
  var box = document.getElementById('quickRowInlineBox');
  if(!box) return;
  var isEdit = idx >= 0 && idx < _quickRowDraft.length;
  var item = isEdit ? _quickRowDraft[idx] : { name: '', section: 'study', form: 'surah-ayat' };
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var formLabels = window.FORM_LABELS || { 'surah-ayat': 'سورة وآيات', 'free-text': 'نص حر' };
  var sO = Object.keys(sectionLabels).map(function(k){ return '<option value="'+k+'"'+(k===item.section?' selected':'')+'>'+sectionLabels[k]+'</option>'; }).join('');
  var fO = Object.keys(formLabels).map(function(k){ return '<option value="'+k+'"'+(k===item.form?' selected':'')+'>'+formLabels[k]+'</option>'; }).join('');
  box.innerHTML = '<div style="font-weight:700;font-size:.85rem;margin-bottom:8px">' + (isEdit ? 'تعديل نوع السطر' : 'إضافة نوع سطر') + '</div>'
    + '<div class="form-field"><label>اسم النوع</label><input type="text" id="quickRowEditName" value="'+escapeAttr(item.name)+'" placeholder="مثال: استكمال المقرأة"></div>'
    + '<div class="form-row-2"><div class="form-field"><label>القسم</label><select id="quickRowEditSection">'+sO+'</select></div>'
    + '<div class="form-field"><label>الشكل</label><select id="quickRowEditForm">'+fO+'</select></div></div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + '<button type="button" class="btn btn-secondary btn-sm" onclick="cancelQuickRowInline()">إلغاء</button>'
    + '<button type="button" class="btn btn-primary btn-sm" style="width:auto;margin:0" onclick="saveQuickRowInline('+idx+')">' + svgIcon('check', 12) + ' موافق</button>'
    + '</div>';
  box.style.display = 'block';
  hydrateIcons(box);
  setTimeout(function(){ var i = document.getElementById('quickRowEditName'); if(i) i.focus(); }, 30);
}

export function saveQuickRowInline(idx){
  var nameEl = document.getElementById('quickRowEditName');
  var secEl = document.getElementById('quickRowEditSection');
  var formEl = document.getElementById('quickRowEditForm');
  if(!nameEl || !secEl || !formEl) return;
  var name = (nameEl.value || '').trim();
  var sec = secEl.value;
  var form = formEl.value;
  if(!name){ showNotify('أدخل اسمًا'); return; }
  if(_quickRowDraft.some(function(t, i){ return i !== idx && t.section === sec && normalize(t.name) === normalize(name); })){
    showNotify('الاسم موجود بالفعل في هذا القسم'); return;
  }
  if(idx >= 0 && idx < _quickRowDraft.length){
    var oldName = _quickRowDraft[idx].name;
    if(oldName && oldName !== name){
      var origKey = null;
      Object.keys(_quickRowRenames).forEach(function(k){
        if(_quickRowRenames[k] === oldName) origKey = k;
      });
      if(origKey) _quickRowRenames[origKey] = name;
      else _quickRowRenames[oldName] = name;
    }
    _quickRowDraft[idx].name = name;
    _quickRowDraft[idx].section = sec;
    _quickRowDraft[idx].form = form;
  } else {
    _quickRowDraft.push({ id: genId(), name: name, section: sec, form: form });
  }
  var body = document.getElementById('genericModalBody');
  if(body){
    body.innerHTML = renderQuickRowModalHTML();
    hydrateIcons(body);
  }
}

export function cancelQuickRowInline(){
  var box = document.getElementById('quickRowInlineBox');
  if(box){ box.style.display = 'none'; box.innerHTML = ''; }
}

export function deleteQuickRowItem(idx){
  if(idx < 0 || idx >= _quickRowDraft.length) return;
  _quickRowDraft.splice(idx, 1);
  var body = document.getElementById('genericModalBody');
  if(body){
    body.innerHTML = renderQuickRowModalHTML();
    hydrateIcons(body);
  }
}

export function moveQuickRowItem(idx, delta){
  var target = idx + delta;
  if(idx < 0 || idx >= _quickRowDraft.length || target < 0 || target >= _quickRowDraft.length) return;
  var tmp = _quickRowDraft[idx];
  _quickRowDraft[idx] = _quickRowDraft[target];
  _quickRowDraft[target] = tmp;
  var body = document.getElementById('genericModalBody');
  if(body){
    body.innerHTML = renderQuickRowModalHTML();
    hydrateIcons(body);
  }
}

export function resetQuickRowList(){
  _quickRowDraft = getStandardRowTypes();
  _quickRowRenames = {};
  var body = document.getElementById('genericModalBody');
  if(body){
    body.innerHTML = renderQuickRowModalHTML();
    hydrateIcons(body);
  }
}

export function applyQuickRowTypes(scope){
  if(!_quickRowContext || !_quickRowContext.card) return;
  var ctx = _quickRowContext;
  var newTypes = deepClone(_quickRowDraft || []);
  if(scope === 'lesson'){
    ctx.card._lessonRowTypes = deepClone(newTypes);
    syncCardRowsWithNewTypes(ctx.card, newTypes, _quickRowRenames);
    showNotify('تم التطبيق على هذه الحصة فقط');
  } else if(scope === 'student'){
    if(!ctx.student){ showNotify('الطالب غير مسجل'); return; }
    if(!ctx.student.reportSettings || typeof ctx.student.reportSettings !== 'object') ctx.student.reportSettings = {};
    ctx.student.reportSettings.rowTypes = deepClone(newTypes);
    ctx.card._lessonRowTypes = null;
    saveData();
    syncCardRowsWithNewTypes(ctx.card, newTypes, _quickRowRenames);
    showNotify('تم الحفظ للطالب');
  } else if(scope === 'group'){
    if(!ctx.grp){ showNotify('المجموعة غير مسجلة'); return; }
    if(!ctx.grp.reportSettings || typeof ctx.grp.reportSettings !== 'object') ctx.grp.reportSettings = { customRowTypes: [], staticTexts: [] };
    ctx.grp.reportSettings.rowTypes = deepClone(newTypes);
    ctx.grp.reportSettings.customRowTypes = [];
    ctx.card._lessonRowTypes = null;
    saveData();
    document.querySelectorAll('.student-card').forEach(function(c){
      if(Array.isArray(c._lessonRowTypes)) return;
      var cTypes = getCardEffectiveRowTypes(c);
      syncCardRowsWithNewTypes(c, cTypes, c === ctx.card ? _quickRowRenames : {});
    });
    showNotify('تم الحفظ للمجموعة');
  }
  scheduleSaveDraft();
  closeGenericModal();
}

export function renderActiveStaticTexts(){
  var card = document.getElementById('activeStaticTextsCard');
  var list = document.getElementById('activeStaticTextsList');
  if(!card || !list) return;
  var gn = (document.getElementById('groupName').value || '').trim();
  var g = data.groups.find(function(x){ return normalize(x.name) === normalize(gn); });
  var items = [];
  if(g && g.reportSettings && g.reportSettings.staticTexts){
    g.reportSettings.staticTexts.forEach(function(t){
      items.push({ id: t.id, owner: 'group', ownerName: g.name, text: t.text, section: t.section, subject: t.subject || 'quran', mode: t.mode, targetType: t.targetType });
    });
  }
  var seen = {};
  document.querySelectorAll('.student-card').forEach(function(cardEl){
    var sn = (cardEl.querySelector('.student-name').value || '').trim(); if(!sn) return;
    var st = data.students.find(function(s){ return s.groupId === (g ? g.id : null) && normalize(s.name) === normalize(sn); });
    if(!st || !st.staticTexts || seen[st.id]) return;
    seen[st.id] = true;
    st.staticTexts.forEach(function(t){
      items.push({ id: t.id, owner: 'student', ownerName: st.name, text: t.text, section: t.section, subject: t.subject || 'quran', mode: t.mode, targetType: t.targetType });
    });
  });
  if(!items.length){ card.style.display = 'none'; list.innerHTML = ''; return; }
  card.style.display = 'block';
  var html = '';
  var sectionLabels = window.SECTION_LABELS || { study: 'دراسة اليوم', homework: 'المطلوب' };
  var modeLabels = window.MODE_LABELS || { full: 'سطر كامل', suffix: 'لاحقة' };
  items.forEach(function(it){
    var hidden = currentHiddenStaticIds.indexOf(it.id) !== -1;
    var tl = (it.mode === 'suffix' && it.targetType) ? ' · ' + escapeHtml(it.targetType) : '';
    html += '<label class="static-text-item'+(hidden?' unchecked':'')+'"><input type="checkbox" '+(hidden?'':'checked')+' onchange="toggleStaticTextActive(\''+it.id+'\', this.checked)"><div class="static-text-body"><div class="static-text-text">'+escapeHtml(it.text)+'</div><div class="static-text-meta"><span class="cfg-badge">' + svgIcon(it.owner === 'group' ? 'folder-open' : 'user', 12) + ' ' + escapeHtml(it.ownerName) + '</span><span class="cfg-badge blue">'+escapeHtml(sectionLabels[it.section]||it.section)+'</span><span class="cfg-badge amber">'+escapeHtml(modeLabels[it.mode]||it.mode)+tl+'</span></div></div></label>';
  });
  list.innerHTML = html;
}

export function toggleStaticTextActive(id, checked){
  if(checked) currentHiddenStaticIds = currentHiddenStaticIds.filter(function(x){ return x !== id; });
  else { if(currentHiddenStaticIds.indexOf(id) === -1) currentHiddenStaticIds.push(id); }
  window.currentHiddenStaticIds = currentHiddenStaticIds;
  scheduleSaveDraft();
  renderActiveStaticTexts();
}

/* ═══════════════ SEARCH ═══════════════ */
export function extractPreview(text, q){
  var lt = text.toLowerCase();
  var lq = q.toLowerCase();
  var idx = lt.indexOf(lq);
  if(idx === -1) return text.substring(0, 120) + '...';
  var s = Math.max(0, idx - 40);
  var e = Math.min(text.length, idx + q.length + 80);
  return (s > 0 ? '...' : '') + text.substring(s, e) + (e < text.length ? '...' : '').replace(/\n/g, ' ');
}

export function doSearch(){
  var q = normalize(document.getElementById('searchInput').value);
  var c = document.getElementById('searchResults');
  if(!q){ c.innerHTML = ''; return; }
  var lq = q.toLowerCase();
  var res = [];
  var monthNames = window.MONTH_NAMES || ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  (data.sessions || []).forEach(function(s){
    if(s.report && s.report.toLowerCase().indexOf(lq) !== -1){
      var g = data.groups.find(function(x){ return x.id === s.groupId; });
      res.push({ type: 'session', id: s.id, title: (g ? g.name : '—') + ' — ' + (s.date ? s.date.split('-').reverse().join('/') : ''), preview: extractPreview(s.report, q) });
    }
  });
  (data.monthlyReports || []).forEach(function(r){
    if(r.text && r.text.toLowerCase().indexOf(lq) !== -1){
      var t = '';
      if(r.ownerType === 'group'){
        var g = data.groups.find(function(x){ return x.id === r.ownerId; });
        t = (g ? g.name : '—') + ' — ' + monthNames[r.month-1] + ' ' + r.year;
      } else {
        var st = data.students.find(function(x){ return x.id === r.ownerId; });
        t = (st ? st.name : '—') + ' — ' + monthNames[r.month-1] + ' ' + r.year;
      }
      res.push({ type: 'monthly', id: r.id, title: t, preview: extractPreview(r.text, q) });
    }
  });
  if(!res.length){ c.innerHTML = '<div class="home-empty">لا نتائج</div>'; return; }
  var html = '<div style="padding:8px 0;color:var(--text-muted);font-size:.85rem">' + res.length + ' نتيجة</div>';
  res.forEach(function(r){
    var a = r.type === 'session' ? 'viewSession(\'' + r.id + '\')' : 'viewMonthlyReport(\'' + r.id + '\')';
    var icon = r.type === 'session' ? 'file-text' : 'calendar';
    html += '<div class="home-recent-item" onclick="' + a + '"><div style="min-width:0;flex:1"><div class="home-recent-name" style="display:flex;align-items:center;gap:6px">' + svgIcon(icon, 14) + ' ' + escapeHtml(r.title) + '</div><div class="home-recent-date" style="white-space:normal;line-height:1.4">' + escapeHtml(r.preview) + '</div></div><div class="home-recent-arrow">' + svgIcon('chevron-left', 16) + '</div></div>';
  });
  c.innerHTML = html;
}

/* ═══════════════ PENDING BADGE ═══════════════ */
export function updatePendingBadge(){
  var count = getPendingCount(14);
  ['calendarBadge', 'calendarBadgeMobile'].forEach(function(id){
    var b = document.getElementById(id);
    if(!b) return;
    if(count > 0){ b.textContent = count; b.style.display = 'inline-block'; }
    else b.style.display = 'none';
  });
  _activeBellData = collectActiveNotifications();
  updateBellBadges();
}

/* ═══════════════ NOTIFICATIONS ═══════════════ */
var FIRED_NOTIFS_KEY = 'quran_fired_notifs_v1';

function _loadFiredNotifs(){
  var todayISO = toDateISO(new Date());
  try {
    var raw = localStorage.getItem(FIRED_NOTIFS_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.date === todayISO && Array.isArray(parsed.keys)) {
        return { date: todayISO, keys: parsed.keys };
      }
    }
  } catch (e) {}
  return { date: todayISO, keys: [] };
}

function _saveFiredNotifs(store){
  try {
    localStorage.setItem(FIRED_NOTIFS_KEY, JSON.stringify(store));
  } catch (e) {}
}

function _isNotifFired(key){
  var store = _loadFiredNotifs();
  return store.keys.indexOf(key) !== -1;
}

function _markNotifFired(key){
  var store = _loadFiredNotifs();
  if (store.keys.indexOf(key) === -1) {
    store.keys.push(key);
    _saveFiredNotifs(store);
  }
}

export function playAlarmBeep(){
  ensureAudioContext();
  if(!window._alarmCtx) return;
  try {
    var ctx = window._alarmCtx;
    var t = data.settings.notifSoundType || '1';
    var notes;
    if (t === '2') {
      notes = [
        { f: 783.99, d: 0.18, gap: 0.04 },
        { f: 1046.50, d: 0.24, gap: 0.14 },
        { f: 783.99, d: 0.18, gap: 0.04 },
        { f: 1046.50, d: 0.28, gap: 0.0 }
      ];
    } else if (t === '3') {
      notes = [
        { f: 587.33, d: 0.16, gap: 0.04 },
        { f: 739.99, d: 0.16, gap: 0.04 },
        { f: 880.00, d: 0.18, gap: 0.04 },
        { f: 1174.66, d: 0.34, gap: 0.0 }
      ];
    } else {
      notes = [
        { f: 523.25, d: 0.20, gap: 0.06 },
        { f: 659.25, d: 0.20, gap: 0.06 },
        { f: 783.99, d: 0.32, gap: 0.0 }
      ];
    }
    var cur = ctx.currentTime + 0.02;
    notes.forEach(function(n){
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = n.f;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, cur);
      g.gain.linearRampToValueAtTime(0.22, cur + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, cur + n.d);
      o.start(cur);
      o.stop(cur + n.d + 0.02);
      cur += n.d + n.gap;
    });
  } catch(e){}
}

export function vibrateAlarm(){
  if(data.settings.notifVibrate === false) return;
  var p = data.settings.notifVibratePattern || 'short';
  if(p === 'off') return;
  var arr = p === 'long' ? [300,150,300,150,300,150] : [200,100,200];
  if(navigator.vibrate){ try { navigator.vibrate(arr); } catch(e){} }
}

export async function sendSystemNotification(title, body, options){
  options = options || {};
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  var isSilent = !!options.silent;
  var notifOpts = {
    body: body || '',
    icon: './icon.svg',
    badge: './icon.svg',
    tag: options.tag || 'lesson-reminder',
    silent: isSilent,
    data: options.data || {}
  };
  if (!isSilent && data.settings.notifVibrate !== false) {
    var vp = data.settings.notifVibratePattern || 'short';
    if (vp !== 'off') {
      notifOpts.vibrate = vp === 'long' ? [300,150,300,150,300] : [200,100,200];
    }
  }
  try {
    if ('serviceWorker' in navigator) {
      var reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notifOpts);
        return;
      }
    }
  } catch(e) {}
  try { new Notification(title, notifOpts); } catch(e){}
}

export function updateNotifPermStatus(){
  var badge = document.getElementById('notifPermStatus');
  if(!badge) return;
  badge.className = 'cfg-badge';
  if(!('Notification' in window)){
    badge.textContent = 'غير مدعومة';
    badge.classList.add('amber');
    return;
  }
  var p = Notification.permission;
  if(p === 'granted'){
    badge.textContent = 'مفعّلة';
    badge.classList.add('green');
  } else if(p === 'denied'){
    badge.textContent = 'مرفوضة من المتصفح';
    badge.classList.add('red');
  } else {
    badge.textContent = 'غير مفعّلة';
    badge.classList.add('blue');
  }
}

export function requestNotifPermission(){
  if(!('Notification' in window)){
    updateNotifPermStatus();
    showNotify('المتصفح لا يدعم إشعارات النظام');
    return;
  }
  if(Notification.permission === 'granted'){
    updateNotifPermStatus();
    showNotify('مفعّلة بالفعل');
    return;
  }
  Notification.requestPermission().then(function(p){
    updateNotifPermStatus();
    if(p === 'granted') showNotify('تم تفعيل الإشعارات');
    else showNotify('تم رفض الإشعارات');
  });
}

export async function testSystemNotification(){
  if(!('Notification' in window)){
    updateNotifPermStatus();
    showNotify('المتصفح لا يدعم إشعارات النظام');
    return;
  }
  if(Notification.permission === 'default'){
    var perm = await Notification.requestPermission();
    updateNotifPermStatus();
    if(perm !== 'granted'){
      showNotify('يرجى السماح بالإشعارات أولاً');
      return;
    }
  } else if(Notification.permission !== 'granted'){
    updateNotifPermStatus();
    showNotify('الإشعارات مرفوضة من إعدادات المتصفح');
    return;
  }
  await sendSystemNotification('تجربة إشعار Teacher Assistant', 'إشعارات النظام تعمل بنجاح', {
    silent: false,
    tag: 'test-notif',
    data: {}
  });
  showNotify('تم إرسال إشعار تجريبي');
}

export function formatReminderOffset(mins){
  var d = parseInt(mins, 10);
  if (!d || d <= 0) return '0 دقيقة';
  var h = Math.floor(d / 60), m = d % 60;
  var parts = [];
  if (h > 0) {
    if (h === 1) parts.push('ساعة');
    else if (h === 2) parts.push('ساعتان');
    else if (h >= 3 && h <= 10) parts.push(h + ' ساعات');
    else parts.push(h + ' ساعة');
  }
  if (m > 0) parts.push(m + ' دقيقة');
  return parts.join(' و ');
}

export function renderNotifRemindersSettings(){
  var el = document.getElementById('notifRemindersList');
  if (!el) return;
  var list = Array.isArray(data.settings.notifReminders) ? data.settings.notifReminders : [];
  if (!list.length) {
    el.innerHTML = '<span style="font-size:.78rem;color:var(--text-muted)">لا توجد تنبيهات مضافة قبل الحصة</span>';
    return;
  }
  el.innerHTML = list.map(function(mins){
    return '<span class="notif-reminder-chip">'
      + '<span>قبل الحصة بـ ' + escapeHtml(formatReminderOffset(mins)) + '</span>'
      + '<button type="button" onclick="removeNotifReminder(' + parseInt(mins, 10) + ')" title="حذف" aria-label="حذف">×</button>'
      + '</span>';
  }).join('');
}

export function addNotifReminder(){
  var valEl = document.getElementById('newNotifReminderVal');
  var unitEl = document.getElementById('newNotifReminderUnit');
  var v = parseInt(valEl ? valEl.value : '', 10);
  var unit = parseInt(unitEl ? unitEl.value : '1', 10) || 1;
  if (isNaN(v) || v < 1) {
    showNotify('أدخل مدة صحيحة');
    return;
  }
  var mins = v * unit;
  if (mins < 1 || mins > 1440) {
    showNotify('المدة يجب أن تكون بين 1 دقيقة و 24 ساعة');
    return;
  }
  if (!Array.isArray(data.settings.notifReminders)) data.settings.notifReminders = [];
  if (data.settings.notifReminders.indexOf(mins) !== -1) {
    showNotify('هذا التنبيه مضاف بالفعل');
    return;
  }
  data.settings.notifReminders.push(mins);
  data.settings.notifReminders.sort(function(a, b){ return b - a; });
  if (valEl) valEl.value = '';
  saveData();
  renderNotifRemindersSettings();
  checkUpcomingReminder();
  showNotify('✅ تمت إضافة التنبيه');
}

export function removeNotifReminder(mins){
  mins = parseInt(mins, 10);
  if (!Array.isArray(data.settings.notifReminders)) data.settings.notifReminders = [];
  data.settings.notifReminders = data.settings.notifReminders.filter(function(m){ return parseInt(m, 10) !== mins; });
  saveData();
  renderNotifRemindersSettings();
  checkUpcomingReminder();
  showNotify('تم حذف التنبيه');
}

export function testAlarmSound(){
  playAlarmBeep();
  if(data.settings.notifVibrate !== false) vibrateAlarm();
  showNotify('تم تشغيل الصوت');
}

export function isInQuietHours(){
  if(!data.settings.quietEnabled) return false;
  var now = new Date();
  var cm = now.getHours()*60 + now.getMinutes();
  var fp = (data.settings.quietFrom || '23:00').split(':').map(Number);
  var tp = (data.settings.quietTo || '07:00').split(':').map(Number);
  var fm = fp[0]*60 + fp[1];
  var tm = tp[0]*60 + tp[1];
  if(fm < tm) return cm >= fm && cm < tm;
  return cm >= fm || cm < tm;
}

export function startRepeatBeep(){
  if(_repeatBeepInterval) clearInterval(_repeatBeepInterval);
  var iv = Math.max(10, (data.settings.notifRepeatInterval || 30)) * 1000;
  _repeatBeepInterval = setInterval(function(){
    var hasAlerts = _activeBellData && _activeBellData.lessonAlerts && _activeBellData.lessonAlerts.length > 0;
    if(!hasAlerts || data.settings.notifEnabled === false){
      clearInterval(_repeatBeepInterval);
      _repeatBeepInterval = null;
      return;
    }
    if(!isInQuietHours()){ playAlarmBeep(); vibrateAlarm(); }
  }, iv);
}

export function stopRepeatBeep(){
  if(_repeatBeepInterval){ clearInterval(_repeatBeepInterval); _repeatBeepInterval = null; }
}

export function saveNotificationSettings(){
  var ncBeforeEl = document.getElementById('nowCardBeforeMin');
  var ncAfterEl = document.getElementById('nowCardAfterMin');
  var nBefore = parseInt(ncBeforeEl ? ncBeforeEl.value : '30', 10);
  var nAfter = parseInt(ncAfterEl ? ncAfterEl.value : '60', 10);
  data.settings.nowCardBeforeMin = (!isNaN(nBefore) && nBefore >= 0 && nBefore <= 240) ? nBefore : 30;
  data.settings.nowCardAfterMin = (!isNaN(nAfter) && nAfter >= 5 && nAfter <= 240) ? nAfter : 60;

  var ne = document.getElementById('notifEnabled');
  if(ne) data.settings.notifEnabled = ne.checked;
  var nas = document.getElementById('notifAtStart');
  if(nas) data.settings.notifAtStart = nas.checked;
  var nmre = document.getElementById('notifMissingReportEnabled');
  if(nmre) data.settings.notifMissingReportEnabled = nmre.checked;
  var nmra = document.getElementById('notifMissingReportAfter');
  var missAfterVal = parseInt(nmra ? nmra.value : '60', 10);
  data.settings.notifMissingReportAfter = (!isNaN(missAfterVal) && missAfterVal >= 5 && missAfterVal <= 720) ? missAfterVal : 60;

  var ns = document.getElementById('notifSound'); if(ns) data.settings.notifSound = ns.checked;
  var nv = document.getElementById('notifVibrate'); if(nv) data.settings.notifVibrate = nv.checked;
  var nsys = document.getElementById('notifSystem'); if(nsys) data.settings.notifSystem = nsys.checked;
  var st = document.getElementById('notifSoundType'); if(st) data.settings.notifSoundType = st.value;
  var rp = document.getElementById('notifRepeat'); if(rp) data.settings.notifRepeat = rp.checked;
  var ri = document.getElementById('notifRepeatInterval'); if(ri) data.settings.notifRepeatInterval = parseInt(ri.value, 10) || 30;
  var vp = document.getElementById('notifVibratePattern'); if(vp) data.settings.notifVibratePattern = vp.value;
  var qe = document.getElementById('quietEnabled'); if(qe) data.settings.quietEnabled = qe.checked;
  var qf = document.getElementById('quietFrom'); if(qf) data.settings.quietFrom = qf.value || '23:00';
  var qt = document.getElementById('quietTo'); if(qt) data.settings.quietTo = qt.value || '07:00';

  saveData();
  showNotify('تم الحفظ');
  if (document.getElementById('tab-home') && document.getElementById('tab-home').classList.contains('active')) {
    renderHome();
  }
  checkUpcomingReminder();
}

export function collectActiveNotifications(){
  var lessonAlerts = [];
  var missingReports = [];
  var now = new Date();
  var nowMs = now.getTime();
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var reminders = Array.isArray(data.settings.notifReminders) ? data.settings.notifReminders : [];
  var maxPre = reminders.length ? Math.max.apply(null, reminders) : 0;
  var atStart = data.settings.notifAtStart !== false;

  for (var d = 0; d <= 1; d++) {
    var day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    var di = toDateISO(day);
    var occs = getOccurrencesForDate(day);
    occs.forEach(function(o){
      if (o.status !== 'upcoming' && o.status !== 'pending') return;
      var p = (o.time || '00:00').split(':').map(Number);
      var lessonStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), p[0] || 0, p[1] || 0, 0);
      var diffMin = (lessonStart.getTime() - nowMs) / 60000;
      var occKey = o.groupId + '_' + di + '_' + o.time;
      if ((dismissedReminders[occKey] || 0) > nowMs) return;
      var inPre = reminders.length > 0 && diffMin <= maxPre && diffMin >= -60;
      var inAtStart = atStart && diffMin <= 0 && diffMin >= -60;
      if (inPre || inAtStart) {
        var grp = data.groups.find(function(x){ return x.id === o.groupId; });
        lessonAlerts.push({
          key: occKey,
          diffMin: diffMin,
          groupId: o.groupId,
          groupName: o.groupName,
          link: (grp && grp.link) ? grp.link.trim() : '',
          time: o.time,
          dateISO: di,
          dateDisplay: day.getDate() + '/' + (day.getMonth() + 1),
          dayName: dayNames[day.getDay()],
          status: o.status
        });
      }
    });
  }
  lessonAlerts.sort(function(a, b){ return a.diffMin - b.diffMin; });

  if (data.settings.notifMissingReportEnabled !== false) {
    var missingAfter = parseInt(data.settings.notifMissingReportAfter, 10);
    if (isNaN(missingAfter) || missingAfter < 5) missingAfter = 60;
    var seenMissing = {};
    for (var pd = 0; pd < 7; pd++) {
      var pDay = new Date(now);
      pDay.setDate(pDay.getDate() - pd);
      pDay.setHours(0, 0, 0, 0);
      var pIso = toDateISO(pDay);
      var pOccs = getOccurrencesForDate(pDay);
      pOccs.forEach(function(o){
        if (o.status !== 'pending' && o.status !== 'upcoming') return;
        var p = (o.time || '00:00').split(':').map(Number);
        var lessonStart = new Date(pDay.getFullYear(), pDay.getMonth(), pDay.getDate(), p[0] || 0, p[1] || 0, 0);
        var minsSinceStart = (nowMs - lessonStart.getTime()) / 60000;
        if (minsSinceStart < missingAfter) return;
        var occKey = o.groupId + '_' + pIso + '_' + o.time;
        if (seenMissing[occKey]) return;
        if ((dismissedReminders['rep_' + occKey] || 0) > nowMs) return;
        seenMissing[occKey] = true;
        missingReports.push({
          key: occKey,
          minsSinceStart: Math.round(minsSinceStart),
          groupId: o.groupId,
          groupName: o.groupName,
          time: o.time,
          dateISO: pIso,
          dateDisplay: pDay.getDate() + '/' + (pDay.getMonth() + 1),
          dayName: dayNames[pDay.getDay()],
          status: o.status
        });
      });
    }
    missingReports.sort(function(a, b){
      var cmp = b.dateISO.localeCompare(a.dateISO);
      if (cmp !== 0) return cmp;
      return b.time.localeCompare(a.time);
    });
  }

  return { lessonAlerts: lessonAlerts, missingReports: missingReports };
}

export function updateBellBadges(){
  var dataAlerts = _activeBellData || { lessonAlerts: [], missingReports: [] };
  var total = dataAlerts.lessonAlerts.length + dataAlerts.missingReports.length;
  var hasUrgent = dataAlerts.lessonAlerts.length > 0;
  ['homeBellBadge', 'appBellBadge'].forEach(function(id){
    var el = document.getElementById(id);
    if (!el) return;
    if (total > 0) {
      el.textContent = total > 99 ? '99+' : String(total);
      el.style.display = 'flex';
      el.classList.toggle('urgent', hasUrgent);
    } else {
      el.style.display = 'none';
      el.classList.remove('urgent');
    }
  });
}

function _buildNotificationsModalBody(){
  var dataAlerts = collectActiveNotifications();
  _activeBellData = dataAlerts;
  updateBellBadges();
  var html = '';
  if (!dataAlerts.lessonAlerts.length && !dataAlerts.missingReports.length) {
    return '<div style="text-align:center;padding:28px 16px;color:var(--text-muted)">'
      + '<div style="margin-bottom:10px;opacity:.65">' + svgIcon('bell-off', 30) + '</div>'
      + '<div style="font-weight:700;font-size:.95rem;color:var(--text-primary);margin-bottom:4px">لا توجد تنبيهات حالية</div>'
      + '<div style="font-size:.8rem">ستظهر هنا الحصص القريبة أو الجارية والتقارير المعلقة</div>'
      + '</div>';
  }

  if (dataAlerts.lessonAlerts.length) {
    html += '<div class="notif-center-section-title">' + svgIcon('bell', 14) + ' الحصص القريبة والجارية (' + dataAlerts.lessonAlerts.length + ')</div>';
    dataAlerts.lessonAlerts.forEach(function(item){
      var dm = Math.round(item.diffMin);
      var whenTxt = dm > 0 ? ('تبدأ بعد ' + dm + ' دقيقة') : (dm === 0 ? 'تبدأ الآن' : ('جارية منذ ' + Math.abs(dm) + ' دقيقة'));
      var linkBtn = item.link
        ? '<button type="button" class="btn btn-secondary btn-sm" onclick="stopRepeatBeep();closeGenericModal();openLessonLink(\'' + escapeAttr(item.link) + '\')">' + svgIcon('external-link', 12) + ' دخول الرابط</button>'
        : '';
      html += '<div class="notif-center-item urgent">'
        + '<div class="notif-center-head">'
        + '<div><div class="notif-center-title">' + escapeHtml(item.groupName) + '</div>'
        + '<div class="notif-center-meta">' + svgIcon('clock', 12) + ' <span>' + escapeHtml(formatTimeDisplay(item.time)) + '</span> • <span>' + escapeHtml(whenTxt) + '</span></div></div>'
        + '<span class="cfg-badge amber">' + escapeHtml(item.dayName + ' ' + item.dateDisplay) + '</span>'
        + '</div>'
        + '<div class="notif-center-actions">'
        + '<button type="button" class="btn btn-primary btn-sm" style="width:auto;margin:0" onclick="stopRepeatBeep();closeGenericModal();startLessonFromCalendar(\'' + escapeAttr(item.groupId) + '\',\'' + escapeAttr(item.dateISO) + '\',\'' + escapeAttr(item.time) + '\')">' + svgIcon('play', 12) + ' فتح الحصة</button>'
        + linkBtn
        + '<button type="button" class="btn btn-secondary btn-sm" onclick="snoozeNotification(\'' + escapeAttr(item.key) + '\')">' + svgIcon('clock', 12) + ' غفوة 5 د</button>'
        + '<button type="button" class="btn btn-secondary btn-sm" onclick="dismissNotificationItem(\'' + escapeAttr(item.key) + '\')">تجاهل</button>'
        + '</div></div>';
    });
  }

  if (dataAlerts.missingReports.length) {
    html += '<div class="notif-center-section-title" style="color:var(--text-secondary)">' + svgIcon('file-text', 14) + ' حصص بدون تقرير — صامت (' + dataAlerts.missingReports.length + ')</div>';
    dataAlerts.missingReports.forEach(function(item){
      html += '<div class="notif-center-item silent-report">'
        + '<div class="notif-center-head">'
        + '<div><div class="notif-center-title">' + escapeHtml(item.groupName) + '</div>'
        + '<div class="notif-center-meta">' + svgIcon('calendar', 12) + ' <span>' + escapeHtml(item.dayName + ' ' + item.dateDisplay) + '</span> • ' + svgIcon('clock', 12) + ' <span>' + escapeHtml(formatTimeDisplay(item.time)) + '</span></div></div>'
        + '<span class="cfg-badge blue">بدون تقرير</span>'
        + '</div>'
        + '<div class="notif-center-actions">'
        + '<button type="button" class="btn btn-primary btn-sm" style="width:auto;margin:0" onclick="closeGenericModal();startLessonFromCalendar(\'' + escapeAttr(item.groupId) + '\',\'' + escapeAttr(item.dateISO) + '\',\'' + escapeAttr(item.time) + '\')">' + svgIcon('file-text', 12) + ' تسجيل التقرير</button>'
        + '<button type="button" class="btn btn-secondary btn-sm" onclick="dismissNotificationItem(\'rep_' + escapeAttr(item.key) + '\')">تجاهل</button>'
        + '</div></div>';
    });
  }

  return html;
}

export function openNotificationsModal(){
  var bodyHtml = '<div id="notifCenterBody">' + _buildNotificationsModalBody() + '</div>';
  var footerHtml = '<button type="button" class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>';
  openGenericModal(svgIcon('bell', 18) + ' التنبيهات', bodyHtml, footerHtml);
}

export function snoozeNotification(occKey){
  stopRepeatBeep();
  var until = Date.now() + 5 * 60 * 1000;
  dismissedReminders[occKey] = until;
  _snoozedNotifs[occKey] = until;
  var box = document.getElementById('notifCenterBody');
  if (box) box.innerHTML = _buildNotificationsModalBody();
  else {
    _activeBellData = collectActiveNotifications();
    updateBellBadges();
  }
  showNotify('⏰ تم التأجيل 5 دقائق');
}

export function dismissNotificationItem(key){
  if (String(key).indexOf('rep_') !== 0) {
    stopRepeatBeep();
    if (_snoozedNotifs[key]) delete _snoozedNotifs[key];
  }
  dismissedReminders[key] = Date.now() + 12 * 60 * 60 * 1000;
  var box = document.getElementById('notifCenterBody');
  if (box) box.innerHTML = _buildNotificationsModalBody();
  else {
    _activeBellData = collectActiveNotifications();
    updateBellBadges();
  }
  showNotify('تم التجاهل');
}

export function checkUpcomingReminder(){
  _activeBellData = collectActiveNotifications();
  updateBellBadges();
  var box = document.getElementById('notifCenterBody');
  if (box) box.innerHTML = _buildNotificationsModalBody();

  var now = new Date();
  var nowMs = now.getTime();
  var todayISO = toDateISO(now);
  var yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  var yesterdayISO = toDateISO(yest);

  if (data.settings.notifEnabled !== false) {
    var reminders = Array.isArray(data.settings.notifReminders) ? data.settings.notifReminders : [];
    var atStart = data.settings.notifAtStart !== false;
    for (var d = 0; d <= 1; d++) {
      var day = new Date(now);
      day.setDate(day.getDate() + d);
      day.setHours(0, 0, 0, 0);
      var di = toDateISO(day);
      var occs = getOccurrencesForDate(day);
      occs.forEach(function(o){
        if (o.status !== 'upcoming' && o.status !== 'pending') return;
        var p = (o.time || '00:00').split(':').map(Number);
        var lt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), p[0] || 0, p[1] || 0, 0);
        var diffMin = (lt.getTime() - nowMs) / 60000;
        var occKey = o.groupId + '_' + di + '_' + o.time;
        var isDismissed = (dismissedReminders[occKey] || 0) > nowMs;
        var shouldFire = false;
        var fireBody = o.groupName + ' — ' + formatTimeDisplay(o.time);

        if (_snoozedNotifs[occKey] && nowMs >= _snoozedNotifs[occKey]) {
          delete _snoozedNotifs[occKey];
          dismissedReminders[occKey] = 0;
          isDismissed = false;
          shouldFire = true;
        }

        if (!isDismissed) {
          reminders.forEach(function(remMin){
            var m = parseInt(remMin, 10);
            if (!m || m <= 0) return;
            var win = Math.min(5, Math.max(2, m));
            if (diffMin <= m && diffMin > m - win) {
              var preKey = occKey + '_pre_' + m;
              if (!_isNotifFired(preKey)) {
                _markNotifFired(preKey);
                shouldFire = true;
              }
            }
          });
          if (atStart && diffMin <= 0 && diffMin >= -5) {
            var startKey = occKey + '_start';
            if (!_isNotifFired(startKey)) {
              _markNotifFired(startKey);
              shouldFire = true;
            }
          }
        }

        if (shouldFire) {
          if (!isInQuietHours()) {
            if (data.settings.notifSound !== false) playAlarmBeep();
            if (data.settings.notifVibrate !== false) vibrateAlarm();
          }
          if (data.settings.notifSystem) {
            sendSystemNotification('تذكير بحصة', fireBody, {
              silent: false,
              tag: 'lesson-' + occKey,
              data: { groupId: o.groupId, dateISO: di, time: o.time }
            });
          }
          if (data.settings.notifRepeat) startRepeatBeep();
          _activeBellData = collectActiveNotifications();
          updateBellBadges();
        }
      });
    }
  }

  _activeBellData.missingReports.forEach(function(item){
    if (item.dateISO !== todayISO && item.dateISO !== yesterdayISO) return;
    var repKey = item.key + '_missing_rep';
    if (!_isNotifFired(repKey)) {
      _markNotifFired(repKey);
      if (data.settings.notifSystem) {
        sendSystemNotification('تقرير حصة لم يُسجل', item.groupName + ' — ' + formatTimeDisplay(item.time), {
          silent: true,
          tag: 'missing-' + item.key,
          data: { groupId: item.groupId, dateISO: item.dateISO, time: item.time }
        });
      }
    }
  });
}

export function startReminderInterval(){
  if(reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(checkUpcomingReminder, 30000);
  checkUpcomingReminder();
}

/* ═══════════════ ICS EXPORT ═══════════════ */
export function padICS(n){ return String(n).padStart(2,'0'); }
export function escapeICSText(s){ if(!s) return ''; return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
export function utcStamp(){ var d = new Date(); return d.getUTCFullYear() + padICS(d.getUTCMonth()+1) + padICS(d.getUTCDate()) + 'T' + padICS(d.getUTCHours()) + padICS(d.getUTCMinutes()) + padICS(d.getUTCSeconds()) + 'Z'; }
export function addMinutesToTimeHM(t, m){ var p = t.split(':').map(Number); var tot = p[0]*60 + p[1] + m; tot = ((tot % 1440) + 1440) % 1440; return padICS(Math.floor(tot/60)) + ':' + padICS(tot % 60); }

export function exportICS(months){
  try {
    var sd = new Date(); sd.setHours(0,0,0,0);
    var ed = new Date(sd); ed.setMonth(ed.getMonth() + months);
    var lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Quran Reports Pro//AR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:حصص القرآن','X-WR-TIMEZONE:' + (getTeacherTimezone() || 'UTC')];
    var stamp = utcStamp(); var nm = (Array.isArray(data.settings.notifReminders) && data.settings.notifReminders.length) ? data.settings.notifReminders[0] : (data.settings.notifMinutes || 15); var cnt = 0; var cur = new Date(sd);
    while(cur <= ed){
      var occs = getOccurrencesForDate(cur);
      occs.forEach(function(o){
        if(o.status === 'cancelled') return;
        var dY = toDateISO(cur).replace(/-/g, '');
        var sT = o.time.replace(/:/g, '') + '00';
        var eT = addMinutesToTimeHM(o.time, 60).replace(/:/g, '') + '00';
        var uid = o.groupId + '-' + dY + '-' + o.time.replace(/:/g,'') + '@quran-pro';
        lines.push('BEGIN:VEVENT'); lines.push('UID:' + uid); lines.push('DTSTAMP:' + stamp);
        lines.push('DTSTART:' + dY + 'T' + sT); lines.push('DTEND:' + dY + 'T' + eT);
        lines.push('SUMMARY:' + escapeICSText(o.groupName));
        lines.push('LOCATION:' + escapeICSText('أونلاين')); lines.push('STATUS:CONFIRMED');
        lines.push('BEGIN:VALARM'); lines.push('TRIGGER:-PT' + nm + 'M'); lines.push('ACTION:DISPLAY');
        lines.push('DESCRIPTION:' + escapeICSText('تذكير: حصة ' + o.groupName)); lines.push('END:VALARM');
        lines.push('END:VEVENT'); cnt++;
      });
      cur.setDate(cur.getDate() + 1);
    }
    lines.push('END:VCALENDAR');
    if(cnt === 0){ showNotify('لا توجد حصص'); return; }
    var content = lines.join('\r\n');
    var blob = new Blob(['\ufeff', content], {type:'text/calendar;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url;
    a.download = 'quran-lessons-' + months + 'mo-' + new Date().toISOString().slice(0,10) + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    showNotify('تم تصدير ' + cnt + ' حصة');
  } catch(e){ console.error(e); showNotify('فشل التصدير'); }
}

/* ═══════════════ WORK STATS ═══════════════ */
export var workStatsDate = new Date();

export function formatDecimalHours(minutes){
  var m = parseFloat(minutes) || 0;
  return (m / 60).toFixed(2) + ' ساعة';
}

export function getWorkStats(locFilter){
  var now = new Date();
  var tS = new Date(now); tS.setHours(0,0,0,0);
  var wS = new Date(now); wS.setDate(wS.getDate() - wS.getDay()); wS.setHours(0,0,0,0);
  var mS = new Date(now.getFullYear(), now.getMonth(), 1);
  var yS = new Date(now.getFullYear(), 0, 1);
  var stats = { today: 0, week: 0, month: 0, year: 0, total: 0 };
  (data.sessions || []).forEach(function(s){
    if(!s.date) return;
    var m = parseInt(s.duration) || 0;
    if(m < 1) return;
    if(locFilter){
      var g = data.groups.find(function(x){ return x.id === s.groupId; });
      if(!g || (g.location || '') !== locFilter) return;
    }
    var p = s.date.split('-');
    if(p.length !== 3) return;
    var d = new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]), 12, 0, 0);
    if(isNaN(d.getTime())) return;
    stats.total += m;
    if(d >= yS) stats.year += m;
    if(d >= mS) stats.month += m;
    if(d >= wS) stats.week += m;
    if(d >= tS) stats.today += m;
  });
  return stats;
}

export function getWorkStatsByLocation(){
  var locs = data.settings.workLocations || [];
  var r = { _all: getWorkStats(null), byLocation: {} };
  locs.forEach(function(l){ r.byLocation[l] = getWorkStats(l); });
  r.byLocation['__none__'] = getWorkStats('');
  return r;
}

function analyzeSessionAttendance(session){
  var students = (session && session.data && Array.isArray(session.data.students))
    ? session.data.students
    : [];
  if (!students.length) {
    return { isFullAbsence: false, absentNames: [] };
  }
  var absentNames = [];
  var presentCount = 0;
  students.forEach(function(st, idx){
    if (!st) return;
    if (st.attendance === 'present') {
      presentCount++;
    } else {
      var nm = (st.name || '').trim();
      absentNames.push(nm || ('طالب ' + (idx + 1)));
    }
  });
  var isFullAbsence = (presentCount === 0 && absentNames.length > 0);
  return {
    isFullAbsence: isFullAbsence,
    absentNames: isFullAbsence ? [] : absentNames
  };
}

function formatFullAbsenceSummaryNote(count){
  if (!count || count < 1) return '';
  if (count === 1) return ' · منها حصة واحدة غياب كامل';
  if (count === 2) return ' · منها حصتان غياب كامل';
  if (count <= 10) return ' · منها ' + count + ' حصص غياب كامل';
  return ' · منها ' + count + ' حصة غياب كامل';
}

export function renderWorkStatsModalBody(){
  var year = workStatsDate.getFullYear();
  var month = workStatsDate.getMonth();
  var monthNames = window.MONTH_NAMES || ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var ymPrefix = year + '-' + String(month + 1).padStart(2, '0');

  var now = new Date();
  var isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());

  var monthSessions = (data.sessions || []).filter(function(s){
    return s && typeof s.date === 'string' && s.date.slice(0, 7) === ymPrefix;
  });

  var totalMinutes = 0;
  var fullAbsenceCount = 0;
  var knownLocs = Array.isArray(data.settings && data.settings.workLocations) ? data.settings.workLocations.slice() : [];
  var locBuckets = {};

  monthSessions.forEach(function(s){
    var dur = Math.max(0, parseInt(s.duration, 10) || 0);
    totalMinutes += dur;

    var att = analyzeSessionAttendance(s);
    if (att.isFullAbsence) fullAbsenceCount++;

    var grp = (data.groups || []).find(function(x){ return x.id === s.groupId; });
    var rawLoc = grp && grp.location ? String(grp.location).trim() : '';
    var locKey = rawLoc ? rawLoc : '__none__';

    if (!locBuckets[locKey]) {
      locBuckets[locKey] = {
        key: locKey,
        label: locKey === '__none__' ? 'مجموعات خاصة / بدون مكان محدد' : locKey,
        totalMinutes: 0,
        groups: {}
      };
    }
    locBuckets[locKey].totalMinutes += dur;

    var grpKey = grp ? grp.id : ('__orphan_' + (s.groupId || 'unknown'));
    var grpName = grp ? grp.name : ((s.data && s.data.group) ? s.data.group : 'مجموعة محذوفة');

    if (!locBuckets[locKey].groups[grpKey]) {
      locBuckets[locKey].groups[grpKey] = {
        id: grpKey,
        name: grpName,
        totalMinutes: 0,
        sessions: []
      };
    }
    locBuckets[locKey].groups[grpKey].totalMinutes += dur;
    locBuckets[locKey].groups[grpKey].sessions.push({
      session: s,
      duration: dur,
      attendance: att
    });
  });

  // 1) شريط التنقل بين الشهور
  var navHtml = ''
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;background:var(--card-secondary-bg);border:1px solid var(--card-border);border-radius:12px;padding:8px 10px;margin-bottom:14px">'
    +   '<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">'
    +     '<button type="button" class="btn btn-secondary btn-sm" onclick="changeWorkStatsMonth(-1)" title="الشهر السابق" style="padding:6px 10px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap">'
    +       svgIcon('chevron-right', 14) + '<span>السابق</span>'
    +     '</button>'
    +     '<div style="flex:1;text-align:center;font-weight:700;font-size:.95rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
    +       escapeHtml(monthNames[month] + ' ' + year)
    +     '</div>'
    +     '<button type="button" class="btn btn-secondary btn-sm" onclick="changeWorkStatsMonth(1)" title="الشهر التالي" style="padding:6px 10px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap">'
    +       '<span>التالي</span>' + svgIcon('chevron-left', 14)
    +     '</button>'
    +   '</div>'
    +   '<button type="button" class="btn btn-sm ' + (isCurrentMonth ? 'btn-secondary' : 'btn-primary') + '" onclick="goToCurrentWorkStatsMonth()" ' + (isCurrentMonth ? 'disabled style="opacity:.6;padding:6px 10px;white-space:nowrap;width:auto;margin:0"' : 'style="padding:6px 10px;white-space:nowrap;width:auto;margin:0"') + '>'
    +     'هذا الشهر'
    +   '</button>'
    + '</div>';

  // 2) بطاقة الملخص البارزة للشهر المحدد
  var secondarySummary = 'إجمالي الحصص: ' + monthSessions.length + ' حصة' + formatFullAbsenceSummaryNote(fullAbsenceCount);
  var overviewHtml = ''
    + '<div style="background:linear-gradient(135deg, var(--primary-soft), var(--card-secondary-bg));border:1px solid var(--primary-ring);border-radius:14px;padding:16px;margin-bottom:16px;text-align:center">'
    +   '<div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:4px;font-weight:600">إجمالي ساعات العمل في ' + escapeHtml(monthNames[month] + ' ' + year) + '</div>'
    +   '<div style="font-size:1.75rem;font-weight:800;color:var(--accent-green);line-height:1.25;font-variant-numeric:tabular-nums">' + escapeHtml(formatDecimalHours(totalMinutes)) + '</div>'
    +   '<div style="margin-top:8px;font-size:.82rem;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap">'
    +     svgIcon('calendar-days', 14) + '<span>' + escapeHtml(secondarySummary) + '</span>'
    +   '</div>'
    + '</div>';

  // 3) الترتيب الهرمي: أماكن العمل ← المجموعات ← سجل الحصص
  var orderedLocKeys = [];
  knownLocs.forEach(function(loc){
    var trimmed = String(loc || '').trim();
    if (trimmed && locBuckets[trimmed] && orderedLocKeys.indexOf(trimmed) === -1) {
      orderedLocKeys.push(trimmed);
    }
  });
  Object.keys(locBuckets).forEach(function(k){
    if (k !== '__none__' && orderedLocKeys.indexOf(k) === -1) {
      orderedLocKeys.push(k);
    }
  });
  if (locBuckets['__none__']) {
    orderedLocKeys.push('__none__');
  }

  var hierarchyHtml = '';
  if (!orderedLocKeys.length) {
    hierarchyHtml = ''
      + '<div style="text-align:center;padding:28px 16px;background:var(--card-secondary-bg);border:1px dashed var(--card-border-strong);border-radius:12px;color:var(--text-muted)">'
      +   '<div style="margin-bottom:8px;opacity:.75">' + svgIcon('calendar-days', 28) + '</div>'
      +   '<div style="font-weight:700;font-size:.92rem;color:var(--text-secondary);margin-bottom:4px">لا توجد حصص مسجلة في هذا الشهر</div>'
      +   '<div style="font-size:.8rem">جرّب الانتقال إلى شهر آخر من الشريط بالأعلى</div>'
      + '</div>';
  } else {
    orderedLocKeys.forEach(function(locKey){
      var bucket = locBuckets[locKey];
      var groupList = Object.keys(bucket.groups).map(function(gid){ return bucket.groups[gid]; });
      groupList.sort(function(a, b){
        return (b.totalMinutes - a.totalMinutes) || (a.name || '').localeCompare(b.name || '', 'ar');
      });

      var groupsHtml = '';
      groupList.forEach(function(grp){
        grp.sessions.sort(function(a, b){
          var da = (a.session.date || '');
          var db = (b.session.date || '');
          if (da !== db) return da.localeCompare(db);
          return (a.session.time || '').localeCompare(b.session.time || '');
        });

        var sessionsHtml = '';
        grp.sessions.forEach(function(entry){
          var ses = entry.session;
          var df = ses.date ? ses.date.split('-').reverse().join('/') : '—';
          var rawLesson = ses.lessonNumber || (ses.data && ses.data.lesson) || '';
          var lessonLabel = rawLesson
            ? (String(rawLesson).indexOf('حصة') !== -1 || String(rawLesson).indexOf('الحصة') !== -1 ? String(rawLesson) : ('الحصة ' + rawLesson))
            : 'حصة';

          var badgeHtml = '';
          var rowBg = 'var(--card-bg)';
          var rowBorder = 'var(--card-border)';

          if (entry.attendance.isFullAbsence) {
            rowBg = 'var(--warning-bg)';
            rowBorder = 'rgba(251, 191, 36, 0.35)';
            badgeHtml = '<span style="font-size:.73rem;font-weight:700;color:var(--accent-amber);background:rgba(251, 191, 36, 0.14);border:1px solid rgba(251, 191, 36, 0.35);border-radius:6px;padding:2px 7px;white-space:nowrap">(حصة غياب كامل)</span>';
          } else if (entry.attendance.absentNames.length > 0) {
            badgeHtml = '<span style="font-size:.74rem;color:var(--text-muted)">(غياب: ' + escapeHtml(entry.attendance.absentNames.join('، ')) + ')</span>';
          }

          sessionsHtml += ''
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:7px 10px;background:' + rowBg + ';border:1px solid ' + rowBorder + ';border-radius:8px;font-size:.8rem">'
            +   '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0">'
            +     '<span style="color:var(--text-secondary);font-weight:600;font-variant-numeric:tabular-nums">' + escapeHtml(df) + '</span>'
            +     '<span style="color:var(--text-primary);font-weight:600">' + escapeHtml(lessonLabel) + '</span>'
            +     badgeHtml
            +   '</div>'
            +   '<span style="font-weight:700;color:var(--accent-green);font-variant-numeric:tabular-nums;white-space:nowrap">' + escapeHtml(formatDecimalHours(entry.duration)) + '</span>'
            + '</div>';
        });

        groupsHtml += ''
          + '<div style="background:var(--bg-primary);border:1px solid var(--card-border);border-radius:10px;padding:10px 12px">'
          +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
          +     '<div style="font-weight:700;font-size:.88rem;color:var(--text-primary)">' + escapeHtml(grp.name) + '</div>'
          +     '<div style="display:flex;align-items:center;gap:8px">'
          +       '<span style="font-size:.74rem;color:var(--text-muted)">' + grp.sessions.length + ' حصة</span>'
          +       '<span style="font-weight:700;font-size:.86rem;color:var(--accent-green);font-variant-numeric:tabular-nums">' + escapeHtml(formatDecimalHours(grp.totalMinutes)) + '</span>'
          +     '</div>'
          +   '</div>'
          +   '<details style="margin-top:8px">'
          +     '<summary style="cursor:pointer;list-style:none;display:inline-flex;align-items:center;gap:5px;font-size:.77rem;color:var(--text-secondary);font-weight:600;user-select:none">'
          +       svgIcon('chevron-down', 13) + '<span>تفاصيل الحصص (' + grp.sessions.length + ')</span>'
          +     '</summary>'
          +     '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--card-border)">'
          +       sessionsHtml
          +     '</div>'
          +   '</details>'
          + '</div>';
      });

      hierarchyHtml += ''
        + '<div style="background:var(--card-secondary-bg);border:1px solid var(--card-border);border-radius:14px;padding:12px 14px;margin-bottom:12px">'
        +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid var(--card-border)">'
        +     '<div style="display:flex;align-items:center;gap:7px;font-weight:700;font-size:.92rem;color:var(--text-primary)">'
        +       svgIcon('building-2', 16) + '<span>' + escapeHtml(bucket.label) + '</span>'
        +     '</div>'
        +     '<span style="font-weight:800;font-size:.92rem;color:var(--accent-green);font-variant-numeric:tabular-nums;white-space:nowrap">' + escapeHtml(formatDecimalHours(bucket.totalMinutes)) + '</span>'
        +   '</div>'
        +   '<div style="display:flex;flex-direction:column;gap:8px">'
        +     groupsHtml
        +   '</div>'
        + '</div>';
    });
  }

  return navHtml + overviewHtml + hierarchyHtml;
}

export function changeWorkStatsMonth(delta){
  var d = parseInt(delta, 10) || 0;
  workStatsDate = new Date(workStatsDate.getFullYear(), workStatsDate.getMonth() + d, 1);
  var bodyEl = document.getElementById('genericModalBody');
  if (bodyEl) {
    bodyEl.innerHTML = renderWorkStatsModalBody();
    hydrateIcons(bodyEl);
  }
}

export function goToCurrentWorkStatsMonth(){
  var now = new Date();
  workStatsDate = new Date(now.getFullYear(), now.getMonth(), 1);
  var bodyEl = document.getElementById('genericModalBody');
  if (bodyEl) {
    bodyEl.innerHTML = renderWorkStatsModalBody();
    hydrateIcons(bodyEl);
  }
}

export function showWorkStatsModal(e){
  if(e) e.preventDefault();
  var now = new Date();
  workStatsDate = new Date(now.getFullYear(), now.getMonth(), 1);
  var body = renderWorkStatsModalBody();
  openGenericModal('ساعات الحصص', body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
}

/* ═══════════════ TIMER ═══════════════ */
export function getTimerElapsedMs(){
  if(!data.activeTimer) return 0;
  var t = data.activeTimer;
  var e = t.pausedAt ? new Date(t.pausedAt).getTime() : Date.now();
  return Math.max(0, e - new Date(t.startAt).getTime() - (t.totalPausedMs || 0));
}

export function toggleLessonTimer(){
  if(!data.activeTimer) startLessonTimer(false);
  else if(data.activeTimer.pausedAt) resumeLessonTimer();
  else pauseLessonTimer();
}

export function startLessonTimer(silent){
  if(data.activeTimer){ if(!silent) showNotify('يوجد مؤقّت'); return; }
  data.activeTimer = { type: 'lesson', startAt: new Date().toISOString(), pausedAt: null, totalPausedMs: 0, linkedSessionId: null };
  saveData(); updateLessonTimerDisplay();
  if(!silent){ showNotify('بدأ المؤقّت'); ensureAudioContext(); }
}

export function pauseLessonTimer(){
  if(!data.activeTimer || data.activeTimer.pausedAt) return;
  data.activeTimer.pausedAt = new Date().toISOString();
  saveData(); updateLessonTimerDisplay();
  showNotify('تم الإيقاف المؤقت');
}

export function resumeLessonTimer(){
  if(!data.activeTimer || !data.activeTimer.pausedAt) return;
  var pm = Date.now() - new Date(data.activeTimer.pausedAt).getTime();
  data.activeTimer.totalPausedMs = (data.activeTimer.totalPausedMs || 0) + pm;
  data.activeTimer.pausedAt = null;
  saveData(); updateLessonTimerDisplay();
  showNotify('تم الاستئناف');
}

export function stopLessonTimer(silent){
  if(!data.activeTimer) return;
  var d = Math.round(getTimerElapsedMs() / 60000);
  var ea = data.activeTimer.pausedAt ? data.activeTimer.pausedAt : new Date().toISOString();
  if(d >= 1){
    data.workSessions.push({ id: genId(), type: 'lesson', startAt: data.activeTimer.startAt, endAt: ea, duration: d, linkedSessionId: data.activeTimer.linkedSessionId || null });
    var di = document.getElementById('duration');
    if(di && !di.value) di.value = d;
  }
  data.activeTimer = null;
  saveData(); updateLessonTimerDisplay();
  if(!silent) showNotify(d >= 1 ? 'تم حفظ ' + formatDuration(d) : 'تم الإيقاف');
}

export function updateLessonTimerDisplay(){
  var w = document.getElementById('lessonTimerWidget');
  var el = document.getElementById('lessonTimerDisplay');
  var btn = document.getElementById('lessonTimerBtn');
  var stopBtn = document.getElementById('lessonTimerStopBtn');
  if(!el || !btn || !w) return;
  if(!data.activeTimer){
    el.textContent = '00:00:00';
    btn.innerHTML = svgIcon('play', 16);
    btn.className = 'icon-btn primary';
    btn.title = 'بدء';
    if(stopBtn) stopBtn.style.display = 'none';
    w.classList.remove('active', 'paused');
    return;
  }
  var el2 = Math.floor(getTimerElapsedMs() / 1000);
  var h = Math.floor(el2 / 3600);
  var m = Math.floor((el2 % 3600) / 60);
  var s = el2 % 60;
  el.textContent = (h > 0 ? h + ':' : '') + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  if(stopBtn){ stopBtn.style.display = 'inline-flex'; stopBtn.innerHTML = svgIcon('square', 16); }
  if(data.activeTimer.pausedAt){
    btn.innerHTML = svgIcon('play', 16);
    btn.className = 'icon-btn primary';
    btn.title = 'استئناف';
    w.classList.add('active', 'paused');
  } else {
    btn.innerHTML = svgIcon('pause', 16);
    btn.className = 'icon-btn';
    btn.title = 'إيقاف مؤقت';
    w.classList.add('active');
    w.classList.remove('paused');
  }
}

export function startLessonTimerInterval(){ setInterval(updateLessonTimerDisplay, 1000); }

/* ═══════════════ BULK / FOLDER IMPORT ═══════════════ */
export function openBulkImport(){
  openGenericModal('استيراد نصوص', '<p style="font-size:.85rem;color:var(--text-muted);margin-bottom:10px">الصق نصوص التقارير:</p><textarea id="bulkImportText" style="height:350px;resize:vertical;font-family:monospace;font-size:13px;direction:rtl" placeholder="اسم الجروب : ..."></textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="doBulkImport()">بدء</button>');
}

export function doBulkImport(){
  var t = document.getElementById('bulkImportText').value;
  if(!t.trim()){ showNotify('فارغ'); return; }
  var c = parseBulkReports(t);
  if(c > 0){ closeGenericModal(); switchTab('library'); }
}

export function parseBulkReports(text){
  var blocks = text.split(/(?=🙋🏻|اسم الجروب)/); var cnt = 0;
  blocks.forEach(function(block){
    block = block.trim(); if(!block) return;
    var dm = block.match(/التاريخ\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})/); if(!dm) return;
    var iso = '';
    if(dm[1].indexOf('-') !== -1) iso = dm[1];
    else { var p = dm[1].split('/'); iso = p[2] + '-' + p[1].padStart(2,'0') + '-' + p[0].padStart(2,'0'); }
    var gm = block.match(/اسم الجروب\s*:\s*(.+)/);
    var lm = block.match(/الحصة\s*:\s*(.+)/);
    var dum = block.match(/مدة الحصة\s*:\s*(.+)/);
    var sm = block.match(/المادة\s*:\s*(.+)/);
    var gname = gm ? gm[1].trim() : 'بدون';
    var lesson = lm ? lm[1].trim() : '';
    var durT = dum ? dum[1].trim() : '';
    var subT = sm ? sm[1].trim() : 'القرآن';
    var sub = 'quran';
    if(subT.indexOf('اللغة العربية') !== -1 && subT.indexOf('القرآن') !== -1) sub = 'both';
    else if(subT.indexOf('اللغة العربية') !== -1 && subT.indexOf('القرآن') === -1) sub = 'arabic';
    var durM = 60;
    if(durT.indexOf('ساعتين') !== -1 || durT.indexOf('120') !== -1) durM = 120;
    else if(durT.indexOf('ثلاث') !== -1 || durT.indexOf('180') !== -1) durM = 180;
    var g = data.groups.find(function(x){ return normalize(x.name) === normalize(gname); });
    if(!g){ g = {id: genId(), name: gname, teacherName: data.settings.teacherName||'', constants: [], schedule: [], timezone: '', link: '', location: '', createdAt: new Date().toISOString()}; data.groups.push(g); }
    var sb = block.split(/---\s*(.+?)\s*---/); var sids = [];
    for(var i=1; i<sb.length; i+=2){
      var sn = sb[i].trim();
      if(!sn || sn === '(بدون اسم)' || sn.indexOf('طالب') === 0) continue;
      var st = data.students.find(function(x){ return x.groupId === g.id && normalize(x.name) === normalize(sn); });
      if(!st){ st = {id: genId(), name: sn, groupId: g.id, constants: [], notes:''}; data.students.push(st); }
      sids.push(st.id);
    }
    var ex = data.sessions.find(function(s){ return s.groupId === g.id && s.date === iso; });
    if(ex) return;
    data.sessions.push({ id: genId(), groupId: g.id, studentIds: sids, date: iso, lessonNumber: lesson, duration: durM, subject: sub, data: { group: gname, date: iso, lesson: lesson, duration: durM, subject: sub, students: [] }, report: block, savedAt: new Date().toISOString() });
    cnt++;
  });
  if(cnt > 0){ saveData(); renderGroupsList(); renderStudentsList(); showNotify('تم استيراد ' + cnt); }
  else showNotify('لا تقارير جديدة');
  return cnt;
}

export function handleFolderImport(e){
  var files = e.target.files; if(!files.length) return;
  var cf = 0, df = 0;
  for(var i=0; i<files.length; i++){
    var file = files[i];
    if(!file.name.match(/\.(txt|md)$/i)) continue;
    var pp = file.webkitRelativePath.split('/'); if(pp.length < 3) continue;
    var gf = pp[0], yf = pp[1], mf = pp[pp.length-1];
    var mo = parseInt(mf.replace(/\D/g, '')); var yr = parseInt(yf);
    if(isNaN(mo) || isNaN(yr)) continue;
    cf++;
    (function(f, gf, yr, mo){
      var r = new FileReader();
      r.onload = function(ev){
        parseFolderFile(ev.target.result, gf, yr, mo);
        df++;
        if(df === cf){ saveData(); renderGroupsList(); renderStudentsList(); showNotify('تم استيراد ' + cf); }
      };
      r.readAsText(f);
    })(file, gf, yr, mo);
  }
  if(cf === 0) showNotify('لا ملفات صالحة'); else showNotify('جارٍ الاستيراد...');
}

export function parseFolderFile(text, gname, yr, mo){
  var g = data.groups.find(function(x){ return normalize(x.name) === normalize(gname); });
  if(!g){ g = {id: genId(), name: gname, teacherName: data.settings.teacherName||'', constants: [], schedule: [], timezone: '', link: '', location: '', createdAt: new Date().toISOString()}; data.groups.push(g); }
  var ms = text.split(/📋 التقرير الشهري/); var st = ms[0]; var mt = ms.length > 1 ? '📋 التقرير الشهري' + ms[1] : null;
  if(mt){
    var em = data.monthlyReports.find(function(r){ return r.ownerType === 'group' && r.ownerId === g.id && r.year === yr && r.month === mo; });
    if(!em) data.monthlyReports.push({ id: genId(), ownerType: 'group', ownerId: g.id, year: yr, month: mo, text: mt.trim(), savedAt: new Date().toISOString() });
  }
  var blocks = st.split(/(?=🙋🏻|اسم الجروب)/);
  blocks.forEach(function(block){
    block = block.trim(); if(!block) return;
    var dm = block.match(/التاريخ\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})/); if(!dm) return;
    var iso = '';
    if(dm[1].indexOf('-') !== -1) iso = dm[1];
    else { var p = dm[1].split('/'); iso = p[2] + '-' + p[1].padStart(2,'0') + '-' + p[0].padStart(2,'0'); }
    var lm = block.match(/الحصة\s*:\s*(.+)/);
    var dum = block.match(/مدة الحصة\s*:\s*(.+)/);
    var sm = block.match(/المادة\s*:\s*(.+)/);
    var lesson = lm ? lm[1].trim() : '';
    var durT = dum ? dum[1].trim() : '';
    var subT = sm ? sm[1].trim() : 'القرآن';
    var sub = 'quran';
    if(subT.indexOf('اللغة العربية') !== -1 && subT.indexOf('القرآن') !== -1) sub = 'both';
    else if(subT.indexOf('اللغة العربية') !== -1 && subT.indexOf('القرآن') === -1) sub = 'arabic';
    var durM = 60;
    if(durT.indexOf('ساعتين') !== -1 || durT.indexOf('120') !== -1) durM = 120;
    else if(durT.indexOf('ثلاث') !== -1 || durT.indexOf('180') !== -1) durM = 180;
    var sb = block.split(/---\s*(.+?)\s*---/); var sids = [];
    for(var i=1; i<sb.length; i+=2){
      var sn = sb[i].trim();
      if(!sn || sn === '(بدون اسم)' || sn.startsWith('طالب')) continue;
      var st2 = data.students.find(function(x){ return x.groupId === g.id && normalize(x.name) === normalize(sn); });
      if(!st2){ st2 = {id: genId(), name: sn, groupId: g.id, constants: [], notes:''}; data.students.push(st2); }
      sids.push(st2.id);
    }
    var ex = data.sessions.find(function(s){ return s.groupId === g.id && s.date === iso; });
    if(ex) return;
    data.sessions.push({ id: genId(), groupId: g.id, studentIds: sids, date: iso, lessonNumber: lesson, duration: durM, subject: sub, data: { group: g.name, date: iso, lesson: lesson, duration: durM, subject: sub, students: [] }, report: block, savedAt: new Date().toISOString() });
  });
}

/* ═══════════════ SHORTCUTS ═══════════════ */
export function showKeyboardShortcuts(){
  var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  var mod = isMac ? '⌘' : 'Ctrl';
  var rows = [
    [mod + ' + 1', 'الرئيسية'],
    [mod + ' + 2', 'الحصة'],
    [mod + ' + 3', 'التقويم'],
    [mod + ' + 4', 'المكتبة'],
    [mod + ' + 5', 'الإعدادات'],
    [mod + ' + N', 'حصة جديدة'],
    [mod + ' + B', 'المتصفح'],
    [mod + ' + K', 'البحث في التقارير'],
    [mod + ' + ,', 'الإعدادات'],
    ['Esc', 'إغلاق النافذة المفتوحة'],
    ['?', 'هذه القائمة']
  ];
  var body = '<div style="display:flex;flex-direction:column;gap:6px">';
  rows.forEach(function(r){
    body += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--card-secondary-bg);border:1px solid var(--card-border);border-radius:8px;gap:12px">'
      + '<span style="font-size:.86rem;color:var(--text-primary)">' + escapeHtml(r[1]) + '</span>'
      + '<kbd style="font-family:monospace;font-size:.78rem;font-weight:700;padding:4px 10px;background:var(--card-bg);border:1px solid var(--card-border-strong);border-radius:6px;color:var(--accent-green);white-space:nowrap;box-shadow:0 1px 0 var(--card-border-strong)">' + escapeHtml(r[0]) + '</kbd>'
      + '</div>';
  });
  body += '</div>';
  openGenericModal(
    svgIcon('zap', 20) + ' اختصارات لوحة المفاتيح',
    body,
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>'
  );
}

/* ═══════════════ BEFOREUNLOAD ═══════════════ */
window.addEventListener('beforeunload', function(e){
  if (_draftUnsaved){
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

/* ═══════════════ TOUCH SWIPE NAVIGATION (RTL) ═══════════════ */
var _swipeListenersBound = false;
var _swipeState = null;
var SWIPE_MIN_X = 60;
var SWIPE_MAX_Y = 40;

function isOverlayVisible(el){
  if (!el) return false;
  if (el.style && el.style.display === 'none') return false;
  var cs = (typeof window.getComputedStyle === 'function') ? window.getComputedStyle(el) : null;
  return cs ? cs.display !== 'none' : (el.style && el.style.display !== 'none');
}

function hasHorizontalScrollAncestor(target){
  var el = target;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.classList && (
      el.classList.contains('tab-panel') ||
      el.classList.contains('cal-grid') ||
      el.classList.contains('cal-weekly') ||
      el.classList.contains('cal-list')
    )) {
      break;
    }
    if (el.id === 'calendarBody') break;
    if (el.scrollWidth > el.clientWidth + 2) {
      var cs = (typeof window.getComputedStyle === 'function') ? window.getComputedStyle(el) : null;
      var ox = cs ? cs.overflowX : '';
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}

function shouldIgnoreSwipe(target){
  if (typeof document === 'undefined') return true;
  if (document.querySelector('.modal-overlay.active')) return true;
  if (document.querySelector('.bottom-sheet.open')) return true;
  if (isOverlayVisible(document.getElementById('browserOverlay'))) return true;
  if (isOverlayVisible(document.getElementById('authOverlay'))) return true;
  if (!target || typeof target.closest !== 'function') return true;

  var tag = target.tagName || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return true;
  if (target.closest('.surah-dropdown')) return true;
  if (target.closest('.lib-subtabs, .settings-sub-tabs, .browser-tabs-scroll, .tab-nav-desktop, .browser-bookmarks-bar')) return true;
  if (target.closest('.modal-overlay.active, .bottom-sheet.open, #browserOverlay, #authOverlay')) return true;
  if (hasHorizontalScrollAncestor(target)) return true;

  return false;
}

function getActiveMainTabId(){
  var activePanel = document.querySelector('.tab-panel.active');
  if (activePanel && activePanel.id && activePanel.id.indexOf('tab-') === 0) {
    return activePanel.id.slice(4);
  }
  return _currentMainTab || 'home';
}

export function setupTouchSwipeGestures(){
  if (_swipeListenersBound || typeof document === 'undefined') return;
  _swipeListenersBound = true;

  document.addEventListener('touchstart', function(e){
    if (!e.touches || e.touches.length !== 1) {
      _swipeState = null;
      return;
    }
    var rawTarget = e.target;
    var target = (rawTarget && rawTarget.nodeType === 1)
      ? rawTarget
      : (rawTarget && rawTarget.parentElement ? rawTarget.parentElement : null);

    if (shouldIgnoreSwipe(target)) {
      _swipeState = null;
      return;
    }

    var touch = e.touches[0];
    _swipeState = {
      startX: touch.clientX,
      startY: touch.clientY,
      target: target,
      canceled: false
    };
  }, { passive: true });

  document.addEventListener('touchmove', function(e){
    if (!_swipeState || _swipeState.canceled) return;
    if (!e.touches || e.touches.length !== 1) {
      _swipeState.canceled = true;
      return;
    }
    var dy = Math.abs(e.touches[0].clientY - _swipeState.startY);
    if (dy > SWIPE_MAX_Y) {
      _swipeState.canceled = true;
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function(){
    _swipeState = null;
  }, { passive: true });

  document.addEventListener('touchend', function(e){
    if (!_swipeState) return;
    var st = _swipeState;
    _swipeState = null;

    if (st.canceled || shouldIgnoreSwipe(st.target)) return;
    if (!e.changedTouches || e.changedTouches.length !== 1) return;

    var touch = e.changedTouches[0];
    var deltaX = touch.clientX - st.startX;
    var deltaY = touch.clientY - st.startY;

    if (Math.abs(deltaX) < SWIPE_MIN_X) return;
    if (Math.abs(deltaY) > SWIPE_MAX_Y) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;

    var activeTab = getActiveMainTabId();
    var isCalendarSwipe = (activeTab === 'calendar') && st.target && Boolean(st.target.closest('.cal-grid, .cal-weekly, .cal-list, #calendarBody'));

    if (isCalendarSwipe) {
      if (deltaX > SWIPE_MIN_X) {
        calendarNavigate(-1);
        animateCalendarBodySlide(-1);
      } else if (deltaX < -SWIPE_MIN_X) {
        calendarNavigate(1);
        animateCalendarBodySlide(1);
      }
      return;
    }

    var curIdx = MAIN_TAB_ORDER.indexOf(activeTab);
    if (curIdx === -1) curIdx = 0;

    if (deltaX > SWIPE_MIN_X) {
      var prevIdx = (curIdx - 1 + MAIN_TAB_ORDER.length) % MAIN_TAB_ORDER.length;
      switchTab(MAIN_TAB_ORDER[prevIdx], -1);
    } else if (deltaX < -SWIPE_MIN_X) {
      var nextIdx = (curIdx + 1) % MAIN_TAB_ORDER.length;
      switchTab(MAIN_TAB_ORDER[nextIdx], 1);
    }
  }, { passive: true });
}

/* ═══════════════ INIT ═══════════════ */
export async function initApp(){
  try {
    migrateOldData();
    loadPendingDeletes();
    await initDataLayer();
    await loadData();
    if (migrateInvalidUUIDs()){ console.log('🔧 Cleaned invalid UUIDs before sync'); }
    loadFavorites();
    if(data.settings.themeMode === 'auto'){
      data.settings.designTheme = isDayTime()
        ? (data.settings.dayTheme || 'mint')
        : (data.settings.nightTheme || 'teal');
    }
    applyDesignTheme(data.settings.designTheme || 'teal');
    hydrateIcons();
    startLiveClock();
    setupIconObserver();
    var repDate = document.getElementById('reportDate');
    if (repDate) repDate.valueAsDate = new Date();
    currentSubjects = { quran: true, arabic: false, islamic: false };
    window.currentSubjects = currentSubjects;
    updateSubjectButtons();
    renderStudents();
    restoreDraft();
    var t = document.getElementById('teacherName');
    if(t && !t.value.trim() && data.settings.teacherName){ t.value = data.settings.teacherName; saveDraft(); }
    var stTeacher = document.getElementById('settingsTeacher');
    if (stTeacher) stTeacher.value = data.settings.teacherName || '';
    var stTz = document.getElementById('settingsTimezone');
    if (stTz) stTz.value = data.settings.teacherTimezone || '';
    setupAutoSave();
    setupGlobalClick();
    setupTouchSwipeGestures();
    updateLastBackupInfo();
    renderGroupsList();
    renderStudentsList();
    renderHome();
    renderSettingsFavs();
    updateStorageInfo();
    updateLessonTimerDisplay();
    startLessonTimerInterval();
    updatePendingBadge();
    updateLessonLinkBar();
    renderWorkLocations();
    startReminderInterval();
    updateThemeSelector();
    startThemeAutoTimer();
    var out = document.getElementById('output');
    var so = document.getElementById('sheetOutput');
    if(out && so){
      out.addEventListener('input', function(){ so.value = out.value; });
      so.addEventListener('input', function(){ out.value = so.value; });
    }
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        var bo = document.getElementById('browserOverlay');
        if (bo && bo.style.display === 'flex'){
          closeBrowser();
          return;
        }
        closeReportSheet();
        closeGenericModal();
      }

      var tag = (e.target && e.target.tagName) || '';
      var inField = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable));
      var modKey = e.ctrlKey || e.metaKey;

      if(modKey && !e.shiftKey && !e.altKey){
        if(e.key === '1'){ e.preventDefault(); switchTab('home'); }
        else if(e.key === '2'){ e.preventDefault(); switchTab('lesson'); }
        else if(e.key === '3'){ e.preventDefault(); switchTab('calendar'); }
        else if(e.key === '4'){ e.preventDefault(); switchTab('library'); }
        else if(e.key === '5'){ e.preventDefault(); switchTab('settings'); }
        else if(e.key === 'n' || e.key === 'N'){ e.preventDefault(); switchTab('lesson'); }
        else if(e.key === 'b' || e.key === 'B'){ e.preventDefault(); openInAppBrowserWithNav(); }
        else if(e.key === 'k' || e.key === 'K'){ e.preventDefault(); switchTab('library'); switchLibSub('search'); setTimeout(function(){ var el = document.getElementById('searchInput'); if(el){ el.focus(); el.select(); } }, 100); }
        else if(e.key === ',' || e.key === '،'){ e.preventDefault(); switchTab('settings'); }
      }

      if(e.key === '?' && !inField){
        e.preventDefault();
        showKeyboardShortcuts();
      }
    });
    setTimeout(hydrateIcons, 200);
    window.addEventListener('resize', function() { if (typeof window.hydrateIcons === 'function') window.hydrateIcons(); });

    setInterval(function() {
      if (typeof window.checkUpcomingReminder === 'function') {
        window.checkUpcomingReminder();
      }
      // تحديث بطاقة "الآن" إذا كانت الصفحة الرئيسية مفتوحة
      if (document.getElementById('tab-home') && document.getElementById('tab-home').classList.contains('active')) {
        if (typeof window.renderHome === 'function') window.renderHome();
      }
    }, 30000);

    // التحقق من جلسة Supabase
    setTimeout(checkSession, 500);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function(ev){
        if (ev.data && ev.data.type === 'OPEN_LESSON_FROM_NOTIF') {
          var d = ev.data.data || {};
          stopRepeatBeep();
          if (d.groupId && d.dateISO && d.time) {
            startLessonFromCalendar(d.groupId, d.dateISO, d.time);
          } else {
            openNotificationsModal();
          }
        }
      });
    }

    try { history.replaceState({ appNav: true, root: true }, ''); } catch(e){}
    window.addEventListener('popstate', function(){
      _handlingPopState = true;
      try {
        var bo = document.getElementById('browserOverlay');
        if (bo && bo.style.display === 'flex') { closeBrowser(); return; }
        var gm = document.getElementById('genericModal');
        if (gm && gm.classList.contains('active')) { closeGenericModal(); return; }
        var rs = document.getElementById('reportSheet');
        if (rs && rs.classList.contains('open')) { closeReportSheet(); return; }

        var settingsTab = document.getElementById('tab-settings');
        if (settingsTab && settingsTab.classList.contains('active') && currentSettingsSubPage) {
          backToSettingsMenu();
          return;
        }

        var libTab = document.getElementById('tab-library');
        if (libTab && libTab.classList.contains('active')) {
          if (currentViewStudentId) {
            if (currentStudentSubPage) { backToStudentMain(); return; }
            backFromStudentDetail();
            return;
          }
          if (currentViewGroupId) {
            if (currentGroupSubPage) { backToGroupMain(); return; }
            backToGroups();
            return;
          }
        }

        var homeTab = document.getElementById('tab-home');
        if (homeTab && !homeTab.classList.contains('active')) {
          switchTab('home');
          return;
        }
      } finally {
        _handlingPopState = false;
      }
    });

  } catch(err){
    console.error('onload', err);
    var bar = document.getElementById('errorBar');
    if(bar){ bar.style.display='block'; bar.innerHTML += '<div>❌ ' + err.message + '</div>'; }
  }
}

// Start immediately or on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      initApp();
      hydrateIcons();
    });
    window.addEventListener('load', function(){
      hydrateIcons();
    });
  } else {
    initApp();
    hydrateIcons();
  }
}

export function openStudentPicker(btn){
  var card = btn.closest('.student-card');
  if (!card) return;
  window._currentPickerCard = card;

  var groupNameEl = document.getElementById('groupName');
  var groupName = normalize(groupNameEl ? groupNameEl.value : '');
  var grp = data.groups.find(function(g){ return normalize(g.name) === groupName; });

  if (!grp) {
    showNotify('اختر المجموعة أولاً');
    return;
  }

  var allStudents = data.students.filter(function(s){ return s.groupId === grp.id; });
  if (!allStudents.length) {
    showNotify('لا يوجد طلاب في هذه المجموعة');
    return;
  }

  var usedNames = [];
  document.querySelectorAll('.student-card').forEach(function(c){
    if (c === card) return;
    var nameInp = c.querySelector('.student-name');
    var n = normalize(nameInp ? nameInp.value : '');
    if (n) usedNames.push(n);
  });

  var available = allStudents.filter(function(s){
    return usedNames.indexOf(normalize(s.name)) === -1;
  });

  if (!available.length) {
    showNotify('كل الطلاب مضافون بالفعل — يمكنك كتابة اسم طالب جديد يدوياً');
    return;
  }

  var body = '<p style="margin-bottom:12px;font-size:.85rem;color:var(--text-muted)">اختر طالباً من مجموعة "' + escapeHtml(grp.name) + '":</p>';
  body += '<div style="display:flex;flex-direction:column;gap:6px">';
  available.forEach(function(s){
    body += '<button type="button" class="btn btn-secondary" style="justify-content:flex-start;text-align:right;padding:12px" data-student-name="' + escapeAttr(s.name) + '" onclick="applyStudentPick(this.dataset.studentName)">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + svgIcon('user', 14) + ' '
      + escapeHtml(s.name)
      + '</div></button>';
  });
  body += '</div>';

  openGenericModal('اختيار طالب', body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>');
}

export function applyStudentPick(studentName){
  var card = window._currentPickerCard;
  if (card) {
    var input = card.querySelector('.student-name');
    if (input) input.value = studentName || '';
    card._lessonRowTypes = null;
    var groupNameEl = document.getElementById('groupName');
    var groupName = normalize(groupNameEl ? groupNameEl.value : '');
    var grp = data.groups.find(function(g){ return normalize(g.name) === groupName; });
    var studentObj = grp ? data.students.find(function(s){ return s.groupId === grp.id && normalize(s.name) === normalize(studentName || ''); }) : null;
    var gSel = card.querySelector('.student-gender');
    if (gSel) gSel.value = (studentObj && studentObj.gender) || 'male';
    updateStudentCardGender(card);
    var allRows = Array.prototype.slice.call(card.querySelectorAll('.row-item'));
    var allEmpty = !allRows.length || allRows.every(function(r){ return isRowEmpty(r); });
    if(allEmpty){
      var eff = getEffectiveRowTypes(studentObj, grp);
      var sc = card.querySelector('.study-rows-container');
      var hc = card.querySelector('.homework-rows-container');
      if(sc) sc.innerHTML = eff.filter(function(t){ return t.section === 'study'; }).map(function(t){ return renderRow('study', t.name, t.form, eff); }).join('');
      if(hc) hc.innerHTML = eff.filter(function(t){ return t.section === 'homework'; }).map(function(t){ return renderRow('homework', t.name, t.form, eff); }).join('');
      hydrateIcons(card);
    } else {
      rebuildCardRowDropdowns(card);
    }
    scheduleSaveDraft();
    renderActiveStaticTexts();
  }
  window._currentPickerCard = null;
  closeGenericModal();
}

/* ═══════════════ EXPOSE ALL FUNCTIONS TO WINDOW ═══════════════ */
if (typeof window !== 'undefined') {
  Object.assign(window, {
  svgIcon,
  hydrateIcons,
  setupIconObserver,
  applyDesignTheme,
  changeDesignTheme,
  updateThemeSelector,
  _timeToMin,
  isDayTime,
  applyAutoTheme,
  saveThemeAutoSettings,
  renderThemeAutoUI,
  startThemeAutoTimer,
  ensureAudioContext,
  openTimezonePicker,
  filterTimezones,
  cancelTimezonePicker,
  pickTimezone,
  renderWorkLocations,
  addWorkLocationPrompt,
  saveWorkLocation,
  deleteWorkLocation,
  updateLessonLinkBar,
  enterCurrentLessonLink,
  enterLessonAndOpenLink,
  showPreviousLesson,
  saveTeacherDefault,
  saveTeacherTimezone,
  detectTimezone,
  subjectsFromString,
  getSubjectString,
  toggleSubject,
  updateSubjectButtons,
  updateCardVisibility,
  getConstant,
  renderConstants,
  addConstant,
  deleteConstant,
  updateConstant,
  refreshConstantsUI,
  switchTab,
  switchLibSub,
  switchSettingsSub,
  switchLessonSub,
  openGenericModal,
  closeGenericModal,
  openReportSheet,
  closeReportSheet,
  changeStudentCount,
  setStudentCount,
  renderStudents,
  buildStudentCardHTML,
  updateAbsenceClass,
  renderRow,
  renderArabicRow,
  addArabicRow,
  addIslamicRow,
  addDynamicRow,
  toggleRangeType,
  removeRow,
  handleSurahSearch,
  validateAya,
  setupGlobalClick,
  setupAutoSave,
  scheduleSaveDraft,
  saveDraft,
  collectFormState,
  readRow,
  restoreDraft,
  applyState,
  fillRows,
  fillArabicRows,
  openGroupPicker,
  pickGroup,
  renderAttachmentsUI,
  handleAttachmentUpload,
  showSaveSuccess,
  saveSession,
  shareReportWhatsApp,
  shareReportTelegram,
  doShareCurrentReportTelegram,
  doShareTelegram,
  doShareCurrentReport,
  doShare,
  copyReport,
  copyText,
  fallbackCopy,
  renderHome,
  backToGroups,
  backToStudents,
  backFromStudentDetail,
  renderGroupsList,
  addGroupPrompt,
  createGroup,
  openGroupDetail,
  editGroup,
  saveGroupEdit,
  deleteGroup,
  deleteSession,
  newSessionForGroup,
  addStudentToGroup,
  createStudentInGroup,
  renderStudentsList,
  openStudentDetail,
  editStudent,
  onStudentCountryChange,
  saveStudentEdit,
  deleteStudent,
  buildSessionsTree,
  toggleSessionSort,
  viewSession,
  saveSessionReport,
  copySessionReport,
  exportSessionWord,
  clearForm,
  _saveBlobWithPicker,
  _getBackupSizes,
  showBackupExportModal,
  _renderBackupExportOptions,
  showBackupImportModal,
  _handleBackupFileInput,
  _prepareZipImport,
  _prepareJsonImport,
  _showRestoreChoiceModal,
  _executeRestore,
  _doZipImport,
  _doJsonImport,
  exportFullBackup,
  exportBackup,
  mergeBackupData,
  updateLastBackupInfo,
  resetAllData,
  addBackupLogEntry,
  renderBackupLog,
  clearBackupLog,
  updateStorageInfo,
  buildMonthlyReportsTree,
  openNewMonthlyReport,
  generateAndOpenMonthlyDraft,
  generateMonthlyDraftFromTab,
  saveMonthlyDraftFromTab,
  saveNewMonthlyReport,
  viewMonthlyReport,
  openEditMonthlyReport,
  saveEditMonthlyReport,
  copyMonthlyReport,
  deleteMonthlyReport,
  renderCustomRowTypes,
  openCustomRowTypeEditor,
  saveCustomRowType,
  deleteCustomRowType,
  renderStaticTexts,
  openStaticTextEditor,
  toggleStaticTextTarget,
  saveStaticText,
  deleteStaticText,
  getRowTypeForm,
  buildTypeOptions,
  handleRowTypeChange,
  rebuildAllRowDropdowns,
  renderActiveStaticTexts,
  toggleStaticTextActive,
  extractPreview,
  doSearch,
  updatePendingBadge,
  playAlarmBeep,
  vibrateAlarm,
  sendSystemNotification,
  requestNotifPermission,
  updateNotifPermStatus,
  testSystemNotification,
  testAlarmSound,
  isInQuietHours,
  startRepeatBeep,
  stopRepeatBeep,
  saveNotificationSettings,
  formatReminderOffset,
  renderNotifRemindersSettings,
  addNotifReminder,
  removeNotifReminder,
  collectActiveNotifications,
  updateBellBadges,
  openNotificationsModal,
  snoozeNotification,
  dismissNotificationItem,
  checkUpcomingReminder,
  startReminderInterval,
  openLessonLink,
  padICS,
  escapeICSText,
  utcStamp,
  addMinutesToTimeHM,
  exportICS,
  formatDecimalHours,
  getWorkStats,
  getWorkStatsByLocation,
  renderWorkStatsModalBody,
  changeWorkStatsMonth,
  goToCurrentWorkStatsMonth,
  showWorkStatsModal,
  getTimerElapsedMs,
  toggleLessonTimer,
  startLessonTimer,
  pauseLessonTimer,
  resumeLessonTimer,
  stopLessonTimer,
  updateLessonTimerDisplay,
  startLessonTimerInterval,
  openBulkImport,
  doBulkImport,
  parseBulkReports,
  handleFolderImport,
  parseFolderFile,
  showKeyboardShortcuts,
  setupTouchSwipeGestures,
  initApp,
  normalizeUrl,
  openStudentPicker,
  applyStudentPick,
  saveTeacherGender,
  updateStudentCardGender,
  getStandardRowTypes,
  getGroupEffectiveRowTypes,
  getEffectiveRowTypes,
  getOwnerEffectiveRowTypes,
  getCardEffectiveRowTypes,
  renderOwnerRowTypes,
  openRowTypeEditor,
  saveOwnerRowType,
  deleteOwnerRowType,
  moveOwnerRowType,
  resetOwnerRowTypes,
  isRowEmpty,
  rebuildCardRowDropdowns,
  syncCardRowsWithNewTypes,
  openQuickRowTypesModal,
  openQuickRowInlineEditor,
  saveQuickRowInline,
  cancelQuickRowInline,
  deleteQuickRowItem,
  moveQuickRowItem,
  resetQuickRowList,
  applyQuickRowTypes,
  generateReminderText,
  openReminderModal,
  copyReminderText,
  shareReminderWhatsApp,
  doSharePendingReminderWhatsApp,
  shareReminderTelegram,
  doSharePendingReminderTelegram,
  updateLiveClock,
  saveTimeFormat,
  backToSettingsMenu,
  switchSettingsSub,
  openGroupSubPage,
  backToGroupMain,
  openStudentSubPage,
  backToStudentMain,
  pushAppNavState,
  openInAppBrowser: openInAppBrowserWithNav,
  setCurrentLessonContext,
  saveGeminiApiKey,
  testGeminiKeyFromSettings,
  clearTransCacheFromSettings,
  switchReminderLang,
  generateReminderTextAsync,
  generateReport,
  generateMonthlyDraftFromTab,
  generateAndOpenMonthlyDraft
  });
}
