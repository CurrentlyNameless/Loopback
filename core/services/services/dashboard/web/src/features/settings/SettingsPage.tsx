import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';
import { 
  IconSettings, 
  IconPalette, 
  IconServer, 
  IconRobot, 
  IconShield, 
  IconDatabase, 
  IconFileText, 
  IconDeviceFloppy,
  IconCheck,
  IconBrandDiscord,
  IconTrash,
  IconVolume,
  IconVolumeOff,
  IconPlayerPlay,
  IconPlayerPause,
  IconPhoto,
  IconUpload,
  IconClock,
  IconLock,
  IconAlertTriangle,
  IconBroadcast,
  IconWebhook,
  IconSparkles,
  IconLink,
  IconPlus,
  IconEdit,
  IconArrowsShuffle,
  IconInfoCircle,
  IconExternalLink,
  IconShieldLock,
  IconUserPlus,
  IconUserCheck,
  IconUsers,
  IconSearch,
  IconX,
  IconTerminal2,
  IconRefresh
} from '@tabler/icons-react';
import { useToast } from '../../components/Toast.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Switch } from '../../components/ui/Switch.tsx';
import { Select } from '../../components/ui/Select.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { ReorderableList, ReorderHandle, ReorderArrows } from '../../components/ui/ReorderableList.tsx';
import { 
  saveAssetBlob, 
  getAssetUrl, 
  deleteAsset, 
  getAllAssets, 
  type DashboardAsset 
} from '../../lib/assetStore.ts';
import { BuilderPage } from '../builder/BuilderPage.tsx';
import { useGuildStore } from '../../stores/guild.ts';
import { UserAvatar } from '../../components/discord/UserAvatar.tsx';

export interface BotActivityItem {
  id?: string;
  name: string;
  type: 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'COMPETING' | 'CUSTOM';
  url?: string;
  state?: string;
  showType?: boolean;
}


type SettingsTab = 'presence' | 'server' | 'admins' | 'security' | 'appearance' | 'backup' | 'logging';

const VALID_SETTINGS_TABS: SettingsTab[] = ['presence', 'server', 'admins', 'security', 'appearance', 'backup', 'logging'];

