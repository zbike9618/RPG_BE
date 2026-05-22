import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import weapondata from "../../../weapon/weapondata";
import config from "../../../config";
import skill from "./skill";
import skillData from "./skillData";

/**
 * スキルメニューのトップ画面 (タイプ選択)
 * @param {import("@minecraft/server").Player} player
 */
export function showSkillMenu(player) {
    const form = new ActionFormData()
        .title("§l§6スキルメニュー")
        .body("§2スキルのタイプを選択してください")
        .button("§aパッシブスキル\n§8プレイヤーの常時効果")
        .button("§9アクティブスキル\n§8各武器にセットするスキル");

    form.show(player).then(res => {
        if (res.canceled || res.selection === undefined) return;
        if (res.selection === 0) showTypeMenu(player, 0);
        if (res.selection === 1) showWeaponSkillEditor(player);
    });
}

/**
 * インベントリ内の武器をドロップダウンで選択して編集する画面
 */
function showWeaponSkillEditor(player) {
    const container = player.getComponent("minecraft:inventory").container;
    const validWeapons = []; // { slot: number, item: ItemStack, name: string }

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item && weapondata[item.typeId]) {
            validWeapons.push({
                slot: i,
                item: item,
                name: item.typeId.split(":")[1].replace(/_/g, " ").toUpperCase()
            });
        }
    }

    if (validWeapons.length === 0) {
        player.sendMessage("§c[Skill] 設定可能な武器（weapondata登録済み）がインベントリにありません。");
        return;
    }

    const modal = new ModalFormData()
        .title("§l§e武器スキル詳細設定")
        .dropdown("§2編集する武器を選択してください (スロット番号: 名前)", validWeapons.map(w => `Slot ${w.slot}: ${w.name}`));

    modal.show(player).then(res => {
        if (res.canceled || res.formValues === undefined) return;
        const selectedWeapon = validWeapons[res.formValues[0]];

        // 選択された武器の編集画面へ (一時的に選択スロットをその武器に合わせてからメニューを開くか、専用のslotIndex対応版setSkillを呼ぶ)
        // ここでは、一時的に selectedSlotIndex を変更して既存の showSetMenu を使い回すか、
        // もしくはアイテムを直接引数に取る新しい UI を作成します。

        showItemSlotEditor(player, selectedWeapon);
    });
}

/**
 * 特定のアイテムスロットに対するスキル編集画面
 */
function showItemSlotEditor(player, weaponData) {
    const { slot, item, name } = weaponData;
    const data = item.getDynamicProperty("rpg:skills");
    let itemSet = [null, null];
    try {
        itemSet = data ? JSON.parse(data) : [null, null];
    } catch { itemSet = [null, null]; }

    const form = new ActionFormData()
        .title(`§l§e${name} §rの設定`)
        .body(`§2スロット 1: §f${skillData[itemSet[0]]?.name || "未セット"}\n§2スロット 2: §f${skillData[itemSet[1]]?.name || "未セット"}`)
        .button("§9スロット 1 を編集")
        .button("§9スロット 2 を編集")
        .button("§cスキルを全て外す")
        .button("§2← 戻る");

    form.show(player).then(res => {
        if (res.canceled) return;
        if (res.selection === 0) showSkillPickerForItem(player, weaponData, 0);
        if (res.selection === 1) showSkillPickerForItem(player, weaponData, 1);
        if (res.selection === 2) {
            item.setDynamicProperty("rpg:skills", JSON.stringify([null, null]));
            player.getComponent("minecraft:inventory").container.setItem(slot, item);
            player.sendMessage(`§a[Skill] ${name} の全スキルを解除しました。`);
            showItemSlotEditor(player, weaponData);
        }
        if (res.selection === 3) showWeaponSkillEditor(player);
    });
}

/**
 * 特定のアイテムのスロットにセットするスキルを選択する画面
 */
function showSkillPickerForItem(player, weaponData, slotIndex) {
    const { slot, item, name } = weaponData;
    const allSkills = skill.get(player);
    const activeIds = Object.keys(allSkills).filter(id => skillData[id]?.type === 1);

    const form = new ActionFormData()
        .title(`§l§9スロット ${slotIndex + 1} の選択`)
        .body(`§e${name} §rにセットするスキルを選んでください`);

    for (const id of activeIds) {
        form.button(`§2${skillData[id].name}`);
    }
    form.button("§c解除する");
    form.button("§2← 戻る");

    form.show(player).then(res => {
        if (res.canceled) return;
        if (res.selection === activeIds.length + 1) {
            showItemSlotEditor(player, weaponData);
            return;
        }

        const container = player.getComponent("minecraft:inventory").container;
        const currentItem = container.getItem(slot); // 最新の状態を取得
        if (!currentItem) return;

        let itemSet = [null, null];
        try {
            const data = currentItem.getDynamicProperty("rpg:skills");
            itemSet = data ? JSON.parse(data) : [null, null];
        } catch { itemSet = [null, null]; }

        if (res.selection === activeIds.length) {
            // 解除
            itemSet[slotIndex] = null;
        } else {
            // セット
            const selectedId = activeIds[res.selection];
            // 重複チェック
            if (itemSet.includes(selectedId) && itemSet.indexOf(selectedId) !== slotIndex) {
                player.sendMessage("§c[Skill] 別のスロットに既にセットされています。");
            } else {
                itemSet[slotIndex] = selectedId;
            }
        }

        currentItem.setDynamicProperty("rpg:skills", JSON.stringify(itemSet));
        container.setItem(slot, currentItem);
        showItemSlotEditor(player, { ...weaponData, item: currentItem });
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

    const item = player.getComponent("minecraft:inventory")?.container.getItem(player.selectedSlotIndex);
    const itemName = item ? item.typeId.split(":")[1].replace(/_/g, " ").toUpperCase() : "None";

    const form = new ActionFormData()
        .title(`§l${color}セット管理  §r${color}${setCount}§2/§2${max}`)
        .body(`§2対象アイテム: §e${itemName}\n§7※アクティブスキルは手に持っているアイテムに保存されます\n\n§2スキルを押してセット / 解除できます\n§a●§2 = セット中  §c○§2 = 未セット`);

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
            showSetMenu(player, type);
        } else {
            if (type === 1) {
                // アクティブスキルの場合はスロット選択へ
                const slots = skill.getItemSlots(player);
                const slotMenu = new ActionFormData()
                    .title("§l§9スロット選択")
                    .body(`§2セットするスロットを選んでください\n\n§7スロット1: §f${skillData[slots[0]]?.name || "空き"}\n§7スロット2: §f${skillData[slots[1]]?.name || "空き"}`)
                    .button("§9スロット 1")
                    .button("§9スロット 2")
                    .button("§2← 戻る");

                slotMenu.show(player).then(slotRes => {
                    if (slotRes.canceled || slotRes.selection === 2) {
                        showSetMenu(player, type);
                        return;
                    }
                    const result = skill.setSkill(player, selectedId, slotRes.selection);
                    if (result === true) {
                        player.sendMessage(`§a[Skill] §2${skillData[selectedId].name} §aをスロット${slotRes.selection + 1}にセットしました。`);
                    } else if (typeof result === "string") {
                        player.sendMessage(result);
                    }
                    showSetMenu(player, type);
                });
            } else {
                // パッシブスキル
                const result = skill.setSkill(player, selectedId);
                if (result === true) {
                    player.sendMessage(`§a[Skill] §2${skillData[selectedId].name} §aをセットしました。`);
                } else if (typeof result === "string") {
                    player.sendMessage(result);
                }
                showSetMenu(player, type);
            }
        }
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

