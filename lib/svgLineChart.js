// energy/index.html と同じ手法(外部ライブラリ不使用の手書きSVG)による、
// 複数系列の折れ線グラフ+凡例のSVG文字列を組み立てる。
export function buildLineChartSvg({ labels, series, width = 700, height = 260, padding = 36, labelEvery = 1 }) {
  const n = labels.length;
  const maxValue = Math.max(1, ...series.flatMap((s) => s.values));
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const x = (i) => (n <= 1 ? padding : padding + (i * innerWidth) / (n - 1));
  const y = (v) => height - padding - (v / maxValue) * innerHeight;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const gy = height - padding - f * innerHeight;
    const value = Math.round(maxValue * f);
    return `<line x1="${padding}" y1="${gy}" x2="${width - padding}" y2="${gy}" stroke="var(--border)" stroke-width="1" />` +
      `<text x="${padding - 6}" y="${gy + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${value}</text>`;
  }).join("");

  const xLabels = labels.map((label, i) => {
    if (i % labelEvery !== 0 && i !== n - 1) return "";
    return `<text x="${x(i)}" y="${height - padding + 14}" text-anchor="middle" font-size="10" fill="var(--muted)">${label}</text>`;
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
