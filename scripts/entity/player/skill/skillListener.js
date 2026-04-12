import { world, system } from "@minecraft/server";
import skill from "./skill";
import config from "../../../config";
import ActiveSkillSystem from "./activeSkillSystem";

/**
 * スキルの操作（選択、実行）を監視するリスナー
 */
world.afterEvents.itemUse.subscribe((ev) => {
    const player = ev.source;
    const item = ev.itemStack;

    // config.js で指定されたタグを持つアイテムのみ反応させる
    // (例: 魔法の杖や魔導書など)
    let isSkillTool = false;
    for (const tag of config.skillToolTag) {
        if (item.getTags().includes(tag)) {
            isSkillTool = true;
            break;
        }
    }
    if (!isSkillTool) return;
    const block = player.getBlockFromViewDirection({ maxDistance: 5 })
    if (block) {
        return;
    }

    // デフォルトの使用（食べる、投げる等）をキャンセル
    system.run(() => {
        if (!player.isSneaking) {
            // 【シフト右クリック：スキルの実行】
            const selectedId = skill.getSelectedSkill(player);
            if (!selectedId) {
                player.sendMessage("§c[Skill] スキルが選択されていません。");
                return;
            }
            const skillVar = skill.get(player, selectedId);

            // MP消費などの共通処理が必要な場合はここに追加
            // 例: if (MP < cost) return;

            ActiveSkillSystem.execute(player, selectedId, skillVar);
        } else {

            skill.cycleSelectedSkill(player);
        }
    });
});

// もしユーザーが「シフト+右クリック」だけで全て完結させたい場合（例：空打ちで変更、何かに向かってで実行など）は
// 要望に合わせて調整が必要ですが、一般的には「通常右クリで切替」「シフト右クリで発動」が直感的です。
