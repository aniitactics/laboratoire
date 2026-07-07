let aniimos = [];
let selectedAniimoName = "";
let selectedForm = "base";
let currentView = "patch";
const ANIILOG_TYPES = ["fire", "water", "grass", "earth", "ice", "wind", "lightning", "dark", "light"];
const ANIILOG_ROLES = ["DPS", "break", "regen", "heal", "support"];
const ANIILOG_TAGS = ["bonus", "malus", "heal", "shield", "control", "regen_ep"];

let aniilogFilters = {
    types: [],
    roles: [],
    tags: []
};
let aniilogSort = "";
let currentLang = localStorage.getItem("aniimoLang") || "en";
function t(key){
    return LANG[currentLang]?.[key] || LANG.en[key] || key;
}

function getLocalizedName(item){
    if(!item) return "";

    if(currentLang === "fr"){
        return item.name_fr || item.name || "";
    }

    return item.name || "";
}

function getLocalizedDescription(item){
    if(!item) return "";

    if(currentLang === "fr"){
        return item.effect_key_fr || item.effect_key || "";
    }

    return item.effect_key || "";
}

function entityLabel(key, count){
    const singularKey = key + "Singular";

    if(count === 1 && (LANG[currentLang]?.[singularKey] || LANG.en[singularKey])){
        return t(singularKey);
    }

    return t(key);
}
const ENTITY_COMPARE_FIELDS = [
    "name",
    "type",
    "cost",
    "energy_points",
    "power",
    "spectre",
    "duration",
    "bonus",
    "malus",
    "heal",
    "shield",
    "control",
    "regen_ep"
];
const FIELD_BEHAVIOR = {
    power: "higher",
    heal: "higher",
    shield: "higher",
    bonus: "higher",

    cost: "lower",
    energy_points: "lower",
    cooldown: "lower",

    duration: "neutral",
    malus: "neutral",
    spectre: "neutral",
    type: "neutral",
    name: "neutral"
};

const EFFECT_TAGS = [
    { key:"bonus", label:"bonus", icon:"★" },
    { key:"malus", label:"malus", icon:"◆" },
    { key:"heal", label:"heal", icon:"✚" },
    { key:"shield", label:"shield", icon:"🛡" },
    { key:"control", label:"control", icon:"⛓" },
    { key:"regen_ep", label:"regenEp", icon:"⚡" }
];

function createEffectTags(item){
    if(!item) return "";

    const tags = EFFECT_TAGS
        .filter(tag => cleanDisplay(item[tag.key]) !== "")
        .map(tag => `
            <span class="effectTag effectTag-${tag.key}" title="${t(tag.label)}">
                <span class="effectTagIcon">${tag.icon}</span>
                <span>${t(tag.label)}</span>
            </span>
        `)
        .join("");

    if(!tags) return "";

    return `
        <div class="effectTags">
            ${tags}
        </div>
    `;
}

function loadAniimosJsonp() {
    const callbackName = "receiveAniimosData";

    window[callbackName] = function(data) {
        aniimos = data;

        window.debugAniimoTags = function(name){
            const aniimo = aniimos.find(a =>
                a.name.toLowerCase().includes(name.toLowerCase())
            );

            if(!aniimo){
                console.log("Aniimo introuvable :", name);
                return;
            }

            const version = aniimo.current;

            const allItems = [
                ...(version.traits || []),
                ...(version.spells || []),
                ...(version.ultimate ? [version.ultimate] : [])
            ];

            console.log("ANIIMO :", aniimo.name);
            console.table(allItems.map(item => ({
                name: item.name,
                id: item.spell_id || item.trait_id || item.ultimate_id,
                bonus: item.bonus,
                malus: item.malus,
                heal: item.heal,
                shield: item.shield,
                control: item.control,
                regen_ep: item.regen_ep
            })));
        };

        console.log(aniimos);
        renderSidebar();
        applyLanguage();

        const searchInput = document.getElementById("searchInput");
        searchInput.addEventListener("input", updateCurrentView);
    };

    const script = document.createElement("script");
    script.src = "https://script.google.com/macros/s/AKfycbx3J9PGkdJORbtVCfUTSrjCsTq0MjMIiXtqtEQJF2shSGUuJ7H3FoYYOM0NtQXj47FeoQ/exec?api=aniimos&callback=" + callbackName;

    script.onerror = function() {
        document.getElementById("aniimoList").innerHTML =
            "<p style='color:#ff6b6b;'>Erreur de chargement :</p><pre style='white-space:pre-wrap;color:#ffb4b4;'>Impossible de charger les données JSONP.</pre>";
    };

    document.body.appendChild(script);
}

loadAniimosJsonp();
function renderSidebar(search = ""){
    const query = search.toLowerCase();

    document.getElementById("aniimoList").innerHTML = aniimos
        .filter(aniimo => aniimo.name.toLowerCase().includes(query))
        .map(createAniimoButton)
        .join("");

    document.querySelectorAll(".aniimoButton").forEach(button => {
        button.addEventListener("click", function(){
            showAniimoById(this.dataset.aniimoId);
        });
    });
}

function updateCurrentView(){

    const query = document.getElementById("searchInput").value;

    switch(currentView){

        case "patch":
            renderSidebar(query);
            break;

        case "aniilog":
            renderAniilog(query);
            break;

    }

}
function createAniimoButton(aniimo){
    const activeClass = aniimo.name === selectedAniimoName ? " active" : "";

    return `
        <div class="aniimoButton${activeClass}" data-aniimo-id="${aniimo.id}">
            ${aniimo.name}
        </div>
    `;
}

