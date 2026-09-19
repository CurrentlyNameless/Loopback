import type { Guild, GuildMember, User } from 'discord.js';

export interface PlaceholderContext {
    guild?: Guild | null;
    user?: User | GuildMember | null;
    inviter?: User | GuildMember | null;
    extra?: Record<string, any>;
    customPlaceholders?: Record<string, string>;
}

export interface VariableDefinition {
    token: string;
    label: string;
    category: 'guild_center' | 'server' | 'user' | 'timestamps' | 'mentions' | 'modules' | 'markdown';
    moduleTag?: string;
    description: string;
    exampleOutput: string;
    syntax?: string;
    recommended?: boolean;
}

export class PlaceholderResolver {
    /**
     * Resolves all dynamic tokens, server information, user mentions,
     * timestamps, and module-specific placeholders within a template string.
     */
    static resolve(template: string, context: PlaceholderContext = {}): string {
        if (!template || typeof template !== 'string') return '';

        let result = template;
        const { guild, user, inviter, extra = {}, customPlaceholders = {} } = context;

        // 1. Resolve custom placeholders recursively if present
        for (const [key, val] of Object.entries(customPlaceholders)) {
            const resolvedVal = this.resolve(val, { guild, user, inviter, extra });
            result = result.replaceAll(`{${key}}`, resolvedVal);
        }

        // 2. Server / Guild Placeholders
        if (guild) {
            const memberCount = guild.memberCount ?? 0;
            const createdAtEpoch = Math.floor(guild.createdAt ? guild.createdAt.getTime() / 1000 : 0);
            const iconUrl = guild.iconURL?.() || '';

            result = result.replaceAll('{server}', guild.name || '');
            result = result.replaceAll('{guild}', guild.name || '');
            result = result.replaceAll('{guild_name}', guild.name || '');
            result = result.replaceAll('{server_name}', guild.name || '');
            result = result.replaceAll('{members}', memberCount.toLocaleString());
            result = result.replaceAll('{memberCount}', memberCount.toLocaleString());
            result = result.replaceAll('{member_count}', memberCount.toLocaleString());
            result = result.replaceAll('{createdAt}', String(createdAtEpoch));
            result = result.replaceAll('{created_at}', String(createdAtEpoch));
            result = result.replaceAll('{server_created}', String(createdAtEpoch));
            result = result.replaceAll('{icon}', iconUrl);
            result = result.replaceAll('{server_icon}', iconUrl);
            result = result.replaceAll('{icon_url}', iconUrl);

            if (guild.ownerId) {
                result = result.replaceAll('{ownerId}', guild.ownerId);
                result = result.replaceAll('{owner_id}', guild.ownerId);
            }
        }

        // 3. User / Member Placeholders
        if (user) {
            const isMember = 'user' in user && user.user;
            const discordUser: User = isMember ? (user as GuildMember).user : (user as User);
            const username = discordUser.username || '';
            const displayName = isMember ? (user as GuildMember).displayName : discordUser.globalName || username;
            const userId = discordUser.id || '';
            const userMention = `<@${userId}>`;
            const avatarUrl = discordUser.displayAvatarURL?.() || '';

            result = result.replaceAll('{user}', userMention);
            result = result.replaceAll('{mention}', userMention);
            result = result.replaceAll('{username}', username);
            result = result.replaceAll('{name}', username);
            result = result.replaceAll('{tag}', displayName);
            result = result.replaceAll('{usertag}', displayName);
            result = result.replaceAll('{displayName}', displayName);
            result = result.replaceAll('{avatar}', avatarUrl);
            result = result.replaceAll('{avatar_url}', avatarUrl);
            result = result.replaceAll('{user_avatar}', avatarUrl);
            result = result.replaceAll('{userId}', userId);
            result = result.replaceAll('{user_id}', userId);
            result = result.replaceAll('{id}', userId);

            if (discordUser.createdAt) {
                const userCreatedEpoch = Math.floor(discordUser.createdAt.getTime() / 1000);
                result = result.replaceAll('{userCreatedAt}', String(userCreatedEpoch));
                result = result.replaceAll('{accountCreatedAt}', String(userCreatedEpoch));
            }

            if (isMember && (user as GuildMember).joinedAt) {
                const joinedEpoch = Math.floor((user as GuildMember).joinedAt!.getTime() / 1000);
                result = result.replaceAll('{joinedAt}', String(joinedEpoch));
                result = result.replaceAll('{joined_at}', String(joinedEpoch));
            }
        }

        // 4. Inviter Placeholders
        if (inviter) {
            const isMember = 'user' in inviter && inviter.user;
            const inviterUser: User = isMember ? (inviter as GuildMember).user : (inviter as User);
            result = result.replaceAll('{inviter}', `<@${inviterUser.id}>`);
            result = result.replaceAll('{inviterTag}', inviterUser.username || '');
            result = result.replaceAll('{inviterUsername}', inviterUser.username || '');
        }

        // 5. Extra / Module Context Tokens (e.g. rules_count, roles_count, ticket_count, level, coins, streamer, etc.)
        for (const [key, val] of Object.entries(extra)) {
            if (val !== undefined && val !== null) {
                const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                result = result.replaceAll(`{${key}}`, strVal);
            }
        }

        return result;
    }

    /**
     * Resolves mock values for safe frontend rendering in the Dashboard Live Preview.
     */
    static resolveMock(template: string, customPlaceholders: Record<string, string> = {}): string {
        if (!template || typeof template !== 'string') return '';
        let res = template;

        for (const [key, val] of Object.entries(customPlaceholders)) {
            const resolvedVal = this.resolveMock(val);
            res = res.replaceAll(`{${key}}`, resolvedVal);
        }

        res = res.replaceAll('{server}', 'Your Server');
        res = res.replaceAll('{guild}', 'Your Server');
        res = res.replaceAll('{guild_name}', 'Your Server');
        res = res.replaceAll('{members}', '1,234');
        res = res.replaceAll('{memberCount}', '1,234');
        res = res.replaceAll('{member_count}', '1,234');
        res = res.replaceAll('{createdAt}', '1733000000');
        res = res.replaceAll('{rules_count}', '8');
        res = res.replaceAll('{roles_count}', '6');
        res = res.replaceAll('{ticket_count}', '2');
        res = res.replaceAll('{icon}', 'https://cdn.discordapp.com/embed/avatars/0.png');
        res = res.replaceAll('{user}', '@NewMember');
        res = res.replaceAll('{username}', 'new_member');
        res = res.replaceAll('{tag}', 'New Member');
        res = res.replaceAll('{level}', '15');
        res = res.replaceAll('{xp}', '4,250');
        res = res.replaceAll('{coins}', '500');
        res = res.replaceAll('{streak}', '7 days');
        res = res.replaceAll('{streamer}', 'FloofGamer');
        res = res.replaceAll('{platform}', 'Twitch');

        return res;
    }
}
