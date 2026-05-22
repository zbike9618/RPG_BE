import * as server from "@minecraft/server";
import skill from "./skill";
import config from "../../../config";
import ActiveSkillSystem from "./activeSkillSystem";
import weapondata from "../../../weapon/weapondata";

const { world, system } = server;

/**
 * 右クリック（アイテム使用）時の処理
 */
world.afterEvents.itemUse.subscribe((ev) => {
    const player = ev.source;
    if (!player.isSneaking) return; // Shiftを押していない場合は通常使用

    const item = ev.itemStack;
    if (!isSkillTool(item)) return;

    system.run(() => {
        // Shift + 右クリック：スロット1のスキルを実行
        executeItemSkill(player, 0); // スロット1 (Index 0)
    });
});

/**
 * 左クリック（攻撃）時の処理
 * 攻撃開始イベントを使用してShift+左クリックを検知
 */
world.afterEvents.playerSwingStart.subscribe((ev) => {
    const player = ev.player;
    if (!player.isSneaking) return;
    if (ev.swingSource != server.EntitySwingSource.Attack) return;
    
    const item = ev.heldItemStack;
    if (!item || !isSkillTool(item)) return;

    system.run(() => {
        // Shift + 左クリック：スロット2のスキルを実行
        executeItemSkill(player, 1); // スロット2 (Index 1)
    });
});

/**
 * スキル実行の共通処理
 */
function executeItemSkill(player, slotIndex) {
    const slots = skill.getItemSlots(player);
    const selectedId = slots[slotIndex];

    if (!selectedId) {
        // スロットに何もない場合は何も表示しない（空振りを許容するため）
        return;
    }

    const skillVar = skill.get(player, selectedId);
    ActiveSkillSystem.execute(player, selectedId, skillVar);
}

/**
 * 対象アイテムかどうかの判定
 */
function isSkillTool(item) {
    if (!item) return false;
    // 設定されたタグを持っているかチェック
    for (const tag of config.skillToolTag) {
        if (item.getTags().includes(tag)) return true;
    }
    // weapondataに登録されている武器かチェック
    if (weapondata[item.typeId]) return true;
    
    return false;
}
