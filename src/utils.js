/* ═══════════════════════════════════════════════════════════
   src/utils.js — دوال مساعدة عامة
   ═══════════════════════════════════════════════════════════ */

// تعريف currentAttachments مرة واحدة فقط (تم حذف التكرار)
export let currentAttachments = [];
export function setCurrentAttachments(val) {
  currentAttachments = val;
  if (typeof window !== 'undefined') window.currentAttachments = val;
}

export function genId(){
  // ١) محاولة crypto.randomUUID (Secure Context فقط)
  try{
    if(window.crypto && typeof crypto.randomUUID === 'function'){
      return crypto.randomUUID();
    }
  }catch(e){}

  // ٢) Fallback: توليد UUID v4 يدويًا عبر getRandomValues (يعمل في كل السياقات)
  try{
    if(window.crypto && typeof crypto.getRandomValues === 'function'){
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // اضبط بتيّ الإصدار (4) و variant
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = [];
      for(var i = 0; i < 16; i++){
        hex.push((bytes[i] < 16 ? '0' : '') + bytes[i].toString(16));
      }
      return hex.slice(0,4).join('') + '-' +
             hex.slice(4,6).join('')  + '-' +
             hex.slice(6,8).join('')  + '-' +
             hex.slice(8,10).join('') + '-' +
             hex.slice(10,16).join('');
    }
  }catch(e){}

  // ٣) آخر ملاذ: UUID بمولد عشوائي (لن يحدث إلا في متصفحات قديمة جدًا)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function safe(v){
  return (v === undefined || v === null) ? '' : v;
}

export function normalize(s){
  return (s||'').trim().replace(/\s+/g,' ');
}

export function fmtDate(d){
  return d ? d.split('-').reverse().join('/') : '';
}

export function toDateISO(d){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

export function escapeAttr(s){
  return escapeHtml(s);
}

export function showNotify(msg){
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

export function deepClone(obj){
  if (typeof structuredClone === 'function') {
    try { return structuredClone(obj); } catch(e){}
  }
  return JSON.parse(JSON.stringify(obj));
}

export function formatBytes(bytes){
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function formatDuration(minutes){
  if(!minutes || minutes < 1) return '0 دقيقة';
  var h = Math.floor(minutes/60), m = minutes % 60;
  var p = [];
  if(h > 0){ if(h === 1) p.push('ساعة'); else if(h === 2) p.push('ساعتان'); else if(h >= 3 && h <= 10) p.push(h + ' ساعات'); else p.push(h + ' ساعة'); }
  if(m > 0) p.push(m + ' دقيقة');
  return p.join(' و ');
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
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
  });
}
