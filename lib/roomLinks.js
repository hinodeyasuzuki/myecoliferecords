// 保存データの互換性: 既存の data.room[id] = { name } に
// 後方互換性を壊さずフィールドを追加する（不足フィールドのみ補完）
export function normalizeRoomData(data) {
  for (const room of Object.values(data.room)) {
    if (room.area === undefined) {
      room.area = null;
    }
    if (room.connected_room_ids === undefined) {
      room.connected_room_ids = [];
    }
  }
  return data;
}

export function setRoomConnections(data, roomId, newIds) {
  if (!data.room[roomId]) return;
  const room = data.room[roomId];
  const oldIds = room.connected_room_ids;
  const added = newIds.filter((id) => !oldIds.includes(id));
  const removed = oldIds.filter((id) => !newIds.includes(id));

  room.connected_room_ids = [...newIds];

  for (const otherId of added) {
    const other = data.room[otherId];
    if (other && !other.connected_room_ids.includes(roomId)) {
      other.connected_room_ids.push(roomId);
    }
  }
  for (const otherId of removed) {
    const other = data.room[otherId];
    if (other) {
      const i = other.connected_room_ids.indexOf(roomId);
      if (i !== -1) other.connected_room_ids.splice(i, 1);
    }
  }
}

export function removeRoomWithLinks(data, roomId) {
  delete data.room[roomId];
  for (const other of Object.values(data.room)) {
    const i = other.connected_room_ids.indexOf(roomId);
    if (i !== -1) other.connected_room_ids.splice(i, 1);
  }
}
