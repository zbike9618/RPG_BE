import * as server from "@minecraft/server";
import util from "../../util";
const { world, system } = server;

let count = 0;
system.runInterval(() => {
    const players = world.getAllPlayers();
    if (players.length === 0) return;
    const index = count % players.length;
    const player = players[index];
    count++;
    if (!player || !player.isValid) return;
    const scutil = util.score;
    const agi = scutil.get(player, "rpg.agi_do");
    const comp = player.getComponent("minecraft:movement")
    if (!comp) return;
    const def = comp.defaultValue + (player.isSprinting ? 0.03 : 0);
    //小数点第5位以下切り捨て
    const number = Math.floor((agi * def * 0.001 + def) * 1000) / 1000;
    if (number != comp.currentValue) {
        comp.setCurrentValue(number);
    }

})