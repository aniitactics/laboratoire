function getAniimosOld() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("CB3 Patchnote");

  const values = sheet.getDataRange().getValues();
  const aniimos = [];

  const COL = {
    NAME: 0,
    PORTRAIT: 1,
    HP: 2,
    BREAK: 3,
    ATK: 4,
    MDEF: 5,
    PDEF: 6,
    REGEN: 7,
    BST: 8,
    TALENT1: 10,
    TALENT2: 11,
    NEW_TRAIT: 12,
    ROLE: 13,
    NEW_SPELL: 14,
    TYPE: 15,
    MODIFIED_SPELL: 16,
    MODIFIED_ULT: 17,
    ROLE_SWAP: 19,
    TYPE_SWAP: 20,
    NEW_FORM: 21,
    NEW_PRISMANA: 22
  };

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const aniimo = {
      name: row[COL.NAME],
      type: row[COL.TYPE],
      role: row[COL.ROLE],
      portrait: row[COL.PORTRAIT],

      hp: row[COL.HP],
      break: row[COL.BREAK],
      atk: row[COL.ATK],
      mdef: row[COL.MDEF],
      pdef: row[COL.PDEF],
      regen: row[COL.REGEN],
      bst: row[COL.BST],

      talent1: row[COL.TALENT1],
      talent2: row[COL.TALENT2],
      newTrait: row[COL.NEW_TRAIT],
      newSpell: row[COL.NEW_SPELL],
      modifiedSpell: row[COL.MODIFIED_SPELL],
      modifiedUlt: row[COL.MODIFIED_ULT],
      roleSwap: row[COL.ROLE_SWAP],
      typeSwap: row[COL.TYPE_SWAP],
      newForm: row[COL.NEW_FORM],
      newPrismana: row[COL.NEW_PRISMANA]
    };

    if (hasPatch_(aniimo)) {
      aniimos.push(aniimo);
    }
  }

  return aniimos;
}

function hasPatch_(aniimo) {
  return hasChangedStat_(aniimo.hp) ||
    hasChangedStat_(aniimo.break) ||
    hasChangedStat_(aniimo.atk) ||
    hasChangedStat_(aniimo.mdef) ||
    hasChangedStat_(aniimo.pdef) ||
    hasChangedStat_(aniimo.regen) ||
    hasChangedStat_(aniimo.bst) ||
    hasContent_(aniimo.newTrait) ||
    hasContent_(aniimo.newSpell) ||
    hasContent_(aniimo.modifiedSpell) ||
    hasContent_(aniimo.modifiedUlt) ||
    hasContent_(aniimo.roleSwap) ||
    hasContent_(aniimo.typeSwap) ||
    hasContent_(aniimo.newForm) ||
    hasContent_(aniimo.newPrismana);
}

function hasChangedStat_(value) {
  return String(value || "").includes("➡️");
}

function hasContent_(value) {
  const text = String(value || "").trim();

  return text !== "" &&
    text !== "-" &&
    text !== "—" &&
    text.toLowerCase() !== "none";
}
