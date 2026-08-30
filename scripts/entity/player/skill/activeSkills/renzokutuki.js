import { system } from "@minecraft/server";
import util from "../../../../util.js";
import entityPatch from "../../../entityPatch.js";

/** @type {import("../skill.js").ActiveSkillDefinition} */
export default {
    id: "renzokutuki",
    name: "連続ツキ",
    description: "前方に素早い連続突きを繰り出す",
    getdescription: "STRとAGIを30以上にする",
    element: "無",
    weaponTags: ["rpg.spear"], // 槍のみに装備可能
    sc: {
        getconditions: "#status.str >= 30 && #status.agi >= 30"
    },
    execute(player, skillVar, { checkCost }) {
        if (!checkCost(15, 50)) return; // MP 15 / Cooldown 50ticks (2.5秒)

        const dim = player.dimension;

        let thrustCount = 0;
        const totalThrusts = 6; // 0, 1, 2, 3 (突) | 4 (溜め時間) | 5 (フィニッシュ撃)
        const thrustIntervalTicks = 2; // 2ティック間隔で突きを実行

        const thrustId = system.runInterval(() => {
            if (!player || !player.isValid) {
                system.clearRun(thrustId);
                return;
            }

            try {
                if (thrustCount < 4) {
                    // --- 1〜4撃目：高速小突き ---
                    player.playSound("item.trident.throw", { pitch: 1.4 + (thrustCount * 0.1) });

                    // プレイヤーの向きをランダムに少し動かす（リコイル・カメラブレの表現）
                    const rot = player.getRotation();
                    const randomYaw = Math.random() * 16 - 8; // 左右に最大4度
                    const randomPitch = Math.random() * 12 - 6; // 上下に最大6度（縦の揺れを拡大）
                    player.teleport(player.location, {
                        rotation: {
                            x: rot.x + randomPitch,
                            y: rot.y + randomYaw
                        }
                    });

                    // プレイヤーの新しい正面方向にパーティクルを発生させる
                    for (let d = 1; d <= 5; d++) {
                        const pPos = util.getForwardPosition(player, 0, 1.0, d);
                        dim.spawnParticle("minecraft:basic_crit_particle", pPos);
                    }

                    const hitEntities = new Set();
                    const checkPoints = [1.5, 3.0, 4.5];
                    for (const d of checkPoints) {
                        const checkPos = util.getForwardPosition(player, 0, 1.0, d); // 判定の高さも1.0に統一
                        const targets = dim.getEntities({
                            location: checkPos,
                            maxDistance: 1.2
                        });
                        for (const target of targets) {
                            if (target.id !== player.id) {
                                hitEntities.add(target);
                            }
                        }
                    }

                    hitEntities.forEach(target => {
                        const family = target.getComponent("minecraft:type_family");
                        if (target.typeId !== "minecraft:player" && (!family || !family.hasTypeFamily("mob"))) return;

                        entityPatch.damage(target, 0, {
                            reference: "rpg.str_do * 0.4",
                            damagerId: player.id,
                            damageType: "physic"
                        });

                        util.knockbackFromPoint(player.location, target, 0.15);
                    });

                } else if (thrustCount === 5) {
                    // --- 5撃目（最終段）：渾身のフィニッシュ突き ---
                    player.playSound("item.trident.throw", { pitch: 0.7 });
                    player.playSound("player.attack.strong", { pitch: 0.8 });

                    // まっすぐ前方に極大の貫通衝撃波
                    for (let d = 1; d <= 6; d++) {
                        const pPos = util.getForwardPosition(player, 0, 0.8, d);
                        dim.spawnParticle("minecraft:basic_crit_particle", pPos);
                        if (d >= 5) {
                            dim.spawnParticle("minecraft:sonic_explosion", pPos);
                        }
                    }

                    const hitEntities = new Set();
                    const checkPoints = [2.0, 4.0, 6.0];
                    for (const d of checkPoints) {
                        const checkPos = util.getForwardPosition(player, 0, 0.8, d);
                        const targets = dim.getEntities({
                            location: checkPos,
                            maxDistance: 2.0 // 横判定も少し広め
                        });
                        for (const target of targets) {
                            if (target.id !== player.id) {
                                hitEntities.add(target);
                            }
                        }
                    }

                    hitEntities.forEach(target => {
                        const family = target.getComponent("minecraft:type_family");
                        if (target.typeId !== "minecraft:player" && (!family || !family.hasTypeFamily("mob"))) return;

                        entityPatch.damage(target, 0, {
                            reference: "rpg.str_do * 1.5", // 1.5倍のフィニッシュダメージ
                            damagerId: player.id,
                            damageType: "physic"
                        });

                        // 強力なノックバック
                        util.knockbackFromPoint(player.location, target, 2);
                    });
                }
            } catch (e) {
                console.error(e);
            }

            thrustCount++;
            if (thrustCount >= totalThrusts) {
                system.clearRun(thrustId);
            }
        }, thrustIntervalTicks);
    }
}
