# myecoliferecords 設計書

「Myエコライフ記録」— 自宅の部屋構成・機器情報・光熱の月次データ・修理履歴・写真・省エネ診断項目を、ブラウザ内で継続的に蓄積・閲覧するための、サーバーレス静的Webアプリケーションの設計書。

## 1. 概要

- **公開URL**: https://hinodeyasuzuki.github.io/myecoliferecords/（GitHub Pagesでの静的ホスティング）
- **ホスティング形態**: ビルドプロセス不要。リポジトリ内のファイルをそのまま配信。
- **利用形態**: 個人利用・単一ユーザー・ログイン機構なし。全データは利用端末のブラウザ内に閉じる。
- **ライセンス**: MIT License

## 2. 技術スタック

| 分類 | 採用技術 |
|---|---|
| フロントエンド | Vue 3（`https://unpkg.com/vue@3/dist/vue.esm-browser.js` をCDNから直接 `import`。ビルド不要） |
| 言語 | 素のJavaScript（ES Modules）。TypeScriptは未使用 |
| データ永続化（本体） | `localStorage`（キー: `homeenergycodes.savedInput`） |
| データ永続化（画像） | `IndexedDB`（DB名: `homeenergycodes-pictures`、ストア名: `pictures`） |
| サブシステム(`d6/`) | jQuery / D3.js / dimple.js（ビルド済みminファイルを含む旧来型構成。診断結果の可視化ダッシュボード） |
| CI/CD | なし（`.github/workflows` 等は存在しない） |
| コンテナ化 | なし（Dockerfile なし） |

package.json / composer.json は存在せず、npm等の依存管理は行っていない。すべて外部CDNからのimportで完結している。

## 3. ディレクトリ構成

```
myecoliferecords/
├── index.html          # アプリのHTMLシェル
├── app.js              # アプリ初期化・状態管理・タブ定義・エクスポート/インポート
├── tabs/                # 機能タブごとのVueコンポーネント
│   ├── top.js           # トップ画面
│   ├── room.js           # 部屋管理
│   ├── products.js       # 機器管理
│   ├── repairlog.js      # 修理履歴管理
│   ├── picture.js        # 写真管理
│   ├── energy.js          # 光熱データ管理
│   ├── input.js           # 診断項目入力
│   └── setting.js         # 設定・使い方・バックアップ
├── lib/                  # ドメインロジック・正規化・ストレージ補助
│   ├── id.js               # ID採番（接頭辞+連番）
│   ├── unlink.js             # レコード間リンクの整合性維持
│   ├── roomLinks.js           # 部屋の行き来関係の正規化・双方向同期
│   ├── equipTree.js            # 機器分類3階層ツリー
│   ├── productData.js           # 機器データ正規化
│   ├── productSort.js            # 機器並び替え
│   ├── repairlogSort.js           # 修理履歴並び替え
│   ├── pictureData.js              # 写真データ正規化（旧形式からの移行含む）
│   ├── pictureStore.js              # IndexedDB操作
│   ├── pictureBlobCache.js           # 画像Blobキャッシュ
│   ├── pictureSummary.js              # 写真の紐づき先サマリ
│   ├── consArray.js / consTree.js       # 診断項目の配列・ツリー構造
│   ├── energyRows.js                     # 光熱データの行構成
│   ├── yearMonth.js                       # 年月ユーティリティ
│   ├── googlePhotosPicker.js               # Google Photos Picker API連携
│   └── googlePhotosConfig.js                # Google Photos OAuthクライアント設定
├── icons/                # 機器分類アイコンSVG
├── energy/                # 光熱データのグラフ表示サブページ（D3系）
├── d6/                     # 別サブシステム：省エネ診断結果の可視化ツール
└── docs/                    # 設計・仕様ドキュメント
```

## 4. アプリケーション全体構造

`app.js` がエントリポイント。

- `data`（reactive）: ユーザー入力データ本体。`localStorage` と `watch(deep: true)` で自動同期。
- `master`（reactive）: 外部マスタデータ（診断項目・機器分類・エネルギー種別等）。`mounted()` 時に外部APIから取得。
- `highlight`（reactive）: タブ間ジャンプ時にハイライト対象を保持する一時状態（`repairlog` / `picture` / `product`）。

### 4.1 マスタデータ取得

診断項目・機器分類・エネルギー種別などのマスタデータは、本リポジトリには実体を持たず、姉妹リポジトリが公開するAPIから都度取得する。

```
API_BASE = "https://hinodeyasuzuki.github.io/homeenergycodes-public/api/v1"
  - input.json       # 診断項目定義
  - equip.json        # 機器分類定義
  - energy.json         # 光熱データ種別定義
  - energycost.json      # 光熱コスト種別定義
  - cons.json             # 診断項目の分類ツリー定義
```

### 4.2 タブ構成

