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

export function setRepairlogEquip(data, logId, newEquipId) {
  const log = data.repairlog[logId];
  const oldEquipId = log.equip_id;
  if (oldEquipId === newEquipId) return;

  const oldProduct = data.products[oldEquipId];
  if (oldProduct) removeFromArray(oldProduct.repairlog_ids, logId);

  log.equip_id = newEquipId;

  const newProduct = data.products[newEquipId];
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
