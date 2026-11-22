/* ═══════════════════════════════════════════════════════════
   src/sync.js — إدارة المزامنة السحابية والمصادقة (Supabase)
   ═══════════════════════════════════════════════════════════ */

import { showNotify, deepClone, escapeHtml, normalize } from './utils.js';
import { idbSet, idbGet, _idb } from './idb.js';
import {
  data,
  setData,
  _doSave,
  saveDataAsync,
  _pendingDeletes,
  clearPendingDeletes,
  flushPendingDeletesToCloud
} from './storage.js';

// ═══════════════ SUPABASE INIT (SAFE) ═══════════════
export let supabaseClient = null;
try {
  const SUPABASE_URL = 'https://peydkdmxvsfyocebypva.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_O-KUuRYf4xVAhRT05CKn6Q_2GxPFcAr';

  if (typeof window !== 'undefined' && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabaseClient = supabaseClient;
    console.log('✅ Supabase Client Initialized successfully!');
  } else {
    // Supabase library not loaded or non-browser environment
  }
} catch (error) {
  console.error('❌ Supabase Init Error:', error);
}

export let currentUser = null;

export async function getCurrentUser() {
  if (!supabaseClient) return null;
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  if (typeof window !== 'undefined') window.currentUser = user;
  return user;
}

// ═══════════════ TIMESTAMP & DEDUPLICATION HELPERS ═══════════════
export function parseTimestampMs(val) {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : 0;
  }
  if (typeof val === 'string') {
    var trimmed = val.trim();
    if (!trimmed) return 0;
    if (/^\d+$/.test(trimmed)) {
      var num = Number(trimmed);
      return Number.isFinite(num) ? num : 0;
    }
    var parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getRowTimestampMs(row) {
  if (!row || typeof row !== 'object') return 0;
  return Math.max(
    parseTimestampMs(row.updated_at),
    parseTimestampMs(row.saved_at),
    parseTimestampMs(row.savedAt)
  );
}

export function isDuplicateSession(a, b) {
  if (!a || !b) return false;
  if (!a.groupId || !b.groupId || a.groupId !== b.groupId) return false;
  if (!a.date || !b.date || a.date !== b.date) return false;

  var timeA = String(a.time || '').trim();
  var timeB = String(b.time || '').trim();
  if (timeA && timeB && timeA !== timeB) return false;

  var lessonA = String(a.lessonNumber || '').trim();
  var lessonB = String(b.lessonNumber || '').trim();
  var timeMatches = Boolean(timeA && timeB && timeA === timeB);
  var lessonMatches = Boolean(lessonA && lessonB && lessonA === lessonB);

  return timeMatches || lessonMatches;
}

export function isDuplicateAppointment(a, b) {
  if (!a || !b) return false;
  if (!a.groupId || !b.groupId || a.groupId !== b.groupId) return false;
  if (!a.date || !b.date || a.date !== b.date) return false;

  var timeA = String(a.time || '').trim();
  var timeB = String(b.time || '').trim();
  var typeA = String(a.type || '').trim();
  var typeB = String(b.type || '').trim();

  return timeA === timeB && typeA === typeB;
}

function deduplicateList(list, isDupFn) {
  if (!Array.isArray(list) || list.length <= 1) return Array.isArray(list) ? list : [];
  var result = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item) continue;

    var matchedIndices = [];
    for (var j = 0; j < result.length; j++) {
      if (result[j].id === item.id || isDupFn(result[j], item)) {
        matchedIndices.push(j);
      }
    }

    if (matchedIndices.length === 0) {
      result.push(item);
      continue;
    }

    var winner = result[matchedIndices[0]];
    var winnerTime = getRowTimestampMs(winner);
    for (var k = 1; k < matchedIndices.length; k++) {
      var existing = result[matchedIndices[k]];
      var existingTime = getRowTimestampMs(existing);
      if (existingTime > winnerTime) {
        winner = existing;
        winnerTime = existingTime;
      }
    }

    var candidateTime = getRowTimestampMs(item);
    if (candidateTime > winnerTime) {
      winner = item;
    }

    for (var m = matchedIndices.length - 1; m >= 0; m--) {
      result.splice(matchedIndices[m], 1);
    }
    result.splice(matchedIndices[0], 0, winner);
  }
  return result;
}

export function deduplicateSessions(sessions) {
  return deduplicateList(sessions, isDuplicateSession);
}

export function deduplicateAppointments(appointments) {
  return deduplicateList(appointments, isDuplicateAppointment);
}

function smartMergeById(localList, remoteList) {
  var merged = Array.isArray(localList) ? localList.slice() : [];
  for (var i = 0; i < remoteList.length; i++) {
    var remoteItem = remoteList[i];
    if (!remoteItem || !remoteItem.id) continue;
    var idx = merged.findIndex(function(x) { return x && x.id === remoteItem.id; });
    if (idx === -1) {
      merged.push(remoteItem);
    } else {
      var remoteTime = getRowTimestampMs(remoteItem);
      var localTime = getRowTimestampMs(merged[idx]);
      if (remoteTime > localTime) {
        merged[idx] = remoteItem;
      }
    }
  }
  return merged;
}

