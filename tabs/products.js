import { nextId } from "../lib/id.js";
import { removeRepairlog, removePicture } from "../lib/unlink.js";
import {
  buildEquipsById,
  level1Options as equipLevel1Options,
  level2Options as equipLevel2Options,
  level3Options as equipLevel3Options,
  resolveEquipSelection,
} from "../lib/equipTree.js";
import { modelName, methodLabel, sortProductEntries } from "../lib/productSort.js";
import { pictureSummary } from "../lib/pictureSummary.js";
import { deletePictureBlob } from "../lib/pictureStore.js";
import { pictureBlobs, ensurePictureBlobLoaded, clearPictureBlobCache } from "../lib/pictureBlobCache.js";

const METHOD_OPTIONS = [
  { val: 1, label: "新品購入" },
  { val: 2, label: "新品プレゼント" },
  { val: 3, label: "中古購入" },
  { val: 4, label: "中古譲り受け" },
  { val: 5, label: "ごみを再利用" },
  { val: 6, label: "手作り" },
];

const MONTH_OPTIONS = [
  { val: 0, label: "月は不明" },
  { val: -1, label: "頃" },
  ...Array.from({ length: 12 }, (_, i) => ({ val: i + 1, label: `${i + 1}月` })),
];

export default {
  props: ["data", "master", "highlightId"],
  emits: ["jump-repairlog", "jump-picture", "consumed-highlight"],
  data() {
    return {
      methodOptions: METHOD_OPTIONS,
      monthOptions: MONTH_OPTIONS,
      editingId: null,
      sortKey: "purchaseyear",
      sortDir: "desc",
      selectId: "",
      equipShow: false,
      smLevel1Id: "",
      smLevel2Id: "",
      isNarrow: window.innerWidth <= 600,
    };
  },
  created() {
    if (this.highlightId) {
      this.editingId = this.highlightId;
      this.$emit("consumed-highlight");
    }
  },
  mounted() {
    window.addEventListener("resize", this.updateIsNarrow);
  },
  unmounted() {
    window.removeEventListener("resize", this.updateIsNarrow);
  },
  computed: {
    equipsById() {
      return buildEquipsById(this.master.equips);
    },
    level1Options() {
      return equipLevel1Options(this.master.equips);
    },
    sortedEquips() {
      return [...this.master.equips].sort((a, b) => Number(a.id) - Number(b.id));
    },
    sortedProductEntries() {
      const entries = this.selectId
        ? Object.entries(this.data.products).filter(([, item]) => {
            const selection = resolveEquipSelection(this.equipsById, item.equip_id);
            return (
              item.equip_id === this.selectId ||
              selection.level1Id === this.selectId ||
              selection.level2Id === this.selectId
            );
          })
        : Object.entries(this.data.products);
      return sortProductEntries(entries, this.sortKey, this.sortDir, this.equipsById, this.methodOptions);
    },
    energyFlag() {
      const item = this.data.products[this.editingId];
      if (!item) return null;
      const equip = this.equipsById[item.equip_id];
      return equip ? equip.energyFlag : null;
    },
  },
  methods: {
    repairlogSummary(lid) {
      const log = this.data.repairlog[lid];
      if (!log) return lid + " (削除済み)";
      const dateParts = [log.year, log.month, log.day].filter((v) => v !== null && v !== undefined);
      const date = dateParts.length ? dateParts.join("/") : "";
      const about = log.about || (log.public_info || "(未入力)");
      return [date, about].filter(Boolean).join(" - ");
    },
    pictureSummaryFor(pid) {
      return pictureSummary(this.data.picture, pid);
    },
    addProduct() {
      const id = nextId(Object.keys(this.data.products), "e");
      this.data.products[id] = {
        name: "",
        equip_id: this.selectId || "",
        purchaseyear: null,
        purchasemonth: null,
        method: null,
        manufactureyear: null,
        room_id: "",
        watt: null,
        usagetime: null,
        frequency: null,
        enduseyear: null,
        favorite: false,
        repairlog_ids: [],
        picture_ids: [],
        memory: "",
        public_info: "",
      };
      return id;
    },
    removeProduct(id) {
      delete this.data.products[id];
    },
    removeProductAndBackToList(id) {
      this.removeProduct(id);
      this.editingId = null;
    },
    addRepairlogFor(productId) {
      const id = nextId(Object.keys(this.data.repairlog), "l");
      this.data.repairlog[id] = {
        year: null,
        month: null,
        day: null,
        equip_id: productId,
        about: "",
        picture_ids: [],
        created_at: new Date().toISOString(),
      };
      this.data.products[productId].repairlog_ids.push(id);
      this.$emit("jump-repairlog", id);
    },
    removeRepairlogEntry(id) {
      removeRepairlog(this.data, id);
    },
    addPictureFor(productId) {
      const id = nextId(Object.keys(this.data.picture), "p");
      this.data.picture[id] = { memo: "", created_at: new Date().toISOString(), sourceUrl: "" };
      this.data.products[productId].picture_ids.push(id);
      this.$emit("jump-picture", id);
    },
    removePictureEntry(id) {
      removePicture(this.data, id);
      deletePictureBlob(id).catch((err) => console.error(err));
      clearPictureBlobCache(id);
    },
    pictureSrc(id) {
      ensurePictureBlobLoaded(id);
      return pictureBlobs[id] || "";
    },
    equipSelection(item) {
      return resolveEquipSelection(this.equipsById, item.equip_id);
    },
    level2Options(level1Id) {
      return equipLevel2Options(this.master.equips, level1Id);
    },
    level3Options(level2Id) {
      return equipLevel3Options(this.master.equips, level2Id);
    },
    setEquip(item, id) {
      item.equip_id = id;
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
    addProductAndEdit() {
      const id = this.addProduct();
      this.editingId = id;
    },
    addProductForEquip(equipId) {
      this.selectId = equipId;
      const id = this.addProduct();
      this.editingId = id;
      this.equipShow = false;
      this.smLevel1Id = "";
      this.smLevel2Id = "";
    },
    smSelectLevel1(id) {
      this.smLevel1Id = id;
      this.smLevel2Id = "";
      this.selectId = id;
      this.editingId = null;
    },
    smSelectLevel2(id) {
      this.smLevel2Id = id;
      this.selectId = id;
      this.editingId = null;
    },
    smBackToLevel1() {
      this.smLevel1Id = "";
      this.smLevel2Id = "";
    },
    smBackToLevel2() {
      this.smLevel2Id = "";
    },
    modelNameFor(item) {
      return modelName(this.equipsById, item.equip_id);
    },
    methodLabelFor(method) {
      return methodLabel(this.methodOptions, method);
    },
    methodLabelDisplay(method) {
      const label = this.methodLabelFor(method);
      return this.isNarrow ? label.substring(0, 2) : label;
    },
    updateIsNarrow() {
      this.isNarrow = window.innerWidth <= 600;
    },
    getEquipTitle(equipId) {
      const equip = this.equipsById[equipId];
      return equip ? equip.title : "";
    },
    existEquipInProducts(equipId) {
      return Object.values(this.data.products).some((item) => {
        const selection = resolveEquipSelection(this.equipsById, item.equip_id);
        return (
          item.equip_id === equipId ||
          selection.level1Id === equipId ||
          selection.level2Id === equipId
        );
      });
    }
  },
  template: `
    <section id="products-tab">
      <h2>機器</h2>
      <p v-if="selectId">選択中の機器分類: {{ getEquipTitle(selectId) }} <input type="button" value="クリア（すべて表示）" @click="selectId = null;equipShow = false"></p>
      <p v-if="!equipShow">
        <span class="guide-toggle" @click="equipShow = true">▼機器分類を表示</span>　
        <span style="color:var(--muted);">※機器分類を表示すると、製品の種類で絞り込むことができます。</span>
      </p>
      <p v-if="equipShow"><span class="guide-toggle" @click="equipShow = false">▲機器分類を非表示</span></p>
      
      <template v-if="equipShow">
        <table class="equip-table">
          <thead>
            <tr><th>大分類</th><th>中分類</th><th>小分類</th></tr>
          </thead>
          <tbody>
            <tr v-for="eq1 in level1Options" :key="eq1.id">
              <td><input type="button" :value="eq1.title" @click="selectId = eq1.id;equipShow = false;editingId = null"></td>
              <td>
                <template v-for="eq2 in level2Options(eq1.id)" :key="eq2.id">
                  <input type="button" :value="eq2.title" @click="selectId = eq2.id;equipShow = false;editingId = null"><br>
                </template>
              </td>
              <td>
                <template v-for="eq2 in level2Options(eq1.id)" :key="eq2.id">
                  <template v-for="eq3 in level3Options(eq2.id)" :key="eq3.id">
                    <input type="button" :value="eq3.title" :class="{highlighted: existEquipInProducts(eq3.id)}" @click="selectId = eq3.id;equipShow = false;editingId = null">
                  </template>
                  <br>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="equip-table-sm">
          <template v-if="smLevel1Id === ''">
            <input type="button" v-for="eq1 in level1Options" :key="eq1.id" :value="eq1.title" @click="smSelectLevel1(eq1.id)">
          </template>
          <template v-else-if="smLevel2Id === ''">
            <p>
              <a href="#" @click.prevent="smBackToLevel1">{{ getEquipTitle(smLevel1Id) }}</a>
            </p>
            <input type="button" v-for="eq2 in level2Options(smLevel1Id)" :key="eq2.id" :value="eq2.title" @click="smSelectLevel2(eq2.id)">
            <p><input type="button" :value="'「' + getEquipTitle(smLevel1Id) + '」で入力'" @click="addProductForEquip(smLevel1Id)"></p>
          </template>
          <template v-else>
            <p>
              <a href="#" @click.prevent="smBackToLevel1">{{ getEquipTitle(smLevel1Id) }}</a>＞<a href="#" @click.prevent="smBackToLevel2">{{ getEquipTitle(smLevel2Id) }}</a>
            </p>
            <input type="button" v-for="eq3 in level3Options(smLevel2Id)" :key="eq3.id" :value="eq3.title" :class="{highlighted: existEquipInProducts(eq3.id)}" @click="addProductForEquip(eq3.id)">
            <p><input type="button" :value="'「' + getEquipTitle(smLevel2Id) + '」で入力'" @click="addProductForEquip(smLevel2Id)"></p>
          </template>
        </div>
      </template>

      <template v-if="editingId === null">
        <p>中古数：{{ sortedProductEntries.filter(([, item]) => item.method === 3 || item.method === 4 || item.method === 5).length }}件
        　／　愛用数：{{ sortedProductEntries.filter(([, item]) => item.favorite).length }}件
        　／　修理数：{{ sortedProductEntries.filter(([, item]) => item.repairlog_ids.length > 0).length }}件</p>
        <table>
          <thead>
            <tr class="table-sortable">
              <th @click="setSort('name')">呼び名 <span v-if="sortKey === 'name'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('model')">製品分類 <span v-if="sortKey === 'model'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('purchaseyear')">購入年 <span v-if="sortKey === 'purchaseyear'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('method')">調達方法 <span v-if="sortKey === 'method'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('repaired')">修理 <span v-if="sortKey === 'repaired'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('favorite')">愛用品 <span v-if="sortKey === 'favorite'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('enduseyear')" class="hide_sm">終了年 <span v-if="sortKey === 'enduseyear'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[id, item] in sortedProductEntries" :key="id" :class="item.enduseyear ? 'enduse' : ''">
              <td>
                <img v-if="item.picture_ids.length && pictureSrc(item.picture_ids[0])" :src="pictureSrc(item.picture_ids[0])" class="picture-thumb-xs">
                {{ item.name || "(未入力)" }}
              </td>
              <td>{{ modelNameFor(item) }}</td>
              <td>{{ item.purchaseyear }}</td>
              <td>{{ methodLabelDisplay(item.method) }}</td>
              <td>{{ item.repairlog_ids.length > 0 ? "○" : "" }}</td>
              <td>{{ item.favorite ? "❤" : "" }}</td>
              <td class="hide_sm">{{ item.enduseyear }}</td>
              <td><button @click="startEdit(id)">編集</button></td>
            </tr>
          </tbody>
        </table>
        <button @click="addProductAndEdit">＋機器を追加</button>
      </template>
      <template v-else>
        <div v-if="data.products[editingId]" style="border:1px solid var(--border); padding:12px; margin-bottom:12px; border-radius:6px;">
          <p><button @click="backToList">← 一覧に戻る</button></p>
          <p><strong>{{ editingId }}</strong> <button @click="removeProductAndBackToList(editingId)">削除</button></p>
          <p><span class="rowtitle">呼び名</span> <input type="text" v-model="data.products[editingId].name"></p>
          <p><span class="rowtitle">製品分類</span>
            <select :value="equipSelection(data.products[editingId]).level1Id" @change="setEquip(data.products[editingId], $event.target.value)">
              <option value="">選択してください</option>
              <option v-for="eq in level1Options" :key="eq.id" :value="eq.id">{{ eq.title }}</option>
            </select>
            <select v-if="equipSelection(data.products[editingId]).level1Id" :value="equipSelection(data.products[editingId]).level2Id" @change="setEquip(data.products[editingId], $event.target.value)">
              <option value="">選択してください</option>
              <option v-for="eq in level2Options(equipSelection(data.products[editingId]).level1Id)" :key="eq.id" :value="eq.id">{{ eq.title }}</option>
            </select>
            <select v-if="equipSelection(data.products[editingId]).level2Id && level3Options(equipSelection(data.products[editingId]).level2Id).length" :value="equipSelection(data.products[editingId]).level3Id" @change="setEquip(data.products[editingId], $event.target.value)">
              <option value="">選択してください</option>
              <option v-for="eq in level3Options(equipSelection(data.products[editingId]).level2Id)" :key="eq.id" :value="eq.id">{{ eq.title }}</option>
            </select>
          </p>
          <p><span class="rowtitle">購入年月</span> <input type="number" v-model.number="data.products[editingId].purchaseyear">年
            <select v-model.number="data.products[editingId].purchasemonth">
              <option v-for="m in monthOptions" :key="m.val" :value="m.val">{{ m.label }}</option>
            </select>
          </p>
          <p><span class="rowtitle">調達方法</span>
            <select v-model.number="data.products[editingId].method">
              <option value="">選択してください</option>
              <option v-for="m in methodOptions" :key="m.val" :value="m.val">{{ m.label }}</option>
            </select>
          </p>
          <p><span class="rowtitle">愛用品</span> <input type="checkbox" v-model="data.products[editingId].favorite"></p>
          <p v-if="data.products[editingId].method == 3 || data.products[editingId].method == 4"><span class="rowtitle">製造年</span> <input type="number" v-model.number="data.products[editingId].manufactureyear"></p>
          <p><span class="rowtitle">部屋</span>
            <select v-model="data.products[editingId].room_id">
              <option value="">選択してください</option>
              <option v-for="(room, rid) in data.room" :key="rid" :value="rid">{{ room.name }} ({{ rid }})</option>
            </select>
          </p>
          <template v-if="energyFlag == 1">
            <p><span class="rowtitle">消費電力</span> <input type="number" v-model.number="data.products[editingId].watt">W</p>
            <p><span class="rowtitle">使用時間</span> <input type="number" v-model.number="data.products[editingId].usagetime">時間/回</p>
            <p><span class="rowtitle">使用頻度</span> <input type="number" v-model.number="data.products[editingId].frequency">回/年</p>
          </template>
          <p><span class="rowtitle">修理履歴</span>　<button @click="addRepairlogFor(editingId)">＋新規追加</button></p>
          <ul>
            <li v-for="lid in data.products[editingId].repairlog_ids" :key="lid">
              <a href="#" @click.prevent="$emit('jump-repairlog', lid)">{{ repairlogSummary(lid) }}</a>
              <!-- <button @click.stop="removeRepairlogEntry(lid)">削除</button> -->
            </li>
          </ul>
          <p><span class="rowtitle">写真</span>　<button @click="addPictureFor(editingId)">＋新規追加</button></p>
          <ul>
            <li v-for="pid in data.products[editingId].picture_ids" :key="pid">
              <a href="#" @click.prevent="$emit('jump-picture', pid)">
                <img v-if="pictureSrc(pid)" :src="pictureSrc(pid)" class="picture-thumb-sm">
                {{ pictureSummaryFor(pid) }}
              </a>
              <button @click.stop="removePictureEntry(pid)">削除</button>
            </li>
          </ul>
          <p><span class="rowtitle">思い出</span> <textarea class="memory" v-model="data.products[editingId].memory"></textarea></p>
          <p><span class="rowtitle">公開用情報</span> <textarea class="memory" v-model="data.products[editingId].public_info"></textarea></p>
          <p><span class="rowtitle">使用終了年</span> <input type="number" v-model.number="data.products[editingId].enduseyear">年</p>
        </div>
      </template>
    </section>
  `,
};
