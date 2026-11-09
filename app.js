/* ═══════════════════════════════════════════════════════════
   app.js — منطق التطبيق
   الإصدار: v22 — متصفح مدمج، تقويم بالنقاط، مفضلة بالبطاقات
   يعتمد على: data.js
   ═══════════════════════════════════════════════════════════ */

/* ─── Error boundary ─── */
window.addEventListener('error', function(e){
  var bar = document.getElementById('errorBar');
  if(bar){ bar.style.display = 'block'; bar.innerHTML += '<div>❌ ' + (e.message||'خطأ') + ' (line ' + (e.lineno||'?') + ')</div>'; }
  console.error('Global error:', e.error || e.message);
});

// ═══════════════ SUPABASE INIT (SAFE) ═══════════════
let supabaseClient = null;
try {
  const SUPABASE_URL = 'https://peydkdmxvsfyocebypva.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_O-KUuRYf4xVAhRT05CKn6Q_2GxPFcAr'; // ⚠️ ضع مفتاحك هنا
  
  if (window.supabase) {
    // لاحظ أننا استخدمنا اسم المتغير الجديد هنا
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase Client Initialized successfully!');
  } else {
    console.error('❌ Supabase library not loaded.');
  }
} catch (error) {
  console.error('❌ Supabase Init Error:', error);
}

/* ═══════════════ SVG ICON SYSTEM ═══════════════ */
function svgIcon(name, size){
  var c = SVG_ICONS[name] || '';
  size = size || ICON_SIZES.md;
  var sw = (size <= ICON_SIZES.sm) ? 1.75 : 2;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0">'+c+'</svg>';
}
function hydrateIcons(root){
  (root || document).querySelectorAll('[data-icon]').forEach(function(el){
    if (el.dataset.iconHydrated) return;
    var name = el.dataset.icon;
    var size = parseInt(el.dataset.iconSize) || ICON_SIZES.md;
    el.innerHTML = svgIcon(name, size);
    el.dataset.iconHydrated = '1';
  });
}
var _iconObserver = null;
function setupIconObserver(){
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
function applyDesignTheme(themeId){
  var id = (DESIGN_THEMES.indexOf(themeId) === -1) ? 'teal' : themeId;
  var root = document.documentElement;
  DESIGN_THEMES.forEach(function(t){ root.classList.remove('theme-' + t); });
  root.classList.add('theme-' + id);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    var colors = {mint:'#fafafa',teal:'#0a0a0b',ocean:'#f8fafc',indigo:'#0a0a0f',ember:'#0f0c0a'};
    meta.setAttribute('content', colors[id] || '#0a0a0b');
  }
}
function changeDesignTheme(themeId){
  if (!data.settings) data.settings = {};
  data.settings.designTheme = themeId;
  saveData();
  applyDesignTheme(themeId);
  updateThemeSelector();
  showNotify('🎨 تم تطبيق التصميم');
}
function updateThemeSelector(){
  document.querySelectorAll('.theme-card').forEach(function(card){
    card.classList.toggle('active', card.dataset.theme === (data.settings.designTheme || 'teal'));
  });
}
/* ═══ Dark Mode Auto ═══ */
function _timeToMin(hm){
  if(!hm) return 0;
  var p = String(hm).split(':').map(Number);
  return (p[0]||0)*60 + (p[1]||0);
}
function isDayTime(){
  var now = new Date();
  var cm = now.getHours()*60 + now.getMinutes();
  var ds = _timeToMin(data.settings.dayStart || '06:00');
  var ns = _timeToMin(data.settings.nightStart || '19:00');
  if(ds < ns) return cm >= ds && cm < ns;
  return cm >= ds || cm < ns; /* فترة ليلية تعبر منتصف الليل */
}
function applyAutoTheme(){
  if(data.settings.themeMode !== 'auto') return;
  var target = isDayTime()
    ? (data.settings.dayTheme || 'mint')
    : (data.settings.nightTheme || 'teal');
  if(data.settings.designTheme === target){
    /* تحديث البطاقة النشطة إذا كانت الصفحة مفتوحة */
    updateThemeSelector();
    return;
  }
  data.settings.designTheme = target;
  saveData();
  applyDesignTheme(target);
  updateThemeSelector();
  /* حدّث حالة الأزرار في قسم المظهر إن كان مفتوحًا */
  var modeSel = document.getElementById('themeModeSelect');
  if (modeSel) modeSel.value = 'auto';
}
function saveThemeAutoSettings(){
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
function renderThemeAutoUI(){
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
/* فحص كل دقيقة لتطبيق الثيم تلقائيًا */
var _themeAutoTimer = null;
function startThemeAutoTimer(){
  if(_themeAutoTimer) clearInterval(_themeAutoTimer);
  _themeAutoTimer = setInterval(applyAutoTheme, 60000);
  applyAutoTheme();
}

/* ─── Audio context (lazy) ─── */
function ensureAudioContext(){
  try {
    if (!window._alarmCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) window._alarmCtx = new AC();
    }
    if (window._alarmCtx && window._alarmCtx.state === 'suspended') window._alarmCtx.resume();
  } catch(e) {}
}
document.addEventListener('click', ensureAudioContext, { once: true });
document.addEventListener('touchstart', ensureAudioContext, { once: true });

/* ─── Global state ─── */
let currentStudentCount = 1;
var currentAttachments = [];
var currentAttachments = [];
let draftTimer = null;
let _draftUnsaved = false;
let data = {
  groups: [], students: [], sessions: [], monthlyReports: [], appointments: [], workSessions: [],
  activeTimer: null,
  settings: { theme: 'dark', teacherName: '', teacherTimezone: '', designTheme: 'teal' }
};
var studentBackTarget = null;
var currentViewGroupId = null;
var currentViewStudentId = null;
var sessionSortOrder = 'desc';
var currentSubjects = { quran: true, arabic: false, islamic: false };
var currentCustomRowTypes = [];
var currentHiddenStaticIds = [];
var reminderInterval = null;
var dismissedReminders = {};
var currentReminderInfo = null;
var alarmBeepedEvents = {};
var _tzPickCallback = null;
var _tzPrevBody = null, _tzPrevFooter = null, _tzPrevTitle = null;
var _repeatBeepInterval = null;

/* ═══════════════ BROWSER STATE ═══════════════ */
var browserState = {
  favorites: [],
  tabs: [],
  activeTabId: null
};
var _browserTabCounter = 0;

/* ─── إدارة التبويبات ─── */
function _newTabId(){ return 'tab-' + (++_browserTabCounter) + '-' + Date.now(); }

function createBrowserTab(url){
  return {
    id: _newTabId(),
    title: url ? (getDomain(url) || 'تبويب') : 'تبويب جديد',
    url: url || null,
    history: url ? [url] : [],
    historyIndex: url ? 0 : -1,
    isHome: !url
  };
}

function getActiveTab(){
  return browserState.tabs.find(function(t){ return t.id === browserState.activeTabId; });
}

function setActiveTab(id){
  browserState.activeTabId = id;
  var tab = getActiveTab();
  if (tab){
    renderTabsBar();
    renderTabContent(tab);
    saveBrowserState();
  }
}

function renderTabsBar(){
  var scroll = document.getElementById('browserTabsScroll');
  if (!scroll) return;
  if (!browserState.tabs.length){ scroll.innerHTML = ''; return; }
  var html = '';
  browserState.tabs.forEach(function(tab){
    var active = tab.id === browserState.activeTabId;
    var domain = tab.url ? getDomain(tab.url) : '';
    var iconHtml = domain
      ? '<img class="browser-tab-favicon" src="' + getFavIcon(domain) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="browser-tab-favicon-ph" style="display:none">🌐</span>'
      : '<span class="browser-tab-favicon-ph">🌐</span>';
    var displayTitle = tab.title || 'تبويب جديد';
    if (displayTitle.length > 22) displayTitle = displayTitle.substring(0, 22) + '…';
    html += '<div class="browser-tab' + (active ? ' active' : '') + '" onclick="setActiveTab(\'' + tab.id + '\')" title="' + escapeAttr(tab.title || '') + '">'
      + iconHtml
      + '<span class="browser-tab-title">' + escapeHtml(displayTitle) + '</span>'
      + '<button class="browser-tab-close" onclick="event.stopPropagation();closeBrowserTab(\'' + tab.id + '\')" title="إغلاق التبويب">×</button>'
      + '</div>';
  });
  scroll.innerHTML = html;
}

function browserNewTab(url){
  var tab = createBrowserTab(url ? normalizeUrl(url) : null);
  browserState.tabs.push(tab);
  browserState.activeTabId = tab.id;
  renderTabsBar();
  renderTabContent(tab);
  saveBrowserState();
}

function closeBrowserTab(id){
  if (browserState.tabs.length === 1){
    var only = browserState.tabs[0];
    if (!only.url && only.isHome) return;
    only.url = null;
    only.title = 'تبويب جديد';
    only.history = [];
    only.historyIndex = -1;
    only.isHome = true;
    renderTabsBar();
    renderTabContent(only);
    saveBrowserState();
    return;
  }
  var idx = browserState.tabs.findIndex(function(t){ return t.id === id; });
  if (idx === -1) return;
  browserState.tabs.splice(idx, 1);
  if (browserState.activeTabId === id){
    var newIdx = Math.max(0, idx - 1);
    browserState.activeTabId = browserState.tabs[newIdx].id;
  }
  var tab = getActiveTab();
  renderTabsBar();
  if (tab) renderTabContent(tab);
  saveBrowserState();
}

function renderTabContent(tab){
  if (!tab) return;
  var favView = document.getElementById('browserFavoritesView');
  var iframe = document.getElementById('browserIframe');
  var fb = document.getElementById('browserFallback');
  var urlInput = document.getElementById('browserUrlInput');

  if (!tab.url || tab.isHome){
    if (favView) favView.style.display = 'block';
    if (iframe) iframe.style.display = 'none';
    if (fb) fb.style.display = 'none';
    if (urlInput) urlInput.value = '';
    renderBrowserFavorites();
  } else {
    if (favView) favView.style.display = 'none';
    if (fb) fb.style.display = 'none';
    if (iframe){
      iframe.style.display = 'block';
      if (urlInput) urlInput.value = tab.url;
      if (iframe.dataset.currentUrl !== tab.url){
        iframe.dataset.currentUrl = tab.url;
        try {
          iframe.src = tab.url;
          var loaded = false;
          var checkTimer = setTimeout(function(){ if (!loaded) showBrowserFallback(); }, 4500);
          iframe.onload = function(){
            loaded = true;
            clearTimeout(checkTimer);
            try {
              var t = iframe.contentDocument.title;
              if (t && t !== tab.title){ tab.title = t; renderTabsBar(); }
            } catch(e){ /* CORS */ }
          };
          iframe.onerror = function(){ clearTimeout(checkTimer); showBrowserFallback(); };
        } catch(e){ showBrowserFallback(); }
      }
    }
  }
  updateBrowserFavButton();
  updateBrowserNavButtons();
  renderBookmarksBar();
}

function navigateTab(tab, url){
  url = normalizeUrl(url);
  if (!url) return;
  if (detectConference(url)){
    closeBrowser();
    openLessonLink(url);
    return;
  }
  if (tab.historyIndex < tab.history.length - 1){
    tab.history = tab.history.slice(0, tab.historyIndex + 1);
  }
  tab.history.push(url);
  tab.historyIndex = tab.history.length - 1;
  tab.url = url;
  tab.isHome = false;
  tab.title = getDomain(url) || url;
  renderTabsBar();
  renderTabContent(tab);
  saveBrowserState();
}

function goTabHome(tab){
  if (!tab) return;
  tab.url = null;
  tab.isHome = true;
  tab.title = 'تبويب جديد';
  renderTabsBar();
  renderTabContent(tab);
  saveBrowserState();
}

function renderBookmarksBar(){
  var bar = document.getElementById('browserBookmarksBar');
  if (!bar) return;
  if (!browserState.favorites.length){
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  var html = '';
  browserState.favorites.forEach(function(f){
    var domain = getDomain(f.url);
    var iconUrl = getFavIcon(domain);
    html += '<button class="browser-bookmark" onclick="browserNavigateInActive(\'' + escapeAttr(f.url) + '\')" title="' + escapeAttr(f.name) + '">'
      + '<img src="' + iconUrl + '" onerror="this.style.display=\'none\'">'
      + '<span>' + escapeHtml(f.name) + '</span>'
      + '</button>';
  });
  bar.innerHTML = html;
}

function browserNavigateInActive(url){
  var tab = getActiveTab();
  if (tab) navigateTab(tab, url);
  else browserNewTab(url);
}

/* ─── حفظ واستعادة حالة التبويبات ─── */
var BROWSER_TABS_KEY = 'quran_browser_tabs_v1';
function saveBrowserState(){
  try {
    var state = {
      tabs: browserState.tabs.map(function(t){
        return { id: t.id, title: t.title, url: t.url, history: t.history, historyIndex: t.historyIndex, isHome: t.isHome };
      }),
      activeTabId: browserState.activeTabId
    };
    localStorage.setItem(BROWSER_TABS_KEY, JSON.stringify(state));
  } catch(e){}
}
function loadBrowserState(){
  try {
    var raw = localStorage.getItem(BROWSER_TABS_KEY);
    if (!raw) return false;
    var state = JSON.parse(raw);
    if (!state.tabs || !state.tabs.length) return false;
    browserState.tabs = state.tabs;
    browserState.activeTabId = state.activeTabId || state.tabs[0].id;
    state.tabs.forEach(function(t){
      var m = String(t.id).match(/tab-(\d+)/);
      if (m) _browserTabCounter = Math.max(_browserTabCounter, parseInt(m[1]));
    });
    return true;
  } catch(e){ return false; }
}

/* نمط روابط المؤتمرات — تُستخدم لتوجيه الروابط إلى تطبيق مثبّت أو متصفح خارجي */
var CONFERENCE_PATTERNS = [
  {
    id: 'zoom',
    name: 'Zoom',
    match: /(?:\/\/|^)(?:[a-z0-9-]+\.)*zoom\.us\/j\/(\d+)(?:\?[^#]*?(?:pwd=([A-Za-z0-9_-]+))?)?/i,
    build: function(m){
      var id = m[1];
      var pwd = m[2] || '';
      return 'zoommtg://zoom.us/join?action=join&confno=' + id + (pwd ? '&pwd=' + pwd : '');
    }
  },
  {
    id: 'meet',
    name: 'Google Meet',
    match: /meet\.google\.com\/([a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4})/i,
    build: function(m){ return 'https://meet.google.com/' + m[1]; }
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    match: /teams\.(?:microsoft|live)\.com/i,
    build: function(){ return 'msteams://'; }
  },
  {
    id: 'webex',
    name: 'Webex',
    match: /(?:\/\/|^)(?:[a-z0-9-]+\.)*webex\.com\/(?:meet|join)\/([a-zA-Z0-9._-]+)/i,
    build: function(m){ return 'wbxapp://webex/meet/' + m[1]; }
  },
  {
    id: 'skype',
    name: 'Skype',
    match: /join\.skype\.com\/([a-z0-9]+)/i,
    build: function(m){ return 'skype:join?' + m[1]; }
  }
];

function detectConference(url){
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
  for (var i = 0; i < CONFERENCE_PATTERNS.length; i++){
    var p = CONFERENCE_PATTERNS[i];
    var m = url.match(p.match);
    if (m){
      return { platform: p.id, name: p.name, deepLink: p.build(m), originalUrl: url };
    }
  }
  return null;
}

/* ═══════════════ TIMEZONE HELPERS ═══════════════ */
function formatUtcOffset(tz, date){
  try {
    var off = getTimezoneOffsetMinutes(tz, date || new Date());
    var sign = off >= 0 ? '+' : '-';
    var a = Math.abs(off);
    var h = Math.floor(a/60);
    var m = a%60;
    return 'UTC' + sign + h + (m>0?':'+String(m).padStart(2,'0'):'');
  } catch(e){ return ''; }
}
function isDSTActive(tz){
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
function openTimezonePicker(callback){
  var wasInModal = document.getElementById('genericModal').classList.contains('active');
  if (wasInModal) {
    _tzPrevBody = document.getElementById('genericModalBody').innerHTML;
    _tzPrevFooter = document.getElementById('genericModalFooter').innerHTML;
    _tzPrevTitle = document.getElementById('genericModalTitle').innerText;
  } else { _tzPrevBody = null; _tzPrevFooter = null; _tzPrevTitle = null; }
  _tzPickCallback = callback;
  var items = COUNTRY_TZ.map(function(c){
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
    var dstBadge = item.dst ? ' <span style="background:var(--warning-bg);color:var(--warning);padding:1px 6px;border-radius:4px;font-size:.65rem;display:inline-flex;align-items:center;gap:3px">' + svgIcon('sun', ICON_SIZES.xs) + ' صيفي</span>' : '';
    body += '<button class="tz-item" data-search="' + escapeAttr(item.searchKey) + '" onclick="pickTimezone(\'' + escapeAttr(item.tz) + '\')" style="padding:10px;background:var(--card-secondary-bg);border:1px solid var(--card-border);border-radius:8px;text-align:right;cursor:pointer;font-family:inherit;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--text-primary)">' + escapeHtml(item.displayName) + dstBadge + '</div><div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">' + escapeHtml(item.utc) + '</div></div><span style="color:var(--accent-green);font-weight:700;font-size:.85rem;white-space:nowrap">' + escapeHtml(item.nowTime) + '</span></button>';
  });
  body += '</div>';
  openGenericModal('اختر الدولة / المنطقة الزمنية', body, '<button class="btn btn-secondary" onclick="cancelTimezonePicker()">إلغاء</button>');
  setTimeout(function(){ var inp = document.getElementById('tzSearchInput'); if (inp) inp.focus(); }, 50);
}
function filterTimezones(q){
  q = (q||'').toLowerCase().trim();
  document.querySelectorAll('.tz-item').forEach(function(el){
    var s = el.getAttribute('data-search') || '';
    el.style.display = (!q || s.indexOf(q) !== -1) ? 'flex' : 'none';
  });
}
function cancelTimezonePicker(){
  _tzPickCallback = null;
  if (_tzPrevBody !== null) {
    document.getElementById('genericModalBody').innerHTML = _tzPrevBody;
    document.getElementById('genericModalFooter').innerHTML = _tzPrevFooter;
    document.getElementById('genericModalTitle').innerText = _tzPrevTitle;
    _tzPrevBody = null; _tzPrevFooter = null; _tzPrevTitle = null;
  } else closeGenericModal();
}
function pickTimezone(tz){
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
function renderWorkLocations(){
  var list = document.getElementById('workLocationsList');
  if (!list) return;
  var locs = data.settings.workLocations || [];
  if (!locs.length){ list.innerHTML = '<div class="cfg-empty">لا توجد أماكن مضافة بعد</div>'; return; }
  var html = '';
  locs.forEach(function(loc, i){
    html += '<div class="cfg-row"><div class="cfg-row-info"><div class="cfg-row-title">' + svgIcon('building-2', ICON_SIZES.sm) + ' ' + escapeHtml(loc) + '</div></div><button class="btn btn-danger btn-sm" onclick="deleteWorkLocation(' + i + ')">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button></div>';
  });
  list.innerHTML = html;
}
function addWorkLocationPrompt(){
  openGenericModal('مكان عمل جديد', '<div class="form-field"><label>اسم المكان</label><input type="text" id="newLocName" placeholder="مثال: مدرسة النور"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveWorkLocation()">حفظ</button>');
  setTimeout(function(){ var i = document.getElementById('newLocName'); if(i) i.focus(); }, 50);
}
function saveWorkLocation(){
  var v = (document.getElementById('newLocName').value || '').trim();
  if (!v) return;
  if (!data.settings.workLocations) data.settings.workLocations = [];
  if (data.settings.workLocations.indexOf(v) !== -1){ showNotify('الاسم موجود'); return; }
  data.settings.workLocations.push(v);
  saveData(); closeGenericModal(); renderWorkLocations();
  showNotify('✅ تمت الإضافة');
}
function deleteWorkLocation(i){
  if (!confirm('حذف هذا المكان؟')) return;
  var name = data.settings.workLocations[i];
  data.settings.workLocations.splice(i, 1);
  data.groups.forEach(function(g){ if (g.location === name) g.location = ''; });
  saveData(); renderWorkLocations();
}

/* ═══════════════ URL & LESSON LINK ═══════════════ */
function normalizeUrl(u){
  if (!u) return '';
  u = String(u).trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}
function updateLessonLinkBar(){
  var bar = document.getElementById('lessonLinkBar');
  if (!bar) return;
  var gEl = document.getElementById('groupName');
  var gName = normalize(gEl ? gEl.value : '');
  var g = data.groups.find(function(x){ return normalize(x.name) === gName; });
  if (g && g.link && g.link.trim()) bar.classList.add('show');
  else bar.classList.remove('show');
}
function enterCurrentLessonLink(){
  var gEl = document.getElementById('groupName');
  var gName = normalize(gEl ? gEl.value : '');
  var g = data.groups.find(function(x){ return normalize(x.name) === gName; });
  if (g && g.link) openLessonLink(g.link);
}
function enterLessonAndOpenLink(groupId, dateISO, time){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  startLessonFromCalendar(groupId, dateISO, time);
  if (g && g.link && g.link.trim()) {
    setTimeout(function(){ openLessonLink(g.link); }, 250);
  }
}
function showPreviousLesson(groupId, beforeDate){
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

/* ═══════════════ UTILITIES ═══════════════ */
function genId(){ try{ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){} return Date.now()+'-'+Math.random().toString(36).slice(2,10); }
function safe(v){ return (v === undefined || v === null) ? '' : v; }
function normalize(s){ return (s||'').trim().replace(/\s+/g,' '); }
function fmtDate(d){ return d ? d.split('-').reverse().join('/') : ''; }
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function escapeAttr(s){ return escapeHtml(s); }
function showNotify(msg){
  var n = document.getElementById('notify');
  if(!n) return;
  n.innerText = msg;
  n.style.display = 'block';
  clearTimeout(n._t);
  void n.offsetWidth;
  n.classList.add('show');
  n._t = setTimeout(function(){
    n.classList.remove('show');
    setTimeout(function(){ n.style.display = 'none'; }, 250);
  }, 2500);
}

/* ═══════════════ INDEXEDDB HELPERS ═══════════════ */
var _idb = null;
var _idbReady = false;

function idbOpen(){
  return new Promise(function(resolve, reject){
    if (_idb) { resolve(_idb); return; }
    try {
      var req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        if (!db.objectStoreNames.contains(IDB_META_STORE)) db.createObjectStore(IDB_META_STORE);
        if (!db.objectStoreNames.contains(IDB_ATTACHMENTS_STORE)) db.createObjectStore(IDB_ATTACHMENTS_STORE);
      };
      req.onsuccess = function(e){
        _idb = e.target.result;
        _idb.onclose = function(){ _idb = null; _idbReady = false; };
        resolve(_idb);
      };
      req.onerror = function(e){ reject(e.target.error || new Error('idb open failed')); };
      req.onblocked = function(){ reject(new Error('idb blocked')); };
    } catch(err) { reject(err); }
  });
}

function idbGet(key, storeName){
  return new Promise(function(resolve, reject){
    if (!_idb) { reject(new Error('idb not open')); return; }
    try {
      var tx = _idb.transaction(storeName || IDB_STORE, 'readonly');
      var req = tx.objectStore(storeName || IDB_STORE).get(key);
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    } catch(err) { reject(err); }
  });
}

function idbSet(key, value, storeName){
  return new Promise(function(resolve, reject){
    if (!_idb) { reject(new Error('idb not open')); return; }
    try {
      var tx = _idb.transaction(storeName || IDB_STORE, 'readwrite');
      var req = tx.objectStore(storeName || IDB_STORE).put(value, key);
      req.onsuccess = function(){ resolve(true); };
      req.onerror = function(){ reject(req.error); };
      tx.onabort = function(){ reject(tx.error || new Error('tx aborted')); };
    } catch(err) { reject(err); }
  });
}

function idbDelete(key, storeName){
  return new Promise(function(resolve, reject){
    if (!_idb) { reject(new Error('idb not open')); return; }
    try {
      var tx = _idb.transaction(storeName || IDB_STORE, 'readwrite');
      var req = tx.objectStore(storeName || IDB_STORE).delete(key);
      req.onsuccess = function(){ resolve(true); };
      req.onerror = function(){ reject(req.error); };
    } catch(err) { reject(err); }
  });
}

function idbAttachmentSet(key, value){
  return idbSet(key, value, IDB_ATTACHMENTS_STORE);
}

function idbAttachmentGet(key){
  return idbGet(key, IDB_ATTACHMENTS_STORE);
}

function idbAttachmentDelete(key){
  return idbDelete(key, IDB_ATTACHMENTS_STORE);
}

function deepClone(obj){
  if (typeof structuredClone === 'function') {
    try { return structuredClone(obj); } catch(e){}
  }
  return JSON.parse(JSON.stringify(obj));
}

function compressImage(file, maxDim, quality){
  return new Promise(function(resolve, reject){
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    var reader = new FileReader();
    reader.onload = function(e){
      var img = new Image();
      img.onload = function(){
        var w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob){
          var newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() });
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = function(){ reject(new Error('Image load failed')); };
      img.src = e.target.result;
    };
    reader.onerror = function(){ reject(new Error('File read failed')); };
    reader.readAsDataURL(file);
  });
}

/* ═══════════════ MIGRATION & INIT ═══════════════ */
async function migrateToIndexedDB(){
  if (localStorage.getItem(MIGRATED_AT_KEY)) return true;
  var raw = localStorage.getItem(DATA_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATED_AT_KEY, new Date().toISOString());
    return true;
  }
  var localData;
  try { localData = JSON.parse(raw); } catch(e) { return false; }
  var counts = {
    groups: (localData.groups || []).length,
    students: (localData.students || []).length,
    sessions: (localData.sessions || []).length,
    monthlyReports: (localData.monthlyReports || []).length,
    appointments: (localData.appointments || []).length
  };
  try { await idbSet('main', localData); } catch(e) { return false; }
  try {
    var verify = await idbGet('main');
    if (!verify) return false;
    var vc = {
      groups: (verify.groups || []).length,
      students: (verify.students || []).length,
      sessions: (verify.sessions || []).length,
      monthlyReports: (verify.monthlyReports || []).length,
      appointments: (verify.appointments || []).length
    };
    for (var k in counts) { if (counts[k] !== vc[k]) return false; }
  } catch(e) { return false; }
  try {
    localStorage.setItem(MIGRATED_BACKUP_KEY, raw);
    localStorage.removeItem(DATA_KEY);
  } catch(e) {}
  localStorage.setItem(MIGRATED_AT_KEY, new Date().toISOString());
  console.log('Migration succeeded');
  return true;
}

async function initDataLayer(){
  try { await idbOpen(); } catch(e) {
    showNotify('⚠️ تعذر فتح قاعدة البيانات — سنستخدم التخزين القديم');
    _idbReady = false;
    return;
  }
  var needsMigration = !localStorage.getItem(MIGRATED_AT_KEY);
  if (needsMigration) {
    var ok = await migrateToIndexedDB();
    if (!ok) {
      showNotify('⚠️ فشل الترحيل — التطبيق يعمل بالوضع القديم');
      _idbReady = false;
      return;
    }
    showNotify('✅ تمت الترقية بنجاح — بياناتك الآن في قاعدة بيانات أوسع');
  }
  _idbReady = true;
}

/* ═══════════════ DATA LOAD / SAVE / MIGRATE ═══════════════ */
async function loadData(){
  if (!_idbReady) {
    try {
      var raw = localStorage.getItem(DATA_KEY) || localStorage.getItem(MIGRATED_BACKUP_KEY);
      if (raw) data = JSON.parse(raw);
    } catch(e) { console.error('loadData fallback:', e); }
  } else {
    try {
      var saved = await idbGet('main');
      if (saved) {
        data = saved;
      }
    } catch(e) {
      console.error('loadData from IndexedDB:', e);
      try {
        var backup = localStorage.getItem(MIGRATED_BACKUP_KEY);
        if (backup) {
          data = JSON.parse(backup);
          showNotify('⚠️ تم استخدام النسخة الاحتياطية');
        }
      } catch(e2) { console.error('loadData backup fallback:', e2); }
    }
  }

  if(!data.groups) data.groups = [];
  if(!data.students) data.students = [];
  if(!data.sessions) data.sessions = [];
  if(!data.monthlyReports) data.monthlyReports = [];
  if(!data.appointments) data.appointments = [];
  if(!data.workSessions) data.workSessions = [];
  if(typeof data.activeTimer === 'undefined') data.activeTimer = null;
  if(!data.settings) data.settings = {theme:'dark', teacherName:'', teacherTimezone:'', designTheme:'teal'};
  if (!data.settings.designTheme) data.settings.designTheme = (data.settings.theme === 'light') ? 'mint' : 'teal';
  if(!data.settings.teacherTimezone) data.settings.teacherTimezone = '';
  if(typeof data.settings.notifEnabled !== 'boolean') data.settings.notifEnabled = true;
  if(!data.settings.notifMinutes) data.settings.notifMinutes = 15;
  if(typeof data.settings.notifSound !== 'boolean') data.settings.notifSound = true;
  if(typeof data.settings.notifVibrate !== 'boolean') data.settings.notifVibrate = true;
  if(typeof data.settings.notifSystem !== 'boolean') data.settings.notifSystem = false;
  if(!data.settings.notifSoundType) data.settings.notifSoundType = '1';
  if(typeof data.settings.notifRepeat !== 'boolean') data.settings.notifRepeat = false;
  if(!data.settings.notifRepeatInterval) data.settings.notifRepeatInterval = 30;
  if(!data.settings.notifVibratePattern) data.settings.notifVibratePattern = 'short';
  if(typeof data.settings.quietEnabled !== 'boolean') data.settings.quietEnabled = false;
  if(!data.settings.themeMode) data.settings.themeMode = 'manual';
  if(!data.settings.dayTheme) data.settings.dayTheme = 'mint';
  if(!data.settings.nightTheme) data.settings.nightTheme = 'teal';
  if(!data.settings.dayStart) data.settings.dayStart = '06:00';
  if(!data.settings.nightStart) data.settings.nightStart = '19:00';
  if(!data.settings.quietFrom) data.settings.quietFrom = '23:00';
  if(!data.settings.quietTo) data.settings.quietTo = '07:00';
  if(!Array.isArray(data.settings.workLocations)) data.settings.workLocations = [];
  data.groups.forEach(function(g){
    if(!g.constants) g.constants = [];
    if(!g.schedule) g.schedule = [];
    if(!g.timezone) g.timezone = '';
    if(typeof g.link === 'undefined') g.link = '';
    if(typeof g.location === 'undefined') g.location = '';
    if(!g.reportSettings) g.reportSettings = { customRowTypes: [], staticTexts: [] };
    if(!g.reportSettings.customRowTypes) g.reportSettings.customRowTypes = [];
    if(!g.reportSettings.staticTexts) g.reportSettings.staticTexts = [];
    g.reportSettings.staticTexts.forEach(function(t){ if(!t.subject) t.subject = 'quran'; });
  });
  data.students.forEach(function(s){
    if(!s.constants) s.constants = [];
    if(!s.staticTexts) s.staticTexts = [];
    if(typeof s.phone === 'undefined') s.phone = '';
    if(typeof s.country === 'undefined') s.country = '';
    if(typeof s.timezone === 'undefined') s.timezone = '';
    if(typeof s.guardianName === 'undefined') s.guardianName = '';
    if(typeof s.birthDate === 'undefined') s.birthDate = '';
    if(typeof s.currentLevel === 'undefined') s.currentLevel = '';
    s.staticTexts.forEach(function(t){ if(!t.subject) t.subject = 'quran'; });
  });
  migrateScheduleRulesCreatedAt();
}
/* ═══════════════ SAVE BACKEND ═══════════════ */
async function _doSave(){
  var cloned = deepClone(data);
  if (!_idbReady) {
    localStorage.setItem(DATA_KEY, JSON.stringify(cloned));
    return;
  }
  await idbSet('main', cloned);
}

function saveData(){
  _doSave().catch(function(err){
    console.error('saveData:', err);
    showNotify('⚠️ فشل الحفظ — تحقق من المساحة');
  });
}

async function saveDataAsync(){
  try {
    await _doSave();
    return true;
  } catch(err) {
    console.error('saveDataAsync:', err);
    showNotify('⚠️ فشل الحفظ — تحقق من المساحة');
    return false;
  }
}
function migrateScheduleRulesCreatedAt(){
  var today = toDateISO(new Date());
  var changed = false;
  (data.groups || []).forEach(function(g){
    if (!g.schedule) return;
    g.schedule.forEach(function(rule){
      if (!rule.createdAt) {
        var earliest = null;
        (data.sessions || []).forEach(function(s){
          if (s.groupId === g.id && s.date) { if (!earliest || s.date < earliest) earliest = s.date; }
        });
        rule.createdAt = earliest || today;
        changed = true;
      }
    });
  });
  if (changed) saveData();
}
function migrateOldData(){
  if(localStorage.getItem(DATA_KEY)) return;
  try {
    var oldSessions = JSON.parse(localStorage.getItem('quran_sessions_v3') || '[]');
    var oldSettings = {};
    try { oldSettings = JSON.parse(localStorage.getItem('quran_settings_v1') || '{}'); } catch(e){}
    var newData = {
      groups: [], students: [], sessions: [], monthlyReports: [], appointments: [], workSessions: [],
      activeTimer: null,
      settings: {
        theme: oldSettings.theme || 'dark', teacherName: oldSettings.teacherName || '',
        teacherTimezone: '', designTheme: 'teal',
        notifEnabled: true, notifMinutes: 15, notifSound: true, notifVibrate: true, notifSystem: false,
        workLocations: []
      }
    };
    for(var i=0; i<oldSessions.length; i++){
      var s = oldSessions[i], sd = s.data || {};
      var gn = normalize(sd.group) || 'بدون اسم';
      var group = newData.groups.find(function(g){ return normalize(g.name) === gn; });
      if(!group){
        group = {id: genId(), name: gn, teacherName: sd.teacher || '', constants: [], schedule: [], timezone: '', link: '', location: '', createdAt: new Date().toISOString()};
        newData.groups.push(group);
      }
      var ids = [];
      var sts = sd.students || [];
      for(var j=0; j<sts.length; j++){
        var sn = normalize(sts[j].name);
        if(!sn) continue;
        var st = newData.students.find(function(x){ return x.groupId === group.id && normalize(x.name) === sn; });
        if(!st){ st = {id: genId(), name: sts[j].name.trim(), groupId: group.id, constants: [], notes:''}; newData.students.push(st); }
        ids.push(st.id);
      }
      newData.sessions.push({
        id: s.id || genId(), groupId: group.id, studentIds: ids,
        date: sd.date || '', lessonNumber: sd.lesson || '', duration: sd.duration || '',
        subject: sd.subject || 'quran', data: sd, report: s.report || '',
        savedAt: s.savedAt || new Date().toISOString()
      });
    }
    localStorage.setItem(DATA_KEY, JSON.stringify(newData));
  } catch(e){ console.error('migrate', e); }
}

/* ═══════════════ TEACHER SETTINGS ═══════════════ */
function saveTeacherDefault(){
  var v = document.getElementById('settingsTeacher').value.trim();
  data.settings.teacherName = v;
  saveData();
  var ti = document.getElementById('teacherName');
  if(ti && !ti.value.trim()){ ti.value = v; saveDraft(); }
  showNotify('✅ تم الحفظ');
}
function saveTeacherTimezone(){
  var v = document.getElementById('settingsTimezone').value.trim();
  data.settings.teacherTimezone = v;
  saveData();
  showNotify('✅ تم الحفظ');
  if(document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
}
function detectTimezone(){
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.getElementById('settingsTimezone').value = tz;
    showNotify('تم اكتشاف: ' + tz);
  } catch(e){ showNotify('فشل الاكتشاف'); }
}

/* ═══════════════ SUBJECTS ═══════════════ */
function subjectsFromString(s){
  if (s === 'arabic') return { quran: false, arabic: true, islamic: false };
  if (s === 'islamic') return { quran: false, arabic: false, islamic: true };
  if (s === 'both') return { quran: true, arabic: true, islamic: false };
  if (s === 'all') return { quran: true, arabic: true, islamic: true };
  return { quran: true, arabic: false, islamic: false };
}
function getSubjectString(){
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
function toggleSubject(sub){
  currentSubjects[sub] = !currentSubjects[sub];
  if (!currentSubjects.quran && !currentSubjects.arabic && !currentSubjects.islamic){
    currentSubjects[sub] = true;
    showNotify('يجب تفعيل مادة واحدة على الأقل');
    return;
  }
  updateSubjectButtons();
  document.querySelectorAll('.student-card').forEach(updateCardVisibility);
  scheduleSaveDraft();
}
function updateSubjectButtons(){
  document.querySelectorAll('.subject-btn').forEach(function(b){ b.classList.toggle('active', !!currentSubjects[b.dataset.subject]); });
}
function updateCardVisibility(card){
  if(!card) return;
  card.querySelectorAll('.quran-block').forEach(function(b){ b.style.display = currentSubjects.quran ? 'block' : 'none'; });
  card.querySelectorAll('.arabic-block').forEach(function(b){ b.style.display = currentSubjects.arabic ? 'block' : 'none'; });
  card.querySelectorAll('.islamic-block').forEach(function(b){ b.style.display = currentSubjects.islamic ? 'block' : 'none'; });
}

/* ═══════════════ CONSTANTS ═══════════════ */
function getConstant(ownerType, ownerId, key, fallback){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner || !owner.constants) return fallback || '';
  for(var i=0; i<owner.constants.length; i++){
    if(normalize(owner.constants[i].key) === normalize(key)) return owner.constants[i].value;
  }
  return fallback || '';
}
function renderConstants(ownerType, ownerId){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner) return '';
  if(!owner.constants) owner.constants = [];
  var html = '<div class="constants-list">';
  owner.constants.forEach(function(c, idx){
    html += '<div class="const-row">'
      + '<input type="text" class="const-key" value="' + escapeAttr(c.key) + '" placeholder="المفتاح" onchange="updateConstant(\'' + ownerType + '\',\'' + ownerId + '\',' + idx + ',\'key\',this.value)">'
      + '<input type="text" class="const-val" value="' + escapeAttr(c.value) + '" placeholder="القيمة" onchange="updateConstant(\'' + ownerType + '\',\'' + ownerId + '\',' + idx + ',\'value\',this.value)">'
      + '<button class="remove-btn" onclick="deleteConstant(\'' + ownerType + '\',\'' + ownerId + '\',' + idx + ')" title="حذف">' + svgIcon('x', ICON_SIZES.sm) + '</button>'
      + '</div>';
  });
  return html + '</div>';
}
function addConstant(ownerType, ownerId){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner) return;
  if(!owner.constants) owner.constants = [];
  owner.constants.push({key:'', value:''});
  saveData();
  refreshConstantsUI(ownerType, ownerId);
}
function deleteConstant(ownerType, ownerId, idx){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner || !owner.constants) return;
  owner.constants.splice(idx, 1);
  saveData();
  refreshConstantsUI(ownerType, ownerId);
}
function updateConstant(ownerType, ownerId, idx, field, val){
  var owner = ownerType === 'group' ? data.groups.find(function(g){ return g.id === ownerId; }) : data.students.find(function(s){ return s.id === ownerId; });
  if(!owner || !owner.constants || !owner.constants[idx]) return;
  owner.constants[idx][field] = val;
  saveData();
}
function refreshConstantsUI(ownerType, ownerId){
  var c = document.getElementById((ownerType === 'group' ? 'group' : 'student') + 'ConstantsContainer');
  if(c){ c.innerHTML = renderConstants(ownerType, ownerId); hydrateIcons(c); }
}

/* ═══════════════ TABS ═══════════════ */
function switchTab(name){
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn[data-tab]').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === name); });
  var panel = document.getElementById('tab-' + name);
  if(panel) panel.classList.add('active');
  window.scrollTo(0, 0);
  if(name === 'home'){ renderHome(); }
  if(name === 'calendar'){ renderCalendar(); }
  if(name === 'library'){ backToGroups(); backToStudents(); renderGroupsList(); renderStudentsList(); }
  if(name === 'settings'){
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
function switchLibSub(sub){
  document.querySelectorAll('.lib-subtab').forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === sub); });
  document.getElementById('lib-groups-view').style.display = (sub === 'groups') ? 'block' : 'none';
  document.getElementById('lib-students-view').style.display = (sub === 'students') ? 'block' : 'none';
  document.getElementById('lib-search-view').style.display = (sub === 'search') ? 'block' : 'none';
  if (sub === 'search') setTimeout(function(){ var inp = document.getElementById('searchInput'); if (inp) inp.focus(); }, 50);
}
function switchSettingsSub(sub){
  document.querySelectorAll('.settings-sub-tab').forEach(function(b){
    b.classList.toggle('active', b.dataset.settingsSub === sub);
  });
  document.querySelectorAll('.settings-sub-panel').forEach(function(p){
    p.classList.toggle('active', p.dataset.settingsPanel === sub);
  });
  /* عند فتح "البيانات" حدّث معلومات التخزين */
  if (sub === 'data' && typeof updateStorageInfo === 'function') {
    setTimeout(updateStorageInfo, 100);
  }
}

