/** @type {import("../skill").PassiveSkillDefinition} */
export default {
    id: "attackPower",
    name: "攻撃強化",
    getdescription: "30ダメージ以上を与える",
    description: "攻撃力を上昇させる",
    variable: {
        "level": 0
    },
    level: [
        {
            name: "小",
            variable: {
                "powerp": 5
            },
            evoconditions: "#attack.damage >= 50"
        },
        {
            name: "中",
            variable: {
                "powerp": 10
            },
            evoconditions: "#attack.damage >= 70"
        },
        {
            name: "大",
            variable: {
                "powerp": 15
            }
        }
    ],
    sc: {
        conditions: "",
        effects: {
            percent: {
                str: "v.powerp"
            }
        },
        getconditions: "#attack.damage >= 30"
    }
}
