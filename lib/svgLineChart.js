// energy/index.html と同じ手法(外部ライブラリ不使用の手書きSVG)による、
// 複数系列の折れ線グラフ+凡例のSVG文字列を組み立てる。
export function buildLineChartSvg({ labels, series, width = 700, height = 260, padding = 44, labelEvery = 1 }) {
  const n = labels.length;
  const rawMax = Math.max(0, ...series.flatMap((s) => s.values));
  // 縦軸の目盛り間隔は1未満にならないようにする(小数の按分値があっても軸は整数刻み)。
  const desiredTicks = 4;
  const step = Math.max(1, Math.ceil(rawMax / desiredTicks));
  const tickCount = Math.max(1, Math.ceil(rawMax / step));
  const maxValue = step * tickCount;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const x = (i) => (n <= 1 ? padding : padding + (i * innerWidth) / (n - 1));
  const y = (v) => height - padding - (v / maxValue) * innerHeight;

  const gridLines = Array.from({ length: tickCount + 1 }, (_, i) => i * step).map((value) => {
    const gy = y(value);
    return `<line x1="${padding}" y1="${gy}" x2="${width - padding}" y2="${gy}" stroke="var(--border)" stroke-width="1" />` +
      `<text x="${padding - 6}" y="${gy + 4}" text-anchor="end" font-size="14" fill="var(--muted)">${value}</text>`;
  }).join("");

  const xLabels = labels.map((label, i) => {
    if (i % labelEvery !== 0 && i !== n - 1) return "";
    return `<text x="${x(i)}" y="${height - padding + 14}" text-anchor="middle" font-size="14" fill="var(--muted)">${label}</text>`;
  }).join("");

  const paths = series.map((s) => {
    const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" />`;
  }).join("");

  const axis = `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--fg)" stroke-width="1" />`;

  return `<svg viewBox="0 0 ${width} ${height}" class="dashboard-chart" role="img">` +
    gridLines + axis + paths + xLabels +
    `</svg>`;
}
