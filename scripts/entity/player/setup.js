import * as server from "@minecraft/server";
import util from "../../util";
import { showStatus } from "./showStatus";
import jobdata from "./job/jobdata";
import { getStatsGained } from "./levelUp";
import skill from "./skill/skill";
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
export function setup(player, { level, exp } = { level: 1, exp: 0 }) {
    const scutil = util.score;
    const jobId = scutil.get(player, "rpg.job") || 0;
    const currentJob = jobdata[jobId] || jobdata[0];
    const initial = currentJob.initial || {};

    // 1レベルから指定されたレベルまでの累計ステータス上昇量を取得
    const gained = getStatsGained(currentJob, 1, level);

    const statsList = ["maxhp", "maxmp", "hpregen", "mpregen", "str", "def", "int", "agi", "luk"];

    for (const s of statsList) {
        const baseVal = initial[s] || 0;
        const extraVal = gained[s] || 0;
        scutil.set(player, `rpg.${s}_save`, baseVal + extraVal);
    }

    // 現在のHPとMPを計算後の最大値で全回復
    scutil.set(player, "rpg.hp", (initial.maxhp || 0) + (gained.maxhp || 0));
    scutil.set(player, "rpg.mp", (initial.maxmp || 0) + (gained.maxmp || 0));

    scutil.set(player, "rpg.level", level);
    scutil.set(player, "rpg.exp", exp);
    scutil.set(player, "rpg.kb_save", 0);
}
system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id === "rpg:setup") {
        const player = ev.sourceEntity;
        if (player.typeId === "minecraft:player") {
            setup(player)
        }
    }
    if (ev.id === "rpg:showStatus") {
        const player = ev.sourceEntity;
        if (player.typeId === "minecraft:player") {
            showStatus(player, "ui")
        }
    }
    if (ev.id === "rpg:removeAll") {
        const player = ev.sourceEntity;
        if (player.typeId === "minecraft:player") {
            skill.remove(player, "attackPower")
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
