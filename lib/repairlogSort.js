export function productNameFor(products, equipId) {
  const product = products[equipId];
  return product ? product.name : "";
}

export function dateSortValue(log) {
  if (log.year === null || log.year === undefined) return null;
  return log.year * 10000 + (log.month || 0) * 100 + (log.day || 0);
}

export function dateLabel(log) {
  return [log.year, log.month, log.day].filter((v) => v !== null && v !== undefined).join("/");
}

function compareValues(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const COMPARATORS = {
  date: (logA, logB) => compareValues(dateSortValue(logA), dateSortValue(logB)),
  productName: (logA, logB, products) =>
    productNameFor(products, logA.equip_id).localeCompare(productNameFor(products, logB.equip_id)),
};

const NULLABLE_FIELDS = ["date"];

export function sortRepairlogEntries(entries, sortKey, sortDir, products) {
  const copy = [...entries];
  if (!sortKey) return copy;
  const comparator = COMPARATORS[sortKey];
  const dirMultiplier = sortDir === "desc" ? -1 : 1;
  const isNullable = NULLABLE_FIELDS.includes(sortKey);

  copy.sort(([, logA], [, logB]) => {
    if (isNullable) {
      const aNull = dateSortValue(logA) === null;
      const bNull = dateSortValue(logB) === null;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
    }
    return dirMultiplier * comparator(logA, logB, products);
  });
  return copy;
}
