export function toYm(year, month) {
  return String(year) + String(month).padStart(2, "0");
}

export function parseYm(ym) {
  return {
    year: Number(ym.slice(0, 4)),
    month: Number(ym.slice(4, 6)),
  };
}
