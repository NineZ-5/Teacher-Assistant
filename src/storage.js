/* ═══════════════════════════════════════════════════════════
   src/storage.js — إدارة التخزين والترحيل والحفظ المحلي
   ═══════════════════════════════════════════════════════════ */

import { genId, normalize, showNotify, toDateISO, deepClone } from './utils.js';
import { idbOpen, idbGet, idbSet, setIdbReady, _idbReady } from './idb.js';

export { deepClone };

export let data = {
  groups: [],
  students: [],
  sessions: [],
  monthlyReports: [],
  appointments: [],
  workSessions: [],
  activeTimer: null,
  settings: { theme: 'dark', teacherName: '', teacherTimezone: '', designTheme: 'teal' }
};
if (typeof window !== 'undefined') window.data = data;

export function setData(newData) {
  data = newData;
  if (typeof window !== 'undefined') window.data = newData;
}

/* ═══════════════ PENDING DELETES TRACKER ═══════════════ */
export var _pendingDeletes = {
  groups: [],
  students: [],
  sessions: [],
  appointments: [],
  monthly_reports: []
};
if (typeof window !== 'undefined') window._pendingDeletes = _pendingDeletes;

export function queueDelete(table, id){
  if (!_pendingDeletes[table]) _pendingDeletes[table] = [];
  if (_pendingDeletes[table].indexOf(id) === -1){
    _pendingDeletes[table].push(id);
  }
  try { localStorage.setItem('_pendingDeletes', JSON.stringify(_pendingDeletes)); } catch(e){}
}

export function loadPendingDeletes(){
  try {
    var raw = localStorage.getItem('_pendingDeletes');
    if (raw){
      var parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(function(k){
        _pendingDeletes[k] = parsed[k] || [];
      });
    }
  } catch(e){}
}

export function clearPendingDeletes(){
  _pendingDeletes = { groups: [], students: [], sessions: [], appointments: [], monthly_reports: [] };
  window._pendingDeletes = _pendingDeletes;
  try { localStorage.removeItem('_pendingDeletes'); } catch(e){}
}

export function flushPendingDeletesToCloud(){
  var client = window.supabaseClient;
  var user = window.currentUser;
  if (!client || !user) return Promise.resolve();
  var tasks = [];
  var tables = Object.keys(_pendingDeletes);
  tables.forEach(function(table){
    var ids = _pendingDeletes[table];
    if (!ids || !ids.length) return;
    tasks.push(
      client.from(table).update({ is_deleted: true }).in('id', ids)
        .then(function(res){
          if (res.error) console.warn('delete sync failed:', table, res.error.message);
          else console.log('🗑️ synced delete:', table, ids.length);
          return res;
        })
    );
  });
  return Promise.all(tasks);
}

