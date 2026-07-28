import { reactive } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getPictureBlob } from "./pictureStore.js";

// IndexedDBから読み込んだ写真データURLをメモリ上にキャッシュする単一の
// reactiveオブジェクト。data(localStorage保存対象)には含めない。
export const pictureBlobs = reactive({});

// まだキャッシュに無ければIndexedDBから非同期に読み込む(重複読み込みは防ぐ)。
// テンプレートのv-forの中などから呼び出す前提の副作用ありメソッド。
export function ensurePictureBlobLoaded(pid) {
  if (Object.prototype.hasOwnProperty.call(pictureBlobs, pid)) return;
  pictureBlobs[pid] = null;
  getPictureBlob(pid).then((dataUrl) => {
    pictureBlobs[pid] = dataUrl || "";
  });
}

export function setPictureBlobCache(pid, dataUrl) {
  pictureBlobs[pid] = dataUrl;
}

export function clearPictureBlobCache(pid) {
  delete pictureBlobs[pid];
}

export function resetPictureBlobCache() {
  for (const key of Object.keys(pictureBlobs)) {
    delete pictureBlobs[key];
  }
}
