import { Client, Events, Interaction, REST, Routes, MessageFlags, ButtonInteraction, ModalSubmitInteraction, AnySelectMenuInteraction, EmbedBuilder } from "discord.js";
import { Logger } from "../utils/logger.ts";
import { ICommand } from "../interfaces/ICommand.ts";
import { IInteraction } from "../interfaces/IInteraction.ts";
import { ConfigManager } from "./ConfigManager.ts";
import { PermissionManager } from "./PermissionManager.ts";
import { ModuleManager } from "./ModuleManager.ts";
import { CommandHistoryModel } from "./CommandHistoryModel.ts";
import { FloofcoreError, ErrorCode } from "../errors/FloofcoreError.ts";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

export class InteractionManager {
    public static licenseManager: any = null;
    private static commands = new Map<string, ICommand>();
    private static buttons = new Map<string, IInteraction<ButtonInteraction>>();
    private static modals = new Map<string, IInteraction<ModalSubmitInteraction>>();
    private static selects = new Map<string, IInteraction<AnySelectMenuInteraction>>();
    private static disabledCommands = new Set<string>();
    private static _warmupUntil = 0;
    private static _warmupTimer: ReturnType<typeof setTimeout> | null = null;
    private static _onWarmupEnd: (() => void) | null = null;
    private static _isListening = false;

    static registerCommand(command: ICommand) {
        this.commands.set(command.data.name, command);
    }

