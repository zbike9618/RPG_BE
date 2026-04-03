import { DyPro } from "../../../dypro";

export default class {
    /**
     * 内部用：プレイヤーの所持スキル一覧(配列)を取得
     * @private 
     */
    static _getAll(player) {
        const dp = new DyPro("rpg", player);
        const skills = dp.get("skills");
        return Array.isArray(skills) ? skills : [];
    }

    /**
     * スキルを追加（習得）する。すでに持っている場合は何もしない。
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     */
    static add(player, skillId) {
        const skills = this._getAll(player);
        if (!skills.includes(skillId)) {
            skills.push(skillId);
            const dp = new DyPro("rpg", player);
            dp.set("skills", skills);
        }
    }

    /**
     * スキルを配列から削除（忘れる）する。
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     */
    static remove(player, skillId) {
        let skills = this._getAll(player);
        if (skills.includes(skillId)) {
            skills = skills.filter(s => s !== skillId);
            const dp = new DyPro("rpg", player);
            dp.set("skills", skills);
        }
    }

    /**
     * 全スキル一覧(配列)を取得する、もしくは特定のスキルIDを返す。
     * @param {import("@minecraft/server").Player} player 
     * @param {string} [skillId] 
     */
    static get(player, skillId) {
        const skills = this._getAll(player);
        if (skillId === undefined) {
            return skills;
        }
        return skills.includes(skillId) ? skillId : undefined;
    }

    /**
     * 特定のスキルを持っている（習得している）かを判定する。
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     * @returns {boolean}
     */
    static have(player, skillId) {
        return this._getAll(player).includes(skillId);
    }

    // ==========================================
    // ここから「セット(装備)しているスキル」の管理
    // ==========================================

    /**
     * 内部用：プレイヤーがセットしているスキル一覧(配列)を取得
     * @private 
     */
    static _getSetAll(player) {
        const dp = new DyPro("rpg", player);
        const setSkills = dp.get("set_skills");
        return Array.isArray(setSkills) ? setSkills : [];
    }

    /**
     * スキルをセットする（習得している場合のみセット可能）
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     */
    static setSkill(player, skillId) {
        if (!this.have(player, skillId)) return; // 習得していないスキルはセットできない

        const setSkills = this._getSetAll(player);
        if (!setSkills.includes(skillId)) {
            setSkills.push(skillId);
            const dp = new DyPro("rpg", player);
            dp.set("set_skills", setSkills);
        }
    }

    /**
     * セットしているスキルを外す
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     */
    static unsetSkill(player, skillId) {
        let setSkills = this._getSetAll(player);
        if (setSkills.includes(skillId)) {
            setSkills = setSkills.filter(s => s !== skillId);
            const dp = new DyPro("rpg", player);
            dp.set("set_skills", setSkills);
        }
    }

    /**
     * 現在セットしている全スキルの一覧(配列)を取得する
     * @param {import("@minecraft/server").Player} player 
     */
    static getSetSkills(player) {
        return this._getSetAll(player);
    }

    /**
     * 特定のスキルを現在セットしているかを判定する
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     * @returns {boolean}
     */
    static isSet(player, skillId) {
        return this._getSetAll(player).includes(skillId);
    }
}