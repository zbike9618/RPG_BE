import { world } from "@minecraft/server";
import Shoot, { projectileHit } from "../../../projectile/shoot.js"
import util from "../../../../util.js"
import { DyPro } from "../../../../dypro.js"
import entityPatch from "../../../entityPatch.js"
import Buff from "../../buff.js"

export default {
    id: "fireball",
    execute(player, skillVar, { needMp, needCool }) {
        if (!needCool(20)) return;
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
        entityPatch.damage(entity, 0, { reference: "rpg.int_do * 1.3", damagerId: owner?.id, damageType: "magic" });
        entityPatch.fire(entity, 5, { damage: 3, damagerId: owner?.id });
    })
})
