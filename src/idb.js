/* ═══════════════════════════════════════════════════════════
   src/idb.js — إدارة IndexedDB وضغط الصور
   ═══════════════════════════════════════════════════════════ */

export var _idb = null;
export var _idbReady = false;

export function setIdbReady(ready) {
  _idbReady = ready;
  if (typeof window !== 'undefined') window._idbReady = ready;
}

export function idbOpen(){
  return new Promise(function(resolve, reject){
    if (_idb) { resolve(_idb); return; }
    try {
      var dbName = window.IDB_NAME || 'quran_reports_db_v1';
      var dbVer = window.IDB_VERSION || 2;
      var storeMain = window.IDB_STORE || 'main';
      var storeMeta = window.IDB_META_STORE || 'meta';
      var storeAtt = window.IDB_ATTACHMENTS_STORE || 'attachments';

      var req = indexedDB.open(dbName, dbVer);
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        if (!db.objectStoreNames.contains(storeMain)) db.createObjectStore(storeMain);
        if (!db.objectStoreNames.contains(storeMeta)) db.createObjectStore(storeMeta);
        if (!db.objectStoreNames.contains(storeAtt)) db.createObjectStore(storeAtt);
      };
      req.onsuccess = function(e){
        _idb = e.target.result;
        window._idb = _idb;
        _idb.onclose = function(){ _idb = null; window._idb = null; setIdbReady(false); };
        resolve(_idb);
      };
      req.onerror = function(e){ reject(e.target.error || new Error('idb open failed')); };
      req.onblocked = function(){ reject(new Error('idb blocked')); };
    } catch(err) { reject(err); }
  });
}

export function idbGet(key, storeName){
  return new Promise(function(resolve, reject){
    if (!_idb) { reject(new Error('idb not open')); return; }
    try {
      var store = storeName || window.IDB_STORE || 'main';
      var tx = _idb.transaction(store, 'readonly');
      var req = tx.objectStore(store).get(key);
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    } catch(err) { reject(err); }
  });
}

export function idbSet(key, value, storeName){
  return new Promise(function(resolve, reject){
    if (!_idb) { reject(new Error('idb not open')); return; }
    try {
      var store = storeName || window.IDB_STORE || 'main';
      var tx = _idb.transaction(store, 'readwrite');
      var req = tx.objectStore(store).put(value, key);
      req.onsuccess = function(){ resolve(true); };
      req.onerror = function(){ reject(req.error); };
      tx.onabort = function(){ reject(tx.error || new Error('tx aborted')); };
    } catch(err) { reject(err); }
  });
}

export function idbDelete(key, storeName){
  return new Promise(function(resolve, reject){
    if (!_idb) { reject(new Error('idb not open')); return; }
    try {
      var store = storeName || window.IDB_STORE || 'main';
      var tx = _idb.transaction(store, 'readwrite');
      var req = tx.objectStore(store).delete(key);
      req.onsuccess = function(){ resolve(true); };
      req.onerror = function(){ reject(req.error); };
    } catch(err) { reject(err); }
  });
}

export function idbAttachmentSet(key, value){
  var storeAtt = window.IDB_ATTACHMENTS_STORE || 'attachments';
  return idbSet(key, value, storeAtt);
}

export function idbAttachmentGet(key){
  var storeAtt = window.IDB_ATTACHMENTS_STORE || 'attachments';
  return idbGet(key, storeAtt);
}

export function idbAttachmentDelete(key){
  var storeAtt = window.IDB_ATTACHMENTS_STORE || 'attachments';
  return idbDelete(key, storeAtt);
}

export function compressImage(file, maxDim, quality){
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

if (typeof window !== 'undefined') {
  Object.assign(window, {
    _idb,
    _idbReady,
    setIdbReady,
    idbOpen,
    idbGet,
    idbSet,
    idbDelete,
    idbAttachmentSet,
    idbAttachmentGet,
    idbAttachmentDelete,
    compressImage
  });
}
