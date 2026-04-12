import * as server from "@minecraft/server";
import util from "../../../util";
import skillData from "./skillData";
import skill from "./skill";
import StatusModifier from "../status_percent";
import Memory from "../../memory";
import KillTracker from "../kill/killTracker";

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
        // キル統計の置換 (#kill_total, #kill.minecraft:zombie など)
        str = str.replace(/#kill_total/g, () => String(KillTracker.getTotal(player)));
        str = str.replace(/#kill\.([a-zA-Z0-9_:]+)/g, (match, p1) => {
            return String(KillTracker.getById(player, p1));
        });

        // ステータスの置換 (#status.hpなど)
        str = str.replace(/#status\.([a-zA-Z0-9_]+)/g, (match, p1) => {
            const val = util.score.get(player, `rpg.${p1}`) ?? util.score.get(player, `rpg.${p1}_do`) ?? 0;
            return String(val);
        });
        // メモリの置換 (#memory.kill_countなど)
        str = str.replace(/#memory\.([a-zA-Z0-9_]+)/g, (match, p1) => {
            const val = Memory.get(player, p1);
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
            let valB = String(cond.value2);

            // コンテキスト変数の置換 (例: #attack.damage)
            let currentContext = { ...context };

            // 特殊処理: killイベント時の #kill_count を条件に合わせて上書き
            if (cond.type === "kill") {
                currentContext["kill_count"] = KillTracker.getCount(player, cond);
            }

            for (const [k, v] of Object.entries(currentContext)) {
                valA = valA.replace(new RegExp(`#${k}`, "g"), String(v));
                valB = valB.replace(new RegExp(`#${k}`, "g"), String(v));
            }

            let finalA = this.evaluateValue(player, valA, skillVar);
            let finalB = this.evaluateValue(player, valB, skillVar);

            switch (cond.operation) {
                case "==": if (!(finalA === finalB)) return false; break;
                case ">=": if (!(finalA >= finalB)) return false; break;
                case "<=": if (!(finalA <= finalB)) return false; break;
                case ">":  if (!(finalA >  finalB)) return false; break;
                case "<":  if (!(finalA <  finalB)) return false; break;
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
                    const hasRelevantTrigger = getCond.some(c => c.type === eventType || c.type === "status" || c.type === "kill");
                    if (hasRelevantTrigger) {
                        if (this.checkConditions(player, getCond, context, {})) {
                            // 習得初期化
                            const initialVar = sData.variable ? { ...sData.variable } : {};
                            
                            // レベル配列があれば、最初の段階(index 0)からスタートする
                            let displayName = sData.name;
                            if (sData.level && sData.level.length > 0) {
                                initialVar.stage = 0; // 進化段階を0からスタート
                                Object.assign(initialVar, sData.level[0].variable || {});
                                if (sData.level[0].name) {
                                    displayName = `${sData.name} ${sData.level[0].name}`;
                                }
                            }
                            
                            skill.add(player, sId, initialVar);
                            player.sendMessage(`§e[Skill] スキル『${displayName}』を習得した！`);
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
                    const stage = mySkillVar.stage !== undefined ? mySkillVar.stage : 0;
                    const currentLvlData = levels[stage];
                    
                    // 現在の段階の evo (進化条件) をチェックして、満たせば次の段階へ進む
                    if (currentLvlData && currentLvlData.evoconditions && currentLvlData.evoconditions.length > 0) {
                        const evoCond = currentLvlData.evoconditions;
                        const hasRelevantTrigger = evoCond.some(c => c.type === eventType || c.type === "status" || c.type === "kill");
                        
                        if (hasRelevantTrigger) {
                            if (this.checkConditions(player, evoCond, context, mySkillVar)) {
                                const nextStage = stage + 1;
                                if (levels[nextStage]) {
                                    const nextLvlData = levels[nextStage];
                                    mySkillVar.stage = nextStage;
                                    // 変数を上書き
                                    Object.assign(mySkillVar, nextLvlData.variable || {});
                                    
                                    skill.add(player, sId, mySkillVar); // セーブ
                                    const nextName = nextLvlData.name ? ` ${nextLvlData.name}` : "";
                                    player.sendMessage(`§a[Skill] スキル『${sData.name}${nextName}』に成長した！`);
                                }
                            }
                        }
                    }
                }

                // 【発動チェック】セットされているスキルのみ発動する
                if (!skill.isSet(player, sId)) continue;

                const runCond = sData.sc?.conditions;
                let shouldRun = false;
                if (!runCond || runCond.length === 0) {
                    shouldRun = true;
                } else {
                    if (runCond.some(c => c.type === eventType)) {
                         shouldRun = this.checkConditions(player, runCond, context, mySkillVar);
                    }
                }

                if (shouldRun) {
                    const isPassive = !runCond || runCond.length === 0;

                    if (isPassive) {
                        // パッシブスキル: hp/mp の add のみ 非可逆で直接適用する
                        // str 等の add は calcPassiveBonus で処理するためここでは除外
                        const result = sData.sc?.result;
                        const hpMpAdds = (result?.status?.add || []).filter(a => a.type === "hp" || a.type === "mp");
                        if (hpMpAdds.length > 0) {
                            this.executeResult(player, { status: { add: hpMpAdds } }, mySkillVar);
                        }
                        // set と percent はそのまま適用（refreshPassivePercent で処理済みなので上書きになる）
                        if (result?.status?.set) {
                            this.executeResult(player, { status: { set: result.status.set } }, mySkillVar);
                        }
                    } else {
                        // イベント発動型スキル: 全ての result を適用する
                        this.executeResult(player, sData.sc?.result, mySkillVar);
                    }
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
            // パーセント補正
            if (result.status.percent) {
                for (const pData of result.status.percent) {
                    const val = this.evaluateValue(player, pData.value, skillVar);
                    const modId = pData.id || `skill_evt_${pData.type}`;
                    StatusModifier.add(player, pData.type, modId, Math.floor(val));
                }
            }
        }
    }

    /**
     * パッシブスキル (type:"always") の percent 補正を StatusModifier へ反映する
     * status_set.js の setStatus 開始時に呼び出す
     * @param {import("@minecraft/server").Player} player
     */
    static refreshPassivePercent(player) {
        const allSkills = skill.get(player);
        for (const [sId, mySkillVar] of Object.entries(allSkills)) {
            const sData = skillData[sId];
            // type: 0 (パッシブ) かつ sc を持つもののみ対象
            if (!sData || !sData.sc || sData.type !== 0) continue;

            // セットされていないスキルは無視
            if (!skill.isSet(player, sId)) continue;

            // 条件チェック (空の場合は true)
            const conds = sData.sc.conditions;
            const isActive = this.checkConditions(player, conds, {}, mySkillVar);

            const percentList = sData.sc.result?.status?.percent;
            if (!percentList) continue;

            for (const pData of percentList) {
                const modId = pData.id || `skill_${sId}_${pData.type}`;
                if (isActive) {
                    const val = this.evaluateValue(player, pData.value, mySkillVar);
                    StatusModifier.add(player, pData.type, modId, Math.floor(val));
                } else {
                    // 条件を満たしていない場合は補正を解除
                    StatusModifier.remove(player, pData.type, modId);
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
        // hp と mp は非可逆な改変として trigger -> executeResult で処理するため、ここでは入れない
        if (statType === "hp" || statType === "mp") return 0;

        let total = 0;
        const allSkills = skill.get(player);
        for (const [sId, mySkillVar] of Object.entries(allSkills)) {
            const sData = skillData[sId];
            if (!sData || !sData.sc || sData.type !== 0) continue;
            if (!skill.isSet(player, sId)) continue;

            // 条件チェック
            const conds = sData.sc.conditions;
            const isActive = this.checkConditions(player, conds, {}, mySkillVar);

            if (isActive) {
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
