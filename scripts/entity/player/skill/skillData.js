
//typeは0がパッシブスキル、1がアクティブスキル
//#は変数
import activeSkills from "./activeSkills/index.js";
import passiveSkills from "./passiveSkills/index.js";

// passiveSkillsの各エントリをid:keyでオブジェクト形式に変換（type:0を付与）
const passiveData = {};
for (const [id, skillDef] of Object.entries(passiveSkills)) {
    passiveData[id] = { type: 0, ...skillDef };
}

// activeSkillsの各エントリをid:keyでオブジェクト形式に変換（type:1を付与）
const activeData = {};
for (const [id, skillDef] of Object.entries(activeSkills)) {
    activeData[id] = { type: 1, ...skillDef };
}

export default {
    ...passiveData,
    ...activeData
};
