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
  isDSTActive
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
  exportToWordFromState,
  exportToWord
} from './reports.js';

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
export var currentReminderInfo = null;
export var alarmBeepedEvents = {};
export var _tzPickCallback = null;
export var _tzPrevBody = null, _tzPrevFooter = null, _tzPrevTitle = null;
export var _repeatBeepInterval = null;
export var _sessionViewUrls = [];

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

export function showPreviousLesson(groupId, beforeDate){
  var card = document.getElementById('previousLessonCard');
  var content = document.getElementById('previousLessonContent');
  if (!card || !content) return;
  var sessions = data.sessions.filter(function(s){ return s.groupId === groupId && s.date && s.report; });
  if (beforeDate) sessions = sessions.filter(function(s){ return s.date < beforeDate; });
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

export function saveTeacherTimezone(){
  var v = document.getElementById('settingsTimezone').value.trim();
  data.settings.teacherTimezone = v;
  saveData();
  showNotify('✅ تم الحفظ');
  if(document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
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

/* ═══════════════ TABS ═══════════════ */
export function switchTab(name){
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn[data-tab]').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === name); });
  var panel = document.getElementById('tab-' + name);
  if(panel) panel.classList.add('active');
  window.scrollTo(0, 0);
  if(name === 'home'){ renderHome(); }
  if(name === 'calendar'){ renderCalendar(); }
  if(name === 'library'){ backToGroups(); backToStudents(); renderGroupsList(); renderStudentsList(); }
  if(name === 'settings'){
    var accEmail = document.getElementById('accountStatusEmail');
    if (accEmail) {
      accEmail.innerHTML = 'جاري التحقق...';
      if (window.supabaseClient) {
        window.supabaseClient.auth.getSession().then(function(res) {
          var u = res.data.session ? res.data.session.user : null;
          if (u) {
            window.currentUser = u;
            accEmail.innerHTML = 'مسجل الدخول: <span style="color:var(--accent-green)">' + u.email + '</span>';
          } else {
            accEmail.innerHTML = '<span style="color:var(--accent-amber)">وضع محلي (غير مسجل)</span>';
          }
        }).catch(function() {
          accEmail.innerHTML = '<span style="color:var(--accent-amber)">وضع محلي (غير مسجل)</span>';
        });
      } else {
        accEmail.innerHTML = '<span style="color:var(--accent-amber)">وضع محلي (غير مسجل)</span>';
      }
    }
    document.getElementById('settingsTeacher').value = data.settings.teacherName || '';
    document.getElementById('settingsTimezone').value = data.settings.teacherTimezone || '';
    document.getElementById('notifEnabled').checked = data.settings.notifEnabled !== false;
    document.getElementById('notifMinutes').value = String(data.settings.notifMinutes || 15);
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
}

export function switchLibSub(sub){
  document.querySelectorAll('.lib-subtab').forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === sub); });
  document.getElementById('lib-groups-view').style.display = (sub === 'groups') ? 'block' : 'none';
  document.getElementById('lib-students-view').style.display = (sub === 'students') ? 'block' : 'none';
  document.getElementById('lib-search-view').style.display = (sub === 'search') ? 'block' : 'none';
  if (sub === 'search') setTimeout(function(){ var inp = document.getElementById('searchInput'); if (inp) inp.focus(); }, 50);
}

export function switchSettingsSub(sub){
  document.querySelectorAll('.settings-sub-tab').forEach(function(b){
    b.classList.toggle('active', b.dataset.settingsSub === sub);
  });
  document.querySelectorAll('.settings-sub-panel').forEach(function(p){
    p.classList.toggle('active', p.dataset.settingsPanel === sub);
  });
  if (sub === 'data' && typeof updateStorageInfo === 'function') {
    setTimeout(updateStorageInfo, 100);
  }
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
  document.getElementById('genericModalTitle').innerHTML = title;
  document.getElementById('genericModalBody').innerHTML = bodyHTML;
  document.getElementById('genericModalFooter').innerHTML = footerHTML;
  document.getElementById('genericModal').classList.add('active');
  hydrateIcons(document.getElementById('genericModal'));
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
  var so = document.getElementById('sheetOutput');
  var out = document.getElementById('output');
  if(so && out) so.value = out.value;
  document.getElementById('reportSheet').classList.add('open');
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
  return '<div class="student-card student-form-card" data-index="' + i + '">'
    + '<div class="student-header">'
    + '<div class="student-avatar">' + (i+1) + '</div>'
    + '<div class="student-info">'
    + '<input type="text" class="student-name" placeholder="اسم الطالب">'
    + '</div>'
    + '<select class="attendance-select student-attendance" onchange="updateAbsenceClass(this.closest(\'.student-card\'))">'
    + '<option value="present">حاضر</option><option value="excused">بعذر</option><option value="absent">غائب</option>'
    + '</select>'
    + '</div>'
    + '<div class="row-label">' + svgIcon('book-open', 12) + ' دراسة اليوم</div>'
    + '<div class="quran-block study-quran-block">'
    + '<div class="rows-container study-rows-container">' + renderRow('study','تسميع جديد') + renderRow('study','تسميع مراجعة') + renderRow('study','قراءة') + '</div>'
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
    + '<div class="rows-container homework-rows-container">' + renderRow('homework','حفظ جديد') + renderRow('homework','مراجعة') + '</div>'
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
    + '<div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
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

/* ═══════════════ ROW ITEMS ═══════════════ */
export function renderRow(sectionType, defaultLabel, form){
  form = form || 'surah-ayat';
  var isStudy = sectionType === 'study';
  var options = buildTypeOptions(isStudy, defaultLabel);
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
export function addDynamicRow(btn, type){ var c = btn.previousElementSibling; if(!c) return; var t = document.createElement('div'); t.innerHTML = renderRow(type, type==='study'?'تسميع جديد':'حفظ جديد'); c.appendChild(t.firstElementChild); scheduleSaveDraft(); }

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
    date: document.getElementById('reportDate').value,
    lesson: document.getElementById('lessonOrder').value,
    duration: document.getElementById('duration').value,
    subject: getSubjectString(),
    subjects: { quran: currentSubjects.quran, arabic: currentSubjects.arabic, islamic: currentSubjects.islamic },
    hiddenStaticIds: currentHiddenStaticIds.slice(),
    students: []
  };
  document.querySelectorAll('.student-card').forEach(function(c){
    var st = {
      name: c.querySelector('.student-name').value,
      attendance: c.querySelector('.student-attendance').value,
      level: (c.querySelector('.student-level')||{}).value || 'ممتاز',
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
    card.querySelector('.student-attendance').value = st.attendance || 'present';
    var levelSel = card.querySelector('.student-level');
    if(levelSel) levelSel.value = st.level || 'ممتاز';
    updateAbsenceClass(card);
    fillRows(card.querySelector('.study-rows-container'), st.studyRows || [], true);
    fillRows(card.querySelector('.homework-rows-container'), st.homeworkRows || [], false);
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

export function fillRows(container, rows, isStudy){
  if(!container) return;
  container.innerHTML = '';
  if(!rows.length){ container.innerHTML = renderRow(isStudy?'study':'homework', isStudy?'تسميع جديد':'حفظ جديد'); return; }
  rows.forEach(function(r){
    var form = r.form || 'surah-ayat';
    var wrap = document.createElement('div');
    wrap.innerHTML = renderRow(isStudy?'study':'homework', r.type, form);
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

export function pickGroup(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if(!g) return;
  var sts = data.students.filter(function(s){ return s.groupId === groupId; });
  document.getElementById('groupName').value = g.name;
  if(g.teacherName) document.getElementById('teacherName').value = g.teacherName;
  currentCustomRowTypes = (g.reportSettings && g.reportSettings.customRowTypes) || [];
  window.currentCustomRowTypes = currentCustomRowTypes;
  setStudentCount(Math.max(1, sts.length));
  setTimeout(function(){
    var inputs = document.querySelectorAll('.student-name');
    sts.forEach(function(s, i){ if(inputs[i]) inputs[i].value = s.name; });
    rebuildAllRowDropdowns();
    renderActiveStaticTexts();
    updateLessonLinkBar();
    showPreviousLesson(groupId, null);
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

    if (group && state.date) {
      var dup = data.sessions.find(function(s){
        return s.groupId === group.id
          && s.date === state.date
          && (s.lessonNumber || '') === (state.lesson || '');
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
        student = {id: genId(), name: st.name.trim(), groupId: group.id, constants: [], notes:'', phone:'', country:'', timezone:'', guardianName:'', birthDate:'', currentLevel:''};
        data.students.push(student);
      }
      if(!student.constants) student.constants = [];
      if (st.attendance === 'present' && st.level) student.currentLevel = st.level;
      ids.push(student.id);
    });

    var report = document.getElementById('output').value || generateReportText();
    data.sessions.push({
      id: genId(), groupId: group.id, studentIds: ids,
      date: state.date || '', lessonNumber: state.lesson || '', duration: state.duration || '',
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

export function doShareCurrentReport(phone){
  closeGenericModal();
  var out = document.getElementById('output');
  var txt = (out && out.value) ? out.value : document.getElementById('sheetOutput').value;
  doShare(txt, phone);
}

export function doShare(text, phone){
  if (!text || !text.trim()){ showNotify('لا يوجد تقرير'); return; }
  if (phone) {
    var url = 'https://wa.me/' + phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
    return;
  }
  if (navigator.share) {
    navigator.share({ title: 'تقرير الحصة', text: text }).catch(function(err){
      if (err && err.name !== 'AbortError') window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    });
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }
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
    todayOccs.forEach(function(occ){
      if (occ.status === 'cancelled' || occ.status === 'completed') return;
      var p = occ.time.split(':').map(Number);
      var startMin = p[0]*60 + p[1];
      if (startMin - 30 <= nowMin && nowMin <= startMin + 60) {
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
        + '<div class="now-time">' + svgIcon('clock', 12) + ' ' + escapeHtml(activeOcc.occ.time) + ' — ' + escapeHtml(timeText) + '</div>'
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
        + '<div class="lesson-time">' + escapeHtml(occ.time) + '</div>'
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
        + '<div class="lesson-time">' + escapeHtml(occ.time) + '</div>'
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
export function backToGroups(){ currentViewGroupId = null; currentViewStudentId = null; studentBackTarget = null; var gl = document.getElementById('groupsList'); if(gl) gl.style.display = ''; var gd = document.getElementById('groupDetail'); if(gd) gd.style.display = 'none'; }
export function backToStudents(){ currentViewStudentId = null; studentBackTarget = null; var sl = document.getElementById('studentsList'); if(sl) sl.style.display = ''; var sd = document.getElementById('studentDetail'); if(sd) sd.style.display = 'none'; }
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
  currentViewGroupId = id; currentViewStudentId = null;
  window.currentViewGroupId = id; window.currentViewStudentId = null;
  var students = data.students.filter(function(s){ return s.groupId === g.id; });
  var sessions = data.sessions.filter(function(s){ return s.groupId === g.id; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var detail = document.getElementById('groupDetail');
  document.getElementById('groupsList').style.display = 'none';
  detail.style.display = 'block';
  var chips = students.length ? students.map(function(s){ return '<span class="student-chip" onclick="openStudentDetail(\''+s.id+'\',\''+g.id+'\')">' + svgIcon('user', 12) + ' ' + escapeHtml(s.name) + '</span>'; }).join('') : '<div style="color:var(--text-muted);font-size:.9rem">لا يوجد طلاب بعد</div>';
  var tree = buildSessionsTree(sessions);
  var linkMeta = g.link ? '<span>' + svgIcon('link', 12) + ' <a href="'+escapeAttr(normalizeUrl(g.link))+'" target="_blank" rel="noopener">دخول</a></span>' : '';
  var locMeta = g.location ? '<span>' + svgIcon('building-2', 12) + ' ' + escapeHtml(g.location) + '</span>' : '';
  detail.innerHTML = '<div class="detail-header"><button class="btn btn-secondary btn-sm" onclick="backToGroups()">' + svgIcon('arrow-right', 14) + ' رجوع</button><h2>' + svgIcon('folder-open', 20) + ' ' + escapeHtml(g.name) + '</h2><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editGroup(\''+g.id+'\')">' + svgIcon('edit-3', 12) + ' تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteGroup(\''+g.id+'\')">' + svgIcon('trash-2', 12) + '</button></div></div>'
    + '<div class="detail-meta"><span>' + svgIcon('user', 12) + ' ' + students.length + ' طالب</span><span>' + svgIcon('calendar', 12) + ' ' + sessions.length + ' حصة</span>' + (g.teacherName ? '<span>' + svgIcon('graduation-cap', 12) + ' ' + escapeHtml(g.teacherName) + '</span>' : '') + locMeta + linkMeta + '</div>'
    + '<div style="margin-bottom:20px"><button class="btn btn-primary" style="width:auto;margin:0" onclick="newSessionForGroup(\''+g.id+'\')">' + svgIcon('plus', 14) + ' حصة جديدة</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('users', 14) + ' الطلاب (' + students.length + ')</span></h3><div>' + chips + '</div><button class="btn btn-secondary btn-sm" style="margin-top:14px" onclick="addStudentToGroup(\''+g.id+'\')">' + svgIcon('plus', 12) + ' إضافة طالب</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' الثوابت</span></h3><div id="groupConstantsContainer">' + renderConstants('group', g.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addConstant(\'group\', \''+g.id+'\')">' + svgIcon('plus', 12) + ' إضافة ثابت</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('alarm-clock', 14) + ' المواعيد المتكررة</span><button class="btn btn-primary btn-sm" onclick="addSchedulePrompt(\''+g.id+'\')">' + svgIcon('plus', 12) + ' موعد</button></h3><div id="groupScheduleContainer">' + renderSchedule(g.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%" onclick="addExtraAppointmentPrompt(\''+g.id+'\')">' + svgIcon('plus', 12) + ' حصة استثنائية</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' الاستثناءات</span></h3><div id="groupExceptionsContainer">' + renderGroupExceptions(g.id) + '</div></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('settings', 14) + ' أنواع سطور</span><button class="btn btn-primary btn-sm" onclick="openCustomRowTypeEditor(\'group\', \''+g.id+'\', null)">' + svgIcon('plus', 12) + ' نوع</button></h3><div id="groupCustomRowTypesContainer">' + renderCustomRowTypes(g.id) + '</div></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' نصوص ثابتة</span><button class="btn btn-primary btn-sm" onclick="openStaticTextEditor(\'group\', \''+g.id+'\', null)">' + svgIcon('plus', 12) + ' نص</button></h3><div id="groupStaticTextsContainer">' + renderStaticTexts('group', g.id) + '</div></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('calendar', 14) + ' الحصص (' + sessions.length + ')</span><button class="btn btn-secondary btn-sm" onclick="toggleSessionSort()">' + (sessionSortOrder==='desc'? svgIcon('chevron-down', 12) + ' الأحدث' : svgIcon('chevron-down', 12) + ' الأقدم') + '</button></h3>' + tree + '</div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('file-text', 14) + ' التقارير الشهرية</span><button class="btn btn-primary btn-sm" onclick="openNewMonthlyReport(\'group\', \''+g.id+'\')">' + svgIcon('plus', 12) + ' تقرير</button></h3>' + buildMonthlyReportsTree('group', g.id) + '</div>';
  hydrateIcons(detail);
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
  openGenericModal('طالب جديد', '<div class="form-field"><label>اسم الطالب</label><input type="text" id="newStudentName"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="createStudentInGroup(\''+groupId+'\')">إضافة</button>');
  setTimeout(function(){ var i = document.getElementById('newStudentName'); if(i) i.focus(); }, 50);
}

export function createStudentInGroup(groupId){
  var v = document.getElementById('newStudentName').value.trim();
  if(!v){ showNotify('أدخل اسمًا'); return; }
  if(data.students.find(function(s){ return s.groupId === groupId && normalize(s.name) === normalize(v); })){ showNotify('الاسم موجود'); return; }
  data.students.push({id: genId(), name: v, groupId: groupId, constants: [], notes:'', phone:'', country:'', timezone:'', guardianName:'', birthDate:'', currentLevel:''});
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
  currentViewStudentId = id;
  window.currentViewStudentId = id;
  if(fromGroupId){ currentViewGroupId = fromGroupId; studentBackTarget = fromGroupId; switchLibSub('students'); }
  else { currentViewGroupId = null; studentBackTarget = null; }
  window.currentViewGroupId = currentViewGroupId;
  window.studentBackTarget = studentBackTarget;

  var g = data.groups.find(function(x){ return x.id === s.groupId; });
  var sessions = data.sessions.filter(function(x){ return (x.studentIds||[]).indexOf(id) !== -1; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var detail = document.getElementById('studentDetail');
  document.getElementById('studentsList').style.display = 'none';
  detail.style.display = 'block';
  var tree = buildSessionsTree(sessions);
  var phoneDisplay = s.phone ? '<span>' + svgIcon('smartphone', 12) + ' <a href="https://wa.me/'+escapeAttr(s.phone.replace(/[^0-9]/g,''))+'" target="_blank" rel="noopener">'+escapeHtml(s.phone)+'</a></span>' : '';
  var countryDisplay = s.country ? '<span>' + svgIcon('globe', 12) + ' ' + escapeHtml(s.country)+(s.timezone?' — '+escapeHtml(s.timezone):'')+'</span>' : '';
  var guardianDisplay = s.guardianName ? '<span>' + svgIcon('user-round', 12) + ' ' + escapeHtml(s.guardianName) + '</span>' : '';
  var levelDisplay = s.currentLevel ? '<span>' + svgIcon('graduation-cap', 12) + ' ' + escapeHtml(s.currentLevel) + '</span>' : '';
  var birthDisplay = s.birthDate ? '<span>' + svgIcon('cake', 12) + ' ' + escapeHtml(fmtDate(s.birthDate)) + '</span>' : '';
  var metaExtra = [guardianDisplay, phoneDisplay, countryDisplay, levelDisplay, birthDisplay].filter(Boolean).join('');
  
  // ═══ Fix 4: data-student-id="' + s.id + '" بدلاً من data-student-id="`+s.id+`" ═══
  detail.innerHTML = '<div class="detail-header"><button class="btn btn-secondary btn-sm" onclick="backFromStudentDetail()">' + svgIcon('arrow-right', 14) + ' رجوع</button><h2>' + svgIcon('user', 20) + ' ' + escapeHtml(s.name) + '</h2><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editStudent(\''+s.id+'\')">' + svgIcon('edit-3', 12) + ' تعديل</button><button class="btn btn-danger btn-sm" data-student-id="' + s.id + '" onclick="deleteStudent(this.dataset.studentId)">' + svgIcon('trash-2', 12) + '</button></div></div>'
    + '<div class="detail-meta"><span>' + svgIcon('folder-open', 12) + ' ' + escapeHtml(g?g.name:'—') + '</span><span>' + svgIcon('calendar', 12) + ' ' + sessions.length + ' حصة</span>' + metaExtra + '</div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' الثوابت</span></h3><div id="studentConstantsContainer">' + renderConstants('student', s.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addConstant(\'student\', \''+s.id+'\')">' + svgIcon('plus', 12) + ' إضافة ثابت</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', 14) + ' نصوص ثابتة</span><button class="btn btn-primary btn-sm" onclick="openStaticTextEditor(\'student\', \''+s.id+'\', null)">' + svgIcon('plus', 12) + ' نص</button></h3><div id="studentStaticTextsContainer">' + renderStaticTexts('student', s.id) + '</div></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('calendar', 14) + ' سجل الحصص (' + sessions.length + ')</span><button class="btn btn-secondary btn-sm" onclick="toggleSessionSort()">' + (sessionSortOrder==='desc'? svgIcon('chevron-down', 12) + ' الأحدث' : svgIcon('chevron-down', 12) + ' الأقدم') + '</button></h3>' + tree + '</div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('file-text', 14) + ' التقارير الشهرية</span><button class="btn btn-primary btn-sm" onclick="openNewMonthlyReport(\'student\', \''+s.id+'\')">' + svgIcon('plus', 12) + ' تقرير</button></h3>' + buildMonthlyReportsTree('student', s.id) + '</div>';
  hydrateIcons(detail);
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
    +'<div class="form-field"><label>المجموعة</label><select id="editStudentGroup">'+groupsHTML+'</select></div>'
    +'<div class="form-field"><label>اسم ولي الأمر</label><input type="text" id="editStudentGuardian" value="'+escapeAttr(s.guardianName||'')+'"></div>'
    +'<div class="form-field"><label>رقم واتساب</label><input type="tel" id="editStudentPhone" value="'+escapeAttr(s.phone||'')+'" placeholder="+201234567890"></div>'
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
  var gid = document.getElementById('editStudentGroup').value;
  if(gid) s.groupId = gid;
  s.guardianName = (document.getElementById('editStudentGuardian').value || '').trim();
  s.phone = (document.getElementById('editStudentPhone').value || '').trim();
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
    var ex = data.sessions.find(function(s){ return s.groupId === tgid && s.date === ise.date; });
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
      ex.report = ise.report; ex.data = ise.data; ex.savedAt = ise.savedAt; stats.sessionsUpdated++;
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
  openGenericModal('تقرير شهري', '<div class="form-row-2"><div class="form-field"><label>الشهر</label><select id="newMonthlyMonth">'+mo+'</select></div><div class="form-field"><label>السنة</label><input type="number" id="newMonthlyYear" value="'+now.getFullYear()+'"></div></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="generateAndOpenMonthlyDraft(\''+ownerType+'\', \''+ownerId+'\')">توليد</button>');
}

export function generateAndOpenMonthlyDraft(ownerType, ownerId){
  var month = parseInt(document.getElementById('newMonthlyMonth').value);
  var year = parseInt(document.getElementById('newMonthlyYear').value);
  if(!month || !year) return;
  var ex = data.monthlyReports.find(function(r){ return r.ownerType === ownerType && r.ownerId === ownerId && r.year === year && r.month === month; });
  if(ex){ if(!confirm('يوجد تقرير محفوظ. فتحه للتعديل؟')) return; openEditMonthlyReport(ex.id); return; }
  var draft = generateMonthlyDraft(ownerType, ownerId, year, month);
  openGenericModal('مسودة التقرير الشهري', '<textarea id="monthlyDraftText" style="min-height:400px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7">'+escapeHtml(draft)+'</textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveNewMonthlyReport(\''+ownerType+'\', \''+ownerId+'\', '+year+', '+month+')">' + svgIcon('save', 14) + ' حفظ</button>');
}

export function generateMonthlyDraftFromTab(){
  var groupId = document.getElementById('monthlyGroupSelect').value;
  var month = parseInt(document.getElementById('monthlyMonthSelect').value);
  var year = parseInt(document.getElementById('monthlyYearInput').value);
  if(!groupId) return showNotify('اختر المجموعة');
  var draft = generateMonthlyDraft('group', groupId, year, month);
  document.getElementById('monthlyTabDraft').value = draft;
  document.getElementById('monthlyTabDraftContainer').style.display = 'block';
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
  var allRowTypes = window.ALL_ROW_TYPES || ['تسميع جديد','تسميع مراجعة','قراءة','حفظ جديد','مراجعة'];
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

export function getRowTypeForm(typeName){
  var c = currentCustomRowTypes.find(function(t){ return t.name === typeName; });
  return c ? (c.form || 'surah-ayat') : 'surah-ayat';
}

export function buildTypeOptions(isStudy, selectedLabel){
  var std = isStudy ? ['تسميع جديد', 'تسميع مراجعة', 'قراءة'] : ['حفظ جديد', 'مراجعة'];
  var html = ''; var found = false;
  std.forEach(function(t){
    if(t === selectedLabel) found = true;
    html += '<option value="'+escapeAttr(t)+'"'+(t===selectedLabel?' selected':'')+'>'+escapeHtml(t)+'</option>';
  });
  var cus = currentCustomRowTypes.filter(function(t){ return t.section === (isStudy ? 'study' : 'homework'); });
  cus.forEach(function(t){
    if(t.name === selectedLabel) found = true;
    html += '<option value="'+escapeAttr(t.name)+'"'+(t.name===selectedLabel?' selected':'')+'>'+escapeHtml(t.name)+'</option>';
  });
  if(!found && selectedLabel) html += '<option value="'+escapeAttr(selectedLabel)+'" selected>'+escapeHtml(selectedLabel)+' (محذوف)</option>';
  return html;
}

export function handleRowTypeChange(select){
  var row = select.closest('.row-item'); if(!row) return;
  var nT = select.value;
  var nF = getRowTypeForm(nT);
  var cF = row.classList.contains('free-text-row') ? 'free-text' : 'surah-ayat';
  if(cF === nF) return;
  var isStudy = !!row.closest('.study-rows-container');
  var sT = isStudy ? 'study' : 'homework';
  var w = document.createElement('div');
  w.innerHTML = renderRow(sT, nT, nF);
  var nR = w.firstElementChild; if(!nR) return;
  row.parentNode.replaceChild(nR, row);
  scheduleSaveDraft();
}

export function rebuildAllRowDropdowns(){
  document.querySelectorAll('.row-item').forEach(function(row){
    var s = row.querySelector('.row-type-select'); if(!s) return;
    var isStudy = !!row.closest('.study-rows-container');
    var cv = s.value;
    s.innerHTML = buildTypeOptions(isStudy, cv);
    var has = false;
    for(var i=0; i<s.options.length; i++){ if(s.options[i].value === cv){ has = true; break; } }
    if(!has && s.options.length) s.value = s.options[0].value;
  });
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
}

/* ═══════════════ NOTIFICATIONS ═══════════════ */
export function playAlarmBeep(){
  ensureAudioContext();
  if(!window._alarmCtx) return;
  try {
    var ctx = window._alarmCtx;
    var t = data.settings.notifSoundType || '1';
    var f = t === '2' ? 660 : (t === '3' ? 1100 : 880);
    var n = t === '3' ? 4 : 3;
    for(var i=0; i<n; i++){
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = 'sine';
      var ts = ctx.currentTime + i*0.35;
      g.gain.setValueAtTime(0, ts);
      g.gain.linearRampToValueAtTime(0.3, ts+0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ts+0.28);
      o.start(ts); o.stop(ts+0.3);
    }
  } catch(e){}
}

export function vibrateAlarm(){
  if(data.settings.notifVibrate === false) return;
  var p = data.settings.notifVibratePattern || 'short';
  if(p === 'off') return;
  var arr = p === 'long' ? [300,150,300,150,300,150] : [200,100,200];
  if(navigator.vibrate){ try { navigator.vibrate(arr); } catch(e){} }
}

export function sendSystemNotification(t, b){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(t, { body: b, tag: 'lesson-reminder' }); } catch(e){}
}

export function requestNotifPermission(){
  if(!('Notification' in window)){ showNotify('المتصفح لا يدعم'); return; }
  if(Notification.permission === 'granted'){ showNotify('مفعّلة بالفعل'); return; }
  Notification.requestPermission().then(function(p){
    if(p === 'granted') showNotify('تم تفعيل الإشعارات');
    else showNotify('تم رفض الإشعارات');
  });
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
    if(!currentReminderInfo){ clearInterval(_repeatBeepInterval); _repeatBeepInterval = null; return; }
    if(!isInQuietHours()){ playAlarmBeep(); vibrateAlarm(); }
  }, iv);
}

export function stopRepeatBeep(){
  if(_repeatBeepInterval){ clearInterval(_repeatBeepInterval); _repeatBeepInterval = null; }
}

export function triggerLessonAlarm(lesson){
  var evs = [];
  if(lesson.diffMin <= 5 && lesson.diffMin > 0) evs.push('approaching');
  if(lesson.diffMin <= 0 && lesson.diffMin > -1) evs.push('starting');
  if(lesson.diffMin <= -5 && lesson.diffMin > -6) evs.push('late');
  evs.forEach(function(ev){
    var k = lesson.key + '|' + ev;
    if(alarmBeepedEvents[k]) return;
    alarmBeepedEvents[k] = true;
    if(!isInQuietHours()){
      if(data.settings.notifSound !== false) playAlarmBeep();
      if(data.settings.notifVibrate !== false) vibrateAlarm();
    }
    if(data.settings.notifSystem) sendSystemNotification('تذكير بحصة', lesson.groupName + ' — ' + lesson.time);
    if(data.settings.notifRepeat) startRepeatBeep();
  });
}

export function saveNotificationSettings(){
  data.settings.notifEnabled = document.getElementById('notifEnabled').checked;
  data.settings.notifMinutes = parseInt(document.getElementById('notifMinutes').value) || 15;
  data.settings.notifSound = document.getElementById('notifSound').checked;
  data.settings.notifVibrate = document.getElementById('notifVibrate').checked;
  data.settings.notifSystem = document.getElementById('notifSystem').checked;
  var st = document.getElementById('notifSoundType'); if(st) data.settings.notifSoundType = st.value;
  var rp = document.getElementById('notifRepeat'); if(rp) data.settings.notifRepeat = rp.checked;
  var ri = document.getElementById('notifRepeatInterval'); if(ri) data.settings.notifRepeatInterval = parseInt(ri.value) || 30;
  var vp = document.getElementById('notifVibratePattern'); if(vp) data.settings.notifVibratePattern = vp.value;
  var qe = document.getElementById('quietEnabled'); if(qe) data.settings.quietEnabled = qe.checked;
  var qf = document.getElementById('quietFrom'); if(qf) data.settings.quietFrom = qf.value || '23:00';
  var qt = document.getElementById('quietTo'); if(qt) data.settings.quietTo = qt.value || '07:00';
  saveData();
  showNotify('تم الحفظ');
  checkUpcomingReminder();
}

export function getUpcomingLessons(within){
  var res = [];
  var now = new Date();
  var th = within + 120;
  var days = Math.ceil(th / 1440) + 1;
  var dayNames = window.DAY_NAMES || ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  for(var d=0; d<days; d++){
    var day = new Date(now); day.setDate(day.getDate() + d); day.setHours(0,0,0,0);
    var di = toDateISO(day);
    var occs = getOccurrencesForDate(day);
    occs.forEach(function(o){
      if(o.status === 'cancelled' || o.status === 'completed') return;
      var p = o.time.split(':').map(Number);
      var lt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), p[0], p[1], 0);
      var dm = Math.round((lt - now) / 60000);
      if(dm >= -60 && dm <= within){
        res.push({ key: o.groupId + '_' + di + '_' + o.time, diffMin: dm, groupId: o.groupId, groupName: o.groupName, time: o.time, dateISO: di, dateDisplay: day.getDate() + '/' + (day.getMonth()+1), dayName: dayNames[day.getDay()], status: o.status });
      }
    });
  }
  res.sort(function(a,b){ return a.diffMin - b.diffMin; });
  return res;
}

export function checkUpcomingReminder(){
  var bar = document.getElementById('lessonReminderBar');
  var textEl = document.getElementById('reminderText');
  if(!bar || !textEl) return;
  if(!data.settings.notifEnabled){ bar.classList.remove('show'); currentReminderInfo = null; return; }
  var nm = data.settings.notifMinutes || 15;
  var lessons = getUpcomingLessons(nm);
  var now = Date.now();
  lessons = lessons.filter(function(l){ var du = dismissedReminders[l.key] || 0; return du < now; });
  if(!lessons.length){ bar.classList.remove('show', 'urgent'); currentReminderInfo = null; return; }
  var l = lessons[0];
  triggerLessonAlarm(l);
  var tt = '';
  if(l.diffMin > 0) tt = 'بعد ' + l.diffMin + ' دقيقة';
  else if(l.diffMin === 0) tt = 'الآن';
  else tt = 'بدأت منذ ' + Math.abs(l.diffMin) + ' دقيقة';
  bar.classList.toggle('urgent', l.diffMin <= 5);
  bar.classList.add('show');
  textEl.innerHTML = 'حصة ' + escapeHtml(l.groupName) + ' — ' + tt + '<small>' + svgIcon('calendar', 12) + ' ' + l.dayName + '، ' + l.dateDisplay + ' — ' + svgIcon('clock', 12) + ' ' + l.time + '</small>';
  currentReminderInfo = l;
}

export function startFromReminder(){
  if(!currentReminderInfo) return;
  stopRepeatBeep();
  var info = currentReminderInfo;
  var bar = document.getElementById('lessonReminderBar'); if(bar) bar.classList.remove('show');
  startLessonFromCalendar(info.groupId, info.dateISO, info.time);
  currentReminderInfo = null;
}

export function dismissReminder(){
  if(!currentReminderInfo) return;
  stopRepeatBeep();
  dismissedReminders[currentReminderInfo.key] = Date.now() + 30*60*1000;
  var bar = document.getElementById('lessonReminderBar'); if(bar) bar.classList.remove('show', 'urgent');
  currentReminderInfo = null;
  setTimeout(checkUpcomingReminder, 1000);
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
    var stamp = utcStamp(); var nm = data.settings.notifMinutes || 15; var cnt = 0; var cur = new Date(sd);
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

export function showWorkStatsModal(e){
  if(e) e.preventDefault();
  var bl = getWorkStatsByLocation();
  var s = bl._all;
  var brkHtml = '';
  var locs = (data.settings.workLocations || []).slice();
  locs.push('__none__');
  locs.forEach(function(l){
    var st = bl.byLocation[l];
    if(!st || st.total === 0) return;
    var lbl = l === '__none__' ? 'بدون مكان' : l;
    brkHtml += '<div class="cfg-row"><span style="display:flex;align-items:center;gap:6px">' + svgIcon('building-2', 14) + ' ' + escapeHtml(lbl) + '</span><span style="color:var(--accent-green);font-weight:700">' + formatDuration(st.total) + '</span></div>';
  });
  var recent = (data.sessions || []).slice().sort(function(a,b){ return (b.date||'').localeCompare(a.date||'') || (b.savedAt||'').localeCompare(a.savedAt||''); }).slice(0, 20);
  var recHtml = '';
  if(recent.length){
    recHtml = '<div style="margin-top:20px"><h4 style="font-size:.92rem;margin:0 0 10px;color:var(--accent-green);font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('list', 14) + ' آخر الحصص</h4>';
    recent.forEach(function(s2){
      var g = data.groups.find(function(x){ return x.id === s2.groupId; });
      var df = s2.date ? s2.date.split('-').reverse().join('/') : '—';
      recHtml += '<div class="cfg-row"><span style="color:var(--accent-green);display:flex;align-items:center;gap:5px">' + svgIcon('clock', 12) + ' ' + formatDuration(parseInt(s2.duration)||0) + '</span><span style="color:var(--text-muted);font-size:.75rem">' + escapeHtml(g?g.name:'—') + ' — ' + escapeHtml(df) + '</span></div>';
    });
    recHtml += '</div>';
  } else recHtml = '<div class="cfg-empty">لا توجد حصص بعد</div>';
  var body = '<div class="stats-row" style="margin-bottom:16px">'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(s.today) + '</div><div class="stat-label">اليوم</div></div>'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(s.week) + '</div><div class="stat-label">الأسبوع</div></div>'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(s.month) + '</div><div class="stat-label">الشهر</div></div>'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(s.total) + '</div><div class="stat-label">الإجمالي</div></div>'
    + '</div>' + (brkHtml ? '<div style="margin-bottom:16px"><h4 style="font-size:.92rem;margin:0 0 8px;color:var(--accent-green);font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('building-2', 14) + ' حسب المكان</h4>' + brkHtml + '</div>' : '') + recHtml;
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
        else if(e.key === 'b' || e.key === 'B'){ e.preventDefault(); openInAppBrowser(); }
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

    // التحقق من جلسة Supabase
    setTimeout(checkSession, 500);

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
  testAlarmSound,
  isInQuietHours,
  startRepeatBeep,
  stopRepeatBeep,
  triggerLessonAlarm,
  saveNotificationSettings,
  getUpcomingLessons,
  checkUpcomingReminder,
  startFromReminder,
  dismissReminder,
  startReminderInterval,
  padICS,
  escapeICSText,
  utcStamp,
  addMinutesToTimeHM,
  exportICS,
  getWorkStats,
  getWorkStatsByLocation,
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
  initApp,
  normalizeUrl
  });
}
