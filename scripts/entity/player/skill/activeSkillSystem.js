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
                checkCost: (mp, cool) => checkCost(player, skillId, mp, cool)
            });
        } else {
            console.warn(`Skill ${skillId} not found in activeSkills`);
        }
    }
}

/**
 * MPとクールタイムのチェックおよび消費を一度に行う
 * @param {import("@minecraft/server").Player} player 
 * @param {string} skillId 
 * @param {number} mpAmount 
 * @param {number} cooldownTicks 
 * @returns {boolean} 両方満たしていれば消費してtrue、そうでなければfalse
 */
function checkCost(player, skillId, mpAmount, cooldownTicks) {
    // 1. MPチェック
    const currentMp = scutil.get(player, "rpg.mp") ?? 0;
    if (currentMp < mpAmount) {
        player.sendMessage("§cMPが足りません");
        return false;
    }

    // 2. クールタイムチェック
    const memoryId = `cool_${skillId}`;
    const currentTime = system.currentTick;
    const endTime = Memory.get(player, memoryId) || 0;
    if (endTime > currentTime) {
        return false;
    }

    // 消費とクールタイム設定の実行
    if (mpAmount > 0) {
        scutil.set(player, "rpg.mp", Math.max(0, currentMp - mpAmount));
    }

    if (cooldownTicks > 0) {
        if (!Memory.has(player, memoryId)) {
            Memory.use(player, memoryId);
        }
        Memory.set(player, memoryId, currentTime + cooldownTicks);
    }

    return true;
}