# iCloud(写真ライブラリ)からの写真取り込み対応 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tabs/picture.js` の写真編集画面に、Google Photosと並べて「アルバム(iCloudなど)から選択」ボタンを追加し、OS標準の写真ライブラリピッカー経由で写真を取り込めるようにする。

**Architecture:** Vue単一ファイルコンポーネント `tabs/picture.js` 内に、`capture`属性なしの非表示`<input type="file">`を新設し、`ref`経由の`click()`で起動するボタンを追加する。取り込み処理は既存の`onFileSelected(id, event)`メソッドをそのまま再利用する。バックエンドやビルド設定の変更は不要。

**Tech Stack:** Vue 3 (テンプレート文字列コンポーネント)、素のブラウザAPI (`<input type="file">`, `FileReader`)。既存の`lib/image.js`の`compressImageFile`、`lib/pictureStore.js`の`putPictureBlob`をそのまま利用。

## Global Constraints

- Appleの公式iCloud写真取得APIは存在しないため、OS標準の写真ライブラリピッカー経由の取り込みで代替する(仕様: `docs/superpowers/specs/2026-08-10-icloud-photo-picker-design.md`)。
- 変更は `tabs/picture.js` のみ。CSSや他ファイルの変更は不要。
- 自動テストの仕組みがないプロジェクトのため、各タスクの検証はブラウザでの手動確認で行う。
- 既存の`onFileSelected`のロジック(`compressImageFile` → `putPictureBlob` → `setPictureBlobCache`)は変更しない。

---

### Task 1: ライブラリ選択ボタンの追加と動作確認

**Files:**
- Modify: `tabs/picture.js:129-144`(編集画面テンプレート部分)

**Interfaces:**
- Consumes: 既存の `onFileSelected(id, event)` メソッド(`tabs/picture.js:56-69`、シグネチャ変更なし)
- Produces: なし(UIタスクのみ。後続タスクなし)

- [ ] **Step 1: 現状のテンプレートを確認する**

`tabs/picture.js` の該当箇所(129〜144行目)は以下の内容:

```js
      <template v-else>
        <div v-if="data.picture[editingId]" class="picture-card">
          <p><button @click="backToList">← 一覧に戻る</button></p>
          <p><strong>{{ editingId }}</strong> <button @click="removePicture(editingId)">削除</button></p>
          <p>
            <img v-if="pictureSrc(editingId)" :src="pictureSrc(editingId)" class="picture-thumb">
            <input type="file" accept="image/*" capture="environment" @change="onFileSelected(editingId, $event)">
            <button @click="onPickFromGooglePhotos(editingId)">Google Photosから選択</button>
          </p>
          <p v-if="data.picture[editingId].sourceUrl" style="color:var(--muted);">
            取込元: <a :href="data.picture[editingId].sourceUrl" target="_blank" rel="noopener">Google Photos</a>（リンクは時間が経つと無効になる場合があります）
          </p>
          <p><span class="rowtitle">メモ</span> <textarea class="memory" v-model="data.picture[editingId].memo"></textarea></p>
          <p><span class="rowtitle">作成日時</span> <input type="text" v-model="data.picture[editingId].created_at"></p>
        </div>
      </template>
```

- [ ] **Step 2: テンプレートを書き換える**

上記ブロックを以下に置き換える(`<p>`内の写真取得部分に、ラベルと新規のライブラリ選択inputを追加):

```js
      <template v-else>
        <div v-if="data.picture[editingId]" class="picture-card">
          <p><button @click="backToList">← 一覧に戻る</button></p>
          <p><strong>{{ editingId }}</strong> <button @click="removePicture(editingId)">削除</button></p>
          <p>
            <img v-if="pictureSrc(editingId)" :src="pictureSrc(editingId)" class="picture-thumb">
          </p>
          <p>
            カメラで撮影:
            <input type="file" accept="image/*" capture="environment" @change="onFileSelected(editingId, $event)">
          </p>
          <p>
            <button @click="$refs.libraryFileInput.click()">アルバムから選択（iCloudなど）</button>
            <input type="file" accept="image/*" ref="libraryFileInput" style="display:none" @change="onFileSelected(editingId, $event)">
            <button @click="onPickFromGooglePhotos(editingId)">Google Photosから選択</button>
          </p>
          <p v-if="data.picture[editingId].sourceUrl" style="color:var(--muted);">
            取込元: <a :href="data.picture[editingId].sourceUrl" target="_blank" rel="noopener">Google Photos</a>（リンクは時間が経つと無効になる場合があります）
          </p>
          <p style="color:var(--muted);">
            ※「アルバムから選択」はOS標準の写真ピッカーを一度だけ経由して取り込む方式です。iCloud等のライブラリに同期済みの写真も選べますが、Google Photosのように後からリンク先を参照し続けることはできません。
          </p>
          <p><span class="rowtitle">メモ</span> <textarea class="memory" v-model="data.picture[editingId].memo"></textarea></p>
          <p><span class="rowtitle">作成日時</span> <input type="text" v-model="data.picture[editingId].created_at"></p>
        </div>
      </template>
```

注意点:
- 新設した`<input ref="libraryFileInput">`には`capture`属性を付けない。これによりiOS/iPadOS Safariでファイル選択ダイアログを開いた際、カメラだけでなく「写真」アプリ(iCloud同期済みライブラリを含む)からの選択肢が提示される。
- `$refs.libraryFileInput`はこのコンポーネントインスタンス内で一意な参照であり、`editingId`はこのブロックが表示されている間ただ一つの値なのでrefの衝突は起きない。
- `onFileSelected`メソッド自体は変更不要(引数・処理とも既存のまま)。

- [ ] **Step 3: 構文エラーがないことを確認する**

Run: `node --check tabs/picture.js`
Expected: 何も出力されずに終了する(構文エラーなし)。

Note: このプロジェクトはブラウザ向けESモジュール(`import`/`export`)を使っているため、`node --check`は構文チェック用であり、実行は行わない。

- [ ] **Step 4: ローカルサーバーでブラウザ手動確認する**

Run: プロジェクトルートで簡易サーバーを起動する(例: `python3 -m http.server 8000`)。

ブラウザで `http://localhost:8000/index.html` を開き、以下を確認する:

1. 「写真」タブ → 既存の写真をクリックして編集画面を開く。
2. 「カメラで撮影」ラベルの隣にファイル選択input、その下に「アルバムから選択（iCloudなど）」ボタンと「Google Photosから選択」ボタンが並んで表示されていること。
3. 「アルバムから選択（iCloudなど）」ボタンをクリックすると、ブラウザのファイル選択ダイアログが開くこと(PC検証時はOS標準のファイル選択ダイアログでよい。`capture`属性がないことは、devtoolsでinput要素を確認して`capture`属性が付与されていないことで確認する)。
4. 適当な画像ファイルを選択すると、サムネイルが更新され、写真が保存されること(既存の`onFileSelected`が動作していることの確認)。
5. 「カメラで撮影」のinput、「Google Photosから選択」ボタンが従来通り動作すること(デグレがないことの確認)。

Expected: 上記すべてが問題なく動作する。

- [ ] **Step 5: コミット**

```bash
git add tabs/picture.js
git commit -m "$(cat <<'EOF'
写真編集画面にアルバム(iCloudなど)からの選択ボタンを追加

Google Photos連携と並べて、OS標準の写真ライブラリピッカー経由でiCloud同期済み写真も取り込めるようにする。capture属性なしのinputを新設し、既存のonFileSelected処理を再利用。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
