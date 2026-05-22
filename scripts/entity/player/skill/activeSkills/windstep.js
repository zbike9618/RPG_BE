import Buff from "../../buff.js";
import Interval from "../../../interval.js"

export default {
    id: "windstep",
    execute(player, skillVar, { needMp, needCool }) {
        if (Buff.getList(player).some(b => b.id === "windstep")) return;
        if (!needMp(player, 15)) return;
        Buff.add(player, "windstep", "agi", 50, "percent", 10);
        Interval.add(player, (entity) => {
            entity.dimension.spawnParticle("rpg:sweep", entity.location);
        }, 2, 200);
    }
}
