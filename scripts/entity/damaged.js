import * as server from "@minecraft/server";
import util from "../util";
import { applyHPbar } from "./mob/hpbar";
import { damageIndicator } from "./mob/damageIndicator";
const { world, system } = server;

/**
 * 文字列の数式を安全に計算する (Restricted execution対策)
 * @param {string} str 
 */
function simpleEval(str) {
    try {
        const tokens = str.replace(/\s/g, '').match(/(\d+\.?\d*)|([\+\-\*\/])/g);
        if (!tokens) return 0;
        let values = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token === "*" || token === "/") {
                const last = parseFloat(values.pop());
                const next = parseFloat(tokens[++i]);
                values.push(token === "*" ? last * next : last / next);
            } else {
                values.push(token);
            }
        }
        let result = parseFloat(values[0]);
        for (let i = 1; i < values.length; i += 2) {
            const op = values[i];
            const val = parseFloat(values[i + 1]);
            if (op === "+") result += val;
            if (op === "-") result -= val;
        }
        return isNaN(result) ? 0 : result;
    } catch (e) { return 0; }
}

system.runInterval(() => {
    const entities = [
        ...world.getAllPlayers(),
        ...world.getDimension("overworld").getEntities({ families: ["mob"] })
    ];
    for (const entity of entities) {
        if (!entity.isValid) continue;
        const family = entity.getComponent("minecraft:type_family");
        if (entity.typeId !== "minecraft:player" && (!family || !family.hasTypeFamily("mob"))) continue;
        const scutil = util.score

        // 無敵時間のカウントダウン処理
        let invincibility = scutil.get(entity, "rpg.invincibility") || 0;
        if (invincibility > 0) {
            scutil.set(entity, "rpg.invincibility", invincibility - 1);
        }

        // HPバー表示タイマーのカウントダウン処理
        let hpbarTimer = scutil.get(entity, "rpg.hpbar_timer") || 0;
        if (hpbarTimer > 0) {
            if (hpbarTimer === 1) {
                entity.nameTag = ""; // 5秒経過で非表示
            }
            scutil.set(entity, "rpg.hpbar_timer", hpbarTimer - 1);
        }
        const tags = entity.getTags();
        for (const tag of tags) {
            // tagは rpg:damaged_"ダメージ"_"参照するEntityID#参照するステータス"  3番目はなくてもよい
            if (tag.startsWith("rpg:damaged_")) {
                // 無敵時間中の場合はダメージを無効化してタグのみ削除
                if (invincibility > 0) {
                    entity.removeTag(tag);
                    continue;
                }

                const split = tag.split("_");
                let damage = parseInt(split[1]);

                // tagData は damagerId または damagerId#formula の形式
                const tagData = split.slice(2).join("_");

                let refEntity = null;
                let formula = null;

                if (tagData) {
                    let damagerId = tagData;
                    if (tagData.includes("#")) {
                        const parts = tagData.split("#");
                        damagerId = parts[0];
                        // 複数#が含まれる可能性は低いが安全のため結合
                        formula = parts.slice(1).join("#");
                    }

                    if (damagerId !== "none") {
                        refEntity = world.getEntity(damagerId);
                        if (!refEntity) {
                            refEntity = world.getAllPlayers().find(p => p.id === damagerId || p.name === damagerId);
                        }
                    }
                }

                // 数式がある場合は基本ダメージを上書きして評価
                if (refEntity && formula) {
                    const statRegex = /rpg\.[a-zA-Z0-9_]+/g;
                    let evaluatedFormula = formula;
                    const statsInFormula = formula.match(statRegex) || [];

                    statsInFormula.sort((a, b) => b.length - a.length);

                    for (const stat of statsInFormula) {
                        const val = scutil.get(refEntity, stat) ?? 0;
                        const escapedStat = stat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        evaluatedFormula = evaluatedFormula.replace(new RegExp(escapedStat, "g"), String(val));
                    }
                    damage = simpleEval(evaluatedFormula);
                }

                // プレイヤーからの攻撃なら±10%のダメージばらつきを付与
                if (refEntity && refEntity.typeId === "minecraft:player") {
                    const variance = 1 + (Math.random() * 0.2 - 0.1); // 0.9 ~ 1.1
                    damage = Math.floor(damage * variance);
                } else {
                    damage = Math.floor(damage);
                }

                // --- 攻撃者側の判定 (クリティカル等) ---
                if (refEntity && refEntity.isValid) {
                    // ジャンプアタック(落下中)判定
                    const vel = refEntity.getVelocity();
                    if (!refEntity.isOnGround && vel.y < 0) {
                        const luk = scutil.get(refEntity, "rpg.luk_do") || 0;
                        const critProb = luk / 1500 + 0.3 // ★ここにクリティカル率の計算

                        if (Math.random() < critProb) {
                            damage = Math.floor(damage * 1.5); // 1.5倍ダメージ
                            refEntity.sendMessage("§6CRITICAL HIT!");
                            util.expandParticle(entity.dimension, {
                                x: entity.location.x,
                                y: entity.location.y + 1,
                                z: entity.location.z
                            }, 10, 2, "minecraft:magic_critical_hit_emitter");
                            refEntity.playSound("random.anvil_land");
                        }
                    }
                }

                const currentHp = scutil.get(entity, "rpg.hp") ?? 20;

                // --- プレイヤー専用: 回避判定 (Dodge) ---
                if (entity.typeId === "minecraft:player") {
                    const agi = scutil.get(entity, "rpg.agi_do") || 0;
                    const dodgeProb = Math.min(agi / 1000, 0.5); // ★ここに回避率の計算を入れてください (例: agi / 1000)

                    if (Math.random() < dodgeProb) {
                        damage = 0;
                        entity.sendMessage("§fひらりと身をかわした");
                    }

                }
                const def = scutil.get(entity, "rpg.def_do") || 0;
                //----防御判定---------
                if (damage > 0 && def > 0) {
                    // 防御力の数値分だけダメージを減算。最低でも1ダメージは与える(0にはならない)
                    if (def >= damage * 3) {
                        damage = 1;
                    }
                    else {

                        damage = Math.floor((damage * 200) / (def * 2 + 200));
                    }
                }


                const nextHp = currentHp - damage;
                scutil.set(entity, "rpg.hp", nextHp);


                // ダメージ適用後に無敵時間を付与（10チック = 0.5秒）
                scutil.set(entity, "rpg.invincibility", 10);

                // HPバーの表示タイマーをセット（100チック = 5秒）
                scutil.set(entity, "rpg.hpbar_timer", 100);

                if (entity.typeId !== "minecraft:player") {
                    applyHPbar(entity);
                }
                damageIndicator(entity, damage);



                // タグを削除
                entity.removeTag(tag);
            }
        }
    }
})
