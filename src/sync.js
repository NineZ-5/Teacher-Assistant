/* ═══════════════════════════════════════════════════════════
   src/sync.js — إدارة المزامنة السحابية والمصادقة (Supabase)
   ═══════════════════════════════════════════════════════════ */

import { showNotify, deepClone, escapeHtml } from './utils.js';
import { idbSet, idbGet } from './idb.js';
import {
  data,
  setData,
  _doSave,
  saveData,
  saveDataAsync,
  _pendingDeletes,
  clearPendingDeletes,
  flushPendingDeletesToCloud,
  queueDelete
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

// ═══════════════ REALTIME SYNC ═══════════════
var _realtimeChannel = null;
var _realtimeEnabled = false;
var _lastLocalWrite = 0;  // طابع زمني لآخر تعديل محلي (لمنع الصدى)

// الجداول المشمولة في المزامنة
var SYNC_TABLES = ['groups', 'students', 'sessions', 'appointments', 'monthly_reports'];

export function setupRealtimeSync() {
  if (supabaseClient && !window._authListenerAdded) {
    window._authListenerAdded = true;
    supabaseClient.auth.onAuthStateChange(function(event, session) {
      if (session && session.user) {
        currentUser = session.user;
        window.currentUser = session.user;
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        window.currentUser = null;
      }
      if (typeof window.switchTab === 'function' && document.getElementById('tab-settings')?.classList.contains('active')) {
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
  if (_realtimeEnabled) return;

  console.log('🔌 إعداد المزامنة اللحظية...');

  // إنشاء قناة واحدة لكل الجداول
  _realtimeChannel = supabaseClient.channel('teacher-assistant-sync');

  SYNC_TABLES.forEach(function(table) {
    _realtimeChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: 'user_id=eq.' + currentUser.id   // كل مستخدم يرى تغييراته فقط
      },
      function(payload) {
        handleRealtimeChange(table, payload);
      }
    );
  });

  _realtimeChannel.subscribe(function(status) {
    if (status === 'SUBSCRIBED') {
      _realtimeEnabled = true;
      console.log('✅ المزامنة اللحظية جاهزة');
      console.log('🔄 المزامنة اللحظية مفعّلة');
      showNotify('🔄 المزامنة اللحظية مفعّلة');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      _realtimeEnabled = false;
      console.warn('⚠️ فشل الاتصال اللحظي:', status);
    }
  });
}

function handleRealtimeChange(table, payload) {
  console.log('📥 حدث لحظي وصل:', table, payload.eventType, 'is_deleted:', payload.new ? payload.new.is_deleted : 'N/A');
  // منع الصدى: إذا كان آخر تعديل محلي خلال آخر 3 ثوانٍ، تجاهل
  if (Date.now() - _lastLocalWrite < 3000) {
    console.log('🔇 تجاهل صدى محلي:', table);
    return;
  }

  var eventType = payload.eventType;  // INSERT, UPDATE, DELETE
  var newRow = payload.new;
  var oldRow = payload.old;

  console.log('📥 تغيير لحظي:', table, eventType);

  // ─── الحذف ───
  if (eventType === 'DELETE') {
    // استخدم oldRow.id (متوفر بسبب REPLICA IDENTITY FULL)
    if (oldRow && oldRow.id) {
      removeLocalById(table, oldRow.id);
    }
    return;
  }

  // ─── الإدراج أو التحديث ───
  if (!newRow || !newRow.id) return;
  upsertLocalRow(table, newRow);
}

export function removeLocalById(table, id) {
  var arr = getLocalArray(table);
  if (!arr) return;
  var before = arr.length;
  var filtered = arr.filter(function(r) { return r.id !== id; });
  setLocalArray(table, filtered);
  if (filtered.length !== before) {
    saveData();
    refreshUIIfNeeded(table);
  }
}

export function upsertLocalRow(table, remoteRow) {
  var arr = getLocalArray(table);
  if (!arr) return;

  // ═══ إصلاح: إذا كان الصف محذوفاً في السحابة، احذفه محلياً ولا تضفه ═══
  if (remoteRow.is_deleted === true) {
    removeLocalById(table, remoteRow.id);
    return;
  }

  var localIndex = arr.findIndex(function(r) { return r.id === remoteRow.id; });

  if (localIndex === -1) {
    // صف جديد → أضِفه
    arr.push(convertRemoteToLocal(table, remoteRow));
  } else {
    // صف موجود → قارن updated_at
    var localRow = arr[localIndex];
    var localTime = localRow.updated_at || 0;
    var remoteTime = remoteRow.updated_at || 0;

    if (remoteTime > localTime) {
      // السحابة أحدث → استبدل
      arr[localIndex] = convertRemoteToLocal(table, remoteRow);
    } else {
      // محلي أحدث → تجاهل
      return;
    }
  }

  setLocalArray(table, arr);
  saveData();
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
  // تحويل أسماء الحقول من snake_case إلى camelCase
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
      updated_at: remote.updated_at
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
      constants: remote.constants || [],
      staticTexts: remote.static_texts || [],
      notes: remote.notes || '',
      updated_at: remote.updated_at
    };
  }
  if (table === 'sessions') {
    return {
      id: remote.id,
      groupId: remote.group_id,
      studentIds: remote.student_ids || [],
      date: remote.date || '',
      lessonNumber: remote.lesson_number || '',
      duration: remote.duration || 0,
      subject: remote.subject || 'quran',
      report: remote.report || '',
      data: remote.data || {},
      attachmentIds: remote.attachment_ids || [],
      savedAt: remote.saved_at,
      updated_at: remote.updated_at
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
      updated_at: remote.updated_at
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
      savedAt: remote.saved_at,
      updated_at: remote.updated_at
    };
  }
  return remote;
}

export function refreshUIIfNeeded(table) {
  try {
    if (typeof window.renderHome === 'function' && document.getElementById('tab-home')?.classList.contains('active')) window.renderHome();
    if (typeof window.renderCalendar === 'function' && document.getElementById('tab-calendar')?.classList.contains('active')) window.renderCalendar();
    if (typeof window.renderGroupsList === 'function' && document.getElementById('tab-library')?.classList.contains('active')) {
      window.renderGroupsList();
      if (typeof window.renderStudentsList === 'function') window.renderStudentsList();
      
      // تحديث الشاشات المفتوحة (تفاصيل مجموعة أو طالب)
      if (window.currentViewGroupId && typeof window.openGroupDetail === 'function') {
        if (data.groups.find(g => g.id === window.currentViewGroupId)) {
          window.openGroupDetail(window.currentViewGroupId);
        } else {
          if (typeof window.backToGroups === 'function') window.backToGroups();
        }
      }
      if (window.currentViewStudentId && typeof window.openStudentDetail === 'function') {
        if (data.students.find(s => s.id === window.currentViewStudentId)) {
          window.openStudentDetail(window.currentViewStudentId, window.studentBackTarget);
        } else {
          if (typeof window.backToStudents === 'function') window.backToStudents();
        }
      }
    }
  } catch (e) {
    console.warn('refreshUIIfNeeded:', e);
  }
}

export function teardownRealtimeSync() {
  if (_realtimeChannel && supabaseClient) {
    supabaseClient.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
    _realtimeEnabled = false;
    console.log('🔌 تم إيقاف المزامنة اللحظية');
  }
}

// ═══════════════ AUTO-SYNC INFRASTRUCTURE ═══════════════
var _syncDebounceTimer = null;
var _syncing = false;

export function scheduleAutoSync(){
  if (!currentUser) return;             // غير مسجل → لا مزامنة
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(async function(){
    if (_syncing) return;
    if (!currentUser) return;
    _syncing = true;
    try {
      await uploadToCloud(true);        // صامت
    } catch(e){
      console.warn('Auto-sync failed:', e);
    } finally {
      _syncing = false;
    }
  }, 3000);                              // ٣ ثوانٍ debounce
}

// ═══════════════ AUTHENTICATION LOGIC ═══════════════
export function showAuthOverlay() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'flex';
}

