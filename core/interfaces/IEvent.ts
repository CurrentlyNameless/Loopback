import { Events } from "discord.js";

export interface IEvent {
    name: keyof typeof Events | string;
    once?: boolean;
    execute(...args: any[]): Promise<void> | void;
}
