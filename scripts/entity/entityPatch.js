import mobdata from "./mob/mobdata";
import { reward } from "./mob/reward";
import { world } from "@minecraft/server";
import SkillSystem from "./player/skill/skillsystem";
import Memory from "./memory";
import KillTracker from "./player/kill/killTracker";
import util from "../util";
import { DyPro } from "../dypro";
export default class {
    /**
     * エンティティに独自ダメージを適用するタグを付与する
     * @param {import("@minecraft/server").Entity} entity 
     * @param {number} damage 
     * @param {Object} options 
     * @param {string} [options.reference] ダメージ計算の数式 (例: "rpg.str * 2")
     * @param {string} [options.damagerId] 攻撃者のエンティティID
     * @param {"none"|"physic"|"magic"} [options.damageType="none"] ダメージタイプ
     */
    static damage(entity, damage, options = {}) {
        const { reference, damagerId = "none", damageType = "none" } = options;

        let tag = `rpg:damaged_${damage}_${damagerId}@${damageType}`;
        if (reference) {
            tag += `#${reference}`;
        }
        entity.addTag(tag);
        entity.runCommand(`damage @s 0 none`);
    }

    /**
     * @param {import("@minecraft/server").Entity} entity 
     * @param {string} [killerId=null]
     */
    static kill(entity, killerId = null) {
        if (!entity.isValid) return;

        if (entity.typeId === "minecraft:player") {
            const isSelf = killerId === entity.id;
            SkillSystem.trigger(entity, "death", {
                target: isSelf ? "self" : "other",
                selfby: isSelf
            });

            const scutil = util.score;
            if ((scutil.get(entity, "rpg.hp") || 0) <= 0) {
                entity.kill();
                scutil.set(entity, "rpg.hp", scutil.get(entity, "rpg.maxhp_do") || 100);
            }
        } else {
            entity.kill();

            // 攻撃したプレイヤーを特定する
            let killer = null;
            if (killerId) {
                killer = world.getEntity(killerId);
                if (!killer) {
                    killer = world.getAllPlayers().find(p => p.id === killerId);
                }
            }
            // killerが見つからない、または遠すぎる場合は最寄りのプレイヤーを探す
            if (!killer || (killer.typeId === "minecraft:player" && killer.dimension.id !== entity.dimension.id)) {
                killer = entity.dimension.getPlayers({ location: entity.location, maxDistance: 15 })[0];
            }

            if (killer && killer.typeId === "minecraft:player") {
                // キルカウントを増やす (IDとファミリーを記録)
                const families = entity.getComponent("minecraft:type_family")?.getTypeFamilies() || [];
                KillTracker.increment(killer, entity.typeId, families);

                // スキルトリガー発火
                SkillSystem.trigger(killer, "kill", {
                    target: entity.typeId,
                    target_family: families
                });
            }

            if (mobdata[entity.typeId]) {
                reward(entity, mobdata[entity.typeId]["exp"], mobdata[entity.typeId]["money"], killerId);
            }
        }
    }

    /**
     * @param {import("@minecraft/server").Entity} entity 
     * @param {number} seconds 
     * @param {Object} [options={}]
     * @param {number} [options.damage=1]
     * @param {string} [options.damagerId="none"]
     */
    static fire(entity, seconds, { damage = 1, damagerId = "none" } = {}) {
        if (!entity.isValid) return;
        entity.setOnFire(seconds, true);

        // 火ダメージ設定を保存 (Memoryは数値専用なため、文字列IDを扱えるDyProを使用)
        const dy = new DyPro("fire", entity);
        dy.set("damage", damage);
        dy.set("damagerId", damagerId);
    }
}