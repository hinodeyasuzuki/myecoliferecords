export function nextId(existingKeys, prefix) {
  let max = 0;
  for (const key of existingKeys) {
    if (!key.startsWith(prefix)) continue;
    const n = parseInt(key.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return prefix + String(max + 1).padStart(3, "0");
}
