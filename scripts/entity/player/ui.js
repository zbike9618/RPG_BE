import * as server from "@minecraft/server";
import util from "../../util";
import { getRequiredExp } from "./levelUp";
const { world, system } = server;

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) continue;
        const scutil = util.score;
        const hp = scutil.get(player, "rpg.hp");
        const maxhp = scutil.get(player, "rpg.maxhp_do");
        const lv = scutil.get(player, "rpg.level");
        const exp = scutil.get(player, "rpg.exp");
        const nxt_exp = getRequiredExp(lv);
        const money = scutil.get(player, "rpg.money");
        const hpD = `\n§f(${hp}§7/${maxhp})`
        const lvD = `§fLv.§f${lv} (§a${exp}§7/${nxt_exp})§f`
        const moneyD = `${money}§eG`
        player.onScreenDisplay.setActionBar({
            rawtext: [{
                text: `§l${getEmpty(50)}${lvD}${getEmpty(41 - (money.toString().length * 2) - (exp.toString().length + nxt_exp.toString().length + lv.toString().length) * 2)}${moneyD}${hpD} `
            }]
        })
    }
})
function getEmpty(c) {
    let str = "";
    for (let i = 0; i < c; i++) {
        str += " ";
    }
    return str;
}