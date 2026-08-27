/** @type {import("../skill").PassiveSkillDefinition} */
export default {
    id: "clenching",
    name: "食いしばり",
    description: "自傷ダメージにより、HPが0以下になった時HP1で生き残る",
    getdescription: "LUKを100以上にする",
    sc: {
        // イベント条件オブジェクト (deathイベント時に自傷かつ自分ターゲットであること)
        conditions: [
            { type: "death", target: "self", selfby: true }
        ],
        // 連続発動を防ぐためのクールタイム（60秒）
        cooldown: 60,
        effects: {
            // HPを1にする
            set: { hp: 1 }
        },
        // ポーション効果を直下に分別
        potion: [
            { id: "regeneration", duration: 5, amplifier: 2, showParticles: true },
            { id: "resistance", duration: 5, amplifier: 4, showParticles: true }
        ],
        // トーテム発動時の音とパーティクルを直下に分別
        commands: [
            "playsound random.totem @s ~ ~ ~ 1.0 1.0",
            "particle minecraft:totem_particle ~ ~1 ~"
        ],
        // プレイヤーへのフィードバックメッセージを直下に分別
        message: {
            chat: "§e[食いしばり] 致命傷を耐えきった！ (クールダウン: 60秒)",
            actionbar: "§6★ 食いしばり発動 ★"
        },
        // 新機能: JavaScript の評価と実行 (eval)
        script: `
            // 引数として player, skillVar, server, util が利用可能
            player.sendMessage("§d[Script] 食いしばりスクリプト実行！ プレイヤー名: " + player.name);
        `,
        // 取得条件の文字列化
        getconditions: "#status.luk > 100"
    }
}