function showAniimoById(id){
    const aniimo = aniimos.find(a => String(a.id) === String(id));
    if(!aniimo) return;

    showAniimo(aniimo.name);
}

function showAniilogAniimoById(id){
    const aniimo = aniimos.find(a => String(a.id) === String(id));
    if(!aniimo) return;

    selectedAniimoName = aniimo.name;
    selectedForm = "base";
    currentView = "aniilog";

    const modal = document.getElementById("aniilogModal");

    modal.classList.remove("hidden");

    modal.querySelector(".aniilogModalContent").innerHTML =
        createAniilogAniimoCard(aniimo);
}

function createAniilogAniimoCard(aniimo){
    const versions = getDisplayedVersions(aniimo);
    const current = versions.current;

    return `
        <div class="aniimoCard accent-${getMainType(current).toLowerCase()}">
            <section class="heroCard">
            <button class="heroCloseButton"
        onclick="closeAniilogModal()"
        aria-label="Close">
    ✕
</button>
                <div class="heroMain">
                    ${createPortrait(current)}

                    <div>
                        <h2>${current.name}</h2>

<div class="heroBadges">
    ${createTypeBadges(current.type)}
    ${createRoleBadges(current.role)}
</div>

                        ${createLoadoutPreview(current)}

                        <p class="subtitle">Aniilog Entry</p>
                    </div>
                </div>

                <div id="loadoutDetails" class="loadoutDetails">
                    <div class="loadoutDetailsEmpty">
                        ${t("hoverIconDetails")}
                    </div>
                </div>
            </section>

            ${createFormTabs(aniimo)}

            <section class="infoCard">
                <h3>${t("stats")}</h3>

                <div class="statsGrid">
                    ${createSingleStat("HP", current.hp)}
                    ${createSingleStat("BREAK", current.break)}
                    ${createSingleStat("ATK", current.atk)}
                    ${createSingleStat("MDEF", current.mdef)}
                    ${createSingleStat("PDEF", current.pdef)}
                    ${createSingleStat("REGEN", current.regen)}
                    ${createSingleStat(t("baseStats"), current.bst)}
                </div>
            </section>

            ${createAniilogEntitySection("traits", current.traits || [])}
            ${createAniilogEntitySection("spells", current.spells || [])}
            ${createAniilogEntitySection("ultimate", current.ultimate ? [current.ultimate] : [])}
        </div>
    `;
}

function createSingleStat(label, value){
    return `
        <div class="statBox">
            <span class="statLabel">${label}</span>
            <span class="singleStatValue">${value || "—"}</span>
        </div>
    `;
}

function createAniilogEntitySection(title, items){
    if(!items || items.length === 0) return "";

    return `
    <section class="infoCard entitySection">
        <h3>${t(title)}</h3>

        <div class="entityGrid">
            ${items.map(item =>
                createInfoCard(
                    displayName(item),
                    createEffectTags(item) +
                    createAniilogEntityMeta(item) +
                    (getLocalizedDescription(item)
                        ? `<p>${formatText(getLocalizedDescription(item))}</p>`
                        : ""),
                    item.icon,
                    item.type
                )
            ).join("")}
        </div>
    </section>
`;
}

function showAniimo(name){
    try {
        currentView = "patch";

        const patchButton = document.getElementById("patchViewButton");
        const aniilogButton = document.getElementById("aniilogViewButton");

        if(patchButton) patchButton.classList.add("active");
        if(aniilogButton) aniilogButton.classList.remove("active");

        const aniimo = aniimos.find(a => a.name === name);
        if(!aniimo){
            throw new Error("Aniimo introuvable : " + name);
        }

        selectedAniimoName = name;
        selectedForm = "base";

        document.getElementById("content").innerHTML = createAniimoCard(aniimo);
        document.getElementById("content").scrollTop = 0;

        renderSidebar(document.getElementById("searchInput").value);

    } catch(error) {
        console.error(error);

        document.getElementById("content").innerHTML = `
            <section class="infoCard">
                <h3>Erreur au clic</h3>
                <pre style="white-space:pre-wrap;color:#ffb4b4;">${error.stack || error.message}</pre>
            </section>
        `;
    }
}

