import * as server from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import skill from "./skill";
import skillData from "./skillData";

const { world, system } = server;

const MAX_SET = 5;

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
        if (res.selection === 0) showPassiveMenu(player);
        if (res.selection === 1) showActiveMenu(player);
    });
}

// ==============================================
// パッシブスキル
// ==============================================

/**
 * パッシブスキルのサブメニュー
 */
function showPassiveMenu(player) {
    const allSkills = skill.get(player);
    const passiveCount = Object.keys(allSkills).filter(id => skillData[id]?.type === 0).length;
    const setCount = skill.getSetSkills(player).filter(id => skillData[id]?.type === 0).length;

    const form = new ActionFormData()
        .title("§l§aパッシブスキル")
        .body(`§2所持: §e${passiveCount}スキル  §2|  セット: §a${setCount}§2/§a${MAX_SET}`)
        .button(`§aセット管理\n§8装備するスキルを選ぶ (${setCount}/${MAX_SET})`)
        .button(`§b一覧\n§8所持スキルを確認する (${passiveCount}個)`)
        .button("§2← 戻る");

    form.show(player).then(res => {
        if (res.canceled) return;
        if (res.selection === 0) showPassiveSetMenu(player);
        if (res.selection === 1) showPassiveListMenu(player);
        if (res.selection === 2) showSkillMenu(player);
    });
}

/**
 * パッシブスキル セット管理メニュー
 * ● = セット中 (緑), ○ = 未セット (赤)
 */
function showPassiveSetMenu(player) {
    const allSkills = skill.get(player);
    const passiveIds = Object.keys(allSkills).filter(id => skillData[id]?.type === 0);
    const setSkills = skill.getSetSkills(player);
    const setCount = setSkills.filter(id => skillData[id]?.type === 0).length;

    if (passiveIds.length === 0) {
        new ActionFormData()
            .title("§l§6セット管理")
            .body("§c習得したパッシブスキルがありません。")
            .button("§2戻る")
            .show(player).then(() => showPassiveMenu(player));
        return;
    }

    const form = new ActionFormData()
        .title(`§l§aセット管理  §r§a${setCount}§2/§2${MAX_SET}`)
        .body("§2スキルを押してセット / 解除できます\n§a●§2 = セット中  §c○§2 = 未セット");

    for (const id of passiveIds) {
        const sd = skillData[id];
        const varData = allSkills[id] || {};
        const stage = varData.stage !== undefined ? varData.stage : null;

        let displayName = sd.name;
        if (sd.level && stage !== null && sd.level[stage]?.name) {
            displayName += ` §2[§e${sd.level[stage].name}§2]`;
        }

        const isSet = skill.isSet(player, id);
        const prefix = isSet ? "§a● " : "§c○ ";
        const desc = sd.description ? sd.description.substring(0, 24) : "";
        form.button(`${prefix}§2${displayName}\n§8${desc}`);
    }
    form.button("§2← 戻る");

    form.show(player).then(res => {
        if (res.canceled) return;
        if (res.selection === passiveIds.length) {
            showPassiveMenu(player);
            return;
        }

        const selectedId = passiveIds[res.selection];
        const isSet = skill.isSet(player, selectedId);
        const currentSetCount = skill.getSetSkills(player).filter(id => skillData[id]?.type === 0).length;
        const sdName = skillData[selectedId]?.name ?? selectedId;

        if (isSet) {
            // 解除
            skill.unsetSkill(player, selectedId);
            player.sendMessage(`§2[スキル] §2${sdName} §2のセットを解除しました`);
            showPassiveSetMenu(player);
        } else {
            // セット追加
            if (currentSetCount >= MAX_SET) {
                new ActionFormData()
                    .title("§c§lセット上限")
                    .body(`§cセットできるスキルは最大 §l${MAX_SET}個§r§c までです。\n先に別のスキルを解除してください。`)
                    .button("§2戻る")
                    .show(player).then(() => showPassiveSetMenu(player));
                return;
            }
            skill.setSkill(player, selectedId);
            player.sendMessage(`§a[スキル] §2${sdName} §aをセットしました`);
            showPassiveSetMenu(player);
        }
    });
}

/**
 * パッシブスキル 一覧メニュー
 * スキルをタップすると詳細が表示される
 */
function showPassiveListMenu(player) {
    const allSkills = skill.get(player);
    const passiveIds = Object.keys(allSkills).filter(id => skillData[id]?.type === 0);

    if (passiveIds.length === 0) {
        new ActionFormData()
            .title("§l§6スキル一覧")
            .body("§c習得したパッシブスキルがありません。")
            .button("§2戻る")
            .show(player).then(() => showPassiveMenu(player));
        return;
    }

    const form = new ActionFormData()
        .title("§l§bパッシブスキル一覧")
        .body(`§2習得済みスキル: §e${passiveIds.length}個`);

    for (const id of passiveIds) {
        const sd = skillData[id];
        const varData = allSkills[id] || {};
        const stage = varData.stage !== undefined ? varData.stage : null;

        let displayName = sd.name;
        let levelTag = "";
        if (sd.level && stage !== null && sd.level[stage]?.name) {
            levelTag = ` §e[${sd.level[stage].name}]`;
        }
        const isMax = sd.level ? stage === sd.level.length - 1 : false;
        const maxTag = isMax ? " §6[MAX]" : "";
        const setTag = skill.isSet(player, id) ? " §a[SET]" : "";

        const desc = sd.description ? sd.description.substring(0, 24) : "";
        form.button(`§2${displayName}${levelTag}${maxTag}${setTag}\n§8${desc}`);
    }
    form.button("§2← 戻る");

    form.show(player).then(res => {
        if (res.canceled) return;
        if (res.selection === passiveIds.length) {
            showPassiveMenu(player);
            return;
        }
        // 詳細表示 → 戻ったら一覧に戻る
        showSkillDetail(player, passiveIds[res.selection], () => showPassiveListMenu(player));
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
        if (next) {
            levelLine += `\n§2次: §b${next.name ?? "?"}`;
        } else {
            levelLine += "\n§6§lMAX LEVEL";
        }
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

// ==============================================
// アクティブスキル (未実装)
// ==============================================

function showActiveMenu(player) {
    new ActionFormData()
        .title("§l§9アクティブスキル")
        .body("§2アクティブスキルは現在準備中です。")
        .button("§2戻る")
        .show(player).then(() => showSkillMenu(player));
}
