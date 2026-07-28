export function buildConsById(consList) {
  const map = {};
  for (const c of consList) {
    map[c.code] = c;
  }
  return map;
}

export function topLevelCons(consList) {
  return consList.filter((c) => c.sumclass === "consTotal");
}

// 与えられたconsコードから、sumclassの連鎖をたどって
// sumclassが"consTotal"になるノード(=タブとして分割する上位分類)のcodeを返す。
// codeが"consTotal"自身の場合はそのまま"consTotal"を返す(全体タブ)。
// 連鎖の途中でconsByIdに存在しないコードに当たった場合はnullを返す(呼び出し側でフォールバック)。
export function resolveTopCons(consById, code) {
  if (code === "consTotal") return "consTotal";
  let node = consById[code];
  const seen = new Set();
  while (node && node.sumclass !== "consTotal") {
    if (seen.has(node.code)) return null;
    seen.add(node.code);
    node = consById[node.sumclass];
  }
  return node ? node.code : null;
}
