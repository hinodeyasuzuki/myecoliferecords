export default {
  props: ["data"],
  emits: ["export-json", "import-json"],
  methods: {
    onFileChange(event) {
      this.$emit("import-json", event);
    },
  },
  template: `
    <section id="setting-tab">
      <h2>使い方</h2>

      <h3>このアプリ（Myエコライフ情報）について</h3>
      <div>
      <p>　このアプリは、家庭のエコライフにつながる生活情報を網羅的に記録し、省エネ診断・修理・買い替えの時に活用できます。
      入力情報は端末内で管理を行い、民間・公的問わずインターネット上のサーバーには保存されません。
      利用者自身の判断で、公開・シェアを行うこともできます。</p>
      <p>　自分の情報は、自分で管理し活用していきましょう。</p>
      </div>

      <h3>保存データについて</h3>
      <div>
        <p>　保存データは端末のブラウザ内のみに保存されます。「エクスポート」でファイル形式でバックアップ保存が可能です。</p>
        <p>　「インポート」で読み込みができます。読み込みをすると、記録が上書きされますのでご注意ください。</p>
        <ul>
          <li>エクスポート（保存）<button @click="$emit('export-json')">エクスポート</button></li>
          <li>
            <label>
              インポート（読込）
              <input type="file" accept="application/json" @change="onFileChange">
            </label>
          </li>
        </ul>
      </div>

      <h3>オプション設定</h3>
      <div class="rowtitlepadding">
        <p>
          <label>
            <input type="checkbox" v-model="data.showRoom">
            部屋の記録を使う
          </label>
        </p>
        <p style="color:var(--muted);">※ONにすると、機器の設置場所などを管理する「部屋」タブが表示されます。OFFにしても、すでに入力済みの部屋の記録は消えません。</p>
      </div>

      <h3>記入項目について</h3>
      <div class="rowtitlepadding">
      <p><strong>部屋</strong>：　部屋の一覧と詳細情報を記録します。機器が設置・保管されている場所の記録にも用います。</p>
      <p><strong>機器</strong>：　家電製品・耐久品・半耐久品について、購入・修理の記録や、使用状況の記録を行います。中古購入や、修理履歴のあるものなど、環境に配慮したものから記録を始めてみてください。</p>
      <p><strong>修理履歴</strong>：機器について、修理の記録を行います。</p>
      <p><strong>写真</strong>：　機器や修理の写真を記録します。</p>
      <p><strong>光熱</strong>：　電気・ガス・水道などの使用状況や料金を記録します。この記録を使って、グラフ化など分析ができます。</p>
      <p><strong>診断項目</strong>：家庭のエコライフに関する生活状況を網羅的に記録します。この記録を使って、省エネ改善のための効果を計算した診断結果が得られます。</p>
      </div>

    </section>
  `,
};
