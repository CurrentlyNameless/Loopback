import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconHeart, 
  IconBrandDiscord, 
  IconBrandGithub, 
  IconBrandX, 
  IconExternalLink, 
  IconX, 
  IconSparkles,
  IconCode
} from '@tabler/icons-react';

interface AuthorProfile {
  name: string;
  role: string;
  bio: string;
  avatarColor: string;
  initials: string;
  socials: {
    label: string;
    url: string;
    icon: any;
    color: string;
  }[];
}

const AUTHOR_DATA: Record<string, AuthorProfile> = {
  Currently_Nameless: {
    name: 'Currently_Nameless',
    role: 'Lead Architect & Core Engineer',
    bio: 'Systems engineer crafting high-performance Discord bots, scalable backend platforms, and modular architectures.',
    avatarColor: 'from-violet-600 to-indigo-600',
    initials: 'CN',
    socials: [
      { label: 'Discord', url: 'https://discord.com', icon: IconBrandDiscord, color: 'hover:bg-[#5865F2]/20 hover:text-[#5865F2] hover:border-[#5865F2]/40' },
      { label: 'GitHub', url: 'https://github.com', icon: IconBrandGithub, color: 'hover:bg-white/10 hover:text-white hover:border-white/30' },
      { label: 'X / Twitter', url: 'https://x.com', icon: IconBrandX, color: 'hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/40' },
    ],
  },
  OnedEyePete: {
    name: 'OnedEyePete',
    role: 'Co-Founder & UI/UX Developer',
    bio: 'Product designer & full-stack developer dedicated to building sleek, responsive, and intuitive web interfaces.',
    avatarColor: 'from-pink-600 to-rose-600',
    initials: 'OP',
    socials: [
      { label: 'Discord', url: 'https://discord.com', icon: IconBrandDiscord, color: 'hover:bg-[#5865F2]/20 hover:text-[#5865F2] hover:border-[#5865F2]/40' },
      { label: 'GitHub', url: 'https://github.com', icon: IconBrandGithub, color: 'hover:bg-white/10 hover:text-white hover:border-white/30' },
      { label: 'X / Twitter', url: 'https://x.com', icon: IconBrandX, color: 'hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/40' },
    ],
  },
};

export const Footer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorProfile | null>(null);

  return (
    <>
      <footer className={`relative z-20 py-4 flex justify-center w-full select-none ${className}`}>
        <motion.div
          whileHover={{ y: -2 }}
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] hover:border-violet-500/40 shadow-2xl transition-all duration-300 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 max-w-[95vw]"
        >
          <span className="text-slate-400">Made with</span>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            <IconHeart size={14} className="text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          </motion.div>
          <span className="text-slate-400">by</span>

          {/* Currently_Nameless clickable link */}
          <button
            type="button"
            onClick={() => setSelectedAuthor(AUTHOR_DATA['Currently_Nameless'])}
            className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-pink-400 hover:opacity-80 transition-opacity cursor-pointer underline decoration-violet-500/40 underline-offset-4"
          >
            Currently_Nameless
          </button>

          <span className="text-slate-600">&amp;</span>

          {/* OnedEyePete clickable link */}
          <button
            type="button"
            onClick={() => setSelectedAuthor(AUTHOR_DATA['OnedEyePete'])}
            className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 hover:opacity-80 transition-opacity cursor-pointer underline decoration-pink-500/40 underline-offset-4"
          >
            OnedEyePete
          </button>
        </motion.div>
      </footer>

      {/* Author Socials Modal */}
      <AnimatePresence>
        {selectedAuthor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAuthor(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-md relative z-10 rounded-3xl border border-white/10 bg-[#0D111C]/95 backdrop-blur-2xl shadow-2xl p-6 space-y-5"
            >
              {/* Header with Close */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${selectedAuthor.avatarColor} flex items-center justify-center text-white font-extrabold text-base shadow-lg ring-1 ring-white/20`}>
                    {selectedAuthor.initials}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white font-heading">
                      {selectedAuthor.name}
                    </h3>
                    <p className="text-xs text-violet-400 font-mono font-medium">
                      {selectedAuthor.role}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAuthor(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Bio description */}
              <p className="text-xs text-slate-300 leading-relaxed bg-black/20 p-3.5 rounded-2xl border border-white/[0.04]">
                {selectedAuthor.bio}
              </p>

              {/* Social Links List */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                  CONNECT &amp; SOCIALS
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {selectedAuthor.socials.map((s, idx) => {
                    const IconComp = s.icon;
                    return (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-slate-300 text-xs font-semibold transition-all ${s.color} group`}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComp size={18} />
                          <span>{s.label}</span>
                        </div>
                        <IconExternalLink size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Footer;
