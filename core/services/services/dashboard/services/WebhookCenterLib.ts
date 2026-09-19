import { Guild, TextChannel, NewsChannel, ForumChannel, WebhookClient, BufferResolvable } from 'discord.js';
import { logger as Logger } from '../../../utils/Logger.js';

export interface WebhookInfo {
  id: string;
  name: string;
  avatar: string | null;
  avatarUrl: string | null;
  channelId: string;
  channelName: string;
  guildId: string;
  type: number;
  url?: string | null;
  token?: string | null;
  owner?: {
    id: string;
    username: string;
    avatar: string | null;
  } | null;
}

export interface CreateWebhookOptions {
  channelId: string;
  name: string;
  avatarMode?: 'bot_default' | 'custom_png' | 'custom_url';
  avatarData?: string; // base64 string or image URL
  reason?: string;
}

export interface WebhookMessagePayload {
  content?: string;
  username?: string;
  avatarURL?: string;
  embeds?: any[];
  tts?: boolean;
}

function validWebhookName(name: unknown): name is string {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 80;
}

function resolveWebhookChannel(guild: Guild, channelId: string): TextChannel | NewsChannel | ForumChannel {
  const channel = guild.channels.cache.get(channelId);
  if (!(channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ForumChannel)) {
    throw new Error('The selected channel does not support webhooks.');
  }
  return channel;
}

/**
 * Fetch all webhooks in a guild (from all accessible text/announcement channels).
 */
export async function fetchGuildWebhooks(guild: Guild): Promise<WebhookInfo[]> {
  try {
    const webhooks = await guild.fetchWebhooks();
    const result: WebhookInfo[] = [];

    for (const [id, wh] of webhooks) {
      let channelName = 'Unknown Channel';
      const ch = guild.channels.cache.get(wh.channelId);
      if (ch) {
        channelName = ch.name;
      }

      let resolvedAvatarUrl = wh.avatarURL({ extension: 'png', size: 256 });
      if (!resolvedAvatarUrl && wh.avatar) {
        resolvedAvatarUrl = `https://cdn.discordapp.com/webhooks/${wh.id}/${wh.avatar}.png?size=256`;
      }
      if (!resolvedAvatarUrl && wh.owner?.id && (wh.owner as any).avatar) {
        const ownerAvatar = (wh.owner as any).avatar;
        const ext = ownerAvatar.startsWith('a_') ? 'gif' : 'png';
        resolvedAvatarUrl = `https://cdn.discordapp.com/avatars/${wh.owner.id}/${ownerAvatar}.${ext}?size=256`;
      }

      result.push({
        id: wh.id,
        name: wh.name,
        avatar: wh.avatar,
        avatarUrl: resolvedAvatarUrl,
        channelId: wh.channelId,
        channelName,
        guildId: wh.guildId,
        type: wh.type,
        url: wh.url || (wh.token ? `https://discord.com/api/webhooks/${wh.id}/${wh.token}` : null),
        token: wh.token || null,
        owner: wh.owner
          ? {
              id: wh.owner.id,
              username: 'username' in wh.owner ? (wh.owner as any).username : wh.owner.id,
              avatar: wh.owner.avatar,
            }
          : null,
      });
    }

    return result;
  } catch (error: any) {
    Logger.error(`Failed to fetch guild webhooks: ${error?.message || error}`, 'WebhookCenter');
    throw error;
  }
}

/**
 * Helper to turn a base64 data URI (e.g. data:image/png;base64,...) or URL into a Buffer for discord.js avatar parameter.
 */
function parseAvatarBuffer(avatarData?: string): BufferResolvable | undefined {
  if (!avatarData) return undefined;
  if (avatarData.startsWith('data:image')) {
    const base64Str = avatarData.split(',')[1];
    if (base64Str && base64Str.length <= 2_800_000) {
      return Buffer.from(base64Str, 'base64');
    }
    throw new Error('Avatar image is invalid or exceeds 2 MB.');
  }
  if (!/^https:\/\/[^\s]{1,2000}$/i.test(avatarData)) throw new Error('Avatar URL must be a valid HTTPS URL.');
  return avatarData;
}

/**
 * Create a new webhook for a specific channel in the guild.
 */
export async function createChannelWebhook(
  guild: Guild,
  options: CreateWebhookOptions,
  clientUser?: any
): Promise<WebhookInfo> {
  const { channelId, name, avatarMode, avatarData, reason } = options;

  if (!validWebhookName(name)) throw new Error('Webhook name must be between 1 and 80 characters.');
  const channel = resolveWebhookChannel(guild, channelId);

  let avatarBuffer: BufferResolvable | undefined = undefined;

  if (avatarMode === 'bot_default' && clientUser) {
    const botAvatar = clientUser.displayAvatarURL({ extension: 'png', size: 256 });
    avatarBuffer = botAvatar;
  } else if (avatarData) {
    avatarBuffer = parseAvatarBuffer(avatarData);
  }

  const webhook = await channel.createWebhook({
    name: name.trim(),
    avatar: avatarBuffer,
    reason: reason || 'Created via Centralized Webhook Center Dashboard',
  });

  return {
    id: webhook.id,
    name: webhook.name,
    avatar: webhook.avatar,
    avatarUrl: webhook.avatarURL({ extension: 'png', size: 128 }),
    channelId: webhook.channelId,
    channelName: channel.name,
    guildId: webhook.guildId,
    type: webhook.type,
    url: webhook.url || (webhook.token ? `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}` : null),
    token: webhook.token || null,
    owner: clientUser
      ? {
          id: clientUser.id,
          username: clientUser.username,
          avatar: clientUser.avatar,
        }
      : null,
  };
}

