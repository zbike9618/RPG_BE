import { world } from "@minecraft/server";
import Shoot, { projectileHit } from "../../../projectile/shoot.js"
import util from "../../../../util.js"
import { DyPro } from "../../../../dypro.js"
import entityPatch from "../../../entityPatch.js"
import Buff from "../../buff.js"

/** @type {import("../skill").ActiveSkillDefinition} */
export default {
    id: "babble_shot",
    name: "バブルショット",
    description: "前方に泡を放つ",
    getdescription: "INTを50以上にする",
    element: "水",
    sc: {
        getconditions: "#status.int >= 50"
    },
    execute(player, skillVar, { needMp, needCool }) {
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
        entityPatch.damage(entity, 0, { reference: "rpg.int_do * 1.2", damagerId: owner?.id, damageType: "magic", element: "水" });
        Buff.add(entity, "babble_shot", "str", -30, "percent", 5);
        Buff.add(entity, "babble_shot", "int", -30, "percent", 5);
    })
})
