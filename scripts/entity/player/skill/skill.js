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
     * スキルを追加（習得）する
     */
    static add(player, skillId, data = {}) {
        const skills = this._getAll(player);
        skills[skillId] = data;
        const dp = new DyPro("rpg", player);
        dp.set("skills", skills);
    }

    /**
     * スキルを削除する
     */
    static remove(player, skillId) {
        let skills = this._getAll(player);
        if (skills[skillId] !== undefined) {
            delete skills[skillId];
            const dp = new DyPro("rpg", player);
            dp.set("skills", skills);
            this.unsetSkill(player, skillId);
        }
    }

    /**
     * 特定のスキルデータを取得
     */
    static get(player, skillId) {
        const skills = this._getAll(player);
        if (skillId === undefined) return skills;
        return skills[skillId];
    }

    /**
     * スキル習得済みか判定
     */
    static have(player, skillId) {
        const skills = this._getAll(player);
        return skills[skillId] !== undefined;
    }

    // ==========================================
    // セット管理 (Active = Item Slot / Passive = Player List)
    // ==========================================

    /**
     * 内部用：セットされている全スキルを取得
     * @private 
     */
    static _getSetAll(player) {
        const dp = new DyPro("rpg", player);
        const playerSet = dp.get("set_skills") || [];

        const item = player.getComponent("minecraft:inventory")?.container.getItem(player.selectedSlotIndex);
        let itemSet = [];
        if (item) {
            const data = item.getDynamicProperty("rpg:skills");
            try {
                // 固定長 [slot0, slot1] で取得。null の場合は未セット
                itemSet = data ? JSON.parse(data) : [null, null];
            } catch { itemSet = [null, null]; }
        }

        const filteredItemSet = itemSet.filter(s => s !== null);
        return [...new Set([...playerSet, ...filteredItemSet])];
    }

    /**
     * スキルをセットする
     * @param {number} [slotIndex] アクティブスキルの場合のスロット番号 (0 or 1)
     */
    static setSkill(player, skillId, slotIndex = null) {
        if (!this.have(player, skillId)) return "§c[Skill] そのスキルを習得していません。";

        const sData = skillData[skillId];
        if (!sData) return "§c[Skill] スキルデータが見つかりません。";

        if (sData.type === 0) {
            // パッシブ：従来通り
            const dp = new DyPro("rpg", player);
            const setSkills = dp.get("set_skills") || [];
            if (setSkills.includes(skillId)) return "§c[Skill] 既にセットされています。";
            if (setSkills.length >= config.maxPassiveSkills) return "§c[Skill] 装備枠がいっぱいです。";
            setSkills.push(skillId);
            dp.set("set_skills", setSkills);
        } else {
            // アクティブ：アイテムスロット
            const container = player.getComponent("minecraft:inventory")?.container;
            const item = container?.getItem(player.selectedSlotIndex);
            if (!item) return "§c[Skill] アイテムを持っていないとセットできません。";

            const data = item.getDynamicProperty("rpg:skills");
            let itemSet = [null, null];
            try {
                itemSet = data ? JSON.parse(data) : [null, null];
            } catch { itemSet = [null, null]; }

            // スロット指定がない場合は空きを埋める
            if (slotIndex === null) {
                if (itemSet[0] === null) slotIndex = 0;
                else if (itemSet[1] === null) slotIndex = 1;
                else return "§c[Skill] スロットがいっぱいです。上書きするにはスロットを選択してください。";
            }

            // 同一スキルの重複チェック (他方のスロットにある場合)
            if (itemSet.includes(skillId) && itemSet.indexOf(skillId) !== slotIndex) {
                return "§c[Skill] 既に別のスロットにセットされています。";
            }

            itemSet[slotIndex] = skillId;
            item.setDynamicProperty("rpg:skills", JSON.stringify(itemSet));
            container.setItem(player.selectedSlotIndex, item);
        }

        return true;
    }

    /**
     * スキルを外す
     */
    static unsetSkill(player, skillId) {
        const sData = skillData[skillId];
        if (!sData) return;

        if (sData.type === 0) {
            const dp = new DyPro("rpg", player);
            let setSkills = dp.get("set_skills") || [];
            setSkills = setSkills.filter(s => s !== skillId);
            dp.set("set_skills", setSkills);
        } else {
            const container = player.getComponent("minecraft:inventory")?.container;
            const item = container?.getItem(player.selectedSlotIndex);
            if (!item) return;

            let itemSet = [null, null];
            try {
                const data = item.getDynamicProperty("rpg:skills");
                itemSet = data ? JSON.parse(data) : [null, null];
            } catch { itemSet = [null, null]; }

            const newSet = itemSet.map(s => s === skillId ? null : s);
            item.setDynamicProperty("rpg:skills", JSON.stringify(newSet));
            container.setItem(player.selectedSlotIndex, item);

            if (this.getSelectedSkill(player) === skillId) {
                this.setSelectedSkill(player, "");
            }
        }
    }

    /**
     * 装備しているスキルリストを取得
     */
    static getSetSkills(player) {
        return this._getSetAll(player);
    }

    /**
     * アクティブスキルのスロット内容を直接取得
     */
    static getItemSlots(player) {
        const item = player.getComponent("minecraft:inventory")?.container.getItem(player.selectedSlotIndex);
        if (!item) return [null, null];
        try {
            const data = item.getDynamicProperty("rpg:skills");
            return data ? JSON.parse(data) : [null, null];
        } catch { return [null, null]; }
    }

    /**
     * 特定のスキルをセットしているか
     */
    static isSet(player, skillId) {
        return this._getSetAll(player).includes(skillId);
    }

    /**
     * 現在選択中のスキルIDを取得
     */
    static getSelectedSkill(player) {
        const dp = new DyPro("rpg", player);
        const selId = dp.get("selected_active_skill") || "";
        if (selId && !this.isSet(player, selId)) return "";
        return selId;
    }

    /**
     * スキルを選択状態にする
     */
    static setSelectedSkill(player, skillId) {
        const dp = new DyPro("rpg", player);
        dp.set("selected_active_skill", skillId);
    }

    /**
     * サイクル切り替え
     */
    static cycleSelectedSkill(player) {
        const activeSet = this.getItemSlots(player).filter(s => s !== null);

        if (activeSet.length === 0) {
            this.setSelectedSkill(player, "");
            return null;
        }

        const current = this.getSelectedSkill(player);
        let currentIndex = activeSet.indexOf(current);
        const nextIndex = (currentIndex + 1) % activeSet.length;
        const nextSkill = activeSet[nextIndex];

        this.setSelectedSkill(player, nextSkill);
        player.sendMessage(`§e${skillData[nextSkill]?.name || nextSkill} §rに切り替え`);
        return nextSkill;
    }
}