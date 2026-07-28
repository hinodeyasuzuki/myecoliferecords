export function buildEnergyRows(energyMaster, costMaster) {
  return energyMaster.map((e) => {
    const expectedCostCode = e.code + "p";
    const hasCost = costMaster.some((c) => c.code === expectedCostCode);
    return {
      code: e.code,
      name: e.name,
      unit: e.unit,
      costCode: hasCost ? expectedCostCode : null,
    };
  });
}