function createAniimoCard(aniimo){
    const versions = getDisplayedVersions(aniimo);
const oldVersion = versions.oldVersion;
const current = versions.current;

    return `
        <div class="aniimoCard accent-${getMainType(current).toLowerCase()}">

<section class="heroCard">
    <div class="heroMain">
        ${createPortrait(current)}

        <div>
            <h2>${current.name}</h2>

<div class="heroBadges">
    ${createTypeBadges(current.type)}
    ${createRoleBadges(current.role)}
</div>

            ${createLoadoutPreview(current)}

            <p class="subtitle">${t("versionSubtitle")}</p>
        </div>
    </div>

    <div id="loadoutDetails" class="loadoutDetails">
        <div class="loadoutDetailsEmpty">
            ${t("hoverIconDetails")}
        </div>
    </div>
</section>
            ${createFormTabs(aniimo)}
            ${createSummary(createPatchSummary(oldVersion, current))}

            <section class="infoCard">
                <h3>${t("stats")}</h3>

                <div class="statsGrid">
                    ${createStat("HP", oldVersion, current, "hp")}
                    ${createStat("BREAK", oldVersion, current, "break")}
                    ${createStat("ATK", oldVersion, current, "atk")}
                    ${createStat("MDEF", oldVersion, current, "mdef")}
                    ${createStat("PDEF", oldVersion, current, "pdef")}
                    ${createStat("REGEN", oldVersion, current, "regen")}
                    ${createStat(t("baseStats"), oldVersion, current, "bst")}
                </div>
            </section>

            ${createEntitySection("traits", oldVersion?.traits || [], current.traits || [], "trait_id")}
            ${createEntitySection("spells", oldVersion?.spells || [], current.spells || [], "spell_id")}
            ${createEntitySection("ultimate", oldVersion?.ultimate ? [oldVersion.ultimate] : [], current.ultimate ? [current.ultimate] : [], "ultimate_id")}
            ${createEntitySection("forms", oldVersion?.forms || [], current.forms || [], "form_id")}
            ${createEntitySection("prismana", oldVersion?.prismanas || [], current.prismanas || [], "prismana_id")}

        </div>
    `;
}

function createStat(label, oldVersion, currentVersion, key){
    const oldValue = oldVersion ? oldVersion[key] : "";
    const newValue = currentVersion ? currentVersion[key] : "";

    let className = "statBox";
    let badge = "";

    if(String(oldValue) !== String(newValue)){
        const diff = Number(newValue) - Number(oldValue);

        if(diff > 0){
            className += " buff";
            badge = `<span class="statBadge">+${diff}</span>`;
        } else if(diff < 0){
            className += " nerf";
            badge = `<span class="statBadge">${diff}</span>`;
        }

        return `
            <div class="${className}">
                <span class="statLabel">${label}</span>
                <div class="statCompare">
                    <span class="oldValue">${oldValue}</span>
                    <span class="statArrow">→</span>
                    <span class="newValue">${newValue}</span>
                </div>
                ${badge}
            </div>
        `;
    }

    return `
        <div class="${className}">
            <span class="statLabel">${label}</span>
            <span class="singleStatValue">${newValue || "—"}</span>
        </div>
    `;
}

function createEntitySection(title, oldItems, newItems, idKey){
    const blocks = [];

    const oldById = indexById(oldItems, idKey);
    const newById = indexById(newItems, idKey);

    oldItems.forEach(oldItem => {
        const id = oldItem[idKey];
        const newItem = newById[id];

        if(!newItem){
blocks.push(createEntityCard(
    "removed",
    oldItem,
    oldItem.effect_key
        ? `<p class="removedDescription">${formatText(oldItem.effect_key)}</p>`
        : "",
    "oldBlock"
));
} else if(hasEntityChanged(oldItem, newItem)){
    blocks.push(createEntityCard(
    "modified",
    newItem,
    createChangeList(oldItem, newItem) + createDescriptionCompare(oldItem, newItem),
    "modifiedBlock"
));
}
        
    });

    newItems.forEach(newItem => {
        const id = newItem[idKey];

        if(!oldById[id]){
blocks.push(createEntityCard(
    "new",
    newItem,
    newItem.effect_key
        ? `<p>${formatText(newItem.effect_key)}</p>`
        : "",
    "newBlock"
));
}
    });

    if(blocks.length === 0) return "";

    return `
    <section class="infoCard entitySection">
        <h3>${t(title)}</h3>

        <div class="entityGrid">
            ${blocks.join("")}
        </div>
    </section>
`;
}

function indexById(items, idKey){
    const index = {};
    items.forEach(item => {
        if(item && item[idKey]){
            index[item[idKey]] = item;
        }
    });
    return index;
}

function hasEntityChanged(oldItem, newItem){

    return ENTITY_COMPARE_FIELDS.some(function(key){
        return cleanDisplay(oldItem[key]) !== cleanDisplay(newItem[key]);
    });

}

function displayName(item){

    return getLocalizedName(item) ||
           item.form_id ||
           item.prismana_id ||
           item.spell_id ||
           item.trait_id ||
           item.ultimate_id ||
           "Unnamed";
}

function createTextBlock(title, text, extraClass = ""){
    return `
        <div class="textBlock ${extraClass}">
            <h4>${title}</h4>
            ${text ? `<div>${text}</div>` : ""}
        </div>
    `;
}
function createPatchCard(status, title, content, extraClass = "", icon = ""){

    const iconHtml = icon
        ? `<img class="entityIcon" src="${icon}" alt="">`
        : "";

    return `
        <div class="patchCard ${extraClass}">
            <div class="patchHeader">
                <div class="patchTitle">
                    ${iconHtml}
                    <span>${title}</span>
                </div>
                <div class="patchBadge ${extraClass}">
                    ${t(status)}
                </div>
            </div>

            <div class="patchBody">
                ${content || ""}
            </div>
        </div>
    `;
}

function createInfoCard(title, content, icon = "", type = ""){
    const iconHtml = icon
        ? `<img class="entityIcon" src="${icon}" alt="">`
        : "";

    const typeClass = type
        ? ` info-type-${String(type).split("/")[0].trim().toLowerCase()}`
        : "";

    return `
        <div class="infoCardItem${typeClass}">
            <div class="infoCardItemHeader">
                <div class="infoCardItemTitle">
                    ${iconHtml}
                    <span>${title}</span>
                </div>
            </div>

            <div class="infoCardItemBody">
                ${content || ""}
            </div>
        </div>
    `;
}

