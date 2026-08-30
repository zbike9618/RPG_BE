import util from "../../../../util.js"
const scutil = util.score

/** @type {import("../skill").ActiveSkillDefinition} */
export default {
    id: "heal_light",
    name: "ヒールライト",
    description: "自身のHPを回復する",
    getdescription: "INTを30以上にする",
    element: "光",
    sc: {
        getconditions: "#status.int >= 30"
    },
    execute(player, skillVar, { checkCost }) {
        if (!checkCost(10, 0)) return;
        const currentHp = scutil.get(player, "rpg.hp") || 20;
        const maxHp = scutil.get(player, "rpg.maxhp_do") || 20;

        const healAmount = 10;
        const nextHp = Math.min(maxHp, currentHp + healAmount);

        scutil.set(player, "rpg.hp", nextHp);

        player.dimension.spawnParticle("minecraft:heart_particle", {
            x: player.location.x,
            y: player.location.y + 1,
            z: player.location.z
        });
    }
}
