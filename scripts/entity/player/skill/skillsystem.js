import * as server from "@minecraft/server";
import util from "../../../util";
import skillData from "./skillData";
import skill from "./skill";

const { world, system } = server;

export default class SkillSystem {
    /**
     * 値や計算式を評価する
     * @param {import("@minecraft/server").Player} player
     * @param {string} valStr 例: "#attack.damage * v.level"
     * @param {Record<string, any>} skillVar スキルの保有変数
     * @returns {number}
     */
    static evaluateValue(player, valStr, skillVar) {
        let str = String(valStr);
        // 変数の置換 (v.levelなど)
        if (skillVar) {
            for (const [k, v] of Object.entries(skillVar)) {
                str = str.replace(new RegExp(`v\\.${k}`, "g"), String(v));
            }
        }
        // ステータスの置換 (#status.hpなど)
        str = str.replace(/#status\.([a-zA-Z0-9_]+)/g, (match, p1) => {
            const val = util.score.get(player, `rpg.${p1}`) ?? util.score.get(player, `rpg.${p1}_do`) ?? 0;
            return String(val);
        });
        return util.simpleEval(str);
    }

    /**
     * 条件リストを満たしているかの判定
     * @param {import("@minecraft/server").Player} player 
     * @param {any[]} conditions 
     * @param {Record<string, any>} context (イベント発生時の情報 例: {"attack.damage": 50})
     * @param {Record<string, any>} skillVar 
     * @returns {boolean}
     */
    static checkConditions(player, conditions, context = {}, skillVar = {}) {
        if (!conditions || conditions.length === 0) return true;

        for (const cond of conditions) {
            // カスタムプロパティ (例: selfby, target など) が JSON 側で指定されていれば、コンテキスト(イベント元の送信データ)と完全に一致するかチェック
            for (const key of Object.keys(cond)) {
                if (["type", "operation", "value", "value2"].includes(key)) continue;
                if (cond[key] !== context[key]) return false;
            }

            // もし operation (比較演算子) が定義されていない条件なら、イベント発火トリガー専用ブロックと見なしてスキップ(true扱い)する
            if (!cond.operation) continue;

            let valA = String(cond.value);
            let valB = Number(cond.value2);

            // コンテキスト変数の置換 (例: #attack.damage)
            for (const [k, v] of Object.entries(context)) {
                valA = valA.replace(new RegExp(`#${k}`, "g"), String(v));
            }

            let finalA = this.evaluateValue(player, valA, skillVar);

            switch (cond.operation) {
                case "==": if (!(finalA === valB)) return false; break;
                case ">=": if (!(finalA >= valB)) return false; break;
                case "<=": if (!(finalA <= valB)) return false; break;
                case ">": if (!(finalA > valB)) return false; break;
                case "<": if (!(finalA < valB)) return false; break;
            }
        }
        return true;
    }

    /**
     * 指定したイベントタイプでスキルシステムを駆動・発火させる
     * @param {import("@minecraft/server").Player} player 
     * @param {string} eventType "always", "attack", "death", "status" など
     * @param {Record<string, any>} context イベント時の情報
     */
    static trigger(player, eventType, context = {}) {
        for (const [sId, sData] of Object.entries(skillData)) {
            // --- 1. 未習得の場合：習得(getconditions)チェック ---
            if (!skill.have(player, sId)) {
                const getCond = sData.sc?.getconditions;
                if (getCond && getCond.length > 0) {
                    const hasRelevantTrigger = getCond.some(c => c.type === eventType || c.type === "status");
                    if (hasRelevantTrigger) {
                        if (this.checkConditions(player, getCond, context, {})) {
                            // 習得
                            const initialVar = sData.variable ? { ...sData.variable } : {};
                            skill.add(player, sId, initialVar);
                            player.sendMessage(`§e[Skill] スキル『${sData.name}』を習得した！`);
                        }
                    }
                }
            } 
            // --- 2. 習得済みの場合：レベルアップ（進化）＆発動チェック ---
            else {
                let mySkillVar = skill.get(player, sId) || {};
                
                // 【進化チェック】
                const levels = sData.level;
                if (levels && levels.length > 0) {
                    for (const lvlData of levels) {
                        const evoCond = lvlData.evoconditions;
                        if (evoCond && evoCond.length > 0) {
                            const hasRelevantTrigger = evoCond.some(c => c.type === eventType || c.type === "status");
                            if (hasRelevantTrigger) {
                                if (this.checkConditions(player, evoCond, context, mySkillVar)) {
                                    // そのレベルに到達済みか(変数をカバーしているか)チェック
                                    let needsUpgrade = false;
                                    for (const [k, v] of Object.entries(lvlData.variable || {})) {
                                         if ((mySkillVar[k] || 0) < v) { needsUpgrade = true; break; }
                                    }
                                    if (needsUpgrade) {
                                         for (const [k, v] of Object.entries(lvlData.variable || {})) {
                                             mySkillVar[k] = v;
                                         }
                                         skill.add(player, sId, mySkillVar); // セーブ
                                         player.sendMessage(`§a[Skill] スキル『${sData.name}』が進行した！ [${lvlData.name}]`);
                                    }
                                }
                            }
                        }
                    }
                }

                // 【発動チェック】
                const runCond = sData.sc?.conditions;
                let shouldRun = false;
                if (!runCond || runCond.length === 0) {
                    // 発動条件の記載が全くなければ、とりあえず許容（パッシブなど）
                    shouldRun = true;
                } else {
                    if (runCond.some(c => c.type === eventType)) {
                         shouldRun = this.checkConditions(player, runCond, context, mySkillVar);
                    }
                }

                // "always" は継続ステータス加算側で処理するため、瞬間的なリザルト反映は弾く
                if (shouldRun && eventType !== "always") {
                    this.executeResult(player, sData.sc?.result, mySkillVar);
                }
            }
        }
    }

    /**
     * リザルト処理(HPのセット、特殊ダメージなど)
     */
    static executeResult(player, result, skillVar) {
        if (!result) return;
        const scutil = util.score;
        
        if (result.status) {
            if (result.status.add) {
                for (const addData of result.status.add) {
                    const val = this.evaluateValue(player, addData.value, skillVar);
                    // str等は rpg.str_do に加算
                    const scoreName = `rpg.${addData.type}${addData.type === "hp" || addData.type === "mp" ? "" : "_do"}`;
                    const cur = scutil.get(player, scoreName) || 0;
                    scutil.set(player, scoreName, cur + Math.floor(val));
                }
            }
            if (result.status.set) {
                for (const setData of result.status.set) {
                    const val = this.evaluateValue(player, setData.value, skillVar);
                    const scoreName = `rpg.${setData.type}${setData.type === "hp" || setData.type === "mp" ? "" : "_do"}`;
                    scutil.set(player, scoreName, Math.floor(val));
                }
            }
        }
    }

    /**
     * 常時発動系 (type: "always") のステータス上昇値を合計して返す
     * 例: status_set.js のステータス再計算時に呼び出す
     * @param {import("@minecraft/server").Player} player 
     * @param {string} statType "str", "hp" など
     */
    static calcPassiveBonus(player, statType) {
        let total = 0;
        const allSkills = skill.get(player);
        for (const [sId, mySkillVar] of Object.entries(allSkills)) {
            const sData = skillData[sId];
            if (!sData || !sData.sc) continue;
            
            const conds = sData.sc.conditions;
            const isAlways = !conds || conds.length === 0 || conds.some(c => c.type === "always");
            
            if (isAlways) {
                const addList = sData.sc.result?.status?.add;
                if (addList) {
                    for (const addData of addList) {
                        if (addData.type === statType) {
                            total += this.evaluateValue(player, addData.value, mySkillVar);
                        }
                    }
                }
            }
        }
        return total;
    }
}
