/** @type {import("../skill").PassiveSkillDefinition} */
export default {
    id: "super_regeneration",
    name: "超回復",
    description: "MPを使ってHPを回復する",
    getdescription: "MPREGENとHPREGENの合計が300以上",
    sc: {
        // トリガー間隔を1秒（20 ticks）にする
        tickInterval: 1,
        // 簡易文字列式による条件
        conditions: "#status.mp >= 5 && #status.hp < #status.maxhp",
        effects: {
            // 平坦なオブジェクトでの値加算
            add: { hp: 1, mp: -5 }
        },
        // 回復時のコマンド演出（サウンドとハート粒子）を直下に分別
        commands: [
            "playsound random.orb @s ~ ~ ~ 0.3 1.5",
            "particle minecraft:heart_particle ~ ~1.2 ~"
        ],
        // 習得条件の文字列化
        getconditions: "#status.hpregen + #status.mp > 300"
    }
}
