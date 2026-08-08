function removeFromArray(array, id) {
  const i = array.indexOf(id);
  if (i !== -1) array.splice(i, 1);
}

export function removeRepairlog(data, id) {
  delete data.repairlog[id];
  for (const product of Object.values(data.products)) {
    removeFromArray(product.repairlog_ids, id);
  }
}

export function setRepairlogEquip(data, logId, newProductKey) {
  const log = data.repairlog[logId];
  const oldProductKey = log.product_id;
  if (oldProductKey === newProductKey) return;

  const oldProduct = data.products[oldProductKey];
  if (oldProduct) removeFromArray(oldProduct.repairlog_ids, logId);

  log.product_id = newProductKey;

  const newProduct = data.products[newProductKey];
  if (newProduct && !newProduct.repairlog_ids.includes(logId)) {
    newProduct.repairlog_ids.push(logId);
  }
}

export function removePicture(data, id) {
  delete data.picture[id];
  for (const product of Object.values(data.products)) {
    removeFromArray(product.picture_ids, id);
  }
  for (const log of Object.values(data.repairlog)) {
    removeFromArray(log.picture_ids, id);
  }
}
