import { create } from 'zustand';

export interface Guild {
  id: string;
  name: string;
  icon?: string;
  owner?: boolean;
  permissions?: string;
  botInGuild?: boolean;
  memberCount?: number;
  premiumTier?: number;
  premiumSubscriptionCount?: number;
  maximumBitrateKbps?: number;
}

export interface GuildStats {
  success?: boolean;
  id?: string;
  name?: string;
  memberCount?: number;
  approximateMemberCount?: number;
  approximatePresenceCount?: number;
  rolesCount?: number;
  emojisCount?: number;
  stickersCount?: number;
  premiumTier?: number;
  premiumSubscriptionCount?: number;
  maximumBitrateKbps?: number;
  channelsCount?: {
    text?: number;
    voice?: number;
    categories?: number;
    total?: number;
  };
}

interface GuildState {
  currentGuild: Guild | null;
  guilds: Guild[];
  setCurrentGuild: (guild: Guild | null) => void;
  setGuilds: (guilds: Guild[]) => void;
}

export const useGuildStore = create<GuildState>((set) => ({
  currentGuild: null,
  guilds: [],
  setCurrentGuild: (currentGuild) => {
    if (currentGuild?.id) {
      try { localStorage.setItem('fc_selected_guild_id', currentGuild.id); } catch {}
    }
    set({ currentGuild });
  },
  setGuilds: (guilds) => set({ guilds }),
}));
