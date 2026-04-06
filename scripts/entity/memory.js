import * as server from "@minecraft/server";
import { DyPro } from "../dypro";
import util from "../util";
const { world, system } = server;

/*
memoryの形式 (DyProに保存)
{
    "0": "id-string",  // スロット0 → id
    "1": "",             // 空スロット
    ...
}
スコアボード: rpg.memory_{n+1} にスロットnの数値を格納
*/

export default class Memory {
    static memoryAmount = 16;

    /**
     * 空きスロットを確保する
     * @param {import("@minecraft/server").Entity} entity 
     * @returns {string | null} 割り当てたid、空きなしならnull
     */
    static use(entity, id) {
        const dypro = new DyPro("memory", entity);
        const memoryData = dypro.get("memory") || getInitialData(this.memoryAmount);
        if (Object.values(memoryData).includes(id)) {
            return false;
        }
        for (let i = 0; i < this.memoryAmount; i++) {
            const key = String(i);
            if (!memoryData[key]) {

                memoryData[key] = id;
                dypro.set("memory", memoryData);
                return true;
            }
        }
        return false; // 空きなし
    }

    /**
     * idからスロットIDを取得する (内部用)
     * @param {import("@minecraft/server").Entity} entity 
     * @param {string} id 
     * @returns {number | null}
     */
    static getSlotId(entity, id) {
        const dypro = new DyPro("memory", entity);
        const memoryData = dypro.get("memory");
        if (!memoryData) return null;

        for (let i = 0; i < this.memoryAmount; i++) {
            if (memoryData[String(i)] === id) return i;
        }
        return null;
    }

    /**
     * idのスロットに数値をセットする
     * @param {import("@minecraft/server").Entity} entity 
     * @param {string} id 
     * @param {number} value 
     */
    static set(entity, id, value) {
        const slotId = this.getSlotId(entity, id);
        if (slotId === null) return;
        util.score.set(entity, `rpg.memory_${slotId + 1}`, value);
    }

    /**
     * idのスロットの数値を取得する
     * @param {import("@minecraft/server").Entity} entity 
     * @param {string} id 
     * @returns {number}
     */
    static get(entity, id) {
        const slotId = this.getSlotId(entity, id);
        if (slotId === null) return 0;
        return util.score.get(entity, `rpg.memory_${slotId + 1}`) || 0;
    }

    /**
     * idのスロットの数値を加算する（未割り当てなら割り当てる）
     * @param {import("@minecraft/server").Entity} entity 
     * @param {string} id 
     * @param {number} amount 
     */
    static increment(entity, id, amount = 1) {
        if (!this.has(entity, id)) {
            this.use(entity, id);
        }
        const current = this.get(entity, id);
        this.set(entity, id, current + amount);
    }
    static has(entity, id) {
        const slotId = this.getSlotId(entity, id);
        if (slotId === null) return false;
        return true;
    }

    /**
     * スロットを解放する（id削除＋スコアリセット）
     * @param {import("@minecraft/server").Entity} entity 
     * @param {string} id 
     */
    static free(entity, id) {
        const dypro = new DyPro("memory", entity);
        const memoryData = dypro.get("memory");
        if (!memoryData) return;

        for (let i = 0; i < this.memoryAmount; i++) {
            const key = String(i);
            if (memoryData[key] === id) {
                memoryData[key] = "";
                dypro.set("memory", memoryData);
                util.score.set(entity, `rpg.memory_${i + 1}`, 0);
                return;
            }
        }
    }

    /**
     * 全スロットの状態を取得する（デバッグ用）
     * @param {import("@minecraft/server").Entity} entity 
     * @returns {{ slotId: number, id: string, value: number }[]}
     */
    static dump(entity) {
        const dypro = new DyPro("memory", entity);
        const memoryData = dypro.get("memory") || {};
        const result = [];
        for (let i = 0; i < this.memoryAmount; i++) {
            const id = memoryData[String(i)] || "";
            const value = util.score.get(entity, `rpg.memory_${i + 1}`) || 0;
            result.push({ slotId: i, id, value });
        }
        return result;
    }
}

/**
 * @param {number} c スロット数
 * @returns {Record<string, string>}
 */
function getInitialData(c) {
    const data = {};
    for (let i = 0; i < c; i++) {
        data[String(i)] = "";
    }
    return data;
}
