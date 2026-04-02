//mobのスポーン時にステータスを初期化する
import * as server from "@minecraft/server";
import util from "../../util";
import mobdata from "./mobdata";
const { world, system } = server;

world.afterEvents.entitySpawn.subscribe((ev) => {
    const entity = ev.entity;
    if (entity.typeId == "minecraft:player") return;
    const data = entity.getComponent("minecraft:type_family");
    if (!data) return;
    if (data.hasTypeFamily("mob")) {
        const scutil = util.score
        scutil.set(entity, "rpg.maxhp_do", mobdata[entity.typeId]["maxhp"]);
        scutil.set(entity, "rpg.hp", mobdata[entity.typeId]["maxhp"]);
        scutil.set(entity, "rpg.str_do", mobdata[entity.typeId]["str"]);
        scutil.set(entity, "rpg.def_do", mobdata[entity.typeId]["def"]);
        scutil.set(entity, "rpg.int_do", mobdata[entity.typeId]["int"]);
    }
});