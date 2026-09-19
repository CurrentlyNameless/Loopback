import { Client } from "discord.js";
import { ICommand } from "./ICommand.ts";
import { IEvent } from "./IEvent.ts";
import { IInteraction } from "./IInteraction.ts";
import { AccessLevel } from "./AccessLevel.ts";

export interface IModule {
    name: string;
    version: string;
    description: string;
    author?: string;
    enabled?: boolean;
    minAccessLevel?: AccessLevel;
    
    commands?: ICommand[];
    interactions?: IInteraction[];
    events?: IEvent[];
    config?: any;
    
    /**
     * Called when the module is initially loaded into memory.
     * Perfect for setting up database schemas, checking config, or registering Slash Commands.
     */
    onLoad?(): Promise<void> | void;
    
    /**
     * Called right after the Discord client connects and logs in.
     * Pass the client so the module can register Discord events or interact with guilds.
     */
    onReady?(client: Client): Promise<void> | void;
    
    /**
     * Called when the module is being hot-unloaded or the bot shuts down.
     */
    onUnload?(): Promise<void> | void;
}
