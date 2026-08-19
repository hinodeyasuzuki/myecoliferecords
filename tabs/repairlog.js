import { nextId } from "../lib/id.js";
import { removeRepairlog, removePicture as unlinkPicture, setRepairlogEquip } from "../lib/unlink.js";
import { productNameFor, dateLabel, sortRepairlogEntries } from "../lib/repairlogSort.js";
import { pictureSummary } from "../lib/pictureSummary.js";
import { deletePictureBlob, getPictureBlob } from "../lib/pictureStore.js";
import { pictureBlobs, ensurePictureBlobLoaded, clearPictureBlobCache } from "../lib/pictureBlobCache.js";
import {
  buildEquipsById,
  level1Options as equipLevel1Options,
  level2Options as equipLevel2Options,
  level3Options as equipLevel3Options,
  resolveEquipSelection,
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
      addLogStep: null,
      newEquipForm: { name: "", equip_id: "", purchaseyear: null },
      newLogProductId: "",
      pendingSnapshot: null,
      registered: false,
    };
  },
  created() {
    if (this.highlightId) {
      this.pendingSnapshot = JSON.parse(JSON.stringify(this.data.repairlog[this.highlightId]));
      this.editingId = this.highlightId;
      this.cameFromProduct = true;
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
    equipsById() {
      return buildEquipsById(this.master.equips);
    },
    level1Options() {
      return equipLevel1Options(this.master.equips);
    },
    newEquipSelection() {
      return resolveEquipSelection(this.equipsById, this.newEquipForm.equip_id);
    },
    sortedRepairlogEntries() {
      const entries = this.selectId
        ? Object.entries(this.data.repairlog).filter(([, log]) => this.logMatchesCategory(log, this.selectId))
        : Object.entries(this.data.repairlog);
      return sortRepairlogEntries(entries, this.sortKey, this.sortDir, this.data.products);
    },
    yearOptions() {
      const current = new Date().getFullYear();
      const years = [];
      for (let y = current; y >= current - 20; y--) years.push(y);
      return years;
    },
    productList(){
      //現在のカテゴリーの選択状態に応じて、表示する機器productのリストを返す
      if (this.selectId) {
        return Object.fromEntries(
          Object.entries(this.data.products).filter(([pid, product]) =>
            product.equip_id === this.selectId
          )
        );
      }
      return this.data.products;
    },
  },
  methods: {
    startAddLog() {
      this.addLogStep = "choose";
      this.newEquipForm = { name: "", equip_id: this.selectId || "", purchaseyear: null };
      this.newLogProductId = "";
    },
    cancelAddLog() {
      this.addLogStep = null;
    },
    chooseNewEquip() {
      this.addLogStep = "new";
    },
    chooseExistingEquip() {
      this.addLogStep = "existing";
    },
    setNewEquip(id) {
      this.newEquipForm.equip_id = id;
    },
    confirmNewEquip() {
      if (!this.newEquipForm.name || !this.newEquipForm.equip_id) return;
      const pid = nextId(Object.keys(this.data.products), "e");
      this.data.products[pid] = {
        name: this.newEquipForm.name,
        equip_id: this.newEquipForm.equip_id,
        purchaseyear: this.newEquipForm.purchaseyear,
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
      };
      this.createLogForProduct(pid);
    },
    confirmExistingEquip() {
      if (!this.newLogProductId) return;
      this.createLogForProduct(this.newLogProductId);
    },
    createLogForProduct(productId) {
      const id = nextId(Object.keys(this.data.repairlog), "l");
      this.data.repairlog[id] = {
        year: null,
        month: null,
        day: null,
        product_id: productId,
        about: "",
        picture_ids: [],
        created_at: new Date().toISOString(),
      };
      this.data.products[productId].repairlog_ids.push(id);
      this.addLogStep = null;
      this.editingId = id;
    },
    removeLog(id) {
      removeRepairlog(this.data, id);
    },
    setEquipForLog(id, equipId) {
      setRepairlogEquip(this.data, id, equipId);
    },
    removeLogAndBackToList(id) {
      this.registered = true;
      this.removeLog(id);
      this.editingId = null;
    },
    discardEdit(id) {
      if (this.pendingSnapshot && this.data.repairlog[id]) {
        this.data.repairlog[id] = this.pendingSnapshot;
      }
    },
    registerLog() {
      this.registered = true;
      if (this.cameFromProduct) {
        this.backToProduct();
      } else {
        this.backToList();
      }
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
      this.pendingSnapshot = JSON.parse(JSON.stringify(this.data.repairlog[id]));
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
    level2Options(level1Id) {
      return equipLevel2Options(this.master.equips, level1Id);
    },
    level3Options(level2Id) {
      return equipLevel3Options(this.master.equips, level2Id);
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

      <p>※修理の履歴を記録できます。</p>

      <template v-if="editingId === null && !addLogStep">
        <equip-category-picker :equips="master.equips" :products="data.products" v-model="selectId" @select="editingId = null" />

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
              <td style="max-height:2em;">{{ (log.about.substring(0, 100) + (log.about.length > 100 ? "..." : "")) || "(未入力)" }}</td>
              <td><button @click="startEdit(id)" style="white-space:nowrap;">編集</button></td>
            </tr>
          </tbody>
        </table>
        <button @click="startAddLog">＋修理履歴を追加</button>
      </template>

      <template v-else-if="addLogStep">
        <equip-category-picker :equips="master.equips" :products="data.products" v-model="selectId" @select="editingId = null" />

        <div style="border:1px solid var(--border); padding:12px; margin-bottom:12px; border-radius:6px;">
          <p><button @click="cancelAddLog">← 一覧に戻る</button></p>

          <template v-if="addLogStep === 'choose'">
            <p>修理する機器は、新規の機器ですか？登録済みの機器ですか？</p>
            <p>
              <button @click="chooseNewEquip" class="highlighted btnlarge">新規の機器</button>
              <button @click="chooseExistingEquip" class="highlighted btnlarge">登録済みの機器</button>
            </p>
          </template>

          <template v-else-if="addLogStep === 'new'">
            <p><span class="rowtitle">機器名<span class="open">*</span></span> <input type="text" v-model="newEquipForm.name"></p>
            <p class="rowtitlepadding"><span class="rowtitle">分類(3段階)<span class="open">*</span></span>
              <select :value="newEquipSelection.level1Id" @change="setNewEquip($event.target.value)">
                <option value="">選択してください</option>
                <option v-for="eq in level1Options" :key="eq.id" :value="eq.id">{{ eq.title }}</option>
              </select>
              <select v-if="newEquipSelection.level1Id" :value="newEquipSelection.level2Id" @change="setNewEquip($event.target.value)">
                <option value="">選択してください</option>
                <option v-for="eq in level2Options(newEquipSelection.level1Id)" :key="eq.id" :value="eq.id">{{ eq.title }}</option>
              </select>
              <select v-if="newEquipSelection.level2Id && level3Options(newEquipSelection.level2Id).length" :value="newEquipSelection.level3Id" @change="setNewEquip($event.target.value)">
                <option value="">選択してください</option>
                <option v-for="eq in level3Options(newEquipSelection.level2Id)" :key="eq.id" :value="eq.id">{{ eq.title }}</option>
              </select>
            </p>
            <p><span class="rowtitle">購入年</span> <input type="number" v-model.number="newEquipForm.purchaseyear">年</p>
            <p><button @click="confirmNewEquip" :disabled="!newEquipForm.name || !newEquipForm.equip_id">この内容で修理履歴を追加</button></p>
          </template>

          <template v-else-if="addLogStep === 'existing'">
            <p><span class="rowtitle">機器<span class="open">*</span></span>
              <select v-model="newLogProductId">
                <option value="">選択してください</option>
                <option v-for="(product, pid) in productList" :key="pid" :value="pid">{{ pid }} ({{ product.name }})</option>
              </select>
            </p>
            <p><button @click="confirmExistingEquip" :disabled="!newLogProductId">この機器で修理履歴を追加</button></p>
          </template>
        </div>
      </template>
      <template v-else>
        <div v-if="data.repairlog[editingId]" style="border:1px solid var(--border); padding:12px; margin-bottom:12px; border-radius:6px;">
          <p>
            <button v-if="cameFromProduct" @click="backToProduct">← 機器に戻る</button>
            <button v-else @click="backToList">← 一覧に戻る</button>
          </p>
          <p><span class="rowtitle">{{ editingId }}</span></p>
          <p><span class="rowtitle">修理日<span class="open">*</span></span>
            <select v-model.number="data.repairlog[editingId].year">
              <option value="">　</option>
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>年
            <select v-model.number="data.repairlog[editingId].month">
              <option value="">　</option>
              <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
            </select>月
            <select v-model.number="data.repairlog[editingId].day">
              <option value="">　</option>
              <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
            </select>日
          </p>
          <p><span class="rowtitle">機器<span class="open">*</span></span>
            <select :value="data.repairlog[editingId].product_id" @change="setEquipForLog(editingId, $event.target.value)">
              <option value="">選択してください</option>
              <option v-for="(product, pid) in data.products" :key="pid" :value="pid">{{ pid }} ({{ product.name }})</option>
            </select>
          </p>
          <p><span class="rowtitle">修理者<span class="open">*</span></span>
            <select v-model.number="data.repairlog[editingId].repairer">
              <option value="">選択してください</option>
              <option v-for="m in repairerOptions" :key="m.val" :value="m.val">{{ m.label }}</option>
            </select>
          </p>
          <p><span class="rowtitle">修理代<span class="open">*</span></span><input type="number" class="no-spin" v-model.number="data.repairlog[editingId].cost">円</p>
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
          <p class="center">
            <button class="highlighted btnlarge" @click="registerLog">登録する</button>
            <button @click="removeLogAndBackToList(editingId)">削除</button>
          </p>
        </div>

        <section class="outershare">
          <p>修理ありがとうございます。<span class="open">*</span> がついた入力済みのデータを、<a href="https://thirdhanders.hinodeya-ecolife.com/">Third Handersサイト</a>から公開することができます。
          「公開用にコピーする」ボタンを押し、Third Handersサイトにログインして、貼り付けてください。</p>
          <button type="button" @click="copyToThirdHanders">公開用にコピーする</button>
        </section>
      </template>
    </section>
  `,
};
