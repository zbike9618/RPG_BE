import * as server from "@minecraft/server";
import util from "../../util";
const { world, system } = server;
import weapondata from "../../weapon/weapondata";
import SkillSystem from "./skill/skillsystem";
import StatusModifier from "./status_percent";
import Buff from "./buff.js";

let count = 0;
const status = [
    "maxhp",
    "maxmp",
    "hpregen",
    "mpregen",
    "str",
    "def",
    "int",
    "agi",
    "luk",
    "kb",
    "crt",
    "res",
]
system.runInterval(() => {
    // プレイヤーとモブを対象にする
    const entities = [
        ...world.getAllPlayers(),
        ...world.getDimension("overworld").getEntities({ families: ["mob"], tags: ["rpg.is_spawned"] }), // タグ付きのみ（初期化済み）
        ...world.getDimension("nether").getEntities({ families: ["mob"], tags: ["rpg.is_spawned"] }),
        ...world.getDimension("the_end").getEntities({ families: ["mob"], tags: ["rpg.is_spawned"] })
    ];
    if (entities.length === 0) return;

    const index = count % entities.length;
    const entity = entities[index];
    count++;

    if (!entity || !entity.isValid) return;
    setStatus(entity);
})

export function setStatus(entity) {
    const scutil = util.score;
    const isPlayer = entity.typeId === "minecraft:player";

    // プレイヤーのみ：パッシブスキルのパーセント補正を更新
    if (isPlayer) {
        SkillSystem.refreshPassivePercent(entity);
    }

    for (const s of status) {
        const savescorename = `rpg.${s}_save`;
        const doscorename = `rpg.${s}_do`;
        let result = scutil.get(entity, savescorename) || 0;

        // 1. スキル補正 (プレイヤーのみ)
        if (isPlayer) {
            result += SkillSystem.calcPassiveBonus(entity, s);
        }

        // 2. 装備補正 (プレイヤーのみ)
        if (isPlayer) {
            const container = entity.getComponent("minecraft:inventory")?.container;
            const heldItem = container?.getItem(entity.selectedSlotIndex);
            if (heldItem && weapondata[heldItem.typeId]) {
                result += weapondata[heldItem.typeId].st[s] || 0;
            }
        }

        // 3. バフ/デバフ補正 (共通)
        const buffBonus = Buff.getBonus(entity, s);
        result += buffBonus.value;

        // 4. パーセント補正 (StatusModifier + BuffPercent)
        let totalPercent = StatusModifier.getBonusPercent(entity, s); // 既存のModifier(パッシブ等)
        totalPercent += buffBonus.percent; // バフ由来

        // 最終計算: (基礎値 + 加算) * (1 + 割合/100)
        result = Math.floor(result * (1 + totalPercent / 100));

        //-----------------------------------------------------
        scutil.set(entity, doscorename, result);
    }

    if (isPlayer) {
        SkillSystem.trigger(entity, "status");
    }
}