function smartMergeWithDeduplication(localList, remoteList, isDupFn) {
  var merged = deduplicateList(Array.isArray(localList) ? localList.slice() : [], isDupFn);
  for (var i = 0; i < remoteList.length; i++) {
    var remoteItem = remoteList[i];
    if (!remoteItem || !remoteItem.id) continue;

    var remoteTime = getRowTimestampMs(remoteItem);
    var idIdx = merged.findIndex(function(x) { return x && x.id === remoteItem.id; });

    if (idIdx !== -1) {
      var localTime = getRowTimestampMs(merged[idIdx]);
      if (remoteTime > localTime) {
        merged[idIdx] = remoteItem;
      }
      continue;
    }

    // لا يوجد تطابق بالمعرف → مطابقة منطقية ومنع التكرار
    var dupIndices = [];
    var maxDupTime = -1;
    for (var j = 0; j < merged.length; j++) {
      var item = merged[j];
      if (item && isDupFn(item, remoteItem)) {
        dupIndices.push(j);
        var itemTime = getRowTimestampMs(item);
        if (itemTime > maxDupTime) maxDupTime = itemTime;
      }
    }

    if (dupIndices.length > 0) {
      if (remoteTime > maxDupTime) {
        var firstIdx = dupIndices[0];
        var next = [];
        for (var k = 0; k < merged.length; k++) {
          if (dupIndices.indexOf(k) === -1) {
            next.push(merged[k]);
          } else if (k === firstIdx) {
            next.push(remoteItem);
          }
        }
        merged = next;
      }
    } else {
      merged.push(remoteItem);
    }
  }
  return deduplicateList(merged, isDupFn);
}

// ═══════════════ LIFECYCLE LISTENERS (RESUME / ONLINE) ═══════════════
var _lifecycleListenersAdded = false;

function registerSyncLifecycleListeners() {
  if (_lifecycleListenersAdded) return;
  _lifecycleListenersAdded = true;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('quran_skip_auth') === 'true') return;
        if (!supabaseClient) return;
        downloadFromCloud(true).catch(function(err) {
          console.warn('visibilitychange sync failed:', err);
        });
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', function() {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('quran_skip_auth') === 'true') return;
      if (!supabaseClient) return;
      downloadFromCloud(true).catch(function(err) {
        console.warn('online sync failed:', err);
      });
    });
  }
}

registerSyncLifecycleListeners();

// ═══════════════ REALTIME SYNC ═══════════════
var _realtimeChannel = null;
var _realtimeEnabled = false;
var _realtimeSubscribing = false;
var _realtimeUserId = null;
var _lastLocalWrite = 0;  // طابع زمني لآخر إجراء محلي يدوي

// الجداول المشمولة في المزامنة
var SYNC_TABLES = ['groups', 'students', 'sessions', 'appointments', 'monthly_reports'];

export function setupRealtimeSync() {
  registerSyncLifecycleListeners();

  if (supabaseClient && typeof window !== 'undefined' && !window._authListenerAdded) {
    window._authListenerAdded = true;
    supabaseClient.auth.onAuthStateChange(function(event, session) {
      if (session && session.user) {
        currentUser = session.user;
        window.currentUser = session.user;
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        window.currentUser = null;
        teardownRealtimeSync();
      }
      if (typeof document !== 'undefined' && typeof window.switchTab === 'function' && document.getElementById('tab-settings')?.classList.contains('active')) {
        var accEmail = document.getElementById('accountStatusEmail');
        if (accEmail) {
          accEmail.innerHTML = window.currentUser
            ? 'مسجل الدخول: <span style="color:var(--accent-green)">' + window.currentUser.email + '</span>'
            : '<span style="color:var(--accent-amber)">وضع محلي (غير مسجل)</span>';
        }
      }
    });
  }

  if (!supabaseClient || !currentUser) return;

  // تفكيك أي قناة حالية قبل إنشاء قناة جديدة لمنع تكرار المستمعات
  teardownRealtimeSync();

  console.log('🔌 إعداد المزامنة اللحظية...');
  _realtimeSubscribing = true;
  _realtimeEnabled = false;
  _realtimeUserId = currentUser.id;

  var channel = supabaseClient.channel('teacher-assistant-sync');
  _realtimeChannel = channel;

  SYNC_TABLES.forEach(function(table) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: 'user_id=eq.' + currentUser.id   // كل مستخدم يرى تغييراته فقط
      },
      function(payload) {
        if (_realtimeChannel !== channel) return;
        handleRealtimeChange(table, payload);
      }
    );
  });

  channel.subscribe(function(status) {
    if (_realtimeChannel !== channel) return;
    if (status === 'SUBSCRIBED') {
      _realtimeSubscribing = false;
      _realtimeEnabled = true;
      console.log('✅ المزامنة اللحظية جاهزة');
      console.log('🔄 المزامنة اللحظية مفعّلة');
      showNotify('🔄 المزامنة اللحظية مفعّلة');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      _realtimeSubscribing = false;
      _realtimeEnabled = false;
      console.warn('⚠️ فشل الاتصال اللحظي:', status);
    }
  });
}

function handleRealtimeChange(table, payload) {
  if (!payload) return;
  console.log('📥 حدث لحظي وصل:', table, payload.eventType, 'is_deleted:', payload.new ? payload.new.is_deleted : 'N/A');

  var eventType = payload.eventType;  // INSERT, UPDATE, DELETE
  var newRow = payload.new;
  var oldRow = payload.old;

  console.log('📥 تغيير لحظي:', table, eventType);

  // ─── الحذف ───
  if (eventType === 'DELETE') {
    if (oldRow && oldRow.id) {
      removeLocalById(table, oldRow.id);
    }
    return;
  }

  // ─── الإدراج أو التحديث ───
  if (!newRow || !newRow.id) return;

  // منع الصدى عبر مقارنة الطوابع الزمنية بدلاً من الحجب الزمني الثابت
  if (newRow.is_deleted !== true) {
    var localArr = getLocalArray(table);
    if (Array.isArray(localArr)) {
      var existingLocal = localArr.find(function(r) { return r && r.id === newRow.id; });
      if (existingLocal && getRowTimestampMs(newRow) <= getRowTimestampMs(existingLocal)) {
        return;
      }
    }
  }

  upsertLocalRow(table, newRow);
}

