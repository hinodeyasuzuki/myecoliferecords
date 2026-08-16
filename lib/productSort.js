export function modelName(equipsById, equipId) {
  const eq = equipsById[equipId];
  return eq ? eq.title : "";
}

export function methodLabel(methodOptions, method) {
  const opt = methodOptions.find((m) => m.val === method);
  return opt ? opt.label : "";
}

function compareValues(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function methodIndex(methodOptions, method) {
  const idx = methodOptions.findIndex((m) => m.val === method);
  return idx === -1 ? Infinity : idx;
}

const COMPARATORS = {
  name: (itemA, itemB) => (itemA.name || "").localeCompare(itemB.name || ""),
  model: (itemA, itemB, equipsById) =>
    modelName(equipsById, itemA.equip_id).localeCompare(modelName(equipsById, itemB.equip_id)),
  purchaseyear: (itemA, itemB) => compareValues(itemA.purchaseyear, itemB.purchaseyear),
  method: (itemA, itemB, equipsById, methodOptions) =>
    compareValues(methodIndex(methodOptions, itemA.method), methodIndex(methodOptions, itemB.method)),
  repaired: (itemA, itemB, equipsById, methodOptions, hasRepairlog, idA, idB) =>
    compareValues(hasRepairlog(idA), hasRepairlog(idB)),
  favorite: (itemA, itemB) => compareValues(!!itemA.favorite, !!itemB.favorite),
  enduseyear: (itemA, itemB) => compareValues(itemA.enduseyear, itemB.enduseyear),
};

// Fields where null values should always sort to the end, regardless of sort direction
const NULLABLE_FIELDS = ["purchaseyear", "method", "enduseyear"];

export function sortProductEntries(entries, sortKey, sortDir, equipsById, methodOptions, hasRepairlog) {
  const copy = [...entries];
  if (!sortKey) return copy;
  const comparator = COMPARATORS[sortKey];
  const dirMultiplier = sortDir === "desc" ? -1 : 1;
  const isNullable = NULLABLE_FIELDS.includes(sortKey);

  copy.sort(([idA, itemA], [idB, itemB]) => {
    // For nullable fields, handle nulls separately (always at end, regardless of direction)
    if (isNullable) {
      const aNull = itemA[sortKey] === null || itemA[sortKey] === undefined;
      const bNull = itemB[sortKey] === null || itemB[sortKey] === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1;  // nulls always go to the end
      if (bNull) return -1;
    }
    return dirMultiplier * comparator(itemA, itemB, equipsById, methodOptions, hasRepairlog, idA, idB);
  });
  return copy;
}
