import * as server from "@minecraft/server";
import cooldown from "./cooldown";
import util from "../util";
const { world, system } = server;

const swordAttackRange = [
    { x: -2.5, y: 1.0, z: 3.5, scale: 1, fromSelf: true },
    { x: -1.8, y: 1.0, z: 4, scale: 1, fromSelf: true },
    { x: 0, y: 1.0, z: 4, scale: 1, fromSelf: true },
    { x: 1.8, y: 1.0, z: 4, scale: 1, fromSelf: true },
    { x: 2.5, y: 1.0, z: 3.5, scale: 1, fromSelf: true },
]
const spearAttackRange = [

    { x: 0, y: 1.5, z: 5.0, scale: 1, fromSelf: true },
]
const axeAttackRange = [
    { x: 0, y: 1.0, z: 3, scale: 3, fromSelf: false },
]
const daggerAttackRange = [
    { x: 0, y: 1.0, z: 2, scale: 1.5, fromSelf: true },
]
/**
 * 
 * @param {import("@minecraft/server").Player} player 
 * @param {string[]} tags 
 */
export function attackMotion(player, tags) {
    if (tags.includes("sword")) {
        const damaged = new Set();
        const results = Inside.getSetPosition(player, swordAttackRange);

        const loc = util.getForwardPosition(player, 0, 1, 3);
        player.dimension.spawnParticle("ly:sweep", loc);
        player.playSound("player.attack.sweep");

        for (const res of results) {
            Inside.apply(res.pos, res.scale, player, damaged, (p) => {
                p.applyDamage(3, { cause: server.EntityDamageCause.none, damagingEntity: player });
                util.knockbackFromPoint(player.location, p);
            }, res.fromSelf);
        }
    }
    if (tags.includes("spear")) {
        const damaged = new Set();
        const results = Inside.getSetPosition(player, spearAttackRange);

        player.playSound("item.trident.throw");

        for (const res of results) {
            util.expandParticle(player.dimension, res.pos, 3, 0.3, "minecraft:basic_crit_particle");
            Inside.apply(res.pos, res.scale, player, damaged, (p) => {
                p.applyDamage(4, { cause: server.EntityDamageCause.none, damagingEntity: player });
                util.knockbackFromPoint(player.location, p);
            }, res.fromSelf);
        }
    }
    if (tags.includes("axe")) {
        const damaged = new Set();
        const results = Inside.getSetPosition(player, axeAttackRange);

        player.playSound("mob.zombie.wood", { location: player.location, volume: 0.1, pitch: 1 });
        player.playSound("game.player.attack.strong", { location: player.location, volume: 10, pitch: 1 });
        const loc = util.getForwardPosition(player, 0, 1, 3);
        player.dimension.spawnParticle("ly:impact", loc);
        for (const res of results) {
            Inside.apply(res.pos, res.scale, player, damaged, (p) => {
                p.applyDamage(4, { cause: server.EntityDamageCause.none, damagingEntity: player });
                util.knockbackFromPoint(player.location, p, 0.7);
                p.applyKnockback({ x: 0, z: 0 }, 0.5)
            }, res.fromSelf);
        }
    }
    if (tags.includes("dagger")) {
        const damaged = new Set();
        const results = Inside.getSetPosition(player, daggerAttackRange);

        player.playSound("player.attack.sweep", { location: player.location, volume: 0.5, pitch: 1.5 });
        const loc = util.getForwardPosition(player, 0, 1, 3);
        util.expandParticle(player.dimension, loc, 25, 1, "minecraft:basic_crit_particle");
        for (const res of results) {
            Inside.apply(res.pos, res.scale, player, damaged, (p) => {
                p.applyDamage(1, { cause: server.EntityDamageCause.none, damagingEntity: player });
                util.knockbackFromPoint(player.location, p, 0.3);
            }, res.fromSelf);
        }
    }
}

class Inside {
    /**
     * @param {import("@minecraft/server").Vector3} pos 
     * @param {number} range 
     * @param {import("@minecraft/server").Player} damager 
     * @param {Set<string>} [damagedSet]
     * @param {(p: import("@minecraft/server").Player) => void} callback
     */
    static apply(pos, range, damager, damagedSet = null, callback, fromSelf = false) {
        const entities = util.getEntities(damager.dimension, pos, range, fromSelf ? damager.location : null);
        for (const entity of entities) {
            const families = entity.getComponent("minecraft:type_family");
            if (!entity.isValid || !families) continue;
            if (!families.hasTypeFamily("mob") && !families.hasTypeFamily("player")) continue;
            if (entity.id === damager.id) continue;
            if (damagedSet && damagedSet.has(entity.id)) continue;

            callback(entity);
            if (damagedSet) damagedSet.add(entity.id);
        }
    }
    static getSetPosition(player, locs = [{ x: 0, y: 0, z: 0, scale: 1, fromSelf: false }]) {
        return locs.map(loc => {
            return {
                pos: util.getForwardPosition(player, loc.x, loc.y, loc.z),
                scale: loc.scale ?? 1.0,
                fromSelf: loc.fromSelf ?? false
            }
        });
    }
}