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
        // キル統計の置換 (個別キル数を優先)
        str = str.replace(/#kill_count/g, () => {
            if (skillVar && skillVar.kill_count !== undefined) {
                return String(skillVar.kill_count);
            }
            return String(KillTracker.getTotal(player));
        });
        str = str.replace(/#kill_total/g, () => String(KillTracker.getTotal(player)));
        str = str.replace(/#kill\.([a-zA-Z0-9_:]+)/g, (match, p1) => {
            const cleanMobId = p1.replace(/:/g, "_");
            if (skillVar && skillVar[`kill_${cleanMobId}`] !== undefined) {
                return String(skillVar[`kill_${cleanMobId}`]);
            }
            return String(KillTracker.getById(player, p1));
        });

        // ステータスの置換 (#status.hpなど)
        str = str.replace(/#status\.([a-zA-Z0-9_]+)/g, (match, p1) => {
            // _do (補正後) -> _save (基礎値) -> Raw の順で検索
            const val = util.score.get(player, `rpg.${p1}_do`) ?? util.score.get(player, `rpg.${p1}_save`) ?? util.score.get(player, `rpg.${p1}`) ?? 0;
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
     * 条件式文字列を評価するヘルパー
     * @param {import("@minecraft/server").Player} player
     * @param {string} condStr 例: "#status.mp >= 5 && #status.hp < #status.maxhp"
     * @param {Record<string, any>} context
     * @param {Record<string, any>} skillVar
     * @returns {boolean}
     */
    static checkStringCondition(player, condStr, context = {}, skillVar = {}) {
        const parts = condStr.split("&&");
        for (let part of parts) {
            part = part.trim();
            const match = part.match(/(>=|<=|!=|==|>|<)/);
            if (!match) {
                // 演算子がない場合、式の評価値が0以外なら真
                const val = this.evaluateValue(player, part, skillVar);
                if (!val) return false;
                continue;
            }
            const op = match[1];
            const index = part.indexOf(op);
            let leftStr = part.substring(0, index).trim();
            let rightStr = part.substring(index + op.length).trim();

            let currentContext = { ...context };
            // killイベント時の特別処理
            if (part.includes("#kill_count") && context.kill_count === undefined) {
                currentContext["kill_count"] = KillTracker.getCount(player, { type: "kill" });
            }

            for (const [k, v] of Object.entries(currentContext)) {
                leftStr = leftStr.replace(new RegExp(`#${k}`, "g"), String(v));
                rightStr = rightStr.replace(new RegExp(`#${k}`, "g"), String(v));
            }

            const leftVal = this.evaluateValue(player, leftStr, skillVar);
            const rightVal = this.evaluateValue(player, rightStr, skillVar);

            switch (op) {
                case "==": if (leftVal !== rightVal) return false; break;
                case "!=": if (leftVal === rightVal) return false; break;
                case ">=": if (leftVal < rightVal) return false; break;
                case "<=": if (leftVal > rightVal) return false; break;
                case ">": if (leftVal <= rightVal) return false; break;
                case "<": if (leftVal >= rightVal) return false; break;
            }
        }
        return true;
    }

    /**
     * 条件リストが指定したイベントタイプに関連しているか判定
     * @param {any} conditions
     * @param {string} eventType
     * @returns {boolean}
     */
    static isTriggerRelevant(conditions, eventType) {
        if (!conditions) return false;
        const condList = Array.isArray(conditions) ? conditions : [conditions];

        for (const cond of condList) {
            if (typeof cond === "string") {
                if (eventType === "status" && cond.includes("#status")) return true;
                if (eventType === "kill" && (cond.includes("#kill_count") || cond.includes("#kill_total") || cond.includes("#kill."))) return true;
                if (eventType === "attack" && cond.includes("#attack")) return true;
                if (eventType === "death" && cond.includes("#death")) return true;
                // キーワードがない場合は status 時に判定する
                if (eventType === "status") return true;
            } else if (typeof cond === "object" && cond !== null) {
                if (cond.type === eventType) return true;
                if (eventType === "status" && (!cond.type || cond.type === "status")) return true;
            }
        }
        return false;
    }

    /**
     * 条件リストを満たしているかの判定
     * @param {import("@minecraft/server").Player} player 
     * @param {any} conditions 
     * @param {Record<string, any>} context (イベント発生時の情報 例: {"attack.damage": 50})
     * @param {Record<string, any>} skillVar 
     * @returns {boolean}
     */
    static checkConditions(player, conditions, context = {}, skillVar = {}) {
        if (!conditions) return true;

        const condList = Array.isArray(conditions) ? conditions : [conditions];
        if (condList.length === 0) return true;

        for (const cond of condList) {
            if (typeof cond === "string") {
                if (!this.checkStringCondition(player, cond, context, skillVar)) {
                    return false;
                }
            } else if (typeof cond === "object" && cond !== null) {
                // カスタムプロパティ (例: selfby, target など) が JSON 側で指定されていれば、コンテキスト(イベント元の送信データ)と完全に一致するかチェック
                let isContextMatch = true;
                for (const key of Object.keys(cond)) {
                    if (["type", "operation", "value", "value2"].includes(key)) continue;
                    if (cond[key] !== context[key]) {
                        isContextMatch = false;
                        break;
                    }
                }
                if (!isContextMatch) return false;

                // もし operation (比較演算子) が定義されていない条件なら、イベント発火トリガー専用ブロックと見なしてスキップ(true扱い)する
                if (cond.operation === undefined) continue;

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
                    case ">": if (!(finalA > finalB)) return false; break;
                    case "<": if (!(finalA < finalB)) return false; break;
                }
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
        // --- キルイベント時：スキル個別のキルカウンターを加算 ---
        if (eventType === "kill") {
            const mobId = context.target;
            for (const [sId, sData] of Object.entries(skillData)) {
                const getCond = sData.sc?.getconditions;
                const levels = sData.level || [];
                const currentVar = skill.get(player, sId) || {};
                const stage = currentVar.stage || 0;
                const evoCond = levels[stage]?.evoconditions;

                const hasKillCond = (getCond && this.isTriggerRelevant(getCond, "kill")) ||
                    (evoCond && this.isTriggerRelevant(evoCond, "kill"));

                if (hasKillCond) {
                    const mySkillVar = skill.get(player, sId) || {};
                    mySkillVar.kill_count = (mySkillVar.kill_count || 0) + 1;

                    if (mobId) {
                        const cleanMobId = mobId.replace(/:/g, "_");
                        mySkillVar[`kill_${cleanMobId}`] = (mySkillVar[`kill_${cleanMobId}`] || 0) + 1;
                    }
                    skill.add(player, sId, mySkillVar); // 保存
                }
            }
        }

        for (const [sId, sData] of Object.entries(skillData)) {
            // --- 1. 未習得の場合：習得(getconditions)チェック ---
            if (!skill.have(player, sId)) {
                const getCond = sData.sc?.getconditions;
                if (getCond) {
                    const hasRelevantTrigger = this.isTriggerRelevant(getCond, eventType);
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
                    if (currentLvlData && currentLvlData.evoconditions) {
                        const evoCond = currentLvlData.evoconditions;
                        const hasRelevantTrigger = this.isTriggerRelevant(evoCond, eventType);

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

                // --- イベント別特化コールバック関数の実行 ---
                if (typeof sData[eventType] === "function") {
                    try {
                        sData[eventType](player, context, mySkillVar);
                        skill.add(player, sId, mySkillVar);
                    } catch (e) {
                        console.error(`[Skill System] Error in callback '${eventType}' for skill '${sId}':`, e);
                    }
                }

                // tickIntervalのチェック (常時発動型 / status時)
                if (sData.sc?.tickInterval) {
                    const lastRunKey = `last_run_${sId}`;
                    const lastRun = Memory.get(player, lastRunKey) || 0;
                    const currentTick = system.currentTick;
                    if (currentTick - lastRun < sData.sc.tickInterval) {
                        continue;
                    }
                }

                // cooldownのチェック
                if (sData.sc?.cooldown) {
                    const cooldownKey = `cool_${sId}`;
                    const currentTick = system.currentTick;
                    const coolEnd = Memory.get(player, cooldownKey) || 0;
                    if (coolEnd > currentTick) {
                        continue;
                    }
                }

                const runCond = sData.sc?.conditions;
                let shouldRun = false;
                if (!runCond || (Array.isArray(runCond) ? runCond.length === 0 : runCond === "")) {
                    shouldRun = true;
                } else {
                    if (this.isTriggerRelevant(runCond, eventType)) {
                        shouldRun = this.checkConditions(player, runCond, context, mySkillVar);
                    }
                }

                if (shouldRun) {
                    const isPassive = !runCond || (Array.isArray(runCond) ? runCond.length === 0 : runCond === "");

                    // tickInterval / cooldown の更新
                    if (sData.sc?.tickInterval) {
                        Memory.set(player, `last_run_${sId}`, system.currentTick);
                    }
                    if (sData.sc?.cooldown) {
                        Memory.set(player, `cool_${sId}`, system.currentTick + (sData.sc.cooldown * 20));
                    }

                    const scData = sData.sc || {};
                    const result = scData.result;
                    const effects = scData.effects;

                    // 共通のアクション定義 (sc 直下と旧 sc.effects 内の両方をカバー)
                    const actions = {
                        commands: scData.commands || effects?.commands,
                        message: scData.message || effects?.message,
                        potion: scData.potion || effects?.potion,
                        script: scData.script || effects?.script
                    };

                    if (isPassive) {
                        // パッシブスキル: hp/mp の add/set のみ 非可逆で直接適用する
                        // str 等の add は calcPassiveBonus で処理するためここでは除外

                        // 従来の result.status.add
                        const hpMpAdds = (result?.status?.add || []).filter(a => a.type === "hp" || a.type === "mp");
                        if (hpMpAdds.length > 0) {
                            this.executeResult(player, { status: { add: hpMpAdds } }, mySkillVar);
                        }
                        if (result?.status?.set) {
                            this.executeResult(player, { status: { set: result.status.set } }, mySkillVar);
                        }

                        // 新しい effects.add
                        if (effects?.add) {
                            const hpMpNewAdds = {};
                            if (effects.add.hp !== undefined) hpMpNewAdds.hp = effects.add.hp;
                            if (effects.add.mp !== undefined) hpMpNewAdds.mp = effects.add.mp;
                            if (Object.keys(hpMpNewAdds).length > 0) {
                                this.executeResult(player, { effects: { add: hpMpNewAdds } }, mySkillVar);
                            }
                        }
                        if (effects?.set) {
                            this.executeResult(player, { effects: { set: effects.set } }, mySkillVar);
                        }

                        // アクションを実行
                        if (actions.commands || actions.message || actions.potion || actions.script) {
                            this.executeActions(player, actions, mySkillVar);
                        }
                    } else {
                        // イベント発動型スキル: 全ての result / effects / アクションを適用する
                        if (result) this.executeResult(player, result, mySkillVar);
                        if (effects) this.executeResult(player, { effects }, mySkillVar);

                        if (actions.commands || actions.message || actions.potion || actions.script) {
                            this.executeActions(player, actions, mySkillVar);
                        }
                    }
                }
            }
        }
    }

    /**
     * 文字列内の変数を評価して置換するヘルパー
     * @param {import("@minecraft/server").Player} player
     * @param {string} str
     * @param {Record<string, any>} skillVar
     * @returns {string}
     */
    static evaluateStringValue(player, str, skillVar) {
        let res = String(str);
        if (skillVar) {
            for (const [k, v] of Object.entries(skillVar)) {
                res = res.replace(new RegExp(`v\\.${k}`, "g"), String(v));
            }
        }
        res = res.replace(/#kill_count/g, () => {
            if (skillVar && skillVar.kill_count !== undefined) {
                return String(skillVar.kill_count);
            }
            return String(KillTracker.getTotal(player));
        });
        res = res.replace(/#kill_total/g, () => String(KillTracker.getTotal(player)));
        res = res.replace(/#kill\.([a-zA-Z0-9_:]+)/g, (match, p1) => {
            const cleanMobId = p1.replace(/:/g, "_");
            if (skillVar && skillVar[`kill_${cleanMobId}`] !== undefined) {
                return String(skillVar[`kill_${cleanMobId}`]);
            }
            return String(KillTracker.getById(player, p1));
        });
        res = res.replace(/#status\.([a-zA-Z0-9_]+)/g, (match, p1) => {
            const val = util.score.get(player, `rpg.${p1}_do`) ?? util.score.get(player, `rpg.${p1}_save`) ?? util.score.get(player, `rpg.${p1}`) ?? 0;
            return String(val);
        });
        res = res.replace(/#memory\.([a-zA-Z0-9_]+)/g, (match, p1) => String(Memory.get(player, p1) ?? 0));
        return res;
    }

    /**
     * リザルト処理(HPのセット、特殊ダメージなど)
     */
    static executeResult(player, result, skillVar) {
        if (!result) return;
        const scutil = util.score;

        const runStatusEffect = (type, list) => {
            if (!list) return;
            const normList = [];
            if (Array.isArray(list)) {
                normList.push(...list);
            } else if (typeof list === "object") {
                for (const [t, val] of Object.entries(list)) {
                    normList.push({ type: t, value: val });
                }
            }

            for (const data of normList) {
                const val = this.evaluateValue(player, data.value, skillVar);
                if (type === "add") {
                    const scoreName = `rpg.${data.type}${data.type === "hp" || data.type === "mp" ? "" : "_do"}`;
                    const cur = scutil.get(player, scoreName) || 0;
                    scutil.set(player, scoreName, cur + Math.floor(val));
                } else if (type === "set") {
                    const scoreName = `rpg.${data.type}${data.type === "hp" || data.type === "mp" ? "" : "_do"}`;
                    scutil.set(player, scoreName, Math.floor(val));
                } else if (type === "percent") {
                    const modId = data.id || `skill_evt_${data.type}`;
                    StatusModifier.add(player, data.type, modId, Math.floor(val));
                }
            }
        };

        // 1. 従来の status.add / set / percent 処理
        if (result.status) {
            runStatusEffect("add", result.status.add);
            runStatusEffect("set", result.status.set);
            runStatusEffect("percent", result.status.percent);
        }

        // 2. 新しい effects 処理
        if (result.effects) {
            runStatusEffect("add", result.effects.add);
            runStatusEffect("set", result.effects.set);
            runStatusEffect("percent", result.effects.percent);
        }
    }

    /**
     * アクションの実行（コマンド、ポーション、メッセージ、スクリプトなど）
     */
    static executeActions(player, actions, skillVar) {
        if (!actions) return;

        // 1. コマンド実行
        if (actions.commands) {
            const cmdList = Array.isArray(actions.commands) ? actions.commands : [actions.commands];
            for (const cmd of cmdList) {
                let finalCmd = cmd;
                finalCmd = this.evaluateStringValue(player, finalCmd, skillVar);
                try {
                    player.runCommand(finalCmd);
                } catch (e) {
                    console.warn(`Command failed: ${finalCmd}, Error: ${e}`);
                }
            }
        }

        // 2. メッセージ送信
        if (actions.message) {
            const msg = actions.message;
            if (msg.chat) {
                player.sendMessage(this.evaluateStringValue(player, msg.chat, skillVar));
            }
            if (msg.actionbar) {
                player.onScreenDisplay.setActionBar(this.evaluateStringValue(player, msg.actionbar, skillVar));
            }
            if (msg.title) {
                player.onScreenDisplay.setTitle(this.evaluateStringValue(player, msg.title, skillVar), {
                    subtitle: msg.subtitle ? this.evaluateStringValue(player, msg.subtitle, skillVar) : ""
                });
            }
        }

        // 3. ポーション効果付与
        if (actions.potion) {
            const potionList = Array.isArray(actions.potion) ? actions.potion : [actions.potion];
            for (const pot of potionList) {
                const dur = typeof pot.duration === "string" ? this.evaluateValue(player, pot.duration, skillVar) : (pot.duration || 5);
                const amp = typeof pot.amplifier === "string" ? this.evaluateValue(player, pot.amplifier, skillVar) : (pot.amplifier || 0);
                const show = pot.showParticles !== undefined ? pot.showParticles : true;
                try {
                    player.addEffect(pot.id, Math.floor(dur * 20), {
                        amplifier: Math.floor(amp),
                        showParticles: show
                    });
                } catch (e) {
                    console.warn(`Failed to add effect ${pot.id}: ${e}`);
                }
            }
        }

        // 4. JavaScript 実行 (eval/new Function)
        if (actions.script) {
            this.executeScript(player, actions.script, skillVar);
        }
    }

    /**
     * JavaScriptコードの文字列を評価・実行する (eval/new Function)
     */
    static executeScript(player, scriptStr, skillVar) {
        try {
            const fn = new Function("player", "skillVar", "server", "util", scriptStr);
            fn(player, skillVar, server, util);
        } catch (e) {
            console.warn(`[Skill System] Script execution failed in skill '${skillVar.id || "unknown"}': ${e}`);
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

            // 1. 従来の result.status.percent
            const percentList = sData.sc.result?.status?.percent;
            if (percentList) {
                for (const pData of percentList) {
                    const modId = pData.id || `skill_${sId}_${pData.type}`;
                    if (isActive) {
                        const val = this.evaluateValue(player, pData.value, mySkillVar);
                        StatusModifier.add(player, pData.type, modId, Math.floor(val));
                    } else {
                        StatusModifier.remove(player, pData.type, modId);
                    }
                }
            }

            // 2. 新しい sc.effects.percent
            const newPercent = sData.sc.effects?.percent;
            if (newPercent) {
                for (const [type, value] of Object.entries(newPercent)) {
                    const modId = `skill_${sId}_${type}`;
                    if (isActive) {
                        const val = this.evaluateValue(player, value, mySkillVar);
                        StatusModifier.add(player, type, modId, Math.floor(val));
                    } else {
                        StatusModifier.remove(player, type, modId);
                    }
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
                // 1. 従来の result.status.add
                const addList = sData.sc.result?.status?.add;
                if (addList) {
                    for (const addData of addList) {
                        if (addData.type === statType) {
                            total += this.evaluateValue(player, addData.value, mySkillVar);
                        }
                    }
                }

                // 2. 新しい sc.effects.add
                const newAdd = sData.sc.effects?.add;
                if (newAdd) {
                    for (const [type, value] of Object.entries(newAdd)) {
                        if (type === statType) {
                            total += this.evaluateValue(player, value, mySkillVar);
                        }
                    }
                }
            }
        }
        return total;
    }
}
