import { world, system } from "@minecraft/server";
import skillData from "./skillData";
import util from "../../../util";
import { DyPro } from "../../../dypro.js";
const scutil = util.score
import Shoot, { projectileHit } from "../../projectile/shoot.js";
import entityPatch from "../../entityPatch.js";
import Buff from "../buff.js";

/**
 * アクティブスキルの実行を管理するシステム
 */
export default class ActiveSkillSystem {
    /**
     * 指定したアクティブスキルを実行する外部呼び出し用メソッド
     * @param {import("@minecraft/server").Player} player 実行者
     * @param {string} skillId 実行するスキルID
     * @param {Record<string, any>} skillVar スキルの保有変数（レベル、威力等）
     */
    static execute(player, skillId, skillVar) {
        const sData = skillData[skillId];
        if (!sData || sData.type !== 1) return;

        /**
         * 各スキルの具体的処理を振り分けるコールバック
         * @param {string} id 
         */
        const runSkill = (id) => {
            switch (id) {
                case "fireball":
                    Skill.fireball(player, skillVar);
                    break;
                case "heal_light":
                    Skill.healLight(player, skillVar);
                    break;
                case "babble_shot":
                    Skill.babbleShot(player, skillVar);
                    break;
                default:
                    player.sendMessage(`§c[ActiveSkill] スキル『${sData.name}』の実行処理が未定義です。`);
                    break;
            }
        };

        // スキルの実行
        runSkill(skillId);
    }


}


function needMp(player, amount) {
    const currentMp = scutil.get(player, "rpg.mp");
    if (currentMp < amount) {
        player.sendMessage("§cMPが足りません");
        return false;
    }
    const nextMp = Math.max(0, currentMp - amount);
    scutil.set(player, "rpg.mp", nextMp);
    return true;
}
class Skill {
    /**
        * ファイアボールの個別処理
        */
    static fireball(player, skillVar) {
        if (!needMp(player, 15)) return;
        if (Shoot.fire(player, {
            customId: "fireball",
            speed: 3.0,
            subSteps: 2,
            onTick: (projectile) => {
                const dim = projectile.dimension;
                const pos = projectile.location;
                util.expandParticle(dim, pos, 5, 1, "minecraft:mobflame_single")
            },
            maxLife: 20,
            offset: { x: 0, y: 0.1, z: 0 }
        })) {
            player.playSound("mob.blaze.shoot")
        }

    }

    /**
     * ヒールライトの個別処理
     */
    static healLight(player, skillVar) {
        // HPを回復させる処理 (rpg.hp スコアを上昇させる等)
        if (!needMp(player, 10)) return;
        const currentHp = scutil.get(player, "rpg.hp") || 20;
        const maxHp = scutil.get(player, "rpg.maxhp_do") || 20;

        // とりあえず最大HPの20%を回復
        const healAmount = 10;
        const nextHp = Math.min(maxHp, currentHp + healAmount);

        scutil.set(player, "rpg.hp", nextHp);

        // エフェクト
        player.dimension.spawnParticle("minecraft:heart_particle", {
            x: player.location.x,
            y: player.location.y + 1,
            z: player.location.z
        });
    }
    static babbleShot(player, skillVar) {
        if (!needMp(player, 15)) return;
        if (Shoot.fire(player, {
            customId: "babble_shot",
            speed: 1.0,
            onTick: (projectile) => {
                const dim = projectile.dimension;
                const pos = projectile.location;
                util.expandParticle(dim, pos, 20, 1, "minecraft:water_wake_particle")
                util.expandParticle(dim, pos, 3, 1, "minecraft:balloon_gas_particle")
            },
            maxLife: 20,
            offset: { x: 0, y: 0.1, z: 0 }
        })) {
            player.playSound("mob.shulker.shoot")
        }

    }
}
projectileHit.emit("fireball", (projectile, ev) => {
    const dy = new DyPro("projectile", projectile);
    const owner = world.getEntity(dy.get("ownerId"));
    /** @type {import("@minecraft/server").Dimension} */
    const dim = projectile.dimension;
    const pos = projectile.location;
    dim.spawnParticle("rpg:impact", pos);
    util.getEntities(dim, pos, 2, null, {
        excludeIds: [owner?.id, projectile.id]
    }).forEach(entity => {
        entityPatch.damage(entity, 0, { reference: "rpg.int_do + 5", damagerId: owner?.id, damageType: "magic" });
        entityPatch.fire(entity, 5, { damage: 3, damagerId: owner?.id });
    })
})

projectileHit.emit("babble_shot", (projectile, ev) => {
    const dy = new DyPro("projectile", projectile);
    const owner = world.getEntity(dy.get("ownerId"));
    /** @type {import("@minecraft/server").Dimension} */
    const dim = projectile.dimension;
    const pos = projectile.location;
    dim.spawnParticle("rpg:impact", pos);
    util.getEntities(dim, pos, 2, null, {
        excludeIds: [owner?.id, projectile.id]
    }).forEach(entity => {
        entityPatch.damage(entity, 0, { reference: "rpg.int_do + 5", damagerId: owner?.id, damageType: "magic" });
        Buff.add(entity, "babble_shot", "agi", -100, "value", 3);
    })
})