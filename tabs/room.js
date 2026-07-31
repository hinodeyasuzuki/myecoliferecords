import { nextId } from "../lib/id.js";
import { setRoomConnections, removeRoomWithLinks } from "../lib/roomLinks.js";

export default {
  props: ["data"],
  // 保存データの互換性の補完は app.js の loadData()/importJson() が
  // normalizeRoomData() を通して行うため、ここでは行わない。
  data() {
    return { modeEdit: false };
  },
  methods: {
    addRoom() {
      const id = nextId(Object.keys(this.data.room), "r");
      this.data.room[id] = { name: "", area: null, connected_room_ids: [] };
    },
    removeRoom(id) {
      removeRoomWithLinks(this.data, id);
    },
    onConnectionsChange(id, event) {
      const values = Array.from(event.target.selectedOptions).map((o) => o.value);
      setRoomConnections(this.data, id, values);
    },
  },
  template: `
    <section id="room-tab">
      <h2>部屋</h2>
      <input type="button" value="部屋を編集する" v-if="!modeEdit" @click="modeEdit = true">
      <p v-if="!modeEdit && !Object.keys(data.room).length" style="color:var(--muted);">※自宅の部屋の呼び名や広さを設定できます。</p>
      <input type="button" value="編集を終了する" v-if="modeEdit" @click="modeEdit = false">
      <p v-if="modeEdit" style="color:var(--muted);">※部屋は、居室だけでなく、廊下や階段なども記載してください。呼び方は自由です。<br/>
      ※行き来できる部屋は、CtrlキーやShiftキーを押しながら複数選択・選択解除できます。
      </p>
      <table v-if="!modeEdit" style="margin-top:12px; border-collapse:collapse; width:100%;">
        <thead><tr><th>ID</th><th>呼び名</th><th>広さ(畳)</th><th>行き来できる部屋</th></tr></thead>
        <tbody>
          <tr v-for="(room, id) in data.room" :key="id">
            <td>{{ id }}</td>
            <td>{{ room.name }}</td>
            <td>{{ room.area }}</td>
            <td>
              <template v-for="(other, oid) in data.room" :key="oid">
                <span v-if="oid !== id && room.connected_room_ids.includes(oid)">{{ other.name }}　</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <table v-if="modeEdit" style="margin-top:12px; border-collapse:collapse; width:100%;">
        <thead><tr><th>ID</th><th>呼び名</th><th>広さ(畳)</th><th>行き来できる部屋</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(room, id) in data.room" :key="id">
            <td>{{ id }}</td>
            <td><input type="text" v-model="room.name"></td>
            <td><input type="number" v-model.number="room.area"></td>
            <td>
              <select multiple @change="onConnectionsChange(id, $event)">
                <template v-for="(other, oid) in data.room" :key="oid">
                  <option v-if="oid !== id" :value="oid" :selected="room.connected_room_ids.includes(oid)">{{ oid }} ({{ other.name }})</option>
                </template>
              </select>
            </td>
            <td><button @click="removeRoom(id)">削除</button></td>
          </tr>
        </tbody>
      </table>
      <button v-if="modeEdit" @click="addRoom">＋部屋を追加</button>
    </section>
  `,
};
