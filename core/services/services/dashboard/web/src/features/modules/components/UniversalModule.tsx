import React from 'react';
import { IconSettings, IconPlus, IconTrash, IconAdjustments } from '@tabler/icons-react';
import { Switch } from '../../../components/ui/Switch.tsx';
import type { ModuleEditorProps } from '../types.ts';

export function formatCapitalModuleName(name: string): string {
  if (!name) return '';
  return name
    .split(/[-_ ]+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'ai') return 'AI';
      if (lower === 'flm') return 'FLM';
      if (lower === 'qr') return 'QR';
      if (lower === 'tts') return 'TTS';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export const UniversalModule: React.FC<ModuleEditorProps> = ({
  config = {},
  update = () => {},
  channels = [],
  roles = [],
  filterSectionId,
}) => {
  const [activeTab, setActiveTab] = React.useState<'settings'>('settings');
  const entriesToRender = filterSectionId
    ? Object.entries(config).filter(([k]) => k === filterSectionId)
    : Object.entries(config).filter(
        ([k]) =>
          k !== 'enabled' &&
          k !== 'name' &&
          k !== 'version' &&
          k !== 'author' &&
          k !== 'description'
      );

  const isChannelKey = (key: string) => /channel/i.test(key);
  const isRoleKey = (key: string) => /role/i.test(key);

  const renderField = (fieldPath: string, keyName: string, val: any): React.ReactNode => {
    const formattedLabel = formatCapitalModuleName(keyName);

    // 1. Channel Picker
    if (isChannelKey(keyName) && (typeof val === 'string' || val === null || val === undefined)) {
      return (
        <div key={fieldPath} className="saas-subcard p-4 space-y-1.5">
          <label className="text-slate-300 block text-xs font-bold flex items-center justify-between">
            <span>{formattedLabel}</span>
            <span className="text-[10px] text-violet-400 font-mono">Discord Channel</span>
          </label>
          <select
            value={val || ''}
            onChange={(e) => update(fieldPath, e.target.value || null)}
            className="saas-input w-full px-3 py-2 text-xs"
          >
            <option value="">— Select Channel (Disabled) —</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.type === 4 ? `📁 ${ch.name}` : ch.type === 2 || ch.type === 13 ? `🔊 ${ch.name}` : `# ${ch.name}`}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // 2. Role Picker
    if (isRoleKey(keyName) && (typeof val === 'string' || val === null || val === undefined)) {
      return (
        <div key={fieldPath} className="saas-subcard p-4 space-y-1.5">
          <label className="text-slate-300 block text-xs font-bold flex items-center justify-between">
            <span>{formattedLabel}</span>
            <span className="text-[10px] text-emerald-400 font-mono">Discord Role</span>
          </label>
          <select
            value={val || ''}
            onChange={(e) => update(fieldPath, e.target.value || null)}
            className="saas-input w-full px-3 py-2 text-xs"
          >
            <option value="">— Select Role (None) —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                @{r.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // 3. Boolean Switch
    if (typeof val === 'boolean') {
      return (
        <div key={fieldPath} className="saas-subcard p-4 flex items-center justify-between">
          <div>
            <span className="text-white font-bold block text-xs">{formattedLabel}</span>
            <span className="text-[10px] text-slate-400 font-mono">{fieldPath}</span>
          </div>
          <Switch checked={val} onChange={(checked) => update(fieldPath, checked)} />
        </div>
      );
    }

    // 4. Number Input
    if (typeof val === 'number') {
      return (
        <div key={fieldPath} className="saas-subcard p-4 space-y-1.5">
          <label className="text-slate-300 block text-xs font-bold">{formattedLabel}</label>
          <input
            type="number"
            value={val}
            onChange={(e) => update(fieldPath, Number(e.target.value))}
            className="saas-input w-full px-3 py-2 font-mono text-xs"
          />
        </div>
      );
    }

    // 5. String / Multiline Text
    if (typeof val === 'string') {
      const isLongText = val.length > 50 || val.includes('\n');
      return (
        <div key={fieldPath} className={`saas-subcard p-4 space-y-1.5 ${isLongText ? 'md:col-span-2' : ''}`}>
          <label className="text-slate-300 block text-xs font-bold">{formattedLabel}</label>
          {isLongText ? (
            <textarea
              rows={3}
              value={val}
              onChange={(e) => update(fieldPath, e.target.value)}
              className="saas-input w-full px-3 py-2 font-mono text-xs"
            />
          ) : (
            <input
              type="text"
              value={val}
              onChange={(e) => update(fieldPath, e.target.value)}
              className="saas-input w-full px-3 py-2 text-xs"
            />
          )}
        </div>
      );
    }

    // 6. Array of Strings / IDs
    if (Array.isArray(val)) {
      const isPrimitiveList = val.every((item) => typeof item === 'string' || typeof item === 'number');
      if (isPrimitiveList) {
        return (
          <div key={fieldPath} className="saas-subcard p-4 space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 block text-xs font-bold">
                {formattedLabel} ({val.length} items)
              </label>
              <button
                type="button"
                onClick={() => update(fieldPath, [...val, ''])}
                className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 font-bold cursor-pointer"
              >
                <IconPlus size={12} />
                <span>Add Item</span>
              </button>
            </div>
            <div className="space-y-1.5">
              {val.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const copy = [...val];
                      copy[idx] = e.target.value;
                      update(fieldPath, copy);
                    }}
                    placeholder="Enter value..."
                    className="saas-input flex-1 px-3 py-1.5 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => update(fieldPath, val.filter((_, i) => i !== idx))}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }

    // 7. Nested Object Block
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return (
        <div key={fieldPath} className="saas-subcard p-5 space-y-4 md:col-span-2 shadow-lg">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
            <IconAdjustments size={15} className="text-violet-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">{formattedLabel}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(val).map(([subKey, subVal]) => renderField(`${fieldPath}.${subKey}`, subKey, subVal))}
          </div>
        </div>
      );
    }

    // 8. Raw JSON / Structure Fallback
    return (
      <div key={fieldPath} className="saas-subcard p-4 space-y-1.5 md:col-span-2">
        <label className="text-slate-300 block text-xs font-bold">{formattedLabel} (JSON / Structure)</label>
        <textarea
          rows={3}
          value={typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '')}
          onChange={(e) => {
            try {
              update(fieldPath, JSON.parse(e.target.value));
            } catch {
              update(fieldPath, e.target.value);
            }
          }}
          className="saas-input w-full px-3 py-2 font-mono text-xs"
        />
      </div>
    );
  };

  return (
    <div className="saas-card p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <IconSettings size={16} className="text-violet-400" />
          <span>{filterSectionId ? formatCapitalModuleName(filterSectionId) : 'Module Configuration'}</span>
        </h3>
        <span className="text-[11px] font-mono text-slate-400">⚡ Live Hot-Reload Ready</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {entriesToRender.map(([key, val]) => renderField(key, key, val))}
      </div>
    </div>
  );
};
