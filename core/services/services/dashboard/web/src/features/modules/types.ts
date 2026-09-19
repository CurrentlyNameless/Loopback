import React from 'react';

export interface SectionMeta {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  summary: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parentId?: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

export interface ModuleEditorProps {
  config: Record<string, any>;
  update: (path: string, val: any) => void;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  filterSectionId: string | null;
  guildId: string;
  cardStyle?: React.CSSProperties;
  onChannelCreated?: (newChannel: DiscordChannel) => void;
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  onDiscard?: () => void;
  refreshTick?: number;
  onRefresh?: () => void;
}
