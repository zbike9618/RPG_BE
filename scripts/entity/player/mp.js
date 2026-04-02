import * as server from "@minecraft/server";
import util from "../../util";
import xpbar from "./xpbar";

const { world, system } = server;

const lastValues = new Map();

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) continue;

        const scutil = util.score;
        const mp = scutil.get(player, "rpg.mp") ?? 0;
        const maxmp = scutil.get(player, "rpg.maxmp_do") ?? 100;
        
        // 前回の値と比較し、変化がなければスキップ
        const last = lastValues.get(player.id);
        if (last && last.mp === mp && last.max === maxmp) continue;

        // 値を保存
        lastValues.set(player.id, { mp, max: maxmp });

        // MPの最大値を超えないように制限
        const current_mp = Math.min(mp, maxmp);
        if (mp > maxmp) {
            scutil.set(player, "rpg.mp", maxmp);
        }

        // 割合を計算
        const percent = (current_mp / Math.max(1, maxmp)) * 100;

        // XPバーに反映 (レベルをMP数値、ゲージを割合)
        xpbar.setLevel(player, current_mp);
        xpbar.setXPPercent(player, percent);
    }
}, 1);
