export default {
  emits: ["export-json", "import-json"],
  methods: {
    onFileChange(event) {
      this.$emit("import-json", event);
    },
  },
  template: `
    <section id="setting-tab">
      <h2>設定</h2>
      <h3>データのエクスポート / インポート</h3>
      <div class="toolbar">
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
      <h3>バージョン</h3>
      <div class="toolbar">
        <p>バージョン: 1.0.0 2026/07/28</p>
      </div>
    </section>
  `,
};
