import Buff from "../../buff.js";
import Interval from "../../../interval.js";
import util from "../../../../util.js";

/** @type {import("../skill").ActiveSkillDefinition} */
export default {
    id: "tenjoutenge",
    name: "天井天下唯我独尊",
    description: "発動すると30秒間、周囲の自分より劣る者の戦闘能力を半減させる。",
    getdescription: "STRとVITを100以上にする",
    sc: {
        getconditions: "#status.str >= 100 && #status.vit >= 100"
    },
    execute(player, skillVar, { needMp, needCool }) {
        if (!needMp(player, 30)) return;
        if (!needCool(600)) return; // 30秒のクールタイム

        player.sendMessage("§c天上天下唯我独尊...");
        player.dimension.spawnParticle("rpg:impact", player.location);

        // 10秒間 (200 ticks)、1秒 (20 ticks) ごとに周囲にデバフオーラを展開
        Interval.add(player, (p) => {
            const dim = p.dimension;
            const pos = p.location;
            const entities = dim.getEntities({
                location: pos,
                maxDistance: 10,
                excludeIds: [p.id]
            });

            const stats = ["str", "def", "vit", "int", "luk", "agi"];

            // 自分のステータスを取得
            const myStats = {};
            for (const s of stats) {
                myStats[s] = util.score.get(p, `rpg.${s}_do`) ?? util.score.get(p, `rpg.${s}`) ?? 0;
            }

            entities.forEach(entity => {
                const family = entity.getComponent("minecraft:type_family");
                if (entity.typeId !== "minecraft:player" && (!family || !family.hasTypeFamily("mob"))) return;

                // 相手のステータスを取得
                const targetStats = {};
                let hasAnyStat = false;
                for (const s of stats) {
                    const val = util.score.get(entity, `rpg.${s}_do`) ?? util.score.get(entity, `rpg.${s}`) ?? 0;
                    targetStats[s] = val;
                    if (val > 0) hasAnyStat = true;
                }

                // 相手がステータス持ちの場合のみ比較
                if (!hasAnyStat) return;

                // 自分が勝っているステータスの数をカウント
                let winCount = 0;
                for (const s of stats) {
                    if (myStats[s] > targetStats[s]) {
                        winCount++;
                        if (winCount >= 2) break;
                    }
                }

                // 2個以上勝っている場合、対象の全ステータスを半分にするデバフを適用
                if (winCount >= 2) {
                    for (const s of stats) {
                        Buff.add(entity, "tenjoutenge_debuff_" + s, s, -50, "percent", 2);
                    }

                    // 演出：足元に黒い煙パーティクル
                    dim.spawnParticle("minecraft:squid_ink_bubble", {
                        x: entity.location.x,
                        y: entity.location.y + 0.5,
                        z: entity.location.z
                    });
                }
            });
        }, 20, 200);
    }
}
