import { nextId } from "../lib/id.js";
import { removeRepairlog, removePicture as unlinkPicture, setRepairlogEquip } from "../lib/unlink.js";
import { productNameFor, dateLabel, sortRepairlogEntries } from "../lib/repairlogSort.js";
import { pictureSummary } from "../lib/pictureSummary.js";
import { deletePictureBlob } from "../lib/pictureStore.js";
import { pictureBlobs, ensurePictureBlobLoaded, clearPictureBlobCache } from "../lib/pictureBlobCache.js";

const REPAIRER_OPTIONS = [
  { val: 1, label: "自分" },
  { val: 2, label: "家族・友人" },
  { val: 3, label: "修理施設" },
  { val: 4, label: "修理業者" },
];

export default {
  props: ["data", "highlightId"],
  emits: ["consumed-highlight", "jump-picture", "jump-product"],
  data() {
    return {
      repairerOptions: REPAIRER_OPTIONS,
      editingId: null,
      sortKey: "date",
      sortDir: "desc",
      cameFromProduct: false,
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
    sortedRepairlogEntries() {
      return sortRepairlogEntries(
        Object.entries(this.data.repairlog),
        this.sortKey,
        this.sortDir,
        this.data.products
      );
    },
  },
  methods: {
    addLog() {
      const id = nextId(Object.keys(this.data.repairlog), "l");
      this.data.repairlog[id] = {
        year: null,
        month: null,
        day: null,
        equip_id: "",
        about: "",
        picture_ids: [],
        created_at: new Date().toISOString(),
      };
    },
    removeLog(id) {
      removeRepairlog(this.data, id);
    },
    setEquipForLog(id, equipId) {
      setRepairlogEquip(this.data, id, equipId);
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
      if (log && log.equip_id && this.data.products[log.equip_id]) {
        this.$emit("jump-product", log.equip_id);
      } else {
        this.backToList();
      }
    },
    productNameForLog(log) {
      return productNameFor(this.data.products, log.equip_id);
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
  },
  template: `
    <section id="repairlog-tab">
      <h2>修理履歴</h2>
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
            <tr v-for="[id, log] in sortedRepairlogEntries" :key="id">
              <td>{{ dateLabelFor(log) }}</td>
              <td>{{ productNameForLog(log) }}</td>
              <td>{{ log.about || "(未入力)" }}</td>
              <td><button @click="startEdit(id)" style="white-space:nowrap;">編集</button></td>
            </tr>
          </tbody>
        </table>
        <!-- <button @click="addLog">＋修理履歴を追加</button> -->
        <p>※修理履歴を追加する場合は、まず機器を登録してください。</p>
      </template>
      <template v-else>
        <div v-if="data.repairlog[editingId]" style="border:1px solid var(--border); padding:12px; margin-bottom:12px; border-radius:6px;">
          <p>
            <button v-if="cameFromProduct" @click="backToProduct">← 機器に戻る</button>
            <button v-else @click="backToList">← 一覧に戻る</button>
          </p>
          <p><span class="rowtitle">{{ editingId }}</span> <button @click="removeLogAndBackToList(editingId)">削除</button></p>
          <p><span class="rowtitle">修理日</span>
            <input type="number" v-model.number="data.repairlog[editingId].year">年 
            <input type="number" v-model.number="data.repairlog[editingId].month">月 
            <input type="number" v-model.number="data.repairlog[editingId].day">日
          </p>
          <p><span class="rowtitle">機器</span>
            <select :value="data.repairlog[editingId].equip_id" @change="setEquipForLog(editingId, $event.target.value)">
              <option value="">選択してください</option>
              <option v-for="(product, pid) in data.products" :key="pid" :value="pid">{{ pid }} ({{ product.name }})</option>
            </select>
          </p>
          <p><span class="rowtitle">修理者</span>
            <select v-model.number="data.repairlog[editingId].repairer">
              <option value="">選択してください</option>
              <option v-for="m in repairerOptions" :key="m.val" :value="m.val">{{ m.label }}</option>
            </select>
          </p>
          <p><span class="rowtitle">修理代</span><input type="number" v-model.number="data.repairlog[editingId].cost">円</p>
          <p><span class="rowtitle">修理内容</span> <textarea class="memory" v-model="data.repairlog[editingId].about"></textarea></p>
          <p><span class="rowtitle">公開用情報</span> <textarea class="memory" v-model="data.repairlog[editingId].public_info"></textarea></p>
          <p><span class="rowtitle">写真</span>　<button @click="addPictureFor(editingId)">＋新規追加</button></p>
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
      </template>
    </section>
  `,
};
