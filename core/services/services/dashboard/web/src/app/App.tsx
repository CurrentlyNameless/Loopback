import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.tsx';
import { Providers } from './providers.tsx';
import { useAuthStore } from '../stores/auth.ts';
import { useGuildStore } from '../stores/guild.ts';

function resolveIcon(iconUrlOrHash: string | undefined | null, guildOrUserId?: string | null, isAvatar = false, size = 64): string | null {
  if (!iconUrlOrHash) return null;
  if (iconUrlOrHash.startsWith('http://') || iconUrlOrHash.startsWith('https://') || iconUrlOrHash.startsWith('data:')) {
    return iconUrlOrHash;
  }
  if (!guildOrUserId) return null;
  const isGif = iconUrlOrHash.startsWith('a_');
  const ext = isGif ? 'gif' : 'webp';
  return isAvatar 
    ? `https://cdn.discordapp.com/avatars/${guildOrUserId}/${iconUrlOrHash}.${ext}?size=${size}`
    : `https://cdn.discordapp.com/icons/${guildOrUserId}/${iconUrlOrHash}.${ext}?size=${size}`;
}

function TabMetaLoader({ botInfo }: { botInfo: any }) {
  const currentGuild = useGuildStore((s) => s.currentGuild);

  useEffect(() => {
    const serverName = currentGuild?.name || botInfo?.guildName || botInfo?.botName || botInfo?.username || 'Server';
    document.title = `${serverName} Panel`;

    const iconUrl = 
      resolveIcon(currentGuild?.icon, currentGuild?.id, false) ||
      resolveIcon(botInfo?.guildIcon, botInfo?.guildId, false) ||
      resolveIcon(botInfo?.avatar, botInfo?.id, true);

    if (iconUrl) {
      const existingIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      existingIcons.forEach((el) => el.remove());

      const newIcon = document.createElement('link');
      newIcon.rel = 'icon';
      newIcon.type = iconUrl.endsWith('.gif') ? 'image/gif' : 'image/png';
      newIcon.href = iconUrl;
      document.head.appendChild(newIcon);

      const newShortcut = document.createElement('link');
      newShortcut.rel = 'shortcut icon';
      newShortcut.type = newIcon.type;
      newShortcut.href = iconUrl;
      document.head.appendChild(newShortcut);
    }
  }, [botInfo, currentGuild]);

  return null;
}

export function App() {
  const { setUser, handleSessionExpired } = useAuthStore();
  const { setGuilds, setCurrentGuild, currentGuild } = useGuildStore();
  const [botInfo, setBotInfo] = useState<any>(null);

  useEffect(() => {
    // 1. Validate session
    fetch('/auth/me')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          const { instanceId, ...user } = data;
          setUser(user, instanceId);

          // If the authenticated user is an administrator, load administrative guild contexts
          if (user.isAdmin) {
            fetch('/api/guilds')
              .then((gres) => (gres.ok ? gres.json() : []))
              .then((fetchedGuilds) => {
                if (Array.isArray(fetchedGuilds) && fetchedGuilds.length > 0) {
                  setGuilds(fetchedGuilds);
                  let savedGuildId: string | null = null;
                  try {
                    savedGuildId = localStorage.getItem('fc_selected_guild_id') || 
                                   localStorage.getItem('dashboard_target_guild_id') || 
                                   (user as any).targetGuildId;
                  } catch {}
                  const saved = savedGuildId ? fetchedGuilds.find((g: any) => g.id === savedGuildId && g.botPresent !== false && g.botInGuild !== false) : null;
                  const firstConnected = fetchedGuilds.find((g: any) => g.botPresent !== false && g.botInGuild !== false);
                  const targetGuild = saved || firstConnected || fetchedGuilds[0];
                  setCurrentGuild(targetGuild);
                }
              })
              .catch(() => {});
          }

          return user;
        } else {
          setUser(null);
          return null;
        }
      })
      .catch(() => {
        setUser(null);
      });

    // 2. Fetch public bot details
    fetch('/api/bot')
      .then((res) => (res.ok ? res.json() : null))
      .then((bot) => {
        if (bot) {
          setBotInfo(bot);

          // If currentGuild is not set or empty, initialize it from bot/guild data
          const activeGuild = useGuildStore.getState().currentGuild;
          if (!activeGuild && (bot.guildId || bot.guildName)) {
            setCurrentGuild({
              id: bot.guildId || 'default',
              name: bot.guildName || bot.botName || 'Server',
              icon: bot.guildIcon,
              botInGuild: true,
            });
          }

          if (bot.instanceId) {
            const stored = localStorage.getItem('fc_instance_id');
            if (stored && stored !== bot.instanceId && useAuthStore.getState().isAuthenticated) {
              handleSessionExpired('bot_restarted');
            }
          }
        }
      })
      .catch(() => {});
  }, [setUser, setGuilds, setCurrentGuild, handleSessionExpired]);

  return (
    <Providers>
      <TabMetaLoader botInfo={botInfo} />
      <RouterProvider router={router} />
    </Providers>
  );
}

export default App;

