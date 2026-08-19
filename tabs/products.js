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
import { dateSortValue } from "../lib/repairlogSort.js";
import { pictureSummary } from "../lib/pictureSummary.js";
import { deletePictureBlob, getPictureBlob } from "../lib/pictureStore.js";
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
  props: ["data", "master", "highlightId", "categoryFilter"],
  emits: ["jump-repairlog", "jump-picture", "consumed-highlight"],
  data() {
    return {
      methodOptions: METHOD_OPTIONS,
      monthOptions: MONTH_OPTIONS,
      editingId: null,
      sortKey: "purchaseyear",
      sortDir: "desc",
      isNarrow: window.innerWidth <= 600,
      pendingIsNew: false,
      pendingSnapshot: null,
      registered: false,
    };
  },
  created() {
    if (this.highlightId) {
      this.pendingIsNew = false;
      this.pendingSnapshot = JSON.parse(JSON.stringify(this.data.products[this.highlightId]));
      this.editingId = this.highlightId;
      this.$emit("consumed-highlight");
    }
  },
  mounted() {
    window.addEventListener("resize", this.updateIsNarrow);
  },
  unmounted() {
    window.removeEventListener("resize", this.updateIsNarrow);
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
        this.pendingIsNew = false;
        this.pendingSnapshot = null;
      }
    },
  },
  computed: {
    // 機器/修理履歴タブ間で共有するカテゴリー選択状態(app.jsのcategoryFilter)。
    selectId: {
      get() {
        return this.categoryFilter.id;
      },
      set(id) {
        this.categoryFilter.id = id;
      },
    },
    equipsById() {
      return buildEquipsById(this.master.equips);
    },
    yearOptions() {
      const current = new Date().getFullYear();
      const years = [];
      for (let y = current; y >= current - 100; y--) years.push(y);
      return years;
    },
    level1Options() {
      return equipLevel1Options(this.master.equips);
    },
    sortedEquips() {
      return [...this.master.equips].sort((a, b) => Number(a.id) - Number(b.id));
    },
    repairedProductIds() {
      return new Set(Object.values(this.data.repairlog).map((log) => log.product_id).filter(Boolean));
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
      return sortProductEntries(
        entries,
        this.sortKey,
        this.sortDir,
        this.equipsById,
        this.methodOptions,
        (id) => this.repairedProductIds.has(id)
      );
    },
    energyFlag() {
      const item = this.data.products[this.editingId];
      if (!item) return null;
      const equip = this.equipsById[item.equip_id];
      return equip ? equip.energyFlag : null;
    },
    ecouseFlag() {
      return this.editingId === null ? false : this.data.products[this.editingId].method > 2;
    }
  },
  methods: {
    productRepairlogIds(productId) {
      const ids = Object.keys(this.data.repairlog).filter((lid) => this.data.repairlog[lid].product_id === productId);
      const product = this.data.products[productId];
      if (product && !(product.repairlog_ids.length === ids.length && product.repairlog_ids.every((id, i) => id === ids[i]))) {
        product.repairlog_ids = ids;
      }
      return ids;
    },
    hasRepairlogFor(productId) {
      return this.repairedProductIds.has(productId);
    },
    sortedRepairlogIds(ids) {
      return [...ids].sort((a, b) => {
        const logA = this.data.repairlog[a];
        const logB = this.data.repairlog[b];
        const valueA = logA ? dateSortValue(logA) : null;
        const valueB = logB ? dateSortValue(logB) : null;
        if (valueA === null && valueB === null) return 0;
        if (valueA === null) return 1;
        if (valueB === null) return -1;
        return valueA - valueB;
      });
    },
    repairlogSummary(lid) {
      const log = this.data.repairlog[lid];
      if (!log) return lid + " (削除済み)";
      const dateParts = [log.year, log.month, log.day].filter((v) => v !== null && v !== undefined);
      const date = dateParts.length ? dateParts.join("/") : "";
      const about = log.about ||  "(未入力)";
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
    confirmRemoveProduct(id) {
      if (!confirm("本当に削除しますか？")) return;
      this.registered = true;
      this.removeProductAndBackToList(id);
    },
    discardEdit(id) {
      if (this.pendingIsNew) {
        delete this.data.products[id];
      } else if (this.pendingSnapshot) {
        this.data.products[id] = this.pendingSnapshot;
      }
    },
    registerProduct() {
      this.registered = true;
      this.backToList();
    },
    addRepairlogFor(productId) {
      // 修理履歴タブへ遷移すると本コンポーネントはアンマウントされるため、
      // 編集中の内容が破棄されないよう先に確定しておく。
      this.registered = true;
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
      this.$emit("jump-repairlog", id);
    },
    removeRepairlogEntry(id) {
      removeRepairlog(this.data, id);
    },
    addPictureFor(productId) {
      // 写真タブへ遷移すると本コンポーネントはアンマウントされるため、
      // 編集中の内容が破棄されないよう先に確定しておく。
      this.registered = true;
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
      this.pendingIsNew = false;
      this.pendingSnapshot = JSON.parse(JSON.stringify(this.data.products[id]));
      this.editingId = id;
    },
    backToList() {
      this.editingId = null;
    },
    addProductAndEdit() {
      const id = this.addProduct();
      this.pendingIsNew = true;
      this.pendingSnapshot = null;
      this.editingId = id;
    },
    addProductForEquip(equipId) {
      this.selectId = equipId;
      const id = this.addProduct();
      this.pendingIsNew = true;
      this.pendingSnapshot = null;
      this.editingId = id;
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
    roomNameFor(roomId) {
      const room = this.data.room[roomId];
      return room ? room.name : "";
    },
    getEquipTitle(equipId) {
      const equip = this.equipsById[equipId];
      return equip ? equip.title : "";
    },
    async copyToThirdHanders() {
      const item = this.data.products[this.editingId];
      if (!item) return;
      const pictureIds = item.picture_ids.slice(0, 2);
      const picture = {};
      for (const pid of pictureIds) {
        const pic = this.data.picture[pid];
        picture[pid] = {
          data: (await getPictureBlob(pid)) || "",
          memo: pic ? pic.memo : "",
        };
      }
      const payload = {
        products: {
          [this.editingId]: {
            equip_id: item.equip_id,
            name: item.name,
            method: item.method,
            purchaseyear: item.purchaseyear,
            memory: item.memory,
            picture_ids: pictureIds,
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
    linkToRepair() {
      const url = `https://s8.hinodeya-ecolife.com/repairinfo/equipment.php?equipcode=${this.selectId}`;
      window.open(url);
    }
  },
  template: `
    <section id="products-tab">
      <h2>機器</h2>

      <p>※分類を選び、中古で買った機器などを記録できます。</p>

      <equip-category-picker :equips="master.equips" :products="data.products" v-model="selectId" @select="editingId = null" />

      <template v-if="editingId === null">
        <p>中古数：{{ sortedProductEntries.filter(([, item]) => item.method === 3 || item.method === 4 || item.method === 5).length }}件
        　／　愛用数：{{ sortedProductEntries.filter(([, item]) => item.favorite).length }}件
        　／　修理数：{{ sortedProductEntries.filter(([id]) => hasRepairlogFor(id)).length }}件</p>
        <table>
          <thead>
            <tr class="table-sortable">
              <th @click="setSort('name')">呼び名 <span v-if="sortKey === 'name'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('model')">製品分類 <span v-if="sortKey === 'model'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('purchaseyear')">入手年 <span v-if="sortKey === 'purchaseyear'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('method')">入手方法 <span v-if="sortKey === 'method'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('repaired')">修理 <span v-if="sortKey === 'repaired'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('favorite')">愛用品 <span v-if="sortKey === 'favorite'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('enduseyear')" class="hide_sm">終了年 <span v-if="sortKey === 'enduseyear'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[id, item] in sortedProductEntries" :key="id" :class="item.enduseyear ? 'enduse' : ''">
              <td>
                <img v-if="item.picture_ids.length && pictureSrc(item.picture_ids[0])" :src="pictureSrc(item.picture_ids[0])" class="picture-thumb-xs" style="float:left;">
                {{ item.name || "(未入力)" }}
              </td>
              <td>{{ modelNameFor(item) }}</td>
              <td>{{ item.purchaseyear }}</td>
              <td>{{ methodLabelDisplay(item.method) }}</td>
              <td>{{ hasRepairlogFor(id) ? "○" : "" }}</td>
              <td>{{ item.favorite ? "❤" : "" }}</td>
              <td class="hide_sm">{{ item.enduseyear }}</td>
              <td><button @click="startEdit(id)">編集</button></td>
            </tr>
          </tbody>
        </table>
        <button v-if="selectId" @click="addProductAndEdit">＋{{ getEquipTitle(selectId) }} を追加</button>
        <button v-else @click="addProductAndEdit">＋分類を指定せず機器を追加</button>
        
        <section class="outershare" v-if="selectId && ( selectId % 10) !=0 ">
          <p>家庭の機器修理方法サイトから、{{ getEquipTitle(selectId) }} の修理の概要を表示することができます。</p>
          <button type="button" @click="linkToRepair">修理方法を表示する</button>
        </section>

      </template>

      <template v-else>
        <div v-if="data.products[editingId]" style="border:1px solid var(--border); padding:12px; margin-bottom:12px; border-radius:6px;">
          <p><button @click="backToList">← 一覧に戻る</button></p>
          <p><strong>{{ editingId }}</strong></p>
          <p><span class="rowtitle">呼び名<span class="open">*</span></span> <input type="text" v-model="data.products[editingId].name"></p>
          <p class="rowtitlepadding"><span class="rowtitle">製品分類<span class="open">*</span></span>
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
          <p><span class="rowtitle">入手年月<span class="open">*</span></span>
            <select v-model.number="data.products[editingId].purchaseyear">
              <option value="">　</option>
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>年
            <select v-model.number="data.products[editingId].purchasemonth">
              <option v-for="m in monthOptions" :key="m.val" :value="m.val">{{ m.label }}</option>
            </select>
            <input type="button" value="今月" @click="data.products[editingId].purchaseyear = new Date().getFullYear(); data.products[editingId].purchasemonth = new Date().getMonth() + 1;">
          </p>
          <p><span class="rowtitle">入手方法<span class="open">*</span></span>
            <select v-model.number="data.products[editingId].method">
              <option value="">選択してください</option>
              <option v-for="m in methodOptions" :key="m.val" :value="m.val">{{ m.label }}</option>
            </select>
          </p>
          <p><span class="rowtitle">概要<span class="open">*</span></span> <textarea class="memory" v-model="data.products[editingId].memory"></textarea></p>

          <p><span class="rowtitle">メーカー</span> <input type="text" class="w100" v-model="data.products[editingId].maker"></p>
          <p><span class="rowtitle">型番</span> <input type="text" class="w100" v-model="data.products[editingId].modelnumber"></p>
          <p><span class="rowtitle">販売者</span> <input type="text" class="w100" v-model="data.products[editingId].seller"></p>

          <p><span class="rowtitle">愛用品</span> <input type="checkbox" v-model="data.products[editingId].favorite"> <span>※お気に入りの製品の場合、マークします</span></p>
          <p v-if="data.products[editingId].method == 3 || data.products[editingId].method == 4"><span class="rowtitle">製造年</span>
            <select v-model.number="data.products[editingId].manufactureyear">
              <option value="">　</option>
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>年
          </p>
          <p><span class="rowtitle">部屋</span>
            <select v-if="data.showRoom" v-model="data.products[editingId].room_id">
              <option value="">選択してください</option>
              <option v-for="(room, rid) in data.room" :key="rid" :value="rid">{{ room.name }} ({{ rid }})</option>
            </select>
            <span v-else-if="data.products[editingId].room_id">{{ roomNameFor(data.products[editingId].room_id) }}</span>
            <span v-else style="color:var(--muted);">「使い方」タブで、部屋名の入力ができるモードに設定できます。</span>
          </p>
          <template v-if="energyFlag == 1">
            <p><span class="rowtitle">消費電力</span> <input type="number" v-model.number="data.products[editingId].watt">W</p>
            <p><span class="rowtitle">使用時間</span> <input type="number" v-model.number="data.products[editingId].usagetime">時間/回</p>
            <p><span class="rowtitle">使用頻度</span> <input type="number" v-model.number="data.products[editingId].frequency">回/年</p>
          </template>
          <p><span class="rowtitle">修理履歴</span>　<button @click="addRepairlogFor(editingId)">＋新規追加</button></p>
          <ul>
            <li v-for="lid in sortedRepairlogIds(productRepairlogIds(editingId))" :key="lid">
              <a href="#" @click.prevent="$emit('jump-repairlog', lid)">{{ repairlogSummary(lid).substring(0, 50) + (repairlogSummary(lid).length > 50 ? "..." : "") }}</a>
              <!-- <button @click.stop="removeRepairlogEntry(lid)">削除</button> -->
            </li>
          </ul>
          <p><span class="rowtitle">写真<span class="open">*</span></span>　<button @click="addPictureFor(editingId)">＋新規追加</button></p>
          <ul>
            <li v-for="pid in data.products[editingId].picture_ids" :key="pid">
              <a href="#" @click.prevent="$emit('jump-picture', pid)">
                <img v-if="pictureSrc(pid)" :src="pictureSrc(pid)" class="picture-thumb-sm">
                {{ pictureSummaryFor(pid) }}
              </a>
              <button @click.stop="removePictureEntry(pid)">削除</button>
            </li>
          </ul>
          <p><span class="rowtitle">使用終了年</span> <input type="number" v-model.number="data.products[editingId].enduseyear">年</p>
          <p class="center">
            <button class="highlighted btnlarge" @click="registerProduct">登録する</button>
            <button @click="confirmRemoveProduct(editingId)">削除</button>
          </p>
        </div>
      </template>

      <section class="outershare" v-if="ecouseFlag">
        <p>{{methodOptions[data.products[editingId].method-1].label}} ありがとうございます。<span class="open">*</span> がついた入力済みのデータを、<a href="https://thirdhanders.hinodeya-ecolife.com/">Third Handersサイト</a>から公開することができます。
        「公開用にコピーする」ボタンを押し、Third Handersサイトにログインして、貼り付けてください。</p>
        <button type="button" @click="copyToThirdHanders">公開用にコピーする</button>
      </section>
    </section>
  `,
};