/**
 * Execute a webhook post using Discord WebhookClient or webhook URL.
 */
export async function executeWebhookMessage(
  webhookUrlOrToken: string,
  payload: WebhookMessagePayload
): Promise<void> {
  if ((!payload.content || !payload.content.trim()) && (!payload.embeds || payload.embeds.length === 0)) {
    throw new Error('Webhook messages need content or an embed.');
  }
  if (payload.content && payload.content.length > 2000) throw new Error('Webhook message content cannot exceed 2,000 characters.');
  if (payload.username && payload.username.length > 80) throw new Error('Webhook username cannot exceed 80 characters.');
  if (payload.embeds && payload.embeds.length > 10) throw new Error('A webhook message can contain at most 10 embeds.');
  let webhookClient: WebhookClient;

  if (webhookUrlOrToken.startsWith('http')) {
    webhookClient = new WebhookClient({ url: webhookUrlOrToken });
  } else {
    // Assume id:token format
    const [id, token] = webhookUrlOrToken.split(':');
    if (!id || !token) {
      throw new Error('Invalid webhook credentials string format.');
    }
    webhookClient = new WebhookClient({ id, token });
  }

  try {
    await webhookClient.send({
      content: payload.content || undefined,
      username: payload.username || undefined,
      avatarURL: payload.avatarURL || undefined,
      embeds: payload.embeds && payload.embeds.length > 0 ? payload.embeds : undefined,
      tts: payload.tts || false,
    });
  } finally {
    webhookClient.destroy();
  }
}

export async function executeGuildWebhookMessage(guild: Guild, webhookId: string, payload: WebhookMessagePayload): Promise<void> {
  const webhook = (await guild.fetchWebhooks()).get(webhookId);
  if (!webhook?.token) throw new Error('Webhook not found or its token is unavailable.');
  await executeWebhookMessage(`${webhook.id}:${webhook.token}`, payload);
}

/**
 * Edit an existing webhook in a guild.
 */
export async function editGuildWebhook(
  guild: Guild,
  webhookId: string,
  data: { name?: string; channelId?: string; avatarMode?: 'bot_default' | 'custom_png' | 'guild_icon' | 'keep'; avatarData?: string },
  clientUser?: any
): Promise<WebhookInfo> {
  const webhooks = await guild.fetchWebhooks();
  const webhook = webhooks.get(webhookId);

  if (!webhook) {
    throw new Error(`Webhook with ID ${webhookId} not found.`);
  }
  if (data.name !== undefined && !validWebhookName(data.name)) throw new Error('Webhook name must be between 1 and 80 characters.');
  if (data.channelId) resolveWebhookChannel(guild, data.channelId);

  let avatarBuffer: BufferResolvable | undefined = undefined;

  if (data.avatarMode === 'bot_default' && clientUser) {
    avatarBuffer = clientUser.displayAvatarURL({ extension: 'png', size: 256 });
  } else if (data.avatarMode === 'guild_icon' && guild.iconURL()) {
    avatarBuffer = guild.iconURL({ extension: 'png', size: 256 }) || undefined;
  } else if (data.avatarData) {
    avatarBuffer = parseAvatarBuffer(data.avatarData);
  }

  const updated = await webhook.edit({
    name: data.name?.trim() || webhook.name,
    channel: data.channelId || webhook.channelId,
    avatar: avatarBuffer !== undefined ? avatarBuffer : webhook.avatarURL(),
    reason: 'Updated via Centralized Webhook Center Dashboard',
  });

  let channelName = 'Unknown Channel';
  const ch = guild.channels.cache.get(updated.channelId);
  if (ch) channelName = ch.name;

  return {
    id: updated.id,
    name: updated.name,
    avatar: updated.avatar,
    avatarUrl: updated.avatarURL({ extension: 'png', size: 128 }),
    channelId: updated.channelId,
    channelName,
    guildId: updated.guildId,
    type: updated.type,
    url: updated.url || (updated.token ? `https://discord.com/api/webhooks/${updated.id}/${updated.token}` : null),
    token: updated.token || null,
    owner: updated.owner
      ? {
          id: updated.owner.id,
          username: 'username' in updated.owner ? (updated.owner as any).username : updated.owner.id,
          avatar: updated.owner.avatar,
        }
      : null,
  };
}

/**
 * Delete a webhook from a guild.
 */
export async function deleteGuildWebhook(guild: Guild, webhookId: string): Promise<boolean> {
  const webhooks = await guild.fetchWebhooks();
  const webhook = webhooks.get(webhookId);

  if (!webhook) {
    throw new Error(`Webhook with ID ${webhookId} not found.`);
  }

  await webhook.delete('Deleted via Centralized Webhook Center Dashboard');
  return true;
}
