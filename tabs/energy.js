import { toYm, parseYm } from "../lib/yearMonth.js";
import { buildEnergyRows } from "../lib/energyRows.js";
import { lastPeriods, energyCompletionStatuses } from "../lib/dashboardStats.js";

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
    last12Months() {
      return lastPeriods("month", 12);
    },
    energyCompletion() {
      return energyCompletionStatuses(
        this.last12Months,
        this.master.energy,
        this.master.energycost,
        this.data.energy,
        this.data.energycost
      );
    },
    monthLabel() {
      return (ym) => {
        const { year, month } = parseYm(ym);
        return month === 1 ? `${year}/${month}` : `${month}`;
      };
    }
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
    statusMark(status) {
      if (status === "full") return "●";
      if (status === "partial") return "▲";
      return "";
    },
  },
  template: `
    <section id="energy-table">
      <h2>光熱（消費量・金額）</h2>
      <table class="energy-completion-table" style="text-align:center;">
        <tbody>
          <tr>
            <th v-for="e in energyCompletion" :key="e.ym">
              <span @click="selectMonth(e.ym)" :class="{highlighted: e.ym === ym}" style="cursor:pointer;padding:0 10px;border-radius:4px;">{{ monthLabel(e.ym) }}</span>
            </th>
          </tr>
          <tr>
            <td v-for="e in energyCompletion" :key="e.ym">{{ statusMark(e.status) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="chart-caption" style="text-align:right;">●＝消費量・金額すべて入力済み　▲＝一部のみ入力済み</p>

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

      <transition name="month-swap" mode="out-in">
        <table :key="ym">
          <thead>
            <tr><th class="item">項目</th><th class="amount">消費量</th><th class="amount">金額(円)</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in energyRows" :key="row.code">
              <td class="item">{{ row.name }}</td>
              <td class="amount">
                <input type="number" class="no-spin" v-model.number="energyValues[row.code]">
                <span v-if="row.unit">{{ row.unit }}</span>
              </td>
              <td class="amount">
                <input v-if="row.costCode" type="number" class="no-spin" v-model.number="energycostValues[row.costCode]">
              </td>
            </tr>
          </tbody>
        </table>
      </transition>
      <p class="note">※消費がない場合は、0を入力してください。</p>

      <section class="outershare">
        <p>※入力済みのデータを使って、別ページでグラフ表示できます。</p>
        <button type="button" class="anotherpage" @click="openEnergyGraph">表示する >></button>
      </section>
    </section>
  `,
};
