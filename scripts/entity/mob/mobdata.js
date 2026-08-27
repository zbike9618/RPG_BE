export default {
    "minecraft:zombie": {
        "name": "ゾンビ",
        "maxhp": 30,
        "str": 5,
        "def": 1,
        "int": 1,
        "agi": 1,
        "res": 1,
        "exp": 10,
        "money": 10,
        // 新しい属性システム設定
        "element": "土",            // ゾンビ自身の属性（土属性。風ダメージが弱点1.5倍になる）
        "physical_resistance": 1.0, // 物理耐性倍率 (1.0 = 100%ダメージ)
        "magic_resistance": 0.8,    // 魔法耐性倍率 (0.8 = 20%カット)
        "perLevel": {
            "maxhp": 20,
            "str": 2,
            "def": 1,
            "int": 0,
            "agi": 1,
            "res": 1,
            "exp": 5,
            "money": 5
        }
    }
}