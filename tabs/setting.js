export default {
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
      <p>　このアプリは、家庭のエコライフにつながる生活情報を網羅的に記録しておき、診断・修理など必要な形で活用できるようにするものです。情報は自分の権限ですべて管理を行うことができ、公開・シェアなどの操作をしない限り、入力された記録のサーバーへの送信は行われません。</p>
      <p>　自分の情報は、自分で管理し、必要に応じて活用していきましょう。</p>
      </div>

      <h3>保存データについて</h3>
      <div>
        <p>　保存データはサーバーには一切送信されず、端末のブラウザ内に保存されます。「エクスポート」でファイル形式でバックアップ保存が可能です。</p>
        <p>　「インポート」で読み込みができます。読み込みをすると、記録が上書きされますのでご注意ください。</p>
        <ul>
          <li>エクスポート<button @click="$emit('export-json')">エクスポート</button></li>
          <li>
            <label>
              インポート
              <input type="file" accept="application/json" @change="onFileChange">
            </label>
          </li>
        </ul>
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

      <h3>バグ報告・要望</h3>
      <div>
      <p>　このアプリのバグ報告や要望は、<a href="mailto:suzuki@hinodeya-ecolife.com">開発担当（鈴木：suzuki@hinodeya-ecolife.com）</a>までメールでお知らせください。</p>
      </div>

      <h3>バージョン</h3>
      <div>
        <p>バージョン: 1.0.2 2026/08/03</p>
        <p>Copyright &copy; 有限会社ひのでやエコライフ研究所　鈴木靖文</p>
      </div>
    </section>
  `,
};
