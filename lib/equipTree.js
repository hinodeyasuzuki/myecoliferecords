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

export function myRecordToThirdHandersEquip(equipsById) {
  if ( equipsById < 30 ) return 4;
  if ( equipsById < 50 ) return 5;
  if ( equipsById < 90 ) return 6;
  if ( equipsById < 100 ) return 4;
  if ( equipsById < 130 ) return 1;
  if ( equipsById < 150 ) return 16;
  if ( equipsById < 180 ) return 18;
  if ( equipsById < 190 ) return 1;
  if ( equipsById < 210 ) return 18;
  if ( equipsById < 240 ) return 1;
  if ( equipsById < 270 ) return 2;
  if ( equipsById < 280 ) return 18;
  if ( equipsById < 300 ) return 2;
  if ( equipsById < 330 ) return 3;
  if ( equipsById < 360 ) return 18;
  if ( equipsById < 370 ) return 21;
  if ( equipsById < 400 ) return 18;
  if ( equipsById < 450 ) return 1;
  if ( equipsById < 480 ) return 19;
  if ( equipsById < 600 ) return 23;
  if ( equipsById < 700 ) return 20;
  if ( equipsById < 750 ) return 12;
  if ( equipsById < 800 ) return 14;
  if ( equipsById < 860 ) return 7;
  if ( equipsById < 870 ) return 8;
  if ( equipsById < 900 ) return 10;
  return 33;
}