import * as server from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import skill from "./skill";
import skillData from "./skillData";
import config from "../../../config";

const { world, system } = server;

/**
 * スキルメニューのトップ画面 (タイプ選択)
 * @param {import("@minecraft/server").Player} player
 */
export function showSkillMenu(player) {
    const form = new ActionFormData()
        .title("§l§6スキルメニュー")
        .body("§2スキルのタイプを選択してください")
        .button("§aパッシブスキル\n§8常時・自動発動型スキル")
        .button("§9アクティブスキル\n§8手動発動型スキル");

    form.show(player).then(res => {
        if (res.canceled || res.selection === undefined) return;
        if (res.selection === 0) showTypeMenu(player, 0);
        if (res.selection === 1) showTypeMenu(player, 1);
    });
}

/**
 * 各スキルタイプのメインメニュー (パッシブ/アクティブ共通)
 * @param {import("@minecraft/server").Player} player 
 * @param {number} type 0:パッシブ, 1:アクティブ
 */
function showTypeMenu(player, type) {
    const isPassive = type === 0;
    const title = isPassive ? "§l§aパッシブスキル" : "§l§9アクティブスキル";
    const color = isPassive ? "§a" : "§9";
    const max = isPassive ? config.maxPassiveSkills : config.maxActiveSkills;

    const allSkills = skill.get(player);
    const count = Object.keys(allSkills).filter(id => skillData[id]?.type === type).length;
    const setCount = skill.getSetSkills(player).filter(id => skillData[id]?.type === type).length;

    const form = new ActionFormData()
        .title(title)
        .body(`§2所持: §e${count}スキル  §2|  セット: ${color}${setCount}§2/${color}${max}`)
        .button(`§aセット管理\n§8装備するスキルを選ぶ (${setCount}/${max})`)
        .button(`§b一覧\n§8所持スキルを確認する (${count}個)`)
        .button("§2← 戻る");

    form.show(player).then(res => {
        if (res.canceled) return;
        if (res.selection === 0) showSetMenu(player, type);
        if (res.selection === 1) showListMenu(player, type);
        if (res.selection === 2) showSkillMenu(player);
    });
}

/**
 * セット管理メニュー (パッシブ/アクティブ共通)
 */
function showSetMenu(player, type) {
    const isPassive = type === 0;
    const max = isPassive ? config.maxPassiveSkills : config.maxActiveSkills;
    const color = isPassive ? "§a" : "§9";
    const typeIds = Object.keys(skill.get(player)).filter(id => skillData[id]?.type === type);
    const setSkills = skill.getSetSkills(player);
    const setCount = setSkills.filter(id => skillData[id]?.type === type).length;

    if (typeIds.length === 0) {
        new ActionFormData()
            .title("§l§6セット管理")
            .body(`§c習得した${isPassive ? "パッシブ" : "アクティブ"}スキルがありません。`)
            .button("§2戻る")
            .show(player).then(() => showTypeMenu(player, type));
        return;
    }

    const form = new ActionFormData()
        .title(`§l${color}セット管理  §r${color}${setCount}§2/§2${max}`)
        .body("§2スキルを押してセット / 解除できます\n§a●§2 = セット中  §c○§2 = 未セット");

    for (const id of typeIds) {
        const sd = skillData[id];
        const isSet = setSkills.includes(id);
        const prefix = isSet ? "§a● " : "§c○ ";
        form.button(`${prefix}§2${sd.name}\n§8${sd.description?.substring(0, 24) || ""}`);
    }
    form.button("§2← 戻る");

    form.show(player).then(res => {
        if (res.canceled) return;
        if (res.selection === typeIds.length) {
            showTypeMenu(player, type);
            return;
        }

        const selectedId = typeIds[res.selection];
        const isCurrentlySet = skill.isSet(player, selectedId);
        
        if (isCurrentlySet) {
            skill.unsetSkill(player, selectedId);
            player.sendMessage(`§2[Skill] §2${skillData[selectedId].name} §2のセットを解除しました。`);
        } else {
            const result = skill.setSkill(player, selectedId);
            if (result === true) {
                player.sendMessage(`§a[Skill] §2${skillData[selectedId].name} §aをセットしました。`);
            } else if (typeof result === "string") {
                player.sendMessage(result);
            }
        }
        showSetMenu(player, type);
    });
}

/**
 * 一覧メニュー (パッシブ/アクティブ共通)
 */
function showListMenu(player, type) {
    const isPassive = type === 0;
    const typeIds = Object.keys(skill.get(player)).filter(id => skillData[id]?.type === type);

    const form = new ActionFormData()
        .title(isPassive ? "§l§bパッシブスキル一覧" : "§l§bアクティブスキル一覧")
        .body(`§2習得済みスキル: §e${typeIds.length}個`);

    for (const id of typeIds) {
        const sd = skillData[id];
        const setTag = skill.isSet(player, id) ? " §a[SET]" : "";
        form.button(`§2${sd.name}${setTag}\n§8${sd.description?.substring(0, 24) || ""}`);
    }
    form.button("§2← 戻る");

    form.show(player).then(res => {
        if (res.canceled) return;
        if (res.selection === typeIds.length) {
            showTypeMenu(player, type);
            return;
        }
        showSkillDetail(player, typeIds[res.selection], () => showListMenu(player, type));
    });
}

/**
 * スキル詳細画面
 */
function showSkillDetail(player, skillId, backCallback) {
    const sd = skillData[skillId];
    if (!sd) { if (backCallback) backCallback(); return; }

    const varData = skill.get(player, skillId) || {};
    const stage = varData.stage !== undefined ? varData.stage : null;
    const isSet = skill.isSet(player, skillId);

    let displayName = sd.name;
    let levelLine = "";

    if (sd.level && stage !== null) {
        const cur = sd.level[stage];
        const next = sd.level[stage + 1];
        if (cur?.name) displayName += ` ${cur.name}`;
        levelLine = `\n§2レベル: §e${cur?.name ?? "-"} §2(${stage + 1} / ${sd.level.length})`;
        if (next) levelLine += `\n§2次: §b${next.name ?? "?"}`;
        else levelLine += "\n§6§lMAX LEVEL";
    }

    const lines = [
        `§2${sd.description ?? "説明なし"}`,
        levelLine,
        `\n§2状態: ${isSet ? "§a● セット中" : "§2○ 未セット"}`,
        sd.getdescription ? `§2習得条件: §2${sd.getdescription}` : null
    ].filter(l => l !== null).join("\n");

    new ActionFormData()
        .title(`§l§6${displayName}`)
        .body(lines)
        .button("§2戻る")
        .show(player).then(() => { if (backCallback) backCallback(); });
}

