function doGet(e) {
  if (e && e.parameter && e.parameter.api === "aniimos") {
    const data = getAniimos();
    const json = JSON.stringify(data);

    if (e.parameter.callback) {
      return ContentService
        .createTextOutput(e.parameter.callback + "(" + json + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }

  const template = HtmlService.createTemplateFromFile("index");

  return template
    .evaluate()
    .setTitle("[FANMADE] Aniimo Patch Note - Beta 3");
}

function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}

const OLD_VERSION = "cb2";
const NEW_VERSION = "cb3";

function getAniimos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const aniimos = readSheetAsObjects_(ss, "ANIIMOS");
  const spells = readSheetAsObjects_(ss, "SPELLS");
  const traits = readSheetAsObjects_(ss, "TRAITS");
  const ultimates = readSheetAsObjects_(ss, "ULTIMATES");
  const forms = readSheetAsObjects_(ss, "FORMS");
  const prismanas = readSheetAsObjects_(ss, "PRISMANAS");

  const spellsIndex = indexByVersionAndId_(spells, "spell_id");
  const traitsIndex = indexByVersionAndId_(traits, "trait_id");
  const ultimatesIndex = indexByVersionAndId_(ultimates, "ultimate_id");

  const oldAniimos = aniimos.filter(a => clean_(a.version_id) === OLD_VERSION);
  const newAniimos = aniimos.filter(a => clean_(a.version_id) === NEW_VERSION);

  return newAniimos
  .map(current => {
      const previous = oldAniimos.find(old =>
        clean_(old.aniimo_id) === clean_(current.aniimo_id)
      );

      return {
        id: current.aniimo_id,
        name: current.name,
        portrait: current.portrait,
        type: current.type,
        role: current.role,

        old: previous ? buildAniimoVersion_(previous, spellsIndex, traitsIndex, ultimatesIndex, forms, prismanas) : null,
        current: buildAniimoVersion_(current, spellsIndex, traitsIndex, ultimatesIndex, forms, prismanas)
      };
    });
}

function hasAniimoChanged_(oldAniimo, newAniimo, forms, prismanas) {
  if (!oldAniimo) return true;

  const columnsToCompare = [
    "name",
    "type",
    "role",
    "hp",
    "break",
    "atk",
    "mdef",
    "pdef",
    "regen",
    "trait1_id",
    "trait2_id",
    "trait3_id",
    "spell1_id",
    "spell2_id",
    "spell3_id",
    "spell4_id",
    "spell5_id",
    "spell6_id",
    "ultimate_id"
  ];

  for (const column of columnsToCompare) {
  const oldValue = clean_(oldAniimo[column]);
  const newValue = clean_(newAniimo[column]);

  if (oldValue !== newValue) {
    return true;
  }
}

  const oldForms = forms
    .filter(f =>
      clean_(f.version_id) === OLD_VERSION &&
      clean_(f.aniimo_id) === clean_(newAniimo.aniimo_id)
    )
    .map(f => clean_(f.form_id))
    .sort()
    .join("|");

  const newForms = forms
    .filter(f =>
      clean_(f.version_id) === NEW_VERSION &&
      clean_(f.aniimo_id) === clean_(newAniimo.aniimo_id)
    )
    .map(f => clean_(f.form_id))
    .sort()
    .join("|");

  if (oldForms !== newForms) return true;

  const oldPrismanas = prismanas
    .filter(p =>
      clean_(p.version_id) === OLD_VERSION &&
      clean_(p.aniimo_id) === clean_(newAniimo.aniimo_id)
    )
    .map(p => clean_(p.prismana_id))
    .sort()
    .join("|");

  const newPrismanas = prismanas
    .filter(p =>
      clean_(p.version_id) === NEW_VERSION &&
      clean_(p.aniimo_id) === clean_(newAniimo.aniimo_id)
    )
    .map(p => clean_(p.prismana_id))
    .sort()
    .join("|");

  if (oldPrismanas !== newPrismanas) return true;

  return false;
}

