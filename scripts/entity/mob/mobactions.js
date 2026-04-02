import * as server from "@minecraft/server";
const { world, system } = server;
import Patch from "../entityPatch";
world.beforeEvents.entityHurt.subscribe((ev) => {
    const entity = ev.hurtEntity;
    const ds = ev.damageSource;
    const damager = ds.damagingEntity;
    if (!damager) return;
    const family = damager.getComponent("minecraft:type_family");
    if (!family) return;
    if (!family.hasTypeFamily("mob") || family.hasTypeFamily("player")) return;
    ev.cancel = true;
    system.run(() => {
        Patch.damage(entity, 0, { reference: "rpg.str_do", damagerId: damager.id });
    });

});