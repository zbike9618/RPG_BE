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
        const scutil = util.score;
        const lv = scutil.get(entity, "rpg.level") || 1;
        const mdata = mobdata[entity.typeId];
        if (!mdata) return;

        const maxhp = mdata.maxhp + ((mdata.perLevel?.maxhp || 0) * (lv - 1));
        const str = mdata.str + ((mdata.perLevel?.str || 0) * (lv - 1));
        const def = mdata.def + ((mdata.perLevel?.def || 0) * (lv - 1));
        const int = mdata.int + ((mdata.perLevel?.int || 0) * (lv - 1));

        scutil.set(entity, "rpg.maxhp_do", maxhp);
        scutil.set(entity, "rpg.hp", maxhp);
        scutil.set(entity, "rpg.str_do", str);
        scutil.set(entity, "rpg.def_do", def);
        scutil.set(entity, "rpg.int_do", int);
    }
});