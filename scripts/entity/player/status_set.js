import * as server from "@minecraft/server";
import util from "../../util";
const { world, system } = server;
import weapondata from "../../weapon/weapondata";
let count = 0;
const status = [
    "maxhp",
    "maxmp",
    "hpregen",
    "mpregen",
    "str",
    "def",
    "int",
    "agi",
    "luk",
    "kb",
]
system.runInterval(() => {
    const players = world.getAllPlayers();
    if (players.length === 0) return;

    const index = count % players.length;
    const player = players[index];
    count++;

    if (!player || !player.isValid) return;
    const scutil = util.score;
    // ジョブ情報の取得
    const jobId = scutil.get(player, "rpg.job") || 0;


    for (const s of status) {
        const savescorename = `rpg.${s}_save`;
        const doscorename = `rpg.${s}_do`;
        const scutil = util.score;
        //world.sendMessage(`${savescorename}`)
        let result = scutil.get(player, savescorename) || 0;
        //const doscore = scutil.get(player, doscorename);



        // 装備補正
        const heldItem = player.getComponent("minecraft:inventory").container.getItem(player.selectedSlotIndex);
        if (heldItem && weapondata[heldItem.typeId]) {
            result += weapondata[heldItem.typeId].st[s] || 0;
        }

        //-----------------------------------------------------
        scutil.set(player, doscorename, result);
    }

});