/* ═══════════════ UUID MIGRATION ═══════════════ */
export function isValidUUID(str){
  return typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function migrateInvalidUUIDs(){
  var changed = false;
  var idMap = {};  // old ID → new ID

  // ١) المجموعات
  (data.groups || []).forEach(function(g){
    if (!isValidUUID(g.id)){
      var oldId = g.id;
      g.id = genId();
      idMap[oldId] = g.id;
      changed = true;
      console.log('🔧 Group ID migrated:', oldId, '→', g.id);
    }
  });

  // ٢) الطلاب (+ إصلاح groupId)
  (data.students || []).forEach(function(s){
    if (!isValidUUID(s.id)){
      var oldId = s.id;
      s.id = genId();
      idMap[oldId] = s.id;
      changed = true;
      console.log('🔧 Student ID migrated:', oldId, '→', s.id);
    }
    if (s.groupId && idMap[s.groupId]){
      s.groupId = idMap[s.groupId];
      changed = true;
    }
  });

  // ٣) الحصص (+ إصلاح groupId + studentIds)
  (data.sessions || []).forEach(function(ses){
    if (!isValidUUID(ses.id)){
      var oldId = ses.id;
      ses.id = genId();
      idMap[oldId] = ses.id;
      changed = true;
      console.log('🔧 Session ID migrated:', oldId, '→', ses.id);
    }
    if (ses.groupId && idMap[ses.groupId]){
      ses.groupId = idMap[ses.groupId];
      changed = true;
    }
    if (Array.isArray(ses.studentIds)){
      var newIds = ses.studentIds.map(function(sid){ return idMap[sid] || sid; });
      var anyChanged = newIds.some(function(nid, i){ return nid !== ses.studentIds[i]; });
      if (anyChanged){
        ses.studentIds = newIds;
        changed = true;
      }
    }
  });

  // ٤) المواعيد (+ إصلاح groupId)
  (data.appointments || []).forEach(function(a){
    if (!isValidUUID(a.id)){
      var oldId = a.id;
      a.id = genId();
      idMap[oldId] = a.id;
      changed = true;
    }
    if (a.groupId && idMap[a.groupId]){
      a.groupId = idMap[a.groupId];
      changed = true;
    }
  });

  // ٥) التقارير الشهرية (+ إصلاح ownerId)
  (data.monthlyReports || []).forEach(function(r){
    if (!isValidUUID(r.id)){
      var oldId = r.id;
      r.id = genId();
      idMap[oldId] = r.id;
      changed = true;
    }
    if (r.ownerId && idMap[r.ownerId]){
      r.ownerId = idMap[r.ownerId];
      changed = true;
    }
  });

  if (changed){
    console.log('✅ تمت Migration بنجاح');
    if (typeof _doSave === 'function'){
      _doSave().catch(function(e){ console.warn('migration save failed:', e); });
    }
  }

  return changed;
}

/* ═══════════════ MIGRATION & INIT ═══════════════ */
export async function migrateToIndexedDB(){
  var migratedAtKey = window.MIGRATED_AT_KEY || 'quran_migrated_to_idb_at';
  var dataKey = window.DATA_KEY || 'quran_data_v4';
  var backupKey = window.MIGRATED_BACKUP_KEY || 'quran_data_v4_migrated_backup';

  if (localStorage.getItem(migratedAtKey)) return true;
  var raw = localStorage.getItem(dataKey);
  if (!raw) {
    localStorage.setItem(migratedAtKey, new Date().toISOString());
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
    localStorage.setItem(backupKey, raw);
    localStorage.removeItem(dataKey);
  } catch(e) {}
  localStorage.setItem(migratedAtKey, new Date().toISOString());
  console.log('Migration succeeded');
  return true;
}

export async function initDataLayer(){
  var migratedAtKey = window.MIGRATED_AT_KEY || 'quran_migrated_to_idb_at';
  try {
    await idbOpen();
  } catch(e) {
    showNotify('⚠️ تعذر فتح قاعدة البيانات — سنستخدم التخزين القديم');
    setIdbReady(false);
    return;
  }
  var needsMigration = !localStorage.getItem(migratedAtKey);
  if (needsMigration) {
    var ok = await migrateToIndexedDB();
    if (!ok) {
      showNotify('⚠️ فشل الترحيل — التطبيق يعمل بالوضع القديم');
      setIdbReady(false);
      return;
    }
    showNotify('✅ تمت الترقية بنجاح — بياناتك الآن في قاعدة بيانات أوسع');
  }
  setIdbReady(true);
}

/* ═══════════════ DATA LOAD / SAVE / MIGRATE ═══════════════ */
export async function loadData(){
  var dataKey = window.DATA_KEY || 'quran_data_v4';
  var backupKey = window.MIGRATED_BACKUP_KEY || 'quran_data_v4_migrated_backup';

  if (!window._idbReady) {
    try {
      var raw = localStorage.getItem(dataKey) || localStorage.getItem(backupKey);
      if (raw) setData(JSON.parse(raw));
    } catch(e) { console.error('loadData fallback:', e); }
  } else {
    try {
      var saved = await idbGet('main');
      if (saved) {
        setData(saved);
      }
    } catch(e) {
      console.error('loadData from IndexedDB:', e);
      try {
        var backup = localStorage.getItem(backupKey);
        if (backup) {
          setData(JSON.parse(backup));
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
  if(!Array.isArray(data.settings.browserFavorites)) data.settings.browserFavorites = [];
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
  window.data = data;
}

/* ═══════════════ SAVE BACKEND ═══════════════ */
export async function _doSave(){
  var dataKey = window.DATA_KEY || 'quran_data_v4';
  var cloned = deepClone(data);
  if (!window._idbReady) {
    localStorage.setItem(dataKey, JSON.stringify(cloned));
    return;
  }
  await idbSet('main', cloned);
}

export function saveData(){
  _doSave().then(function(){
    if (typeof window.scheduleAutoSync === 'function') {
      window.scheduleAutoSync();
    }
  }).catch(function(err){
    console.error('saveData:', err);
    showNotify('⚠️ فشل الحفظ — تحقق من المساحة');
  });
}

export async function saveDataAsync(){
  try {
    await _doSave();
    if (typeof window.scheduleAutoSync === 'function') {
      window.scheduleAutoSync();
    }
    return true;
  } catch(err) {
    console.error('saveDataAsync:', err);
    showNotify('⚠️ فشل الحفظ — تحقق من المساحة');
    return false;
  }
}

export function migrateScheduleRulesCreatedAt(){
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

export function migrateOldData(){
  var dataKey = window.DATA_KEY || 'quran_data_v4';
  if(localStorage.getItem(dataKey)) return;
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
    localStorage.setItem(dataKey, JSON.stringify(newData));
  } catch(e){ console.error('migrate', e); }
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    data,
    setData,
    _pendingDeletes,
    queueDelete,
    loadPendingDeletes,
    clearPendingDeletes,
    flushPendingDeletesToCloud,
    isValidUUID,
    migrateInvalidUUIDs,
    migrateToIndexedDB,
    initDataLayer,
    loadData,
    _doSave,
    saveData,
    saveDataAsync,
    migrateScheduleRulesCreatedAt,
    migrateOldData,
    deepClone
  });
}
