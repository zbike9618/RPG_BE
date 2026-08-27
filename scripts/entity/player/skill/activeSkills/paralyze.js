
import util from "../../../../util.js"

import Buff from "../../buff.js"

export default {
    id: "paralyze",
    name: "パラライズ",
    description: "周りの敵を麻痴させる",
    getdescription: "AGIを50以上にする",
    sc: {
        getconditions: [
            {
                type: "status",
                operation: ">=",
                value: "#status.agi",
                value2: 50
            }
        ]
    },
    execute(player, skillVar, { needMp, needCool }) {
        if (!needMp(player, 15)) return;
        const entities = player.dimension.getEntities({
            location: player.location,
            maxDistance: 10,
            excludeIds: [player.id]
        });
        entities.forEach(entity => {
            Buff.add(entity, "paralyze", "agi", -99, "percent", 10);
            util.expandParticle(entity.dimension, entity.location, 5, 1, "rpg:lightning");
        });
    }
}
