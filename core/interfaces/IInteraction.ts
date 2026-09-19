import { ButtonInteraction, ModalSubmitInteraction, AnySelectMenuInteraction } from "discord.js";

export interface IInteraction {
    moduleName?: string;
    customId: string; // The ID to match (e.g., "purge_confirm" or "tempvoice_")
    type: "button" | "modal" | "select";
    execute(interaction: ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction): Promise<void>;
}
