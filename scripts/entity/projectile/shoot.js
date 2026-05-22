import { world, system } from "@minecraft/server";
import util from "../../util";
import { DyPro } from "../../dypro.js";
import { projectileConfig } from "./projectileConfig.js";

/**
 * プロジェクタイルの着弾イベントを管理するクラス
 */
class ProjectileHitEvent {
    constructor() {
        this.subscribers = [];
        this.idSubscribers = new Map(); // IDごとのコールバック
    }

    /**
     * 着弾イベントを購読する
     * @param {string|Function} idOrCallback ID文字列 または 全体向けコールバック
     * @param {Function} [callback] ID指定時のコールバック
     */
    subscribe(idOrCallback, callback) {
        if (typeof idOrCallback === "function") {
            this.subscribers.push(idOrCallback);
        } else {
            if (!this.idSubscribers.has(idOrCallback)) {
                this.idSubscribers.set(idOrCallback, []);
            }
            this.idSubscribers.get(idOrCallback).push(callback);
        }
    }

    // ユーザーが emit(id, callback) の形式で記述しているため、別名としてサポート
    emit(idOrCallback, callback) {
        this.subscribe(idOrCallback, callback);
    }

    /**
     * 内部または外部からの着弾通知
     */
    trigger(data, projectile) {
        // 全体向け
        for (const cb of this.subscribers) {
            try { cb(projectile, data); } catch (e) { console.error(e); }
        }

        // ID指定向け
        if (projectile) {
            const dy = new DyPro("projectile", projectile);
            const customId = dy.get("customId");
            if (customId && this.idSubscribers.has(customId)) {
                const cbs = this.idSubscribers.get(customId);
                for (const cb of cbs) {
                    try { cb(projectile, data); } catch (e) { console.error(e); }
                }
            }
        }
    }
}

export const projectileHit = new ProjectileHitEvent();

/**
 * プロジェクタイル（発射物）の発射を管理するクラス
 */
export default class Shoot {
    /**
     * エンティティの視線方向にプロジェクタイルを発射する（TP制御）
     * @param {import("@minecraft/server").Entity} owner 発射したエンティティ
     * @param {string|Object} typeOrOptions プロジェクタイルのエンティティID または 発射オプション
     * @param {Object} [options] 発射オプション (typeOrOptions が ID の場合に使用)
     * @returns {import("@minecraft/server").Entity} 生成されたプロジェクタイル
     */
    static fire(owner, typeOrOptions = {}, options = {}) {
        let finalOptions = {};

        if (typeof typeOrOptions === "string") {
            finalOptions = { ...options, type: typeOrOptions };
        } else {
            finalOptions = { ...typeOrOptions };
            if (!finalOptions.type) finalOptions.type = "rpg:projectile";
        }

        const {
            type,
            customId = null,
            speed = 1.0,
            subSteps = Math.ceil(finalOptions.speed || 1.0), // 明示的な指定がなければspeedを元に計算
            onTick = null,
            penetrateBlock = false,
            penetrateEntity = false,
            excludeBlocks = projectileConfig.excludeBlocks,
            excludeEntities = projectileConfig.excludeEntities,
            maxLife = 100,
            offset = { x: 0, y: 0.1, z: 0 }
        } = finalOptions;

        const viewDir = owner.getViewDirection();
        const headLoc = owner.getHeadLocation();
        const rotation = owner.getRotation();

        // 初期スポーン位置
        let currentPos = {
            x: headLoc.x + viewDir.x * 1.5 + offset.x,
            y: headLoc.y + viewDir.y * 1.5 + offset.y,
            z: headLoc.z + viewDir.z * 1.5 + offset.z
        };

        try {
            const projectile = owner.dimension.spawnEntity(type, currentPos);
            projectile.setRotation(rotation);
            projectile.addTag(`owner_${owner.id}`);
            
            // DyPro データの登録
            const dy = new DyPro("projectile", projectile);
            if (customId) dy.set("customId", customId);
            dy.set("ownerId", owner.id);

            const velocity = {
                x: viewDir.x * speed,
                y: viewDir.y * speed,
                z: viewDir.z * speed
            };

            let ticks = 0;
            const hitEntityIds = new Set();

            const runId = system.runInterval(() => {
                try {
                    if (!projectile.isValid) {
                        system.clearRun(runId);
                        return;
                    }

                    ticks++;
                    if (ticks > maxLife) {
                        projectile.remove();
                        system.clearRun(runId);
                        return;
                    }

                    // 1ティックの移動を分割して判定（高速移動によるすり抜け防止）
                    const stepVec = {
                        x: velocity.x / subSteps,
                        y: velocity.y / subSteps,
                        z: velocity.z / subSteps
                    };

                    let wasRemoved = false;

                    for (let i = 0; i < subSteps; i++) {
                        const nextPos = {
                            x: currentPos.x + stepVec.x,
                            y: currentPos.y + stepVec.y,
                            z: currentPos.z + stepVec.z
                        };

                        // --- 当たり判定：ブロック ---
                        if (!penetrateBlock) {
                            const block = projectile.dimension.getBlock(nextPos);
                            if (block && !block.isAir && !block.isLiquid) {
                                if (!excludeBlocks.includes(block.typeId)) {
                                    projectileHit.trigger({ block, hitEntity: null, source: owner }, projectile);
                                    projectile.remove();
                                    wasRemoved = true;
                                    break;
                                }
                            }
                        }

                        // --- 当たり判定：エンティティ ---
                        const hitEntities = util.getEntities(projectile.dimension, currentPos, 0.4, nextPos, {
                            excludeTypes: [type, ...excludeEntities],
                            excludeIds: [String(owner.id), String(projectile.id)]
                        });

                        if (hitEntities.length > 0) {
                            let hitSomething = false;
                            for (const target of hitEntities) {
                                if (hitEntityIds.has(target.id)) continue;
                                
                                projectileHit.trigger({ block: null, hitEntity: target, source: owner }, projectile);
                                hitEntityIds.add(target.id);

                                if (!penetrateEntity) {
                                    hitSomething = true;
                                    break;
                                }
                            }

                            if (hitSomething) {
                                projectile.remove();
                                wasRemoved = true;
                                break;
                            }
                        }

                        // 次のステップの開始地点を更新
                        currentPos = nextPos;
                        projectile.teleport(currentPos);

                        if (onTick) onTick(projectile);
                    }

                    if (wasRemoved) {
                        system.clearRun(runId);
                        return;
                    }

                } catch (tickError) {
                    system.clearRun(runId);
                    if (projectile.isValid) projectile.remove();
                }
            }, 1);

            return projectile;
        } catch (error) {
            console.error(`[Shoot-Start] Error: ${error}`);
            return null;
        }
    }
}
