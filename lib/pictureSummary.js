export function pictureSummary(pictureMap, pid) {
  const pic = pictureMap[pid];
  if (!pic) return pid + " (削除済み)";
  const memo = pic.memo || "(メモ未入力)";
  return memo;
}