export function skipAuth() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'none';
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
    await getCurrentUser();
    setupRealtimeSync();
    
    // سحب البيانات إذا كان الجهاز فارغاً، وتحديث الواجهة
    var hasLocalData = (data.groups.length > 0) || (data.students.length > 0) || (data.sessions.length > 0);
    if (!hasLocalData) {
      await downloadFromCloud(true);
    }
    if (typeof window.renderHome === 'function') window.renderHome();
    if (typeof window.renderGroupsList === 'function') window.renderGroupsList();
    if (typeof window.renderStudentsList === 'function') window.renderStudentsList();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
    
    // تشغيل دالة تنظيف المهملات تلقائياً
    await cleanupOldTrash();

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

// ═══ فحص الجلسة (النسخة النهائية مع setupRealtimeSync — Fix 2) ═══
export async function checkSession() {
  if (!supabaseClient) return;
  try {
    var { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      console.log('✅ Active session found');
      await getCurrentUser();
      setupRealtimeSync();
      var overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';
      
      // ═══ تنزيل تلقائي فقط إذا كان الجهاز فارغ (تثبيت جديد) ═══
      var hasLocalData = (data.groups.length > 0) || (data.students.length > 0) || (data.sessions.length > 0);
      if (!hasLocalData) {
        console.log('جهاز فارغ — تنزيل تلقائي من السحابة...');
        await downloadFromCloud(true);   // صامت
      } else {
        console.log('جهازك به بيانات — لن نُعيد التنزيل تلقائياً. استخدم زر "سحب البيانات" عند الحاجة.');
      }
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
    // ═══ أولاً: فرّغ المحذوفات للسحابة (soft delete) ═══
    await flushPendingDeletesToCloud();
    clearPendingDeletes();
    _lastLocalWrite = Date.now();

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
      const apptsToUpload = data.appointments.map(a => {
        var cleanRuleId = a.ruleId;
        if (cleanRuleId === 'null' || cleanRuleId === 'undefined') cleanRuleId = null;
        return {
          id: a.id,
          user_id: user.id,
          group_id: a.groupId,
          date: a.date || null,
          time: a.time || null,
          rule_id: cleanRuleId || null,
          type: a.type,
          is_deleted: false
        };
      });
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

    // 6. رفع الإعدادات (Settings)
    const { error: settingsErr } = await supabaseClient.from('profiles').upsert({
      id: user.id,
      settings: data.settings
    });
    if (settingsErr) throw new Error('الإعدادات: ' + settingsErr.message);
    console.log('✅ تم رفع الإعدادات');

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
export async function downloadFromCloud(silent) {
  if (!supabaseClient) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  if (!silent) showNotify('⏳ جاري سحب البيانات من السحابة...');

  // حماية من بطء شبكة الهاتف (Timeout 15 ثانية)
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

    // ═══ السحابة فارغة → ارفع المحلي (آمن) ═══
    if (!groupsData || groupsData.length === 0) {
      console.log('السحابة فارغة، سيتم رفع البيانات المحلية تلقائياً...');
      await uploadToCloud();
      return true;
    }

    // ═══ السحابة بها بيانات → تحقق من المحلي ═══
    var hasLocalData = (data.groups.length > 0) || (data.students.length > 0) || (data.sessions.length > 0);
    
    if (hasLocalData) {
      // الجهاز به بيانات أيضاً → نسأل المستخدم (إلا لو صامت)
      if (silent === true) {
        console.log('تخطي التنزيل التلقائي: جهازك به بيانات. استخدم زر "سحب البيانات" عند الحاجة.');
        return false;
      }
      var choice = confirm(
        '⚠️ السحابة تحتوي على بيانات، وجهازك أيضاً.\n\n' +
        '• «موافق» = استبدال البيانات المحلية ببيانات السحابة\n' +
        '• «إلغاء» = الاحتفاظ بالبيانات المحلية ورفعها للسحابة\n\n' +
        'توصية: اختر «إلغاء» إذا كان جهازك يحتوي على تعديلات حديثة.'
      );
      if (!choice) {
        await uploadToCloud();
        return true;
      }

      // ═══ Fix 5: حفظ Snapshot في IndexedDB قبل الاستبدال ═══
      try {
        var _snapshot = deepClone(data);
        var metaStore = (typeof window !== 'undefined' && window.IDB_META_STORE) ? window.IDB_META_STORE : 'meta';
        await idbSet('pre_download_backup', _snapshot, metaStore);
        console.log('📦 تم أخذ نسخة احتياطية محلية (IndexedDB) قبل التنزيل من السحابة');
      } catch(e) {
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

    // ═══ Fix 3: تعريف notPendingDelete واحد فقط (حذف التكرار الأول) ═══
    function notPendingDelete(table, id){
      return !_pendingDeletes[table] || _pendingDeletes[table].indexOf(id) === -1;
    }

    if (groupsData) {
      data.groups = groupsData
        .filter(g => notPendingDelete('groups', g.id))
        .map(g => ({
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
      data.students = studentsData
        .filter(s => notPendingDelete('students', s.id))
        .map(s => ({
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
      data.sessions = sessionsData
        .filter(s => notPendingDelete('sessions', s.id))
        .map(s => ({
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
      data.appointments = appointmentsData
        .filter(a => notPendingDelete('appointments', a.id))
        .map(a => {
          var cleanRuleId = a.rule_id;
          if (cleanRuleId === 'null' || cleanRuleId === 'undefined') cleanRuleId = null;
          return {
            id: a.id,
            groupId: a.group_id,
            date: a.date || '',
            time: a.time || '',
            ruleId: cleanRuleId || null,
            type: a.type
          };
        });
    }

    if (reportsData) {
      data.monthlyReports = reportsData
        .filter(r => notPendingDelete('monthly_reports', r.id))
        .map(r => ({
          id: r.id,
          ownerType: r.owner_type,
          ownerId: r.owner_id,
          year: r.year,
          month: r.month,
          text: r.text || '',
          savedAt: r.saved_at
        }));
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
        if (window.browserState) window.browserState.favorites = data.settings.browserFavorites;
        try { localStorage.setItem('quran_browser_favs_v1', JSON.stringify(data.settings.browserFavorites)); } catch(e){}
        if (typeof window.renderSettingsFavs === 'function') window.renderSettingsFavs();
      }
      console.log('✅ تم سحب الإعدادات');
    }

    await _doSave();
    if (typeof window.renderHome === 'function') window.renderHome();
    if (typeof window.renderGroupsList === 'function') window.renderGroupsList();
    if (typeof window.renderStudentsList === 'function') window.renderStudentsList();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    
    if (!silent) showNotify('✅ تم سحب البيانات بنجاح!');
    return true;

  } catch (error) {
    console.error('Download error:', error);
    if (!silent) showNotify('❌ فشل سحب البيانات: ' + error.message);
    return false;
  }
}

// ═══════════════ Fix 5: استعادة النسخة السابقة للتنزيل (IndexedDB) ═══════════════
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
    if (typeof window.renderHome === 'function') window.renderHome();
    if (typeof window.renderGroupsList === 'function') window.renderGroupsList();
    if (typeof window.renderStudentsList === 'function') window.renderStudentsList();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    setTimeout(function() { location.reload(); }, 1000);
    return true;
  } catch(e) {
    console.error('restorePreDownloadBackup failed:', e);
    showNotify('❌ فشل استعادة النسخة الاحتياطية');
    return false;
  }
}

export async function handleLogout() {
  if (!confirm('هل أنت متأكد من تسجيل الخروج؟ سيتم مسح البيانات المحلية والعودة لشاشة الدخول.')) return;
  try {
    if (supabaseClient) await supabaseClient.auth.signOut();
  } catch(e) {}
  currentUser = null;
  if (typeof window !== 'undefined') window.currentUser = null;
  if (typeof teardownRealtimeSync === 'function') teardownRealtimeSync();
  
  // مسح البيانات المحلية وإعادة التحميل
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
  } catch(e) {
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
    await downloadFromCloud(true); // تحديث البيانات محلياً
  } catch(e) {
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
        
        // حذف من الذاكرة المحلية أيضاً
        var localArr = getLocalArray(t);
        if (localArr) {
          setLocalArray(t, localArr.filter(function(r) { return ids.indexOf(r.id) === -1; }));
        }
      }
    } catch(e) { 
      console.warn('Cleanup failed for ' + t, e); 
    }
  }
  if (deletedCount > 0 && typeof saveData === 'function') saveData();
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    supabaseClient,
    currentUser,
    getCurrentUser,
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
    cleanupOldTrash
  });
}
