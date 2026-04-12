import * as server from "@minecraft/server";
import util from "../../util";
const { world } = server;
/**
 * @param {import("@minecraft/server").Entity} entity 
 * @param {number} exp 
 * @param {number} money 
 * @param {string} [killerId=null]
 */
export function reward(entity, exp, money, killerId = null) {
    // 獲得するEXPとお金に±10%のばらつき(0.9 ~ 1.1)を付与
    const varExp = 1 + (Math.random() * 0.2 - 0.1);
    const varMoney = 1 + (Math.random() * 0.2 - 0.1);

    const finalExp = exp > 0 ? Math.max(1, Math.floor(exp * varExp)) : 0;
    const finalMoney = money > 0 ? Math.max(1, Math.floor(money * varMoney)) : 0;

    // 報酬を与える対象プレイヤーを特定する
    let targetPlayer = null;
    if (killerId) {
        targetPlayer = world.getAllPlayers().find(p => p.id === killerId);
    }

    // キラーが見つからない場合は最寄りのプレイヤーを探す
    if (!targetPlayer) {
        targetPlayer = entity.dimension.getPlayers({ location: entity.location, maxDistance: 15 })[0];
    }

    if (targetPlayer) {
        const scutil = util.score;
        let currentExp = scutil.get(targetPlayer, "rpg.exp") || 0;
        let currentMoney = scutil.get(targetPlayer, "rpg.money") || 0;
        scutil.set(targetPlayer, "rpg.exp", currentExp + finalExp);
        scutil.set(targetPlayer, "rpg.money", currentMoney + finalMoney);
    }

    const loc = {
        x: entity.location.x,
        y: entity.location.y + 1,
        z: entity.location.z
    }
    const e = entity.dimension.spawnEntity("rpg:reward", loc);
    e.nameTag = `§l§3獲得EXP ${finalExp}\n§e獲得G ${finalMoney}`;
}