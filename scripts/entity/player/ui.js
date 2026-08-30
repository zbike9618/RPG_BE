import * as server from "@minecraft/server";
import util from "../../util";
import { getRequiredExp } from "./levelUp";
import skill from "./skill/skill";
import skillData from "./skill/skillData";
import Memory from "../memory";

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
        const hpD = `§f(${hp}§7/${maxhp})`
        const lvD = `§fLv.§f${lv} (§a${exp}§7/${nxt_exp})§f`
        const moneyD = `§f${money}§eG`

        // クールタイム情報の取得 (装備しているスロットのスキルを表示)
        const slots = skill.getItemSlots(player);
        const cdInfos = [];
        for (const sId of slots) {
            if (!sId) continue;
            const sData = skillData[sId];
            if (!sData) continue;

            const memoryId = `cool_${sId}`;
            const endTime = Memory.get(player, memoryId) || 0;
            const currentTime = system.currentTick;
            if (endTime > currentTime) {
                const remaining = Math.ceil((endTime - currentTime) / 20);
                cdInfos.push(`§c${sData.name}: ${remaining}s`);
            } else {
                cdInfos.push(`§a${sData.name}: OK`);
            }
        }
        const cdText = cdInfos.length > 0 ? `\n§l§7[ ${cdInfos.join(" §7| ")} §7]` : "";

        player.onScreenDisplay.setActionBar({
            rawtext: [{
                text: `§l${getEmpty(33)}${lvD}\n${hpD}${getEmpty(53 - (hp.toString().length + maxhp.toString().length))}${moneyD}`
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