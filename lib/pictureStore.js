// 写真の実データ(data URL)をlocalStorageではなくIndexedDBに保存するための薄いラッパー。
// localStorageは1オリジンあたり5MB程度しかなく、写真を含めるとすぐに上限に達するため、
// 画像バイト列だけをIndexedDB(数百MB〜GB単位で使えることが多い)に分離する。
const DB_NAME = "homeenergycodes-pictures";
const DB_VERSION = 1;
const STORE_NAME = "pictures";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDBを開けませんでした"));
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = fn(store);
    tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : undefined);
    tx.onerror = () => reject(tx.error || new Error("IndexedDBの操作に失敗しました"));
  });
}

export function getPictureBlob(pid) {
  return withStore("readonly", (store) => store.get(pid));
}

export function putPictureBlob(pid, dataUrl) {
  return withStore("readwrite", (store) => store.put(dataUrl, pid));
}

export function deletePictureBlob(pid) {
  return withStore("readwrite", (store) => store.delete(pid));
}

export async function getAllPictureBlobs() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const keysReq = store.getAllKeys();
    const valuesReq = store.getAll();
    tx.oncomplete = () => {
      const result = {};
      keysReq.result.forEach((key, i) => {
        result[key] = valuesReq.result[i];
      });
      resolve(result);
    };
    tx.onerror = () => reject(tx.error || new Error("IndexedDBの読み取りに失敗しました"));
  });
}

export async function clearAllPictureBlobs() {
  return withStore("readwrite", (store) => store.clear());
}

export async function putAllPictureBlobs(entries) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const [pid, dataUrl] of Object.entries(entries)) {
      store.put(dataUrl, pid);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDBへの書き込みに失敗しました"));
  });
}

// 旧バージョンで data.picture[pid].picdata に直接入っていた画像データURLを
// IndexedDBへ移す(初回読み込み時・旧形式のJSONインポート時の後方互換用)。
export async function migratePictureBlobsFromData(data) {
  for (const [pid, pic] of Object.entries(data.picture)) {
    if (pic.picdata) {
      await putPictureBlob(pid, pic.picdata);
      delete pic.picdata;
    }
  }
}
