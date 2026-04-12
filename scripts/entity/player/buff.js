import { system } from "@minecraft/server";
import Memory from "../memory";
import { DyPro } from "../../dypro";

/**
 * 永続的なバフ管理クラス
 * Memoryクラス(スコアボード)とDyPro(DynamicProperties)を併用
 */
export default class Buff {
    /**
     * バフを付与または更新する
     * @param {import("@minecraft/server").Player} player 対象プレイヤー
     * @param {string} id バフの識別子 (例: "atk_up_1")
     * @param {string} type 影響するパラメータ名 (例: "str", "agi", "atk" 等)
     * @param {number} value 付与する数値または割合
     * @param {"value"|"percent"} mode "value" (固定値加算) または "percent" (割合加算)
     * @param {number} durationSec 有効時間（秒）
     */
    static add(player, id, type, value, mode, durationSec) {
        if (!player || !player.isValid) return;

        // メタデータを DyPro に保存
        const dp = new DyPro("buff_meta", player);
        const meta = dp.get("data") || {};
        meta[id] = { type, value, mode };
        dp.set("data", meta);

        // 終了時刻を Memory (スコアボード) に保存
        // 秒単位のタイムスタンプを使用 (32bit Scoreboard上限内)
        const memId = `bf_${id}`;
        const endTime = Math.floor(Date.now() / 1000) + durationSec;

        if (!Memory.has(player, memId)) {
            if (!Memory.use(player, memId)) {
                // スロット不足の場合は何もしないか、一番古いものを消すなどの処理が必要
                // ここでは単純に失敗とする
                player.sendMessage("§c[Buff] メモリが不足しているためバフを付与できませんでした");
                return;
            }
        }
        Memory.set(player, memId, endTime);
    }

    /**
     * 指定したパラメータタイプの合計ボーナスを取得する
     * @param {import("@minecraft/server").Player} player 
     * @param {string} type 
     * @returns {{ value: number, percent: number }} 合計値と合計割合
     */
    static getBonus(player, type) {
        if (!player || !player.isValid) return { value: 0, percent: 0 };

        const slots = Memory.dump(player);
        const nowSec = Math.floor(Date.now() / 1000);
        let sumValue = 0;
        let sumPercent = 0;

        const dp = new DyPro("buff_meta", player);
        const meta = dp.get("data") || {};
        let changed = false;

        for (const slot of slots) {
            if (slot.id.startsWith("bf_") && slot.value > 0) {
                const buffId = slot.id.substring(3);
                if (slot.value > nowSec) {
                    const b = meta[buffId];
                    if (b && b.type === type) {
                        if (b.mode === "value") sumValue += b.value;
                        else if (b.mode === "percent") sumPercent += b.value;
                    }
                } else {
                    // 期限切れ
                    Memory.free(player, slot.id);
                    delete meta[buffId];
                    changed = true;
                }
            }
        }

        if (changed) dp.set("data", meta);
        return { value: sumValue, percent: sumPercent };
    }

    /**
     * プレイヤーの現在の全バフリストを取得する
     * @param {import("@minecraft/server").Player} player 
     */
    static getList(player) {
        if (!player || !player.isValid) return [];

        const slots = Memory.dump(player);
        const nowSec = Math.floor(Date.now() / 1000);
        const dp = new DyPro("buff_meta", player);
        const meta = dp.get("data") || {};
        const result = [];

        for (const slot of slots) {
            if (slot.id.startsWith("bf_") && slot.value > 0) {
                const buffId = slot.id.substring(3);
                if (slot.value > nowSec) {
                    const b = meta[buffId];
                    if (b) {
                        result.push({
                            id: buffId,
                            ...b,
                            remaining: slot.value - nowSec
                        });
                    }
                }
            }
        }
        return result;
    }

    /**
     * 指定したバフを強制解除する
     * @param {import("@minecraft/server").Player} player 
     * @param {string} id 
     */
    static remove(player, id) {
        if (!player) return;
        const memId = `bf_${id}`;
        Memory.free(player, memId);

        const dp = new DyPro("buff_meta", player);
        const meta = dp.get("data") || {};
        delete meta[id];
        dp.set("data", meta);
    }
}