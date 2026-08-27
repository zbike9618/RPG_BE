/** @type {import("../skill").PassiveSkillDefinition} */
export default {
    id: "haisuinojin",
    name: "背水の陣",
    description: "HPが10%以下の時、全ステータスが50%上昇する",
    getdescription: "30体以上のエネミーを倒す",
    sc: {
        conditions: "#status.hp < #status.maxhp / 10",
        effects: {
            percent: {
                str: 50,
                agi: 50,
                vit: 50,
                int: 50,
                luk: 50
            }
        },
        // 討伐数30以上かつHP10%以下で習得
        getconditions: "#kill_count >= 30 && #status.hp < #status.maxhp / 10"
    }
}
