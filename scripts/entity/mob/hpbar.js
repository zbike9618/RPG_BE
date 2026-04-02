import * as server from "@minecraft/server";
import util from "../../util";
import mobdata from "./mobdata";
import entityPatch from "../entityPatch";
const { world, system } = server;
/**
 * 
 * @param {import("@minecraft/server").Entity} entity 
 */
export function applyHPbar(entity) {
    const scutil = util.score;
    const maxhp = scutil.get(entity, "rpg.maxhp_do") || 1;
    const hp = scutil.get(entity, "rpg.hp") || 0;

    // 体力が0以下の場合はバーを表示しない
    if (hp <= 0) {
        entityPatch.kill(entity)
        return;
    }

    const ps = hp / maxhp;

    let color = "§a"; // 通常は緑
    if (ps <= 0.25) {
        color = "§c"; // 25%以下は赤
    } else if (ps <= 0.5) {
        color = "§6"; // 50%以下はオレンジ
    }

    let hpbar = "";
    hpbar += `§7[${mobdata[entity.typeId]["name"]}]\n §a[${hp}/${maxhp}]\n`;
    for (let i = 0; i < 20; i++) {
        if (ps > i / 20) {
            hpbar += `${color}❚`;
        } else {
            hpbar += "§f❚";
        }
    }
    entity.nameTag = hpbar;
}