export async function removeLocalById(table, id) {
  var arr = getLocalArray(table);
  if (!arr || !id) return;
  var before = arr.length;
  var filtered = arr.filter(function(r) { return r && r.id !== id; });
  if (filtered.length !== before) {
    setLocalArray(table, filtered);
    try {
      await _doSave();
    } catch (err) {
      console.warn('removeLocalById _doSave failed:', err);
    }
    refreshUIIfNeeded(table);
  }
}

export async function upsertLocalRow(table, remoteRow) {
  if (!remoteRow || !remoteRow.id) return;
  var arr = getLocalArray(table);
  if (!arr) return;

  // تجاهل الصفوف المحذوفة محلياً وبانتظار المزامنة للسحابة
  if (_pendingDeletes && Array.isArray(_pendingDeletes[table]) && _pendingDeletes[table].indexOf(remoteRow.id) !== -1) {
    return;
  }

  // إذا كان الصف محذوفاً في السحابة، احذفه محلياً ولا تضفه
  if (remoteRow.is_deleted === true) {
    await removeLocalById(table, remoteRow.id);
    return;
  }

  var localCandidate = convertRemoteToLocal(table, remoteRow);
  var remoteTime = getRowTimestampMs(localCandidate);
  var isSession = table === 'sessions';
  var isAppointment = table === 'appointments';
  var dupFn = isSession ? isDuplicateSession : (isAppointment ? isDuplicateAppointment : null);

  var nextArr = arr.slice();
  var localIndex = nextArr.findIndex(function(r) { return r && r.id === remoteRow.id; });
  var changed = false;

  if (localIndex !== -1) {
    var localRow = nextArr[localIndex];
    var localTime = getRowTimestampMs(localRow);
    if (remoteTime > localTime) {
      nextArr[localIndex] = localCandidate;
      changed = true;
    } else {
      return;
    }

    if (dupFn) {
      var winnerTime = getRowTimestampMs(nextArr[localIndex]);
      var cleaned = [];
      for (var i = 0; i < nextArr.length; i++) {
        var row = nextArr[i];
        if (!row) continue;
        if (i === localIndex) {
          cleaned.push(row);
          continue;
        }
        if (dupFn(row, localCandidate)) {
          var dupTime = getRowTimestampMs(row);
          if (dupTime > winnerTime) {
            cleaned = cleaned.filter(function(x) { return x.id !== localCandidate.id; });
            cleaned.push(row);
            winnerTime = dupTime;
          }
          changed = true;
        } else {
          cleaned.push(row);
        }
      }
      nextArr = cleaned;
    }
  } else if (dupFn) {
    var dupIndices = [];
    var maxDupTime = -1;
    var newestDup = null;

    for (var j = 0; j < nextArr.length; j++) {
      var item = nextArr[j];
      if (item && dupFn(item, localCandidate)) {
        dupIndices.push(j);
        var itemTime = getRowTimestampMs(item);
        if (itemTime > maxDupTime) {
          maxDupTime = itemTime;
          newestDup = item;
        }
      }
    }

    if (dupIndices.length > 0) {
      if (remoteTime > maxDupTime) {
        var firstIdx = dupIndices[0];
        var replaced = [];
        for (var k = 0; k < nextArr.length; k++) {
          if (dupIndices.indexOf(k) === -1) {
            replaced.push(nextArr[k]);
          } else if (k === firstIdx) {
            replaced.push(localCandidate);
          }
        }
        nextArr = replaced;
        changed = true;
      } else {
        if (dupIndices.length > 1 && newestDup) {
          var deduped = [];
          var keptNewest = false;
          for (var d = 0; d < nextArr.length; d++) {
            if (dupIndices.indexOf(d) === -1) {
              deduped.push(nextArr[d]);
            } else if (!keptNewest && nextArr[d].id === newestDup.id) {
              deduped.push(newestDup);
              keptNewest = true;
            }
          }
          nextArr = deduped;
          changed = true;
        }
        if (!changed) return;
      }
    } else {
      nextArr.push(localCandidate);
      changed = true;
    }
  } else {
    nextArr.push(localCandidate);
    changed = true;
  }

  if (!changed) return;

  setLocalArray(table, nextArr);
  try {
    await _doSave();
  } catch (err) {
    console.warn('upsertLocalRow _doSave failed:', err);
  }
  refreshUIIfNeeded(table);
}

export function getLocalArray(table) {
  if (table === 'groups') return data.groups;
  if (table === 'students') return data.students;
  if (table === 'sessions') return data.sessions;
  if (table === 'appointments') return data.appointments;
  if (table === 'monthly_reports') return data.monthlyReports;
  return null;
}

export function setLocalArray(table, arr) {
  if (table === 'groups') data.groups = arr;
  else if (table === 'students') data.students = arr;
  else if (table === 'sessions') data.sessions = arr;
  else if (table === 'appointments') data.appointments = arr;
  else if (table === 'monthly_reports') data.monthlyReports = arr;
}

