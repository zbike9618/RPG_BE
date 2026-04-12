//mobのスポーン時にステータスを初期化する
import * as server from "@minecraft/server";
import util from "../../util";
import mobdata from "./mobdata";
const { world, system } = server;
import { addObj } from "../../scoreboard";
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
        addObj.forEach(obj => {
            scutil.set(entity, obj, 0);
        });

        const maxhp = mdata.maxhp + ((mdata.perLevel?.maxhp || 0) * (lv - 1));
        const str = mdata.str + ((mdata.perLevel?.str || 0) * (lv - 1));
        const def = mdata.def + ((mdata.perLevel?.def || 0) * (lv - 1));
        const int = mdata.int + ((mdata.perLevel?.int || 0) * (lv - 1));
        const agi = (mdata.agi || 0) + ((mdata.perLevel?.agi || 0) * (lv - 1));
        const res = (mdata.res || 0) + ((mdata.perLevel?.res || 0) * (lv - 1));

        scutil.set(entity, "rpg.maxhp_save", maxhp);
        scutil.set(entity, "rpg.hp", maxhp);
        scutil.set(entity, "rpg.str_save", str);
        scutil.set(entity, "rpg.def_save", def);
        scutil.set(entity, "rpg.int_save", int);
        scutil.set(entity, "rpg.agi_save", agi);
        scutil.set(entity, "rpg.res_save", res);
        entity.addTag("rpg.is_spawned");
    }
});