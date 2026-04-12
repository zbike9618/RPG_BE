import * as server from "@minecraft/server";
import util from "../util";
import { applyHPbar } from "./mob/hpbar";
import { damageIndicator } from "./mob/damageIndicator";
import entityPatch from "./entityPatch";
import SkillSystem from "./player/skill/skillsystem";
import Memory from "./memory";
import { DyPro } from "../dypro";
const { world, system } = server;

// simpleEvalは util.js 側に移行しました

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
        let invincibility = 0;
        // 無敵時間のカウントダウン処理

        if (Memory.has(entity, "invincibility")) {
            invincibility = Memory.get(entity, "invincibility");
            if (invincibility > 0) {
                Memory.set(entity, "invincibility", invincibility - 1);
            }
            else {
                Memory.free(entity, "invincibility")
            }
        }
        if (entity.typeId != "minecraft:player") {
            // HPバー表示タイマーのカウントダウン処理
            if (Memory.use(entity, "hpbar_timer") || Memory.has(entity, "hpbar_timer")) {
                let hpbarTimer = Memory.get(entity, "hpbar_timer") || 0;
                if (hpbarTimer > 0) {
                    if (hpbarTimer === 1) {
                        entity.nameTag = ""; // 5秒経過で非表示
                        Memory.free(entity, "hpbar_timer")
                    }
                    else {
                        Memory.set(entity, "hpbar_timer", hpbarTimer - 1);
                    }
                }
            }
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

                let damageType = "none";
                let refEntity = null;
                let formula = null;

                if (tagData) {
                    let mainData = tagData;
                    if (tagData.includes("#")) {
                        const parts = tagData.split("#");
                        mainData = parts[0];
                        formula = parts.slice(1).join("#");
                    }

                    // damageTypeの抽出 (damagerId@damageType)
                    let damagerId = "none";
                    if (mainData.includes("@")) {
                        const parts = mainData.split("@");
                        damagerId = parts[0];
                        damageType = parts[1];
                    } else {
                        damagerId = mainData;
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
                    damage = util.simpleEval(evaluatedFormula);
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
                        const crt = scutil.get(refEntity, "rpg.crt_do") || 0;
                        const critProb = (crt / 100) // ステータスベースのクリティカル率 + LUK補正

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
                //----防御判定---------
                if (damage > 0) {
                    let defense = 0;
                    if (damageType === "physic") {
                        defense = scutil.get(entity, "rpg.def_do") || 0;
                    } else if (damageType === "magic") {
                        defense = scutil.get(entity, "rpg.res_do") || 0;
                    }

                    if (damageType !== "none" && defense > 0) {
                        if (defense >= damage * 3) {
                            damage = 1;
                        } else {
                            damage = Math.floor((damage * 200) / (defense * 2 + 200));
                        }
                    } else if (damageType !== "none") {
                        damage = Math.max(1, damage);
                    }
                }




                const nextHp = currentHp - damage;
                scutil.set(entity, "rpg.hp", nextHp);

                if (nextHp <= 0) {
                    entityPatch.kill(entity, refEntity ? refEntity.id : null);
                }
                Memory.use(entity, "invincibility");
                // ダメージ適用後に無敵時間を付与（10チック = 0.5秒）
                Memory.set(entity, "invincibility", 10);

                // HPバーの表示タイマーをセット（100チック = 5秒）
                Memory.set(entity, "hpbar_timer", 100);

                if (entity.typeId !== "minecraft:player") {
                    applyHPbar(entity);
                }
                damageIndicator(entity, damage);

                // タグを削除
                entity.removeTag(tag);

                // --- 攻撃スキルのトリガー発火 (タグ削除後・ダメージ確定後) ---
                try {
                    if (refEntity && refEntity.typeId === "minecraft:player") {
                        SkillSystem.trigger(refEntity, "attack", { "attack.damage": damage });
                    }
                } catch (e) {
                    console.error("[SkillSystem] attack trigger error:", e);
                }
            }
        }
    }
})
// 火属性の継続ダメージ (FireTick) をカスタムダメージに変換
world.beforeEvents.entityHurt.subscribe(
    /**@type {server.EntityHurtEvent} */
    ev => {

        const { hurtEntity, damageSource } = ev;
        if (!hurtEntity.isValid) return;

        // FireTick（延焼ダメージ）のみを対象にする
        if (damageSource.cause === server.EntityDamageCause.fireTick) {
            ev.cancel = true;
            system.run(() => {
                const dy = new DyPro("fire", hurtEntity);
                const fireDamage = dy.get("damage") || 1;
                const fireDamagerId = dy.get("damagerId") || "none";

                // カスタムダメージとして再適用（インジケーター表示のため）
                entityPatch.damage(hurtEntity, fireDamage, { damagerId: fireDamagerId, damageType: "magic" });
            })
        }

    });
