import * as server from "@minecraft/server";
import util from "../../util";

/**
 * @param {import("@minecraft/server").Entity} entity 
 * @param {number} exp 
 * @param {number} money 
 */
export function reward(entity, exp, money) {
    // 獲得するEXPとお金に±10%のばらつき(0.9 ~ 1.1)を付与
    const varExp = 1 + (Math.random() * 0.2 - 0.1);
    const varMoney = 1 + (Math.random() * 0.2 - 0.1);

    const finalExp = exp > 0 ? Math.max(1, Math.floor(exp * varExp)) : 0;
    const finalMoney = money > 0 ? Math.max(1, Math.floor(money * varMoney)) : 0;

    // 最寄りのプレイヤーにEXPとお金を与える
    const nearestPlayer = entity.dimension.getPlayers({ location: entity.location, maxDistance: 10 })[0];
    if (nearestPlayer) {
        const scutil = util.score;
        let currentExp = scutil.get(nearestPlayer, "rpg.exp") || 0;
        let currentMoney = scutil.get(nearestPlayer, "rpg.money") || 0;
        scutil.set(nearestPlayer, "rpg.exp", currentExp + finalExp);
        scutil.set(nearestPlayer, "rpg.money", currentMoney + finalMoney);
    }

    const loc = {
        x: entity.location.x,
        y: entity.location.y + 1,
        z: entity.location.z
    }
    const e = entity.dimension.spawnEntity("rpg:reward", loc);
    e.nameTag = `§l§3獲得EXP ${finalExp}\n§e獲得G ${finalMoney}`;
}