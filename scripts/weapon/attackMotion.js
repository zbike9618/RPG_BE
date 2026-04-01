import * as server from "@minecraft/server";
import cooldown from "./cooldown";
import util from "../util";
const { world, system } = server;

const swordAttackRange = [
    { x: -2.5, y: 1.0, z: 2 },
    { x: -1.8, y: 1.0, z: 3 },
    { x: 0, y: 1.0, z: 4 },
    { x: 1.8, y: 1.0, z: 3 },
    { x: 2.5, y: 1.0, z: 2 },
]
const spearAttackRange = [
    { x: 0, y: 1.5, z: 1.0 },
    { x: 0, y: 1.5, z: 2.0 },
    { x: 0, y: 1.5, z: 3.0 },
    { x: 0, y: 1.5, z: 4.0 },
    { x: 0, y: 1.5, z: 5.0 },
]
/**
 * 
 * @param {import("@minecraft/server").Player} player 
 * @param {string[]} tags 
 */
export function attackMotion(player, tags) {
    if (tags.includes("sword")) {
        const damaged = new Set();
        const positions = Inside.getSetPosition(player, swordAttackRange);

        const loc = util.getForwardPosition(player, 0, 1, 3);
        player.dimension.spawnParticle("ly:sweep", loc);
        player.playSound("player.attack.sweep");

        for (const pos of positions) {
            Inside.applyDamage(pos, 1.5, 3, player, damaged);
        }
    }
    if (tags.includes("spear")) {
        const damaged = new Set();
        const positions = Inside.getSetPosition(player, spearAttackRange);

        player.playSound("item.trident.throw");

        for (const pos of positions) {
            util.expandParticle(player.dimension, pos, 3, 0.3, "minecraft:basic_crit_particle");
            Inside.applyDamage(pos, 0.8, 4, player, damaged);
        }
    }
}

class Inside {
    /**
     * @param {import("@minecraft/server").Vector3} pos 
     * @param {number} range 
     * @param {number} damageAmount 
     * @param {import("@minecraft/server").Player} damager 
     * @param {Set<string>} [damagedSet]
     */
    static applyDamage(pos, range, damageAmount, damager, damagedSet = null) {
        const entities = damager.dimension.getEntities({
            location: pos,
            maxDistance: range,
        })
        for (const entity of entities) {
            if (entity.id === damager.id || entity.typeId === "minecraft:item") continue;
            if (damagedSet && damagedSet.has(entity.id)) continue;

            entity.applyDamage(damageAmount, { cause: server.EntityDamageCause.entityAttack, damagingEntity: damager });
            if (damagedSet) damagedSet.add(entity.id);
        }
    }
    static getSetPosition(player, locs = [{ x: 0, y: 0, z: 0 }]) {
        return locs.map(loc => util.getForwardPosition(player, loc.x, loc.y, loc.z));
    }
}