/** @type {import("../skill").PassiveSkillDefinition} */
export default {
    id: "teppeki",
    name: "鉄壁",
    getdescription: "30ダメージ以上を与える",
    description: "防御力を上昇させる",
    variable: {
        "shieldp": 0
    },
    level: [
        {
            name: "小",
            variable: {
                "shieldp": 5
            },
            evoconditions: "#attack.damage >= 50"
        },
        {
            name: "中",
            variable: {
                "shieldp": 10,
            },
            evoconditions: "#attack.damage >= 70"
        },
        {
            name: "大",
            variable: {
                "shieldp": 15
            }
        }
    ],
    sc: {
        conditions: "",
        effects: {
            percent: {
                def: "v.shieldp"
            }
        },
        getconditions: "#attack.damage >= 30"
    }
}