export function convertRemoteToLocal(table, remote) {
  if (table === 'groups') {
    return {
      id: remote.id,
      name: remote.name,
      teacherName: remote.teacher_name || '',
      timezone: remote.timezone || '',
      link: remote.link || '',
      location: remote.location || '',
      constants: remote.constants || [],
      schedule: remote.schedule || [],
      reportSettings: remote.report_settings || { customRowTypes: [], staticTexts: [] },
      updated_at: remote.updated_at || null
    };
  }
  if (table === 'students') {
    return {
      id: remote.id,
      groupId: remote.group_id,
      name: remote.name,
      phone: remote.phone || '',
      country: remote.country || '',
      timezone: remote.timezone || '',
      guardianName: remote.guardian_name || '',
      birthDate: remote.birth_date || '',
      currentLevel: remote.current_level || '',
      gender: remote.gender || 'male',
      constants: remote.constants || [],
      staticTexts: remote.static_texts || [],
      reportSettings: remote.report_settings || {},
      notes: remote.notes || '',
      updated_at: remote.updated_at || null
    };
  }
  if (table === 'sessions') {
    var sData = remote.data || {};
    var ctx = (sData && sData.lessonContext) ? sData.lessonContext : null;
    var rIds = Array.isArray(remote.student_ids) ? remote.student_ids : [];
    if ((!rIds || !rIds.length) && Array.isArray(sData.students)) {
      rIds = [];
      sData.students.forEach(function(st) {
        var nm = normalize(st.name || '');
        if (!nm) return;
        var found = (data.students || []).find(function(x) { return x.groupId === remote.group_id && normalize(x.name) === nm; });
        if (found && rIds.indexOf(found.id) === -1) rIds.push(found.id);
      });
    }
    return {
      id: remote.id,
      groupId: remote.group_id,
      studentIds: rIds,
      date: remote.date || '',
      time: remote.time || (ctx && ctx.time) || '',
      ruleId: remote.rule_id || (ctx && ctx.ruleId) || null,
      extraId: remote.extra_id || (ctx && ctx.extraId) || null,
      lessonNumber: remote.lesson_number || '',
      duration: remote.duration || 0,
      subject: remote.subject || 'quran',
      report: remote.report || '',
      data: sData,
      attachmentIds: remote.attachment_ids || [],
      savedAt: remote.saved_at || null,
      updated_at: remote.updated_at || null
    };
  }
  if (table === 'appointments') {
    var cleanRuleId = remote.rule_id;
    if (cleanRuleId === 'null' || cleanRuleId === 'undefined') cleanRuleId = null;
    return {
      id: remote.id,
      groupId: remote.group_id,
      date: remote.date || '',
      time: remote.time || '',
      ruleId: cleanRuleId || null,
      type: remote.type,
      studentIds: Array.isArray(remote.student_ids) ? remote.student_ids : null,
      updated_at: remote.updated_at || null
    };
  }
  if (table === 'monthly_reports') {
    return {
      id: remote.id,
      ownerType: remote.owner_type,
      ownerId: remote.owner_id,
      year: remote.year,
      month: remote.month,
      text: remote.text || '',
      savedAt: remote.saved_at || null,
      updated_at: remote.updated_at || null
    };
  }
  return remote;
}

export function refreshUIIfNeeded(table) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var isCalendarChange = (table === 'appointments' || table === 'sessions');
  var isEntityChange = (table === 'groups' || table === 'students');

  try {
    var homeActive = Boolean(document.getElementById('tab-home')?.classList.contains('active'));
    if ((isCalendarChange || isEntityChange || homeActive) && typeof window.renderHome === 'function') {
      window.renderHome();
    }
  } catch (e) {
    console.warn('refreshUIIfNeeded(home):', e);
  }

  try {
    var calendarActive = Boolean(document.getElementById('tab-calendar')?.classList.contains('active'));
    if ((isCalendarChange || isEntityChange || calendarActive) && typeof window.renderCalendar === 'function') {
      window.renderCalendar();
    }
    if (typeof window.updatePendingBadge === 'function') {
      window.updatePendingBadge();
    }
  } catch (e) {
    console.warn('refreshUIIfNeeded(calendar):', e);
  }

  try {
    var libraryActive = Boolean(document.getElementById('tab-library')?.classList.contains('active'));
    if (libraryActive) {
      if (typeof window.renderGroupsList === 'function') window.renderGroupsList();
      if (typeof window.renderStudentsList === 'function') window.renderStudentsList();
      if (window.currentViewGroupId && typeof window.openGroupDetail === 'function') {
        if ((data.groups || []).find(function(g) { return g.id === window.currentViewGroupId; })) {
          window.openGroupDetail(window.currentViewGroupId);
        } else if (typeof window.backToGroups === 'function') {
          window.backToGroups();
        }
      }
      if (window.currentViewStudentId && typeof window.openStudentDetail === 'function') {
        if ((data.students || []).find(function(s) { return s.id === window.currentViewStudentId; })) {
          window.openStudentDetail(window.currentViewStudentId, window.studentBackTarget);
        } else if (typeof window.backToStudents === 'function') {
          window.backToStudents();
        }
      }
    }
  } catch (e) {
    console.warn('refreshUIIfNeeded(library):', e);
  }
}

export function teardownRealtimeSync() {
  var channel = _realtimeChannel;
  _realtimeChannel = null;
  _realtimeEnabled = false;
  _realtimeSubscribing = false;
  _realtimeUserId = null;

  if (channel && supabaseClient) {
    try {
      supabaseClient.removeChannel(channel);
    } catch (e) {
      console.warn('teardownRealtimeSync:', e);
    }
    console.log('🔌 تم إيقاف المزامنة اللحظية');
  }
}

// ═══════════════ AUTO-SYNC INFRASTRUCTURE ═══════════════
var _syncDebounceTimer = null;
var _syncing = false;
var _pendingSync = false;

export function scheduleAutoSync() {
  _lastLocalWrite = Date.now();
  if (!currentUser) return;
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(async function() {
    if (_syncing) {
      _pendingSync = true;
      return;
    }
    if (!currentUser) return;
    _syncing = true;
    try {
      await uploadToCloud(true);
    } catch (e) {
      console.warn('Auto-sync failed:', e);
    } finally {
      _syncing = false;
      if (_pendingSync) {
        _pendingSync = false;
        scheduleAutoSync();
      }
    }
  }, 1500);
}

