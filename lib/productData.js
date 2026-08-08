// 保存データの互換性: 既存の data.products[id] に使用終了年(enduseyear)と
// 愛用品フラグ(favorite)が無い場合のみ後方互換のため補完する
export function normalizeProductData(data) {
  for (const product of Object.values(data.products)) {
    if (product.enduseyear === undefined) {
      product.enduseyear = null;
    }
    if (product.favorite === undefined) {
      product.favorite = false;
    }
  }
  for (const log of Object.values(data.repairlog)) {
    if (log.product_id === undefined && log.equip_id !== undefined) {
      log.product_id = log.equip_id;
      delete log.equip_id;
    }
  }
  return data;
}
