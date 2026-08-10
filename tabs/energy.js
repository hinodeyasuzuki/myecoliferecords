import { toYm, parseYm } from "../lib/yearMonth.js";
import { buildEnergyRows } from "../lib/energyRows.js";

export default {
  props: ["data", "master"],
  data() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  },
  computed: {
    ym() {
      return toYm(this.year, this.month);
    },
    yearOptions() {
      const current = new Date().getFullYear();
      const years = [];
      for (let y = current - 5; y <= current + 1; y++) years.push(y);
      return years;
    },
    savedMonths() {
      const keys = new Set([
        ...Object.keys(this.data.energy),
        ...Object.keys(this.data.energycost),
      ]);
      return Array.from(keys).sort();
    },
    energyValues() {
      if (!this.data.energy[this.ym]) this.data.energy[this.ym] = {};
      return this.data.energy[this.ym];
    },
    energycostValues() {
      if (!this.data.energycost[this.ym]) this.data.energycost[this.ym] = {};
      return this.data.energycost[this.ym];
    },
    energyRows() {
      return buildEnergyRows(this.master.energy, this.master.energycost);
    },
  },
  methods: {
    selectMonth(ymKey) {
      const { year, month } = parseYm(ymKey);
      this.year = year;
      this.month = month;
    },
    openEnergyGraph() {
      location.href = "./energy/";
    },
    preMonth(ymKey) {
      const { year, month } = parseYm(ymKey);
      const date = new Date(year, month - 1, 1);
      date.setMonth(date.getMonth() - 1);
      this.year = date.getFullYear();
      this.month = date.getMonth() + 1;
    },
    nextMonth(ymKey) {
      const { year, month } = parseYm(ymKey);
      const date = new Date(year, month - 1, 1);
      date.setMonth(date.getMonth() + 1);
      this.year = date.getFullYear();
      this.month = date.getMonth() + 1;
    },
  },
  template: `
    <section id="energy-table">
      <h2>光熱（消費量・金額）</h2>
      <p>
        <select v-model.number="year">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
        </select>
        <select v-model.number="month">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
        </select>　
        <input type="button" value="＜前月" @click="preMonth(ym)">
        <input type="button" value="翌月＞" @click="nextMonth(ym)">
        <!--<span style="color:var(--muted)">({{ ym }})</span>-->
      </p>

      <table> 
        <thead>
          <tr><th class="item">項目</th><th class="amount">消費量</th><th class="amount">金額(円)</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in energyRows" :key="row.code">
            <td class="item">{{ row.name }}</td>
            <td class="amount">
              <input type="number" v-model.number="energyValues[row.code]">
              <span v-if="row.unit">{{ row.unit }}</span>
            </td>
            <td class="amount">
              <input v-if="row.costCode" type="number" v-model.number="energycostValues[row.costCode]">
            </td>
          </tr>
        </tbody>
      </table>

      <section class="outershare">
        <p>入力済みのデータを使って、別ページでグラフ表示できます。</p>
        <button type="button" class="anotherpage" @click="openEnergyGraph">表示する >></button>
      </section>
    </section>
  `,
};
