
//typeは0がパッシブスキル、1がアクティブスキル
//#は変数
export default {
    "attackPower": {
        name: "攻撃強化",
        description: "攻撃力を上昇させる",
        type: 0,
        variable: {
            "level": 0
        },
        level: [
            {
                name: "小",
                variable: {
                    "level": 1
                },
                evoconditions: [
                    {
                        type: "attack",
                        operation: ">=",
                        value: "#attack.damage",
                        value2: 50
                    }
                ]
            },
            {
                name: "中",
                variable: {
                    "level": 5
                },
                evoconditions: [
                    {
                        type: "attack",
                        operation: ">=",
                        value: "#attack.damage",
                        value2: 70
                    }
                ]
            },
            {
                name: "大",
                variable: {
                    "level": 10
                }
            }
        ],
        sc: {
            conditions: [],
            result: {
                status: {
                    add: [
                        {
                            type: "str",
                            value: "v.level"
                        }
                    ]
                }
            },
            getconditions: [
                {
                    type: "attack",
                    operation: ">=",
                    value: "#attack.damage",
                    value2: 30
                }
            ]
        }

    },
    "clenching": {
        name: "食いしばり",
        description: "自傷ダメージにより、HPが0以下になった時HP1で生き残る",
        getdescription: "LUKを100以上にする",
        type: 0,
        sc: {
            conditions: [
                {
                    type: "death",
                    target: "self",
                    selfby: true
                }
            ],
            result: {
                status: {
                    set: [
                        {
                            type: "hp",
                            value: 1
                        }
                    ]
                }
            },
            getconditions: [
                {
                    type: "status",
                    operation: ">",
                    value: "#status.luk",
                    value2: 100
                }
            ]
        }
    }
}