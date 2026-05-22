import { world, system } from "@minecraft/server";
import skillData from "./skillData";
import util from "../../../util";
import activeSkills from "./activeSkills/index.js";
import Memory from "../../memory";

const scutil = util.score

/**
 * アクティブスキルの実行を管理するシステム
 */
export default class ActiveSkillSystem {
    /**
     * 指定したアクティブスキルを実行する外部呼び出し用メソッド
     * @param {import("@minecraft/server").Player} player 実行者
     * @param {string} skillId 実行するスキルID
     * @param {Record<string, any>} skillVar スキルの保有変数（レベル、威力等）
     */
    static execute(player, skillId, skillVar) {
        const sData = skillData[skillId];
        if (!sData || sData.type !== 1) return;

        const skill = activeSkills[skillId];
        if (skill) {
            skill.execute(player, skillVar, { 
                needMp, 
                needCool: (tick) => needCool(player, skillId, tick) 
            });
        } else {
            console.warn(`Skill ${skillId} not found in activeSkills`);
        }
    }
}

function needMp(player, amount) {
    const currentMp = scutil.get(player, "rpg.mp");
    if (currentMp < amount) {
        player.sendMessage("§cMPが足りません");
        return false;
    }
    const nextMp = Math.max(0, currentMp - amount);
    scutil.set(player, "rpg.mp", nextMp);
    return true;
}

/**
 * クールタイムを確認・設定する
 * @param {import("@minecraft/server").Player} player 
 * @param {string} skillId 
 * @param {number} tick 
 * @returns {boolean} 実行可能ならtrue
 */
function needCool(player, skillId, tick) {
    const memoryId = `cool_${skillId}`;
    const currentTime = system.currentTick;
    const endTime = Memory.get(player, memoryId);

    if (endTime > currentTime) {
        const remaining = Math.ceil((endTime - currentTime) / 20);
        player.onScreenDisplay.setActionBar(`§cクールタイム中 (${remaining}s)`);
        return false;
    }

    if (!Memory.has(player, memoryId)) {
        if (!Memory.use(player, memoryId)) {
            return true; // メモリ不足時はクールタイムなしで実行許可
        }
    }
    Memory.set(player, memoryId, currentTime + tick);
    return true;
}