function switchLessonSub(sub){
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
    MONTH_NAMES.forEach(function(m,i){ ms.innerHTML += '<option value="' + (i+1) + '">' + m + '</option>'; });
    var now = new Date();
    ms.value = now.getMonth()+1;
    document.getElementById('monthlyYearInput').value = now.getFullYear();
    document.getElementById('monthlyTabDraftContainer').style.display = 'none';
  }
}

/* ═══════════════ MODALS & SHEETS ═══════════════ */
function openGenericModal(title, bodyHTML, footerHTML){
  document.getElementById('genericModalTitle').innerHTML = title;
  document.getElementById('genericModalBody').innerHTML = bodyHTML;
  document.getElementById('genericModalFooter').innerHTML = footerHTML;
  document.getElementById('genericModal').classList.add('active');
  hydrateIcons(document.getElementById('genericModal'));
}
function closeGenericModal(){
  document.getElementById('genericModal').classList.remove('active');
  var urlsToRevoke = _sessionViewUrls;
  _sessionViewUrls = [];
  setTimeout(function(){
    urlsToRevoke.forEach(function(u){ try { URL.revokeObjectURL(u); } catch(e){} });
  }, 5000);
}
document.addEventListener('click', function(e){ if(e.target && e.target.id === 'genericModal') closeGenericModal(); });
function openReportSheet(){
  var so = document.getElementById('sheetOutput');
  var out = document.getElementById('output');
  if(so && out) so.value = out.value;
  document.getElementById('reportSheet').classList.add('open');
  document.getElementById('sheetOverlay').classList.add('open');
}
function closeReportSheet(){
  document.getElementById('reportSheet').classList.remove('open');
  document.getElementById('sheetOverlay').classList.remove('open');
}

