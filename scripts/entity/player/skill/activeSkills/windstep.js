import Buff from "../../buff.js";
import Interval from "../../../interval.js"

/** @type {import("../skill").ActiveSkillDefinition} */
export default {
    id: "windstep",
    name: "ウィンドステップ",
    description: "スピードを一定秒間上昇させる",
    getdescription: "AGIを50以上にする",
    element: "風",
    sc: {
        getconditions: "#status.agi >= 50"
    },
    execute(player, skillVar, { checkCost }) {
        if (Buff.getList(player).some(b => b.id === "windstep")) return;
        if (!checkCost(15, 0)) return;
        Buff.add(player, "windstep", "agi", 50, "percent", 10);
        Interval.add(player, (entity) => {
            entity.dimension.spawnParticle("rpg:sweep", entity.location);
        }, 2, 200);
    }
}
