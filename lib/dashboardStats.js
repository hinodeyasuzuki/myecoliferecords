import { toYm } from "./yearMonth.js";
import { buildEnergyRows } from "./energyRows.js";

// 直近n期間分の期間キーを古い→新しい順で返す。
// mode: "month" は"YYYYMM"文字列、"year" は数値の西暦。
export function lastPeriods(mode, n, baseDate = new Date()) {
  const periods = [];
  if (mode === "year") {
    const currentYear = baseDate.getFullYear();
    for (let i = n - 1; i >= 0; i--) periods.push(currentYear - i);
    return periods;
  }
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    periods.push(toYm(d.getFullYear(), d.getMonth() + 1));
  }
  return periods;
}

// 購入月/修理月が「不明」「頃」「未入力」のいずれかで、特定の月に絞れない状態かどうか。
function isAmbiguousMonth(month) {
  return month === null || month === undefined || month === 0 || month === -1 || Number.isNaN(month);
}

// products(またはrepairlog)を対象年月ごとに集計する。
// getYear/getMonthは各エントリから年・月を取り出す関数、filterはカウント対象を絞る関数(省略可)。
// mode==="month"かつ月があいまいな場合は、その年の periods に含まれる月へ1/12ずつ按分する。
function countByPeriod(entries, mode, periods, getYear, getMonth, filter) {
  const periodSet = new Set(periods);
  const counts = Object.fromEntries(periods.map((p) => [p, 0]));
  for (const entry of entries) {
    if (filter && !filter(entry)) continue;
    const year = getYear(entry);
    if (year === null || year === undefined || year === "") continue;
    if (mode === "year") {
      if (periodSet.has(year)) counts[year] += 1;
      continue;
    }
    const month = getMonth(entry);
    if (isAmbiguousMonth(month)) {
      for (let m = 1; m <= 12; m++) {
        const ym = toYm(year, m);
        if (periodSet.has(ym)) counts[ym] += 1 / 12;
      }
    } else {
      const ym = toYm(year, month);
      if (periodSet.has(ym)) counts[ym] += 1;
    }
  }
  return periods.map((p) => counts[p]);
}

// 中古(method 3/4)・手作り(method 6)・修理(repairlog)の期間ごとの新規発生件数。
export function buildDashboardSeries(products, repairlog, mode, periods) {
  const productEntries = Object.values(products);
  const used = countByPeriod(
    productEntries,
    mode,
    periods,
    (p) => p.purchaseyear,
    (p) => p.purchasemonth,
    (p) => p.method === 3 || p.method === 4
  );
  const handmade = countByPeriod(
    productEntries,
    mode,
    periods,
    (p) => p.purchaseyear,
    (p) => p.purchasemonth,
    (p) => p.method === 6
  );
  const repaired = countByPeriod(
    Object.values(repairlog),
    mode,
    periods,
    (l) => l.year,
    (l) => l.month
  );
  return { used, handmade, repaired };
}

function isFilledValue(v) {
  return typeof v === "number" && !Number.isNaN(v);
}

// 直近12ヶ月分の光熱記入状況。energyRows(消費量+対応する金額)を分母に、
// 全部入力済みなら"full"、一部のみなら"partial"、未入力なら"none"を返す。
export function energyCompletionStatuses(months, masterEnergy, masterEnergyCost, dataEnergy, dataEnergyCost) {
  const rows = buildEnergyRows(masterEnergy, masterEnergyCost);
  return months.map((ym) => {
    const energyValues = dataEnergy[ym] || {};
    const costValues = dataEnergyCost[ym] || {};
    let total = 0;
    let filled = 0;
    for (const row of rows) {
      total += 1;
      if (isFilledValue(energyValues[row.code])) filled += 1;
      if (row.costCode) {
        total += 1;
        if (isFilledValue(costValues[row.costCode])) filled += 1;
      }
    }
    let status = "none";
    if (filled > 0) status = filled === total ? "full" : "partial";
    return { ym, status };
  });
}
