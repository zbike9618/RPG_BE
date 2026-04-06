
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
    },
    "haisuinojin": {
        name: "背水の陣",
        description: "HPが10%以下の時、全ステータスが50%上昇する",
        getdescription: "30体以上のエネミーを倒す",
        type: 0,
        sc: {
            conditions: [
                {
                    type: "status",
                    operation: "<",
                    value: "#status.hp",
                    value2: "#status.maxhp / 10"
                }
            ],
            result: {
                status: {
                    percent: [
                        { type: "str", value: 50 },
                        { type: "agi", value: 50 },
                        { type: "vit", value: 50 },
                        { type: "int", value: 50 },
                        { type: "luk", value: 50 }
                    ]
                }
            },
            getconditions: [
                {
                    type: "kill",
                    operation: ">=",
                    value: "#kill_count",
                    value2: 30
                },
                {
                    type: "status",
                    operation: "<",
                    value: "#status.hp",
                    value2: "#status.maxhp / 10"
                }
            ]
        }
    }
}
