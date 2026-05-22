import * as server from "@minecraft/server";
const { world, system } = server;

export default class Interval {
    /**
     * 指定したエンティティに対し、特定の間隔でコードを実行する
     * @param {import("@minecraft/server").Entity} entity 対象
     * @param {function(import("@minecraft/server").Entity):void} code 実行する関数
     * @param {number} intervalTicks 実行間隔（ティック。20ティック=1秒）
     * @param {number} [totalTicks] 継続合計時間（ティック）。省略時は無限。
     */
    static add(entity, code, intervalTicks, totalTicks = -1) {
        let elapsed = 0;

        const runId = system.runInterval(() => {
            // エンティティが消滅している、または合計時間を超えたら停止
            if (!entity || !entity.isValid || (totalTicks !== -1 && elapsed >= totalTicks)) {
                system.clearRun(runId);
                return;
            }

            try {
                code(entity);
            } catch (e) {
                console.warn(`[Interval Error] ${e}`);
                system.clearRun(runId);
            }

            elapsed += intervalTicks;
        }, intervalTicks);

        return runId; // 途中で手動停止したい場合のためにIDを返す
    }
}