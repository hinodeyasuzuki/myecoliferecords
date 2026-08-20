import { parseYm } from "../lib/yearMonth.js";
import { lastPeriods, buildDashboardSeries, energyCompletionStatuses } from "../lib/dashboardStats.js";
import { buildLineChartSvg } from "../lib/svgLineChart.js";

const SERIES_COLORS = { used: "#2e7d32", handmade: "#e07b17", repaired: "#1565c0" };

export default {
  props: ["data", "master"],
  data() {
    return { dashboardMode: "month" };
  },
  computed: {
    productEntries() {
      return Object.entries(this.data.products);
    },
    periods() {
      return lastPeriods(this.dashboardMode, 20);
    },
    dashboardSeries() {
      return buildDashboardSeries(this.data.products, this.data.repairlog, this.dashboardMode, this.periods);
    },
    dashboardLabels() {
      if (this.dashboardMode === "year") return this.periods.map(String);
      return this.periods.map((ym) => {
        const { year, month } = parseYm(ym);
        return `${String(year).slice(2)}/${month}`;
      });
    },
    dashboardChartSvg() {
      const series = ["used", "handmade", "repaired"].map((key) => ({
        values: this.dashboardSeries[key],
        color: SERIES_COLORS[key],
      }));
      return buildLineChartSvg({ labels: this.dashboardLabels, series, labelEvery: 2 });
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
    countOfRepairlog() {
      return Object.values(this.data.repairlog).length;
    },
    countOfUsedProducts() {
      return this.productEntries.filter(([, item]) => item.method === 3 || item.method === 4 || item.method === 5).length;
    },
    countOfHandmadeProducts() {
      return this.productEntries.filter(([, item]) => item.method === 6).length;
    },
  },
  methods: {
    hasRepairlogFor(productId) {
      return Object.values(this.data.repairlog).some((log) => log.product_id === productId);
    },
    monthLabel(ym) {
      const { year, month } = parseYm(ym);
      return month === 1 ? `${year}/${month}` : `${month}`;
    },
    statusMark(status) {
      if (status === "full") return "●";
      if (status === "partial") return "▲";
      return "";
    },
  },
  template: `
    <section id="top-tab">
      <h2>トップ</h2>

      <section class="outershare" v-if="countOfUsedProducts || countOfHandmadeProducts || countOfRepairlog">
        <h3>成果</h3>
        <table class="top-summary-table">
          <thead>
            <tr>
              <th>中古数</th>
              <th>手作り数</th>
              <th>修理数</th>
              <th>光熱月数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ countOfUsedProducts }}件</td>
              <td>{{ countOfHandmadeProducts }}件</td>
              <td>{{ countOfRepairlog }}件</td>
              <td>{{ energyCompletion.filter((e) => e.status === "full" || e.status === "partial").length }}ヶ月</td>
            </tr>
          </tbody>
        </table>

        <h3>取り組み状況</h3>
        <div class="graph-controls">
          <span>
            <button :class="{highlighted: dashboardMode === 'month'}" @click="dashboardMode = 'month'">月別</button>
            <button :class="{highlighted: dashboardMode === 'year'}" @click="dashboardMode = 'year'">年別</button>
          </span>
        </div>
        <div class="graph-card">
          <div class="energy-chart" v-html="dashboardChartSvg"></div>
          <p class="chart-legend">
            <span><span class="legend-color" style="background:#2e7d32;"></span>中古数</span>
            <span><span class="legend-color" style="background:#e07b17;"></span>手作り数</span>
            <span><span class="legend-color" style="background:#1565c0;"></span>修理数</span>
          </p>
          <p class="chart-caption">直近20{{ dashboardMode === 'year' ? '年' : 'ヶ月' }}分。{{ dashboardMode === 'year' ? '' : '月が不明な場合は、その年の12ヶ月に均等按分しています。' }}</p>
        </div>

        <template v-if="dashboardMode === 'month'">
          <h3>光熱記入状況(直近1年)</h3>
          <table class="energy-completion-table" style="text-align:center;">
            <tbody>
              <tr>
                <th v-for="e in energyCompletion" :key="e.ym">{{ monthLabel(e.ym) }}</th>
              </tr>
              <tr>
                <td v-for="e in energyCompletion" :key="e.ym">{{ statusMark(e.status) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="chart-caption">●＝消費量・金額すべて入力済み　▲＝一部のみ入力済み　空欄＝未入力</p>
        </template>
      </section>

      <p>　エコライフを記録し、活用していきましょう。中古・修理の記録、エネルギー利用の記録を残せます。</p>

      <section class="top-action-grid">
      <article class="top-action-card">
      <h3>中古品を購入した/手作りした</h3>
      <div>
      <p>　「機器」タブで、登録できます。</p>
      <p>　機器の分類を選んでください。「＋追加する」を押すと、中古品や手作りの内容を登録できます。</p>
      </div>
      </article>

      <article class="top-action-card">
      <h3>修理した</h3>
      <div>
      <p>　まずは「機器」タブで、修理した機器を登録してください。</p>
      <p>　機器の編集画面にて、修理履歴の「＋新規追加」ボタンを押すと、修理内容を登録できます。</p>
      </div>
      </article>

      <article class="top-action-card">
      <h3>検針票が届いた</h3>
      <div>
      <p>　「光熱」タブで、記録ができます。</p>
      <p>　年月を選び、消費量・光熱費を記録できます。</p>
      </div>
      </article>

      <article class="top-action-card">
      <h3>省エネ診断をしたい</h3>
      <div>
      <p>　「診断項目」タブで、生活状況を回答することで、効果的な省エネ対策を計算できます。</p>
      <p>　無回答があっても構いません。</p>
      </div>
      </article>
      </section>

      <h3>特徴と注意点</h3>
      <ul>
      <!-- <li>　保存ボタンはなく、新規作成・記入した時点で記録されます。</li> -->
      <li>　入力情報は端末内で管理を行い、民間・公的問わずインターネット上のサーバーには保存されません。このため、端末を変えると情報は引き継がれません。エクスポートで保存して引き継ぐ必要があります。</li>
      <li>　利用者自身の判断で、公開・シェアを行うこともできます。ThirdHandersサイトと連携しています。</li>
      </ul>

      <h3>バグ報告・要望</h3>
      <div>
      <p>　このアプリのバグ報告や要望は、<a href="mailto:suzuki@hinodeya-ecolife.com">開発担当（鈴木：suzuki@hinodeya-ecolife.com）</a>までメールでお知らせください。</p>
      </div>

      <h3>バージョン</h3>
      <div>
        <p>バージョン: 1.0.6 2026/08/19 写真・修理のシームレスな移動</p>
        <p>Copyright &copy; 有限会社ひのでやエコライフ研究所　鈴木靖文</p>
      </div>
    </section>
  `,
};