    static unregisterCommandsForModule(moduleName: string) {
        if (!moduleName) return;
        const norm = moduleName.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [name, cmd] of this.commands.entries()) {
            const cmdMod = cmd.moduleName || '';
            const cmdModNorm = cmdMod.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cmdMod === moduleName || cmdModNorm === norm) {
                this.commands.delete(name);
            }
        }
    }

    static getAllCommands(): ICommand[] {
        return Array.from(this.commands.values());
    }

    static get allCommands(): Map<string, ICommand> {
        return this.commands;
    }

    static getDisabledCommands(): Set<string> {
        return this.disabledCommands;
    }

    static isCommandEnabled(name: string): boolean {
        return !this.disabledCommands.has(name);
    }

    static toggleCommand(name: string): boolean {
        if (this.disabledCommands.has(name)) {
            this.disabledCommands.delete(name);
            this.persistDisabledState();
            return true;
        } else {
            this.disabledCommands.add(name);
            this.persistDisabledState();
            return false;
        }
    }

    private static STATE_FILE = resolve('./core/config/disabled-commands.json');

    private static loadDisabledState(): void {
        try {
            if (!existsSync(this.STATE_FILE)) return;
            const raw = readFileSync(this.STATE_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data.disabled)) {
                this.disabledCommands = new Set(data.disabled);
            }
        } catch {
            this.disabledCommands = new Set();
        }
    }

    private static persistDisabledState(): void {
        try {
            mkdirSync(resolve('./core/config'), { recursive: true });
            writeFileSync(this.STATE_FILE, JSON.stringify({ disabled: Array.from(this.disabledCommands) }, null, 2));
        } catch { /* non-fatal */ }
    }

    static registerInteraction(interaction: IInteraction<ButtonInteraction> | IInteraction<ModalSubmitInteraction> | IInteraction<AnySelectMenuInteraction>) {
        if (interaction.type === "button") this.buttons.set(interaction.customId, interaction);
        else if (interaction.type === "modal") this.modals.set(interaction.customId, interaction);
        else if (interaction.type === "select") this.selects.set(interaction.customId, interaction);
    }

    private static findInteraction<T extends ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction>(map: Map<string, IInteraction<T>>, customId: string): IInteraction<T> | undefined {
        if (map.has(customId)) return map.get(customId);
        
        const sortedKeys = Array.from(map.keys())
            .filter((k): k is string => k != null)
            .sort((a, b) => b.length - a.length);
        
        for (const key of sortedKeys) {
            if (customId.startsWith(key)) return map.get(key);
        }
        return undefined;
    }

    static async syncCommands(client: Client, targetGuildId?: string) {
        this.loadDisabledState();
        this.startWarmup(5);
        const config = ConfigManager.get();
        const clientId = client?.user?.id || config.discord?.clientId;
        if (!config.discord?.token || !clientId) return;

        const rest = new REST({ version: "10" }).setToken(config.discord.token);
        const commandData = Array.from(this.commands.entries())
            .filter(([name]) => !this.disabledCommands.has(name))
            .filter(([_, cmd]) => !cmd.moduleName || ModuleManager.isModuleEnabled(cmd.moduleName))
            .map(([_, cmd]) => cmd.data.toJSON());

        try {
            Logger.debug(`Syncing ${commandData.length} slash commands...`, "InteractionManager");

            const isGlobal = config.commands?.slash?.global ?? true;
            const primaryGuildId = targetGuildId || config.discord.guildId;
            
            if (isGlobal) {
                // Register globally (single canonical registration)
                await rest.put(Routes.applicationCommands(clientId), { body: commandData });
                
                // Explicitly PURGE guild-level commands so they NEVER duplicate on any server
                if (primaryGuildId) {
                    await rest.put(
                        Routes.applicationGuildCommands(clientId, primaryGuildId),
                        { body: [] },
                    ).catch(() => {});
                }
                if (client?.guilds?.cache) {
                    for (const guild of client.guilds.cache.values()) {
                        if (guild.id !== primaryGuildId) {
                            await rest.put(
                                Routes.applicationGuildCommands(clientId, guild.id),
                                { body: [] },
                            ).catch(() => {});
                        }
                    }
                }
                Logger.debug("Global slash commands synchronized (all duplicate guild commands purged).", "InteractionManager");
            } else {
                if (primaryGuildId) {
                    await rest.put(
                        Routes.applicationGuildCommands(clientId, primaryGuildId),
                        { body: commandData },
                    );
                    await rest.put(Routes.applicationCommands(clientId), { body: [] }).catch(() => {});
                    Logger.debug(`Guild commands synchronized to ${primaryGuildId} (global commands cleared).`, "InteractionManager");
                } else {
                    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
                    Logger.debug("Global commands synchronized (fallback - no guildId configured).", "InteractionManager");
                }
            }
        } catch (error) {
            Logger.error("Failed to sync slash commands.", "InteractionManager", error);
        }
    }

    private static async deleteCommandFromDiscord(
        rest: REST,
        clientId: string,
        name: string,
        scope: 'global' | 'guild',
        guildId?: string,
    ): Promise<void> {
        const cmds = scope === 'global'
            ? await rest.get(Routes.applicationCommands(clientId)) as any[]
            : await rest.get(Routes.applicationGuildCommands(clientId, guildId!)) as any[];
        const match = cmds.find((c: any) => c.name === name);
        if (!match) return;
        if (scope === 'global') {
            await rest.delete(Routes.applicationCommand(clientId, match.id));
        } else {
            await rest.delete(Routes.applicationGuildCommand(clientId, guildId!, match.id));
        }
    }

    static async toggleCommandAndSync(
        name: string,
        rest: REST,
        guildId?: string,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const cmd = this.commands.get(name);
            if (!cmd) return { success: false, error: `Command "${name}" not found in registry` };

            this.startWarmup(5);
            const wasEnabled = this.isCommandEnabled(name);
            this.toggleCommand(name);

            const clientId = ConfigManager.get().discord.clientId;
            const json = cmd.data.toJSON();
            const effectiveGuildId = (guildId && guildId !== 'default') ? guildId : ConfigManager.get().discord?.guildId;

            if (wasEnabled) {
                // DISABLE: delete from global and active guild
                await this.deleteCommandFromDiscord(rest, clientId, name, 'global').catch(() => {});
                if (effectiveGuildId) {
                    await this.deleteCommandFromDiscord(rest, clientId, name, 'guild', effectiveGuildId).catch(() => {});
                }
                Logger.info(`Disabled command "${name}" — deleted from Discord instantly.`, "InteractionManager");
            } else {
                // ENABLE: register according to configured scope only (prevents duplicates)
                const isGlobal = ConfigManager.get().commands?.slash?.global ?? true;
                if (isGlobal) {
                    await rest.post(Routes.applicationCommands(clientId), { body: json }).catch(() => {});
                    if (effectiveGuildId) {
                        await this.deleteCommandFromDiscord(rest, clientId, name, 'guild', effectiveGuildId).catch(() => {});
                    }
                } else if (effectiveGuildId) {
                    await rest.post(Routes.applicationGuildCommands(clientId, effectiveGuildId), { body: json }).catch(() => {});
                    await this.deleteCommandFromDiscord(rest, clientId, name, 'global').catch(() => {});
                }
                Logger.info(`Enabled command "${name}" — registered with Discord instantly.`, "InteractionManager");
            }

            return { success: true };
        } catch (error: any) {
            const msg = error?.message ?? String(error);
            Logger.error(`Failed to sync after toggling command "${name}": ${msg}`, "InteractionManager");
            return { success: false, error: msg };
        }
    }


    static isWarmingUp(): boolean {
        return Date.now() < this._warmupUntil;
    }

    static warmupRemainingMs(): number {
        return Math.max(0, this._warmupUntil - Date.now());
    }

    static startWarmup(seconds: number, onEnd?: () => void): void {
        const ms = Math.max(0, seconds) * 1000;
        this._warmupUntil = Date.now() + ms;
        this._onWarmupEnd = onEnd ?? null;
        if (this._warmupTimer) clearTimeout(this._warmupTimer);
        if (ms > 0) {
            this._warmupTimer = setTimeout(() => {
                this._warmupUntil = 0;
                this._warmupTimer = null;
                const cb = this._onWarmupEnd;
                this._onWarmupEnd = null;
                cb?.();
            }, ms);
        } else {
            this._warmupUntil = 0;
            this._warmupTimer = null;
            const cb = this._onWarmupEnd;
            this._onWarmupEnd = null;
            cb?.();
        }
    }

    static listen(client: Client) {
        if (this._isListening) return;
        this._isListening = true;
        Logger.success("Interaction router attached to Discord client.", "InteractionManager");
        client.on(Events.InteractionCreate, async (interaction: Interaction) => {
            try {
                // Ignore interactions from bots
                if (interaction.user.bot) return;

                // Check if guild is banned by FLM
                if (interaction.guildId) {
                    if (InteractionManager.licenseManager) {
                        const banCheck = InteractionManager.licenseManager.isGuildBanned(interaction.guildId);
                        if (banCheck.banned) {
                            if (interaction.isRepliable()) {
                                const banEmbed = new EmbedBuilder()
                                    .setTitle('❌ Server Banned')
                                    .setDescription('This server has been quarantined by the bot owner. Features and commands are temporarily disabled.')
                                    .addFields(
                                        { name: 'Banned By', value: banCheck.addedBy || 'Staff', inline: true },
                                        { name: 'Reason', value: banCheck.reason || 'No reason provided', inline: true }
                                    )
                                    .setColor(0xed4245)
                                    .setFooter({ text: 'Please reach out to the support server for more info.' });

                                await interaction.reply({ embeds: [banEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
                            }
                            return;
                        }
                    }
                }

                if (this.isWarmingUp() && interaction.isRepliable()) {
                    const secs = Math.max(1, Math.ceil(this.warmupRemainingMs() / 1000));
                    const warmupContent = `🔄 Commands are refreshing after a bot restart — try again in **${secs}s**.`;
                    if (interaction.deferred) {
                        await interaction.editReply({ content: warmupContent, flags: MessageFlags.Ephemeral }).catch(() => {});
                    } else if (interaction.replied) {
                        await interaction.followUp({ content: warmupContent, flags: MessageFlags.Ephemeral }).catch(() => {});
                    } else {
                        await interaction.reply({ content: warmupContent, flags: MessageFlags.Ephemeral }).catch(() => {});
                    }
                    return;
                }

                if (interaction.isAutocomplete()) {
                    const command = this.commands.get(interaction.commandName);
                    if (!command || !command.autocomplete) return;
                    if (this.disabledCommands.has(interaction.commandName)) return;
                    if (command.moduleName && !ModuleManager.isModuleEnabled(command.moduleName)) return;
                    await command.autocomplete(interaction).catch(() => {});
                    return;
                }

                if (interaction.isChatInputCommand()) {
                    const command = this.commands.get(interaction.commandName);
                    if (!command) return;

                    if (this.disabledCommands.has(interaction.commandName)) {
                        await interaction.reply({ content: "This command is currently disabled.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    // Module Disabled Check
                    if (command.moduleName && !ModuleManager.isModuleEnabled(command.moduleName)) {
                        await interaction.reply({ content: "This module is currently disabled.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    try {
                        await command.execute(interaction);
                    } catch (cmdErr) {
                        throw new FloofcoreError(`Error executing command /${interaction.commandName}: ${cmdErr instanceof Error ? cmdErr.message : String(cmdErr)}`, {
                            code: ErrorCode.COMMAND_EXECUTION_FAILED,
                            moduleName: command.moduleName || "Core",
                            originalError: cmdErr,
                            contextData: {
                                commandName: interaction.commandName,
                                guildId: interaction.guildId || undefined,
                                userId: interaction.user.id,
                                channelId: interaction.channelId
                            }
                        });
                    }

                    // Log command execution to history
                    CommandHistoryModel.create({
                        commandName: interaction.commandName,
                        type: "slash",
                        userId: interaction.user.id,
                        username: interaction.user.username,
                        avatar: interaction.user.avatar,
                        guildId: interaction.guildId,
                        channelId: interaction.channelId,
                    }).catch(() => {}); // fire-and-forget
                } 
                else if (interaction.isButton()) {
                    if (interaction.replied || interaction.deferred) return;

                    // Timed Channels Blocker: Block button interactions in closed channels/ticket panels
                    const timedChannelsMod = ModuleManager.getModule("timed-channels") as any;
                    if (timedChannelsMod?.checkButtonBlocked) {
                        const blocked = await timedChannelsMod.checkButtonBlocked(interaction).catch(() => false);
                        if (blocked) return;
                    }

                    const btn = this.findInteraction(this.buttons, interaction.customId);
                    if (!btn) {
                        Logger.warn(`Unhandled button interaction: '${interaction.customId}'`, 'InteractionManager');
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: "❌ This button interaction is not recognized or the module is reloading.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        }
                        return;
                    }

                    if (btn.moduleName && !ModuleManager.isModuleEnabled(btn.moduleName)) {
                        await interaction.reply({ content: "This module is currently disabled.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    try {
                        await btn.execute(interaction);
                    } catch (btnErr) {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: "❌ An error occurred while executing this button.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        }
                        throw new FloofcoreError(`Error executing button interaction '${interaction.customId}': ${btnErr instanceof Error ? btnErr.message : String(btnErr)}`, {
                            code: ErrorCode.INTERACTION_FAILED,
                            moduleName: btn.moduleName || "Core",
                            originalError: btnErr,
                            contextData: {
                                interactionCustomId: interaction.customId,
                                guildId: interaction.guildId || undefined,
                                userId: interaction.user.id,
                                channelId: interaction.channelId
                            }
                        });
                    }
                }
                else if (interaction.isAnySelectMenu()) {
                    if (interaction.replied || interaction.deferred) return;

                    // Timed Channels Blocker: Block select menus in closed channels
                    const timedChannelsMod = ModuleManager.getModule("timed-channels") as any;
                    if (timedChannelsMod?.checkButtonBlocked) {
                        const blocked = await timedChannelsMod.checkButtonBlocked(interaction).catch(() => false);
                        if (blocked) return;
                    }

                    const select = this.findInteraction(this.selects, interaction.customId);
                    if (!select) {
                        Logger.warn(`Unhandled select interaction: '${interaction.customId}'`, 'InteractionManager');
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: "❌ This selection menu is not recognized or the module is reloading.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        }
                        return;
                    }

                    if (select.moduleName && !ModuleManager.isModuleEnabled(select.moduleName)) {
                        await interaction.reply({ content: "This module is currently disabled.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    try {
                        await select.execute(interaction);
                    } catch (selectErr) {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: "❌ An error occurred while processing this selection.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        }
                        throw new FloofcoreError(`Error executing select interaction '${interaction.customId}': ${selectErr instanceof Error ? selectErr.message : String(selectErr)}`, {
                            code: ErrorCode.INTERACTION_FAILED,
                            moduleName: select.moduleName || "Core",
                            originalError: selectErr,
                            contextData: {
                                interactionCustomId: interaction.customId,
                                guildId: interaction.guildId || undefined,
                                userId: interaction.user.id,
                                channelId: interaction.channelId
                            }
                        });
                    }
                }
                else if (interaction.isModalSubmit()) {
                    const modal = this.findInteraction(this.modals, interaction.customId);
                    if (!modal) {
                        Logger.warn(`Unhandled modal submission: '${interaction.customId}'`, 'InteractionManager');
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: "❌ This modal is not recognized or the module is reloading.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        }
                        return;
                    }

                    if (modal.moduleName && !ModuleManager.isModuleEnabled(modal.moduleName)) {
                        await interaction.reply({ content: "This module is currently disabled.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    try {
                        await modal.execute(interaction);
                    } catch (modalErr) {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: "❌ An error occurred while processing this form.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        }
                        throw new FloofcoreError(`Error executing modal interaction '${interaction.customId}': ${modalErr instanceof Error ? modalErr.message : String(modalErr)}`, {
                            code: ErrorCode.INTERACTION_FAILED,
                            moduleName: modal.moduleName || "Core",
                            originalError: modalErr,
                            contextData: {
                                interactionCustomId: interaction.customId,
                                guildId: interaction.guildId || undefined,
                                userId: interaction.user.id,
                                channelId: interaction.channelId
                            }
                        });
                    }
                }
            } catch (error) {
                const moduleCtx = (error instanceof FloofcoreError && error.moduleName) ? error.moduleName : "InteractionManager";
                Logger.error(`Error handling interaction ${interaction.id}`, moduleCtx, error);
                require("fs").appendFileSync("crash.log", `\n[${new Date().toISOString()}] Interaction Error: ${error.stack || error.message}\n`);
                if (interaction.isRepliable()) {
                    if (interaction.deferred) {
                        await interaction.editReply({ content: "An error occurred while executing this component.", flags: MessageFlags.Ephemeral }).catch(() => {});
                    } else if (interaction.replied) {
                        await interaction.followUp({ content: "An error occurred while executing this component.", flags: MessageFlags.Ephemeral }).catch(() => {});
                    } else {
                        await interaction.reply({ content: "An error occurred while executing this component.", flags: MessageFlags.Ephemeral }).catch(() => {});
                    }
                }
            }
        });
        Logger.success("Interaction router is now actively listening.", "InteractionManager");
    }
}
