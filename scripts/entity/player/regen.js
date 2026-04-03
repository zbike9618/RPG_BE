import * as server from "@minecraft/server";
import util from "../../util";

const { world, system } = server;

// 1チックごとに蓄積
system.runInterval(() => {
    const scutil = util.score;
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) continue;

        // --- HP回復チャージ ---
        let hp = scutil.get(player, "rpg.hp") ?? 20;
        const maxhp = scutil.get(player, "rpg.maxhp_do") ?? 20;
        const hp_regen = scutil.get(player, "rpg.hpregen_do") || 0;
        let hp_i = scutil.get(player, "rpg.hpregen_i") || 0;

        hp_i += hp_regen + 1;
        while (hp_i >= 2000) {
            hp_i -= 2000;
            if (hp < maxhp) hp++;
        }
        scutil.set(player, "rpg.hpregen_i", hp_i);
        scutil.set(player, "rpg.hp", hp);

        // --- MP回復チャージ ---
        let mp = scutil.get(player, "rpg.mp") ?? 0;
        const maxmp = scutil.get(player, "rpg.maxmp_do") ?? 100;
        const mp_regen = scutil.get(player, "rpg.mpregen_do") || 0;
        let mp_i = scutil.get(player, "rpg.mpregen_i") || 0;

        mp_i += mp_regen + 1;
        while (mp_i >= 2000) {
            mp_i -= 2000;
            if (mp < maxmp) mp++;
        }
        scutil.set(player, "rpg.mpregen_i", mp_i);
        scutil.set(player, "rpg.mp", mp);
    }
});
