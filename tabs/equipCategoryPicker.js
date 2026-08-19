import {
  buildEquipsById,
  level1Options as equipLevel1Options,
  level2Options as equipLevel2Options,
  level3Options as equipLevel3Options,
  resolveEquipSelection,
  getEquipIcon,
} from "../lib/equipTree.js";

export default {
  props: ["equips", "products", "modelValue"],
  emits: ["update:modelValue", "select"],
  data() {
    return {
      equipShow: false,
      openLevel1Id: "",
    };
  },
  created() {
    this.openLevel1Id = this.selection.level1Id;
  },
  watch: {
    modelValue() {
      // Auto-collapse only when the selection changed out from under us
      // (e.g. a caller set the category directly, bypassing our own
      // select* methods, which already keep openLevel1Id in sync).
      if (this.selection.level1Id !== this.openLevel1Id) {
        this.equipShow = false;
        this.openLevel1Id = this.selection.level1Id;
      }
    },
  },
  computed: {
    equipsById() {
      return buildEquipsById(this.equips);
    },
    level1Options() {
      return equipLevel1Options(this.equips);
    },
    selection() {
      return resolveEquipSelection(this.equipsById, this.modelValue);
    },
  },
  methods: {
    level2Options(level1Id) {
      return equipLevel2Options(this.equips, level1Id);
    },
    level3Options(level2Id) {
      return equipLevel3Options(this.equips, level2Id);
    },
    getEquipIcon(id) {
      return getEquipIcon(id);
    },
    getEquipTitle(id) {
      return this.equipsById[id]?.title || "";
    },
    existEquipInProducts(equipId) {
      return Object.values(this.products).some((item) => {
        const itemSelection = resolveEquipSelection(this.equipsById, item.equip_id);
        return (
          item.equip_id === equipId ||
          itemSelection.level1Id === equipId ||
          itemSelection.level2Id === equipId
        );
      });
    },
    selectAll() {
      this.openLevel1Id = "";
      this.equipShow = false;
      this.$emit("update:modelValue", "");
      this.$emit("select");
    },
    selectLevel1(id) {
      if (id === this.openLevel1Id) {
        this.equipShow = !this.equipShow;
      } else {
        this.openLevel1Id = id;
        this.equipShow = true;
      }
      this.$emit("update:modelValue", id);
      this.$emit("select");
    },
    selectLeaf(id) {
      this.equipShow = false;
      this.$emit("update:modelValue", id);
      this.$emit("select");
    },
  },
  template: `
    <div class="category">
      <button @click="selectAll">📋 すべて</button>
      <button v-for="eq1 in level1Options" :key="eq1.id" @click="selectLevel1(eq1.id)" :class="{highlighted: selection.level1Id == eq1.id}">
        {{ getEquipIcon(eq1.id) }} {{ eq1.title }}
      </button>
    </div>
    <transition name="equip-expand">
      <div v-if="openLevel1Id && equipShow">
        <table class="equip-table">
          <thead>
            <tr><th>中分類</th><th>小分類</th></tr>
          </thead>
          <tbody>
            <tr v-for="eq2 in level2Options(openLevel1Id)" :key="eq2.id">
              <td><input type="button" :value="eq2.title" @click="selectLeaf(eq2.id)"></td>
              <td>
                <template v-for="eq3 in level3Options(eq2.id)" :key="eq3.id">
                  <input type="button" :value="eq3.title" :class="{highlighted: existEquipInProducts(eq3.id)}" @click="selectLeaf(eq3.id)">
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </transition>

    <p v-if="modelValue && ( modelValue % 10) !=0 " class="selected-category">
      選択中の分類:  <img :src="'./icons/' + modelValue + '.svg'" alt="" class="ms-1" style="width: 3em; height: 3em;position:relative;top:1em;">
      {{ getEquipTitle(modelValue) }}
    </p>

  `,
};