`index.html` / `app.js` で以下のタブを定義。「部屋」タブは `data.showRoom` フラグで表示/非表示を切替。

| タブID | ラベル | コンポーネント |
|---|---|---|
| top | トップ | `tabs/top.js` |
| room | 部屋 | `tabs/room.js`（`showRoom` がtrueの場合のみ表示） |
| products | 機器 | `tabs/products.js` |
| repairlog | 修理履歴 | `tabs/repairlog.js` |
| picture | 写真 | `tabs/picture.js` |
| energy | 光熱 | `tabs/energy.js` |
| input | 診断項目 | `tabs/input.js` |
| setting | 使い方 | `tabs/setting.js` |

## 5. データモデル（保存データスキーマ）

RDBは存在せず、単一のJSONオブジェクトが `localStorage["homeenergycodes.savedInput"]` に保存される。これがスキーマの実体となる（`app.js` の `emptyData()`）。

```jsonc
{
  "input": {},        // 診断項目 { itemId: 値 }
  "inputCounts": {},  // 配列項目（複数件入力可能な項目）の件数
  "room": {},          // { roomId: { name, area, connected_room_ids: [] } }
  "products": {},       // { productId: {...} }（詳細は5.1）
  "energy": {},           // { "YYYY-MM": { code: 値 } }
  "energycost": {},        // { "YYYY-MM": { costCode: 値 } }
  "repairlog": {},          // { logId: {...} }（詳細は5.2）
  "picture": {},             // { picId: { memo, created_at, sourceUrl } }（画像本体はIndexedDB）
  "showRoom": false
}
```

ID採番は接頭辞+連番方式（`lib/id.js` の `nextId()`）で、`room` は `r001`、`products` は `e001`、`repairlog` は `l001`、`picture` は `p001` のように種別ごとに独立した連番を持つ。

### 5.1 機器（products）

```jsonc
{
  "name": "",             // 機器名
  "equip_id": "",           // 機器分類コード（equip.jsonの分類ツリー参照）
  "purchaseyear": null,       // 購入年
  "purchasemonth": null,        // 購入月（1-12、-1は月不明、0は概月扱い）
  "method": null,                 // 入手方法コード（1-6: 新品購入〜手作り、equip.json側で定義）
  "manufactureyear": null,          // 製造年
  "maker": "",                        // メーカー
  "modelnumber": "",                    // 型番
  "seller": "",                           // 購入店
  "room_id": "",                            // 設置部屋（roomへの参照）
  "watt": null,                               // 消費電力
  "usagetime": null,                            // 使用時間
  "frequency": "",                                // 使用頻度
  "enduseyear": null,                               // 使用終了年（廃棄等）
  "favorite": false,                                  // お気に入り
  "repairlog_ids": [],                                  // 紐づく修理履歴ID（多対1: repairlog.product_id）
  "picture_ids": [],                                      // 紐づく写真ID
  "memory": ""                                              // メモ
}
```

機器分類は3階層ツリー（`lib/equipTree.js`、`equip.json` マスタに基づく `level1Options` / `level2Options` / `level3Options`）。

### 5.2 修理履歴（repairlog）

```jsonc
{
  "year": null, "month": null, "day": null,  // 修理日
  "product_id": "",                            // 対象機器（productsへの参照）
  "about": "",                                   // 修理概要
  "picture_ids": [],                               // 紐づく写真ID
  "repairer": "",                                    // 修理業者（任意）
  "cost": null,                                        // 費用（任意）
  "created_at": ""                                       // 作成日時
}
```

- **設計変更の経緯**: 従来 `equip_id` という名称だったフィールドは `product_id` にリネームされている。全ユーザーの移行は完了しており、移行用に使われていた単発ツール `migrate-repairlog-product-id.html` は削除済み。
- 追加フロー: 修理履歴の新規追加時、対象機器を「新規機器」（同時に `products` レコードも作成）と「登録済み機器から選択」のどちらかで選べる（`addLogStep`: `choose` → `new` / `existing`、`tabs/repairlog.js`）。
- 編集開始時に `pendingSnapshot` としてスナップショットを取り、未保存のまま画面遷移した場合は破棄できる楽観的編集パターンを採用。

### 5.3 写真（picture）

- メタデータ（`memo`, `created_at`, `sourceUrl`）は `data.picture` に保存。
- 画像本体（バイナリ）は `IndexedDB`（DB名 `homeenergycodes-pictures`、ストア `pictures`）に分離保存し、`localStorage` の容量制限を回避。
- 旧形式（`picture[id].picdata` に画像データURLを直接格納）からの後方互換マイグレーションあり（`lib/pictureData.js`, `lib/pictureStore.js`）。
- Google Photos Picker API 経由での取り込みに対応（`lib/googlePhotosPicker.js`）。

