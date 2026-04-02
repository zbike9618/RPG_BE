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
                // 3番目以降の要素をすべて結合する（rpg.str_do のようにアンダースコアを含む名前対策）
                const reference = split.slice(2).join("_"); // "参照するEntityID#参照するステータス(数式可)"
                let refEntity;
                // 参照がある場合は、基本ダメージを無視して参照式から計算する
                if (reference && reference.includes("#")) {
                    const [refId, formula] = reference.split("#");

                    // エンティティIDから参照先を探す
                    refEntity = world.getEntity(refId);
                    if (!refEntity) {
                        refEntity = world.getAllPlayers().find(p => p.id === refId || p.name === refId);
                    }

                    if (refEntity) {
                        // 数式内の "rpg.xxx" をそれぞれのスコア値に置換 (大文字・小文字・アンダースコア・数字に対応)
                        const statRegex = /rpg\.[a-zA-Z0-9_]+/g;
                        let evaluatedFormula = formula;
                        const statsInFormula = formula.match(statRegex) || [];

                        // 長い名前から順に置換することで、部分一致による置換ミス（rpg.str_do を rpg.str で置換等）を防ぐ
                        statsInFormula.sort((a, b) => b.length - a.length);

                        for (const stat of statsInFormula) {
                            const val = scutil.get(refEntity, stat) ?? 0;
                            const escapedStat = stat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            evaluatedFormula = evaluatedFormula.replace(new RegExp(escapedStat, "g"), String(val));
                        }

                        // 安全に数式を評価してダメージを決定
                        let evalDamage = simpleEval(evaluatedFormula);
                        
                        // プレイヤーからの攻撃なら±10%のダメージばらつきを付与
                        if (refEntity.typeId === "minecraft:player") {
                            const variance = 1 + (Math.random() * 0.2 - 0.1); // 0.9 ~ 1.1
                            damage = Math.floor(evalDamage * variance);
                        } else {
                            damage = Math.floor(evalDamage);
                        }
                    } else {
                        damage = 0;
                    }
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
