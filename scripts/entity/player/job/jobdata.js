export default [
    {
        id: "fighter",
        name: "ファイター",
        initial: { maxhp: 50, maxmp: 20, str: 10, def: 8, int: 5, agi: 5, luk: 5 },
        regular: [
            { step: 1, stats: { str: 1, maxhp: 5 } },
            { step: 3, stats: { str: 2, def: 1 } },
            { step: 10, stats: { maxhp: 50, str: 10 } }
        ]
    },
    {
        id: "assassin",
        name: "アサシン",
        initial: { maxhp: 40, maxmp: 30, str: 8, def: 5, int: 8, agi: 15, luk: 10 },
        regular: [
            { step: 1, stats: { agi: 1, luk: 1 } },
            { step: 2, stats: { agi: 2, luk: 1, str: 1 } },
            { step: 10, stats: { agi: 10, luk: 5, str: 5 } }
        ]
    },
    {
        id: "knight",
        name: "ナイト",
        initial: { maxhp: 80, maxmp: 15, str: 8, def: 12, int: 5, agi: 3, luk: 5 },
        regular: [
            { step: 1, stats: { def: 1, maxhp: 5 } },
            { step: 5, stats: { maxhp: 50, def: 10, str: 5 } },
            { step: 20, stats: { def: 20 } }
        ]
    },
    {
        id: "warrior",
        name: "ウォーリア",
        initial: { maxhp: 60, maxmp: 10, str: 15, def: 5, int: 2, agi: 4, luk: 5 },
        regular: [
            { step: 1, stats: { str: 2 } },
            { step: 3, stats: { maxhp: 20, str: 5 } },
            { step: 10, stats: { str: 20, maxhp: 50 } }
        ]
    },
    {
        id: "wizard",
        name: "ウィザード",
        initial: { maxhp: 30, maxmp: 100, str: 2, def: 3, int: 20, agi: 5, luk: 8 },
        regular: [
            { step: 1, stats: { int: 2, maxmp: 10 } },
            { step: 5, stats: { int: 15, maxmp: 100 } },
            { step: 10, stats: { int: 30, maxmp: 200 } }
        ]
    },
    {
        id: "hunter",
        name: "ハンター",
        initial: { maxhp: 45, maxmp: 40, str: 6, def: 6, int: 8, agi: 12, luk: 12 },
        regular: [
            { step: 1, stats: { agi: 1, luk: 1 } },
            { step: 3, stats: { agi: 5, luk: 5, str: 2 } },
            { step: 10, stats: { agi: 15, luk: 15 } }
        ]
    },
    {
        id: "guardian",
        name: "ガーディアン",
        initial: { maxhp: 120, maxmp: 20, str: 5, def: 20, int: 5, agi: 2, luk: 10 },
        regular: [
            { step: 1, stats: { def: 2, maxhp: 10 } },
            { step: 5, stats: { def: 10, maxhp: 100 } },
            { step: 20, stats: { def: 50, maxhp: 500 } }
        ]
    }
]
