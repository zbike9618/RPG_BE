import util from "../../../../util";
import * as server from "@minecraft/server";
import Memory from "../../../memory";

/** @type {import("../skill").PassiveSkillDefinition} */
export default {
    id: "clenching",
    name: "食いしばり",
    description: "自傷ダメージにより、HPが0以下になった時HP1で生き残る",
    getdescription: "LUKを100以上にする",
    // 死亡前に呼び出されるコールバック
    death(player, context, skillVar) {
        // 自傷ダメージかつ自分ターゲットであること
        if (!(context.target === "self" && context.selfby === true)) return;

        // クールダウンチェック（60秒）
        const cooldownKey = `cool_clenching`;
        const currentTick = server.system.currentTick;
        const coolEnd = Memory.get(player, cooldownKey) || 0;
        if (coolEnd > currentTick) return;

        // クールダウン設定
        Memory.set(player, cooldownKey, currentTick + 1200);

        // HPを1にする
        util.score.set(player, "rpg.hp", 1);


        // トーテム発動時の音とパーティクル
        try {
            player.runCommand("playsound random.totem @s ~ ~ ~ 1.0 1.0");
            player.runCommand("particle minecraft:totem_particle ~ ~1 ~");
        } catch (e) { }

        // メッセージ送信
        player.sendMessage("§e[食いしばり] 致命傷を耐えきった！ (クールダウン: 60秒)");
        player.onScreenDisplay.setActionBar("§6★ 食いしばり発動 ★");
    },

    sc: {
        // 取得条件の文字列化
        getconditions: "#status.luk > 100"
    }
}