export const SettingsPage: React.FC = () => {
  const { show: showToast } = useToast();
  const pageRef = usePageEntrance();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabQuery = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    initialTabQuery && VALID_SETTINGS_TABS.includes(initialTabQuery) ? initialTabQuery : 'presence'
  );

  useEffect(() => {
    const q = searchParams.get('tab') as SettingsTab | null;
    if (q && VALID_SETTINGS_TABS.includes(q) && q !== activeTab) {
      setActiveTab(q);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    setSearchParams(tabId === 'presence' ? {} : { tab: tabId });
  };

  const [saving, setSaving] = useState(false);

  // 1. Presence & Activity Builder State
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'idle' | 'dnd' | 'invisible'>('online');
  const [rotateActivities, setRotateActivities] = useState(true);
  const [rotateInterval, setRotateInterval] = useState(30000);
  const [activitiesList, setActivitiesList] = useState<BotActivityItem[]>([
    { name: 'with modules', type: 'PLAYING' },
    { name: 'over {guildCount} servers', type: 'WATCHING' },
  ]);

  const [editingActivityIdx, setEditingActivityIdx] = useState<number | null>(null);
  const [editingActivityData, setEditingActivityData] = useState<BotActivityItem | null>(null);
  const [newActivity, setNewActivity] = useState<BotActivityItem>({
    name: '',
    type: 'PLAYING',
    url: '',
    state: '',
  });
  const [presenceStats, setPresenceStats] = useState({
    guildCount: 1,
    userCount: 12,
    ping: 16,
    botName: 'FloofCore',
  });
  const [presenceSaving, setPresenceSaving] = useState(false);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);

  // 2. Server Identity State
  const [serverNickname, setServerNickname] = useState('FloofCore Bot');
  const [prefix, setPrefix] = useState('!');
  const [locale, setLocale] = useState('en');
  const [hubApplicationsEnabled, setHubApplicationsEnabled] = useState(false);
  const [serverSaving, setServerSaving] = useState(false);

  const currentGuild = useGuildStore((s) => s.currentGuild);

  // Load server settings on guild change
  useEffect(() => {
    if (!currentGuild?.id) return;
    fetch(`/api/guilds/${currentGuild.id}/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) {
          if (data.settings.serverNickname) setServerNickname(data.settings.serverNickname);
          if (data.settings.prefix) setPrefix(data.settings.prefix);
          if (data.settings.locale) setLocale(data.settings.locale);
          if (data.settings.hubApplicationsEnabled !== undefined) {
            setHubApplicationsEnabled(Boolean(data.settings.hubApplicationsEnabled));
          }
        }
      })
      .catch(() => {});
  }, [currentGuild?.id]);

  const handleSaveServerSettings = async () => {
    if (!currentGuild?.id) return;
    setServerSaving(true);
    try {
      const res = await fetch(`/api/guilds/${currentGuild.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            serverNickname,
            prefix,
            locale,
            hubApplicationsEnabled,
          },
        }),
      });
      if (res.ok) {
        showToast({
          title: 'Server Settings Synchronized',
          message: `Saved server identity, prefix, and hub settings for ${currentGuild.name}.`,
          type: 'success',
        });
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to update server settings' }));
        showToast({
          title: 'Save Failed',
          message: err.error || 'Could not persist server configuration.',
          type: 'error',
        });
      }
    } catch {
      showToast({
        title: 'Network Error',
        message: 'Failed to communicate with dashboard backend.',
        type: 'error',
      });
    } finally {
      setServerSaving(false);
    }
  };

  // Guild Dashboard Admins & Access Control State
  const [adminUsers, setAdminUsers] = useState<Array<{
    id: string;
    username: string;
    displayName?: string;
    tag?: string;
    avatar?: string | null;
    roleName?: string;
    roleColor?: string;
    addedAt?: string;
  }>>([]);
  const [adminRoleIds, setAdminRoleIds] = useState<string[]>([]);
  const [guildMembers, setGuildMembers] = useState<Array<{
    id: string;
    username: string;
    displayName?: string;
    tag?: string;
    avatar?: string | null;
    roles?: Array<{ id: string; name: string; color?: string }>;
  }>>([]);
  const [guildRoles, setGuildRoles] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [savingAdmins, setSavingAdmins] = useState(false);

  useEffect(() => {
    if (!currentGuild?.id || activeTab !== 'admins') return;

    setLoadingAdmins(true);
    Promise.all([
      fetch(`/api/guilds/${currentGuild.id}/admins`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/guilds/${currentGuild.id}/members`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/guilds/${currentGuild.id}/roles`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([adminsData, membersData, rolesData]) => {
        if (adminsData && Array.isArray(adminsData.users)) {
          setAdminUsers(adminsData.users);
          setAdminRoleIds(Array.isArray(adminsData.adminRoleIds) ? adminsData.adminRoleIds : []);
        }
        if (Array.isArray(membersData)) {
          setGuildMembers(membersData);
        }
        if (Array.isArray(rolesData)) {
          setGuildRoles(rolesData);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAdmins(false));
  }, [currentGuild?.id, activeTab]);

  const handleAddAdmin = (targetId?: string) => {
    const idToAdd = targetId || selectedMemberId;
    if (!idToAdd) {
      showToast({ title: 'Select Member', message: 'Please select a member from the guild first.', type: 'warning' });
      return;
    }
    if (adminUsers.some((u) => u.id === idToAdd)) {
      showToast({ title: 'Already Added', message: 'This member is already configured as a dashboard admin.', type: 'warning' });
      return;
    }
    const member = guildMembers.find((m) => m.id === idToAdd);
    const newEntry = {
      id: idToAdd,
      username: member?.username || `User ${idToAdd}`,
      displayName: member?.displayName || member?.username || `User ${idToAdd}`,
      tag: member?.tag || member?.username || idToAdd,
      avatar: member?.avatar || null,
      roleName: member?.roles?.[0]?.name || 'Server Member',
      roleColor: member?.roles?.[0]?.color || '#a855f7',
      addedAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...adminUsers];
    setAdminUsers(updated);
    setSelectedMemberId('');
    setMemberSearchQuery('');
    showToast({
      title: 'Admin Added',
      message: `Granted dashboard permissions to ${newEntry.displayName}. Click "Save Admin Permissions" to finalize.`,
      type: 'success',
    });
  };

  const handleRemoveAdmin = (idToRemove: string) => {
    const updated = adminUsers.filter((u) => u.id !== idToRemove);
    setAdminUsers(updated);
    showToast({ title: 'Admin Removed', message: 'Dashboard permission revoked. Click "Save Admin Permissions" to finalize.', type: 'info' });
  };

  const handleToggleAdminRole = (roleId: string) => {
    const next = adminRoleIds.includes(roleId)
      ? adminRoleIds.filter((r) => r !== roleId)
      : [...adminRoleIds, roleId];
    setAdminRoleIds(next);
  };

  const handleSaveAdmins = async () => {
    if (!currentGuild?.id) return;
    setSavingAdmins(true);
    try {
      const res = await fetch(`/api/guilds/${currentGuild.id}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserIds: adminUsers.map((u) => u.id),
          adminRoleIds,
          users: adminUsers,
        }),
      });
      if (res.ok) {
        showToast({
          title: 'Admins Synchronized',
          message: `Saved ${adminUsers.length} admin user(s) and ${adminRoleIds.length} admin role(s) for ${currentGuild.name}.`,
          type: 'success',
        });
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        showToast({ title: 'Save Failed', message: err.error || 'Could not save admin permissions.', type: 'error' });
      }
    } catch {
      showToast({ title: 'Network Error', message: 'Failed to communicate with dashboard backend.', type: 'error' });
    } finally {
      setSavingAdmins(false);
    }
  };

  // 3. Security & AutoMod State
  const [autoModEnabled, setAutoModEnabled] = useState(true);
  const [maxMentions, setMaxMentions] = useState(5);
  const [maxDuplicates, setMaxDuplicates] = useState(3);
  const [honeypotEnabled, setHoneypotEnabled] = useState(true);
  const [whitelistedDomains, setWhitelistedDomains] = useState('discord.com, youtube.com, github.com, twitter.com');
  const [blacklistedWords, setBlacklistedWords] = useState('badword1, badword2, spamlink.xyz');

  // 4. Appearance, PNG/GIF Backgrounds & MP3 Sound FX
  const [themePreset, setThemePreset] = useState<'cupcake' | 'ocean' | 'emerald' | 'midnight' | 'orchid' | 'sunset'>(
    () => (localStorage.getItem('theme') as any) || 'orchid'
  );
  const [bgImageEnabled, setBgImageEnabled] = useState(() => localStorage.getItem('bgImageEnabled') === 'true');
  const [selectedBgAssetId, setSelectedBgAssetId] = useState(() => localStorage.getItem('selectedBgAssetId') || '');
  const [customBgUrlInput, setCustomBgUrlInput] = useState(() => localStorage.getItem('bgImageUrl') || '');
  const [bgOpacity, setBgOpacity] = useState(() => Number(localStorage.getItem('bgOpacity') || '45'));
  const [bgBlur, setBgBlur] = useState(() => Number(localStorage.getItem('bgBlur') || '2'));
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);

  const [soundFxEnabled, setSoundFxEnabled] = useState(() => localStorage.getItem('soundFxEnabled') === 'true');
  const [selectedAudioAssetId, setSelectedAudioAssetId] = useState(() => localStorage.getItem('selectedAudioAssetId') || '');
  const [soundVolume, setSoundVolume] = useState(() => Number(localStorage.getItem('soundVolume') || '50'));
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Asset Store State
  const [assets, setAssets] = useState<DashboardAsset[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // 5. Backup Vault State
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('Daily');
  const [keepBackupsCount, setKeepBackupsCount] = useState(14);

  // 6. Logging & Webhooks State
  const [auditWebhook, setAuditWebhook] = useState('https://discord.com/api/webhooks/...');
  const [logMemberJoins, setLogMemberJoins] = useState(true);
  const [logMessageEdits, setLogMessageEdits] = useState(true);
  const [logRoleChanges, setLogRoleChanges] = useState(true);
  const [logVoiceActivity, setLogVoiceActivity] = useState(false);

  // Trigger global backdrop update
  const notifyBackdropUpdate = () => {
    window.dispatchEvent(new Event('dashboard-backdrop-updated'));
  };

  // Load presence and assets on mount
  useEffect(() => {
    refreshAssets();
    fetch('/api/presence')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.status) setPresenceStatus(data.status);
          if (data.rotate !== undefined) setRotateActivities(data.rotate);
          if (data.rotateInterval) setRotateInterval(data.rotateInterval);
          if (Array.isArray(data.activities) && data.activities.length > 0) {
            setActivitiesList(data.activities);
          }
          if (data.stats) {
            setPresenceStats(data.stats);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Cycle preview in real-time if rotation is enabled
  useEffect(() => {
    if (!rotateActivities || activitiesList.length <= 1) {
      setActivePreviewIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setActivePreviewIdx((prev) => (prev + 1) % activitiesList.length);
    }, Math.max(3000, rotateInterval));
    return () => clearInterval(timer);
  }, [rotateActivities, rotateInterval, activitiesList.length]);

  const resolvePreviewTokens = (text: string) => {
    return (text || '')
      .replace(/\{guildCount\}/g, String(presenceStats.guildCount || 1))
      .replace(/\{userCount\}/g, String(presenceStats.userCount || 12))
      .replace(/\{ping\}/g, String(presenceStats.ping || 16))
      .replace(/\{botName\}/g, presenceStats.botName || 'FloofCore')
      .replace(/\{prefix\}/g, prefix || '!');
  };

  const pushPresenceUpdate = async (patch: { status?: string; rotate?: boolean; rotateInterval?: number; activities?: any[] }) => {
    const payload = {
      status: patch.status ?? presenceStatus,
      rotate: patch.rotate ?? rotateActivities,
      rotateInterval: patch.rotateInterval ?? rotateInterval,
      activities: patch.activities ?? activitiesList,
    };
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}
  };

  const handleSavePresence = async () => {
    setPresenceSaving(true);
    try {
      const res = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: presenceStatus,
          rotate: rotateActivities,
          rotateInterval,
          activities: activitiesList,
        }),
      });
      if (res.ok) {
        showToast({
          title: 'Presence Pushed Live',
          message: 'Synced to Discord Gateway and saved to config.yml',
          type: 'success',
        });
      } else {
        showToast({ title: 'Sync Failed', message: 'Could not push presence to Discord Gateway.', type: 'error' });
      }
    } catch {
      showToast({ title: 'Sync Failed', message: 'Could not connect to backend gateway.', type: 'error' });
    }
    setPresenceSaving(false);
  };

  const refreshAssets = async () => {
    const list = await getAllAssets();
    setAssets(list);
  };

  // Resolve background preview URL
  useEffect(() => {
    if (customBgUrlInput && !selectedBgAssetId) {
      setBgPreviewUrl(customBgUrlInput);
      return;
    }
    if (!selectedBgAssetId) {
      setBgPreviewUrl(null);
      return;
    }
    getAssetUrl(selectedBgAssetId).then((url) => {
      setBgPreviewUrl(url);
    });
  }, [selectedBgAssetId, customBgUrlInput]);

  // Handle Image / GIF upload
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const id = `img_${Date.now()}`;
    await saveAssetBlob(id, file, {
      name: file.name,
      type: 'image',
      size: file.size,
      mimeType: file.type,
      createdAt: Date.now(),
    });

    setSelectedBgAssetId(id);
    setBgImageEnabled(true);
    localStorage.setItem('selectedBgAssetId', id);
    localStorage.setItem('bgImageEnabled', 'true');
    localStorage.removeItem('bgImageUrl');
    setCustomBgUrlInput('');
    await refreshAssets();
    notifyBackdropUpdate();

    showToast({
      title: 'Background Media Saved',
      message: `Uploaded ${file.name} to Dashboard Asset Vault.`,
      type: 'success',
    });
  };

  const handleApplyDirectUrl = () => {
    if (!customBgUrlInput.trim()) return;
    setSelectedBgAssetId('');
    localStorage.removeItem('selectedBgAssetId');
    localStorage.setItem('bgImageUrl', customBgUrlInput.trim());
    localStorage.setItem('bgImageEnabled', 'true');
    setBgImageEnabled(true);
    notifyBackdropUpdate();

    showToast({
      title: 'Wallpaper URL Applied',
      message: 'Background image/GIF linked to dashboard backdrop.',
      type: 'success',
    });
  };

  // Handle MP3 Sound upload
  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const id = `aud_${Date.now()}`;
    await saveAssetBlob(id, file, {
      name: file.name,
      type: 'audio',
      size: file.size,
      mimeType: file.type,
      createdAt: Date.now(),
    });

    setSelectedAudioAssetId(id);
    setSoundFxEnabled(true);
    localStorage.setItem('selectedAudioAssetId', id);
    localStorage.setItem('soundFxEnabled', 'true');
    await refreshAssets();

    showToast({
      title: 'Sound FX Saved',
      message: `Uploaded ${file.name} to Dashboard Asset Vault.`,
      type: 'success',
    });
  };

  const handleDeleteAsset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteAsset(id);
    if (selectedBgAssetId === id) {
      setSelectedBgAssetId('');
      localStorage.removeItem('selectedBgAssetId');
      notifyBackdropUpdate();
    }
    if (selectedAudioAssetId === id) {
      setSelectedAudioAssetId('');
      localStorage.removeItem('selectedAudioAssetId');
    }
    await refreshAssets();
  };

  const handleTestPlayAudio = async () => {
    if (!selectedAudioAssetId) {
      showToast({
        title: 'No Audio Selected',
        message: 'Upload or pick an MP3 sound effect first.',
        type: 'warning',
      });
      return;
    }

    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    const url = await getAssetUrl(selectedAudioAssetId);
    if (!url) return;

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(url);
    } else {
      audioPlayerRef.current.src = url;
    }

    audioPlayerRef.current.volume = Math.min(1, Math.max(0, soundVolume / 100));
    audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    audioPlayerRef.current.play().catch(() => {});
    setIsPlayingAudio(true);
  };

  const handleToggleBg = (checked: boolean) => {
    setBgImageEnabled(checked);
    localStorage.setItem('bgImageEnabled', String(checked));
    notifyBackdropUpdate();
  };

  const handleOpacityChange = (val: number) => {
    setBgOpacity(val);
    localStorage.setItem('bgOpacity', String(val));
    notifyBackdropUpdate();
  };

  const handleBlurChange = (val: number) => {
    setBgBlur(val);
    localStorage.setItem('bgBlur', String(val));
    notifyBackdropUpdate();
  };

  const handleSave = () => {
    setSaving(true);

    localStorage.setItem('theme', themePreset);
    localStorage.setItem('bgImageEnabled', String(bgImageEnabled));
    localStorage.setItem('selectedBgAssetId', selectedBgAssetId);
    if (customBgUrlInput) localStorage.setItem('bgImageUrl', customBgUrlInput);
    localStorage.setItem('bgOpacity', String(bgOpacity));
    localStorage.setItem('bgBlur', String(bgBlur));
    localStorage.setItem('soundFxEnabled', String(soundFxEnabled));
    localStorage.setItem('selectedAudioAssetId', selectedAudioAssetId);
    localStorage.setItem('soundVolume', String(soundVolume));

    notifyBackdropUpdate();
    handleSavePresence();
    if (activeTab === 'admins') {
      handleSaveAdmins();
    }
    if (currentGuild?.id) {
      fetch(`/api/guilds/${currentGuild.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            serverNickname,
            prefix,
            locale,
            hubApplicationsEnabled,
          },
        }),
      }).catch(() => {});
    }

    setTimeout(() => {
      setSaving(false);
      showToast({
        title: 'Configuration Synchronized',
        message: 'Theme, wallpaper, sound effects, presence, and server settings updated.',
        type: 'success',
      });
    }, 450);
  };

  const addActivity = () => {
    if (!newActivity.name.trim()) {
      showToast({
        title: 'Missing Activity Text',
        message: 'Please enter a name or format string for the activity.',
        type: 'warning',
      });
      return;
    }
    const updated = [...activitiesList, { ...newActivity }];
    setActivitiesList(updated);
    setNewActivity({ name: '', type: 'PLAYING', url: '', state: '' });
    pushPresenceUpdate({ activities: updated });
    showToast({
      title: 'Activity Added & Synced',
      message: 'New presence item pushed live to Discord Gateway.',
      type: 'success',
    });
  };

  const removeActivity = (idx: number) => {
    const updated = activitiesList.filter((_, i) => i !== idx);
    setActivitiesList(updated);
    pushPresenceUpdate({ activities: updated });
    if (editingActivityIdx === idx) {
      setEditingActivityIdx(null);
      setEditingActivityData(null);
    }
  };

  const startEditActivity = (idx: number) => {
    setEditingActivityIdx(idx);
    setEditingActivityData({ ...activitiesList[idx] });
  };

  const saveEditActivity = () => {
    if (editingActivityIdx === null || !editingActivityData) return;
    const copy = [...activitiesList];
    copy[editingActivityIdx] = { ...editingActivityData };
    setActivitiesList(copy);
    pushPresenceUpdate({ activities: copy });
    setEditingActivityIdx(null);
    setEditingActivityData(null);
    showToast({
      title: 'Activity Updated & Synced',
      message: 'Presence modifications pushed live to Discord Gateway.',
      type: 'success',
    });
  };

  const activityTypeOptions = [
    { value: 'PLAYING', label: '🎮 Playing', sublabel: 'e.g. Playing with floofs' },
    { value: 'STREAMING', label: '📡 Streaming', sublabel: 'Twitch / YouTube live URL' },
    { value: 'LISTENING', label: '🎧 Listening', sublabel: 'e.g. Music, /help' },
    { value: 'WATCHING', label: '📺 Watching', sublabel: 'e.g. over {guildCount} servers' },
    { value: 'COMPETING', label: '🏆 Competing', sublabel: 'e.g. in Top Discord Bots' },
    { value: 'CUSTOM', label: '💬 Custom Status', sublabel: 'Exact custom text (e.g. "Listening to Music")' },
  ];


  const rotationIntervalOptions = [
    { value: '30000', label: 'Every 30 Seconds (Default — Safe)' },
    { value: '45000', label: 'Every 45 Seconds' },
    { value: '60000', label: 'Every 1 Minute' },
    { value: '120000', label: 'Every 2 Minutes' },
    { value: '300000', label: 'Every 5 Minutes' },
    { value: '600000', label: 'Every 10 Minutes' },
  ];




  const previewActivity = activitiesList[activePreviewIdx] || activitiesList[0] || {
    name: 'with modules',
    type: 'PLAYING',
  };

  const tabs = [
    { id: 'presence', label: 'Bot Presence & Activities', icon: IconRobot },
    { id: 'server', label: 'Server & Prefix', icon: IconServer },
    { id: 'admins', label: 'Admins & Permissions', icon: IconShieldLock },
    { id: 'security', label: 'Security & AutoMod', icon: IconShield },
    { id: 'appearance', label: 'Theme & Media FX', icon: IconPalette },
    { id: 'backup', label: 'Backup Vault', icon: IconDatabase },
    { id: 'logging', label: 'Audit Logging', icon: IconFileText },
  ];

  return (
    <div ref={pageRef} className="space-y-6 max-w-7xl mx-auto select-none py-2 font-sans">
      
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleUploadImage}
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={audioInputRef}
        onChange={handleUploadAudio}
        accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
        className="hidden"
      />

      {/* ── Header Banner ────────────────────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-[28px] bg-[#0E1320]/90 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20">
              CLUSTER CONTROL PLANE
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● SYNCED
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
            Settings &amp; Presence
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Customize bot identity, presence activity builder, animated PNG/GIF wallpapers, MP3 UI sounds, and AutoMod.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'presence' && (
            <Button
              variant="secondary"
              size="sm"
              loading={presenceSaving}
              leftIcon={<IconBroadcast size={16} />}
              onClick={handleSavePresence}
            >
              Push Live to Gateway
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            loading={saving}
            leftIcon={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
          >
            Save All Changes
          </Button>
        </div>
      </div>

      {/* ── Tabs Navigation Bar ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0E1320]/80 border border-white/10 overflow-x-auto">
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <IconComp size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content Panels ───────────────────────────────────────── */}
      <div className="space-y-6">
        
        {/* 1. BOT PRESENCE & ACTIVITY BUILDER TAB */}
        {activeTab === 'presence' && (
          <div className="space-y-6">
            
            {/* Top Row: Presence Gateway Controls + Live Client Profile Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Status State & Rotation Settings */}
              <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-xl">
                      🤖
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white font-heading">Discord Rich Presence &amp; Status</h3>
                      <p className="text-xs text-slate-400">Live bot status and activity cycling across Discord Gateway</p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    loading={presenceSaving}
                    leftIcon={<IconBroadcast size={14} />}
                    onClick={handleSavePresence}
                  >
                    Sync Live
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                      <span>Gateway Status State</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'online', label: '🟢 Online', active: 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-emerald-500/10' },
                        { key: 'idle', label: '🌙 Idle', active: 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-amber-500/10' },
                        { key: 'dnd', label: '⛔ DND', active: 'bg-rose-500/15 border-rose-500/60 text-rose-300 shadow-rose-500/10' },
                        { key: 'invisible', label: '👻 Invisible', active: 'bg-slate-500/20 border-slate-400 text-slate-300 shadow-slate-500/10' },
                      ].map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => {
                            setPresenceStatus(s.key as any);
                            pushPresenceUpdate({ status: s.key });
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            presenceStatus === s.key
                              ? `${s.active} shadow-lg font-black`
                              : 'border-white/10 text-slate-400 hover:text-white bg-white/[0.02] hover:border-white/20'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Activity Rotation Toggle & Poll Time Interval */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                        <IconArrowsShuffle size={14} className="text-violet-400" />
                        <span>Activity Rotation &amp; Poll Time</span>
                      </label>
                      <span className="text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">
                        {rotateInterval >= 60000 ? `${(rotateInterval / 60000).toFixed(1)}m poll` : `${(rotateInterval / 1000).toFixed(0)}s poll`}
                      </span>
                    </div>
                    
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Auto-Rotate Activities</span>
                          <span className="text-[10px] text-slate-400">Cycle through pool below</span>
                        </div>
                        <Switch
                          checked={rotateActivities}
                          onChange={(checked) => {
                            setRotateActivities(checked);
                            pushPresenceUpdate({ rotate: checked });
                          }}
                        />
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] space-y-2">
                        <Select
                          label="Cycle Poll Interval"
                          options={rotationIntervalOptions}
                          value={String(rotateInterval)}
                          onChange={(val) => {
                            setRotateInterval(Number(val));
                            pushPresenceUpdate({ rotateInterval: Number(val) });
                          }}
                          searchable={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>



              {/* Live Discord User Profile Preview */}
              <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white font-heading">Live Discord Client Preview</h3>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      PREVIEW
                    </span>
                  </div>

                  {/* Discord User Card */}
                  <div className="p-4 rounded-2xl bg-[#1E1F22] border border-white/10 space-y-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full bg-[#5865F2] flex items-center justify-center font-bold text-white text-lg shadow-md ring-2 ring-white/10">
                          {serverNickname ? serverNickname.charAt(0).toUpperCase() : 'F'}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-[#1E1F22] ${
                          presenceStatus === 'online'
                            ? 'bg-emerald-400'
                            : presenceStatus === 'idle'
                            ? 'bg-amber-400'
                            : presenceStatus === 'dnd'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                        }`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate">{serverNickname}</span>
                          <span className="px-1.5 py-0.2 rounded bg-[#5865F2] text-white text-[8px] font-mono font-black tracking-wider">
                            BOT
                          </span>
                        </div>
                        <div className="text-[11px] text-[#949BA4] font-mono truncate mt-0.5">
                          {previewActivity.type === 'PLAYING' && 'Playing '}
                          {previewActivity.type === 'WATCHING' && 'Watching '}
                          {previewActivity.type === 'LISTENING' && 'Listening to '}
                          {previewActivity.type === 'STREAMING' && 'Streaming '}
                          {previewActivity.type === 'COMPETING' && 'Competing in '}
                          {previewActivity.type === 'CUSTOM' && ''}
                          <strong className="text-slate-200">
                            {resolvePreviewTokens(previewActivity.name) || 'None'}
                          </strong>
                        </div>


                      </div>
                    </div>

                    {previewActivity.type === 'STREAMING' && previewActivity.url && (
                      <div className="px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center gap-1.5 text-[10px] text-purple-300 font-mono">
                        <IconBrandDiscord size={12} />
                        <span className="truncate">{previewActivity.url}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.04] text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>{activitiesList.length} total activities in pool</span>
                  {rotateActivities && activitiesList.length > 1 && (
                    <span className="text-violet-400 font-bold">
                      Cycling #{activePreviewIdx + 1}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Section: Activity Builder Studio & Reorderable Pool */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Activity Creator / Editor (5 Cols) */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-sm font-bold">
                      ✨
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white font-heading">
                        {editingActivityIdx !== null ? 'Edit Presence Activity' : 'Activity Builder'}
                      </h4>
                      <p className="text-[10px] text-slate-400">Craft rich custom activities with dynamic tokens</p>
                    </div>
                  </div>

                  {editingActivityIdx !== null && (
                    <button
                      type="button"
                      onClick={() => { setEditingActivityIdx(null); setEditingActivityData(null); }}
                      className="text-[10px] font-bold text-slate-400 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {/* Form fields */}
                <div className="space-y-3.5">
                  <Select
                    label="Activity Type"
                    options={activityTypeOptions}
                    value={editingActivityIdx !== null ? editingActivityData?.type : newActivity.type}
                    onChange={(val: any) => {
                      if (editingActivityIdx !== null && editingActivityData) {
                        setEditingActivityData({ ...editingActivityData, type: val });
                      } else {
                        setNewActivity({ ...newActivity, type: val });
                      }
                    }}
                    searchable={false}
                  />

                  {/* Activity Name Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300 uppercase block">
                        Activity Status Text
                      </label>
                      <span className="text-[10px] text-violet-400 font-mono">
                        Tokens: {'{guildCount}'}, {'{userCount}'}, {'{botName}'}, {'{ping}'}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. over {guildCount} servers"
                      value={editingActivityIdx !== null ? (editingActivityData?.name || '') : newActivity.name}
                      onChange={(e) => {
                        if (editingActivityIdx !== null && editingActivityData) {
                          setEditingActivityData({ ...editingActivityData, name: e.target.value });
                        } else {
                          setNewActivity({ ...newActivity, name: e.target.value });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 font-mono"
                    />
                  </div>

                  {/* Streaming URL field (only if STREAMING) */}
                  {((editingActivityIdx !== null && editingActivityData?.type === 'STREAMING') ||
                    (editingActivityIdx === null && newActivity.type === 'STREAMING')) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-purple-300 uppercase block">
                        Twitch / YouTube Stream URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://twitch.tv/..."
                        value={editingActivityIdx !== null ? (editingActivityData?.url || '') : (newActivity.url || '')}
                        onChange={(e) => {
                          if (editingActivityIdx !== null && editingActivityData) {
                            setEditingActivityData({ ...editingActivityData, url: e.target.value });
                          } else {
                            setNewActivity({ ...newActivity, url: e.target.value });
                          }
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-purple-500/30 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2">


                    {editingActivityIdx !== null ? (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={saveEditActivity}
                          leftIcon={<IconCheck size={14} />}
                          className="flex-1"
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingActivityIdx(null); setEditingActivityData(null); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={addActivity}
                        leftIcon={<IconPlus size={14} />}
                        className="w-full"
                      >
                        Add to Activity Pool
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reorderable Activity Pool (7 Cols) */}
              <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <h4 className="text-xs font-black text-white font-heading">
                      Activity Rotation Pool ({activitiesList.length})
                    </h4>
                    <p className="text-[10px] text-slate-400">Drag items to change the order they rotate in Discord</p>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-1 rounded-md border border-white/10">
                    {rotateActivities ? '🔁 Rotating' : '⏸️ Static (1st only)'}
                  </span>
                </div>

                {activitiesList.length === 0 ? (
                  <div className="text-center py-12 space-y-3 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                    <div className="text-3xl">🎮</div>
                    <div className="text-xs font-bold text-white">No Activities in Pool</div>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                      Use the Activity Builder on the left to add playing, listening, or watching statuses.
                    </p>
                  </div>
                ) : (
                  <ReorderableList
                    items={activitiesList}
                    onReorder={(newList) => {
                      setActivitiesList(newList);
                      pushPresenceUpdate({ activities: newList });
                    }}
                    keyExtractor={(_, index) => `activity_${index}`}
                    renderItem={(item, helpers) => {
                      const index = helpers.index;
                      const typeBadge = {
                        PLAYING: { label: '🎮 PLAYING', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                        STREAMING: { label: '📡 STREAMING', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                        LISTENING: { label: '🎧 LISTENING', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                        WATCHING: { label: '📺 WATCHING', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                        COMPETING: { label: '🏆 COMPETING', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                        CUSTOM: { label: '💬 CUSTOM', bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
                      }[item.type] || { label: item.type, bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

                      const isSelectedForEdit = editingActivityIdx === index;

                      return (
                        <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          isSelectedForEdit
                            ? 'bg-violet-600/15 border-violet-500 ring-1 ring-violet-500/50'
                            : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/[0.07]'
                        }`}>
                          <ReorderHandle />

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black border ${typeBadge.bg}`}>
                                {typeBadge.label}
                              </span>
                              <span className="text-xs font-bold text-white truncate font-mono">
                                {item.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="text-violet-400 font-mono">Evaluates to:</span>
                              <span className="text-slate-300 font-mono truncate">
                                "{resolvePreviewTokens(item.name)}"
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <ReorderArrows
                              onMoveUp={() => {
                                helpers.moveUp();
                                const next = [...activitiesList];
                                if (index > 0) {
                                  const temp = next[index];
                                  next[index] = next[index - 1];
                                  next[index - 1] = temp;
                                  pushPresenceUpdate({ activities: next });
                                }
                              }}
                              onMoveDown={() => {
                                helpers.moveDown();
                                const next = [...activitiesList];
                                if (index < next.length - 1) {
                                  const temp = next[index];
                                  next[index] = next[index + 1];
                                  next[index + 1] = temp;
                                  pushPresenceUpdate({ activities: next });
                                }
                              }}
                              isFirst={helpers.isFirst}
                              isLast={helpers.isLast}
                            />

                            <button
                              type="button"
                              onClick={() => startEditActivity(index)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              title="Edit activity"
                            >
                              <IconEdit size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => removeActivity(index)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete activity"
                            >
                              <IconTrash size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}


        {/* 2. SERVER & PREFIX TAB */}
        {activeTab === 'server' && (
          <div className="space-y-6">
            
            {/* Top Overview & Save Card */}
            <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <IconServer size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white font-heading">
                      Server Identity &amp; System Parameters
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {currentGuild?.name || 'Guild'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure guild-specific bot identity, command invocation prefix, language locale, and engine synchronization.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  loading={serverSaving}
                  leftIcon={<IconDeviceFloppy size={16} />}
                  onClick={handleSaveServerSettings}
                >
                  Save Server Settings
                </Button>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Server Identity Card */}
              <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                      <IconRobot size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white font-heading">Guild Identity &amp; Localization</h4>
                      <p className="text-[11px] text-slate-400">Bot appearance and regional settings for this server</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    ID: {currentGuild?.id || '—'}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Bot Guild Nickname using premium Input */}
                  <div className="space-y-1.5">
                    <Input
                      label="Bot Guild Nickname"
                      placeholder="e.g. FloofCore Bot"
                      value={serverNickname}
                      onChange={(e) => setServerNickname(e.target.value)}
                      leftIcon={<IconRobot size={15} />}
                    />
                    <p className="text-[10px] text-slate-500 pl-1">
                      Custom moniker displayed for the bot inside <span className="text-slate-300 font-medium">{currentGuild?.name || 'this server'}</span>.
                    </p>
                  </div>

                  {/* Legacy Command Prefix using premium Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Legacy Text Command Prefix</label>
                      <span className="text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                        Preview: <strong className="text-white">{prefix || '!'}help</strong>
                      </span>
                    </div>
                    <Input
                      placeholder="!"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      leftIcon={<IconTerminal2 size={15} />}
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-slate-500 pl-1">
                      Prefix invoked in text channels (e.g. <span className="text-violet-400 font-mono">{prefix || '!'}ping</span>, <span className="text-violet-400 font-mono">{prefix || '!'}rank</span>). Slash commands (<span className="text-violet-400 font-mono">/</span>) remain active.
                    </p>
                  </div>

                  {/* Primary Language Locale using premium Select */}
                  <div className="space-y-1.5">
                    <Select
                      label="Primary Language Locale"
                      value={locale}
                      onChange={(val) => setLocale(val)}
                      searchable={false}
                      options={[
                        { value: 'en', label: 'English (US / UK)', icon: '🇬🇧', sublabel: 'Default English system strings' },
                        { value: 'es', label: 'Spanish (Español)', icon: '🇪🇸', sublabel: 'Traducción y comandos en español' },
                        { value: 'fr', label: 'French (Français)', icon: '🇫🇷', sublabel: 'Localisation en langue française' },
                        { value: 'de', label: 'German (Deutsch)', icon: '🇩🇪', sublabel: 'Deutsche Übersetzungen und Strings' },
                        { value: 'ja', label: 'Japanese (日本語)', icon: '🇯🇵', sublabel: '日本語UIおよびコマンド' },
                        { value: 'pt', label: 'Portuguese (Português)', icon: '🇧🇷', sublabel: 'Tradução em português brasileiro' },
                      ]}
                    />
                    <p className="text-[10px] text-slate-500 pl-1">
                      Translates automated embeds, audit notices, and standard bot replies for members.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Engine Schedules & Community Features */}
              <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <IconRefresh size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white font-heading">Command Warmup &amp; Sync Schedules</h4>
                      <p className="text-[11px] text-slate-400">Engine registration routines and member portal toggles</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    GATEWAY
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <IconRefresh size={16} />
                      </div>
                      <div className="flex-1">
                        <Switch
                          label="Auto-Sync Commands on Boot"
                          description="Synchronize application slash commands with Discord REST API on engine launch"
                          checked={true}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <IconShield size={16} />
                      </div>
                      <div className="flex-1">
                        <Switch
                          label="Developer Bypass Cooldowns"
                          description="Allow bot server administrators to execute commands without cooldown limits"
                          checked={true}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/20 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                        <IconFileText size={16} />
                      </div>
                      <div className="flex-1">
                        <Switch
                          label="Enable Community Applications Portal"
                          description="Show the Applications &amp; Forms tab on the public Community Member Hub"
                          checked={hubApplicationsEnabled}
                          onChange={(checked) => setHubApplicationsEnabled(checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── 3. GUILD DASHBOARD ADMINS & ACCESS CONTROL TAB ───────── */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            
            {/* Top Overview & Save Card */}
            <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                  <IconShieldLock size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white font-heading">
                      Dashboard Administrators &amp; Access Control
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {currentGuild?.name || 'Guild'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authorize specific guild members or Discord roles to manage modules, tickets, and configurations for this server.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  loading={savingAdmins}
                  leftIcon={<IconDeviceFloppy size={16} />}
                  onClick={handleSaveAdmins}
                >
                  Save Admin Permissions
                </Button>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Member Select Menu & Role Access (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Card 1: Add Guild Member as Admin */}
                <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
                    <IconUserPlus size={18} className="text-violet-400" />
                    <div>
                      <h4 className="text-xs font-black text-white font-heading uppercase tracking-wider">
                        Add Member as Admin
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Pick a member from {currentGuild?.name || 'this server'} to grant dashboard perms
                      </p>
                    </div>
                  </div>

                  {/* Search Bar for Member Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center justify-between">
                      <span>Select Guild Member</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {guildMembers.length} members loaded
                      </span>
                    </label>

                    <div className="relative">
                      <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search member by name or username..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                      />
                      {memberSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMemberSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                        >
                          <IconX size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Member List Options */}
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1 rounded-2xl bg-black/30 border border-white/[0.06] p-2">
                    {guildMembers
                      .filter((m) => {
                        if (!memberSearchQuery.trim()) return true;
                        const q = memberSearchQuery.toLowerCase();
                        return (
                          m.username.toLowerCase().includes(q) ||
                          (m.displayName && m.displayName.toLowerCase().includes(q)) ||
                          m.id.includes(q)
                        );
                      })
                      .slice(0, 30)
                      .map((m) => {
                        const isSelected = selectedMemberId === m.id;
                        const isAlreadyAdmin = adminUsers.some((u) => u.id === m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={isAlreadyAdmin}
                            onClick={() => setSelectedMemberId(m.id)}
                            className={`w-full p-2 rounded-xl flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                              isAlreadyAdmin
                                ? 'opacity-40 cursor-not-allowed bg-white/[0.01]'
                                : isSelected
                                ? 'bg-violet-600/30 border border-violet-500/50 text-white shadow-md'
                                : 'hover:bg-white/[0.04] text-slate-300 border border-transparent'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <UserAvatar
                                id={m.id}
                                avatar={m.avatar || undefined}
                                username={m.username}
                                size="sm"
                              />
                              {isAlreadyAdmin && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">
                                  {m.displayName || m.username}
                                </span>
                                {m.roles?.[0] && (
                                  <span
                                    className="text-[9px] px-1.5 py-0.2 rounded font-mono truncate max-w-[90px]"
                                    style={{
                                      backgroundColor: `${m.roles[0].color || '#a855f7'}20`,
                                      color: m.roles[0].color || '#a855f7',
                                      border: `1px solid ${m.roles[0].color || '#a855f7'}40`,
                                    }}
                                  >
                                    {m.roles[0].name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 truncate">
                                @{m.username}
                              </div>
                            </div>

                            {isAlreadyAdmin ? (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                Admin
                              </span>
                            ) : isSelected ? (
                              <span className="text-violet-400 shrink-0">
                                <IconCheck size={16} />
                              </span>
                            ) : null}
                          </button>
                        );
                      })}

                    {guildMembers.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-500 font-mono">
                        {loadingAdmins ? 'Loading server members...' : 'No members found'}
                      </div>
                    )}
                  </div>

                  {/* Add Action Button */}
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    disabled={!selectedMemberId || adminUsers.some((u) => u.id === selectedMemberId)}
                    leftIcon={<IconUserPlus size={16} />}
                    onClick={() => handleAddAdmin()}
                  >
                    Grant Dashboard Access
                  </Button>
                </div>

                {/* Card 2: Role-Based Admin Access */}
                <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <IconUsers size={18} className="text-pink-400" />
                      <div>
                        <h4 className="text-xs font-black text-white font-heading uppercase tracking-wider">
                          Role-Based Access
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Members with any selected role inherit dashboard permissions
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">
                      {adminRoleIds.length} Selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                    {guildRoles.map((role) => {
                      const isRoleAdmin = adminRoleIds.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleToggleAdminRole(role.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                            isRoleAdmin
                              ? 'bg-pink-500/20 border-pink-500/40 text-pink-200 shadow-md shadow-pink-500/10'
                              : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: role.color || '#99aab5' }}
                          />
                          <span className="truncate max-w-[130px]">{role.name}</span>
                          {isRoleAdmin && <IconCheck size={14} className="text-pink-400 shrink-0" />}
                        </button>
                      );
                    })}

                    {guildRoles.length === 0 && (
                      <div className="py-4 text-center text-xs text-slate-500 font-mono w-full">
                        {loadingAdmins ? 'Loading server roles...' : 'No roles found'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Active Dashboard Administrators List (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4 min-h-[480px] flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <IconUserCheck size={18} className="text-emerald-400" />
                      <h4 className="text-xs font-black text-white font-heading uppercase tracking-wider">
                        Authorized Dashboard Admins ({adminUsers.length})
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Changes take effect on save
                    </span>
                  </div>

                  {/* List of Configured Admins */}
                  {loadingAdmins ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                      <span className="text-xs font-mono text-slate-400">Loading configured administrators...</span>
                    </div>
                  ) : adminUsers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6 space-y-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-2xl">
                        🛡️
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">No Custom Administrators Configured</h5>
                        <p className="text-xs text-slate-400 max-w-sm mt-1">
                          Server owners and members with Discord's raw <strong>Manage Server</strong> permission automatically have dashboard access. Use the left panel to grant explicit dashboard access to other team members.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                      {adminUsers.map((admin) => (
                        <div
                          key={admin.id}
                          className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] flex items-center justify-between gap-3 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              id={admin.id}
                              avatar={admin.avatar || undefined}
                              username={admin.username}
                              size="md"
                              className="ring-2 ring-violet-500/30 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white truncate font-heading">
                                  {admin.displayName || admin.username}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase">
                                  {admin.roleName || 'Admin'}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>@{admin.username}</span>
                                <span>•</span>
                                <span className="text-slate-500">ID: {admin.id}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(admin.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                              title={`Revoke dashboard access for ${admin.displayName || admin.username}`}
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Footer */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{adminUsers.length} Users + {adminRoleIds.length} Roles Authorized</span>
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={savingAdmins}
                      onClick={handleSaveAdmins}
                      leftIcon={<IconDeviceFloppy size={14} />}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SECURITY & AUTOMOD TAB */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xl">
                  🔨
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-heading">Auto-Moderation Heuristics</h3>
                  <p className="text-xs text-slate-400">Automated spam and invite link defenses</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Switch
                  label="Enable Anti-Spam Engine"
                  description="Block high-frequency message flooding"
                  checked={autoModEnabled}
                  onChange={setAutoModEnabled}
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-400 uppercase">Max User Mentions</label>
                    <input
                      type="number"
                      value={maxMentions}
                      onChange={(e) => setMaxMentions(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-rose-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-400 uppercase">Max Duplicate Msgs</label>
                    <input
                      type="number"
                      value={maxDuplicates}
                      onChange={(e) => setMaxDuplicates(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-rose-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase">Whitelisted Domains</label>
                  <input
                    type="text"
                    value={whitelistedDomains}
                    onChange={(e) => setWhitelistedDomains(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                  🍯
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-heading">Honeypot Scraper Traps</h3>
                  <p className="text-xs text-slate-400">Silent tripwires that instant-ban user bots</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Switch
                  label="Arm Honeypot Tripwire"
                  description="Immediately ban any non-human account messaging hidden channels"
                  checked={honeypotEnabled}
                  onChange={setHoneypotEnabled}
                />

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase">Blacklisted Words / Regex</label>
                  <textarea
                    rows={3}
                    value={blacklistedWords}
                    onChange={(e) => setBlacklistedWords(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. THEME & MEDIA FX TAB (VISUAL LAYOUT & SIDEBAR BUILDER) */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <BuilderPage />
          </div>
        )}

        {/* 5. BACKUP VAULT TAB */}
        {activeTab === 'backup' && (
          <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
                🗄️
              </div>
              <div>
                <h3 className="text-sm font-black text-white font-heading">Automated Server Backup Vault</h3>
                <p className="text-xs text-slate-400">Scheduled server layout snapshots</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Switch
                label="Automated Snapshots"
                description="Automatically preserve channels, permissions, roles, and categories"
                checked={autoBackupEnabled}
                onChange={setAutoBackupEnabled}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase">Snapshot Cadence</label>
                  <select
                    value={backupFrequency}
                    onChange={(e) => setBackupFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="Daily">Daily Snapshot</option>
                    <option value="Weekly">Weekly Snapshot</option>
                    <option value="Monthly">Monthly Snapshot</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase">Keep Last N Snapshots</label>
                  <input
                    type="number"
                    value={keepBackupsCount}
                    onChange={(e) => setKeepBackupsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. LOGGING TAB */}
        {activeTab === 'logging' && (
          <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl">
                📋
              </div>
              <div>
                <h3 className="text-sm font-black text-white font-heading">Discord Webhook Relays</h3>
                <p className="text-xs text-slate-400">Stream audit log events to dedicated channels</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400 uppercase">Primary Audit Log Webhook URL</label>
                <input
                  type="text"
                  value={auditWebhook}
                  onChange={(e) => setAuditWebhook(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Switch
                  label="Member Joins & Leaves"
                  checked={logMemberJoins}
                  onChange={setLogMemberJoins}
                />
                <Switch
                  label="Message Edits & Purges"
                  checked={logMessageEdits}
                  onChange={setLogMessageEdits}
                />
                <Switch
                  label="Role Permission Updates"
                  checked={logRoleChanges}
                  onChange={setLogRoleChanges}
                />
                <Switch
                  label="Voice Channel Switches"
                  checked={logVoiceActivity}
                  onChange={setLogVoiceActivity}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
