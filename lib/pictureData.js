// 保存データの互換性: 既存の data.picture[id] = { picdata, created_at } は
// picdata が自由記述メモとして使われていた。新しいスキーマでは
// picdata は画像データURL（または空文字）、memo が自由記述メモを持つ。
// memo が未定義のレコードのみ後方互換のため補完する。
// sourceUrl(Google Photos等の参照元URL、期限切れの可能性あり)が未定義の
// レコードは空文字で補完する。
// 注意: ここで picdata に実際の画像データURLが残っている場合、それを
// IndexedDBへ移してフィールド自体を削除するのは lib/pictureStore.js の
// migratePictureBlobsFromData() の役目(この関数の後に呼び出すこと)。
export function normalizePictureData(data) {
  for (const pic of Object.values(data.picture)) {
    if (pic.memo === undefined) {
      if (typeof pic.picdata === "string" && pic.picdata.startsWith("data:")) {
        pic.memo = "";
      } else {
        pic.memo = pic.picdata || "";
        pic.picdata = "";
      }
    }
    if (pic.sourceUrl === undefined) {
      pic.sourceUrl = "";
    }
  }
  return data;
}
