import { nextId } from "../lib/id.js";
import { removeRepairlog, removePicture as unlinkPicture } from "../lib/unlink.js";
import { productNameFor, dateLabel, sortRepairlogEntries } from "../lib/repairlogSort.js";
import { pictureSummary } from "../lib/pictureSummary.js";
import { deletePictureBlob, getPictureBlob } from "../lib/pictureStore.js";
import { pictureBlobs, ensurePictureBlobLoaded, clearPictureBlobCache } from "../lib/pictureBlobCache.js";
import {
  buildEquipsById,
  level1Options as equipLevel1Options,
  resolveEquipSelection,
  getEquipIcon,
} from "../lib/equipTree.js";

const REPAIRER_OPTIONS = [
  { val: 1, label: "自分" },
  { val: 2, label: "家族・友人" },
  { val: 3, label: "修理施設" },
  { val: 4, label: "修理業者" },
];

export default {
  props: ["data", "master", "highlightId"],
  emits: ["consumed-highlight", "jump-picture", "jump-product"],
  data() {
    return {
      repairerOptions: REPAIRER_OPTIONS,
      editingId: null,
      sortKey: "date",
      sortDir: "desc",
      cameFromProduct: false,
      selectId: "",
      smLevel1Id: "",
    };
  },
  created() {
    if (this.highlightId) {
      this.editingId = this.highlightId;
      this.cameFromProduct = true;
      this.$emit("consumed-highlight");
    }
  },
  computed: {
    equipsById() {
      return buildEquipsById(this.master.equips);
    },
    level1Options() {
      return equipLevel1Options(this.master.equips);
    },
    sortedRepairlogEntries() {
      const entries = this.selectId
        ? Object.entries(this.data.repairlog).filter(([, log]) => this.logMatchesCategory(log, this.selectId))
        : Object.entries(this.data.repairlog);
      return sortRepairlogEntries(entries, this.sortKey, this.sortDir, this.data.products);
    },
  },
  methods: {
    addLog() {
      const id = nextId(Object.keys(this.data.repairlog), "l");
      this.data.repairlog[id] = {
        year: null,
        month: null,
        day: null,
        product_id: "",
        about: "",
        picture_ids: [],
        created_at: new Date().toISOString(),
      };
    },
    removeLog(id) {
      removeRepairlog(this.data, id);
    },
    removeLogAndBackToList(id) {
      this.removeLog(id);
      this.editingId = null;
    },
    setSort(key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      } else {
        this.sortKey = key;
        this.sortDir = "desc";
      }
    },
    startEdit(id) {
      this.editingId = id;
    },
    backToList() {
      this.editingId = null;
    },
    backToProduct() {
      const log = this.data.repairlog[this.editingId];
      if (log && log.product_id && this.data.products[log.product_id]) {
        this.$emit("jump-product", log.product_id);
      } else {
        this.backToList();
      }
    },
    productNameForLog(log) {
      return productNameFor(this.data.products, log.product_id);
    },
    dateLabelFor(log) {
      return dateLabel(log);
    },
    addPictureFor(logId) {
      const id = nextId(Object.keys(this.data.picture), "p");
      this.data.picture[id] = { memo: "", created_at: new Date().toISOString(), sourceUrl: "" };
      this.data.repairlog[logId].picture_ids.push(id);
      this.$emit("jump-picture", id);
    },
    removePictureEntry(id) {
      unlinkPicture(this.data, id);
      deletePictureBlob(id).catch((err) => console.error(err));
      clearPictureBlobCache(id);
    },
    pictureSummaryFor(pid) {
      return pictureSummary(this.data.picture, pid);
    },
    pictureSrc(id) {
      ensurePictureBlobLoaded(id);
      return pictureBlobs[id] || "";
    },
    logMatchesCategory(log, categoryId) {
      const product = this.data.products[log.product_id];
      if (!product) return false;
      const selection = resolveEquipSelection(this.equipsById, product.equip_id);
      return (
        product.equip_id === categoryId ||
        selection.level1Id === categoryId ||
        selection.level2Id === categoryId
      );
    },
    smSelectLevel1(id) {
      this.smLevel1Id = id;
      this.selectId = id;
      this.editingId = null;
    },
    getEquipIcon(id) {
      return getEquipIcon(id);
    },
    async copyToThirdHanders() {
      const log = this.data.repairlog[this.editingId];
      if (!log) return;
      const product = this.data.products[log.product_id];
      const logPictureIds = log.picture_ids.slice(0, 2);
      const remaining = 2 - logPictureIds.length;
      const productPictureIds =
        remaining > 0 && product
          ? product.picture_ids.filter((pid) => !logPictureIds.includes(pid)).slice(0, remaining)
          : [];
      const repairerOption = this.repairerOptions.find((o) => o.val === log.repairer);
      const picture = {};
      for (const pid of [...logPictureIds, ...productPictureIds]) {
        const pic = this.data.picture[pid];
        picture[pid] = {
          data: (await getPictureBlob(pid)) || "",
          memo: pic ? pic.memo : "",
        };
      }
      const payload = {
        products: {
          [log.product_id]: {
            equip_id: product ? product.equip_id : "",
            name: product ? product.name : "",
            purchaseyear: product ? product.purchaseyear : null,
            picture_ids: productPictureIds,
          },
        },
        repairlog: {
          [this.editingId]: {
            about: log.about,
            year: log.year,
            repairer: repairerOption ? repairerOption.label : "",
            cost: log.cost,
            picture_ids: logPictureIds,
          },
        },
        picture,
      };
      try {
        await navigator.clipboard.writeText(JSON.stringify(payload));
        alert("コピーしました");
      } catch (err) {
        console.error(err);
        alert("コピーに失敗しました");
      }
    },
  },
  template: `
    <section id="repairlog-tab">
      <h2>修理履歴</h2>

      <div class="category">
        <button @click="selectId = '';smLevel1Id='';" :class="{highlighted: !smLevel1Id}">📋 すべて</button>
        <button v-for="eq1 in level1Options" :key="eq1.id" @click="smSelectLevel1(eq1.id)" :class="{highlighted: smLevel1Id == eq1.id}">
          {{ getEquipIcon(eq1.id) }} {{ eq1.title }}
        </button>
      </div>

      <template v-if="editingId === null">
        <table>
          <thead>
            <tr>
              <th @click="setSort('date')" style="cursor:pointer;">日付 <span v-if="sortKey === 'date'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('productName')" style="cursor:pointer;">機器名 <span v-if="sortKey === 'productName'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th>概要</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[id, log] in sortedRepairlogEntries" :key="id" style="vertical-align:top;">
              <td>{{ dateLabelFor(log) }}</td>
              <td>{{ productNameForLog(log) }}</td>
              <td style="max-height:2em;">{{ log.about || "(未入力)" }}</td>
              <td><button @click="startEdit(id)" style="white-space:nowrap;">編集</button></td>
            </tr>
          </tbody>
        </table>
        <!-- <button @click="addLog">＋修理履歴を追加</button> -->
        <p>※修理履歴を追加する場合は、まず修理した機器を登録してください。</p>
      </template>
      <template v-else>
        <div v-if="data.repairlog[editingId]" style="border:1px solid var(--border); padding:12px; margin-bottom:12px; border-radius:6px;">
          <p>
            <button v-if="cameFromProduct" @click="backToProduct">← 機器に戻る</button>
            <button v-else @click="backToList">← 一覧に戻る</button>
          </p>
          <p><span class="rowtitle">{{ editingId }}</span> <button @click="removeLogAndBackToList(editingId)">削除</button></p>
          <p><span class="rowtitle">修理日<span class="open">*</span></span>
            <input type="number" v-model.number="data.repairlog[editingId].year">年 
            <input type="number" v-model.number="data.repairlog[editingId].month">月 
            <input type="number" v-model.number="data.repairlog[editingId].day">日
          </p>
          <p><span class="rowtitle">機器</span> {{ productNameForLog(data.repairlog[editingId]) }}</p>
          <p><span class="rowtitle">修理者<span class="open">*</span></span>
            <select v-model.number="data.repairlog[editingId].repairer">
              <option value="">選択してください</option>
              <option v-for="m in repairerOptions" :key="m.val" :value="m.val">{{ m.label }}</option>
            </select>
          </p>
          <p><span class="rowtitle">修理代<span class="open">*</span></span><input type="number" v-model.number="data.repairlog[editingId].cost">円</p>
          <p><span class="rowtitle">修理内容<span class="open">*</span></span>
            <textarea class="memory" v-model="data.repairlog[editingId].about"></textarea>
          </p>
          <p class="hint">ヒント：修理前の状態は？／修理の方法／用意した部品・道具／かかった時間／失敗・工夫／結果どうなりましたか？</p>
          <p><span class="rowtitle">写真<span class="open">*</span></span>　<button @click="addPictureFor(editingId)">＋新規追加</button></p>
          <ul>
            <li v-for="pid in data.repairlog[editingId].picture_ids" :key="pid">
              <a href="#" @click.prevent="$emit('jump-picture', pid)">
                <img v-if="pictureSrc(pid)" :src="pictureSrc(pid)" class="picture-thumb-sm">
                {{ pictureSummaryFor(pid) }}
              </a>
              <!-- <button @click.stop="removePictureEntry(pid)">削除</button> -->
            </li>
          </ul>
          <!-- <p><span class="rowtitle">作成日時</span> <input type="text" v-model="data.repairlog[editingId].created_at"></p> -->
        </div>

        <section class="outershare">
          <p>修理ありがとうございます。<span class="open">*</span> がついた入力済みのデータを、<a href="https://thirdhanders.hinodeya-ecolife.com/">Third Handersサイト</a>から公開することができます。
          「コピーする」ボタンを押し、Third Handersサイトにログインして、貼り付けてください。</p>
          <button type="button" @click="copyToThirdHanders">コピーする</button>
        </section>
      </template>
    </section>
  `,
};
