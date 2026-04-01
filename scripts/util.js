export default class {
    static getForwardPosition(player, x = 0, y = 0, z = 0) {
        const base = player.location;
        const viewDir = player.getViewDirection();
        const horizontalMag = Math.sqrt(viewDir.x ** 2 + viewDir.z ** 2);

        let right = { x: 0, z: 0 };
        if (horizontalMag > 0.0001) {
            right.x = -viewDir.z / horizontalMag;
            right.z = viewDir.x / horizontalMag;
        } else {
            const rot = player.getRotation();
            const rad = (rot.y * Math.PI) / 180;
            const fH = { x: -Math.sin(rad), z: Math.cos(rad) };
            right.x = -fH.z;
            right.z = fH.x;
        }

        return {
            x: base.x + (viewDir.x * z) + (right.x * x),
            y: base.y + (viewDir.y * z) + y,
            z: base.z + (viewDir.z * z) + (right.z * x),
        };
    }
    static expandParticle(dim, center, count, range, par) {

        for (let i = 0; i < count; i++) {
            const offsetX = (Math.random() * 2 - 1) * range;
            const offsetY = (Math.random() * 2 - 1) * range;
            const offsetZ = (Math.random() * 2 - 1) * range;

            const pos = {
                x: center.x + offsetX,
                y: center.y + offsetY,
                z: center.z + offsetZ,
            };

            dim.spawnParticle(par, pos);
        }
    }

}
