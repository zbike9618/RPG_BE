import util from "../../../../util.js";
import entityPatch from "../../../entityPatch.js";

/** @type {import("../skill").ActiveSkillDefinition} */
export default {
    id: "spinattack",
    name: "回転斬り",
    description: "周囲の敵をなぎ払う",
    getdescription: "STRを50以上にする",
    element: "無",
    weaponTags: ["rpg.sword"], // 刀剣のみに装備可能
    sc: {
        getconditions: "#status.str >= 50"
    },
    execute(player, skillVar, { needMp, needCool }) {
        if (!needMp(player, 10)) return;
        if (!needCool(40)) return; // 2秒のクールタイム

        const dim = player.dimension;
        const pos = player.location;

        // 音の再生
        player.playSound("player.attack.sweep");

        // 360度の周囲にスイープパーティクルを発生させる
        for (let angle = 0; angle < 360; angle += 45) {
            const rad = (angle * Math.PI) / 180;
            const x = pos.x + Math.sin(rad) * 2;
            const z = pos.z + Math.cos(rad) * 2;
            dim.spawnParticle("rpg:sweep", { x, y: pos.y + 0.8, z });
        }

        // 周囲の敵を取得してダメージを与える
        const entities = dim.getEntities({
            location: pos,
            maxDistance: 3.5,
            excludeIds: [player.id]
        });

        entities.forEach(entity => {
            const family = entity.getComponent("minecraft:type_family");
            if (entity.typeId !== "minecraft:player" && (!family || !family.hasTypeFamily("mob"))) return;

            // 攻撃力(STR)の1.5倍の物理ダメージを適用
            entityPatch.damage(entity, 0, {
                reference: "rpg.str_do * 1.5",
                damagerId: player.id,
                damageType: "physic"
            });

            // ノックバックを与える
            util.knockbackFromPoint(pos, entity, 0.5);
        });
    }
}
