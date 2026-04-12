import { DyPro } from "../../../dypro";
import Memory from "../../memory";

export default class KillTracker {
    /**
     * キルデータを取得する (詳細なモブ別討伐数)
     * @param {import("@minecraft/server").Player} player 
     * @returns {{mobs: Record<string, number>, families: Record<string, number>}}
     */
    static _getDetailData(player) {
        const dp = new DyPro("rpg", player);
        const data = dp.get("kill_data");
        if (data && typeof data === "object") {
            return {
                mobs: data.mobs || {},
                families: data.families || {}
            };
        }
        return { mobs: {}, families: {} };
    }

    /**
     * キルデータを保存する (詳細なモブ別討伐数)
     * @param {import("@minecraft/server").Player} player 
     * @param {any} data 
     */
    static _setDetailData(player, data) {
        const dp = new DyPro("rpg", player);
        dp.set("kill_data", data);
    }

    /**
     * 討伐数を加算する
     * @param {import("@minecraft/server").Player} player 
     * @param {string} mobId 
     * @param {string[]} families 
     */
    static increment(player, mobId, families = []) {
        // 合計カウントは Memory システムを使用 (スコアボード同期)
        Memory.increment(player, "kill_count", 1);

        // 詳細カウントは DyPro で管理
        const detail = this._getDetailData(player);
        detail.mobs[mobId] = (detail.mobs[mobId] || 0) + 1;
        
        for (const f of families) {
            detail.families[f] = (detail.families[f] || 0) + 1;
        }

        this._setDetailData(player, detail);
    }

    /**
     * 条件に応じた討伐数を取得する
     * @param {import("@minecraft/server").Player} player 
     * @param {{target?: string, target_family?: string}} filter 
     * @returns {number}
     */
    static getCount(player, filter = {}) {
        if (filter.target) {
            return this.getById(player, filter.target);
        }
        if (filter.target_family) {
            const detail = this._getDetailData(player);
            return detail.families[filter.target_family] || 0;
        }
        // フィルターがない場合は合計数を Memory から取得
        return this.getTotal(player);
    }

    /**
     * 全体の合計討伐数を取得する (Memoryから)
     */
    static getTotal(player) {
        return Memory.get(player, "kill_count");
    }

    /**
     * 特定のIDの討伐数を取得する (DyProから)
     */
    static getById(player, mobId) {
        return this._getDetailData(player).mobs[mobId] || 0;
    }
}
