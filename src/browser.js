/* ═══════════════════════════════════════════════════════════
   src/browser.js — المتصفح المدمج وإدارة التبويبات والمفضلة
   ═══════════════════════════════════════════════════════════ */

import { escapeHtml, escapeAttr, showNotify } from './utils.js';
import { data, saveData, _doSave } from './storage.js';

function svgIcon(name, size){
  if (typeof window.svgIcon === 'function') return window.svgIcon(name, size);
  var c = (window.SVG_ICONS && window.SVG_ICONS[name]) || '';
  size = size || (window.ICON_SIZES && window.ICON_SIZES.md) || 16;
  var sw = (size <= 14) ? 1.75 : 2;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0">'+c+'</svg>';
}

export function normalizeUrl(u){
  if (!u) return '';
  u = String(u).trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

/* ═══════════════ BROWSER STATE ═══════════════ */
export var browserState = {
  favorites: [],
  tabs: [],
  activeTabId: null
};
if (typeof window !== 'undefined') window.browserState = browserState;

export var _browserTabCounter = 0;

/* ─── إدارة التبويبات ─── */
export function _newTabId(){ return 'tab-' + (++_browserTabCounter) + '-' + Date.now(); }

export function createBrowserTab(url){
  return {
    id: _newTabId(),
    title: url ? (getDomain(url) || 'تبويب') : 'تبويب جديد',
    url: url || null,
    history: url ? [url] : [],
    historyIndex: url ? 0 : -1,
    isHome: !url
  };
}

export function getActiveTab(){
  return browserState.tabs.find(function(t){ return t.id === browserState.activeTabId; });
}

export function setActiveTab(id){
  browserState.activeTabId = id;
  var tab = getActiveTab();
  if (tab){
    renderTabsBar();
    renderTabContent(tab);
    saveBrowserState();
  }
}

export function renderTabsBar(){
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

export function browserNewTab(url){
  var tab = createBrowserTab(url ? normalizeUrl(url) : null);
  browserState.tabs.push(tab);
  browserState.activeTabId = tab.id;
  renderTabsBar();
  renderTabContent(tab);
  saveBrowserState();
}

export function closeBrowserTab(id){
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

export function renderTabContent(tab){
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

export function navigateTab(tab, url){
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

export function goTabHome(tab){
  if (!tab) return;
  tab.url = null;
  tab.isHome = true;
  tab.title = 'تبويب جديد';
  renderTabsBar();
  renderTabContent(tab);
  saveBrowserState();
}

export function renderBookmarksBar(){
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

export function browserNavigateInActive(url){
  var tab = getActiveTab();
  if (tab) navigateTab(tab, url);
  else browserNewTab(url);
}

/* ─── حفظ واستعادة حالة التبويبات ─── */
export var BROWSER_TABS_KEY = 'quran_browser_tabs_v1';

export function saveBrowserState(){
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

export function loadBrowserState(){
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
export var CONFERENCE_PATTERNS = [
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

export function detectConference(url){
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

export function isMobile(){
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function getDomain(url){
  try {
    var u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch(e){ return ''; }
}

export function getFavColor(domain){
  var favColors = window.FAV_COLORS || ['#2dd4bf','#60a5fa','#fbbf24','#f87171','#818cf8','#fb923c','#4ade80','#a78bfa'];
  if (!domain) return favColors[0];
  var hash = 0;
  for (var i = 0; i < domain.length; i++){
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return favColors[Math.abs(hash) % favColors.length];
}

export function getFavIcon(domain){
  if (!domain) return '';
  return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64';
}

/* Load/save favorites */
export function loadFavorites(){
  try {
    var browserFavsKey = window.BROWSER_FAVS_KEY || 'quran_browser_favs_v1';
    // الأولوية: بيانات السحابة (data.settings)
    if (data && data.settings && Array.isArray(data.settings.browserFavorites) && data.settings.browserFavorites.length > 0){
      browserState.favorites = data.settings.browserFavorites;
      try { localStorage.setItem(browserFavsKey, JSON.stringify(browserState.favorites)); } catch(e){}
      return;
    }
    // Fallback: localStorage
    var raw = localStorage.getItem(browserFavsKey);
    if (raw){
      browserState.favorites = JSON.parse(raw) || [];
      if (!data.settings) data.settings = {};
      data.settings.browserFavorites = browserState.favorites;
      _doSave().catch(function(){});
    }
  } catch(e){ browserState.favorites = []; }
}

export function saveFavorites(){
  try {
    var browserFavsKey = window.BROWSER_FAVS_KEY || 'quran_browser_favs_v1';
    localStorage.setItem(browserFavsKey, JSON.stringify(browserState.favorites));
    if (!data.settings) data.settings = {};
    data.settings.browserFavorites = browserState.favorites;
    saveData();
  } catch(e){ showNotify('فشل حفظ المفضلة'); }
}

export function isFavorited(url){
  var norm = normalizeUrl(url);
  return browserState.favorites.some(function(f){ return f.url === norm; });
}

export function openLessonLink(url){
  url = normalizeUrl(url);
  if (!url){ showNotify('لا يوجد رابط'); return; }

  var conf = detectConference(url);

  if (!conf){
    openInAppBrowser(url);
    return;
  }

  if (conf.platform === 'meet' || conf.platform === 'teams'){
    showNotify('فتح ' + conf.name + ' في المتصفح الخارجي...');
    try { window.open(url, '_blank', 'noopener'); } catch(e){}
    return;
  }

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

  var a = document.createElement('a');
  a.href = conf.deepLink;
  a.style.display = 'none';
  a.rel = 'noopener';
  document.body.appendChild(a);
  try { a.click(); } catch(e){ console.error('deep link click failed', e); }
  setTimeout(function(){ try { a.remove(); } catch(e){} }, 500);

  fallbackTimer = setTimeout(function(){
    cleanup();
    if (!appOpened && !document.hidden){
      if (typeof window.openGenericModal === 'function') {
        window.openGenericModal(
          'فتح ' + conf.name,
          '<p style="margin-bottom:12px;line-height:1.6">لم يفتح تطبيق <b>' + escapeHtml(conf.name) + '</b> تلقائيًا.<br>قد يكون غير مثبّت على هذا الجهاز، أو رفض المتصفح فتحه.</p><p style="margin-bottom:12px;line-height:1.6">هل تريد فتح الرابط في المتصفح الخارجي؟</p>',
          '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
          + '<button class="btn btn-primary" style="width:auto;margin:0" onclick="closeGenericModal();openExternalUrl(\'' + escapeAttr(url) + '\')">فتح في المتصفح</button>'
        );
      }
    }
  }, 2500);
}

export function openExternalUrl(url){
  try { window.open(url, '_blank', 'noopener'); } catch(e){ showNotify('تعذّر الفتح'); }
}

export function openInAppBrowser(url){
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

export function closeBrowser(){
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

export function showBrowserFavorites(){
  document.getElementById('browserFavoritesView').style.display = 'block';
  document.getElementById('browserIframe').style.display = 'none';
  document.getElementById('browserFallback').style.display = 'none';
  renderBrowserFavorites();
}

export function renderBrowserFavorites(){
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

export function openFavoriteUrl(i){
  var f = browserState.favorites[i];
  if (!f) return;
  browserNavigateInActive(f.url);
}

export function removeFavorite(i){
  if (!confirm('حذف هذا الموقع من المفضلة؟')) return;
  browserState.favorites.splice(i, 1);
  saveFavorites();
  renderBrowserFavorites();
  renderBookmarksBar();
  renderSettingsFavs();
  showBrowserToast('تم الحذف');
}

var _dragSrcIndex = null;

export function setupFavDragDrop(){
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

export function showFavCardMenu(i){
  var f = browserState.favorites[i];
  if (!f) return;
  var body = '<div class="form-field"><label>الاسم</label><input type="text" id="editFavName" value="' + escapeAttr(f.name) + '"></div>'
    + '<div class="form-field"><label>الرابط</label><input type="url" id="editFavUrl" value="' + escapeAttr(f.url) + '"></div>';
  var footer = '<button class="btn btn-secondary" onclick="closeGenericModal()">إلغاء</button>'
    + '<button class="btn btn-danger" onclick="closeGenericModal();removeFavorite(' + i + ')" style="width:auto;margin:0">حذف</button>'
    + '<button class="btn btn-primary" onclick="saveFavoriteEdit(' + i + ')" style="width:auto;margin:0">حفظ</button>';
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal('تعديل المفضلة', body, footer);
  }
  setTimeout(function(){ var inp = document.getElementById('editFavName'); if (inp) inp.focus(); }, 50);
}

export function saveFavoriteEdit(i){
  var f = browserState.favorites[i];
  if (!f) return;
  var name = (document.getElementById('editFavName').value || '').trim();
  var url = normalizeUrl((document.getElementById('editFavUrl').value || '').trim());
  if (!name || !url){ showNotify('أكمل البيانات'); return; }
  f.name = name;
  f.url = url;
  saveFavorites();
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  renderBrowserFavorites();
  renderSettingsFavs();
  showNotify('تم الحفظ');
}

export function promptAddFavorite(){
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
  if (typeof window.openGenericModal === 'function') {
    window.openGenericModal('إضافة موقع للمفضلة', body, footer);
  }
  setTimeout(function(){ var inp = document.getElementById('newFavName'); if (inp) inp.focus(); }, 50);
}

export function saveNewFavorite(){
  var name = (document.getElementById('newFavName').value || '').trim();
  var url = normalizeUrl((document.getElementById('newFavUrl').value || '').trim());
  if (!name || !url){ showNotify('أكمل البيانات'); return; }
  if (browserState.favorites.some(function(f){ return f.url === url; })){ showNotify('الموقع موجود بالفعل'); return; }
  browserState.favorites.push({ name: name, url: url, addedAt: new Date().toISOString() });
  saveFavorites();
  if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
  if (document.getElementById('browserOverlay') && document.getElementById('browserOverlay').style.display === 'flex'){
    renderBrowserFavorites();
    renderBookmarksBar();
    updateBrowserFavButton();
  }
  renderSettingsFavs();
  showNotify('تمت الإضافة');
}

export function toggleBrowserFavorite(){
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

export function updateBrowserFavButton(){
  var btn = document.getElementById('browserFavBtn');
  if (!btn) return;
  var tab = getActiveTab();
  var url = tab && tab.url ? tab.url : '';
  if (url && isFavorited(url)){
    btn.innerHTML = svgIcon('star-filled', 16);
    btn.classList.add('fav-active');
    btn.title = 'إزالة من المفضلة';
  } else {
    btn.innerHTML = svgIcon('star', 16);
    btn.classList.remove('fav-active');
    btn.title = 'إضافة للمفضلة';
  }
}

export function normalizeBrowserUrl(input){
  if (!input) return '';
  input = String(input).trim();
  if (!input) return '';
  if (/^(https?:\/\/|www\.)/i.test(input) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(input)){
    return normalizeUrl(input);
  }
  return 'https://www.google.com/search?q=' + encodeURIComponent(input);
}

export function browserNavigate(input){
  var url = normalizeBrowserUrl(input);
  if (!url) return;
  navigateBrowser(url);
}

export function navigateBrowser(url){
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

export var DEEP_LINKS = [];

export function tryBuildDeepLink(url){
  for (var i = 0; i < DEEP_LINKS.length; i++){
    var m = url.match(DEEP_LINKS[i].pattern);
    if (m) return DEEP_LINKS[i].scheme(m);
  }
  return null;
}

export function tryDeepLinkOrFallback(deepLink, fallbackUrl){
  var start = Date.now();
  var timer = setTimeout(function(){
    if (Date.now() - start >= 2400){
      loadBrowserUrl(fallbackUrl);
    }
  }, 2500);
  try {
    window.location.href = deepLink;
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

export function loadBrowserUrl(url){ navigateBrowser(url); }

export function updateBrowserTitle(title){
  document.title = title + ' — المتصفح';
}

export function showBrowserFallback(){
  var iframe = document.getElementById('browserIframe');
  var fb = document.getElementById('browserFallback');
  if (iframe) iframe.style.display = 'none';
  if (fb) fb.style.display = 'flex';
}

export function browserOpenExternal(){
  var tab = getActiveTab();
  if (tab && tab.url) window.open(tab.url, '_blank');
}

export function browserGoHome(){
  var tab = getActiveTab();
  if (tab) goTabHome(tab);
}

export function browserBack(){
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

export function browserForward(){
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

export function browserReload(){
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

export function updateBrowserNavButtons(){
  var tab = getActiveTab();
  var backBtn = document.getElementById('browserBackBtn');
  var fwdBtn = document.getElementById('browserForwardBtn');
  if (backBtn) backBtn.disabled = !tab || (tab.historyIndex <= 0 && (!tab.url || tab.isHome));
  if (fwdBtn) fwdBtn.disabled = !tab || (tab.historyIndex >= tab.history.length - 1);
}

export function showBrowserToast(msg){
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

export function renderSettingsFavs(){
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

if (typeof window !== 'undefined') {
  Object.assign(window, {
    browserState,
    createBrowserTab,
    getActiveTab,
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
  });
}
