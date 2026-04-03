import * as server from "@minecraft/server";
import util from "../../util";
import { showStatus } from "./showStatus";
import jobdata from "./job/jobdata";
import { setStatus } from "./status_set";

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

/**
 * 指定されたレベル間に獲得するステータス上昇量の合計を計算する
 * @param {Object} currentJob 現在のジョブ定義オブジェクト
 * @param {number} oldLv 現在(上昇前)のレベル
 * @param {number} targetLv 目標のレベル
 * @returns {Record<string, number>} 上昇するステータスと量のオブジェクト
 */
export function getStatsGained(currentJob, oldLv, targetLv) {
    const statsGained = {};
    if (currentJob && Array.isArray(currentJob.regular)) {
        for (let currentLevel = oldLv + 1; currentLevel <= targetLv; currentLevel++) {
            for (const reg of currentJob.regular) {
                const step = reg.step || 1;
                if (currentLevel % step === 0 && reg.stats) {
                    for (const [stat, val] of Object.entries(reg.stats)) {
                        statsGained[stat] = (statsGained[stat] || 0) + val;
                    }
                }
            }
        }
    }
    return statsGained;
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

            // ジョブ情報を取得してステータス上昇分を計算
            const jobId = scutil.get(player, "rpg.job") || 0;
            const currentJob = jobdata[jobId] || jobdata[0];

            let gainedMessage = "";
            const statsGained = getStatsGained(currentJob, oldLv, lv);

            // 上昇したステータスをセーブスコアに加算
            for (const [stat, val] of Object.entries(statsGained)) {
                if (val > 0) {
                    const saveName = `rpg.${stat}_save`;
                    const curVal = scutil.get(player, saveName) || 0;
                    scutil.set(player, saveName, curVal + val);
                    
                    gainedMessage += `§a${stat.toUpperCase()} +${val}§r `;
                }
            }
            // すべてのセーブスコアを加算し終えたら一括で _do に反映
            setStatus(player);
            // 豪華なレベルアップ演出
            player.onScreenDisplay.setTitle("§eLEVEL UP!", {
                subtitle: `§fLv ${oldLv} => §aLv ${lv}`,
                fadeInDuration: 10,
                stayDuration: 60,
                fadeOutDuration: 20
            });
            player.sendMessage(`§eLEVEL UP! §fLv ${oldLv} => §aLv ${lv}`);
            if (gainedMessage !== "") {
                player.sendMessage(`§eステータス上昇: ${gainedMessage}`);
            }
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
