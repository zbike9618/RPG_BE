import * as server from "@minecraft/server";
const { world } = server;
export class DyPro {
    constructor(dypro, target) {
        this.dypro = dypro;
        this.target = target;
    }

    /** @private */
    #getFullKey(key) {
        return this.dypro ? `${this.dypro}:${key}` : key;
    }

    set(key, value) {
        const fullKey = this.#getFullKey(key);
        if (this.target) {
            this.target.setDynamicProperty(fullKey, JSON.stringify(value));
        } else {
            world.setDynamicProperty(fullKey, JSON.stringify(value));
        }
    }
    get(key) {
        const fullKey = this.#getFullKey(key);
        let val = this.target ? this.target.getDynamicProperty(fullKey) : world.getDynamicProperty(fullKey);
        try {
            return JSON.parse(val);
        } catch (e) {
            return undefined;
        }
    }
    has(key) {
        const fullKey = this.#getFullKey(key);
        if (this.target) {
            return this.target.getDynamicProperty(fullKey) !== undefined;
        } else {
            return world.getDynamicProperty(fullKey) !== undefined;
        }
    }
    delete(key) {
        const fullKey = this.#getFullKey(key);
        if (this.target) {
            this.target.setDynamicProperty(fullKey, undefined);
        } else {
            world.setDynamicProperty(fullKey, undefined);
        }
    }
}