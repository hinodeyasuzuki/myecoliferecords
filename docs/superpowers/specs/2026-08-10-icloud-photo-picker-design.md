# iCloud(写真ライブラリ)からの写真取り込み対応 設計

## 背景

`tabs/picture.js` では現在、機器/修理履歴の写真登録手段として以下の2つを提供している。

- 端末のカメラで撮影(`<input type="file" accept="image/*" capture="environment">`)
- Google Photosから選択(`lib/googlePhotosPicker.js` 経由。OAuth + Photos Picker APIでブラウザから直接取得)

このGoogle Photos連携と並べて、iCloud上の写真も取り込めるようにしたい、という要望が出発点。

## 制約

Appleはブラウザから直接iCloud Photosにアクセスするための公式API(GoogleのPhotos Picker APIに相当するもの)を提供していない。iCloud共有アルバムの非公式ストリームAPIなどは存在するが、認証不要・特定アルバム限定という制約が強く、今回はスコープ外とする。

ユーザーとの合意により、**OS標準の写真ライブラリピッカー経由での取り込み**で代替する方針とした。iOS/iPadOSのSafariでは、`capture`属性を付けない`<input type="file" accept="image/*">`を起動すると、カメラだけでなく「写真」アプリ(iCloud同期済みの写真ライブラリを含む)からの選択肢が提示される。これを「iCloudから選択」相当の導線として使う。

## 変更内容

対象ファイルは `tabs/picture.js` のみ。

### UI

編集画面の写真取得ボタンを3種類に整理する。

1. **カメラで撮影** — 既存の `capture="environment"` 付きinput。ラベルを明示するテキストを追加。
2. **アルバムから選択(iCloudなど)** — 新規。`capture`属性なしの`<input type="file" accept="image/*">`を非表示で用意し、`ref`経由で`click()`することで起動するボタンを追加。
3. **Google Photosから選択** — 既存のまま変更なし。

### 処理

新設するライブラリ選択用inputも、既存の`onFileSelected(id, event)`メソッドをそのまま再利用する(`compressImageFile` → `putPictureBlob` → `setPictureBlobCache`の流れは共通)。`sourceUrl`はGoogle Photos取得時のみ設定する既存ロジックは変更しない。

### 注記文言

Google Photosの取込元リンクの注記の近くに、iCloud等のアルバム取り込みは「OS標準ピッカー経由の一度きりの取り込みであり、後から参照し続けるURL連携ではない」旨を一言添える。

## 対象外

- iCloud共有アルバムの直接連携(非公式APIの利用)
- iCloud向けのOAuth/専用認証フロー(存在しないため)

## テスト

自動テストの仕組みがないプロジェクトのため、ブラウザでの手動確認のみ:

- カメラボタン: 従来通り撮影フローが動くこと
- ライブラリボタン: ファイル選択ダイアログが(capture属性なしで)開き、選択した画像が保存されること
- Google Photosボタン: 従来通り動作すること(変更なし)
