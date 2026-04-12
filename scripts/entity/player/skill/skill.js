import { DyPro } from "../../../dypro";
import skillData from "./skillData";
import config from "../../../config";

export default class {
    /**
     * 内部用：プレイヤーの所持スキル一覧(オブジェクト)を取得
     * @private 
     */
    static _getAll(player) {
        const dp = new DyPro("rpg", player);
        const data = dp.get("skills");
        return (typeof data === "object" && !Array.isArray(data) && data !== null) ? data : {};
    }

    /**
     * スキルを追加（習得）する。すでに持っている場合は上書き。
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     * @param {any} [data={}] 変数などのデータ
     */
    static add(player, skillId, data = {}) {
        const skills = this._getAll(player);
        skills[skillId] = data;
        const dp = new DyPro("rpg", player);
        dp.set("skills", skills);
    }

    /**
     * スキルを配列から削除（忘れる）する。
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     */
    static remove(player, skillId) {
        let skills = this._getAll(player);
        if (skills[skillId] !== undefined) {
            delete skills[skillId];
            const dp = new DyPro("rpg", player);
            dp.set("skills", skills);
            // セット内容からも削除
            this.unsetSkill(player, skillId);
        }
    }

    /**
     * 全スキル一覧を取得する、もしくは特定のスキルIDのデータを返す。
     * @param {import("@minecraft/server").Player} player 
     * @param {string} [skillId] 
     */
    static get(player, skillId) {
        const skills = this._getAll(player);
        if (skillId === undefined) {
            return skills;
        }
        return skills[skillId];
    }

    /**
     * 特定のスキルを持っている（習得している）かを判定する。
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     * @returns {boolean}
     */
    static have(player, skillId) {
        const skills = this._getAll(player);
        return skills[skillId] !== undefined;
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
     * スキルをセットする（習得している場合のみセット可能。設定の上限数を守る）
     * @param {import("@minecraft/server").Player} player 
     * @param {string} skillId 
     */
    static setSkill(player, skillId) {
        if (!this.have(player, skillId)) return "§c[Skill] そのスキルを習得していません。";

        const setSkills = this._getSetAll(player);
        if (setSkills.includes(skillId)) return "§c[Skill] 既にセットされています。";

        const sData = skillData[skillId];
        if (!sData) return "§c[Skill] スキルデータが見つかりません。";

        // 上限チェック
        const currentCount = setSkills.filter(id => skillData[id]?.type === sData.type).length;
        const max = sData.type === 1 ? config.maxActiveSkills : config.maxPassiveSkills;
        const typeName = sData.type === 1 ? "アクティブ" : "パッシブ";

        if (currentCount >= max) {
            return `§c[Skill] ${typeName}スキルの装備上限（${max}個）に達しています。`;
        }

        setSkills.push(skillId);
        const dp = new DyPro("rpg", player);
        dp.set("set_skills", setSkills);
        return true;
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

            // 選択中のスキルが外された場合の処理
            if (this.getSelectedSkill(player) === skillId) {
                this.setSelectedSkill(player, "");
            }
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

    // ==========================================
    // ここから「現在選択されているアクティブスキル」の管理
    // ==========================================

    /**
     * 現在選択中のアクティブスキルIDを取得
     */
    static getSelectedSkill(player) {
        const dp = new DyPro("rpg", player);
        return dp.get("selected_active_skill") || "";
    }

    /**
     * アクティブスキルを選択状態にする
     */
    static setSelectedSkill(player, skillId) {
        const dp = new DyPro("rpg", player);
        dp.set("selected_active_skill", skillId);
    }

    /**
     * セットされているアクティブスキルを1つずつ順に切り替える（サイクル）
     */
    static cycleSelectedSkill(player) {
        const setSkills = this.getSetSkills(player);
        const activeSet = setSkills.filter(id => skillData[id]?.type === 1);

        if (activeSet.length === 0) {
            this.setSelectedSkill(player, "");
            return null;
        }

        const current = this.getSelectedSkill(player);
        let currentIndex = activeSet.indexOf(current);

        // 次のスキルを選択（見つからない場合は最初）
        const nextIndex = (currentIndex + 1) % activeSet.length;
        const nextSkill = activeSet[nextIndex];

        this.setSelectedSkill(player, nextSkill);
        player.sendMessage(`§e${skillData[nextSkill]?.name || nextSkill} §rをセットしました`);
        return nextSkill;
    }
}