/* ═══════════════ STUDENTS (lesson form) ═══════════════ */
function changeStudentCount(delta){ var c = currentStudentCount + delta; if(c < 1) c = 1; setStudentCount(c); }
function setStudentCount(count){ currentStudentCount = count; var inp = document.getElementById('studentCountInput'); if(inp) inp.value = count; renderStudents(); }
function renderStudents(){
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
function buildStudentCardHTML(i){
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
    + '<div class="row-label">' + svgIcon('book-open', ICON_SIZES.xs) + ' دراسة اليوم</div>'
    + '<div class="quran-block study-quran-block">'
    + '<div class="rows-container study-rows-container">' + renderRow('study','تسميع جديد') + renderRow('study','تسميع مراجعة') + renderRow('study','قراءة') + '</div>'
    + '<button class="add-row-btn" onclick="addDynamicRow(this,\'study\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="arabic-block study-arabic-block" style="margin-top:10px">'
    + '<div class="row-label arabic-label" style="margin-top:10px">' + svgIcon('book', ICON_SIZES.xs) + ' اللغة العربية</div>'
    + '<div class="arabic-rows-container study-arabic-rows-container">' + renderArabicRow('study') + '</div>'
    + '<button class="add-row-btn" onclick="addArabicRow(this,\'study\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="islamic-block study-islamic-block" style="margin-top:10px">'
    + '<div class="row-label islamic-label" style="margin-top:10px">' + svgIcon('bookmark', ICON_SIZES.xs) + ' العلوم الشرعية</div>'
    + '<div class="arabic-rows-container study-islamic-rows-container">' + renderArabicRow('study','مثال: معنى الإسلام...') + '</div>'
    + '<button class="add-row-btn" onclick="addIslamicRow(this,\'study\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="row-label homework-label" style="margin-top:14px">' + svgIcon('bookmark', ICON_SIZES.xs) + ' المطلوب (الواجب)</div>'
    + '<div class="quran-block homework-quran-block">'
    + '<div class="rows-container homework-rows-container">' + renderRow('homework','حفظ جديد') + renderRow('homework','مراجعة') + '</div>'
    + '<button class="add-row-btn" onclick="addDynamicRow(this,\'homework\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="arabic-block homework-arabic-block" style="margin-top:10px">'
    + '<div class="row-label arabic-label" style="margin-top:10px">' + svgIcon('book', ICON_SIZES.xs) + ' عربية</div>'
    + '<div class="arabic-rows-container homework-arabic-rows-container">' + renderArabicRow('homework') + '</div>'
    + '<button class="add-row-btn" onclick="addArabicRow(this,\'homework\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة سطر</button>'
    + '</div>'
    + '<div class="islamic-block homework-islamic-block" style="margin-top:10px">'
    + '<div class="row-label islamic-label" style="margin-top:10px">' + svgIcon('bookmark', ICON_SIZES.xs) + ' شرعية</div>'
    + '<div class="arabic-rows-container homework-islamic-rows-container">' + renderArabicRow('homework','مثال: مذاكرة الدرس') + '</div>'
    + '<button class="add-row-btn" onclick="addIslamicRow(this,\'homework\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة سطر</button>'
    + '</div>'
    + '<div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
    + '<select class="student-level student-level-select"><option>ممتاز</option><option>جيد جدًّا</option><option>جيد</option><option>مقبول</option><option>ضعيف</option></select>'
    + '<input type="text" class="student-notes" placeholder="ملاحظات (اختياري)" style="flex:1;min-width:150px;font-size:.82rem;padding:7px 10px">'
    + '</div>'
    + '</div>';
}
function updateAbsenceClass(card){
  if(!card) return;
  var sel = card.querySelector('.student-attendance');
  if(!sel) return;
  card.classList.toggle('absent', sel.value !== 'present');
}

/* ═══════════════ ROW ITEMS ═══════════════ */
function renderRow(sectionType, defaultLabel, form){
  form = form || 'surah-ayat';
  var isStudy = sectionType === 'study';
  var options = buildTypeOptions(isStudy, defaultLabel);
  var removeBtn = '<button class="remove-sm" onclick="removeRow(this)" title="حذف">' + svgIcon('x', ICON_SIZES.sm) + '</button>';
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
function renderArabicRow(sectionType, placeholder){
  placeholder = placeholder || 'مثال: كان وأخواتها...';
  return '<div class="arabic-row">'
    + '<input type="text" class="arabic-input" placeholder="' + escapeAttr(placeholder) + '">'
    + '<button class="remove-sm" onclick="removeRow(this)" title="حذف">' + svgIcon('x', ICON_SIZES.sm) + '</button>'
    + '</div>';
}
function addArabicRow(btn, sectionType){ var c = btn.previousElementSibling; if(!c) return; var t = document.createElement('div'); t.innerHTML = renderArabicRow(sectionType); c.appendChild(t.firstElementChild); scheduleSaveDraft(); }
function addIslamicRow(btn, sectionType){ var c = btn.previousElementSibling; if(!c) return; var t = document.createElement('div'); var ph = sectionType === 'study' ? 'مثال: معنى الإسلام...' : 'مثال: مذاكرة الدرس'; t.innerHTML = renderArabicRow(sectionType, ph); c.appendChild(t.firstElementChild); scheduleSaveDraft(); }
function addDynamicRow(btn, type){ var c = btn.previousElementSibling; if(!c) return; var t = document.createElement('div'); t.innerHTML = renderRow(type, type==='study'?'تسميع جديد':'حفظ جديد'); c.appendChild(t.firstElementChild); scheduleSaveDraft(); }
function toggleRangeType(sel){
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
function removeRow(btn){ var r = btn.closest('.row-item, .arabic-row'); if(r) r.remove(); scheduleSaveDraft(); }
function handleSurahSearch(input){
  var dd = input.nextElementSibling;
  if(!dd) return;
  var v = input.value;
  dd.innerHTML = '';
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
function validateAya(input){
  var row = input.closest('.row-item');
  if(!row) return;
  var s = row.querySelector('.main-surah').value;
  var max = quranData[s] || 999;
  if(input.value !== ''){
    var v = parseInt(input.value);
    if(isNaN(v) || v < 1) input.value = 1;
    else if(v > max) input.value = max;
    else input.value = v;
  }
}
function setupGlobalClick(){
  document.onclick = function(e){
    if(!e.target.classList || !e.target.classList.contains('surah-input')){
      document.querySelectorAll('.surah-dropdown').forEach(function(d){ d.style.display='none'; });
    }
  };
}
function setupAutoSave(){
  var grid = document.getElementById('tab-lesson');
  if(!grid) return;
  grid.addEventListener('input', scheduleSaveDraft);
  grid.addEventListener('change', scheduleSaveDraft);
}
function scheduleSaveDraft(){ clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 500); }
function saveDraft(){
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(collectFormState()));
    _draftUnsaved = true;
  } catch(e){}
}

/* ═══════════════ COLLECT / RESTORE FORM STATE ═══════════════ */
function collectFormState(){
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
function readRow(row){
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
function restoreDraft(){
  try {
    var raw = localStorage.getItem(DRAFT_KEY);
    if(!raw) return;
    applyState(JSON.parse(raw));
    _draftUnsaved = false;
  } catch(e){}
}
function applyState(state){
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
  updateSubjectButtons();
  currentHiddenStaticIds = state.hiddenStaticIds || [];
  var grp = data.groups.find(function(g){ return normalize(g.name) === normalize(safe(state.group)); });
  currentCustomRowTypes = (grp && grp.reportSettings && grp.reportSettings.customRowTypes) || [];
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
function fillRows(container, rows, isStudy){
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
function fillArabicRows(container, rows, sectionType, placeholder){
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
function openGroupPicker(){
  if(!data.groups.length){
    openGenericModal('اختيار مجموعة', '<p style="text-align:center;padding:30px;color:var(--text-muted)">لا توجد مجموعات محفوظة بعد.</p>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
    return;
  }
  var body = '<div style="display:flex;flex-direction:column;gap:8px">';
  data.groups.forEach(function(g){
    var cnt = data.students.filter(function(s){ return s.groupId === g.id; }).length;
    body += '<button class="btn btn-secondary" style="justify-content:flex-start;text-align:right;padding:14px" onclick="pickGroup(\'' + g.id + '\')"><div style="flex:1"><div style="font-weight:700;color:var(--text-primary)">' + escapeHtml(g.name) + '</div><div style="font-size:.8rem;color:var(--text-muted)">' + cnt + ' طالب</div></div><span style="color:var(--accent-green)">' + svgIcon('check', ICON_SIZES.sm) + '</span></button>';
  });
  body += '</div>';
  openGenericModal('اختر مجموعة', body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>');
}
function pickGroup(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if(!g) return;
  var sts = data.students.filter(function(s){ return s.groupId === groupId; });
  document.getElementById('groupName').value = g.name;
  if(g.teacherName) document.getElementById('teacherName').value = g.teacherName;
  currentCustomRowTypes = (g.reportSettings && g.reportSettings.customRowTypes) || [];
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
      currentAttachments = [];
      if (typeof renderAttachmentsUI === 'function') renderAttachmentsUI();
    }
  }
  closeGenericModal();
  showNotify('تم تحميل المجموعة');
}

/* ═══════════════ SAVE SESSION ═══════════════ */
async function renderAttachmentsUI(){
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
      currentAttachments = currentAttachments.filter(function(a){ return a.id !== att.id; });
      renderAttachmentsUI();
    };
    div.appendChild(rm);
    list.appendChild(div);
  });
  hydrateIcons(list);
}
async function handleAttachmentUpload(event) {
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

/* تغذية حفظ بصرية: زر → ✓ تم الحفظ (لثانيتين) */
function showSaveSuccess(btn){
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

async function saveSession(btn){
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

/* ═══════════════ ROW → TEXT (Reports — emojis kept for WhatsApp/Word) ═══════════════ */
function getRowText(row, customType){
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
  var max = quranData[surah];
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
function durationToWords(durInput){
  var d = parseInt(durInput);
  if(!d || d <= 0) return 'غير محددة';
  var h = Math.floor(d/60), m = d%60;
  var parts = [];
  if(h>0){ if(h===1) parts.push('ساعة'); else if(h===2) parts.push('ساعتان'); else if(h>=3 && h<=10) parts.push(h+' ساعات'); else parts.push(h+' ساعة'); }
  if(m>0) parts.push(m+' دقيقة');
  return parts.join(' و ');
}
function cleanGroupName(name){
  if(!name) return '';
  return name.replace(/\s*[-–—]\s*\d+\s*$/, '').replace(/\s*\(\d+\)\s*$/, '').trim();
}
function getSubjectLabel(){
  var a = [];
  if (currentSubjects.quran) a.push('القرآن الكريم');
  if (currentSubjects.arabic) a.push('اللغة العربية');
  if (currentSubjects.islamic) a.push('العلوم الشرعية');
  return a.join(' و ');
}
function getActiveSuffixes(section, type, grpObj, studentObj){
  var r = [];
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
function getActiveFullTexts(section, subject, grpObj, studentObj){
  var r = [];
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
function buildQuranSection(card, sectionType, grpObj, studentObj){
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
function buildFreeTextSection(card, sectionType, subjectKey, title, grpObj, studentObj){
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
function generateReportText(){
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
  for(var i=0; i<cards.length; i++){
    var card = cards[i];
    var name = card.querySelector('.student-name').value || '(بدون اسم)';
    var att = card.querySelector('.student-attendance').value;
    if(att !== 'present'){ report += '--- ' + name + ' ---\n\n' + ATT_LABELS[att] + '\n\n'; continue; }
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
function generateReport(){
  var text = generateReportText();
  document.getElementById('output').value = text;
  var so = document.getElementById('sheetOutput');
  if(so) so.value = text;
  showNotify('تم إنشاء التقرير');
  if(window.innerWidth < 1024) openReportSheet();
}

/* ═══════════════ SHARE / COPY / WORD ═══════════════ */
function shareReportWhatsApp(){
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
    body += '<button class="btn btn-secondary" style="width:100%;margin-bottom:6px;justify-content:flex-start;text-align:right;padding:12px" onclick="doShareCurrentReport(\'' + escapeAttr(cleanPhone) + '\')"><div><div style="font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('smartphone', ICON_SIZES.sm) + escapeHtml(s.name) + '</div><div style="font-size:.8rem;color:var(--text-muted)">' + escapeHtml(s.phone) + '</div></div></button>';
  });
  openGenericModal('إرسال واتساب', body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>');
}
function doShareCurrentReport(phone){
  closeGenericModal();
  var out = document.getElementById('output');
  var txt = (out && out.value) ? out.value : document.getElementById('sheetOutput').value;
  doShare(txt, phone);
}
function doShare(text, phone){
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
function copyReport(){
  var out = document.getElementById('output');
  var txt = (out && out.value) ? out.value : document.getElementById('sheetOutput').value;
  if(!txt){ showNotify('أنشئ التقرير أولاً'); return; }
  copyText(txt);
}
function copyText(txt){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){ showNotify('تم النسخ'); }).catch(function(){ fallbackCopy(txt); });
  } else fallbackCopy(txt);
}
function fallbackCopy(text){
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showNotify('تم النسخ'); } catch(e){ showNotify('فشل النسخ'); }
  document.body.removeChild(ta);
}
function exportToWordFromState(state, report){
  var group = cleanGroupName(state.group || 'تقرير');
  var teacher = state.teacher || '';
  var date = state.date ? state.date.split('-').reverse().join('/') : '';
  var dur = '';
  var di = parseInt(state.duration);
  if(di>0){ var h=Math.floor(di/60), m=di%60; if(h) dur+=h+' س '; if(m) dur+=m+' د'; }
  var subs = state.subjects || subjectsFromString(state.subject);
  var activeSubs = [];
  if (subs.quran) activeSubs.push('القرآن الكريم');
  if (subs.arabic) activeSubs.push('اللغة العربية');
  if (subs.islamic) activeSubs.push('العلوم الشرعية');
  var subj = activeSubs.join(' و ');
  var grpObj = data.groups.find(function(g){ return normalize(g.name) === normalize((state.group || '').trim()); });
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:10px}th{background:#f2f2f2}</style></head><body><h2>تقرير الحصة</h2><p><b>الجروب:</b> '+escapeHtml(group)+'</p><p><b>التاريخ:</b> '+escapeHtml(date)+'</p><p><b>الحصة:</b> '+escapeHtml(state.lesson||'')+'</p><p><b>المدة:</b> '+escapeHtml(dur)+'</p><p><b>المادة:</b> '+escapeHtml(subj)+'</p><p><b>المعلم:</b> '+escapeHtml(teacher)+'</p><table><thead><tr><th>الطالب</th><th>الحضور</th><th>دراسة اليوم</th><th>المطلوب</th><th>المستوى</th></tr></thead><tbody>';
  (state.students||[]).forEach(function(st){
    var sl = [], hl = [];
    var studentObj = grpObj ? data.students.find(function(x){ return x.groupId === grpObj.id && normalize(x.name) === normalize(st.name || ''); }) : null;
    function renderQuranRow(r, isStudy){
      var form = r.form || 'surah-ayat';
      var tmp = document.createElement('div');
      tmp.innerHTML = renderRow(isStudy?'study':'homework', r.type, form);
      var row = tmp.firstElementChild;
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
    html += '<tr><td><b>'+escapeHtml(st.name||'—')+'</b></td><td>'+ATT_LABELS[st.attendance||'present']+'</td><td>'+(sl.join('<br>')||'—')+'</td><td>'+(hl.join('<br>')||'—')+'</td><td>'+levelDisplay+'</td></tr>';
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
function exportToWord(){
  var state = collectFormState();
  exportToWordFromState(state, document.getElementById('output').value);
}

/* ═══════════════ PENDING COUNT ═══════════════ */
function getPendingCount(days){
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

/* ═══════════════ HOME ═══════════════ */
function renderHome(){
  var now = new Date();
  var todayDisplay = now.getDate() + '/' + (now.getMonth()+1) + '/' + now.getFullYear();
  var dayName = DAY_NAMES[now.getDay()];
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
        + '<div class="now-badge">' + svgIcon('clock', ICON_SIZES.xs) + ' الآن</div>'
        + '<div class="now-title">' + escapeHtml(activeOcc.occ.groupName) + '</div>'
        + '<div class="now-time">' + svgIcon('clock', ICON_SIZES.xs) + ' ' + escapeHtml(activeOcc.occ.time) + ' — ' + escapeHtml(timeText) + '</div>'
        + '<div class="now-actions">'
        + '<button class="btn btn-white" onclick="enterLessonAndOpenLink(\'' + activeOcc.occ.groupId + '\',\'' + activeOcc.occ.dateISO + '\',\'' + activeOcc.occ.time + '\')">' + svgIcon('play', ICON_SIZES.sm) + ' دخول الحصة</button>'
        + '<button class="btn btn-ghost-white" onclick="showOccurrenceDetails(\'' + activeOcc.occ.dateISO + '\',\'' + activeOcc.occ.groupId + '\',\'' + activeOcc.occ.time + '\')">' + svgIcon('more-horizontal', ICON_SIZES.sm) + '</button>'
        + '</div></div>';
    } else { nowCard.style.display = 'none'; nowCard.innerHTML = ''; }
  }

  var pendingCount = getPendingCount(14);
  var pendingCard = document.getElementById('homePendingCard');
  if (pendingCard) {
    if (pendingCount > 0) {
      pendingCard.style.display = 'block';
      pendingCard.innerHTML = '<div style="background:var(--warning-bg);border:1px solid var(--accent-amber);border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">'
        + '<div><div style="font-weight:700;color:var(--accent-amber);font-size:.92rem;display:flex;align-items:center;gap:8px">' + svgIcon('alert-triangle', ICON_SIZES.md) + '<span>لديك ' + pendingCount + ' حصة بدون تقرير</span></div>'
        + '<div style="font-size:.78rem;color:var(--text-muted);margin-top:4px;padding-right:24px">آخر ١٤ يومًا — سجّلها من التقويم</div></div>'
        + '<button onclick="switchTab(\'calendar\')" style="background:var(--accent-amber);color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;font-size:.82rem;display:inline-flex;align-items:center;gap:6px">' + svgIcon('calendar', ICON_SIZES.sm) + ' عرض</button>'
        + '</div>';
    } else { pendingCard.style.display = 'none'; pendingCard.innerHTML = ''; }
  }

  var todayLessons = getOccurrencesForDate(now);
  var countEl = document.getElementById('homeTodayCount');
  if (countEl) countEl.textContent = todayLessons.length + ' حصة';
  var todayHtml = '';
  if (!todayLessons.length) {
    todayHtml = '<div class="home-empty-elegant">'
      + '<div class="he-icon">' + svgIcon('calendar', ICON_SIZES.xl) + '</div>'
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
        + '<span class="lesson-status ' + meta.cls + '">' + svgIcon(meta.icon, ICON_SIZES.xs) + ' ' + meta.label + '</span>'
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
    '<button class="quick-btn" onclick="switchTab(\'lesson\')">' + svgIcon('plus-circle', ICON_SIZES.xl) + '<span>حصة جديدة</span></button>'
    + '<button class="quick-btn" onclick="switchTab(\'calendar\')">' + svgIcon('calendar', ICON_SIZES.xl) + '<span>التقويم</span></button>'
    + '<button class="quick-btn" onclick="openInAppBrowser()">' + svgIcon('globe', ICON_SIZES.xl) + '<span>المتصفح</span></button>'
    + '<button class="quick-btn" onclick="switchTab(\'library\')">' + svgIcon('users', ICON_SIZES.xl) + '<span>المكتبة</span></button>';
  var actEl = document.getElementById('homeActions');
  if (actEl) actEl.innerHTML = actionsHtml;

  /* ═══ حصص الغد ═══ */
  var tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0,0,0,0);
  var tomorrowOccs = getOccurrencesForDate(tomorrow);

  var tomTitleEl = document.getElementById('homeTomorrowTitle');
  if (tomTitleEl) {
    tomTitleEl.textContent = 'حصص الغد — ' + DAY_NAMES[tomorrow.getDay()] + ' ' + tomorrow.getDate() + '/' + (tomorrow.getMonth()+1);
  }
  var tomCountEl = document.getElementById('homeTomorrowCount');
  if (tomCountEl) {
    tomCountEl.textContent = tomorrowOccs.length + ' حصة';
  }

  var tomorrowHtml = '';
  if (!tomorrowOccs.length) {
    tomorrowHtml = '<div class="home-empty-elegant">'
      + '<div class="he-icon">' + svgIcon('calendar', ICON_SIZES.xl) + '</div>'
      + '<div class="he-title">لا توجد حصص غدًا</div>'
      + '<div class="he-sub">يوم هادئ — فرصة للاستعداد</div>'
      + '</div>';
  } else {
    tomorrowOccs.forEach(function(occ){
      var g = data.groups.find(function(x){ return x.id === occ.groupId; });
      var subjLabel = (g && g.subject) ? g.subject : 'القرآن';
      var meta = statusMeta[occ.status] || statusMeta.upcoming;
      tomorrowHtml += '<div class="lesson-item" onclick="showOccurrenceDetails(\'' + occ.dateISO + '\',\'' + occ.groupId + '\',\'' + occ.time + '\')">'
        + '<div class="lesson-time">' + escapeHtml(occ.time) + '</div>'
        + '<div class="lesson-body"><div class="lesson-name">' + escapeHtml(occ.groupName) + '</div><div class="lesson-meta">' + escapeHtml(subjLabel) + '</div></div>'
        + '<span class="lesson-status ' + meta.cls + '">' + svgIcon(meta.icon, ICON_SIZES.xs) + ' ' + meta.label + '</span>'
        + '</div>';
    });
  }
  var tomEl = document.getElementById('homeTomorrowLessons');
  if (tomEl) tomEl.innerHTML = tomorrowHtml;
  updatePendingBadge();
  hydrateIcons(document.getElementById('tab-home'));
}

/* ═══════════════ LIBRARY — GROUPS ═══════════════ */
function backToGroups(){ currentViewGroupId = null; currentViewStudentId = null; studentBackTarget = null; var gl = document.getElementById('groupsList'); if(gl) gl.style.display = ''; var gd = document.getElementById('groupDetail'); if(gd) gd.style.display = 'none'; }
function backToStudents(){ currentViewStudentId = null; studentBackTarget = null; var sl = document.getElementById('studentsList'); if(sl) sl.style.display = ''; var sd = document.getElementById('studentDetail'); if(sd) sd.style.display = 'none'; }
function backFromStudentDetail(){ if(studentBackTarget){ var gid = studentBackTarget; studentBackTarget = null; switchLibSub('groups'); openGroupDetail(gid); } else backToStudents(); }

function renderGroupsList(){
  var list = document.getElementById('groupsList'); if(!list) return;
  var searchEl = document.getElementById('groupSearch');
  var q = searchEl ? normalize(searchEl.value) : '';
  list.innerHTML = '';
  if(!data.groups.length){ list.innerHTML = '<div class="home-empty-elegant">'
  + '<div class="he-icon">' + svgIcon('folder-open', ICON_SIZES.xl) + '</div>'
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
    row.innerHTML = '<div class="lib-row-icon">' + svgIcon('folder-open', ICON_SIZES.xl) + '</div>'
      + '<div class="lib-row-body"><div class="lib-row-name">' + escapeHtml(g.name) + '</div>'
      + '<div class="lib-row-meta"><span>' + svgIcon('user', ICON_SIZES.xs) + ' ' + students.length + ' طالب</span><span>' + svgIcon('calendar', ICON_SIZES.xs) + ' ' + sessions.length + ' حصة</span>' + (lastDate ? '<span>' + svgIcon('clock', ICON_SIZES.xs) + ' آخر: ' + escapeHtml(lastDate) + '</span>' : '') + '</div></div>'
      + '<div class="lib-row-arrow">' + svgIcon('chevron-left', ICON_SIZES.md) + '</div>';
    list.appendChild(row);
  });
}
function addGroupPrompt(){
  openGenericModal('مجموعة جديدة', '<div class="form-field"><label>اسم المجموعة</label><input type="text" id="newGroupName" placeholder="مثال: أسرة النذير - 4438"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="createGroup()">إنشاء</button>');
  setTimeout(function(){ var i = document.getElementById('newGroupName'); if(i) i.focus(); }, 50);
}
function createGroup(){
  var v = document.getElementById('newGroupName').value.trim();
  if(!v){ showNotify('أدخل اسمًا'); return; }
  if(data.groups.find(function(g){ return normalize(g.name) === normalize(v); })){ showNotify('الاسم موجود'); return; }
  data.groups.push({id: genId(), name: v, teacherName: data.settings.teacherName || '', constants: [], schedule: [], timezone: '', link: '', location: '', createdAt: new Date().toISOString()});
  saveData(); closeGenericModal(); renderGroupsList();
  showNotify('تم إنشاء المجموعة');
}
function openGroupDetail(id){
  var g = data.groups.find(function(x){ return x.id === id; }); if(!g) return;
  currentViewGroupId = id; currentViewStudentId = null;
  var students = data.students.filter(function(s){ return s.groupId === g.id; });
  var sessions = data.sessions.filter(function(s){ return s.groupId === g.id; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var detail = document.getElementById('groupDetail');
  document.getElementById('groupsList').style.display = 'none';
  detail.style.display = 'block';
  var chips = students.length ? students.map(function(s){ return '<span class="student-chip" onclick="openStudentDetail(\''+s.id+'\',\''+g.id+'\')">' + svgIcon('user', ICON_SIZES.xs) + ' ' + escapeHtml(s.name) + '</span>'; }).join('') : '<div style="color:var(--text-muted);font-size:.9rem">لا يوجد طلاب بعد</div>';
  var tree = buildSessionsTree(sessions);
  var linkMeta = g.link ? '<span>' + svgIcon('link', ICON_SIZES.xs) + ' <a href="'+escapeAttr(normalizeUrl(g.link))+'" target="_blank" rel="noopener">دخول</a></span>' : '';
  var locMeta = g.location ? '<span>' + svgIcon('building-2', ICON_SIZES.xs) + ' ' + escapeHtml(g.location) + '</span>' : '';
  detail.innerHTML = '<div class="detail-header"><button class="btn btn-secondary btn-sm" onclick="backToGroups()">' + svgIcon('arrow-right', ICON_SIZES.sm) + ' رجوع</button><h2>' + svgIcon('folder-open', ICON_SIZES.lg) + ' ' + escapeHtml(g.name) + '</h2><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editGroup(\''+g.id+'\')">' + svgIcon('edit-3', ICON_SIZES.xs) + ' تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteGroup(\''+g.id+'\')">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button></div></div>'
    + '<div class="detail-meta"><span>' + svgIcon('user', ICON_SIZES.xs) + ' ' + students.length + ' طالب</span><span>' + svgIcon('calendar', ICON_SIZES.xs) + ' ' + sessions.length + ' حصة</span>' + (g.teacherName ? '<span>' + svgIcon('graduation-cap', ICON_SIZES.xs) + ' ' + escapeHtml(g.teacherName) + '</span>' : '') + locMeta + linkMeta + '</div>'
    + '<div style="margin-bottom:20px"><button class="btn btn-primary" style="width:auto;margin:0" onclick="newSessionForGroup(\''+g.id+'\')">' + svgIcon('plus', ICON_SIZES.sm) + ' حصة جديدة</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('users', ICON_SIZES.sm) + ' الطلاب (' + students.length + ')</span></h3><div>' + chips + '</div><button class="btn btn-secondary btn-sm" style="margin-top:14px" onclick="addStudentToGroup(\''+g.id+'\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة طالب</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', ICON_SIZES.sm) + ' الثوابت</span></h3><div id="groupConstantsContainer">' + renderConstants('group', g.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addConstant(\'group\', \''+g.id+'\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة ثابت</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('alarm-clock', ICON_SIZES.sm) + ' المواعيد المتكررة</span><button class="btn btn-primary btn-sm" onclick="addSchedulePrompt(\''+g.id+'\')">' + svgIcon('plus', ICON_SIZES.xs) + ' موعد</button></h3><div id="groupScheduleContainer">' + renderSchedule(g.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%" onclick="addExtraAppointmentPrompt(\''+g.id+'\')">' + svgIcon('plus', ICON_SIZES.xs) + ' حصة استثنائية</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', ICON_SIZES.sm) + ' الاستثناءات</span></h3><div id="groupExceptionsContainer">' + renderGroupExceptions(g.id) + '</div></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('settings', ICON_SIZES.sm) + ' أنواع سطور</span><button class="btn btn-primary btn-sm" onclick="openCustomRowTypeEditor(\'group\', \''+g.id+'\', null)">' + svgIcon('plus', ICON_SIZES.xs) + ' نوع</button></h3><div id="groupCustomRowTypesContainer">' + renderCustomRowTypes(g.id) + '</div></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', ICON_SIZES.sm) + ' نصوص ثابتة</span><button class="btn btn-primary btn-sm" onclick="openStaticTextEditor(\'group\', \''+g.id+'\', null)">' + svgIcon('plus', ICON_SIZES.xs) + ' نص</button></h3><div id="groupStaticTextsContainer">' + renderStaticTexts('group', g.id) + '</div></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('calendar', ICON_SIZES.sm) + ' الحصص (' + sessions.length + ')</span><button class="btn btn-secondary btn-sm" onclick="toggleSessionSort()">' + (sessionSortOrder==='desc'? svgIcon('chevron-down', ICON_SIZES.xs) + ' الأحدث' : svgIcon('chevron-down', ICON_SIZES.xs) + ' الأقدم') + '</button></h3>' + tree + '</div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('file-text', ICON_SIZES.sm) + ' التقارير الشهرية</span><button class="btn btn-primary btn-sm" onclick="openNewMonthlyReport(\'group\', \''+g.id+'\')">' + svgIcon('plus', ICON_SIZES.xs) + ' تقرير</button></h3>' + buildMonthlyReportsTree('group', g.id) + '</div>';
  hydrateIcons(detail);
}
function editGroup(id){
  var g = data.groups.find(function(x){ return x.id === id; }); if(!g) return;
  var locOpts = '<option value="">— بدون —</option>' + (data.settings.workLocations||[]).map(function(l){ return '<option value="'+escapeAttr(l)+'"'+(g.location===l?' selected':'')+'>'+escapeHtml(l)+'</option>'; }).join('');
  openGenericModal('تعديل المجموعة',
    '<div class="form-field"><label>اسم المجموعة</label><input type="text" id="editGroupName" value="'+escapeAttr(g.name)+'"></div>'
    +'<div class="form-field"><label>اسم المعلم</label><input type="text" id="editGroupTeacher" value="'+escapeAttr(g.teacherName||'')+'"></div>'
    +'<div class="form-field"><label>توقيت الطالب</label><div style="display:flex;gap:8px"><input type="text" id="editGroupTimezone" value="'+escapeAttr(g.timezone||'')+'" readonly placeholder="اضغط للاختيار" onclick="openTimezonePicker(function(tz){document.getElementById(\'editGroupTimezone\').value=tz;})" style="flex:1;cursor:pointer"><button type="button" class="btn btn-secondary" onclick="openTimezonePicker(function(tz){document.getElementById(\'editGroupTimezone\').value=tz;})" style="padding:10px 14px">' + svgIcon('globe', ICON_SIZES.sm) + '</button></div></div>'
    +'<div class="form-field"><label>رابط الحصة</label><input type="url" id="editGroupLink" value="'+escapeAttr(g.link||'')+'" placeholder="https://zoom.us/j/..."></div>'
    +'<div class="form-field"><label>مكان العمل</label><select id="editGroupLocation">'+locOpts+'</select></div>',
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveGroupEdit(\''+id+'\')">حفظ</button>');
}
function saveGroupEdit(id){
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
async function deleteGroup(id){
  if(!confirm('حذف هذه المجموعة وكل طلابها وحصصها؟')) return;
  var _groupSessions = data.sessions.filter(function(s){ return s.groupId === id; });
  for (var _i = 0; _i < _groupSessions.length; _i++) {
    if (_groupSessions[_i].attachmentIds) {
      for (var _j = 0; _j < _groupSessions[_i].attachmentIds.length; _j++) {
        try { await idbAttachmentDelete(_groupSessions[_i].attachmentIds[_j]); } catch(e) {}
      }
    }
  }
  data.groups = data.groups.filter(function(g){ return g.id !== id; });
  data.students = data.students.filter(function(s){ return s.groupId !== id; });
  data.sessions = data.sessions.filter(function(s){ return s.groupId !== id; });
  data.appointments = (data.appointments || []).filter(function(a){ return a.groupId !== id; });
  await saveDataAsync(); backToGroups(); renderGroupsList();
  showNotify('تم الحذف');
  if(document.getElementById('tab-home').classList.contains('active')) renderHome();
  updatePendingBadge();
}
async function deleteSession(id){
  if(!confirm('حذف هذه الحصة نهائيًا؟')) return;
  var _session = data.sessions.find(function(s){ return s.id === id; });
  if (_session && _session.attachmentIds) {
    for (var _i = 0; _i < _session.attachmentIds.length; _i++) {
      try { await idbAttachmentDelete(_session.attachmentIds[_i]); } catch(e) {}
    }
  }
  data.sessions = data.sessions.filter(function(s){ return s.id !== id; });
  await saveDataAsync();
  showNotify('تم حذف الحصة');
  if(currentViewStudentId) openStudentDetail(currentViewStudentId, studentBackTarget);
  else if(currentViewGroupId) openGroupDetail(currentViewGroupId);
  if(document.getElementById('tab-home').classList.contains('active')) renderHome();
  updatePendingBadge();
}
function newSessionForGroup(id){
  var g = data.groups.find(function(x){ return x.id === id; }); if(!g) return;
  pickGroup(id); switchTab('lesson');
}
function addStudentToGroup(groupId){
  openGenericModal('طالب جديد', '<div class="form-field"><label>اسم الطالب</label><input type="text" id="newStudentName"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="createStudentInGroup(\''+groupId+'\')">إضافة</button>');
  setTimeout(function(){ var i = document.getElementById('newStudentName'); if(i) i.focus(); }, 50);
}
function createStudentInGroup(groupId){
  var v = document.getElementById('newStudentName').value.trim();
  if(!v){ showNotify('أدخل اسمًا'); return; }
  if(data.students.find(function(s){ return s.groupId === groupId && normalize(s.name) === normalize(v); })){ showNotify('الاسم موجود'); return; }
  data.students.push({id: genId(), name: v, groupId: groupId, constants: [], notes:'', phone:'', country:'', timezone:'', guardianName:'', birthDate:'', currentLevel:''});
  saveData(); closeGenericModal(); openGroupDetail(groupId);
  showNotify('تم إضافة الطالب');
}
function renderStudentsList(){
  var list = document.getElementById('studentsList'); if(!list) return;
  var q = (document.getElementById('studentSearch').value || '').trim();
  list.innerHTML = '';
  var filtered = data.students.filter(function(s){ return !q || normalize(s.name).indexOf(normalize(q)) !== -1; });
  if(!filtered.length){
  var isSearch = q && q.trim();
  list.innerHTML = '<div class="home-empty-elegant">'
    + '<div class="he-icon">' + svgIcon('user', ICON_SIZES.xl) + '</div>'
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
    row.innerHTML = '<div class="lib-row-icon info">' + svgIcon('user', ICON_SIZES.xl) + '</div>'
      + '<div class="lib-row-body"><div class="lib-row-name">' + escapeHtml(s.name) + '</div>'
      + '<div class="lib-row-meta"><span>' + svgIcon('folder-open', ICON_SIZES.xs) + ' ' + escapeHtml(g?g.name:'—') + '</span><span>' + svgIcon('calendar', ICON_SIZES.xs) + ' ' + sc.length + ' حصة</span>' + (lastDate ? '<span>' + svgIcon('clock', ICON_SIZES.xs) + ' آخر: ' + escapeHtml(lastDate) + '</span>' : '') + '</div></div>'
      + '<div class="lib-row-arrow">' + svgIcon('chevron-left', ICON_SIZES.md) + '</div>';
    list.appendChild(row);
  });
}

/* ═══════════════ STUDENT DETAIL ═══════════════ */
function openStudentDetail(id, fromGroupId){
  var s = data.students.find(function(x){ return x.id === id; }); if(!s) return;
  currentViewStudentId = id;
  if(fromGroupId){ currentViewGroupId = fromGroupId; studentBackTarget = fromGroupId; switchLibSub('students'); }
  else { currentViewGroupId = null; studentBackTarget = null; }
  var g = data.groups.find(function(x){ return x.id === s.groupId; });
  var sessions = data.sessions.filter(function(x){ return (x.studentIds||[]).indexOf(id) !== -1; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var detail = document.getElementById('studentDetail');
  document.getElementById('studentsList').style.display = 'none';
  detail.style.display = 'block';
  var tree = buildSessionsTree(sessions);
  var phoneDisplay = s.phone ? '<span>' + svgIcon('smartphone', ICON_SIZES.xs) + ' <a href="https://wa.me/'+escapeAttr(s.phone.replace(/[^0-9]/g,''))+'" target="_blank" rel="noopener">'+escapeHtml(s.phone)+'</a></span>' : '';
  var countryDisplay = s.country ? '<span>' + svgIcon('globe', ICON_SIZES.xs) + ' ' + escapeHtml(s.country)+(s.timezone?' — '+escapeHtml(s.timezone):'')+'</span>' : '';
  var guardianDisplay = s.guardianName ? '<span>' + svgIcon('user-round', ICON_SIZES.xs) + ' ' + escapeHtml(s.guardianName) + '</span>' : '';
  var levelDisplay = s.currentLevel ? '<span>' + svgIcon('graduation-cap', ICON_SIZES.xs) + ' ' + escapeHtml(s.currentLevel) + '</span>' : '';
  var birthDisplay = s.birthDate ? '<span>' + svgIcon('cake', ICON_SIZES.xs) + ' ' + escapeHtml(fmtDate(s.birthDate)) + '</span>' : '';
  var metaExtra = [guardianDisplay, phoneDisplay, countryDisplay, levelDisplay, birthDisplay].filter(Boolean).join('');
  detail.innerHTML = '<div class="detail-header"><button class="btn btn-secondary btn-sm" onclick="backFromStudentDetail()">' + svgIcon('arrow-right', ICON_SIZES.sm) + ' رجوع</button><h2>' + svgIcon('user', ICON_SIZES.lg) + ' ' + escapeHtml(s.name) + '</h2><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editStudent(\''+s.id+'\')">' + svgIcon('edit-3', ICON_SIZES.xs) + ' تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteStudent(\''+s.id+'\')">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button></div></div>'
    + '<div class="detail-meta"><span>' + svgIcon('folder-open', ICON_SIZES.xs) + ' ' + escapeHtml(g?g.name:'—') + '</span><span>' + svgIcon('calendar', ICON_SIZES.xs) + ' ' + sessions.length + ' حصة</span>' + metaExtra + '</div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', ICON_SIZES.sm) + ' الثوابت</span></h3><div id="studentConstantsContainer">' + renderConstants('student', s.id) + '</div><button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addConstant(\'student\', \''+s.id+'\')">' + svgIcon('plus', ICON_SIZES.xs) + ' إضافة ثابت</button></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('pin', ICON_SIZES.sm) + ' نصوص ثابتة</span><button class="btn btn-primary btn-sm" onclick="openStaticTextEditor(\'student\', \''+s.id+'\', null)">' + svgIcon('plus', ICON_SIZES.xs) + ' نص</button></h3><div id="studentStaticTextsContainer">' + renderStaticTexts('student', s.id) + '</div></div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('calendar', ICON_SIZES.sm) + ' سجل الحصص (' + sessions.length + ')</span><button class="btn btn-secondary btn-sm" onclick="toggleSessionSort()">' + (sessionSortOrder==='desc'? svgIcon('chevron-down', ICON_SIZES.xs) + ' الأحدث' : svgIcon('chevron-down', ICON_SIZES.xs) + ' الأقدم') + '</button></h3>' + tree + '</div>'
    + '<div class="detail-section"><h3><span>' + svgIcon('file-text', ICON_SIZES.sm) + ' التقارير الشهرية</span><button class="btn btn-primary btn-sm" onclick="openNewMonthlyReport(\'student\', \''+s.id+'\')">' + svgIcon('plus', ICON_SIZES.xs) + ' تقرير</button></h3>' + buildMonthlyReportsTree('student', s.id) + '</div>';
  hydrateIcons(detail);
}
function editStudent(id){
  var s = data.students.find(function(x){ return x.id === id; }); if(!s) return;
  var groupsHTML = '<option value="">— بدون —</option>';
  data.groups.forEach(function(g){ groupsHTML += '<option value="'+g.id+'"'+(g.id===s.groupId?' selected':'')+'>'+escapeHtml(g.name)+'</option>'; });
  var countriesHTML = '<option value="">— اختر —</option>';
  var seen = {};
  COUNTRY_TZ.forEach(function(c){ if(seen[c.ar]) return; seen[c.ar] = 1; countriesHTML += '<option value="'+escapeAttr(c.ar)+'"'+(s.country===c.ar?' selected':'')+'>'+escapeHtml(c.ar)+'</option>'; });
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
function onStudentCountryChange(){
  var c = document.getElementById('editStudentCountry').value;
  if(!c) return;
  var tz = document.getElementById('editStudentTimezone');
  if(!tz || tz.value.trim()) return;
  var e = COUNTRY_TZ.find(function(x){ return x.ar === c; });
  if(e) tz.value = e.tz;
}
function saveStudentEdit(id){
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
async function deleteStudent(id){
  if(!confirm('حذف هذا الطالب؟')) return;
  data.students = data.students.filter(function(s){ return s.id !== id; });
  data.sessions.forEach(function(ses){ ses.studentIds = (ses.studentIds||[]).filter(function(sid){ return sid !== id; }); });
  await saveDataAsync(); backToStudents(); renderStudentsList();
  showNotify('تم الحذف');
}

/* ═══════════════ SESSIONS TREE ═══════════════ */
function buildSessionsTree(sessions){
  if(!sessions.length) return '<div class="cfg-empty">لا توجد حصص بعد</div>';
  var sorted = sessions.slice().sort(function(a,b){ return sessionSortOrder === 'desc' ? (b.date||'').localeCompare(a.date||'') : (a.date||'').localeCompare(b.date||''); });
  var byYear = {};
  sorted.forEach(function(s){ if(!s.date) return; var y = s.date.slice(0,4), m = s.date.slice(5,7); if(!byYear[y]) byYear[y] = {}; if(!byYear[y][m]) byYear[y][m] = []; byYear[y][m].push(s); });
  var years = Object.keys(byYear).sort();
  if(sessionSortOrder === 'desc') years.reverse();
  var html = '';
  years.forEach(function(y){
    var open = (sessionSortOrder === 'desc' && y === years[0]) ? ' open' : '';
    html += '<details class="year-block"'+open+'><summary><span>' + svgIcon('calendar-days', ICON_SIZES.md) + ' ' + y + '</span><span style="color:var(--text-muted)">' + svgIcon('chevron-down', ICON_SIZES.sm) + '</span></summary>';
    var months = Object.keys(byYear[y]).sort();
    if(sessionSortOrder === 'desc') months.reverse();
    months.forEach(function(m){
      var mi = parseInt(m,10) - 1;
      html += '<details class="month-block"><summary><span>' + svgIcon('calendar', ICON_SIZES.sm) + ' ' + (MONTH_NAMES[mi]||m) + '</span><span>' + svgIcon('chevron-down', ICON_SIZES.xs) + '</span></summary><div style="padding:5px 10px">';
      byYear[y][m].sort(function(a,b){ return sessionSortOrder === 'desc' ? (b.date||'').localeCompare(a.date||'') : (a.date||'').localeCompare(b.date||''); }).forEach(function(s){
        var d = s.date ? s.date.slice(8,10)+'/'+s.date.slice(5,7) : '';
        html += '<div class="session-row"><div><div class="session-row-date">' + d + ' — الحصة ' + escapeHtml(s.lessonNumber||'—') + '</div><div class="session-row-sub">' + svgIcon('clock', ICON_SIZES.xs) + ' ' + durationToWords(s.duration) + '</div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="viewSession(\''+s.id+'\')" title="عرض">' + svgIcon('search', ICON_SIZES.xs) + '</button><button class="btn btn-copy btn-sm" onclick="copySessionReport(\''+s.id+'\')" title="نسخ">' + svgIcon('copy', ICON_SIZES.xs) + '</button><button class="btn btn-word btn-sm" onclick="exportSessionWord(\''+s.id+'\')" title="Word">' + svgIcon('file-word', ICON_SIZES.xs) + '</button><button class="btn btn-danger btn-sm" onclick="deleteSession(\''+s.id+'\')" title="حذف">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button></div></div>';
      });
      html += '</div></details>';
    });
    html += '</details>';
  });
  return html;
}
function toggleSessionSort(){
  sessionSortOrder = sessionSortOrder === 'desc' ? 'asc' : 'desc';
  if(currentViewStudentId) openStudentDetail(currentViewStudentId, studentBackTarget);
  else if(currentViewGroupId) openGroupDetail(currentViewGroupId);
}
var _sessionViewUrls = [];
async function viewSession(id){
  var s = data.sessions.find(function(x){ return x.id === id; }); if(!s) return;
  
  var hasAtt = s.attachmentIds && s.attachmentIds.length > 0;
  var attContainer = hasAtt ? '<div style="margin-top:14px"><h4 style="font-size:.9rem;margin-bottom:8px;color:var(--accent-blue)">📎 المرفقات ('+s.attachmentIds.length+')</h4><div id="viewSessionAttachments" style="display:flex;flex-wrap:wrap;gap:10px"><div style="font-size:.8rem;color:var(--text-muted)">جارٍ التحميل...</div></div></div>' : '';
  
  openGenericModal('تقرير الحصة', '<textarea id="sessionReportView" style="min-height:320px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7;font-size:14px">'+escapeHtml(s.report||'')+'</textarea>' + attContainer, '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveSessionReport(\''+id+'\')">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button><button class="btn btn-copy" onclick="copySessionReport(\''+id+'\')">' + svgIcon('copy', ICON_SIZES.sm) + ' نسخ</button>');
  
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
function saveSessionReport(id){
  var s = data.sessions.find(function(x){ return x.id === id; }); if(!s) return;
  s.report = document.getElementById('sessionReportView').value;
  s.reportEdited = true;
  s.reportEditedAt = new Date().toISOString();
  saveData();
  showNotify('تم حفظ التعديل');
}
function copySessionReport(id){ var s = data.sessions.find(function(x){ return x.id === id; }); if(s) copyText(s.report || ''); }
function exportSessionWord(id){
  var s = data.sessions.find(function(x){ return x.id === id; }); if(!s) return;
  var savedH = currentHiddenStaticIds; var savedT = currentCustomRowTypes;
  currentHiddenStaticIds = (s.data && s.data.hiddenStaticIds) || [];
  var grp = data.groups.find(function(g){ return g.id === s.groupId; });
  currentCustomRowTypes = (grp && grp.reportSettings && grp.reportSettings.customRowTypes) || [];
  try { exportToWordFromState(s.data || {}, s.report || ''); }
  finally { currentHiddenStaticIds = savedH; currentCustomRowTypes = savedT; }
}
function clearForm(){
  if(!confirm('مسح النموذج وبدء حصة جديدة؟')) return;
  localStorage.removeItem(DRAFT_KEY);
  document.getElementById('groupName').value = '';
  document.getElementById('teacherName').value = data.settings.teacherName || '';
  document.getElementById('lessonOrder').value = '';
  document.getElementById('duration').value = '';
  document.getElementById('reportDate').valueAsDate = new Date();
  document.getElementById('output').value = '';
  var so = document.getElementById('sheetOutput'); if(so) so.value = '';
  currentSubjects = { quran: true, arabic: false, islamic: false }; updateSubjectButtons();
  currentAttachments = [];
  if (typeof renderAttachmentsUI === 'function') renderAttachmentsUI();
  currentCustomRowTypes = []; currentHiddenStaticIds = [];
  renderActiveStaticTexts(); updateLessonLinkBar();
  var pc = document.getElementById('previousLessonCard'); if(pc) pc.style.display = 'none';
  var c = document.getElementById('studentsContainer'); if(c) c.innerHTML = '';
  currentStudentCount = 0; setStudentCount(1); saveDraft();
  _draftUnsaved = false;
  showNotify('نموذج جديد');
}

/* ═══════════════ BACKUP — NEW ARCHITECTURE ═══════════════ */

/* حفظ Blob باستخدام File System Access API (إن وُجد) أو fallback */
async function _saveBlobWithPicker(blob, suggestedName, acceptTypes) {
  /* المحاولة الأولى: File System Access API — نافذة نظام حقيقية */
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

  /* Fallback: تنزيل تقليدي (لا نعرف إن أُكمل) */
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

/* حساب أحجام النسخ الاحتياطية (ZIP + JSON) */
async function _getBackupSizes() {
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
      } catch (e) { /* تجاهل */ }
    }
  }

  return {
    jsonSize: jsonSize,
    attachmentsCount: attachmentsCount,
    attachmentsSize: attachmentsSize,
    totalSize: jsonSize + attachmentsSize
  };
}

/* نافذة اختيار نوع التصدير */
function showBackupExportModal() {
  openGenericModal(
    svgIcon('upload', ICON_SIZES.lg) + ' إنشاء نسخة احتياطية',
    '<div id="backupExportBody" style="text-align:center;padding:30px">'
      + '<div style="display:inline-block;width:36px;height:36px;border:3px solid var(--card-border);border-top-color:var(--accent-green);border-radius:50%;animation:spin 1s linear infinite"></div>'
      + '<div style="margin-top:14px;color:var(--text-muted);font-size:.85rem">جاري حساب الأحجام...</div>'
    + '</div>',
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
  );
  _renderBackupExportOptions();
}

async function _renderBackupExportOptions() {
  var sizes;
  try { sizes = await _getBackupSizes(); }
  catch (e) { sizes = { jsonSize: 0, attachmentsCount: 0, totalSize: 0 }; }

  var body = document.getElementById('backupExportBody');
  if (!body) return;

  var html = '<div style="display:flex;flex-direction:column;gap:12px">';

  /* الخيار الأول: كل البيانات */
  html += '<button class="backup-option recommended" onclick="closeGenericModal();exportFullBackup()">'
    + '<div class="backup-option-badge">⭐ موصى به</div>'
    + '<div class="backup-option-icon">' + svgIcon('package', ICON_SIZES.xl) + '</div>'
    + '<div class="backup-option-title">كل البيانات</div>'
    + '<div class="backup-option-size">~' + formatBytes(sizes.totalSize) + ' • ' + sizes.attachmentsCount + ' مرفقًا</div>'
    + '<div class="backup-option-desc">ملف ZIP يشمل التقارير والصور وملفات PDF — الحجم تقديري (قد يكون أصغر بعد الضغط)</div>'
    + '</button>';

  /* الخيار الثاني: البيانات فقط */
  html += '<button class="backup-option" onclick="closeGenericModal();exportBackup()">'
    + '<div class="backup-option-icon">' + svgIcon('file-text', ICON_SIZES.xl) + '</div>'
    + '<div class="backup-option-title">البيانات فقط</div>'
    + '<div class="backup-option-size">' + formatBytes(sizes.jsonSize) + '</div>'
    + '<div class="backup-option-desc">ملف JSON — كل التقارير والبيانات بدون مرفقات (أسرع وأصغر حجمًا)</div>'
    + '</button>';

  html += '</div>';
  body.innerHTML = html;
  hydrateIcons(body);
}

/* زر الاستعادة — يفتح مدير ملفات ذكي */
function showBackupImportModal() {
  document.getElementById('backupSmartFile').click();
}

/* استقبال الملف — كشف النوع تلقائيًا */
async function _handleBackupFileInput(event) {
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

/* تجهيز استيراد ZIP */
async function _prepareZipImport(file) {
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
    _showRestoreChoiceModal(_pendingRestore);
  } catch (e) {
    console.error('ZIP read failed:', e);
    showNotify('⚠️ فشل قراءة الملف: ' + (e.message || ''));
  }
}

/* تجهيز استيراد JSON */
async function _prepareJsonImport(file) {
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
    _showRestoreChoiceModal(_pendingRestore);
  } catch (e) {
    console.error('JSON read failed:', e);
    showNotify('⚠️ فشل قراءة الملف: ' + (e.message || ''));
  }
}

/* حالة مؤقتة للاستيراد */
var _pendingRestore = null;

/* عرض نافذة اختيار دمج/استبدال */
function _showRestoreChoiceModal(opts) {
  var counts = opts.counts || {};
  var infoLine = (counts.groups || 0) + ' مجموعة • ' + (counts.students || 0) + ' طالب • ' + (counts.sessions || 0) + ' حصة';
  if (opts.attachmentsCount > 0) infoLine += ' • ' + opts.attachmentsCount + ' مرفق';

  var body = '<div class="restore-file-info">'
    + '<div class="restore-file-icon">' + svgIcon(opts.type === 'zip' ? 'package' : 'file-text', ICON_SIZES.xl) + '</div>'
    + '<div>'
    +   '<div class="restore-file-name">' + escapeHtml(opts.fileName) + '</div>'
    +   '<div class="restore-file-meta">' + formatBytes(opts.fileSize) + ' • ' + escapeHtml(infoLine) + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="restore-choice">'
    +   '<button class="restore-choice-btn merge" onclick="_executeRestore(\'merge\')">'
    +     '<span class="restore-choice-icon">' + svgIcon('check-circle', ICON_SIZES.lg) + '</span>'
    +     '<div>'
    +       '<div class="restore-choice-title">دمج ذكي (موصى به)</div>'
    +       '<div class="restore-choice-desc">يحتفظ ببياناتك الحالية، يضيف الجديد، ويُحدّث ما هو أقدم</div>'
    +     '</div>'
    +   '</button>'
    +   '<button class="restore-choice-btn replace" onclick="_executeRestore(\'replace\')">'
    +     '<span class="restore-choice-icon">' + svgIcon('alert-triangle', ICON_SIZES.lg) + '</span>'
    +     '<div>'
    +       '<div class="restore-choice-title">استبدال كامل</div>'
    +       '<div class="restore-choice-desc">يحذف كل البيانات الحالية ثم يستورد — لا يمكن التراجع</div>'
    +     '</div>'
    +   '</button>'
    + '</div>';

  openGenericModal(
    svgIcon('download', ICON_SIZES.lg) + ' استعادة نسخة احتياطية',
    body,
    '<button class="btn btn-secondary" onclick="_pendingRestore=null;closeGenericModal()">إلغاء</button>'
  );
}

function _executeRestore(mode) {
  if (!_pendingRestore) return;
  var ctx = _pendingRestore;
  _pendingRestore = null;
  closeGenericModal();
  if (mode === 'merge') ctx.onMerge();
  else ctx.onReplace();
}

/* تنفيذ استيراد ZIP */
async function _doZipImport(zip, importedData, parsed, doMerge) {
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
      data = importedData;
      ['groups','students','sessions','monthlyReports','appointments','workSessions'].forEach(function(k){ if (!data[k]) data[k] = []; });
      if (!data.settings) data.settings = { theme:'dark', teacherName:'', teacherTimezone:'', designTheme:'teal' };
      if (!data.settings.designTheme) data.settings.designTheme = 'teal';
      data.groups.forEach(function(g){ if (!g.constants) g.constants = []; if (!g.schedule) g.schedule = []; if (!g.timezone) g.timezone = ''; if (typeof g.link === 'undefined') g.link = ''; if (typeof g.location === 'undefined') g.location = ''; });
      data.students.forEach(function(s){ if (!s.constants) s.constants = []; });
    }

    /* استعادة المرفقات */
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
    showNotify('✅ تم الاستيراد بنجاح (' + restoredCount + ' مرفق)');
    setTimeout(function(){ location.reload(); }, 1500);
  } catch (e) {
    console.error('ZIP import failed:', e);
    showNotify('⚠️ فشل: ' + e.message);
  }
}

/* تنفيذ استيراد JSON */
async function _doJsonImport(importedData, doMerge) {
  showNotify('⏳ جاري الاستيراد...');
  try {
    if (doMerge) {
      mergeBackupData(importedData);
    } else {
      data = importedData;
      ['groups','students','sessions','monthlyReports','appointments','workSessions'].forEach(function(k){ if (!data[k]) data[k] = []; });
      if (!data.settings) data.settings = { theme:'dark', teacherName:'', teacherTimezone:'', designTheme:'teal' };
      if (!data.settings.designTheme) data.settings.designTheme = 'teal';
      data.groups.forEach(function(g){ if (!g.constants) g.constants = []; if (!g.schedule) g.schedule = []; if (!g.timezone) g.timezone = ''; if (typeof g.link === 'undefined') g.link = ''; if (typeof g.location === 'undefined') g.location = ''; });
      data.students.forEach(function(s){ if (!s.constants) s.constants = []; });
    }
    await saveDataAsync();
    addBackupLogEntry('import');
    showNotify('✅ تم الاستيراد بنجاح');
    setTimeout(function(){ location.reload(); }, 1200);
  } catch (e) {
    console.error('JSON import failed:', e);
    showNotify('⚠️ فشل: ' + e.message);
  }
}

async function exportFullBackup() {
  if (typeof JSZip === 'undefined') {
    showNotify('⚠️ مكتبة ZIP غير محمّلة — تحقق من اتصالك بالإنترنت');
    return;
  }

  /* ١) اطلب مكان الحفظ أولًا (قبل العمل الثقيل — ضمن User Gesture) */
  var filename = 'teacher-assistant-full-backup-' + new Date().toISOString().slice(0,10) + '.zip';
  var fileHandle = null;
  if (window.showSaveFilePicker) {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
      });
    } catch (e) {
      if (e.name === 'AbortError') return; /* المستخدم ألغى — لا رسالة */
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
      /* حفظ حقيقي عبر File System Access API */
      var writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      showNotify('✅ تم حفظ النسخة بنجاح (' + formatBytes(blob.size) + ')');
    } else {
      /* Fallback — رسالة صادقة (لا نعرف إن أُكمل التنزيل) */
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

    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    updateLastBackupInfo();
    addBackupLogEntry('export');
  } catch(e) {
    console.error('ZIP export failed:', e);
    showNotify('⚠️ فشل: ' + e.message);
  }
}

async function exportBackup() {
  try {
    var backup = { __exported_at: new Date().toISOString(), __version: 'v4', data: data };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var filename = 'teacher-assistant-backup-' + new Date().toISOString().slice(0,10) + '.json';

    var result = await _saveBlobWithPicker(blob, filename, [{
      description: 'JSON Backup',
      accept: { 'application/json': ['.json'] }
    }]);

    if (result.cancelled) return; /* المستخدم ألغى — لا رسالة */

    if (result.saved) {
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
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
function mergeBackupData(importedData){
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

function updateLastBackupInfo(){
  var el = document.getElementById('lastBackupInfo'); if(!el) return;
  var raw = localStorage.getItem(LAST_BACKUP_KEY);
  if(!raw){ el.innerHTML = svgIcon('alert-triangle', ICON_SIZES.xs) + ' لم تأخذ نسخة احتياطية بعد'; return; }
  try {
    var d = new Date(raw);
    el.innerHTML = svgIcon('clock', ICON_SIZES.xs) + ' آخر نسخة: ' + d.toLocaleDateString('ar') + ' - ' + d.toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});
  } catch(e){}
}
async function resetAllData(){
  if(!confirm('حذف كل البيانات نهائيًا؟')) return;
  if(!confirm('تأكيد أخير: هل أخذت نسخة احتياطية؟')) return;

  showNotify('⏳ جارٍ المسح...');

  try {
    /* ١) امسح IndexedDB — كل الـ stores */
    if (_idb) {
      var stores = [IDB_STORE, IDB_META_STORE, IDB_ATTACHMENTS_STORE];
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

    /* ٢) امسح localStorage — كل مفاتيح التطبيق */
    var keysToRemove = [
      DATA_KEY, DRAFT_KEY, LAST_BACKUP_KEY, BACKUP_LOG_KEY,
      BROWSER_FAVS_KEY, BROWSER_TABS_KEY,
      MIGRATED_AT_KEY, MIGRATED_BACKUP_KEY
    ];
    keysToRemove.forEach(function(k){
      try { localStorage.removeItem(k); } catch(e){}
    });

    /* ٣) امسح Cache Storage (Service Worker cache) */
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
function addBackupLogEntry(type){
  try {
    var log = [];
    try { log = JSON.parse(localStorage.getItem(BACKUP_LOG_KEY) || '[]'); } catch(e){ log = []; }
    log.unshift({ type: type, at: new Date().toISOString() });
    if (log.length > 20) log = log.slice(0, 20);
    localStorage.setItem(BACKUP_LOG_KEY, JSON.stringify(log));
    renderBackupLog();
  } catch(e){}
}
function renderBackupLog(){
  var container = document.getElementById('backupLogContainer'); if (!container) return;
  var log = []; try { log = JSON.parse(localStorage.getItem(BACKUP_LOG_KEY) || '[]'); } catch(e){}
  if (!log.length){ container.innerHTML = '<div class="cfg-empty">لا توجد عمليات بعد</div>'; return; }
  var html = '<div style="display:flex;flex-direction:column;gap:6px">';
  log.forEach(function(entry){
    var d; try { d = new Date(entry.at); } catch(e){ return; }
    if (isNaN(d.getTime())) return;
    var isEx = entry.type === 'export';
    html += '<div class="cfg-row"><span style="color:'+(isEx?'var(--accent-blue)':'var(--accent-amber)')+';font-weight:700;display:inline-flex;align-items:center;gap:5px">' + svgIcon(isEx?'upload':'download', ICON_SIZES.xs) + ' ' + (isEx?'تصدير':'استيراد') + '</span><span style="color:var(--text-muted);font-size:.78rem">'+d.toLocaleDateString('ar')+' — '+d.toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'})+'</span></div>';
  });
  html += '</div>'; container.innerHTML = html;
}
function clearBackupLog(){
  if (!confirm('مسح سجل النسخ؟')) return;
  localStorage.removeItem(BACKUP_LOG_KEY);
  renderBackupLog();
  showNotify('تم المسح');
}

/* ═══════════════ MONTHLY REPORTS ═══════════════ */
function buildMonthlyReportsTree(ownerType, ownerId){
  var reports = data.monthlyReports.filter(function(r){ return r.ownerType === ownerType && r.ownerId === ownerId; });
  if(!reports.length) return '<div class="cfg-empty">لا توجد تقارير شهرية</div>';
  reports.sort(function(a,b){ return (b.year + '-' + b.month.toString().padStart(2,'0')).localeCompare(a.year + '-' + a.month.toString().padStart(2,'0')); });
  var html = ''; var cy = null;
  reports.forEach(function(r){
    if(r.year !== cy){
      if(cy !== null) html += '</details>';
      cy = r.year;
      html += '<details class="year-block" open><summary><span>' + svgIcon('calendar-days', ICON_SIZES.md) + ' ' + cy + '</span></summary>';
    }
    html += '<div class="cfg-row" style="margin:0 12px 8px"><span style="font-weight:700">'+MONTH_NAMES[r.month-1]+'</span><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="viewMonthlyReport(\''+r.id+'\')" title="عرض">' + svgIcon('search', ICON_SIZES.xs) + '</button><button class="btn btn-copy btn-sm" onclick="copyMonthlyReport(\''+r.id+'\')" title="نسخ">' + svgIcon('copy', ICON_SIZES.xs) + '</button><button class="btn btn-danger btn-sm" onclick="deleteMonthlyReport(\''+r.id+'\')" title="حذف">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button></div></div>';
  });
  if(cy !== null) html += '</details>';
  return html;
}
function openNewMonthlyReport(ownerType, ownerId){
  var now = new Date(); var mo = '';
  for(var i=0; i<12; i++) mo += '<option value="'+(i+1)+'"'+(i+1===(now.getMonth()+1)?' selected':'')+'>'+MONTH_NAMES[i]+'</option>';
  openGenericModal('تقرير شهري', '<div class="form-row-2"><div class="form-field"><label>الشهر</label><select id="newMonthlyMonth">'+mo+'</select></div><div class="form-field"><label>السنة</label><input type="number" id="newMonthlyYear" value="'+now.getFullYear()+'"></div></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="generateAndOpenMonthlyDraft(\''+ownerType+'\', \''+ownerId+'\')">توليد</button>');
}
function generateAndOpenMonthlyDraft(ownerType, ownerId){
  var month = parseInt(document.getElementById('newMonthlyMonth').value);
  var year = parseInt(document.getElementById('newMonthlyYear').value);
  if(!month || !year) return;
  var ex = data.monthlyReports.find(function(r){ return r.ownerType === ownerType && r.ownerId === ownerId && r.year === year && r.month === month; });
  if(ex){ if(!confirm('يوجد تقرير محفوظ. فتحه للتعديل؟')) return; openEditMonthlyReport(ex.id); return; }
  var draft = generateMonthlyDraft(ownerType, ownerId, year, month);
  openGenericModal('مسودة التقرير الشهري', '<textarea id="monthlyDraftText" style="min-height:400px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7">'+escapeHtml(draft)+'</textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveNewMonthlyReport(\''+ownerType+'\', \''+ownerId+'\', '+year+', '+month+')">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button>');
}
function generateMonthlyDraftFromTab(){
  var groupId = document.getElementById('monthlyGroupSelect').value;
  var month = parseInt(document.getElementById('monthlyMonthSelect').value);
  var year = parseInt(document.getElementById('monthlyYearInput').value);
  if(!groupId) return showNotify('اختر المجموعة');
  var draft = generateMonthlyDraft('group', groupId, year, month);
  document.getElementById('monthlyTabDraft').value = draft;
  document.getElementById('monthlyTabDraftContainer').style.display = 'block';
}
function saveMonthlyDraftFromTab(){
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
function parseEditedReportForStudent(report, studentName){
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
function generateMonthlyDraft(ownerType, ownerId, year, month){
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
  var refs = gidC ? getConstant('group', gidC, 'المراجع', 'القرآن الكريم - منهج اللغة العربية') : 'القرآن الكريم - منهج اللغة العربية';
  var familyTimes = gidC ? getConstant('group', gidC, 'مواعيد الأسرة', '[أضف المواعيد هنا]') : '[أضف المواعيد هنا]';
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
function saveNewMonthlyReport(ownerType, ownerId, year, month){
  var text = document.getElementById('monthlyDraftText').value;
  data.monthlyReports.push({ id: genId(), ownerType: ownerType, ownerId: ownerId, year: year, month: month, text: text, savedAt: new Date().toISOString() });
  saveData(); closeGenericModal();
  showNotify('تم الحفظ');
  if(ownerType === 'group') openGroupDetail(ownerId); else openStudentDetail(ownerId);
}
function viewMonthlyReport(id){
  var r = data.monthlyReports.find(function(x){ return x.id === id; }); if(!r) return;
  openGenericModal('التقرير الشهري', '<textarea id="monthlyViewText" style="min-height:400px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7" readonly>'+escapeHtml(r.text)+'</textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="openEditMonthlyReport(\''+id+'\')">' + svgIcon('edit-3', ICON_SIZES.sm) + ' تعديل</button><button class="btn btn-copy" onclick="copyMonthlyReport(\''+id+'\')">' + svgIcon('copy', ICON_SIZES.sm) + ' نسخ</button>');
}
function openEditMonthlyReport(id){
  var r = data.monthlyReports.find(function(x){ return x.id === id; }); if(!r) return;
  openGenericModal('تعديل التقرير الشهري', '<textarea id="monthlyEditText" style="min-height:400px;height:50vh;resize:vertical;font-family:\'IBM Plex Sans Arabic\',monospace;line-height:1.7">'+escapeHtml(r.text)+'</textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveEditMonthlyReport(\''+id+'\')">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button>');
}
function saveEditMonthlyReport(id){
  var r = data.monthlyReports.find(function(x){ return x.id === id; }); if(!r) return;
  r.text = document.getElementById('monthlyEditText').value;
  saveData(); closeGenericModal();
  showNotify('تم الحفظ');
  if(r.ownerType === 'group') openGroupDetail(r.ownerId); else openStudentDetail(r.ownerId);
}
function copyMonthlyReport(id){ var r = data.monthlyReports.find(function(x){ return x.id === id; }); if(r) copyText(r.text); }
async function deleteMonthlyReport(id){
  if(!confirm('حذف هذا التقرير الشهري؟')) return;
  var r = data.monthlyReports.find(function(x){ return x.id === id; });
  data.monthlyReports = data.monthlyReports.filter(function(x){ return x.id !== id; });
  await saveDataAsync(); showNotify('تم الحذف');
  if(r && r.ownerType === 'group') openGroupDetail(r.ownerId); else if(r) openStudentDetail(r.ownerId);
}

/* ═══════════════ CALENDAR ═══════════════ */
var calendarViewDate = new Date();
var currentCalendarView = 'monthly';
function toDateISO(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function getTeacherTimezone(){ if (data.settings.teacherTimezone) return data.settings.teacherTimezone; try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e){ return ''; } }
function getTimezoneOffsetMinutes(tz, date){
  try {
    var dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
    var p = dtf.formatToParts(date);
    var o = {}; p.forEach(function(x){ o[x.type] = x.value; });
    var u = Date.UTC(parseInt(o.year), parseInt(o.month)-1, parseInt(o.day), parseInt(o.hour), parseInt(o.minute), parseInt(o.second));
    return Math.round((u - date.getTime()) / 60000);
  } catch(e){ return 0; }
}
function convertTimeBetweenTimezones(dateISO, timeHM, fromTZ, toTZ){
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
function getOccurrencesForDate(dateObj){
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
function renderCalendar(){
  var b = document.getElementById('calendarBody'); if(!b) return;
  if(!currentCalendarView) currentCalendarView = 'monthly';
  document.querySelectorAll('.cal-view-btn').forEach(function(x){ x.classList.toggle('active', x.dataset.view === currentCalendarView); });
  if(currentCalendarView === 'monthly') renderCalendarMonthlyView(b);
  else if(currentCalendarView === 'weekly') renderCalendarWeeklyView(b);
  else renderCalendarListView(b);
}

/* تنسيق وقت مختصر للهاتف: "18:00" → "18"، "18:30" → "18:30" */
function formatMobileTime(time24){
  if (!time24) return '';
  var parts = String(time24).split(':');
  if (parts.length < 2) return time24;
  var h = String(parseInt(parts[0], 10));
  var m = parts[1];
  return (m === '00') ? h : (h + ':' + m);
}

/* إزالة البادئات الشائعة من اسم المجموعة لتوفير مساحة */
function shortGroupName(name){
  if (!name) return '';
  return String(name).trim().replace(/^(أسرة|مجموعة|جروب|فريق)\s+/i, '');
}

/* ═══ Calendar Monthly View with Mobile Dots ═══ */
function renderCalendarMonthlyView(body){
  var title = document.getElementById('calendarTitle');
  var y = calendarViewDate.getFullYear();
  var m = calendarViewDate.getMonth();
  if(title) title.textContent = MONTH_NAMES[m] + ' ' + y;
  var first = new Date(y, m, 1);
  var start = new Date(first); start.setDate(start.getDate() - start.getDay());
  var html = '<div class="cal-grid">';
  DAY_NAMES.forEach(function(d){ html += '<div class="cal-header-day">' + d + '</div>'; });
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
        // ═══ سطح المكتب: نص كامل (يُخفى على الهاتف عبر CSS) ═══
        occs.forEach(function(o){
          html += '<div class="cal-occ ' + o.status + '">' + escapeHtml(o.groupName.substring(0, 12)) + ' · ' + escapeHtml(o.time) + '</div>';
        });
        // ═══ الهاتف: حتى حصتان + "＋N" (يُخفى على الحاسوب عبر CSS) ═══
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

/* ═══ Day Details Modal (on cell click) ═══ */
function calendarCellClick(dateISO){
  showDayDetails(dateISO);
}
function showDayDetails(dateISO){
  var d = new Date(dateISO + 'T00:00:00');
  var dateDisplay = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
  var dayName = DAY_NAMES[d.getDay()];
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
      actions = '<button class="btn btn-primary btn-sm" onclick="closeGenericModal();startLessonFromCalendar(\'' + o.groupId + '\',\'' + o.dateISO + '\',\'' + o.time + '\')">' + svgIcon('edit-3', ICON_SIZES.xs) + ' فتح</button>'
        + '<button class="btn btn-secondary btn-sm" onclick="closeGenericModal();showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')">' + svgIcon('more-horizontal', ICON_SIZES.xs) + '</button>';
    } else if(o.status === 'completed' && o.sessionId){
      actions = '<button class="btn btn-primary btn-sm" onclick="closeGenericModal();viewSession(\'' + o.sessionId + '\')">' + svgIcon('search', ICON_SIZES.xs) + ' عرض التقرير</button>';
    } else {
      actions = '<button class="btn btn-secondary btn-sm" onclick="closeGenericModal();showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')">' + svgIcon('more-horizontal', ICON_SIZES.xs) + ' تفاصيل</button>';
    }
    body += '<div class="day-detail-item">'
      + '<div class="dd-header">'
      + '<span class="dd-time">' + svgIcon('clock', ICON_SIZES.xs) + ' ' + escapeHtml(o.time) + '</span>'
      + '<span class="dd-group">' + escapeHtml(o.groupName) + '</span>'
      + '<span class="dd-status ' + o.status + '">' + svgIcon(meta.icon, ICON_SIZES.xs) + ' ' + meta.label + '</span>'
      + '</div>'
      + '<div class="dd-actions">' + actions + '</div>'
      + '</div>';
  });
  body += '</div>';
  body += '<div class="day-detail-extra" style="margin-top:12px"><button onclick="closeGenericModal();addExtraAppointmentPromptForDate(\'' + dateISO + '\')">' + svgIcon('plus', ICON_SIZES.sm) + ' إضافة حصة استثنائية في هذا اليوم</button></div>';
  openGenericModal(svgIcon('calendar', ICON_SIZES.lg) + ' ' + dayName + '، ' + dateDisplay, body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
}
function addExtraAppointmentPromptForDate(dateISO){
  // Ask which group first
  if(!data.groups.length){ showNotify('لا توجد مجموعات'); return; }
  var opts = data.groups.map(function(g){ return '<option value="'+g.id+'">'+escapeHtml(g.name)+'</option>'; }).join('');
  openGenericModal('حصة استثنائية',
    '<div class="form-field"><label>المجموعة</label><select id="extraApptGroupId">'+opts+'</select></div>'
    +'<div class="form-field"><label>الساعة</label><input type="time" id="extraApptTime" value="18:00"></div>',
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveExtraAppointmentFromDay(\'' + dateISO + '\')">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button>');
}
function saveExtraAppointmentFromDay(dateISO){
  var groupId = document.getElementById('extraApptGroupId').value;
  var time = document.getElementById('extraApptTime').value;
  if(!groupId || !time){ showNotify('أكمل البيانات'); return; }
  if(!data.appointments) data.appointments = [];
  var conflict = data.appointments.find(function(a){ return a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'extra'; });
  if(conflict){ showNotify('موجودة بالفعل'); return; }
  data.appointments.push({ id: genId(), groupId: groupId, date: dateISO, time: time, ruleId: null, type: 'extra' });
  saveData(); closeGenericModal();
  showNotify('تمت الإضافة');
  renderCalendar();
  updatePendingBadge();
}

function renderCalendarWeeklyView(body){
  var ref = new Date(calendarViewDate); ref.setHours(0,0,0,0);
  var ws = new Date(ref); ws.setDate(ws.getDate() - ws.getDay());
  var we = new Date(ws); we.setDate(we.getDate() + 6);
  var title = document.getElementById('calendarTitle');
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
    html += '<div class="' + cls + '"><div class="cal-weekly-day-header">' + DAY_NAMES[day.getDay()] + '<span class="date">' + day.getDate() + '/' + (day.getMonth()+1) + '</span></div>';
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
function renderCalendarListView(body){
  var sd = new Date(calendarViewDate); sd.setHours(0,0,0,0);
  var days = 14;
  var ed = new Date(sd); ed.setDate(ed.getDate() + days - 1);
  var title = document.getElementById('calendarTitle');
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
    html += '<div class="cal-list-day-group"><div class="cal-list-day-title">' + svgIcon('calendar', ICON_SIZES.sm) + ' ' + DAY_NAMES[day.getDay()] + ' — ' + day.getDate() + '/' + (day.getMonth()+1) + '/' + day.getFullYear() + (isToday ? ' (اليوم)' : '') + '</div>';
    occs.forEach(function(o){
      var meta = statusMeta[o.status] || statusMeta.upcoming;
      html += '<div class="cal-list-item" onclick="showOccurrenceDetails(\'' + o.dateISO + '\',\'' + o.groupId + '\',\'' + o.time + '\')"><span class="cal-list-item-time">' + escapeHtml(o.time) + '</span><span class="cal-list-item-name">' + escapeHtml(o.groupName) + '</span><span class="cal-list-item-status" style="color:' + meta.color + ';background:rgba(0,0,0,.1)">' + svgIcon(meta.icon, ICON_SIZES.xs) + ' ' + meta.label + '</span></div>';
    });
    html += '</div>';
  }
  if(!has) html += '<div class="home-empty-elegant" style="margin-top:12px">'
  + '<div class="he-icon">' + svgIcon('calendar', ICON_SIZES.xl) + '</div>'
  + '<div class="he-title">لا توجد حصص في هذه الفترة</div>'
  + '<div class="he-sub">جرّب السابق أو التالي للتنقل</div>'
  + '</div>';
  html += '</div>'; body.innerHTML = html;
}
function calendarNavigate(dir){
  if(currentCalendarView === 'monthly') calendarViewDate.setMonth(calendarViewDate.getMonth() + dir);
  else if(currentCalendarView === 'weekly') calendarViewDate.setDate(calendarViewDate.getDate() + dir*7);
  else calendarViewDate.setDate(calendarViewDate.getDate() + dir*14);
  renderCalendar();
}
function switchCalendarView(view){ currentCalendarView = view; renderCalendar(); }

function showOccurrenceDetails(dateISO, groupId, time){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  var tTZ = getTeacherTimezone(); var sTZ = g.timezone || tTZ;
  var sTime = convertTimeBetweenTimezones(dateISO, time, tTZ, sTZ);
  var dO = new Date(dateISO + 'T00:00:00');
  var dateDisplay = dO.getDate() + '/' + (dO.getMonth()+1) + '/' + dO.getFullYear();
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
  var body = '<div style="margin-bottom:10px;font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('folder-open', ICON_SIZES.md) + ' ' + escapeHtml(g.name) + '</div>'
    + '<div style="margin-bottom:6px;display:flex;align-items:center;gap:6px">' + svgIcon('calendar', ICON_SIZES.sm) + ' ' + DAY_NAMES[dO.getDay()] + '، ' + dateDisplay + '</div>'
    + '<div style="margin-bottom:6px;display:flex;align-items:center;gap:6px">' + svgIcon('clock', ICON_SIZES.sm) + ' ' + escapeHtml(time) + ' بتوقيتك</div>';
  if(sTZ !== tTZ){
    var diff = getTimezoneOffsetMinutes(sTZ, dO) - getTimezoneOffsetMinutes(tTZ, dO);
    var absD = Math.abs(diff);
    var dh = Math.floor(absD/60); var dm = absD%60;
    var dS = (diff >= 0 ? '+' : '-') + (dh > 0 ? dh + ' س' : '') + (dm > 0 ? ' ' + dm + ' د' : '');
    body += '<div style="margin-bottom:6px;display:flex;align-items:flex-start;gap:6px">' + svgIcon('globe', ICON_SIZES.sm) + '<div>' + escapeHtml(sTime) + ' بتوقيتهم (' + escapeHtml(sTZ) + ')<br><span style="color:var(--accent-blue);font-size:.85rem">الفارق: ' + dS + '</span></div></div>';
  }
  if(isEx) body += '<div style="margin-bottom:6px;font-size:.82rem;color:var(--accent-green);display:flex;align-items:center;gap:5px">' + svgIcon('plus', ICON_SIZES.xs) + ' حصة استثنائية</div>';
  body += '<div style="margin-bottom:12px;font-weight:700;color:' + meta.color + ';display:flex;align-items:center;gap:6px">' + svgIcon(meta.icon, ICON_SIZES.sm) + ' ' + meta.label + '</div>';
  if(g.link && g.link.trim()) body += '<div style="margin-bottom:12px"><button onclick="closeGenericModal();openInAppBrowser(\'' + escapeAttr(g.link) + '\')" style="background:var(--accent-blue);color:#fff;padding:10px 18px;border-radius:8px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:.9rem;display:inline-flex;align-items:center;gap:6px">' + svgIcon('external-link', ICON_SIZES.sm) + ' دخول الحصة</button></div>';
  var footer = '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>';
  if(st === 'upcoming' || st === 'pending'){
    footer += '<button class="btn btn-primary" style="width:auto;margin:0" onclick="startLessonFromCalendar(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\')">' + svgIcon('edit-3', ICON_SIZES.sm) + ' فتح الحصة</button>';
    if(isEx) footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',null,true,\'' + exId + '\')">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button>';
    else footer += '<button class="btn btn-secondary" style="width:auto;margin:0;color:var(--accent-amber);border-color:var(--accent-amber)" onclick="cancelOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\')">' + svgIcon('x-circle', ICON_SIZES.xs) + ' إلغاء</button><button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\',false,null)">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button>';
  } else if(st === 'completed'){
    if(sid) footer += '<button class="btn btn-primary" style="width:auto;margin:0" onclick="closeGenericModal();viewSession(\'' + sid + '\')">' + svgIcon('search', ICON_SIZES.sm) + ' عرض التقرير</button>';
    if(isEx) footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',null,true,\'' + exId + '\')">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button>';
    else footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\',false,null)">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button>';
  } else if(st === 'cancelled'){
    footer += '<button class="btn btn-secondary" style="width:auto;margin:0;color:var(--accent-green);border-color:var(--accent-green)" onclick="restoreOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\')">' + svgIcon('refresh', ICON_SIZES.sm) + ' استعادة</button>';
    if(isEx) footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',null,true,\'' + exId + '\')">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button>';
    else footer += '<button class="btn btn-danger" style="width:auto;margin:0" onclick="deleteOccurrence(\'' + groupId + '\',\'' + dateISO + '\',\'' + time + '\',\'' + rid + '\',false,null)">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button>';
  }
  openGenericModal('تفاصيل الحصة', body, footer);
}
function startLessonFromCalendar(groupId, dateISO, time){
  closeGenericModal();
  pickGroup(groupId);
  setTimeout(function(){
    document.getElementById('reportDate').value = dateISO;
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
    saveDraft();
    switchTab('lesson');
    showPreviousLesson(groupId, dateISO);
    showNotify('تم تحميل الحصة ' + names[idx]);
  }, 100);
}
function cancelOccurrence(groupId, dateISO, time, ruleId){
  closeGenericModal();
  if(!confirm('إلغاء هذه الحصة؟')) return;
  if(!data.appointments) data.appointments = [];
  var ex = data.appointments.find(function(a){ return a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'cancel'; });
  if(ex){ showNotify('ملغاة بالفعل'); return; }
  data.appointments.push({ id: genId(), groupId: groupId, date: dateISO, time: time, ruleId: ruleId, type: 'cancel' });
  saveData(); renderCalendar();
  showNotify('تم الإلغاء'); updatePendingBadge();
}
function restoreOccurrence(groupId, dateISO, time, ruleId){
  closeGenericModal();
  if(!data.appointments) return;
  data.appointments = data.appointments.filter(function(a){ return !(a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'cancel'); });
  saveData(); renderCalendar();
  showNotify('تم الاستعادة'); updatePendingBadge();
}
async function deleteOccurrence(groupId, dateISO, time, ruleId, isEx, exId){
  closeGenericModal();
  if(!confirm(isEx ? 'حذف هذه الحصة الاستثنائية؟' : 'حذف هذه الحصة من التقويم؟')) return;
  if(!data.appointments) data.appointments = [];
  if(isEx && exId) data.appointments = data.appointments.filter(function(a){ return a.id !== exId; });
  else {
    data.appointments = data.appointments.filter(function(a){ return !(a.groupId === groupId && a.date === dateISO && a.time === time && a.type === 'cancel'); });
    data.appointments.push({ id: genId(), groupId: groupId, date: dateISO, time: time, ruleId: ruleId, type: 'delete' });
  }
  await saveDataAsync(); renderCalendar();
  showNotify('تم الحذف'); updatePendingBadge();
}
function addExtraAppointmentPrompt(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  var today = new Date(); var dd = toDateISO(today);
  openGenericModal('حصة استثنائية', '<div class="form-field"><label>التاريخ</label><input type="date" id="extraApptDate" value="' + dd + '"></div><div class="form-field"><label>الساعة</label><input type="time" id="extraApptTime" value="18:00"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveExtraAppointment(\'' + groupId + '\')">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button>');
}
function saveExtraAppointment(groupId){
  var date = document.getElementById('extraApptDate').value;
  var time = document.getElementById('extraApptTime').value;
  if(!date || !time){ showNotify('أدخل التاريخ والوقت'); return; }
  if(!data.appointments) data.appointments = [];
  var c = data.appointments.find(function(a){ return a.groupId === groupId && a.date === date && a.time === time && a.type === 'extra'; });
  if(c){ showNotify('موجودة بالفعل'); return; }
  data.appointments.push({ id: genId(), groupId: groupId, date: date, time: time, ruleId: null, type: 'extra' });
  saveData(); closeGenericModal();
  showNotify('تمت الإضافة');
  if(currentViewGroupId === groupId) openGroupDetail(groupId);
  if(document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
  updatePendingBadge();
}
function renderGroupExceptions(groupId){
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
    html += '<div class="sched-row"><div class="sched-row-info"><div class="sched-row-title" style="color:' + col + '">' + svgIcon(icon, ICON_SIZES.xs) + ' ' + lbl + '</div><div class="sched-row-meta">' + svgIcon('calendar', ICON_SIZES.xs) + ' ' + escapeHtml(a.date.split('-').reverse().join('/')) + ' — ' + svgIcon('clock', ICON_SIZES.xs) + ' ' + escapeHtml(a.time) + '</div></div><button class="btn btn-danger btn-sm" onclick="removeAppointmentException(\'' + a.id + '\')">إزالة</button></div>';
  });
  return html;
}
async function removeAppointmentException(id){
  if(!confirm('إزالة هذا الاستثناء؟')) return;
  data.appointments = (data.appointments || []).filter(function(a){ return a.id !== id; });
  await saveDataAsync();
  if(currentViewGroupId) openGroupDetail(currentViewGroupId);
  if(document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
  updatePendingBadge();
  showNotify('تمت الإزالة');
}
function renderSchedule(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if(!g || !g.schedule || !g.schedule.length) return '<div class="cfg-empty">لا توجد مواعيد متكررة</div>';
  var tz = g.timezone || getTeacherTimezone();
  var html = '';
  g.schedule.forEach(function(r){
    html += '<div class="sched-row"><div class="sched-row-info"><div class="sched-row-title">' + svgIcon('calendar', ICON_SIZES.xs) + ' كل ' + DAY_NAMES[r.dayOfWeek] + ' — ' + escapeHtml(r.time) + '</div><div class="sched-row-meta">' + svgIcon('globe', ICON_SIZES.xs) + ' ' + escapeHtml(tz) + '</div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="editSchedulePrompt(\''+groupId+'\',\''+r.id+'\')" title="تعديل">' + svgIcon('edit-3', ICON_SIZES.xs) + '</button><button class="btn btn-danger btn-sm" onclick="deleteScheduleRule(\''+groupId+'\',\''+r.id+'\')" title="حذف">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button></div></div>';
  });
  return html;
}
function addSchedulePrompt(groupId){
  var opts = DAY_NAMES.map(function(n, i){ return '<option value="'+i+'">'+n+'</option>'; }).join('');
  openGenericModal('موعد متكرر', '<div class="form-field"><label>اليوم</label><select id="newSchedDay">'+opts+'</select></div><div class="form-field"><label>الساعة</label><input type="time" id="newSchedTime" value="18:00"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveScheduleRule(\''+groupId+'\', null)">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button>');
}
function editSchedulePrompt(groupId, ruleId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  var r = g.schedule.find(function(x){ return x.id === ruleId; }); if(!r) return;
  var opts = DAY_NAMES.map(function(n, i){ return '<option value="'+i+'"'+(i===r.dayOfWeek?' selected':'')+'>'+n+'</option>'; }).join('');
  openGenericModal('تعديل الموعد', '<div class="form-field"><label>اليوم</label><select id="newSchedDay">'+opts+'</select></div><div class="form-field"><label>الساعة</label><input type="time" id="newSchedTime" value="'+escapeAttr(r.time)+'"></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveScheduleRule(\''+groupId+'\', \''+ruleId+'\')">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button>');
}
function saveScheduleRule(groupId, ruleId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  if(!g.schedule) g.schedule = [];
  var d = parseInt(document.getElementById('newSchedDay').value);
  var t = document.getElementById('newSchedTime').value;
  if(!t || !/^\d{2}:\d{2}$/.test(t)){ showNotify('وقت غير صالح'); return; }
  if(ruleId){
    var r = g.schedule.find(function(x){ return x.id === ruleId; }); if(!r) return;
    r.dayOfWeek = d; r.time = t;
  } else g.schedule.push({ id: genId(), dayOfWeek: d, time: t, createdAt: toDateISO(new Date()) });
  saveData(); closeGenericModal();
  var c = document.getElementById('groupScheduleContainer'); if(c) c.innerHTML = renderSchedule(groupId);
  showNotify('تم الحفظ');
  if(document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
  updatePendingBadge();
}
async function deleteScheduleRule(groupId, ruleId){
  if(!confirm('حذف هذا الموعد؟')) return;
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g || !g.schedule) return;
  g.schedule = g.schedule.filter(function(r){ return r.id !== ruleId; });
  data.appointments = (data.appointments || []).filter(function(a){ return a.ruleId !== ruleId; });
  await saveDataAsync();
  var c = document.getElementById('groupScheduleContainer'); if(c) c.innerHTML = renderSchedule(groupId);
  var e = document.getElementById('groupExceptionsContainer'); if(e) e.innerHTML = renderGroupExceptions(groupId);
  showNotify('تم الحذف'); updatePendingBadge();
}

/* ═══════════════ CUSTOM ROW TYPES & STATIC TEXTS ═══════════════ */
function renderCustomRowTypes(groupId){
  var g = data.groups.find(function(x){ return x.id === groupId; });
  if(!g || !g.reportSettings || !g.reportSettings.customRowTypes || !g.reportSettings.customRowTypes.length) return '<div class="cfg-empty">لا توجد أنواع</div>';
  var html = '';
  g.reportSettings.customRowTypes.forEach(function(t){
    html += '<div class="cfg-row"><div class="cfg-row-info"><div class="cfg-row-title">'+escapeHtml(t.name || '(بدون)')+'</div><div class="cfg-row-meta"><span class="cfg-badge">'+escapeHtml(SECTION_LABELS[t.section]||t.section)+'</span><span class="cfg-badge blue">'+escapeHtml(FORM_LABELS[t.form]||t.form)+'</span></div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="openCustomRowTypeEditor(\'group\', \''+groupId+'\', \''+t.id+'\')" title="تعديل">' + svgIcon('edit-3', ICON_SIZES.xs) + '</button><button class="btn btn-danger btn-sm" onclick="deleteCustomRowType(\''+groupId+'\', \''+t.id+'\')" title="حذف">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button></div></div>';
  });
  return html;
}
function openCustomRowTypeEditor(ownerType, groupId, typeId){
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g) return;
  if(!g.reportSettings) g.reportSettings = { customRowTypes: [], staticTexts: [] };
  if(!g.reportSettings.customRowTypes) g.reportSettings.customRowTypes = [];
  var ex = typeId ? g.reportSettings.customRowTypes.find(function(t){ return t.id === typeId; }) : null;
  var isE = !!ex;
  var name = ex ? ex.name : '';
  var sec = ex ? ex.section : 'study';
  var form = ex ? ex.form : 'surah-ayat';
  var sO = Object.keys(SECTION_LABELS).map(function(k){ return '<option value="'+k+'"'+(k===sec?' selected':'')+'>'+SECTION_LABELS[k]+'</option>'; }).join('');
  var fO = Object.keys(FORM_LABELS).map(function(k){ return '<option value="'+k+'"'+(k===form?' selected':'')+'>'+FORM_LABELS[k]+'</option>'; }).join('');
  openGenericModal(isE ? 'تعديل نوع' : 'نوع جديد', '<div class="form-field"><label>اسم النوع</label><input type="text" id="customTypeName" value="'+escapeAttr(name)+'" placeholder="مثال: استكمال المقرأة"></div><div class="form-row-2"><div class="form-field"><label>القسم</label><select id="customTypeSection">'+sO+'</select></div><div class="form-field"><label>الشكل</label><select id="customTypeForm">'+fO+'</select></div></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveCustomRowType(\''+groupId+'\', '+(isE ? '\''+typeId+'\'' : 'null')+')">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button>');
  setTimeout(function(){ var i = document.getElementById('customTypeName'); if(i) i.focus(); }, 50);
}
function saveCustomRowType(groupId, typeId){
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
function deleteCustomRowType(groupId, typeId){
  if(!confirm('حذف هذا النوع؟')) return;
  var g = data.groups.find(function(x){ return x.id === groupId; }); if(!g || !g.reportSettings || !g.reportSettings.customRowTypes) return;
  g.reportSettings.customRowTypes = g.reportSettings.customRowTypes.filter(function(t){ return t.id !== typeId; });
  saveData();
  var c = document.getElementById('groupCustomRowTypesContainer'); if(c) c.innerHTML = renderCustomRowTypes(groupId);
  showNotify('تم الحذف');
}
function renderStaticTexts(ownerType, ownerId){
  var o = ownerType === 'group' ? data.groups.find(function(x){ return x.id === ownerId; }) : data.students.find(function(x){ return x.id === ownerId; });
  if(!o) return '';
  var texts = ownerType === 'group' ? (o.reportSettings && o.reportSettings.staticTexts) : o.staticTexts;
  if(!texts || !texts.length) return '<div class="cfg-empty">لا توجد نصوص</div>';
  var html = '';
  texts.forEach(function(t){
    var mL = MODE_LABELS[t.mode] || t.mode;
    var tL = (t.mode === 'suffix' && t.targetType) ? ' (' + escapeHtml(t.targetType) + ')' : '';
    html += '<div class="cfg-row"><div class="cfg-row-info"><div class="cfg-row-title">'+escapeHtml(t.text || '(بدون)')+'</div><div class="cfg-row-meta"><span class="cfg-badge">'+escapeHtml(SECTION_LABELS[t.section]||t.section)+'</span><span class="cfg-badge">'+escapeHtml(SUBJECT_LABELS_ST[t.subject]||SUBJECT_LABELS_ST.quran)+'</span><span class="cfg-badge '+(t.mode === 'suffix' ? 'amber' : 'blue')+'">'+escapeHtml(mL)+tL+'</span></div></div><div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="openStaticTextEditor(\''+ownerType+'\', \''+ownerId+'\', \''+t.id+'\')" title="تعديل">' + svgIcon('edit-3', ICON_SIZES.xs) + '</button><button class="btn btn-danger btn-sm" onclick="deleteStaticText(\''+ownerType+'\', \''+ownerId+'\', \''+t.id+'\')" title="حذف">' + svgIcon('trash-2', ICON_SIZES.xs) + '</button></div></div>';
  });
  return html;
}
function openStaticTextEditor(ownerType, ownerId, textId){
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
  var sO = Object.keys(SECTION_LABELS).map(function(k){ return '<option value="'+k+'"'+(k===sec?' selected':'')+'>'+SECTION_LABELS[k]+'</option>'; }).join('');
  var subO = Object.keys(SUBJECT_LABELS_ST).map(function(k){ return '<option value="'+k+'"'+(k===sub?' selected':'')+'>'+SUBJECT_LABELS_ST[k]+'</option>'; }).join('');
  var mO = Object.keys(MODE_LABELS).map(function(k){ return '<option value="'+k+'"'+(k===mode?' selected':'')+'>'+MODE_LABELS[k]+'</option>'; }).join('');
  var tO = ALL_ROW_TYPES.map(function(t){ return '<option value="'+escapeAttr(t)+'"'+(t===tT?' selected':'')+'>'+escapeHtml(t)+'</option>'; }).join('');
  openGenericModal(isE ? 'تعديل نص' : 'نص جديد', '<div class="form-field"><label>النص</label><textarea id="staticTextContent" style="min-height:80px;font-family:inherit">'+escapeHtml(text)+'</textarea></div><div class="form-row-2"><div class="form-field"><label>القسم</label><select id="staticTextSection">'+sO+'</select></div><div class="form-field"><label>المادة</label><select id="staticTextSubject">'+subO+'</select></div></div><div class="form-row-2"><div class="form-field"><label>الموضع</label><select id="staticTextMode" onchange="toggleStaticTextTarget()">'+mO+'</select></div><div class="form-field" id="staticTextTargetGroup" style="display:'+(mode==='suffix'?'block':'none')+'"><label>النوع المستهدف</label><select id="staticTextTargetType">'+tO+'</select></div></div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="saveStaticText(\''+ownerType+'\', \''+ownerId+'\', '+(isE ? '\''+textId+'\'' : 'null')+')">' + svgIcon('save', ICON_SIZES.sm) + ' حفظ</button>');
  setTimeout(function(){ var i = document.getElementById('staticTextContent'); if(i) i.focus(); }, 50);
}
function toggleStaticTextTarget(){
  var m = document.getElementById('staticTextMode').value;
  var g = document.getElementById('staticTextTargetGroup');
  if(g) g.style.display = (m === 'suffix') ? 'block' : 'none';
}
function saveStaticText(ownerType, ownerId, textId){
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
function deleteStaticText(ownerType, ownerId, textId){
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
function getRowTypeForm(typeName){
  var c = currentCustomRowTypes.find(function(t){ return t.name === typeName; });
  return c ? (c.form || 'surah-ayat') : 'surah-ayat';
}
function buildTypeOptions(isStudy, selectedLabel){
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
function handleRowTypeChange(select){
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
function rebuildAllRowDropdowns(){
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
function renderActiveStaticTexts(){
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
  items.forEach(function(it){
    var hidden = currentHiddenStaticIds.indexOf(it.id) !== -1;
    var tl = (it.mode === 'suffix' && it.targetType) ? ' · ' + escapeHtml(it.targetType) : '';
    html += '<label class="static-text-item'+(hidden?' unchecked':'')+'"><input type="checkbox" '+(hidden?'':'checked')+' onchange="toggleStaticTextActive(\''+it.id+'\', this.checked)"><div class="static-text-body"><div class="static-text-text">'+escapeHtml(it.text)+'</div><div class="static-text-meta"><span class="cfg-badge">' + svgIcon(it.owner === 'group' ? 'folder-open' : 'user', ICON_SIZES.xs) + ' ' + escapeHtml(it.ownerName) + '</span><span class="cfg-badge blue">'+escapeHtml(SECTION_LABELS[it.section]||it.section)+'</span><span class="cfg-badge amber">'+escapeHtml(MODE_LABELS[it.mode]||it.mode)+tl+'</span></div></div></label>';
  });
  list.innerHTML = html;
}
function toggleStaticTextActive(id, checked){
  if(checked) currentHiddenStaticIds = currentHiddenStaticIds.filter(function(x){ return x !== id; });
  else { if(currentHiddenStaticIds.indexOf(id) === -1) currentHiddenStaticIds.push(id); }
  scheduleSaveDraft();
  renderActiveStaticTexts();
}

/* ═══════════════ SEARCH ═══════════════ */
function extractPreview(text, q){
  var lt = text.toLowerCase();
  var lq = q.toLowerCase();
  var idx = lt.indexOf(lq);
  if(idx === -1) return text.substring(0, 120) + '...';
  var s = Math.max(0, idx - 40);
  var e = Math.min(text.length, idx + q.length + 80);
  return (s > 0 ? '...' : '') + text.substring(s, e) + (e < text.length ? '...' : '').replace(/\n/g, ' ');
}
function doSearch(){
  var q = normalize(document.getElementById('searchInput').value);
  var c = document.getElementById('searchResults');
  if(!q){ c.innerHTML = ''; return; }
  var lq = q.toLowerCase();
  var res = [];
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
        t = (g ? g.name : '—') + ' — ' + MONTH_NAMES[r.month-1] + ' ' + r.year;
      } else {
        var st = data.students.find(function(x){ return x.id === r.ownerId; });
        t = (st ? st.name : '—') + ' — ' + MONTH_NAMES[r.month-1] + ' ' + r.year;
      }
      res.push({ type: 'monthly', id: r.id, title: t, preview: extractPreview(r.text, q) });
    }
  });
  if(!res.length){ c.innerHTML = '<div class="home-empty">لا نتائج</div>'; return; }
  var html = '<div style="padding:8px 0;color:var(--text-muted);font-size:.85rem">' + res.length + ' نتيجة</div>';
  res.forEach(function(r){
    var a = r.type === 'session' ? 'viewSession(\'' + r.id + '\')' : 'viewMonthlyReport(\'' + r.id + '\')';
    var icon = r.type === 'session' ? 'file-text' : 'calendar';
    html += '<div class="home-recent-item" onclick="' + a + '"><div style="min-width:0;flex:1"><div class="home-recent-name" style="display:flex;align-items:center;gap:6px">' + svgIcon(icon, ICON_SIZES.sm) + ' ' + escapeHtml(r.title) + '</div><div class="home-recent-date" style="white-space:normal;line-height:1.4">' + escapeHtml(r.preview) + '</div></div><div class="home-recent-arrow">' + svgIcon('chevron-left', ICON_SIZES.md) + '</div></div>';
  });
  c.innerHTML = html;
}

/* ═══════════════ PENDING BADGE ═══════════════ */
function updatePendingBadge(){
  var count = getPendingCount(14);
  ['calendarBadge', 'calendarBadgeMobile'].forEach(function(id){
    var b = document.getElementById(id);
    if(!b) return;
    if(count > 0){ b.textContent = count; b.style.display = 'inline-block'; }
    else b.style.display = 'none';
  });
}

/* ═══════════════ NOTIFICATIONS ═══════════════ */
function playAlarmBeep(){
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
function vibrateAlarm(){
  if(data.settings.notifVibrate === false) return;
  var p = data.settings.notifVibratePattern || 'short';
  if(p === 'off') return;
  var arr = p === 'long' ? [300,150,300,150,300,150] : [200,100,200];
  if(navigator.vibrate){ try { navigator.vibrate(arr); } catch(e){} }
}
function sendSystemNotification(t, b){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(t, { body: b, tag: 'lesson-reminder' }); } catch(e){}
}
function requestNotifPermission(){
  if(!('Notification' in window)){ showNotify('المتصفح لا يدعم'); return; }
  if(Notification.permission === 'granted'){ showNotify('مفعّلة بالفعل'); return; }
  Notification.requestPermission().then(function(p){
    if(p === 'granted') showNotify('تم تفعيل الإشعارات');
    else showNotify('تم رفض الإشعارات');
  });
}
function testAlarmSound(){
  playAlarmBeep();
  if(data.settings.notifVibrate !== false) vibrateAlarm();
  showNotify('تم تشغيل الصوت');
}
function isInQuietHours(){
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
function startRepeatBeep(){
  if(_repeatBeepInterval) clearInterval(_repeatBeepInterval);
  var iv = Math.max(10, (data.settings.notifRepeatInterval || 30)) * 1000;
  _repeatBeepInterval = setInterval(function(){
    if(!currentReminderInfo){ clearInterval(_repeatBeepInterval); _repeatBeepInterval = null; return; }
    if(!isInQuietHours()){ playAlarmBeep(); vibrateAlarm(); }
  }, iv);
}
function stopRepeatBeep(){
  if(_repeatBeepInterval){ clearInterval(_repeatBeepInterval); _repeatBeepInterval = null; }
}
function triggerLessonAlarm(lesson){
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
function saveNotificationSettings(){
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
function getUpcomingLessons(within){
  var res = [];
  var now = new Date();
  var th = within + 120;
  var days = Math.ceil(th / 1440) + 1;
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
        res.push({ key: o.groupId + '_' + di + '_' + o.time, diffMin: dm, groupId: o.groupId, groupName: o.groupName, time: o.time, dateISO: di, dateDisplay: day.getDate() + '/' + (day.getMonth()+1), dayName: DAY_NAMES[day.getDay()], status: o.status });
      }
    });
  }
  res.sort(function(a,b){ return a.diffMin - b.diffMin; });
  return res;
}
function checkUpcomingReminder(){
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
  textEl.innerHTML = 'حصة ' + escapeHtml(l.groupName) + ' — ' + tt + '<small>' + svgIcon('calendar', ICON_SIZES.xs) + ' ' + l.dayName + '، ' + l.dateDisplay + ' — ' + svgIcon('clock', ICON_SIZES.xs) + ' ' + l.time + '</small>';
  currentReminderInfo = l;
}
function startFromReminder(){
  if(!currentReminderInfo) return;
  stopRepeatBeep();
  var info = currentReminderInfo;
  var bar = document.getElementById('lessonReminderBar'); if(bar) bar.classList.remove('show');
  startLessonFromCalendar(info.groupId, info.dateISO, info.time);
  currentReminderInfo = null;
}
function dismissReminder(){
  if(!currentReminderInfo) return;
  stopRepeatBeep();
  dismissedReminders[currentReminderInfo.key] = Date.now() + 30*60*1000;
  var bar = document.getElementById('lessonReminderBar'); if(bar) bar.classList.remove('show', 'urgent');
  currentReminderInfo = null;
  setTimeout(checkUpcomingReminder, 1000);
}
function startReminderInterval(){
  if(reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(checkUpcomingReminder, 30000);
  checkUpcomingReminder();
}

/* ═══════════════ ICS EXPORT ═══════════════ */
function padICS(n){ return String(n).padStart(2,'0'); }
function escapeICSText(s){ if(!s) return ''; return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function utcStamp(){ var d = new Date(); return d.getUTCFullYear() + padICS(d.getUTCMonth()+1) + padICS(d.getUTCDate()) + 'T' + padICS(d.getUTCHours()) + padICS(d.getUTCMinutes()) + padICS(d.getUTCSeconds()) + 'Z'; }
function addMinutesToTimeHM(t, m){ var p = t.split(':').map(Number); var tot = p[0]*60 + p[1] + m; tot = ((tot % 1440) + 1440) % 1440; return padICS(Math.floor(tot/60)) + ':' + padICS(tot % 60); }
function exportICS(months){
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
function formatDuration(minutes){
  if(!minutes || minutes < 1) return '0 دقيقة';
  var h = Math.floor(minutes/60), m = minutes % 60;
  var p = [];
  if(h > 0){ if(h === 1) p.push('ساعة'); else if(h === 2) p.push('ساعتان'); else if(h >= 3 && h <= 10) p.push(h + ' ساعات'); else p.push(h + ' ساعة'); }
  if(m > 0) p.push(m + ' دقيقة');
  return p.join(' و ');
}
function getWorkStats(locFilter){
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
function getWorkStatsByLocation(){
  var locs = data.settings.workLocations || [];
  var r = { _all: getWorkStats(null), byLocation: {} };
  locs.forEach(function(l){ r.byLocation[l] = getWorkStats(l); });
  r.byLocation['__none__'] = getWorkStats('');
  return r;
}
function showWorkStatsModal(e){
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
    brkHtml += '<div class="cfg-row"><span style="display:flex;align-items:center;gap:6px">' + svgIcon('building-2', ICON_SIZES.sm) + ' ' + escapeHtml(lbl) + '</span><span style="color:var(--accent-green);font-weight:700">' + formatDuration(st.total) + '</span></div>';
  });
  var recent = (data.sessions || []).slice().sort(function(a,b){ return (b.date||'').localeCompare(a.date||'') || (b.savedAt||'').localeCompare(a.savedAt||''); }).slice(0, 20);
  var recHtml = '';
  if(recent.length){
    recHtml = '<div style="margin-top:20px"><h4 style="font-size:.92rem;margin:0 0 10px;color:var(--accent-green);font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('list', ICON_SIZES.sm) + ' آخر الحصص</h4>';
    recent.forEach(function(s2){
      var g = data.groups.find(function(x){ return x.id === s2.groupId; });
      var df = s2.date ? s2.date.split('-').reverse().join('/') : '—';
      recHtml += '<div class="cfg-row"><span style="color:var(--accent-green);display:flex;align-items:center;gap:5px">' + svgIcon('clock', ICON_SIZES.xs) + ' ' + formatDuration(parseInt(s2.duration)||0) + '</span><span style="color:var(--text-muted);font-size:.75rem">' + escapeHtml(g?g.name:'—') + ' — ' + escapeHtml(df) + '</span></div>';
    });
    recHtml += '</div>';
  } else recHtml = '<div class="cfg-empty">لا توجد حصص بعد</div>';
  var body = '<div class="stats-row" style="margin-bottom:16px">'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(s.today) + '</div><div class="stat-label">اليوم</div></div>'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(s.week) + '</div><div class="stat-label">الأسبوع</div></div>'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(s.month) + '</div><div class="stat-label">الشهر</div></div>'
    + '<div class="stat-pill"><div class="stat-value">' + formatDuration(s.total) + '</div><div class="stat-label">الإجمالي</div></div>'
    + '</div>' + (brkHtml ? '<div style="margin-bottom:16px"><h4 style="font-size:.92rem;margin:0 0 8px;color:var(--accent-green);font-weight:700;display:flex;align-items:center;gap:6px">' + svgIcon('building-2', ICON_SIZES.sm) + ' حسب المكان</h4>' + brkHtml + '</div>' : '') + recHtml;
  openGenericModal('ساعات الحصص', body, '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
}

/* ═══════════════ TIMER ═══════════════ */
function getTimerElapsedMs(){
  if(!data.activeTimer) return 0;
  var t = data.activeTimer;
  var e = t.pausedAt ? new Date(t.pausedAt).getTime() : Date.now();
  return Math.max(0, e - new Date(t.startAt).getTime() - (t.totalPausedMs || 0));
}
function toggleLessonTimer(){
  if(!data.activeTimer) startLessonTimer(false);
  else if(data.activeTimer.pausedAt) resumeLessonTimer();
  else pauseLessonTimer();
}
function startLessonTimer(silent){
  if(data.activeTimer){ if(!silent) showNotify('يوجد مؤقّت'); return; }
  data.activeTimer = { type: 'lesson', startAt: new Date().toISOString(), pausedAt: null, totalPausedMs: 0, linkedSessionId: null };
  saveData(); updateLessonTimerDisplay();
  if(!silent){ showNotify('بدأ المؤقّت'); ensureAudioContext(); }
}
function pauseLessonTimer(){
  if(!data.activeTimer || data.activeTimer.pausedAt) return;
  data.activeTimer.pausedAt = new Date().toISOString();
  saveData(); updateLessonTimerDisplay();
  showNotify('تم الإيقاف المؤقت');
}
function resumeLessonTimer(){
  if(!data.activeTimer || !data.activeTimer.pausedAt) return;
  var pm = Date.now() - new Date(data.activeTimer.pausedAt).getTime();
  data.activeTimer.totalPausedMs = (data.activeTimer.totalPausedMs || 0) + pm;
  data.activeTimer.pausedAt = null;
  saveData(); updateLessonTimerDisplay();
  showNotify('تم الاستئناف');
}
function stopLessonTimer(silent){
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
function updateLessonTimerDisplay(){
  var w = document.getElementById('lessonTimerWidget');
  var el = document.getElementById('lessonTimerDisplay');
  var btn = document.getElementById('lessonTimerBtn');
  var stopBtn = document.getElementById('lessonTimerStopBtn');
  if(!el || !btn || !w) return;
  if(!data.activeTimer){
    el.textContent = '00:00:00';
    btn.innerHTML = svgIcon('play', ICON_SIZES.md);
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
  if(stopBtn){ stopBtn.style.display = 'inline-flex'; stopBtn.innerHTML = svgIcon('square', ICON_SIZES.md); }
  if(data.activeTimer.pausedAt){
    btn.innerHTML = svgIcon('play', ICON_SIZES.md);
    btn.className = 'icon-btn primary';
    btn.title = 'استئناف';
    w.classList.add('active', 'paused');
  } else {
    btn.innerHTML = svgIcon('pause', ICON_SIZES.md);
    btn.className = 'icon-btn';
    btn.title = 'إيقاف مؤقت';
    w.classList.add('active');
    w.classList.remove('paused');
  }
}
function startLessonTimerInterval(){ setInterval(updateLessonTimerDisplay, 1000); }

/* ═══════════════ BULK / FOLDER IMPORT ═══════════════ */
function openBulkImport(){
  openGenericModal('استيراد نصوص', '<p style="font-size:.85rem;color:var(--text-muted);margin-bottom:10px">الصق نصوص التقارير:</p><textarea id="bulkImportText" style="height:350px;resize:vertical;font-family:monospace;font-size:13px;direction:rtl" placeholder="اسم الجروب : ..."></textarea>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button><button class="btn btn-primary" style="width:auto;margin:0" onclick="doBulkImport()">بدء</button>');
}
function doBulkImport(){
  var t = document.getElementById('bulkImportText').value;
  if(!t.trim()){ showNotify('فارغ'); return; }
  var c = parseBulkReports(t);
  if(c > 0){ closeGenericModal(); switchTab('library'); }
}
function parseBulkReports(text){
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
function handleFolderImport(e){
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
function parseFolderFile(text, gname, yr, mo){
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

/* ═══════════════════════════════════════════════════════════
   IN-APP BROWSER MODULE
   ═══════════════════════════════════════════════════════════ */

function isMobile(){
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
function getDomain(url){
  try {
    var u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch(e){ return ''; }
}
function getFavColor(domain){
  if (!domain) return FAV_COLORS[0];
  var hash = 0;
  for (var i = 0; i < domain.length; i++){
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FAV_COLORS[Math.abs(hash) % FAV_COLORS.length];
}
function getFavIcon(domain){
  if (!domain) return '';
  return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64';
}

/* Load/save favorites */
function loadFavorites(){
  try {
    var raw = localStorage.getItem(BROWSER_FAVS_KEY);
    if (raw) browserState.favorites = JSON.parse(raw) || [];
  } catch(e){ browserState.favorites = []; }
}
function saveFavorites(){
  try { localStorage.setItem(BROWSER_FAVS_KEY, JSON.stringify(browserState.favorites)); }
  catch(e){ showNotify('فشل حفظ المفضلة'); }
}
function isFavorited(url){
  var norm = normalizeUrl(url);
  return browserState.favorites.some(function(f){ return f.url === norm; });
}
/* فتح رابط الحصة: توجيه ذكي بحسب المنصة */
function openLessonLink(url){
  url = normalizeUrl(url);
  if (!url){ showNotify('لا يوجد رابط'); return; }

  var conf = detectConference(url);

  /* رابط عادي → المتصفح الداخلي (السلوك القديم) */
  if (!conf){
    openInAppBrowser(url);
    return;
  }

  /* Meet & Teams: لا deep link موثوق → متصفح خارجي مباشرة */
  if (conf.platform === 'meet' || conf.platform === 'teams'){
    showNotify('فتح ' + conf.name + ' في المتصفح الخارجي...');
    try { window.open(url, '_blank', 'noopener'); } catch(e){}
    return;
  }

  /* Zoom / Webex / Skype → محاولة فتح التطبيق المثبّت */
  showNotify('محاولة فتح ' + conf.name + '...');

  var appOpened = false;
  var fallbackTimer = null;
  var visHandler = null;
  var blurHandler = null;

  function cleanup(){
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (visHandler) document.removeEventListener('visibilitychange', visHandler);
    if (blurHandler) window.removeEventListener('blur', blurHandler);
  }

  visHandler = function(){
    if (document.hidden){ appOpened = true; cleanup(); }
  };
  blurHandler = function(){ appOpened = true; };

  document.addEventListener('visibilitychange', visHandler);
  window.addEventListener('blur', blurHandler, { once: true });

  /* محاولة فتح الـ deep link عبر نقرة على رابط خفي */
  var a = document.createElement('a');
  a.href = conf.deepLink;
  a.style.display = 'none';
  a.rel = 'noopener';
  document.body.appendChild(a);
  try { a.click(); } catch(e){ console.error('deep link click failed', e); }
  setTimeout(function(){ try { a.remove(); } catch(e){} }, 500);

  /* احتياطي: إن لم يفتح التطبيق خلال ٢.٥ ثانية → نافذة "افتح في المتصفح" */
  fallbackTimer = setTimeout(function(){
    cleanup();
    if (!appOpened && !document.hidden){
      openGenericModal(
        'فتح ' + conf.name,
        '<p style="margin-bottom:12px;line-height:1.6">لم يفتح تطبيق <b>' + escapeHtml(conf.name) + '</b> تلقائيًا.<br>قد يكون غير مثبّت على هذا الجهاز، أو رفض المتصفح فتحه.</p><p style="margin-bottom:12px;line-height:1.6">هل تريد فتح الرابط في المتصفح الخارجي؟</p>',
        '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
        + '<button class="btn btn-primary" style="width:auto;margin:0" onclick="closeGenericModal();openExternalUrl(\'' + escapeAttr(url) + '\')">فتح في المتصفح</button>'
      );
    }
  }, 2500);
}

function openExternalUrl(url){
  try { window.open(url, '_blank', 'noopener'); } catch(e){ showNotify('تعذّر الفتح'); }
}

/* Open browser */
function openInAppBrowser(url){
  if (url && typeof url === 'string'){
    var norm = normalizeUrl(url);
    if (detectConference(norm)){ openLessonLink(norm); return; }
  }
  var overlay = document.getElementById('browserOverlay');
  if (!overlay) return;
  document.body.classList.add('browser-open');
  overlay.style.display = 'flex';
  loadFavorites();

  if (!browserState.tabs.length){
    if (!loadBrowserState()){
      browserState.tabs = [createBrowserTab(null)];
      browserState.activeTabId = browserState.tabs[0].id;
    }
  }

  var activeTab = getActiveTab();

  if (url && typeof url === 'string'){
    var targetUrl = normalizeUrl(url);
    if (activeTab && !activeTab.url && activeTab.isHome) navigateTab(activeTab, targetUrl);
    else browserNewTab(targetUrl);
  } else {
    renderTabsBar();
    if (activeTab) renderTabContent(activeTab);
    var input = document.getElementById('browserUrlInput');
    if (input) setTimeout(function(){ input.focus(); }, 100);
  }
}
function closeBrowser(){
  var overlay = document.getElementById('browserOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.classList.remove('browser-open');
  var iframe = document.getElementById('browserIframe');
  if (iframe){
    iframe.src = 'about:blank';
    iframe.style.display = 'none';
    iframe.dataset.currentUrl = '';
  }
  saveBrowserState();
}

/* Show favorites landing */
function showBrowserFavorites(){
  document.getElementById('browserFavoritesView').style.display = 'block';
  document.getElementById('browserIframe').style.display = 'none';
  document.getElementById('browserFallback').style.display = 'none';
  renderBrowserFavorites();
}
function renderBrowserFavorites(){
  var grid = document.getElementById('browserFavsGrid');
  if (!grid) return;
  if (!browserState.favorites.length){
    grid.innerHTML = '<div class="browser-fav-empty" style="grid-column:1/-1">'
      + svgIcon('star', 48)
      + '<h3>لا توجد مواقع مفضلة بعد</h3>'
      + '<p>افتح أي موقع، ثم اضغط النجمة ⭐ في شريط العنوان لإضافته هنا. أو أضف موقعًا الآن من الزر أعلاه.</p>'
      + '</div>';
    return;
  }
  var html = '';
  browserState.favorites.forEach(function(f, i){
    var domain = getDomain(f.url);
    var color = getFavColor(domain);
    var letter = (f.name || domain || '?').charAt(0).toUpperCase();
    var iconUrl = getFavIcon(domain);
    html += '<div class="browser-fav-card drag-handle" draggable="true" data-index="' + i + '" onclick="openFavoriteUrl(' + i + ')">'
      + '<button class="browser-fav-remove" onclick="event.stopPropagation();removeFavorite(' + i + ')" title="حذف">×</button>'
      + '<img class="browser-fav-icon" src="' + iconUrl + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
      + '<div class="browser-fav-letter" style="background:' + color + ';display:none">' + escapeHtml(letter) + '</div>'
      + '<div class="browser-fav-name">' + escapeHtml(f.name) + '</div>'
      + '</div>';
  });
  grid.innerHTML = html;
  setupFavDragDrop();
}
function openFavoriteUrl(i){
  var f = browserState.favorites[i];
  if (!f) return;
  browserNavigateInActive(f.url);
}
function removeFavorite(i){
  if (!confirm('حذف هذا الموقع من المفضلة؟')) return;
  browserState.favorites.splice(i, 1);
  saveFavorites();
  renderBrowserFavorites();
  renderBookmarksBar();
  renderSettingsFavs();
  showBrowserToast('تم الحذف');
}

/* Drag & drop */
var _dragSrcIndex = null;
function setupFavDragDrop(){
  var grid = document.getElementById('browserFavsGrid');
  if (!grid) return;
  var cards = grid.querySelectorAll('.browser-fav-card');
  cards.forEach(function(card){
    card.addEventListener('dragstart', function(e){
      _dragSrcIndex = parseInt(card.dataset.index);
      card.classList.add('dragging');
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', _dragSrcIndex); }
    });
    card.addEventListener('dragend', function(){
      card.classList.remove('dragging');
      cards.forEach(function(c){ c.classList.remove('drag-over'); });
    });
    card.addEventListener('dragover', function(e){
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      if (parseInt(card.dataset.index) !== _dragSrcIndex) card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', function(){
      card.classList.remove('drag-over');
    });
    card.addEventListener('drop', function(e){
      e.preventDefault();
      card.classList.remove('drag-over');
      var targetIdx = parseInt(card.dataset.index);
      if (_dragSrcIndex === null || targetIdx === _dragSrcIndex) return;
      var moved = browserState.favorites.splice(_dragSrcIndex, 1)[0];
      browserState.favorites.splice(targetIdx, 0, moved);
      saveFavorites();
      renderBrowserFavorites();
      renderSettingsFavs();
      _dragSrcIndex = null;
    });
  });
  // Touch long-press for mobile
  cards.forEach(function(card){
    var pressTimer = null;
    card.addEventListener('touchstart', function(){
      pressTimer = setTimeout(function(){
        var idx = parseInt(card.dataset.index);
        showFavCardMenu(idx);
      }, 600);
    });
    card.addEventListener('touchend', function(){
      if (pressTimer) clearTimeout(pressTimer);
    });
    card.addEventListener('touchmove', function(){
      if (pressTimer) clearTimeout(pressTimer);
    });
  });
}
function showFavCardMenu(i){
  var f = browserState.favorites[i];
  if (!f) return;
  var body = '<div class="form-field"><label>الاسم</label><input type="text" id="editFavName" value="' + escapeAttr(f.name) + '"></div>'
    + '<div class="form-field"><label>الرابط</label><input type="url" id="editFavUrl" value="' + escapeAttr(f.url) + '"></div>';
  var footer = '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
    + '<button class="btn btn-danger" onclick="closeGenericModal();removeFavorite(' + i + ')" style="width:auto;margin:0">حذف</button>'
    + '<button class="btn btn-primary" onclick="saveFavoriteEdit(' + i + ')" style="width:auto;margin:0">حفظ</button>';
  openGenericModal('تعديل المفضلة', body, footer);
  setTimeout(function(){ var inp = document.getElementById('editFavName'); if (inp) inp.focus(); }, 50);
}
function saveFavoriteEdit(i){
  var f = browserState.favorites[i];
  if (!f) return;
  var name = (document.getElementById('editFavName').value || '').trim();
  var url = normalizeUrl((document.getElementById('editFavUrl').value || '').trim());
  if (!name || !url){ showNotify('أكمل البيانات'); return; }
  f.name = name;
  f.url = url;
  saveFavorites();
  closeGenericModal();
  renderBrowserFavorites();
  renderSettingsFavs();
  showNotify('تم الحفظ');
}

/* Add favorite prompt */
function promptAddFavorite(){
  var _t = getActiveTab();
  var currentUrl = (_t && _t.url) ? _t.url : '';
  var currentName = '';
  if (currentUrl){
    var domain = getDomain(currentUrl);
    currentName = domain;
  }
  var body = '<div class="form-field"><label>الاسم</label><input type="text" id="newFavName" value="' + escapeAttr(currentName) + '" placeholder="مثال: Zoom"></div>'
    + '<div class="form-field"><label>الرابط</label><input type="url" id="newFavUrl" value="' + escapeAttr(currentUrl) + '" placeholder="https://..."></div>';
  var footer = '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
    + '<button class="btn btn-primary" onclick="saveNewFavorite()" style="width:auto;margin:0">إضافة</button>';
  openGenericModal('إضافة موقع للمفضلة', body, footer);
  setTimeout(function(){ var inp = document.getElementById('newFavName'); if (inp) inp.focus(); }, 50);
}
function saveNewFavorite(){
  var name = (document.getElementById('newFavName').value || '').trim();
  var url = normalizeUrl((document.getElementById('newFavUrl').value || '').trim());
  if (!name || !url){ showNotify('أكمل البيانات'); return; }
  if (browserState.favorites.some(function(f){ return f.url === url; })){ showNotify('الموقع موجود بالفعل'); return; }
  browserState.favorites.push({ name: name, url: url, addedAt: new Date().toISOString() });
  saveFavorites();
  closeGenericModal();
  if (document.getElementById('browserOverlay').style.display === 'flex'){
    renderBrowserFavorites();
    renderBookmarksBar();
    updateBrowserFavButton();
  }
  renderSettingsFavs();
  showNotify('تمت الإضافة');
}

/* Toggle favorite for current URL */
function toggleBrowserFavorite(){
  var tab = getActiveTab();
  var url = tab && tab.url ? tab.url : '';
  if (!url){ showNotify('افتح موقعًا أولاً'); return; }
  var idx = browserState.favorites.findIndex(function(f){ return f.url === url; });
  if (idx >= 0){
    if (!confirm('إزالة هذا الموقع من المفضلة؟')) return;
    browserState.favorites.splice(idx, 1);
    saveFavorites();
    updateBrowserFavButton();
    renderBrowserFavorites();
    renderBookmarksBar();
    renderSettingsFavs();
    showBrowserToast('تمت الإزالة');
  } else {
    promptAddFavorite();
  }
}
function updateBrowserFavButton(){
  var btn = document.getElementById('browserFavBtn');
  if (!btn) return;
  var tab = getActiveTab();
  var url = tab && tab.url ? tab.url : '';
  if (url && isFavorited(url)){
    btn.innerHTML = svgIcon('star-filled', ICON_SIZES.md);
    btn.classList.add('fav-active');
    btn.title = 'إزالة من المفضلة';
  } else {
    btn.innerHTML = svgIcon('star', ICON_SIZES.md);
    btn.classList.remove('fav-active');
    btn.title = 'إضافة للمفضلة';
  }
}

/* Browser navigation */
function normalizeBrowserUrl(input){
  if (!input) return '';
  input = String(input).trim();
  if (!input) return '';
  // If it looks like a URL
  if (/^(https?:\/\/|www\.)/i.test(input) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(input)){
    return normalizeUrl(input);
  }
  // Otherwise: Google search
  return 'https://www.google.com/search?q=' + encodeURIComponent(input);
}
function browserNavigate(input){
  var url = normalizeBrowserUrl(input);
  if (!url) return;
  navigateBrowser(url);
}
function navigateBrowser(url){
  var targetUrl = normalizeBrowserUrl(url);
  if (!targetUrl) return;
  if (detectConference(targetUrl)){
    closeBrowser();
    openLessonLink(targetUrl);
    return;
  }
  var tab = getActiveTab();
  if (tab) navigateTab(tab, targetUrl);
  else browserNewTab(targetUrl);
}
function tryBuildDeepLink(url){
  for (var i = 0; i < DEEP_LINKS.length; i++){
    var m = url.match(DEEP_LINKS[i].pattern);
    if (m) return DEEP_LINKS[i].scheme(m);
  }
  return null;
}
function tryDeepLinkOrFallback(deepLink, fallbackUrl){
  var start = Date.now();
  var timer = setTimeout(function(){
    // If still here after 2.5s, assume app not installed
    if (Date.now() - start >= 2400){
      loadBrowserUrl(fallbackUrl);
    }
  }, 2500);
  // Attempt to open deep link
  try {
    window.location.href = deepLink;
    // If app opens, this page becomes hidden — clear timer
    document.addEventListener('visibilitychange', function handler(){
      if (document.hidden){
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', handler);
      }
    });
  } catch(e){
    clearTimeout(timer);
    loadBrowserUrl(fallbackUrl);
  }
}
/* دالة توافق قديمة — تُفوَّض إلى نظام التبويبات */
function loadBrowserUrl(url){ navigateBrowser(url); }
function updateBrowserTitle(title){
  document.title = title + ' — المتصفح';
}
function showBrowserFallback(){
  var iframe = document.getElementById('browserIframe');
  var fb = document.getElementById('browserFallback');
  if (iframe) iframe.style.display = 'none';
  if (fb) fb.style.display = 'flex';
}
function browserOpenExternal(){
  var tab = getActiveTab();
  if (tab && tab.url) window.open(tab.url, '_blank');
}
function browserGoHome(){
  var tab = getActiveTab();
  if (tab) goTabHome(tab);
}
function browserBack(){
  var tab = getActiveTab();
  if (!tab) return;
  if (tab.historyIndex > 0){
    tab.historyIndex--;
    tab.url = tab.history[tab.historyIndex];
    tab.title = getDomain(tab.url) || tab.url;
    tab.isHome = false;
    renderTabsBar();
    renderTabContent(tab);
    saveBrowserState();
  } else if (tab.url && !tab.isHome){
    goTabHome(tab);
  }
}
function browserForward(){
  var tab = getActiveTab();
  if (!tab) return;
  if (tab.historyIndex < tab.history.length - 1){
    tab.historyIndex++;
    tab.url = tab.history[tab.historyIndex];
    tab.title = getDomain(tab.url) || tab.url;
    tab.isHome = false;
    renderTabsBar();
    renderTabContent(tab);
    saveBrowserState();
  }
}
function browserReload(){
  var tab = getActiveTab();
  if (!tab) return;
  if (tab.url && !tab.isHome){
    var iframe = document.getElementById('browserIframe');
    if (iframe){
      var src = iframe.src;
      iframe.dataset.currentUrl = '';
      iframe.src = 'about:blank';
      setTimeout(function(){
        iframe.src = src;
        iframe.dataset.currentUrl = src;
      }, 50);
    }
    showBrowserToast('تم التحديث');
  } else {
    renderBrowserFavorites();
    showBrowserToast('تم التحديث');
  }
}
function updateBrowserNavButtons(){
  var tab = getActiveTab();
  var backBtn = document.getElementById('browserBackBtn');
  var fwdBtn = document.getElementById('browserForwardBtn');
  if (backBtn) backBtn.disabled = !tab || (tab.historyIndex <= 0 && (!tab.url || tab.isHome));
  if (fwdBtn) fwdBtn.disabled = !tab || (tab.historyIndex >= tab.history.length - 1);
}
function showBrowserToast(msg){
  var body = document.getElementById('browserBody');
  if (!body) return;
  var existing = body.querySelector('.browser-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'browser-toast';
  toast.textContent = msg;
  body.appendChild(toast);
  setTimeout(function(){ toast.classList.add('show'); }, 10);
  setTimeout(function(){ toast.classList.remove('show'); setTimeout(function(){ toast.remove(); }, 300); }, 2000);
}

/* Settings favorites grid */
function renderSettingsFavs(){
  var grid = document.getElementById('settingsFavsGrid');
  if (!grid) return;
  loadFavorites();
  if (!browserState.favorites.length){
    grid.innerHTML = '<div class="cfg-empty" style="grid-column:1/-1">لا توجد مواقع مفضلة بعد</div>';
    return;
  }
  var html = '';
  browserState.favorites.forEach(function(f, i){
    var domain = getDomain(f.url);
    var color = getFavColor(domain);
    var letter = (f.name || domain || '?').charAt(0).toUpperCase();
    var iconUrl = getFavIcon(domain);
    html += '<div class="browser-fav-card" onclick="openInAppBrowser(\'' + escapeAttr(f.url) + '\')">'
      + '<button class="browser-fav-remove" onclick="event.stopPropagation();removeFavorite(' + i + ')" title="حذف">×</button>'
      + '<img class="browser-fav-icon" src="' + iconUrl + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
      + '<div class="browser-fav-letter" style="background:' + color + ';display:none">' + escapeHtml(letter) + '</div>'
      + '<div class="browser-fav-name">' + escapeHtml(f.name) + '</div>'
      + '</div>';
  });
  grid.innerHTML = html;
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
function formatBytes(bytes){
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

async function updateStorageInfo(){
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
  if (_idbReady) {
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
function showKeyboardShortcuts(){
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
    svgIcon('zap', ICON_SIZES.lg) + ' اختصارات لوحة المفاتيح',
    body,
    '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>'
  );
}
window.addEventListener('load', async function(){
  try {
    migrateOldData();
    await initDataLayer();
    await loadData();
    loadFavorites();
    /* تطبيق الوضع التلقائي أولًا إذا مُفعّل */
    if(data.settings.themeMode === 'auto'){
      data.settings.designTheme = isDayTime()
        ? (data.settings.dayTheme || 'mint')
        : (data.settings.nightTheme || 'teal');
    }
    applyDesignTheme(data.settings.designTheme || 'teal');
    hydrateIcons();
    setupIconObserver();
    document.getElementById('reportDate').valueAsDate = new Date();
    currentSubjects = { quran: true, arabic: false, islamic: false };
    updateSubjectButtons();
    renderStudents();
    restoreDraft();
    var t = document.getElementById('teacherName');
    if(t && !t.value.trim() && data.settings.teacherName){ t.value = data.settings.teacherName; saveDraft(); }
    document.getElementById('settingsTeacher').value = data.settings.teacherName || '';
    document.getElementById('settingsTimezone').value = data.settings.teacherTimezone || '';
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
      /* ESC — إغلاق الطبقة العليا */
      if(e.key === 'Escape'){
        if (document.getElementById('browserOverlay').style.display === 'flex'){
          closeBrowser();
          return;
        }
        closeReportSheet();
        closeGenericModal();
      }

      /* تجاهل الاختصارات داخل حقول الإدخال (إلا Ctrl/Cmd) */
      var tag = (e.target && e.target.tagName) || '';
      var inField = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable));
      var modKey = e.ctrlKey || e.metaKey;

      /* Ctrl/Cmd + رقم → تنقل بين التبويبات */
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

      /* Shift + ? → قائمة الاختصارات */
      if(e.key === '?' && !inField){
        e.preventDefault();
        showKeyboardShortcuts();
      }
    });
    setTimeout(hydrateIcons, 200);
  } catch(err){
    console.error('onload', err);
    var bar = document.getElementById('errorBar');
    if(bar){ bar.style.display='block'; bar.innerHTML += '<div>❌ ' + err.message + '</div>'; }
  }
});
  /* ═══════════════ AUTHENTICATION LOGIC ═══════════════ */

// دالة لفتح شاشة الدخول
function showAuthOverlay() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'flex';
}

// دالة للتخطي (الدخول كضيف - بدون مزامنة)
function skipAuth() {
  document.getElementById('authOverlay').style.display = 'none';
  showNotify('يعمل التطبيق محلياً. لن تتم المزامنة.');
}

// دالة تسجيل الدخول / إنشاء حساب
async function handleAuth(action) {
  if (!supabaseClient) {
    showNotify('خطأ في الاتصال بالسحابة');
    return;
  }

  var email = document.getElementById('authEmail').value.trim();
  var password = document.getElementById('authPassword').value;
  var errorEl = document.getElementById('authError');
  var loginBtn = document.getElementById('authLoginBtn');
  var signupBtn = document.getElementById('authSignupBtn');

  if (!email || !password) {
    errorEl.textContent = 'يرجى إدخال البريد الإلكتروني وكلمة المرور';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  var originalText = action === 'login' ? loginBtn.innerHTML : signupBtn.innerHTML;
  var btnToLoad = action === 'login' ? loginBtn : signupBtn;
  
  btnToLoad.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:8px"></span> جاري...';
  btnToLoad.disabled = true;

  try {
    var result;
    if (action === 'login') {
      result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    } else {
      result = await supabaseClient.auth.signUp({ email: email, password: password });
    }

    if (result.error) throw result.error;

    // ═══ حالة: إنشاء حساب ناجح بدون جلسة (تأكيد البريد لا يزال مفعلاً) ═══
    if (action === 'signup' && result.data.user && !result.data.session) {
      showNotify('📧 تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب.');
      errorEl.innerHTML = 'تم إنشاء الحساب ولكن يحتاج إلى تأكيد. راجع بريدك الإلكتروني.';
      errorEl.style.display = 'block';
      return;
    }

    // ═══ حالة: نجاح الدخول أو إنشاء حساب بجلسة ═══
    showNotify('✅ تم تسجيل الدخول بنجاح');
    document.getElementById('authOverlay').style.display = 'none';
    await getCurrentUser(); // جلب المستخدم للمزامنة

  } catch (error) {
    console.error('Auth error:', error);
    var msg = error.message || 'حدث خطأ أثناء المصادقة';

    // ═══ ترجمة الأخطاء الشائعة ═══
    if (msg.includes('Email not confirmed')) {
      msg = 'البريد الإلكتروني غير مؤكد. يرجى مراجعة بريدك والضغط على رابط التأكيد.';
    } else if (msg.includes('rate limit')) {
      msg = 'تم تجاوز الحد المسموح لإرسال رسائل البريد. انتظر ساعة أو استخدم بريدًا آخر.';
    } else if (msg.includes('Invalid login credentials')) {
      msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    } else if (msg.includes('User already registered')) {
      msg = 'هذا البريد مسجل بالفعل. جرب تسجيل الدخول.';
    }

    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  } finally {
    btnToLoad.innerHTML = originalText;
    btnToLoad.disabled = false;
  }
}

// التحقق من الجلسة عند بدء التشغيل
async function checkSession() {
  if (!supabaseClient) return;
  try {
    var { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      console.log('✅ Active session found');
      // المستخدم مسجل دخوله بالفعل
      document.getElementById('authOverlay').style.display = 'none';
    } else {
      // لا توجد جلسة، أظهر شاشة الدخول
      showAuthOverlay();
    }
  } catch (e) {
    console.error('Session check failed:', e);
    showAuthOverlay();
  }
}

// تشغيل فحص الجلسة بعد تحميل الصفحة
window.addEventListener('load', function() {
  setTimeout(checkSession, 500); // تأخير بسيط لضمان تحميل Supabase
});
/* ═══════════════════════════════════════════════════════════
   SUPABASE SYNC MODULE (UPLOAD / DOWNLOAD)
   ═══════════════════════════════════════════════════════════ */

let currentUser = null;

async function getCurrentUser() {
  if (!supabaseClient) return null;
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  return user;
}

// دالة رفع البيانات المحلية إلى Supabase (نسخة محسنة وسريعة)
async function uploadToCloud() {
  if (!supabaseClient) return showNotify('خطأ في الاتصال');
  const user = await getCurrentUser();
  if (!user) return showNotify('يجب تسجيل الدخول أولاً');

  showNotify('⏳ جاري رفع البيانات للسحابة...');
  console.log('🚀 بدء المزامنة...');

  try {
    // 1. رفع المجموعات (دفعة واحدة)
    if (data.groups.length > 0) {
      const groupsToUpload = data.groups.map(g => ({
        id: g.id, user_id: user.id, name: g.name, teacher_name: g.teacherName || '',
        timezone: g.timezone || '', link: g.link || '', location: g.location || '',
        constants: g.constants || [], schedule: g.schedule || [],
        report_settings: g.reportSettings || {}, is_deleted: false
      }));
      const { error } = await supabaseClient.from('groups').upsert(groupsToUpload);
      if (error) throw new Error('المجموعات: ' + error.message);
      console.log('✅ تم رفع المجموعات:', groupsToUpload.length);
    }

    // 2. رفع الطلاب (دفعة واحدة)
    if (data.students.length > 0) {
      const studentsToUpload = data.students.map(s => ({
        id: s.id, user_id: user.id, group_id: s.groupId, name: s.name, phone: s.phone || '',
        country: s.country || '', timezone: s.timezone || '', guardian_name: s.guardianName || '',
        birth_date: s.birthDate || null, current_level: s.currentLevel || '',
        constants: s.constants || [], static_texts: s.staticTexts || [], notes: s.notes || '', is_deleted: false
      }));
      const { error } = await supabaseClient.from('students').upsert(studentsToUpload);
      if (error) throw new Error('الطلاب: ' + error.message);
      console.log('✅ تم رفع الطلاب:', studentsToUpload.length);
    }

    // 3. رفع الحصص (دفعة واحدة)
    if (data.sessions.length > 0) {
      const sessionsToUpload = data.sessions.map(sess => ({
        id: sess.id, user_id: user.id, group_id: sess.groupId, date: sess.date || null,
        lesson_number: sess.lessonNumber || '', duration: parseInt(sess.duration) || 0,
        subject: sess.subject || '', report: sess.report || '', data: sess.data || {},
        attachment_ids: sess.attachmentIds || [], is_deleted: false
      }));
      const { error } = await supabaseClient.from('sessions').upsert(sessionsToUpload);
      if (error) throw new Error('الحصص: ' + error.message);
      console.log('✅ تم رفع الحصص:', sessionsToUpload.length);
    }

    // 4. رفع المواعيد (دفعة واحدة)
    if (data.appointments.length > 0) {
      const apptsToUpload = data.appointments.map(a => ({
        id: a.id, user_id: user.id, group_id: a.groupId, date: a.date || null,
        time: a.time || null, rule_id: a.ruleId || null, type: a.type, is_deleted: false
      }));
      const { error } = await supabaseClient.from('appointments').upsert(apptsToUpload);
      if (error) throw new Error('المواعيد: ' + error.message);
      console.log('✅ تم رفع المواعيد:', apptsToUpload.length);
    }

    // 5. رفع التقارير الشهرية (دفعة واحدة)
    if (data.monthlyReports.length > 0) {
      const reportsToUpload = data.monthlyReports.map(r => ({
        id: r.id, user_id: user.id, owner_type: r.ownerType, owner_id: r.ownerId,
        year: r.year, month: r.month, text: r.text || '', is_deleted: false
      }));
      const { error } = await supabaseClient.from('monthly_reports').upsert(reportsToUpload);
      if (error) throw new Error('التقارير: ' + error.message);
      console.log('✅ تم رفع التقارير:', reportsToUpload.length);
    }

    showNotify('✅ تمت المزامنة بنجاح!');
    console.log('🎉 المزامنة اكتملت بنجاح!');

  } catch (error) {
    console.error('❌ خطأ في المزامنة:', error);
    // استخدام alert ليظهر للمستخدم ولا يختفي بسرعة
    alert('فشل الرفع: ' + error.message);
  }
}

// دالة سحب البيانات من Supabase إلى الجهاز المحلي
async function downloadFromCloud() {
  if (!supabaseClient) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  showNotify('⏳ جاري سحب البيانات من السحابة...');

  try {
    const { data: groupsData, error: groupsErr } = await supabaseClient.from('groups').select('*').eq('is_deleted', false);
    if (groupsErr) throw groupsErr;

    const { data: studentsData, error: studentsErr } = await supabaseClient.from('students').select('*').eq('is_deleted', false);
    if (studentsErr) throw studentsErr;

    const { data: sessionsData, error: sessionsErr } = await supabaseClient.from('sessions').select('*').eq('is_deleted', false);
    if (sessionsErr) throw sessionsErr;

    const { data: appointmentsData, error: apptErr } = await supabaseClient.from('appointments').select('*').eq('is_deleted', false);
    if (apptErr) throw apptErr;

    const { data: reportsData, error: reportsErr } = await supabaseClient.from('monthly_reports').select('*').eq('is_deleted', false);
    if (reportsErr) throw reportsErr;

    if (groupsData) {
      data.groups = groupsData.map(g => ({
        id: g.id,
        name: g.name,
        teacherName: g.teacher_name || '',
        timezone: g.timezone || '',
        link: g.link || '',
        location: g.location || '',
        constants: g.constants || [],
        schedule: g.schedule || [],
        reportSettings: g.report_settings || { customRowTypes: [], staticTexts: [] }
      }));
    }

    if (studentsData) {
      data.students = studentsData.map(s => ({
        id: s.id,
        groupId: s.group_id,
        name: s.name,
        phone: s.phone || '',
        country: s.country || '',
        timezone: s.timezone || '',
        guardianName: s.guardian_name || '',
        birthDate: s.birth_date || '',
        currentLevel: s.current_level || '',
        constants: s.constants || [],
        staticTexts: s.static_texts || [],
        notes: s.notes || ''
      }));
    }

    if (sessionsData) {
      data.sessions = sessionsData.map(s => ({
        id: s.id,
        groupId: s.group_id,
        studentIds: [],
        date: s.date || '',
        lessonNumber: s.lesson_number || '',
        duration: s.duration || 0,
        subject: s.subject || 'quran',
        report: s.report || '',
        data: s.data || {},
        attachmentIds: s.attachment_ids || [],
        savedAt: s.saved_at
      }));
    }

    if (appointmentsData) {
      data.appointments = appointmentsData.map(a => ({
        id: a.id,
        groupId: a.group_id,
        date: a.date || '',
        time: a.time || '',
        ruleId: a.rule_id || null,
        type: a.type
      }));
    }

    if (reportsData) {
      data.monthlyReports = reportsData.map(r => ({
        id: r.id,
        ownerType: r.owner_type,
        ownerId: r.owner_id,
        year: r.year,
        month: r.month,
        text: r.text || '',
        savedAt: r.saved_at
      }));
    }

    await _doSave();
    renderHome(); renderGroupsList(); renderStudentsList(); renderCalendar();
    
    showNotify('✅ تم سحب البيانات بنجاح!');
    return true;

  } catch (error) {
    console.error('Download error:', error);
    showNotify('❌ فشل سحب البيانات: ' + error.message);
    return false;
  }
}

// تحديث دالة التحقق من الجلسة لتشمل السحب
async function checkSession() {
  if (!supabaseClient) return;
  try {
    var { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      console.log('✅ Active session found');
      await getCurrentUser();
      document.getElementById('authOverlay').style.display = 'none';
      // سحب البيانات تلقائياً عند بدء التشغيل
      await downloadFromCloud();
    } else {
      showAuthOverlay();
    }
  } catch (e) {
    console.error('Session check failed:', e);
    showAuthOverlay();
  }
}