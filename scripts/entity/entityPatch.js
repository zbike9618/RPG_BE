import mobdata from "./mob/mobdata";
import { reward } from "./mob/reward";

export default class {
    /**
     * エンティティに独自ダメージを適用するタグを付与する
     * @param {import("@minecraft/server").Entity} entity 
     * @param {number} damage 
     * @param {{reference?: string, damagerId?: string}} options 
     */
    static damage(entity, damage, { reference, damagerId } = {}) {
        let tag = `rpg:damaged_${damage}_${damagerId || "none"}`;
        if (reference) {
            tag += `#${reference}`;
        }
        entity.addTag(tag);
        entity.runCommand(`damage @s 0 none`);
    }

    /**
     * 
     * @param {import("@minecraft/server").Entity} entity 
     */
    static kill(entity) {
        if (entity.isValid) {
            entity.kill();
            reward(entity, mobdata[entity.typeId]["exp"], mobdata[entity.typeId]["money"]);
        }
    }
}