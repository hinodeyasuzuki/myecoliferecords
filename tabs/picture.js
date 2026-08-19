import { nextId } from "../lib/id.js";
import { removePicture as unlinkPicture } from "../lib/unlink.js";
import { compressImageFile } from "../lib/image.js";
import { pickGooglePhoto, fetchGooglePhotoDataUrl } from "../lib/googlePhotosPicker.js";
import { GOOGLE_PHOTOS_CLIENT_ID } from "../lib/googlePhotosConfig.js";
import { putPictureBlob, deletePictureBlob } from "../lib/pictureStore.js";
import { pictureBlobs, ensurePictureBlobLoaded, setPictureBlobCache, clearPictureBlobCache } from "../lib/pictureBlobCache.js";

export default {
  props: ["data", "highlightId"],
  emits: ["consumed-highlight"],
  data() {
    return {
      editingId: null,
      pendingSnapshot: null,
      registered: false,
    };
  },
  created() {
    if (this.highlightId) {
      this.pendingSnapshot = JSON.parse(JSON.stringify(this.data.picture[this.highlightId]));
      this.editingId = this.highlightId;
      this.$emit("consumed-highlight");
    }
  },
  unmounted() {
    if (this.editingId !== null && !this.registered) {
      this.discardEdit(this.editingId);
    }
  },
  watch: {
    editingId(newVal, oldVal) {
      if (oldVal !== null && oldVal !== undefined) {
        if (!this.registered) {
          this.discardEdit(oldVal);
        }
        this.registered = false;
        this.pendingSnapshot = null;
      }
    },
  },
  computed: {
    productPictureIds() {
      const ids = new Set();
      for (const product of Object.values(this.data.products)) {
        for (const pid of product.picture_ids) ids.add(pid);
      }
      return ids;
    },
    repairlogPictureIds() {
      const ids = new Set();
      for (const log of Object.values(this.data.repairlog)) {
        for (const pid of log.picture_ids) ids.add(pid);
      }
      return ids;
    },
    filteredPictureEntries() {
      const ids = new Set([...this.productPictureIds, ...this.repairlogPictureIds]);
      return Object.entries(this.data.picture).filter(([pid]) => ids.has(pid));
    },
  },
  methods: {
    addPictureAndEdit() {
      const id = nextId(Object.keys(this.data.picture), "p");
      this.data.picture[id] = { memo: "", created_at: new Date().toISOString(), sourceUrl: "" };
      this.editingId = id;
    },
    removePicture(id) {
      this.registered = true;
      unlinkPicture(this.data, id);
      deletePictureBlob(id).catch((err) => console.error(err));
      clearPictureBlobCache(id);
      this.editingId = null;
    },
    discardEdit(id) {
      if (this.pendingSnapshot && this.data.picture[id]) {
        this.data.picture[id] = this.pendingSnapshot;
      }
    },
    registerPicture() {
      if (!this.pictureSrc(this.editingId)) return;
      this.registered = true;
      this.backToList();
    },
    async onFileSelected(id, event) {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;
      try {
        const picdata = await compressImageFile(file);
        if (!this.data.picture[id]) return;
        await putPictureBlob(id, picdata);
        setPictureBlobCache(id, picdata);
      } catch (err) {
        console.error(err);
        alert("画像の読み込みに失敗しました");
      }
    },
    async onPickFromGooglePhotos(id) {
      try {
        const picked = await pickGooglePhoto(GOOGLE_PHOTOS_CLIENT_ID);
        if (!picked) return;
        const picdata = await fetchGooglePhotoDataUrl(picked.baseUrl, picked.token, 640);
        if (!this.data.picture[id]) return;
        await putPictureBlob(id, picdata);
        setPictureBlobCache(id, picdata);
        this.data.picture[id].sourceUrl = picked.baseUrl;
        if (picked.createTime) {
          this.data.picture[id].created_at = picked.createTime;
        }
      } catch (err) {
        console.error(err);
        alert("Google Photosからの取得に失敗しました");
      }
    },
    startEdit(id) {
      this.pendingSnapshot = JSON.parse(JSON.stringify(this.data.picture[id]));
      this.editingId = id;
    },
    backToList() {
      this.editingId = null;
    },
    memoPreview(pic) {
      const memo = pic.memo || "";
      return memo.length > 14 ? memo.slice(0, 14) + "…" : memo;
    },
    // 写真が紐づく機器(製品分類の入手方法を見るため)。修理写真には該当なし。
    productForPicture(pid) {
      return Object.values(this.data.products).find((p) => p.picture_ids.includes(pid)) || null;
    },
    // 中古・手作り・修理のバッジ。それ以外(新品購入など)はバッジなし。
    pictureBadge(pid) {
      if (this.repairlogPictureIds.has(pid)) return { label: "修理", cls: "badge-repair" };
      const product = this.productForPicture(pid);
      if (product && (product.method === 3 || product.method === 4)) {
        return { label: "中古", cls: "badge-used" };
      }
      if (product && product.method === 6) {
        return { label: "手作り", cls: "badge-handmade" };
      }
      return null;
    },
    dateLabel(pic) {
      return (pic.created_at || "").slice(0, 10);
    },
    createdAtDisplay(pic) {
      const raw = (pic && pic.created_at) || "";
      const date = new Date(raw);
      if (isNaN(date.getTime())) return raw || "(未設定)";
      const parts = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(date);
      const get = (type) => parts.find((p) => p.type === type).value;
      return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
    },
    pictureSrc(id) {
      ensurePictureBlobLoaded(id);
      return pictureBlobs[id] || "";
    },
  },
  template: `
    <section id="picture-tab">
      <h2>写真</h2>
      <p>※機器や修理の写真を記録できます。写真を追加する場合は、機器や修理履歴から登録してください。</p>
      <template v-if="editingId === null">
        <div class="picture-grid">
          <div
            v-for="[id, pic] in filteredPictureEntries"
            :key="id"
            class="picture-tile"
            @click="startEdit(id)"
          >
            <span v-if="pictureBadge(id)" :class="['picture-badge', pictureBadge(id).cls]">{{ pictureBadge(id).label }}</span>
            <img v-if="pictureSrc(id)" :src="pictureSrc(id)" class="picture-thumb-sm">
            <div v-else class="picture-thumb-placeholder">(未撮影)</div>
            <p class="picture-tile-memo">{{ memoPreview(pic) || "(メモ未入力)" }}</p>
            <p class="picture-tile-date">{{ dateLabel(pic) }}</p>
          </div>
        </div>
        <!-- <button @click="addPictureAndEdit">＋写真を追加</button> -->
      </template>
      <template v-else>
        <div v-if="data.picture[editingId]" class="picture-card">
          <p><button @click="backToList">← 一覧に戻る</button></p>
          <p><strong>{{ editingId }}</strong></p>
          <p>
            <img v-if="pictureSrc(editingId)" :src="pictureSrc(editingId)" class="picture-thumb">
          </p>
          <p>
            カメラで撮影:
            <input type="file" accept="image/*" capture="environment" @change="onFileSelected(editingId, $event)">／
            <button @click="$refs.libraryFileInput.click()">ファイルから選択</button>
            <input type="file" accept="image/*" ref="libraryFileInput" style="display:none" @change="onFileSelected(editingId, $event)">／
            <button @click="onPickFromGooglePhotos(editingId)">Google Photosから選択</button>
          </p>
          <p v-if="data.picture[editingId].sourceUrl" style="color:var(--muted);">
            取込元: <a :href="data.picture[editingId].sourceUrl" target="_blank" rel="noopener">Google Photos</a>（リンクは時間が経つと無効になる場合があります）
          </p>
          <p><span class="rowtitle">メモ</span> <textarea class="memory" v-model="data.picture[editingId].memo"></textarea></p>
          <p><span class="rowtitle">作成日時</span> {{ createdAtDisplay(data.picture[editingId]) }}</p>
          <p class="center">
            <button class="highlighted btnlarge" :disabled="!pictureSrc(editingId)" @click="registerPicture">登録する</button>
            <button @click="removePicture(editingId)">削除</button>
          </p>
        </div>
      </template>
    </section>
  `,
};