function createEntityCard(status, item, content, extraClass = ""){

    return createPatchCard(
        status,
        getStatusIcon(status) + " " + displayName(item),
        createEffectTags(item) + content,
        extraClass,
        item.icon
    );

}

function getStatusIcon(status){

    if(status === "removed") return "❌";
    if(status === "modified") return "📝";
    if(status === "new") return "✨";

    return "";

}

function createPatchSummary(oldVersion, current){
    const summary = [];

    if(!current) return summary;

    addStatSummary(summary, "HP", oldVersion, current, "hp");
    addStatSummary(summary, "BREAK", oldVersion, current, "break");
    addStatSummary(summary, "ATK", oldVersion, current, "atk");
    addStatSummary(summary, "MDEF", oldVersion, current, "mdef");
    addStatSummary(summary, "PDEF", oldVersion, current, "pdef");
    addStatSummary(summary, "REGEN", oldVersion, current, "regen");
    addStatSummary(summary, "BST", oldVersion, current, "bst");

    if(!oldVersion){
        summary.push({ text:t("newAniimo"), type:"new" });
        return summary;
    }
    addSimpleChangeSummary(summary, "name", oldVersion.name, current.name, "type");
    addSimpleChangeSummary(summary, "type", oldVersion.type, current.type, "type");
    addSimpleChangeSummary(summary, "role", oldVersion.role, current.role, "role");

    addEntitySummary(summary, "traits", oldVersion.traits || [], current.traits || [], "trait_id", "new");
    addEntitySummary(summary, "spells", oldVersion.spells || [], current.spells || [], "spell_id", "spell");
    addEntitySummary(summary, "ultimate", oldVersion.ultimate ? [oldVersion.ultimate] : [], current.ultimate ? [current.ultimate] : [], "ultimate_id", "ultimate");
    addEntitySummary(summary, "forms", oldVersion.forms || [], current.forms || [], "form_id", "form");
    addEntitySummary(summary, "prismana", oldVersion.prismanas || [], current.prismanas || [], "prismana_id", "prismana");

    return summary;
}

function addSimpleChangeSummary(summary, label, oldValue, newValue, type){
    const oldText = cleanDisplay(oldValue);
    const newText = cleanDisplay(newValue);

    if(oldText === newText) return;

    summary.push({
        text: `${t(label)}: ${oldText || "—"} → ${newText || "—"}`,
        type: type
    });
}

function addEntitySummary(summary, label, oldItems, newItems, idKey, type){
    const oldById = indexById(oldItems, idKey);
    const newById = indexById(newItems, idKey);

    let added = 0;
    let removed = 0;
    let modified = 0;

    oldItems.forEach(oldItem => {
        const id = oldItem[idKey];
        const newItem = newById[id];

        if(!newItem){
            removed++;
        } else if(hasEntityChanged(oldItem, newItem)){
            modified++;
        }
    });

    newItems.forEach(newItem => {
        const id = newItem[idKey];

        if(!oldById[id]){
            added++;
        }
    });

    if(added > 0){
        summary.push({
            text: `✨ ${added} ${t(label)} ${t("summaryAdded")}`,
            type: type
        });
    }

    if(modified > 0){
        summary.push({
            text: `📝 ${modified} ${t(label)} ${t("summaryModified")}`,
            type: type
        });
    }

    if(removed > 0){
        summary.push({
            text: `❌ ${removed} ${t(label)} ${t("summaryRemoved")}`,
            type: "nerf"
        });
    }
}

function addStatSummary(summary, label, oldVersion, current, key){
    if(!oldVersion || !current) return;

    const oldValue = Number(oldVersion[key]);
    const newValue = Number(current[key]);
    const diff = newValue - oldValue;

    if(diff > 0){
        summary.push({ text: `▲ ${label} +${diff}`, type: "buff" });
    } else if(diff < 0){
        summary.push({ text: `▼ ${label} ${diff}`, type: "nerf" });
    }
}

function createSummary(summary){
    if(summary.length === 0) return "";

    let items = "";

    summary.forEach(function(item){
        items += '<div class="summaryItem ' + item.type + '">';
        items += item.text;
        items += '</div>';
    });

    return `
        <section class="infoCard">
            <h3>${t("patchSummary")}</h3>
            <div class="summaryGrid">
                ${items}
            </div>
        </section>
    `;
}

function createPortrait(aniimo){
    if(!aniimo.portrait){
        return `<div class="portraitPlaceholder">Portrait</div>`;
    }

    return `
        <div class="portraitBox">
        <img class="aniimo-card-portrait" src="${aniimo.portrait}" alt="${aniimo.name}">
        </div>
    `;
}

function createLoadoutPreview(version){
    return `
        <div class="loadoutPreview">
            <div class="loadoutGroup">
                ${(version.traits || []).map(trait =>
                    createTooltipIcon("traits", trait)
                ).join("")}
            </div>

            <div class="loadoutSeparator"></div>

            <div class="loadoutGroup">
                ${(version.spells || []).map(spell =>
                    createTooltipIcon("spells", spell)
                ).join("")}
            </div>

            <div class="loadoutSeparator"></div>

            <div class="loadoutGroup">
                ${createTooltipIcon("ultimate", version.ultimate)}
            </div>
        </div>
    `;
}

