import { world } from "@minecraft/server";
import Shoot, { projectileHit } from "../../../projectile/shoot.js"
import util from "../../../../util.js"
import { DyPro } from "../../../../dypro.js"
import entityPatch from "../../../entityPatch.js"
import Buff from "../../buff.js"

/** @type {import("../skill").ActiveSkillDefinition} */
export default {
    id: "fireball",
    name: "ファイアボール",
    description: "前方に火球を放つ",
    getdescription: "INTを50以上にする",
    element: "炎",
    sc: {
        getconditions: "#status.int >= 50"
    },
    execute(player, skillVar, { checkCost }) {
        if (!checkCost(15, 20)) return;
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
        entityPatch.damage(entity, 0, { reference: "rpg.int_do * 1.3", damagerId: owner?.id, damageType: "magic", element: "炎" });
        entityPatch.fire(entity, 5, { damage: 3, damagerId: owner?.id });
    })
})
