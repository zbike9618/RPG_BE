import { system } from "@minecraft/server";
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
    execute(player, skillVar, { checkCost }) {
        if (!checkCost(10, 40)) return;

        const dim = player.dimension;



        // すでにダメージを与えたエンティティIDを記録するSet
        const damagedEntities = new Set();

        // プレイヤーの視点を回転させながらパーティクルとダメージ判定を連動
        let currentTick = 0;
        const totalTicks = 6; // 20ティック（1秒）で1周
        const rotationStep = 360 / totalTicks;
        const spinId = system.runInterval(() => {
            if (!player || !player.isValid) {
                system.clearRun(spinId);
                return;
            }
            try {
                // 1. プレイヤーを回転させる
                const rot = player.getRotation();
                const newYaw = rot.y + rotationStep;
                player.teleport(player.location, {
                    rotation: {
                        x: rot.x,
                        y: newYaw
                    }
                });
                // 音の再生
                player.playSound("player.attack.sweep");
                // 2. 回転先の正面にスイープパーティクルを発生させる
                const particlePos = util.getForwardPosition(player, 0, 0.8, 2);
                dim.spawnParticle("rpg:sweep", particlePos);

                // 3. 周囲の敵にダメージ（多段ヒットを防ぐため1体につき1度だけ適用）
                const entities = dim.getEntities({
                    location: player.location,
                    maxDistance: 3.5
                });

                entities.forEach(entity => {
                    if (entity.id === player.id) return;
                    if (damagedEntities.has(entity.id)) return; // すでにヒット済みの場合はスキップ

                    const family = entity.getComponent("minecraft:type_family");
                    if (entity.typeId !== "minecraft:player" && (!family || !family.hasTypeFamily("mob"))) return;

                    damagedEntities.add(entity.id);

                    // 攻撃力(STR)の1.5倍の物理ダメージを適用
                    entityPatch.damage(entity, 0, {
                        reference: "rpg.str_do * 1.5",
                        damagerId: player.id,
                        damageType: "physic"
                    });

                    // ノックバックを与える
                    util.knockbackFromPoint(player.location, entity, 0.5);
                });
            } catch (e) {
                console.error(e);
            }
            currentTick++;
            if (currentTick >= totalTicks) {
                system.clearRun(spinId);
            }
        }, 1);
    }
}
