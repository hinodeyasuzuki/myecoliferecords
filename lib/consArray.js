const ARRAY_CONS = new Set([
  "consHWtoilet",
  "consACheat",
  "consACcool",
  "consLI",
  "consTV",
  "consRF",
  "consCR",
  "consCRtrip",
]);

export function isArrayCons(consCode) {
  return ARRAY_CONS.has(consCode);
}

// 配列項目(isArrayCons)の入力欄数を共有する単位を返す。
// cons.jsonのcountgroupが同じi-code同士(例: consACheat/consACcool → RM)は
// 同じ数だけ入力欄を持つ。countgroupが無いもの(例: consHWtoilet)は自分自身がグループになる。
export function inputCountGroup(consById, consCode) {
  const node = consById[consCode];
  return (node && node.countgroup) || consCode;
}
