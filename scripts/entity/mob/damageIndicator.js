import * as server from "@minecraft/server";
const world = server.world;
export function damageIndicator(entity, damage, color = "") {
    if (entity.typeId == "minecraft:player" || damage === 0) return;
    damage += ".0"
    const location = entity.location;
    location.y += 1;
    const d = entity.dimension.spawnEntity("rpg:damage_indicator", location);
    d.nameTag = `${color}${damage}`
    d.applyImpulse({ x: (Math.random() * 1) - 0.5, y: 0.35, z: (Math.random() * 1) - 0.5 });
};