import * as server from "@minecraft/server";
const { world } = server;
export default class {
    static getForwardPosition(player, x = 0, y = 0, z = 0) {
        const base = player.location;
        const viewDir = player.getViewDirection();
        const horizontalMag = Math.sqrt(viewDir.x ** 2 + viewDir.z ** 2);

        let right = { x: 0, z: 0 };
        if (horizontalMag > 0.0001) {
            right.x = -viewDir.z / horizontalMag;
            right.z = viewDir.x / horizontalMag;
        } else {
            const rot = player.getRotation();
            const rad = (rot.y * Math.PI) / 180;
            const fH = { x: -Math.sin(rad), z: Math.cos(rad) };
            right.x = -fH.z;
            right.z = fH.x;
        }

        return {
            x: base.x + (viewDir.x * z) + (right.x * x),
            y: base.y + (viewDir.y * z) + y,
            z: base.z + (viewDir.z * z) + (right.z * x),
        };
    }
    static expandParticle(dim, center, count, range, par) {

        for (let i = 0; i < count; i++) {
            const offsetX = (Math.random() * 2 - 1) * range;
            const offsetY = (Math.random() * 2 - 1) * range;
            const offsetZ = (Math.random() * 2 - 1) * range;

            const pos = {
                x: center.x + offsetX,
                y: center.y + offsetY,
                z: center.z + offsetZ,
            };

            dim.spawnParticle(par, pos);
        }
    }
    /**
     * ある地点から、指定したエンティティを外側へノックバックさせる
     * @param {{x:number,y:number,z:number}} center  ノックバックの中心座標
     * @param {import("@minecraft/server").Entity} entity ノックバックさせたいエンティティ
     * @param {number} power  強さ（水平ノックバック量の目安）
     */
    static knockbackFromPoint(center, entity, power = 0.8, vertical = 0.5) {
        if (!entity.isValid) return;
        const pos = entity.location;
        const dx = pos.x - center.x;
        const dz = pos.z - center.z;

        const len = Math.hypot(dx, dz);

        // 中心と同じ位置にいるときはノックバック方向が出せないので何もしない
        if (len === 0) return;

        const dirX = dx / len;
        const dirZ = dz / len;

        // 垂直方向はおまけで少しだけ上げる（必要なら調整 or 固定値に）
        const verticalStrength = power * vertical;

        try {
            entity.applyKnockback({ x: dirX * power, z: dirZ * power }, verticalStrength);
        } catch (e) {
            console.warn(`knockbackFromPoint error: ${e}`);
        }
    }

    /**
     * 指定した座標を中心とした正方形（立方体）の範囲内にいるエンティティを取得する
     * @param {import("@minecraft/server").Dimension} dimension 
     * @param {import("@minecraft/server").Vector3} pos 中心座標
     * @param {number} range 中心からの距離（一辺の半分）
     */
    static getEntities(dimension, pos, range, posB = null) {
        const broad = dimension.getEntities({
            location: pos,
            maxDistance: range + 10
        });

        const centerA = posB ? {
            x: (pos.x + posB.x) / 2,
            y: (pos.y + posB.y) / 2,
            z: (pos.z + posB.z) / 2
        } : pos;

        const extentA = posB ? {
            x: Math.abs(pos.x - posB.x) / 2 + range,
            y: Math.abs(pos.y - posB.y) / 2 + range,
            z: Math.abs(pos.z - posB.z) / 2 + range
        } : { x: range, y: range, z: range };

        return broad.filter(entity => {
            if (!entity.isValid) return false;
            try {
                const { extent: extB, center: cb } = entity.getAABB();
                return Math.abs(centerA.x - cb.x) <= (extentA.x + extB.x) &&
                    Math.abs(centerA.y - cb.y) <= (extentA.y + extB.y) &&
                    Math.abs(centerA.z - cb.z) <= (extentA.z + extB.z);
            } catch {
                return false;
            }
        });
    }
    static score = {
        /**
         * エンティティのスコアに値を加算する
         * @param {import("@minecraft/server").Entity} entity 
         * @param {string} objectiveId 
         * @param {number} value 
         */
        add(entity, objectiveId, value) {
            const objective = world.scoreboard.getObjective(objectiveId);
            if (!objective) {
                world.scoreboard.addObjective(objectiveId);
            }
            const score = objective.getScore(entity) ?? 0;
            objective.setScore(entity, score + value);
        },
        /**
         * エンティティのスコアに値を設定する
         * @param {import("@minecraft/server").Entity} entity 
         * @param {string} objectiveId 
         * @param {number} value 
         */
        set(entity, objectiveId, value = undefined) {
            const objective = world.scoreboard.getObjective(objectiveId);
            if (!objective) {
                world.scoreboard.addObjective(objectiveId);
            }
            objective.setScore(entity, value);
        },
        /**
         * エンティティのスコアを取得する
         * @param {import("@minecraft/server").Entity} entity 
         * @param {string} objectiveId 
         * @returns {number}
         */
        get(entity, objectiveId) {
            const objective = world.scoreboard.getObjective(objectiveId);
            if (!objective) {
                return undefined;
            }
            return objective.getScore(entity);
        }
    };
}
