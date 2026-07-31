import { createApp, reactive, watch } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { normalizeRoomData } from "./lib/roomLinks.js";
import { normalizePictureData } from "./lib/pictureData.js";
import { normalizeProductData } from "./lib/productData.js";
import {
  migratePictureBlobsFromData,
  getAllPictureBlobs,
  clearAllPictureBlobs,
  putAllPictureBlobs,
} from "./lib/pictureStore.js";
import { resetPictureBlobCache } from "./lib/pictureBlobCache.js";

export const STORAGE_KEY = "homeenergycodes.savedInput";

export function emptyData() {
  return {
    input: {}, inputCounts: {}, room: {}, products: {}, energy: {},
    energycost: {}, repairlog: {}, picture: {},
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    return normalizeProductData(normalizePictureData(normalizeRoomData({ ...emptyData(), ...JSON.parse(raw) })));
  } catch {
    return emptyData();
  }
}

export const data = reactive(loadData());

// 旧バージョンで data.picture[id].picdata に直接入っていた画像データURLを
// IndexedDBへ移行する(初回のみ、以後は該当データが無ければ何もしない)。
migratePictureBlobsFromData(data).catch((err) => console.error(err));

let storageWriteFailed = false;

watch(
  data,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      storageWriteFailed = false;
    } catch (err) {
      if (!storageWriteFailed) {
        storageWriteFailed = true;
        alert("保存容量の上限に達した可能性があります。JSONエクスポートでバックアップしてください。");
      }
    }
  },
  { deep: true }
);

export const master = reactive({
  input: [],
  equips: [],
  energy: [],
  energycost: [],
  cons: [],
});

export const highlight = reactive({ repairlog: null, picture: null });

// マスタデータ(診断項目・機器分類・エネルギー種別等)は公開済みのAPIサイトから読み込む。
// このリポジトリのdocs/api/v1/*.json をローカルで再ビルドしていなくても、
// 常に公開済みの最新マスタデータを参照できるようにするため。
const API_BASE = "https://hinodeyasuzuki.github.io/homeenergycodes-public/api/v1";

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch failed: ${path} (${res.status})`);
  return res.json();
}

const app = createApp({
  data() {
    return {
      loading: true,
      currentTab: "room",
      data,
      master,
      highlight,
      tabs: [
        { id: "room", label: "部屋" },
        { id: "products", label: "機器" },
        { id: "repairlog", label: "修理履歴" },
        { id: "picture", label: "写真" },
        { id: "energy", label: "光熱" },
        { id: "input", label: "診断項目" },
        { id: "setting", label: "設定" },
      ],
    };
  },
  async mounted() {
    const [input, equips, energy, energycost, cons] = await Promise.all([
      fetchJson(`${API_BASE}/input.json`),
      fetchJson(`${API_BASE}/equip.json`),
      fetchJson(`${API_BASE}/energy.json`),
      fetchJson(`${API_BASE}/energycost.json`),
      fetchJson(`${API_BASE}/cons.json`),
    ]);
    master.input = input;
    master.equips = equips;
    master.energy = energy;
    master.energycost = energycost;
    master.cons = cons;
    this.loading = false;
  },
  methods: {
    jumpToRepairlog(id) {
      highlight.repairlog = id;
      this.currentTab = "repairlog";
    },
    jumpToPicture(id) {
      highlight.picture = id;
      this.currentTab = "picture";
    },
    clearRepairlogHighlight() {
      highlight.repairlog = null;
    },
    clearPictureHighlight() {
      highlight.picture = null;
    },
    async exportJson() {
      let pictureBlobs = {};
      try {
        pictureBlobs = await getAllPictureBlobs();
      } catch (err) {
        console.error(err);
        alert("写真データ(IndexedDB)の読み出しに失敗しました。写真を含めずエクスポートします。");
      }
      const payload = { ...this.data, pictureBlobs };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url;
      a.download = `saved-input-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    importJson(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (!confirm("現在の入力内容を上書きします。よろしいですか？")) {
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const parsed = JSON.parse(reader.result);
        const { pictureBlobs, ...rest } = parsed;
        const next = normalizeProductData(normalizePictureData(normalizeRoomData({ ...emptyData(), ...rest })));
        Object.keys(data).forEach((key) => delete data[key]);
        Object.assign(data, next);
        try {
          await clearAllPictureBlobs();
          if (pictureBlobs) await putAllPictureBlobs(pictureBlobs);
          // pictureBlobsを持たない旧形式のエクスポート(picture[id].picdataに直接
          // 画像データが入っている)をインポートした場合の後方互換。
          await migratePictureBlobsFromData(data);
          resetPictureBlobCache();
        } catch (err) {
          console.error(err);
          alert("写真データ(IndexedDB)の読み込みに失敗しました。それ以外のデータは反映されています。");
        }
        event.target.value = "";
      };
      reader.readAsText(file);
    },
  },
});

import RoomTab from "./tabs/room.js";
app.component("tab-room", RoomTab);
import ProductsTab from "./tabs/products.js";
app.component("tab-products", ProductsTab);
import InputTab from "./tabs/input.js";
app.component("tab-input", InputTab);
import EnergyTab from "./tabs/energy.js";
app.component("tab-energy", EnergyTab);
import RepairlogTab from "./tabs/repairlog.js";
app.component("tab-repairlog", RepairlogTab);
import PictureTab from "./tabs/picture.js";
app.component("tab-picture", PictureTab);
import SettingTab from "./tabs/setting.js";
app.component("tab-setting", SettingTab);

app.mount("#app");
