import util from "../../../../util.js"
import entityPatch from "../../../entityPatch.js";
import Buff from "../../buff.js"

/** @type {import("../skill").ActiveSkillDefinition} */
export default {
    id: "paralyze",
    name: "パラライズ",
    description: "周りの敵を麻痴させる",
    getdescription: "AGIを50以上にする",
    element: "雷",
    sc: {
        getconditions: "#status.agi >= 50"
    },
    execute(player, skillVar, { checkCost }) {
        if (!checkCost(15, 0)) return;
        const entities = player.dimension.getEntities({
            location: player.location,
            maxDistance: 10,
            excludeIds: [player.id]
        });
        entities.forEach(entity => {
            entityPatch.paralyze(entity, 10, 99);
        });
    }
}