// ═══════════════ AUTHENTICATION LOGIC ═══════════════
export function showAuthOverlay() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'flex';
}

export function skipAuth() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'none';
  localStorage.setItem('quran_skip_auth', 'true');
  showNotify('يعمل التطبيق محلياً. لن تتم المزامنة.');
}

export async function handleAuth(action) {
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
    localStorage.removeItem('quran_skip_auth');
    var result;
    if (action === 'login') {
      result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    } else {
      result = await supabaseClient.auth.signUp({ email: email, password: password });
    }

    if (result.error) throw result.error;

    if (action === 'signup' && result.data.user && !result.data.session) {
      showNotify('📧 تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب.');
      errorEl.innerHTML = 'تم إنشاء الحساب ولكن يحتاج إلى تأكيد. راجع بريدك الإلكتروني.';
      errorEl.style.display = 'block';
      return;
    }

    showNotify('✅ تم تسجيل الدخول بنجاح');
    document.getElementById('authOverlay').style.display = 'none';
    var user = await getCurrentUser();
    var lastUserId = localStorage.getItem('quran_last_user_id');
    if (lastUserId && user && lastUserId !== user.id) {
      console.log('🔄 مستخدم مختلف — جاري مسح البيانات القديمة');
      await clearLocalData();
    }
    if (user) localStorage.setItem('quran_last_user_id', user.id);
    setupRealtimeSync();

    await downloadFromCloud(true);

    if (typeof window.renderHome === 'function') window.renderHome();
    if (typeof window.renderGroupsList === 'function') window.renderGroupsList();
    if (typeof window.renderStudentsList === 'function') window.renderStudentsList();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();

    await cleanupOldTrash();

  } catch (error) {
    console.error('Auth error:', error);
    var msg = error.message || 'حدث خطأ أثناء المصادقة';

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

// ═══ فحص الجلسة ═══
export async function checkSession() {
  if (!supabaseClient) return;
  if (localStorage.getItem('quran_skip_auth') === 'true') {
    console.log('وضع محلي — تخطي شاشة الدخول');
    return;
  }
  try {
    var { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      console.log('✅ Active session found');
      var user = await getCurrentUser();
      var lastUserId = localStorage.getItem('quran_last_user_id');
      if (lastUserId && user && lastUserId !== user.id) {
        await clearLocalData();
      }
      if (user) localStorage.setItem('quran_last_user_id', user.id);
      setupRealtimeSync();
      var overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';

      // تنزيل ومزامنة ذكية صامتة دائماً عند فتح التطبيق بغض النظر عن وجود بيانات محلية
      await downloadFromCloud(true);
    } else {
      showAuthOverlay();
    }
  } catch (e) {
    console.error('Session check failed:', e);
    showAuthOverlay();
  }
}

// ═══════════════ UPLOAD TO CLOUD ═══════════════
export async function uploadToCloud(silent) {
  if (!supabaseClient) { if (!silent) showNotify('خطأ في الاتصال'); return false; }
  const user = await getCurrentUser();
  if (!user) { if (!silent) showNotify('يجب تسجيل الدخول أولاً'); return false; }

  if (!silent) showNotify('⏳ جاري رفع البيانات للسحابة...');
  console.log('🚀 بدء المزامنة' + (silent ? ' (صامتة)' : '') + '...');

  try {
    await flushPendingDeletesToCloud();
    clearPendingDeletes();
    _lastLocalWrite = Date.now();

    var nowISO = new Date().toISOString();

    // 1. رفع المجموعات (دفعة واحدة)
    if (data.groups.length > 0) {
      const groupsToUpload = data.groups.map(g => {
        g.updated_at = nowISO;
        return {
          id: g.id, user_id: user.id, name: g.name, teacher_name: g.teacherName || '',
          timezone: g.timezone || '', link: g.link || '', location: g.location || '',
          constants: g.constants || [], schedule: g.schedule || [],
          report_settings: g.reportSettings || {}, is_deleted: false,
          updated_at: nowISO
        };
      });
      const { error } = await supabaseClient.from('groups').upsert(groupsToUpload);
      if (error) throw new Error('المجموعات: ' + error.message);
      console.log('✅ تم رفع المجموعات:', groupsToUpload.length);
    }

    // 2. رفع الطلاب (دفعة واحدة)
    if (data.students.length > 0) {
      const studentsToUpload = data.students.map(s => {
        s.updated_at = nowISO;
        return {
          id: s.id, user_id: user.id, group_id: s.groupId, name: s.name, phone: s.phone || '',
          country: s.country || '', timezone: s.timezone || '', guardian_name: s.guardianName || '',
          birth_date: s.birthDate || null, current_level: s.currentLevel || '',
          gender: s.gender || 'male',
          constants: s.constants || [], static_texts: s.staticTexts || [], report_settings: s.reportSettings || {},
          notes: s.notes || '', is_deleted: false,
          updated_at: nowISO
        };
      });
      const { error } = await supabaseClient.from('students').upsert(studentsToUpload);
      if (error) throw new Error('الطلاب: ' + error.message);
      console.log('✅ تم رفع الطلاب:', studentsToUpload.length);
    }

    // 3. رفع الحصص (دفعة واحدة)
    if (data.sessions.length > 0) {
      const sessionsToUpload = data.sessions.map(sess => {
        sess.updated_at = nowISO;
        return {
          id: sess.id, user_id: user.id, group_id: sess.groupId, date: sess.date || null,
          student_ids: Array.isArray(sess.studentIds) ? sess.studentIds : [],
          time: sess.time || '',
          rule_id: sess.ruleId || null,
          lesson_number: sess.lessonNumber || '', duration: parseInt(sess.duration) || 0,
          subject: sess.subject || '', report: sess.report || '', data: sess.data || {},
          attachment_ids: sess.attachmentIds || [], is_deleted: false,
          updated_at: nowISO
        };
      });
      const { error } = await supabaseClient.from('sessions').upsert(sessionsToUpload);
      if (error) throw new Error('الحصص: ' + error.message);
      console.log('✅ تم رفع الحصص:', sessionsToUpload.length);
    }

    // 4. رفع المواعيد (دفعة واحدة)
    if (data.appointments.length > 0) {
      const apptsToUpload = data.appointments.map(a => {
        a.updated_at = nowISO;
        var cleanRuleId = a.ruleId;
        if (cleanRuleId === 'null' || cleanRuleId === 'undefined') cleanRuleId = null;
        return {
          id: a.id,
          user_id: user.id,
          group_id: a.groupId,
          date: a.date || null,
          time: a.time || null,
          rule_id: cleanRuleId || null,
          student_ids: (Array.isArray(a.studentIds) && a.studentIds.length) ? a.studentIds : null,
          type: a.type,
          is_deleted: false,
          updated_at: nowISO
        };
      });
      const { error } = await supabaseClient.from('appointments').upsert(apptsToUpload);
      if (error) throw new Error('المواعيد: ' + error.message);
      console.log('✅ تم رفع المواعيد:', apptsToUpload.length);
    }

    // 5. رفع التقارير الشهرية (دفعة واحدة)
    if (data.monthlyReports.length > 0) {
      const reportsToUpload = data.monthlyReports.map(r => {
        r.updated_at = nowISO;
        return {
          id: r.id, user_id: user.id, owner_type: r.ownerType, owner_id: r.ownerId,
          year: r.year, month: r.month, text: r.text || '', is_deleted: false,
          updated_at: nowISO
        };
      });
      const { error } = await supabaseClient.from('monthly_reports').upsert(reportsToUpload);
      if (error) throw new Error('التقارير: ' + error.message);
      console.log('✅ تم رفع التقارير:', reportsToUpload.length);
    }

    // 6. رفع الإعدادات (Settings)
    const { error: settingsErr } = await supabaseClient.from('profiles').upsert({
      id: user.id,
      settings: data.settings
    });
    if (settingsErr) throw new Error('الإعدادات: ' + settingsErr.message);
    console.log('✅ تم رفع الإعدادات');

    // حفظ الطوابع الزمنية المحدثة محلياً دون تفعيل Auto-Sync
    await _doSave();

    if (!silent) showNotify('✅ تمت المزامنة بنجاح!');
    console.log('🎉 المزامنة اكتملت بنجاح!');
    _lastLocalWrite = Date.now();
    return true;

  } catch (error) {
    console.error('❌ خطأ في المزامنة:', error);
    if (!silent) alert('فشل الرفع: ' + error.message);
    return false;
  }
}

// ═══════════════ DOWNLOAD FROM CLOUD ═══════════════
var _downloadInFlight = null;

export async function downloadFromCloud(silent) {
  if (!supabaseClient) return false;
  if (silent === true && _downloadInFlight) {
    return _downloadInFlight;
  }

  var runPromise = _runDownloadFromCloud(silent);
  if (silent === true) {
    _downloadInFlight = runPromise;
  }
  try {
    return await runPromise;
  } finally {
    if (_downloadInFlight === runPromise) {
      _downloadInFlight = null;
    }
  }
}

async function _runDownloadFromCloud(silent) {
  const user = await getCurrentUser();
  if (!user) return false;

  var isSilent = silent === true;
  if (!isSilent) showNotify('⏳ جاري سحب البيانات من السحابة...');

  const fetchWithTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاتصال بالشبكة')), ms))
  ]);

  try {
    const { data: groupsData, error: groupsErr } = await fetchWithTimeout(
      supabaseClient.from('groups').select('*').eq('is_deleted', false),
      15000
    );
    if (groupsErr) throw groupsErr;

    var hasLocalData = (data.groups.length > 0) || (data.students.length > 0) || (data.sessions.length > 0);

    // ═══ السحابة فارغة → ارفع المحلي إن وجد ═══
    if (!groupsData || groupsData.length === 0) {
      if (hasLocalData) {
        console.log('السحابة فارغة، سيتم رفع البيانات المحلية تلقائياً...');
        await uploadToCloud(isSilent);
      }
      return true;
    }

    // ═══ في السحب اليدوي فقط مع وجود بيانات محلية: خيار التأكيد + نسخة احتياطية ═══
    if (!isSilent && hasLocalData) {
      var choice = confirm(
        '⚠️ السحابة تحتوي على بيانات، وجهازك أيضاً.\n\n' +
        '• «موافق» = استبدال البيانات المحلية ببيانات السحابة\n' +
        '• «إلغاء» = الاحتفاظ بالبيانات المحلية ورفعها للسحابة\n\n' +
        'توصية: اختر «إلغاء» إذا كان جهازك يحتوي على تعديلات حديثة.'
      );
      if (!choice) {
        await uploadToCloud(false);
        return true;
      }

      try {
        var _snapshot = deepClone(data);
        var metaStore = (typeof window !== 'undefined' && window.IDB_META_STORE) ? window.IDB_META_STORE : 'meta';
        await idbSet('pre_download_backup', _snapshot, metaStore);
        console.log('📦 تم أخذ نسخة احتياطية محلية (IndexedDB) قبل التنزيل من السحابة');
      } catch (e) {
        console.warn('فشل حفظ snapshot قبل التنزيل في IndexedDB:', e);
      }
    }

    const { data: studentsData, error: studentsErr } = await fetchWithTimeout(
      supabaseClient.from('students').select('*').eq('is_deleted', false),
      15000
    );
    if (studentsErr) throw studentsErr;

    const { data: sessionsData, error: sessionsErr } = await fetchWithTimeout(
      supabaseClient.from('sessions').select('*').eq('is_deleted', false),
      15000
    );
    if (sessionsErr) throw sessionsErr;

    const { data: appointmentsData, error: apptErr } = await fetchWithTimeout(
      supabaseClient.from('appointments').select('*').eq('is_deleted', false),
      15000
    );
    if (apptErr) throw apptErr;

    const { data: reportsData, error: reportsErr } = await fetchWithTimeout(
      supabaseClient.from('monthly_reports').select('*').eq('is_deleted', false),
      15000
    );
    if (reportsErr) throw reportsErr;

    function notPendingDelete(table, id) {
      return !_pendingDeletes[table] || _pendingDeletes[table].indexOf(id) === -1;
    }

    var remoteGroups = (groupsData || [])
      .filter(g => notPendingDelete('groups', g.id))
      .map(g => convertRemoteToLocal('groups', g));

    var remoteStudents = (studentsData || [])
      .filter(s => notPendingDelete('students', s.id))
      .map(s => convertRemoteToLocal('students', s));

    // تطبيق دمج المجموعات والطلاب أولاً حتى تتوفر لاستعادة studentIds في الحصص
    if (isSilent) {
      data.groups = smartMergeById(data.groups, remoteGroups);
      data.students = smartMergeById(data.students, remoteStudents);
    } else {
      data.groups = remoteGroups;
      data.students = remoteStudents;
    }

    var remoteSessions = (sessionsData || [])
      .filter(s => notPendingDelete('sessions', s.id))
      .map(s => convertRemoteToLocal('sessions', s));

    var remoteAppointments = (appointmentsData || [])
      .filter(a => notPendingDelete('appointments', a.id))
      .map(a => convertRemoteToLocal('appointments', a));

    var remoteReports = (reportsData || [])
      .filter(r => notPendingDelete('monthly_reports', r.id))
      .map(r => convertRemoteToLocal('monthly_reports', r));

    if (isSilent) {
      // دمج صامت غير هدّام مع منع التكرار
      data.sessions = smartMergeWithDeduplication(data.sessions, remoteSessions, isDuplicateSession);
      data.appointments = smartMergeWithDeduplication(data.appointments, remoteAppointments, isDuplicateAppointment);
      data.monthlyReports = smartMergeById(data.monthlyReports, remoteReports);
    } else {
      // استبدال يدوي كامل مع تطبيق نفس منطق منع التكرار
      data.sessions = deduplicateSessions(remoteSessions);
      data.appointments = deduplicateAppointments(remoteAppointments);
      data.monthlyReports = remoteReports;
    }

    // 6. سحب الإعدادات (Settings)
    const { data: profileData, error: profileErr } = await fetchWithTimeout(
      supabaseClient
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .maybeSingle(),
      15000
    );

    if (!profileErr && profileData && profileData.settings) {
      data.settings = Object.assign({}, data.settings, profileData.settings);
      if (Array.isArray(data.settings.browserFavorites)) {
        if (typeof window !== 'undefined' && window.browserState) window.browserState.favorites = data.settings.browserFavorites;
        try { localStorage.setItem('quran_browser_favs_v1', JSON.stringify(data.settings.browserFavorites)); } catch (e) {}
        if (typeof window !== 'undefined' && typeof window.renderSettingsFavs === 'function') window.renderSettingsFavs();
      }
      console.log('✅ تم سحب الإعدادات');
    }

    await _doSave();

    if (typeof window !== 'undefined') {
      try { if (typeof window.renderHome === 'function') window.renderHome(); } catch (e) {}
      try { if (typeof window.renderGroupsList === 'function') window.renderGroupsList(); } catch (e) {}
      try { if (typeof window.renderStudentsList === 'function') window.renderStudentsList(); } catch (e) {}
      try { if (typeof window.renderCalendar === 'function') window.renderCalendar(); } catch (e) {}
      try { if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge(); } catch (e) {}
    }

    if (!isSilent) showNotify('✅ تم سحب البيانات بنجاح!');
    return true;

  } catch (error) {
    console.error('Download error:', error);
    if (!isSilent) showNotify('❌ فشل سحب البيانات: ' + error.message);
    return false;
  }
}

