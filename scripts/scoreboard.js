import * as server from "@minecraft/server";
const { world, system } = server;
export const addObj = [
    //now_status
    "rpg.hp",
    "rpg.mp",
    "rpg.exp",
    "rpg.level",
    "rpg.money",
    "rpg.sp",
    //do_status
    "rpg.maxhp_do",
    "rpg.maxmp_do",
    "rpg.hpregen_do",
    "rpg.mpregen_do",
    "rpg.str_do",
    "rpg.def_do",
    "rpg.int_do",
    "rpg.agi_do",
    "rpg.luk_do",
    "rpg.kb_do",
    //save_statue
    "rpg.maxhp_save",
    "rpg.maxmp_save",
    "rpg.hpregen_save",
    "rpg.mpregen_save",
    "rpg.str_save",
    "rpg.def_save",
    "rpg.int_save",
    "rpg.agi_save",
    "rpg.luk_save",
    "rpg.kb_save",
    //other
    "rpg.invincibility",
    "rpg.hpbar_timer",
    "rpg.job",
    "rpg.hpregen_i",
    "rpg.mpregen_i",

    //memory
    "rpg.memory_1",
    "rpg.memory_2",
    "rpg.memory_3",
    "rpg.memory_4",
    "rpg.memory_5",
    "rpg.memory_6",
    "rpg.memory_7",
    "rpg.memory_8",
    "rpg.memory_9",
    "rpg.memory_10",
    "rpg.memory_11",
    "rpg.memory_12",
    "rpg.memory_13",
    "rpg.memory_14",
    "rpg.memory_15",
    "rpg.memory_16"
];

system.beforeEvents.startup.subscribe(() => {
    system.run(() => {
        addObj.forEach(obj => {
            if (world.scoreboard.getObjective(obj)) return;
            world.scoreboard.addObjective(obj);
        });
    })
});