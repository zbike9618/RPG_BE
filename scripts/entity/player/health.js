import * as server from "@minecraft/server";
import util from "../../util";
import SkillSystem from "./skill/skillsystem";
const { world, system } = server;

system.runInterval(() => {
    const players = world.getAllPlayers();
    for (const player of players) {
        if (!player || !player.isValid) continue;

        const scutil = util.score;
        const health = player.getComponent("minecraft:health");
        const maxhp_do = scutil.get(player, "rpg.maxhp_do") || 100;
        let current_hp = scutil.get(player, "rpg.hp") || 100;

        // 最大HPを超えている場合は補正
        if (current_hp > maxhp_do) {
            current_hp = maxhp_do;
            scutil.set(player, "rpg.hp", maxhp_do);
        }

        const targetMax = Math.max(1, Math.floor(maxhp_do / 5));
        const targetVal = Math.max(1, Math.floor(current_hp / 5));
        if (current_hp <= 0) {
            require("../entityPatch").default.kill(player, null);
            continue;
        }
        if (health.currentValue !== targetVal) {
            try {
                health.setCurrentValue(Math.min(targetVal, targetMax));
            }
            catch {

            }
        }

    }
});
