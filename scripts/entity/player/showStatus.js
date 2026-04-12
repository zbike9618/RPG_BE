import * as server from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import util from "../../util";
import jobdata from "./job/jobdata";
import { getRequiredExp } from "./levelUp";

/**
 * プレイヤーの現在のステータスをUI（またはチャット）で表示する関数
 * @param {import("@minecraft/server").Player} player 
 * @param {"ui"|"chat"} displayType 表示方法を選べます ("ui" か "chat")
 */
export function showStatus(player, displayType = "ui") {
    const scutil = util.score;
    const lv = scutil.get(player, "rpg.level") || 1;
    const exp = scutil.get(player, "rpg.exp") || 0;
    const nextExp = getRequiredExp(lv);

    const jobId = scutil.get(player, "rpg.job") || 0;
    const jobName = jobdata[jobId] ? jobdata[jobId].name : "無職";

    // 各ステータスの取得（装備＆ジョブ補正込みの実数値 _doスコア）
    const maxhp = scutil.get(player, "rpg.maxhp_do") || 0;
    const maxmp = scutil.get(player, "rpg.maxmp_do") || 0;
    const str = scutil.get(player, "rpg.str_do") || 0;
    const def = scutil.get(player, "rpg.def_do") || 0;
    const int = scutil.get(player, "rpg.int_do") || 0;
    const agi = scutil.get(player, "rpg.agi_do") || 0;
    const luk = scutil.get(player, "rpg.luk_do") || 0;
    const crt = scutil.get(player, "rpg.crt_do") || 0;
    const res = scutil.get(player, "rpg.res_do") || 0;
    const hpregen = scutil.get(player, "rpg.hpregen_do") || 0;
    const mpregen = scutil.get(player, "rpg.mpregen_do") || 0;

    const money = scutil.get(player, "rpg.money") || 0;

    // 表示用テキストの構築
    let infoBlock = `§l§e=== プレイヤー情報 ===§r\n`;
    infoBlock += `職業: §a${jobName}§r\n`;
    infoBlock += `Lv: §b${lv}§r\n`;
    infoBlock += `EXP: §3${exp} / ${nextExp}§r\n`;
    infoBlock += `所持金: §e${money} G§r\n\n`;

    let statsBlock = `§l§c=== ステータス ===§r\n`;
    statsBlock += `最大HP: §a${maxhp}§r\n`;
    statsBlock += `最大MP: §b${maxmp}§r\n`;
    statsBlock += `力(STR): §c${str}§r\n`;
    statsBlock += `防御(DEF): §7${def}§r\n`;
    statsBlock += `知力(INT): §5${int}§r\n`;
    statsBlock += `敏捷(AGI): §e${agi}§r\n`;
    statsBlock += `運(LUK): §6${luk}§r\n`;
    statsBlock += `クリ率(CRT): §6${crt}%§r\n`; // CRTは%表示
    statsBlock += `魔防(RES): §3${res}§r\n`;
    statsBlock += `HP回復力: §a${hpregen}§r\n`;
    statsBlock += `MP回復力: §b${mpregen}§r\n`;
    statsBlock += `§l§c=================§r\n`;

    // チャット出力指定の場合はステータスのみを送信して終了
    if (displayType === "chat") {
        player.sendMessage(statsBlock);
        return;
    }

    const fullBody = infoBlock + statsBlock;

    // ActionFormDataを用いたUI表示 (デフォルトは詳細版)
    const form = new ActionFormData()
        .title("§lステータス画面")
        .body(fullBody)
        .button("閉じる");

    form.show(player).catch(e => {
        // UIが表示できない状況の場合はチャットで送信
        player.sendMessage(fullBody);
    });
}
