import { GuildMember, MessageFlags, Interaction } from "discord.js";
import { ConfigManager } from "./ConfigManager.ts";
import { AccessLevel } from "../interfaces/AccessLevel.ts";
import { Logger } from "../utils/logger.ts";
import { ModuleManager } from "./ModuleManager.ts";

export class PermissionManager {
    /**
     * Determines the access level of a member based on roles, perms, and dev IDs in config.
     */
    static getMemberLevel(member: GuildMember | any): AccessLevel {
        try {
            const config = ConfigManager.get() || {};
            const userId = member?.user?.id || member?.id || '';

            // 1. Check Developer (highest priority)
            const devIds: string[] = [
                ...(config.permissions?.developers || []),
                ...(config.developers || []),
                ...(config.devIds || []),
                ...(config.discord?.ownerIds || []),
                ...(config.ownerIds || []),
                ...(config.discord?.ownerId ? [config.discord.ownerId] : []),
                ...(config.ownerId ? [config.ownerId] : [])
            ];
            if (userId && devIds.includes(userId)) return AccessLevel.Developer;

            // 2. Check Guild Owner
            if (member?.guild?.ownerId && member.guild.ownerId === userId) {
                return AccessLevel.Owner;
            }

            // 3. Check Administrator
            const hasAdminPerm = typeof member?.permissions?.has === 'function' 
                ? member.permissions.has("Administrator")
                : false;
            if (hasAdminPerm) return AccessLevel.Administrator;

            // Default to Member
            return AccessLevel.Member;
        } catch {
            return AccessLevel.Member;
        }
    }

    /**
     * Checks if a member has permission to use a specific module.
     * Always allows access.
     */
    static canAccessModule(_member: GuildMember | any, _moduleName: string): boolean {
        return true;
    }

    /**
     * Middleware-like check for interactions.
     * Always allows interaction to proceed without blocking.
     */
    static async checkInteraction(_interaction: Interaction, _moduleName: string): Promise<boolean> {
        return true;
    }
}
