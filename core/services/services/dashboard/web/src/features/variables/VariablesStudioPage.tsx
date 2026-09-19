import React from 'react';
import { IconSparkles, IconServer, IconCode } from '@tabler/icons-react';
import { VariablesPage } from '../../components/ui/Variables.tsx';
import { useGuildStore } from '../../stores/guild.ts';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';

export const VariablesStudioPage: React.FC = () => {
  const { currentGuild, guilds, setCurrentGuild } = useGuildStore();
  const pageRef = usePageEntrance();

  return (
    <div ref={pageRef} className="space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0E1320]/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1.5">
              <IconSparkles size={12} className="text-violet-400" />
              <span>Studio &amp; Engine</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Interactive Builder
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white font-heading tracking-tight flex items-center gap-2.5">
            <IconCode size={28} className="text-violet-400" />
            <span>Variable Builder Studio</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Visual Discord timestamp generator, dynamic randomizers, custom server variables, and real-time Discord evaluation playground.
          </p>
        </div>

        {/* Guild Selector Dropdown */}
        {guilds && guilds.length > 0 && (
          <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.03] border border-white/10 self-start md:self-center">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold font-mono pl-1">
              <IconServer size={14} className="text-violet-400" />
              <span>Active Guild:</span>
            </span>
            <select
              value={currentGuild?.id || ''}
              onChange={(e) => {
                const g = guilds.find((x) => x.id === e.target.value);
                if (g) setCurrentGuild(g);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#090C15] border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
            >
              {guilds.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Main Studio Playground ─────────────────────────────────── */}
      <div className="p-4 md:p-6 rounded-3xl bg-[#0E1320]/60 border border-white/10 backdrop-blur-xl shadow-xl">
        <VariablesPage accentColor="violet" />
      </div>
    </div>
  );
};

export default VariablesStudioPage;
