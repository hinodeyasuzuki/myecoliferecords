# Myエコライフ記録 (My EcoLife Records)

自分のエコライフに関する情報を継続的に蓄積し、後から見返したり診断に活用したりするための、ブラウザ完結型の記録アプリです。

- 部屋構成
- 機器情報
- 光熱の月次データ
- 修理履歴
- 写真
- 診断項目

を1つの画面群で管理できます。

## 公開ページ

このアプリは以下で公開しています。

- https://hinodeyasuzuki.github.io/myecoliferecords/

## 仕様公開ページ

質問項目や分類コードなどの仕様は、以下で公開しています。

- https://hinodeyasuzuki.github.io/homeenergycodes-public/

このアプリは、上記サイトで公開されているマスタデータ（`input.json` / `equip.json` / `energy.json` / `energycost.json` / `cons.json`）を読み込んで動作します。

## 主な機能

- 診断項目入力
  - 仕様サイトの項目定義に沿って入力
  - 配列入力項目（同種項目の複数件入力）に対応
- 部屋管理
  - 部屋名、広さ（畳）、行き来できる部屋の関係を記録
- 機器管理
  - 機器種別、購入情報、使用情報、メモを記録
  - 修理履歴・写真との関連付け
- 光熱データ管理
  - 月次の消費量と金額を記録
- 修理履歴管理
  - 日付、対象機器、概要、関連写真を記録
- 写真管理
  - 端末からの画像登録
  - Google Photos からの取り込み
- バックアップ
  - JSONエクスポート/インポート

## 動作環境

- モダンブラウザ（Chrome / Edge / Firefox / Safari など）
- JavaScript有効
- localStorage / IndexedDB が利用可能

## 使い方

### 1. アプリを起動

このリポジトリはビルド不要の静的構成です。任意のローカルHTTPサーバーで公開して開いてください。

例（Python）:

```bash
cd myecoliferecords
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

### 2. 各タブで入力

- 部屋
- 機器
- 光熱
- 修理履歴
- 写真
- 診断項目
- 設定

の順で必要情報を入力します。

### 3. バックアップ

`設定` タブからエクスポート/インポートを実行できます。

## データ保存の考え方

- 入力データ本体は localStorage に保存
  - キー: `homeenergycodes.savedInput`
- 写真の画像データ本体は IndexedDB に保存
  - DB名: `homeenergycodes-pictures`
  - ストア名: `pictures`

画像をlocalStorageに直接置かないことで、容量制限に達しにくくしています。

JSONエクスポート時には、IndexedDB内の画像データを `pictureBlobs` として同梱するため、単一ファイルでバックアップ/復元できます。

保存形式の詳細は以下を参照してください。

- `saved-input-format.md`
- `saved-input.schema.json`

## Google Photos連携について

Google Photos から画像を選択する機能を使う場合は、OAuthクライアントIDを設定してください。

- 設定ファイル: `lib/googlePhotosConfig.js`
- 定数: `GOOGLE_PHOTOS_CLIENT_ID`

Google Cloud ConsoleでPhotos Picker APIを有効化したプロジェクトのWebアプリ用クライアントIDを設定します。

## ディレクトリ概要

- `index.html` / `app.js`
  - 画面本体とアプリ初期化
- `tabs/`
  - 各機能タブ（部屋、機器、光熱、修理履歴、写真、診断項目、設定）
- `lib/`
  - データ正規化、並び替え、画像保存、連携ロジックなど
- `saved-input-format.md` / `saved-input.schema.json`
  - 保存データ仕様とスキーマ

## 補足

- このアプリは個人利用・記録継続を重視した設計です。
- 仕様側の更新に応じて、読み込まれるマスタデータ内容が変わる場合があります。

## ライセンス

MIT License

詳細は `LICENSE` を参照してください。