function createTooltipIcon(category, item){
    if(!item || !item.icon) return "";

    const details = createLoadoutDetails(category, item)
        .replace(/"/g, "&quot;")
        .replace(/\n/g, " ");

    return `
<div class="loadoutIcon"
     onmouseenter="showLoadoutDetails(\`${details}\`)">
            <img src="${item.icon}" alt="${displayName(item)}">
        </div>
    `;
}

function createLoadoutDetails(category, item){
    return `
        <div class="tooltipTitle">${displayName(item)}</div>
        <div class="tooltipCategory">${t(category)}</div>
        ${createEffectTags(item)}

        ${item.type ? `<div><strong>${t("type")}:</strong> ${item.type}</div>` : ""}
        ${item.power ? `<div><strong>${t("power")}:</strong> ${item.power}</div>` : ""}
        ${item.cost ? `<div><strong>${t("cost")}:</strong> ${item.cost}</div>` : ""}
        ${item.cooldown ? `<div><strong>${t("cooldown")}:</strong> ${item.cooldown}</div>` : ""}
        ${item.energy_points ? `<div><strong>${t("energy")}:</strong> ${item.energy_points}</div>` : ""}
        ${item.duration ? `<div><strong>${t("duration")}:</strong> ${item.duration}</div>` : ""}
        ${getLocalizedDescription(item)
    ? `<p>${formatText(getLocalizedDescription(item))}</p>`
    : ""}
    `;
}

function showLoadoutDetails(html){
    const box = document.getElementById("loadoutDetails");
    if(!box) return;
    box.innerHTML = html;
}

function clearLoadoutDetails(){
    const box = document.getElementById("loadoutDetails");
    if(!box) return;

box.innerHTML = `
    <div class="loadoutDetailsEmpty">
        ${t("hoverIconDetails")}
    </div>
`;

}


function createFormTabs(aniimo){

    let html = '<div class="formTabs">';

    html += '<button class="' + (selectedForm === 'base' ? 'active' : '') + '" onclick="changeForm(\'base\')">';
    html += t('base');
    html += '</button>';

    aniimo.current.forms.forEach(function(form){
        html += '<button class="' + (selectedForm === form.form_id ? 'active' : '') + '" onclick="changeForm(\'' + form.form_id + '\')">';
        html += form.name;
        html += '</button>';
    });

    aniimo.current.prismanas.forEach(function(prismana){
        html += '<button class="' + (selectedForm === prismana.prismana_id ? 'active' : '') + '" onclick="changeForm(\'' + prismana.prismana_id + '\')">';
        html += t('prismana');
        html += '</button>';
    });

    html += '</div>';

    return html;
}

function normalizeKey(text){
    const value = String(text || "").trim().toLowerCase();

    if(value === "dps") return "DPS";

    return value.replace(/^\w/, c => c.toUpperCase());
}

function createTypeBadges(typeText){
    if(!typeText) return "";

    return `
        <span class="typeBadges">
            ${String(typeText).split("/").map(type => {
                const cleanType = type.trim();
                const iconKey = normalizeKey(cleanType);
                const icon = TYPE_ICONS[iconKey];
                const typeClass = cleanType.toLowerCase();

                return `
                    <span class="typeBadge type-${typeClass}">
                        ${icon ? `<img src="${icon}" alt="${cleanType}">` : ""}
                        ${cleanType}
                    </span>
                `;
            }).join("")}
        </span>
    `;
}

function createRoleBadges(roleText){
    if(!roleText) return "";

    return `
        <span class="roleBadges">
            ${String(roleText).split("/").map(role => {
                const cleanRole = role.trim();
                const iconKey = normalizeKey(cleanRole);
                const icon = ROLE_ICONS[iconKey];

                return `
                    <span class="roleBadge role-${cleanRole.toLowerCase()}">
                        ${icon ? `<img src="${icon}" alt="${cleanRole}">` : ""}
                        ${cleanRole}
                    </span>
                `;
            }).join("")}
        </span>
    `;
}

function getMainType(aniimo){
    if(!aniimo.type) return "neutral";
    return String(aniimo.type).split("/")[0].trim();
}

function formatText(text){
    return String(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function applyLanguage(){
    document.getElementById("pageTitle").textContent = LANG[currentLang].title;
    document.getElementById("searchInput").placeholder = LANG[currentLang].searchPlaceholder;

    const defaultMessage = document.getElementById("defaultMessage");
    if(defaultMessage){
        defaultMessage.textContent = LANG[currentLang].selectAniimo;
    }

    document.getElementById("languageSelect").value = currentLang;
}

document.getElementById("languageSelect").addEventListener("change", function(){
    currentLang = this.value;
    localStorage.setItem("aniimoLang", currentLang);

    applyLanguage();

    if(selectedAniimoName){

        const aniimo = aniimos.find(a => a.name === selectedAniimoName);
        if(!aniimo) return;

        if(currentView === "aniilog"){
            document.getElementById("content").innerHTML =
                createAniilogAniimoCard(aniimo);
        } else {
            document.getElementById("content").innerHTML =
                createAniimoCard(aniimo);
        }

    } else {

        if(currentView === "aniilog"){
            renderAniilog(document.getElementById("searchInput").value);
        } else {
            document.getElementById("content").innerHTML =
                `<span id="defaultMessage">${t("selectAniimo")}</span>`;
        }

    }
});
function changeForm(formId){
    selectedForm = formId;

    const aniimo = aniimos.find(a => a.name === selectedAniimoName);
    if(!aniimo) return;

    if(currentView === "aniilog"){
        const modal = document.getElementById("aniilogModal");

        if(modal && !modal.classList.contains("hidden")){
            modal.querySelector(".aniilogModalContent").innerHTML =
                createAniilogAniimoCard(aniimo);
        } else {
            document.getElementById("content").innerHTML =
                createAniilogAniimoCard(aniimo);
        }

    } else {
        document.getElementById("content").innerHTML =
            createAniimoCard(aniimo);
    }
}
function getDisplayedVersions(aniimo){

    if(selectedForm === "base"){
        return {
            oldVersion: aniimo.old,
            current: aniimo.current
        };
    }

    const oldForm = aniimo.old
        ? (
            aniimo.old.forms.find(f => f.form_id === selectedForm) ||
            aniimo.old.prismanas.find(p => p.prismana_id === selectedForm)
        )
        : null;

    const currentForm =
        aniimo.current.forms.find(f => f.form_id === selectedForm) ||
        aniimo.current.prismanas.find(p => p.prismana_id === selectedForm);

    return {
        oldVersion: mergeFormWithBase(aniimo.old, oldForm),
        current: mergeFormWithBase(aniimo.current, currentForm)
    };
}

function mergeFormWithBase(base, form){

    if(!form){
        return base;
    }

    return {
        ...base,

        form_id: form.form_id,
        prismana_id: form.prismana_id,

        name: form.name || base.name,
        portrait: form.portrait || base.portrait,
        type: form.type || base.type,
        role: form.role || base.role,

        spells: form.spells || base.spells
    };
}
function createChangeList(oldItem, newItem){

    const FIELD_LABEL_KEYS = {
        name: "name",
        type: "type",
        cost: "cost",
        energy_points: "energyPoints",
        power: "power",
        spectre: "damageType",
        duration: "duration",
        bonus: "bonus",
        malus: "malus",
        heal: "heal",
        shield: "shield",
        control: "control",
        regen_ep: "regenEp"
    };

    let html = '<div class="patchChanges">';

    ENTITY_COMPARE_FIELDS.forEach(function(key){

        const labelKey = FIELD_LABEL_KEYS[key] || key;

        const oldValue = cleanDisplay(oldItem[key]);
        const newValue = cleanDisplay(newItem[key]);

        if(oldValue === "" && newValue === "") return;
        if(oldValue === newValue) return;

        const oldNumber = Number(oldValue);
        const newNumber = Number(newValue);

        let changeClass = "neutral";

        if(!isNaN(oldNumber) && !isNaN(newNumber)){

            const behavior = FIELD_BEHAVIOR[key] || "neutral";

            if(behavior === "higher"){
                if(newNumber > oldNumber) changeClass = "buff";
                else if(newNumber < oldNumber) changeClass = "nerf";
            }

            if(behavior === "lower"){
                if(newNumber < oldNumber) changeClass = "buff";
                else if(newNumber > oldNumber) changeClass = "nerf";
            }

        }

        html += `
            <div class="changeCard ${changeClass}">
                <div class="changeLabel">${t(labelKey)}</div>
                <div class="changeValues">
                    <span class="oldValue">${oldValue || "—"}</span>
                    <span class="statArrow">→</span>
                    <span class="newValue">${newValue || "—"}</span>
                </div>
            </div>
        `;
    });

    html += '</div>';

    return html;
}

function cleanDisplay(value){
    const text = String(value || "").trim();

    if(text === "" || text === "-" || text === "—" || text.toLowerCase() === "none"){
        return "";
    }

    return text;
}
function createDescriptionCompare(oldItem, newItem){

    const oldText = cleanDisplay(getLocalizedDescription(oldItem));
const newText = cleanDisplay(getLocalizedDescription(newItem));

    if(oldText === newText){
        return "";
    }

    return `
        <div class="descriptionCompare">
            <div class="descriptionCard oldDescription">
                <h5>${t("before")}</h5>
                <p>${formatText(oldText || "—")}</p>
            </div>

            <div class="descriptionCard newDescription">
                <h5>${t("after")}</h5>
                <p>${formatText(newText || "—")}</p>
            </div>
        </div>
    `;
}
function switchView(view){
    currentView = view;

    const patchButton = document.getElementById("patchViewButton");
    const aniilogButton = document.getElementById("aniilogViewButton");

    if(patchButton) patchButton.classList.toggle("active", view === "patch");
    if(aniilogButton) aniilogButton.classList.toggle("active", view === "aniilog");

    selectedAniimoName = "";
    selectedForm = "base";

    if(view === "patch"){
        document.getElementById("content").innerHTML =
            `<span id="defaultMessage">${t("selectAniimo")}</span>`;
        renderSidebar(document.getElementById("searchInput").value);
    }

    if(view === "aniilog"){
        renderAniilog(document.getElementById("searchInput").value);
    }
}
function renderAniilog(filter = ""){
    const query = filter.toLowerCase();

const visibleAniimos = sortAniilogList(
    aniimos.filter(aniimo =>
        aniimo.current.name.toLowerCase().includes(query) &&
        matchesAniilogFilters(aniimo)
    )
);

    selectedAniimoName = "";
    selectedForm = "base";

    document.getElementById("content").innerHTML = `
        <section class="infoCard">
            <div class="aniilogHero">
    <div>
        <h3>Aniilog</h3>
        <p>${t("aniilogIntro")}</p>
    </div>
    <div class="aniilogHeroBadge">
        ${visibleAniimos.length} Aniimos
    </div>
</div>

${createAniilogFilters()}
            <div class="aniilogGrid">
    ${visibleAniimos
        .map((aniimo, index) => createAniilogCard(aniimo, index))
        .join("")}
</div>
        </section>
    `;
    

    document.querySelectorAll(".aniilogCard").forEach(card => {
        card.addEventListener("click", function(){
            showAniilogAniimoById(this.dataset.aniimoId);
        });
    });
}
            
function toggleAniilogFilter(group, value){
    const list = aniilogFilters[group];
    const index = list.indexOf(value);

    if(index >= 0){
        list.splice(index, 1);
    } else {
        list.push(value);
    }

    renderAniilog(document.getElementById("searchInput").value);
}

function resetAniilogFilters(){
    aniilogFilters = {
        types: [],
        roles: [],
        tags: []
    };

    renderAniilog(document.getElementById("searchInput").value);
}

function hasAniilogTag(aniimo, tag){
    const version = aniimo.current;

    const allItems = [
        ...(version.traits || []),
        ...(version.spells || []),
        ...(version.ultimate ? [version.ultimate] : []),

        ...(version.forms || []).flatMap(form => [
            ...(form.traits || []),
            ...(form.spells || []),
            ...(form.ultimate ? [form.ultimate] : [])
        ]),

        ...(version.prismanas || []).flatMap(prismana => [
            ...(prismana.traits || []),
            ...(prismana.spells || []),
            ...(prismana.ultimate ? [prismana.ultimate] : [])
        ])
    ];

    return allItems.some(item => hasTagValue(item, tag));
}

function hasTagValue(item, tag){
    if(!item) return false;

    const aliases = {
        bonus: ["bonus", "Bonus", "BONUS"],
        malus: ["malus", "Malus", "MALUS"],
        heal: ["heal", "Heal", "HEAL"],
        shield: ["shield", "Shield", "SHIELD"],
        control: ["control", "Control", "CONTROL"],
        regen_ep: ["regen_ep", "regenEP", "regen_ep ", "regen EP", "regen_ep", "Regen EP", "REGEN_EP"]
    };

    const possibleKeys = aliases[tag] || [tag];

    return possibleKeys.some(key => cleanDisplay(item[key]) !== "");
}

function getAniimoAllTypes(aniimo){
    const version = aniimo.current;

    const typeSources = [
        version.type,
        ...(version.forms || []).map(form => form.type),
        ...(version.prismanas || []).map(prismana => prismana.type)
    ];

    return typeSources
        .flatMap(typeText => String(typeText || "").split("/"))
        .map(type => type.trim().toLowerCase())
        .filter(Boolean);
}

function matchesAniilogFilters(aniimo){
    const version = aniimo.current;

    if(aniilogFilters.types.length > 0){
    const types = getAniimoAllTypes(aniimo);

    if(!aniilogFilters.types.some(type => types.includes(type.toLowerCase()))){
        return false;
    }
}

    if(aniilogFilters.roles.length > 0){
        const roles = String(version.role || "")
            .split("/")
            .map(r => r.trim().toLowerCase());

        if(!aniilogFilters.roles.some(role => roles.includes(role.toLowerCase()))){
            return false;
        }
    }

    if(aniilogFilters.tags.length > 0){
        if(!aniilogFilters.tags.some(tag => hasAniilogTag(aniimo, tag))){
            return false;
        }
    }

    return true;
}

function createAniilogCard(aniimo, index){
    const current = aniimo.current;

    return `
    <div class="aniilogCard type-${getMainType(current).toLowerCase()}"
         data-aniimo-id="${aniimo.id}">

        ${
            aniilogSort && index < 3
                ? `<div class="rankCrown rank-${index + 1}"></div>`
                : ""
        }

    <div class="aniilogTypeBar"></div>
            <div class="aniilogPortrait">
                ${current.portrait
                    ? `<img src="${current.portrait}" alt="${current.name}">`
                    : `<span>?</span>`
                }
            </div>

            <div class="aniilogName">${current.name}</div>

            <div class="aniilogMeta">
                ${createTypeBadges(current.type)}
                ${createRoleBadges(current.role)}
            </div>
        </div>
    `;
}

function createAniilogFilters(){
    const activeCount =
        aniilogFilters.types.length +
        aniilogFilters.roles.length +
        aniilogFilters.tags.length +
        (aniilogSort ? 1 : 0);

    return `
        <details class="aniilogFiltersPanel" open>
            <summary>
               <span>${t("advancedSearch")}</span>
                ${activeCount > 0 ? `<span class="filterCount">${activeCount}</span>` : ""}
            </summary>

            <div class="aniilogFilters">
                <div class="aniilogFilterHeader">
                    <button class="aniilogFilterReset" onclick="resetAniilogFilters()">
                        ${t("all")}
                    </button>
                </div>

                <div class="aniilogAdvancedGrid">
    <div>
        ${createAniilogFilterGroup("types", t("types"), ANIILOG_TYPES)}
        ${createAniilogFilterGroup("roles", t("roles"), ANIILOG_ROLES)}
        ${createAniilogFilterGroup("tags", t("tags"), ANIILOG_TAGS)}
    </div>

    <div class="aniilogSortPanel">
        <div class="aniilogFilterTitle">${t("sortBy")}</div>
        <div class="aniilogFilterButtons">
            ${createAniilogSortButton("hp", "HP")}
            ${createAniilogSortButton("break", "BREAK")}
            ${createAniilogSortButton("atk", "ATK")}
            ${createAniilogSortButton("mdef", "MDEF")}
            ${createAniilogSortButton("pdef", "PDEF")}
            ${createAniilogSortButton("regen", "REGEN")}
            ${createAniilogSortButton("bst", "BST")}
        </div>
    </div>
</div>
            </div>
        </details>
    `;
}

function createAniilogFilterGroup(group, title, values){
    return `
        <div class="aniilogFilterGroup">
            <div class="aniilogFilterTitle">${title}</div>

            <div class="aniilogFilterButtons">
                ${values.map(value => {
                    const active = aniilogFilters[group].includes(value) ? " active" : "";
                    const labelKey = value === "regen_ep" ? "regenEp" : value;

                    return `
                        <button class="aniilogFilterButton${active}"
                                onclick="toggleAniilogFilter('${group}', '${value}')">
                            ${t(labelKey)}
                        </button>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}
function createAniilogEntityMeta(item){
    const rows = [];

    if(cleanDisplay(item.type)){
        rows.push(`<span><strong>${t("type")}:</strong> ${translateTypeList(item.type)}</span>`);
    }

    if(cleanDisplay(item.spectre)){
        rows.push(`<span><strong>${t("damageType")}:</strong> ${translateValue(item.spectre)}</span>`);
    }

    if(cleanDisplay(item.power)){
        rows.push(`<span><strong>${t("power")}:</strong> ${item.power}</span>`);
    }

    if(cleanDisplay(item.energy_points)){
rows.push(`<span><strong>${t("cost")}:</strong> ${item.energy_points}</span>`);
    }

    if(cleanDisplay(item.cost)){
        rows.push(`<span><strong>${t("cost")}:</strong> ${item.cost}</span>`);
    }

    if(rows.length === 0) return "";

    return `
        <div class="aniilogEntityMeta">
            ${rows.join("")}
        </div>
    `;
}
window.debugAniimoTags = function(name){
    const aniimo = aniimos.find(a =>
        a.name.toLowerCase().includes(name.toLowerCase())
    );

    if(!aniimo){
        console.log("Aniimo introuvable :", name);
        return;
    }

    const version = aniimo.current;

    const allItems = [
        ...(version.traits || []),
        ...(version.spells || []),
        ...(version.ultimate ? [version.ultimate] : []),

        ...(version.forms || []).flatMap(form => [
            ...(form.traits || []),
            ...(form.spells || []),
            ...(form.ultimate ? [form.ultimate] : [])
        ]),

        ...(version.prismanas || []).flatMap(prismana => [
            ...(prismana.traits || []),
            ...(prismana.spells || []),
            ...(prismana.ultimate ? [prismana.ultimate] : [])
        ])
    ];

    console.log("ANIIMO :", aniimo.name);

    console.table(allItems.map(item => ({
        name: item.name,
        id: item.spell_id || item.trait_id || item.ultimate_id || item.form_id || item.prismana_id,
        bonus: item.bonus,
        malus: item.malus,
        heal: item.heal,
        shield: item.shield,
        control: item.control,
        regen_ep: item.regen_ep
    })));
};

function translateValue(value){
    const key = String(value || "").trim().toLowerCase();
    if(!key) return "";

    return t(key);
}

function translateTypeList(typeText){
    return String(typeText || "")
        .split("/")
        .map(type => translateValue(type))
        .filter(Boolean)
        .join(" / ");
}
function createAniilogSortButton(key, label){
    const active = aniilogSort === key ? " active" : "";

    return `
        <button class="aniilogFilterButton${active}"
                onclick="setAniilogSort('${key}')">
            ${label}
        </button>
    `;
}

function setAniilogSort(key){
    aniilogSort = aniilogSort === key ? "" : key;
    renderAniilog(document.getElementById("searchInput").value);
}

function sortAniilogList(list){
    if(!aniilogSort) return list;

    return [...list].sort((a, b) => {
        const aValue = Number(a.current[aniilogSort] || 0);
        const bValue = Number(b.current[aniilogSort] || 0);

        return bValue - aValue;
    });
}

function closeAniilogModal(){

    const modal = document.getElementById("aniilogModal");

    modal.classList.add("hidden");

    modal.querySelector(".aniilogModalContent").innerHTML = "";
}

// ---------- Événements de la modale ----------

// Fermer en cliquant sur le fond
document.addEventListener("DOMContentLoaded", function(){

    document
        .querySelector(".aniilogOverlay")
        .addEventListener("click", closeAniilogModal);

});

// Fermer avec la touche Échap
document.addEventListener("keydown", function(e){

    if(e.key === "Escape"){
        closeAniilogModal();
    }

});

window.showAniimo = showAniimo;
window.switchView = switchView;
window.changeForm = changeForm;
window.toggleAniilogFilter = toggleAniilogFilter;
window.resetAniilogFilters = resetAniilogFilters;
window.showAniilogAniimoById = showAniilogAniimoById;