function buildAniimoVersion_(a, spellsIndex, traitsIndex, ultimatesIndex, forms, prismanas) {
  return {
    version_id: a.version_id,
    aniimo_id: a.aniimo_id,
    name: a.name,
    portrait: a.portrait,
    type: a.type,
    role: a.role,

    hp: a.hp,
    break: a.break,
    atk: a.atk,
    mdef: a.mdef,
    pdef: a.pdef,
    regen: a.regen,
    bst: calculateBST_(a),

    traits: [
      getByVersionAndId_(traitsIndex, a.version_id, a.trait1_id),
      getByVersionAndId_(traitsIndex, a.version_id, a.trait2_id),
      getByVersionAndId_(traitsIndex, a.version_id, a.trait3_id)
    ].filter(Boolean),

    spells: [
      getByVersionAndId_(spellsIndex, a.version_id, a.spell1_id),
      getByVersionAndId_(spellsIndex, a.version_id, a.spell2_id),
      getByVersionAndId_(spellsIndex, a.version_id, a.spell3_id),
      getByVersionAndId_(spellsIndex, a.version_id, a.spell4_id),
      getByVersionAndId_(spellsIndex, a.version_id, a.spell5_id),
      getByVersionAndId_(spellsIndex, a.version_id, a.spell6_id)
    ].filter(Boolean),

    ultimate: getByVersionAndId_(ultimatesIndex, a.version_id, a.ultimate_id),

    forms: forms
  .filter(f =>
    clean_(f.version_id) === clean_(a.version_id) &&
    clean_(f.aniimo_id) === clean_(a.aniimo_id)
  )
  .map(f => buildFormVersion_(f, a, spellsIndex)),

prismanas: prismanas
  .filter(p =>
    clean_(p.version_id) === clean_(a.version_id) &&
    clean_(p.aniimo_id) === clean_(a.aniimo_id)
  )
  .map(p => buildPrismanaVersion_(p, a, spellsIndex))

  };
}

function buildPrismanaVersion_(prismana, baseAniimoVersion, spellsIndex) {
  return {
    ...baseAniimoVersion,

    prismana_id: prismana.prismana_id,
    name: prismana.name || baseAniimoVersion.name,
    portrait: prismana.portrait || baseAniimoVersion.portrait,
    type: prismana.type || baseAniimoVersion.type,
    role: prismana.role || baseAniimoVersion.role,

    spells: [
      getByVersionAndId_(spellsIndex, prismana.version_id, prismana.spell1_id),
      getByVersionAndId_(spellsIndex, prismana.version_id, prismana.spell2_id),
      getByVersionAndId_(spellsIndex, prismana.version_id, prismana.spell3_id),
      getByVersionAndId_(spellsIndex, prismana.version_id, prismana.spell4_id),
      getByVersionAndId_(spellsIndex, prismana.version_id, prismana.spell5_id),
      getByVersionAndId_(spellsIndex, prismana.version_id, prismana.spell6_id)
    ].filter(Boolean)
  };
}

function readSheetAsObjects_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim());

  return values.slice(1)
    .filter(row => row.some(cell => cell !== ""))
.map(row => {
  const obj = {};

  headers.forEach((header, i) => {
    obj[header] = row[i];
  });

obj.upgrade = obj.upgrade || "";
obj.upgrade_fr = obj.upgrade_fr || "";

  if (obj.icon) {
  obj.icon = getDriveImageUrl(obj.icon);
}

if (obj.portrait) {
  obj.portrait = getDriveImageUrl(obj.portrait);
}

  return obj;
});
}

function indexByVersionAndId_(rows, idColumn) {
  const index = {};

  rows.forEach(row => {
    const key = clean_(row.version_id) + "::" + clean_(row[idColumn]);
    index[key] = row;
  });

  return index;
}

function getByVersionAndId_(index, versionId, id) {
  if (!id) return null;
  return index[clean_(versionId) + "::" + clean_(id)] || null;
}

function calculateBST_(a) {
  return (
    Number(a.hp || 0) +
    Number(a.break || 0) +
    Number(a.atk || 0) +
    Number(a.mdef || 0) +
    Number(a.pdef || 0) +
    Number(a.regen || 0)
  );
}

function clean_(value) {
  return String(value || "").trim().toLowerCase();
}

function buildFormVersion_(form, baseAniimoVersion, spellsIndex) {
  return {
    ...baseAniimoVersion,

    form_id: form.form_id,
    name: form.name || baseAniimoVersion.name,
    portrait: form.portrait || baseAniimoVersion.portrait,
    type: form.type || baseAniimoVersion.type,
    role: form.role || baseAniimoVersion.role,

    spells: [
      getByVersionAndId_(spellsIndex, form.version_id, form.spell1_id),
      getByVersionAndId_(spellsIndex, form.version_id, form.spell2_id),
      getByVersionAndId_(spellsIndex, form.version_id, form.spell3_id),
      getByVersionAndId_(spellsIndex, form.version_id, form.spell4_id),
      getByVersionAndId_(spellsIndex, form.version_id, form.spell5_id),
      getByVersionAndId_(spellsIndex, form.version_id, form.spell6_id)
    ].filter(Boolean)
  };
}
function getDriveImageUrl(url) {
  if (!url) return "";

  // Si c'est déjà une URL directe utilisable
  if (url.includes("drive.google.com/thumbnail")) return url;

  const match = url.match(/[-\w]{25,}/);
  if (!match) return url;

  const fileId = match[0];

  return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400";
}
