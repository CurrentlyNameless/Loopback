import { Guild, GuildFeature } from "discord.js";

export const COMMUNITY_FEATURES: Record<string, string> = {
    COMMUNITY: "Community Server",
    NEWS: "Announcement Channels",
    MEMBER_VERIFICATION_GATE_ENABLED: "Membership Screening",
    WELCOME_SCREEN_ENABLED: "Welcome Screen",
    PREVIEW_ENABLED: "Server Preview",
    DISCOVERABLE: "Server Discovery",
    FEATURABLE: "Featured in Discovery",
    HAS_DIRECTORY_ENTRY: "Directory Entry",
    ROLE_SUBSCRIPTIONS_AVAILABLE: "Role Subscriptions",
    ROLE_SUBSCRIPTIONS_ENABLED: "Role Subscriptions Enabled",
    CREATOR_MONETIZABLE: "Creator Monetization",
    CREATOR_MONETIZABLE_DISABLED: "Creator Monetization (Disabled)",
    CREATOR_MONETIZABLE_RESTRICTED: "Creator Monetization (Restricted)",
    CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING: "Creator Monetization (Pending)",
    TEXT_IN_VOICE_ENABLED: "Text in Voice",
    THREADS_ENABLED: "Threads",
    THREADS_ENABLED_TESTING: "Threads (Testing)",
    PRIVATE_THREADS: "Private Threads",
    SOUNDBOARD: "Soundboard",
    AUTO_MODERATION: "Auto Moderation",
};

export function isCommunityGuild(guild: Guild): boolean {
    return guild.features.includes(GuildFeature.Community);
}

export function hasFeature(guild: Guild, feature: GuildFeature | string): boolean {
    return guild.features.includes(feature as GuildFeature);
}

export function getEnabledFeatures(guild: Guild): { feature: string; label: string; enabled: boolean }[] {
    return Object.entries(COMMUNITY_FEATURES).map(([feature, label]) => ({
        feature,
        label,
        enabled: guild.features.includes(feature as GuildFeature),
    }));
}

export function isNSFWAllowed(guild: Guild): boolean {
    return guild.features.includes(GuildFeature.Community);
}

export function canCreateAnnouncements(guild: Guild): boolean {
    return guild.features.includes(GuildFeature.Community);
}
