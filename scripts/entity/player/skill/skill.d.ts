import { Player } from "@minecraft/server";

export interface StatusEffectValues {
    hp?: number | string;
    mp?: number | string;
    str?: number | string;
    def?: number | string;
    vit?: number | string;
    int?: number | string;
    luk?: number | string;
    agi?: number | string;
    hpregen?: number | string;
    mpregen?: number | string;
    [key: string]: number | string | undefined;
}

export interface StatusEffects {
    add?: StatusEffectValues;
    set?: StatusEffectValues;
    percent?: StatusEffectValues;
}

export interface PotionAction {
    id: string;
    duration?: number | string;
    amplifier?: number | string;
    showParticles?: boolean;
}

export interface MessageAction {
    chat?: string;
    actionbar?: string;
    title?: string;
    subtitle?: string;
}

export interface SkillConditionObject {
    type?: string;
    operation?: "==" | "!=" | ">=" | "<=" | ">" | "<";
    value?: string | number;
    value2?: string | number;
    [key: string]: any;
}

export type SkillCondition = string | SkillConditionObject;

export interface SkillScriptContext {
    conditions?: SkillCondition | SkillCondition[];
    getconditions?: SkillCondition | SkillCondition[];
    tickInterval?: number;
    cooldown?: number;
    effects?: StatusEffects;
    commands?: string | string[];
    potion?: PotionAction | PotionAction[];
    message?: MessageAction;
    script?: string;
}

export interface SkillLevelDefinition {
    name: string;
    variable?: Record<string, any>;
    evoconditions?: SkillCondition | SkillCondition[];
}

export interface PassiveSkillDefinition {
    id: string;
    name: string;
    description: string;
    getdescription?: string;
    type?: number;
    variable?: Record<string, any>;
    level?: SkillLevelDefinition[];
    sc: SkillScriptContext;
    weaponTags?: string[];

    // Callbacks
    death?(player: Player, context: Record<string, any>, skillVar: Record<string, any>): void;
    attack?(player: Player, context: Record<string, any>, skillVar: Record<string, any>): void;
    kill?(player: Player, context: Record<string, any>, skillVar: Record<string, any>): void;
    status?(player: Player, context: Record<string, any>, skillVar: Record<string, any>): void;
}

export interface ActiveSkillExecuteContext {
    needMp: (player: Player, amount: number) => boolean;
    needCool: (tick: number) => boolean;
}

export interface ActiveSkillDefinition {
    id: string;
    name: string;
    description: string;
    getdescription?: string;
    type?: number;
    element?: "無" | "炎" | "水" | "土" | "雷" | "悪" | "光" | "風";
    variable?: Record<string, any>;
    level?: SkillLevelDefinition[];
    sc: SkillScriptContext;
    weaponTags?: string[];
    execute(
        player: Player,
        skillVar: Record<string, any>,
        context: ActiveSkillExecuteContext
    ): void;
}
