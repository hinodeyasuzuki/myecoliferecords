import { toYm, parseYm } from "./yearMonth.js";

// energycostのコードと、input.jsのi-code(年平均・季節)の対応。
// ガス代は都市ガス(nagasp)とLPガス(lpgasp)の合計を使う。
export const ENERGY_COST_ITEMS = [
  { annualId: "i061", seasonId: "i091", codes: ["electp"] },
  { annualId: "i063", seasonId: "i093", codes: ["nagasp", "lpgasp"] },
  { annualId: "i064", seasonId: "i094", codes: ["kerosp"] },
  { annualId: "i062", seasonId: "i092", codes: ["selelecp"] },
  { annualId: "i075", seasonId: null, codes: ["gasolp"] },
];

// 12月〜3月=冬(0)、7月〜9月=夏(2)、それ以外=春秋(1)。SEASON_LABELSの並びに対応。
function seasonIndexForMonth(month) {
  if (month === 12 || month <= 3) return 0;
  if (month >= 7 && month <= 9) return 2;
  return 1;
}

// 基準日から直近12ヶ月分(当月含む)のymキー一覧。
export function last12Ym(baseDate = new Date()) {
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    result.push(toYm(d.getFullYear(), d.getMonth() + 1));
  }
  return result;
}

function average(values) {
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

// energycost(ym -> {code: 金額})の直近12ヶ月分から、各項目の年平均と季節平均を計算する。
// データが1件も無い項目は結果に含めない(呼び出し側で上書きしない)。
export function computeEnergyCostDefaults(energycost, months) {
  const results = [];
  for (const item of ENERGY_COST_ITEMS) {
    const seasonValues = [[], [], []];
    const allValues = [];
    for (const ym of months) {
      const monthData = energycost[ym];
      if (!monthData) continue;
      let sum = 0;
      let any = false;
      for (const code of item.codes) {
        const v = monthData[code];
        if (typeof v === "number" && !Number.isNaN(v)) {
          sum += v;
          any = true;
        }
      }
      if (!any) continue;
      allValues.push(sum);
      const { month } = parseYm(ym);
      seasonValues[seasonIndexForMonth(month)].push(sum);
    }
    const entry = { annualId: item.annualId, seasonId: item.seasonId };
    if (allValues.length) entry.annual = average(allValues);
    if (item.seasonId) {
      const season = seasonValues.map((vals) => (vals.length ? average(vals) : undefined));
      if (season.some((v) => v !== undefined)) entry.season = season;
    }
    if (entry.annual !== undefined || entry.season) {
      results.push(entry);
    }
  }
  return results;
}