// ═══════════════ استعادة النسخة السابقة للتنزيل (IndexedDB) ═══════════════
export async function restorePreDownloadBackup() {
  try {
    var metaStore = (typeof window !== 'undefined' && window.IDB_META_STORE) ? window.IDB_META_STORE : 'meta';
    var backupData = await idbGet('pre_download_backup', metaStore);
    if (!backupData) {
      showNotify('⚠️ لا توجد نسخة احتياطية سابقة للتنزيل في IndexedDB');
      return false;
    }
    setData(backupData);
    await saveDataAsync();
    showNotify('✅ تم استعادة النسخة السابقة للتنزيل بنجاح');
    if (typeof window !== 'undefined') {
      if (typeof window.renderHome === 'function') window.renderHome();
      if (typeof window.renderGroupsList === 'function') window.renderGroupsList();
      if (typeof window.renderStudentsList === 'function') window.renderStudentsList();
      if (typeof window.renderCalendar === 'function') window.renderCalendar();
    }
    setTimeout(function() { location.reload(); }, 1000);
    return true;
  } catch (e) {
    console.error('restorePreDownloadBackup failed:', e);
    showNotify('❌ فشل استعادة النسخة الاحتياطية');
    return false;
  }
}

export async function handleLogout() {
  if (!confirm('هل أنت متأكد من تسجيل الخروج؟ سيتم مسح البيانات المحلية والعودة لشاشة الدخول.')) return;
  try {
    if (supabaseClient) await supabaseClient.auth.signOut();
  } catch (e) {}
  currentUser = null;
  if (typeof window !== 'undefined') window.currentUser = null;
  if (typeof teardownRealtimeSync === 'function') teardownRealtimeSync();

  await clearLocalData();
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
}

