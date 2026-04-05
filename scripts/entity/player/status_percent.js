import { DyPro } from "../../dypro";

/*
  StatusModifier クラス - プレイヤーのステータスをn%上下させる一時補正を管理する

  DyProの保存形式 ("status_mod" key):
  {
      "str": [
          { "id": "fire_buff", "percent": 20 },   // str +20%
          { "id": "poison",    "percent": -10 }    // str -10%
      ],
      "def": [
          { "id": "armor_enchant", "percent": 15 }
      ]
  }

  使い方:
    // ステータスを一時的に上下させる (str +30%)
    StatusModifier.add(player, "str", "my_buff_id", 30);

    // 補正を解除する
    StatusModifier.remove(player, "str", "my_buff_id");

    // 現在の補正をstatus_setで加算する際の使い方
    const bonus = StatusModifier.calcBonus(player, "str", baseValue);
    // result = baseValue * (1 + sum_of_percent / 100)
*/

export default class StatusModifier {

    /**
     * ステータスにパーセント補正を追加する
     * @param {import("@minecraft/server").Entity} entity
     * @param {string} stat  対象ステータス名 ("str", "def", "maxhp" など)
     * @param {string} modId  補正の識別子 (例: "fire_buff_1")
     * @param {number} percent  補正率 (+20 → +20%, -10 → -10%)
     */
    static add(entity, stat, modId, percent) {
        const dypro = new DyPro("status_mod", entity);
        const data = dypro.get("mods") || {};
        if (!data[stat]) data[stat] = [];

        // 同IDが既にあれば上書き
        const existing = data[stat].findIndex(m => m.id === modId);
        if (existing >= 0) {
            data[stat][existing].percent = percent;
        } else {
            data[stat].push({ id: modId, percent });
        }
        dypro.set("mods", data);
    }

    /**
     * パーセント補正を解除する
     * @param {import("@minecraft/server").Entity} entity
     * @param {string} stat
     * @param {string} modId
     */
    static remove(entity, stat, modId) {
        const dypro = new DyPro("status_mod", entity);
        const data = dypro.get("mods") || {};
        if (!data[stat]) return;
        data[stat] = data[stat].filter(m => m.id !== modId);
        if (data[stat].length === 0) delete data[stat];
        dypro.set("mods", data);
    }

    /**
     * 特定IDの補正が存在するか確認する
     * @param {import("@minecraft/server").Entity} entity
     * @param {string} stat
     * @param {string} modId
     * @returns {boolean}
     */
    static has(entity, stat, modId) {
        const dypro = new DyPro("status_mod", entity);
        const data = dypro.get("mods") || {};
        return !!(data[stat]?.some(m => m.id === modId));
    }

    /**
     * 全補正を解除する
     * @param {import("@minecraft/server").Entity} entity
     * @param {string} [stat]  省略時は全ステータスをリセット
     */
    static clear(entity, stat) {
        const dypro = new DyPro("status_mod", entity);
        if (stat) {
            const data = dypro.get("mods") || {};
            delete data[stat];
            dypro.set("mods", data);
        } else {
            dypro.set("mods", {});
        }
    }

    /**
     * ベース値にパーセント補正を掛けた加算値を返す。
     * status_set.js の result に加算して使う。
     * 
     * 例: base=100, +20%と-10% → bonus = 100 * 0.10 = 10
     * 
     * @param {import("@minecraft/server").Entity} entity
     * @param {string} stat
     * @param {number} baseValue  元のステータス値（補正前）
     * @returns {number}  加算する値（小数切り捨て）
     */
    static calcBonus(entity, stat, baseValue) {
        const dypro = new DyPro("status_mod", entity);
        const data = dypro.get("mods") || {};
        const mods = data[stat];
        if (!mods || mods.length === 0) return 0;

        const totalPercent = mods.reduce((sum, m) => sum + m.percent, 0);
        return Math.floor(baseValue * totalPercent / 100);
    }

    /**
     * 現在の補正を全て取得する（デバッグ用）
     * @param {import("@minecraft/server").Entity} entity
     * @returns {Record<string, {id:string, percent:number}[]>}
     */
    static dump(entity) {
        const dypro = new DyPro("status_mod", entity);
        return dypro.get("mods") || {};
    }
}
