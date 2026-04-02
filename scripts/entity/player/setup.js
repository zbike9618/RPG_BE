import * as server from "@minecraft/server";
import util from "../../util";
const { world, system } = server;

world.afterEvents.entitySpawn.subscribe((ev) => {
    const player = ev.entity;
    const scutil = util.score;
    if (player.type === "minecraft:player" && (scutil.get(player, "rpg.maxhp_save") ?? 0) === 0) {
        scutil.set(player, "rpg.maxhp_save", 100);
        scutil.set(player, "rpg.maxmp_save", 100);
        scutil.set(player, "rpg.maxhp_do", 100);
        scutil.set(player, "rpg.maxmp_do", 100);
        scutil.set(player, "rpg.hpregen_save", 1);
        scutil.set(player, "rpg.mpregen_save", 1);
        scutil.set(player, "rpg.str_save", 1);
        scutil.set(player, "rpg.def_save", 1);
        scutil.set(player, "rpg.int_save", 1);
        scutil.set(player, "rpg.agi_save", 1);
        scutil.set(player, "rpg.luk_save", 1);
        scutil.set(player, "rpg.kb_save", 1);
    }
});
system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id === "rpg:setup") {
        const player = ev.sourceEntity;
        const scutil = util.score;
        if (player.typeId === "minecraft:player") {
            scutil.set(player, "rpg.hp", 100);
            scutil.set(player, "rpg.mp", 100);
            scutil.set(player, "rpg.maxhp_save", 100);
            scutil.set(player, "rpg.maxmp_save", 100);
            scutil.set(player, "rpg.maxhp_do", 100);
            scutil.set(player, "rpg.maxmp_do", 100);
            scutil.set(player, "rpg.hpregen_save", 1);
            scutil.set(player, "rpg.mpregen_save", 1);
            scutil.set(player, "rpg.str_save", 1);
            scutil.set(player, "rpg.def_save", 1);
            scutil.set(player, "rpg.int_save", 1);
            scutil.set(player, "rpg.agi_save", 1);
            scutil.set(player, "rpg.luk_save", 1);
            scutil.set(player, "rpg.kb_save", 1);
        }
    }

});

//生き返ったときのHP戻し
world.afterEvents.playerSpawn.subscribe((ev) => {
    const player = ev.player;
    const scutil = util.score;
    scutil.set(player, "rpg.hp", scutil.get(player, "rpg.maxhp_do"));
    scutil.set(player, "rpg.mp", scutil.get(player, "rpg.maxmp_do"));
});