export async function openTrashModal() {
  if (!supabaseClient) { showNotify('يجب تسجيل الدخول لعرض سلة المهملات'); return; }
  if (typeof window.openGenericModal !== 'function') return;
  window.openGenericModal('سلة المهملات', '<div id="trashListContainer" style="text-align:center;padding:20px">جاري جلب البيانات المحذوفة من السحابة...</div>', '<button class="btn btn-secondary" onclick="closeGenericModal()">إغلاق</button>');
  try {
    var tables = [
      { name: 'groups', label: 'مجموعة' },
      { name: 'students', label: 'طالب' },
      { name: 'sessions', label: 'حصة' },
      { name: 'monthly_reports', label: 'تقرير شهري' },
      { name: 'appointments', label: 'موعد' }
    ];
    var allDeleted = [];
    for (var t of tables) {
      var { data: rows } = await supabaseClient.from(t.name).select('*').eq('is_deleted', true).eq('user_id', currentUser.id);
      if (rows) rows.forEach(r => allDeleted.push({ table: t.name, label: t.label, ...r }));
    }
    var container = document.getElementById('trashListContainer');
    if (!container) return;
    if (allDeleted.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted)">سلة المهملات فارغة</div>';
      return;
    }
    var html = '';
    allDeleted.forEach(function(item) {
      var title = item.name || item.lesson_number || (item.type + ' - ' + item.date) || 'عنصر محذوف';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--card-border);text-align:right">'
        + '<div><div style="font-weight:700;font-size:.85rem">' + escapeHtml(title) + '</div><div style="font-size:.7rem;color:var(--text-muted)">' + item.label + '</div></div>'
        + '<button class="btn btn-sm btn-primary" onclick="restoreTrashItem(\'' + item.table + '\', \'' + item.id + '\')" style="padding:4px 10px;font-size:.75rem">استعادة</button>'
        + '</div>';
    });
    container.innerHTML = html;
  } catch (e) {
    console.error(e);
    if (document.getElementById('trashListContainer')) document.getElementById('trashListContainer').innerHTML = '<div style="color:var(--accent-red)">حدث خطأ أثناء الجلب</div>';
  }
}

