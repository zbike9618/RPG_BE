import { world, system } from "@minecraft/server";
import Shoot, { projectileHit } from "../../../projectile/shoot.js"
import util from "../../../../util.js"
import { DyPro } from "../../../../dypro.js"
import entityPatch from "../../../entityPatch.js"

/** @type {import("../skill").ActiveSkillDefinition} */
export default {
    id: "unruinfire",
    name: "不滅の炎",
    description: "炎を飛ばす",
    getdescription: "わかんね",
    sc: {
        getconditions: "#status.int >= 50"
    },
    execute(player, skillVar, { needMp, needCool }) {
        if (!needMp(player, 15)) return;
        if (Shoot.fire(player, {
            customId: "unruinfire",
            speed: 1.0,
            onTick: (projectile) => {
                const dim = projectile.dimension;
                const pos = projectile.location;
                util.expandParticle(dim, pos, 3, 1, "minecraft:colored_flame_particle")
            },
            maxLife: 20,
            offset: { x: 0, y: 0.1, z: 0 }
        })) {
            player.playSound("mob.shulker.shoot")
        }
    }
}

projectileHit.emit("unruinfire", async (projectile, ev) => {
    const dy = new DyPro("projectile", projectile);
    const owner = world.getEntity(dy.get("ownerId"));
    /** @type {import("@minecraft/server").Dimension} */
    const dim = projectile.dimension;
    const pos = projectile.location;
    for (let i = 0; i < 50; i++) {
        util.expandParticle(dim, pos, 20, 3, "minecraft:mobflame_single")
        util.getEntities(dim, pos, 4, null, {
            excludeIds: [owner?.id, projectile.id]
        }).forEach(entity => {
            entityPatch.damage(entity, 0, { reference: "rpg.int_do * 0.3", damagerId: owner?.id, damageType: "magic" });
            entityPatch.fire(entity, 1000, { damage: 10, damagerId: owner?.id });
        })
        dim.playSound("mob.blaze.shoot", pos, { volume: 10 })
        await system.waitTicks(1)
    }
})
