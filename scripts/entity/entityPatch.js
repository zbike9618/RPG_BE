import mobdata from "./mob/mobdata";
import { reward } from "./mob/reward";
import { world } from "@minecraft/server";
import SkillSystem from "./player/skill/skillsystem";
export default class {
    /**
     * エンティティに独自ダメージを適用するタグを付与する
     * @param {import("@minecraft/server").Entity} entity 
     * @param {number} damage 
     * @param {{reference?: string, damagerId?: string}} options 
     */
    static damage(entity, damage, { reference, damagerId } = {}) {
        //skill処理

        const player = world.getEntity(damagerId);
        if (player && player.isValid) {
            SkillSystem.trigger(player, "attack", { "attack.damage": damage });
        }



        let tag = `rpg:damaged_${damage}_${damagerId || "none"}`;
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
            
            const util = require("../util").default;
            const scutil = util.score;
            if ((scutil.get(entity, "rpg.hp") || 0) <= 0) {
                entity.kill();
                scutil.set(entity, "rpg.hp", scutil.get(entity, "rpg.maxhp_do") || 100);
            }
        } else {
            entity.kill();
            if (mobdata[entity.typeId]) {
                reward(entity, mobdata[entity.typeId]["exp"], mobdata[entity.typeId]["money"]);
            }
        }
    }
}