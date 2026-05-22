import util from "../../../../util.js"
const scutil = util.score

export default {
    id: "heal_light",
    execute(player, skillVar, { needMp, needCool }) {
        if (!needMp(player, 10)) return;
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
