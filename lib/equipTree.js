export function buildEquipsById(equips) {
  const map = {};
  for (const eq of equips) map[eq.id] = eq;
  return map;
}

export function level1Options(equips) {
  return equips.filter((eq) => eq.level === 1);
}

export function level2Options(equips, level1Id) {
  if (!level1Id) return [];
  return equips.filter((eq) => eq.level === 2 && eq.level1Id === level1Id);
}

export function level3Options(equips, level2Id) {
  if (!level2Id) return [];
  return equips.filter((eq) => eq.level === 3 && eq.level2Id === level2Id);
}

export function resolveEquipSelection(equipsById, equipId) {
  const eq = equipsById[equipId];
  if (!eq) return { level1Id: "", level2Id: "", level3Id: "" };
  if (eq.level === 1) return { level1Id: eq.id, level2Id: "", level3Id: "" };
  if (eq.level === 2) return { level1Id: eq.level1Id, level2Id: eq.id, level3Id: "" };
  return { level1Id: eq.level1Id, level2Id: eq.level2Id, level3Id: eq.id };
}
