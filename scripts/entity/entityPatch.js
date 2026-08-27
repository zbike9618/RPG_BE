import mobdata from "./mob/mobdata";
import { reward } from "./mob/reward";
import { world } from "@minecraft/server";
import SkillSystem from "./player/skill/skillsystem";
import Memory from "./memory";
import KillTracker from "./player/kill/killTracker";
import util from "../util";
import { DyPro } from "../dypro";
import Buff from "./player/buff";
import Interval from "./interval";

export default class {
    /**
     * エンティティに独自ダメージを適用するタグを付与する
     * @param {import("@minecraft/server").Entity} entity 
     * @param {number} damage 
     * @param {Object} options 
     * @param {string} [options.reference] ダメージ計算の数式 (例: "rpg.str * 2")
     * @param {string} [options.damagerId] 攻撃者のエンティティID
     * @param {"none"|"physic"|"magic"} [options.damageType="none"] ダメージタイプ
     * @param {"無"|"炎"|"水"|"土"|"雷"|"悪"|"光"|"風"} [options.element="無"] ダメージの属性
     */
    static damage(entity, damage, options = {}) {
        const { reference, damagerId = "none", damageType = "none", element = "無" } = options;

        let tag = `rpg:damaged_${damage}_${damagerId}@${damageType}&${element}`;
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
     * 炎ダメージを付与する
     * @param {import("@minecraft/server").Entity} entity 
     * @param {number} seconds 
     * @param {Object} [options={}]
     * @param {number} [options.damage=1]
     * @param {string} [options.damagerId="none"]
     */
    static fire(entity, seconds, { damage = 1, damagerId = "none" } = {}) {
        if (!entity.isValid) return;
        entity.setOnFire(seconds, true);

        // 管理に Memory (スコアボード) を使用して負荷を軽減
        const endTime = Math.floor(Date.now() / 1000) + seconds;
        if (!Memory.has(entity, "fire")) {
            Memory.use(entity, "fire");
        }
        Memory.set(entity, "fire", endTime);

        // メタデータ（ダメージ等）は DyPro に保存
        const dy = new DyPro("fire", entity);
        dy.set("damage", damage);
        dy.set("damagerId", damagerId);
    }

    /**
     * 麻痺（移動速度減少）を付与する
     * @param {import("@minecraft/server").Entity} entity 
     * @param {number} seconds 継続秒数
     * @param {number} [percent=99] 減少割合
     */
    static paralyze(entity, seconds, percent = 99) {
        if (!entity || !entity.isValid) return;

        // Buffクラスを利用してAGIを割合減少
        Buff.add(entity, "paralyze", "agi", -percent, "percent", seconds);

        // 麻痺期間中、パーティクルを継続的に発生させる
        Interval.add(entity, (ent) => {
            util.expandParticle(ent.dimension, ent.location, 0.5, 2, "rpg:lightning");
        }, 10, seconds * 20);
    }
}