export async function restoreTrashItem(table, id) {
  if (!confirm('هل تريد استعادة هذا العنصر؟')) return;
  try {
    var { error } = await supabaseClient.from(table).update({ is_deleted: false }).eq('id', id);
    if (error) throw error;
    showNotify('✅ تمت الاستعادة بنجاح');
    if (typeof window.closeGenericModal === 'function') window.closeGenericModal();
    await downloadFromCloud(true);
  } catch (e) {
    console.error(e);
    showNotify('❌ فشل الاستعادة');
  }
}

export async function cleanupOldTrash() {
  if (!supabaseClient || !currentUser) return;
  var threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  var tables = ['groups', 'students', 'sessions', 'monthly_reports', 'appointments'];
  var deletedCount = 0;

  for (var i = 0; i < tables.length; i++) {
    var t = tables[i];
    try {
      var { data: oldRows } = await supabaseClient.from(t).select('id').eq('is_deleted', true).eq('user_id', currentUser.id).lt('updated_at', threshold);
      if (oldRows && oldRows.length > 0) {
        var ids = oldRows.map(function(r) { return r.id; });
        await supabaseClient.from(t).delete().in('id', ids);
        deletedCount += ids.length;
        console.log('🗑️ حذف نهائي من السحابة:', t, ids.length);

        var localArr = getLocalArray(t);
        if (localArr) {
          setLocalArray(t, localArr.filter(function(r) { return ids.indexOf(r.id) === -1; }));
        }
      }
    } catch (e) {
      console.warn('Cleanup failed for ' + t, e);
    }
  }
  if (deletedCount > 0) {
    await _doSave();
  }
}

export async function clearLocalData() {
  try {
    if (_idb) {
      var stores = ['main', 'attachments'];
      for (var i = 0; i < stores.length; i++) {
        await new Promise(function(resolve) {
          var tx = _idb.transaction(stores[i], 'readwrite');
          var req = tx.objectStore(stores[i]).clear();
          req.onsuccess = function() { resolve(); };
          req.onerror = function() { resolve(); };
        });
      }
    }
    localStorage.removeItem('quran_data_v4');
    localStorage.removeItem('quran_last_user_id');
    setData({ groups: [], students: [], sessions: [], monthlyReports: [], appointments: [], workSessions: [], activeTimer: null, settings: { theme: 'dark', teacherName: '', teacherTimezone: '', designTheme: 'teal' } });
    console.log('🧹 تم مسح البيانات المحلية');
  } catch (e) { console.warn('clearLocalData failed:', e); }
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    supabaseClient,
    currentUser,
    getCurrentUser,
    parseTimestampMs,
    getRowTimestampMs,
    isDuplicateSession,
    isDuplicateAppointment,
    deduplicateSessions,
    deduplicateAppointments,
    setupRealtimeSync,
    teardownRealtimeSync,
    convertRemoteToLocal,
    upsertLocalRow,
    removeLocalById,
    getLocalArray,
    setLocalArray,
    refreshUIIfNeeded,
    scheduleAutoSync,
    showAuthOverlay,
    skipAuth,
    handleAuth,
    checkSession,
    uploadToCloud,
    downloadFromCloud,
    restorePreDownloadBackup,
    handleLogout,
    openTrashModal,
    restoreTrashItem,
    cleanupOldTrash,
    clearLocalData
  });
}
