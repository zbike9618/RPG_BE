import { DyPro } from "../../../dypro";

export default class KillTracker {
    /**
     * キルデータを取得する
     * @param {import("@minecraft/server").Player} player 
     * @returns {{total: number, mobs: Record<string, number>, families: Record<string, number>}}
     */
    static _getData(player) {
        const dp = new DyPro("rpg", player);
        const data = dp.get("kill_data");
        if (data && typeof data === "object") {
            return {
                total: data.total || 0,
                mobs: data.mobs || {},
                families: data.families || {}
            };
        }
        return { total: 0, mobs: {}, families: {} };
    }

    /**
     * キルデータを保存する
     * @param {import("@minecraft/server").Player} player 
     * @param {any} data 
     */
    static _setData(player, data) {
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
        const data = this._getData(player);
        
        data.total = (data.total || 0) + 1;
        data.mobs[mobId] = (data.mobs[mobId] || 0) + 1;
        
        for (const f of families) {
            data.families[f] = (data.families[f] || 0) + 1;
        }

        this._setData(player, data);
    }

    /**
     * 条件に応じた討伐数を取得する
     * @param {import("@minecraft/server").Player} player 
     * @param {{target?: string, target_family?: string}} filter 
     * @returns {number}
     */
    static getCount(player, filter = {}) {
        const data = this._getData(player);
        if (filter.target) {
            return data.mobs[filter.target] || 0;
        }
        if (filter.target_family) {
            return data.families[filter.target_family] || 0;
        }
        return data.total || 0;
    }

    /**
     * 全体の合計討伐数を取得する
     */
    static getTotal(player) {
        return this._getData(player).total || 0;
    }

    /**
     * 特定のIDの討伐数を取得する
     */
    static getById(player, mobId) {
        return this._getData(player).mobs[mobId] || 0;
    }
}
