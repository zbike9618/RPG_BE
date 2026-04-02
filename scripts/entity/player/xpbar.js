import { world, system } from "@minecraft/server";
const targets = new Map();

/**
 * 内部用：現在のゲージ位置から目標位置へ「差分」だけを与えて滑らかに動かす
 */
function applyXPPercent(player, percent) {
    if (!player.isValid) return;

    // 現在このレベルで溜まっているXP
    const currentXp = player.xpEarnedAtCurrentLevel;
    // 次のレベルまでに必要な総XP
    const nextLevelNeededXp = player.totalXpNeededForNextLevel;
    
    // 指定された割合(0〜100%)をXP量に換算した「目標値」
    const progress = Math.max(0, Math.min(100, percent)) / 100;
    const targetXp = Math.floor(nextLevelNeededXp * progress);

    // 【重要】現在値との「差分」だけを足し引きすることで、ゲージを途切れさせずに動かす
    const diff = targetXp - currentXp;
    if (diff !== 0) {
        player.addExperience(diff);
    }
}

// 毎チック実行されるアニメーションループ
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) continue;

        const target = targets.get(player.id);
        if (target === undefined) continue;

        const currentXP = player.xpEarnedAtCurrentLevel;
        const neededXP = player.totalXpNeededForNextLevel;
        // 現在のバーの「見た目上の割合(%)」を逆算
        const currentPercent = (currentXP / Math.max(1, neededXP)) * 100;

        const diffPercent = target - currentPercent;

        // 目標値に十分近ければ直接セットして完了
        if (Math.abs(diffPercent) < 0.2) {
            applyXPPercent(player, target);
            targets.delete(player.id);
            continue;
        }

        // 滑らかに移動するための計算
        const nextPercent = currentPercent + diffPercent * 0.15;
        applyXPPercent(player, nextPercent);
    }
});




export default class Inside {
    /**
     * Minecraftの経験値レベルを設定する (差分適用方式でリセットを防ぐ)
     * @param {import("@minecraft/server").Player} player 
     * @param {number} level セットするレベル数値
     */
    static setLevel(player, level) {
        if (!player || !player.isValid) return;
        
        const currentLevel = player.level;
        const diff = level - currentLevel;
        
        // レベルが変わる場合のみ、差分だけを加算/減算する
        if (diff !== 0) {
            player.addLevels(diff);
        }
    }

    /**
     * Minecraftの経験値バーの割合(0-100)を滑らかに設定する
     * @param {import("@minecraft/server").Player} player 
     * @param {number} percent 0から100の数値(次のレベルまでの進捗)
     */
    static setXPPercent(player, percent) {
        if (!player || !player.isValid) return;
        targets.set(player.id, percent);
    }
}
