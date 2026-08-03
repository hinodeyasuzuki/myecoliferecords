import { isArrayCons, inputCountGroup } from "../lib/consArray.js";
import { buildConsById, topLevelCons, resolveTopCons } from "../lib/consTree.js";

const GENERAL_TAB = "consTotal";
const SEASON_TAB = "consSeason";
const SEASON_LABELS = ["冬の", "春秋の", "夏の"];

export default {
  props: ["data", "master"],
  data() {
    return { search: "", currentConsTab: GENERAL_TAB, seasonLabels: SEASON_LABELS };
  },
  computed: {
    consById() {
      return buildConsById(this.master.cons);
    },
    consTabs() {
      const general = this.master.cons.find((c) => c.code === GENERAL_TAB);
      const season = { code: SEASON_TAB, title: "季節光熱費" };
      const categories = topLevelCons(this.master.cons);
      return general ? [general, season, ...categories] : [season, ...categories];
    },
    // 検索を無視した現在タブの全項目。ヘッダーのグループ(＋/－)ボタンは
    // 検索結果に関わらず常に操作できるようにするため、検索フィルタとは分ける。
    tabItems() {
      return this.master.input.filter((item) => this.topConsFor(item) === this.currentConsTab);
    },
    filteredItems() {
      const q = this.search.trim();
      if (!q) return this.tabItems;
      return this.tabItems.filter((item) => item.title.includes(q) || item.text.includes(q));
    },
    // 現在タブ内にある配列項目(isArrayCons)のグループを、cons.jsonのtitleを代表名として重複なく列挙する。
    tabGroups() {
      const groups = [];
      const seen = new Set();
      for (const item of this.tabItems) {
        if (!isArrayCons(item.cons)) continue;
        const key = this.groupKeyFor(item.cons);
        if (seen.has(key)) continue;
        seen.add(key);
        const consNode = this.consById[item.cons];
        groups.push({ key, title: consNode ? consNode.title : item.cons });
      }
      return groups;
    },
  },
  methods: {
    // 項目が属するタブのcodeを返す。consが"consSeason"の項目は季節光熱費タブへ、
    // "consHTcold"の項目は暖房タブ(consHTsum)へ、それ以外はsumclassの連鎖
    // (resolveTopCons)をたどって上位分類タブへ振り分ける。
    topConsFor(item) {
      if (item.cons === SEASON_TAB) return SEASON_TAB;
      if (item.cons === "consHTcold") return "consHTsum";
      return resolveTopCons(this.consById, item.cons) || GENERAL_TAB;
    },
    setConsTab(code) {
      this.currentConsTab = code;
    },
    isArray(item) {
      return isArrayCons(item.cons);
    },
    isSeason(item) {
      return item.cons === SEASON_TAB;
    },
    // 季節(冬/春秋/夏)ごとの値を保持する配列を用意する。
    ensureSeasonArray(item) {
      if (!Array.isArray(this.data.input[item.id])) {
        this.data.input[item.id] = [];
      }
      const arr = this.data.input[item.id];
      while (arr.length < SEASON_LABELS.length) arr.push(undefined);
      return arr;
    },
    groupKeyFor(consCode) {
      return inputCountGroup(this.consById, consCode);
    },
    // グループ内の他項目にだけ配列がある(旧データ)場合でもこの項目の配列を用意し、
    // グループの入力欄数に満たない分は0で埋める。
    ensureItemArray(item) {
      if (!Array.isArray(this.data.input[item.id])) {
        this.data.input[item.id] = [];
      }
      const arr = this.data.input[item.id];
      const count = this.groupCount(this.groupKeyFor(item.cons));
      while (arr.length < count) arr.push(0);
      return arr;
    },
    // グループの入力欄数。data.inputCountsに未記録の場合は、
    // 既存データ(旧: 項目ごとの個別追加/削除で作られた配列)の最大長を初期値として使う。
    groupCount(groupKey) {
      if (this.data.inputCounts[groupKey] !== undefined) {
        return this.data.inputCounts[groupKey];
      }
      let max = 0;
      for (const item of this.master.input) {
        if (this.groupKeyFor(item.cons) !== groupKey) continue;
        const arr = this.data.input[item.id];
        if (Array.isArray(arr)) max = Math.max(max, arr.length);
      }
      return max;
    },
    // グループに属する全てのi-codeの配列を同じ長さにそろえる。
    setGroupCount(groupKey, newCount) {
      const count = Math.max(0, newCount);
      this.data.inputCounts[groupKey] = count;
      for (const item of this.master.input) {
        if (this.groupKeyFor(item.cons) !== groupKey) continue;
        if (!Array.isArray(this.data.input[item.id])) {
          this.data.input[item.id] = [];
        }
        const arr = this.data.input[item.id];
        while (arr.length < count) arr.push(0);
        while (arr.length > count) arr.splice(count);
      }
    },
    incGroup(groupKey) {
      this.setGroupCount(groupKey, this.groupCount(groupKey) + 1);
    },
    decGroup(groupKey) {
      this.setGroupCount(groupKey, this.groupCount(groupKey) - 1);
    },
    openDiagnosis() {
      location.href = "./d6/";
    },
  },
  template: `
    <section id="input-tab">
      <h2>診断項目</h2>
      <!-- <p><input type="text" v-model="search" placeholder="項目を検索"></p> -->
      <p style="color:var(--muted);">※自宅の利用状況を多く入力するほど、精度の高い診断が計算されます。</p>
      <nav class="tabs">
        <button
          v-for="t in consTabs"
          :key="t.code"
          :class="{active: currentConsTab === t.code}"
          @click="setConsTab(t.code)"
        >{{ t.title }}</button>
      </nav>
      <div class="input-group-controls" v-if="tabGroups.length">
        <span v-for="g in tabGroups" :key="g.key" class="input-group-control">
          {{ g.title }}: {{ groupCount(g.key) }}件
          <button @click="decGroup(g.key)">－</button>
          <button @click="incGroup(g.key)">＋</button>
        </span>
      </div>
      <template v-for="item in filteredItems" :key="item.id" style="margin-bottom:14px;">
        <div class="rowtitle">
          <strong>{{ item.title }}</strong> <span style="color:var(--muted)">{{ item.text }}</span>
        </div>

        <div class="rowvalue">
          <template v-if="isSeason(item)">
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div v-for="(label, idx) in seasonLabels" :key="idx" style="display:flex; flex-direction:column; gap:2px;">
                <span style="color:var(--muted); font-size:0.9em;">{{ label }}{{ item.title }}</span>
                <template v-if="item.options && item.options.length">
                  <select v-model.number="ensureSeasonArray(item)[idx]">
                    <option v-for="opt in item.options" :key="opt.val" :value="opt.val">{{ opt.disp }}</option>
                  </select>
                </template>
                <template v-else>
                  <input :type="item.inputType === 'text' ? 'text' : 'number'" v-model.number="ensureSeasonArray(item)[idx]">
                </template>
              </div>
            </div>
          </template>

          <template v-else-if="isArray(item)">
            <p v-if="groupCount(groupKeyFor(item.cons)) === 0" style="color:var(--muted);">(0件)</p>
            <div v-for="n in groupCount(groupKeyFor(item.cons))" :key="n" style="display:flex; gap:8px; margin-bottom:4px; align-items:center;">
              <span>{{ n }}</span>
              <select v-if="item.options && item.options.length" v-model.number="ensureItemArray(item)[n - 1]">
                <option v-for="opt in item.options" :key="opt.val" :value="opt.val">{{ opt.disp }}</option>
              </select>
              <input v-else :type="item.inputType === 'text' ? 'text' : 'number'" v-model.number="ensureItemArray(item)[n - 1]">
              {{ item.unit ? item.unit : "" }}
            </div>
          </template>

          <template v-else-if="item.options && item.options.length">
            <select v-model.number="data.input[item.id]">
              <option v-for="opt in item.options" :key="opt.val" :value="opt.val">{{ opt.disp }}</option>
            </select>
            {{ item.unit ? item.unit : "" }}
          </template>

          <template v-else>
            <input :type="item.inputType === 'text' ? 'text' : 'number'" v-model.number="data.input[item.id]">
            {{ item.unit ? item.unit : "" }}
          </template>
        </div>
      </template>
      <section id="energy-graph">
        <p>入力済みのデータを使って、別ページで家庭の省エネ診断ができます。</p>
        <button type="button" @click="openDiagnosis">表示する</button>
      </section>
    </section>
  `,
};
