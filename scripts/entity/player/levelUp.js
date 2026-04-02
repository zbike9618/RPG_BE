import * as server from "@minecraft/server";
import util from "../../util";
import { showStatus } from "./showStatus";

const { world, system } = server;

/**
 * 次のレベルに上がるために必要な経験値を計算する
 * @param {number} currentLevel 現在のレベル
 * @returns {number} 必要な経験値
 */
export function getRequiredExp(currentLevel) {
    // 二次関数 (10 * Lv^2 + 20 * Lv + 20) を用いた計算
    // 例: Lv1=50, Lv2=100, Lv3=170, Lv4=260...
    return Math.floor(10 * Math.pow(currentLevel, 2) + 20 * currentLevel + 20);
}

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) continue;

        const scutil = util.score;
        let exp = scutil.get(player, "rpg.exp") || 0;
        let lv = scutil.get(player, "rpg.level") || 1;
        const oldLv = lv;

        // レベルアップ判定ループ (一気に大量のEXPを得た場合のため)
        let leveledUp = false;

        while (true) {
            const reqExp = getRequiredExp(lv);
            if (exp >= reqExp) {
                // 必要な経験値を消費してレベルアップ
                exp -= reqExp;
                lv++;
                leveledUp = true;
            } else {
                break;
            }
        }

        // もしレベルが上がっていたら保存して演出を流す
        if (leveledUp) {
            scutil.set(player, "rpg.exp", exp);
            scutil.set(player, "rpg.level", lv);

            // 豪華なレベルアップ演出
            player.onScreenDisplay.setTitle("§eLEVEL UP!", {
                subtitle: `§fLv ${oldLv} => §aLv ${lv}`,
                fadeInDuration: 10,
                stayDuration: 60,
                fadeOutDuration: 20
            });
            player.sendMessage(`§eLEVEL UP! §fLv ${oldLv} => §aLv ${lv}`);
            showStatus(player, "chat");
            player.playSound("random.levelup", { volume: 1.0, pitch: 1.0 });

            // パーティクルで祝福
            util.expandParticle(player.dimension, {
                x: player.location.x,
                y: player.location.y + 1,
                z: player.location.z
            }, 30, 3, "minecraft:totem_particle");
        }
    }
}, 10);
