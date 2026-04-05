
//typeは0がパッシブスキル、1がアクティブスキル
//#は変数
export default {
    "attackPower": {
        name: "攻撃強化",
        getdescription: "30ダメージ以上を与える",
        description: "攻撃力を上昇させる",
        type: 0,
        variable: {
            "level": 0
        },
        level: [
            {
                name: "小",
                variable: {
                    "powerp": 5
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
                    "powerp": 10
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
                    "powerp": 15
                }
            }
        ],
        sc: {
            conditions: [],
            result: {
                status: {
                    percent: [
                        {
                            type: "str",
                            value: "v.powerp"
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
    },
    "super_regeneration": {
        name: "超回復",
        description: "MPを使ってHPを回復する",
        getdescription: "MPREGENとHPREGENの合計が300以上",
        type: 0,
        sc: {
            conditions: [
                {
                    type: "status",
                    operation: ">=",
                    value: "#status.mp",
                    value2: 5
                },
                {
                    type: "status",
                    operation: "<",
                    value: "#status.hp",
                    value2: "#status.maxhp"
                }
            ],
            result: {
                status: {
                    add: [
                        {
                            type: "hp",
                            value: 1
                        },
                        {
                            type: "mp",
                            value: -5
                        }
                    ]
                }
            },
            getconditions: [
                {
                    type: "status",
                    operation: ">",
                    value: "#status.hpregen + #status.mp",
                    value2: 300
                }
            ]
        }
    }
}