### 5.4 部屋（room）

```jsonc
{
  "name": "",                   // 部屋名
  "area": null,                   // 広さ（畳）
  "connected_room_ids": []          // 行き来できる部屋（自己参照・双方向リンク）
}
```

`lib/roomLinks.js` の `setRoomConnections` により、部屋間の行き来関係を双方向で同期する。

### 5.5 光熱（energy / energycost）

`"YYYY-MM"` をキーとした月次データ。マスタ `energy.json` / `energycost.json` の定義に基づき行構成される（`lib/energyRows.js`）。`energy/` ディレクトリ配下の別ページでD3系グラフとして可視化。

### 5.6 診断項目（input）

外部マスタ `input.json` / `cons.json` の分類ツリーに基づきタブ分け・配列項目（同種項目の複数件入力）に対応。

### 5.7 保存データの正式仕様書

本アプリの保存データ(JSON)の正式な定義・スキーマは、姉妹サイトで公開されている（本リポジトリには実体を持たない）。

- 人間向け定義: https://hinodeyasuzuki.github.io/homeenergycodes-public/input/saved-input-format.md
- 機械可読スキーマ(JSON Schema): https://hinodeyasuzuki.github.io/homeenergycodes-public/input/saved-input.schema.json

本章の内容はコード読解およびこれらの公開ドキュメントの内容と整合させている。

### 5.8 エンティティ関連図

```
room 1 ──< products (room_id)
products 1 ──< repairlog (product_id)
products >── picture (picture_ids, 多対多的な共有)
repairlog >── picture (picture_ids, 多対多的な共有)
room ── room (connected_room_ids, 自己参照・双方向)
```

## 6. 認証・認可

**なし。** サーバーが存在せず、全データが端末のブラウザ内（localStorage / IndexedDB）に閉じているため、ログイン機構は実装されていない（`tabs/setting.js` に「入力情報は端末内で管理を行い、インターネット上のサーバーには保存されません」と明記）。単一ユーザー・ローカル完結型アプリとして設計されている。

## 7. 外部連携

| 連携先 | 用途 |
|---|---|
| `hinodeyasuzuki.github.io/homeenergycodes-public/api/v1/*.json` | 診断項目・機器分類・光熱種別等のマスタデータ取得（`fetch`） |
| Google Photos Picker API | 写真の取り込み（OAuthクライアントIDは `lib/googlePhotosConfig.js` の `GOOGLE_PHOTOS_CLIENT_ID` に個別設定が必要） |
| Third Handers（`thirdhanders.hinodeya-ecolife.com`） | 機器・修理履歴情報をクリップボード経由でコピーし、別サイトへ手動転記する簡易連携（`tabs/products.js`, `tabs/repairlog.js`） |
| 修理方法サイト（`s8.hinodeya-ecolife.com/repairinfo/`） | 機器分類コードをクエリに使ったディープリンク |
| 省エネ対策情報サイト（`s8.hinodeya-ecolife.com/ecoinfo/`） | 静的リンクのみ |

## 8. バックアップ（エクスポート/インポート）

- **エクスポート**（`app.js` の `exportJson`）: `data`（localStorage本体）に加え、IndexedDB内の画像データを `pictureBlobs` として同梱し、`saved-input-YYYYMMDD.json` という単一ファイルでダウンロードする。
- **インポート**（`app.js` の `importJson`）: 選択したJSONファイルで現在のデータを完全に上書き（確認ダイアログあり）。`pictureBlobs` をIndexedDBへ復元し、`pictureBlobs` を持たない旧形式ファイルの場合は `picture[id].picdata` からの後方互換マイグレーションを行う。
- マルチデバイス間の同期機構はなく、このJSONエクスポート/インポートによる手動バックアップ・移行が唯一の手段。

## 9. サブシステム: `d6/`（省エネ診断結果の可視化ツール）

本体（Vue 3構成）とは技術スタックが異なる、jQuery / D3.js / dimple.js ベースの旧来型構成。ビルド済みminファイル（`d6/dist/*.min.js`）を含み、`d6/index.html` を入口とする独立したダッシュボードとして分離されている。

## 10. デプロイ

- CI/CD設定・Dockerfileともに存在せず、GitHub Pagesがリポジトリの内容をそのまま静的配信している。
- ローカル動作確認は任意の静的HTTPサーバー（例: `python3 -m http.server 8000`）で行う。

## 11. 既知の課題・注意事項


1. `d6/` サブシステムは本体と技術スタックが異なるため、保守方針を分けて考える必要がある。
2. `homeenergycodes-public` 側は `measures.json` / `applianceCategory.json` / `meta.json` 等、本アプリ（`app.js`）が現状取得していないマスタエンドポイントも公開している。将来的な機能拡張（省エネ対策提示や機器カテゴリ表示の刷新等）で利用余地がある。
