/**
 * プロジェクタイルの当たり判定に関する設定
 */
export const projectileConfig = {
    /**
     * 当たり判定を除外するブロック（貫通するブロック）
     * 空気と液体以外で、衝突させたくないものを指定します。
     */
    excludeBlocks: [
        "minecraft:short_grass",
        "minecraft:tall_grass"
    ],

    /**
     * 当たり判定を除外するエンティティタイプ
     */
    excludeEntities: [
        "minecraft:item",
        "minecraft:xp_orb",
        "minecraft:armor_stand"
    ]
};
