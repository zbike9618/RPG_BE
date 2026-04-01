import * as server from "@minecraft/server";
import cooldown from "./cooldown";
import util from "../util";
import { attackMotion } from "./attackMotion";
const { world, system } = server;

world.afterEvents.playerSwingStart.subscribe(async (ev) => {
    if (ev.swingSource != "Attack") return;
    const player = ev.player;
    const item = ev.heldItemStack;
    if (!item) return;
    const tags = item.getTags();
    const cool = item.getComponent("minecraft:cooldown");
    if (!cool) return;
    attackMotion(player, tags);
    player.startItemCooldown(item.typeId, cooldown[item.typeId])

});