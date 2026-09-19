/**
 * Live Dynamic Theme Engine
 * Injects and updates global CSS variables and element override rules in document.head
 * in real-time when sliders in the Visual Layout Studio are adjusted.
 */

export interface ThemeConfig {
  presetName?: string;
  sidebarWidth?: number;
  sidebarOpacity?: number;
  sidebarBlur?: number;
  sidebarGradient?: string;
  cardOpacity?: number;
  cardBlur?: number;
  cardBorderRadius?: number;
  borderGlowIntensity?: number;
  accentColorHex?: string;
  accentGradient?: string;
  bgImageEnabled?: boolean;
  bgImageUrl?: string;
  bgOpacity?: number;
  bgBlur?: number;
  soundFxEnabled?: boolean;
  soundVolume?: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 139, g: 92, b: 246 }; // Default violet
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export const applyThemeToDOM = (config?: ThemeConfig) => {
  if (typeof document === 'undefined') return;

  let cfg: ThemeConfig = config || {};
  if (!config) {
    const saved = localStorage.getItem('dashboard_builder_theme');
    if (saved) {
      try {
        cfg = JSON.parse(saved);
      } catch {}
    }
  }

  const sidebarWidth = cfg.sidebarWidth ?? 288;
  const sidebarOpacity = (cfg.sidebarOpacity ?? 85) / 100;
  const sidebarBlur = cfg.sidebarBlur ?? 16;
  const cardOpacity = (cfg.cardOpacity ?? 80) / 100;
  const cardBlur = cfg.cardBlur ?? 16;
  const cardRadius = cfg.cardBorderRadius ?? 24;
  
  const glowRaw = (cfg.borderGlowIntensity ?? 40) / 100;
  const borderGlowAlpha = Math.max(0.08, (glowRaw * 0.55)).toFixed(3);
  const glowRadius = Math.round(glowRaw * 28);
  const glowShadowAlpha = (glowRaw * 0.45).toFixed(3);

  const accentColor = cfg.accentColorHex || '#8B5CF6';
  const { r, g, b } = hexToRgb(accentColor);
  const rgbStr = `${r}, ${g}, ${b}`;

  let styleEl = document.getElementById('floofcore-dynamic-theme-style') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'floofcore-dynamic-theme-style';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    :root {
      --fc-sidebar-width: ${sidebarWidth}px;
      --fc-sidebar-bg: rgba(9, 12, 21, ${sidebarOpacity});
      --fc-sidebar-blur: ${sidebarBlur}px;
      --fc-card-bg: rgba(14, 19, 32, ${cardOpacity});
      --fc-card-blur: ${cardBlur}px;
      --fc-card-radius: ${cardRadius}px;
      --fc-card-border: rgba(${rgbStr}, ${borderGlowAlpha});
      --fc-accent: ${accentColor};
      --fc-accent-rgb: ${rgbStr};
    }

    /* Ambient Background Glow */
    body::before {
      background: radial-gradient(circle, rgba(${rgbStr}, ${(glowRaw * 0.35).toFixed(2)}) 0%, rgba(${rgbStr}, 0.05) 50%, transparent 70%) !important;
    }

    /* Header Ambient Blur Orbs */
    div[class*="bg-pink-600/15"],
    div[class*="bg-violet-600/15"] {
      background-color: rgba(${rgbStr}, 0.22) !important;
    }

    /* Live Card Glassmorphism, Radius & Glow Overrides across all pages */
    [class*="bg-[#0E1320]"],
    [class*="bg-[#0e1320]"],
    .saas-card {
      background-color: rgba(14, 19, 32, ${cardOpacity}) !important;
      backdrop-filter: blur(${cardBlur}px) !important;
      -webkit-backdrop-filter: blur(${cardBlur}px) !important;
      border-color: rgba(${rgbStr}, ${borderGlowAlpha}) !important;
      border-radius: ${cardRadius}px !important;
      box-shadow: 0 0 ${glowRadius}px rgba(${rgbStr}, ${glowShadowAlpha}), 0 16px 36px -10px rgba(0, 0, 0, 0.6) !important;
    }

    .saas-subcard {
      background-color: rgba(10, 14, 24, ${Math.min(0.85, cardOpacity * 0.85)}) !important;
      backdrop-filter: blur(${Math.max(4, cardBlur * 0.75)}px) !important;
      -webkit-backdrop-filter: blur(${Math.max(4, cardBlur * 0.75)}px) !important;
      border-color: rgba(${rgbStr}, ${Math.max(0.06, Number(borderGlowAlpha) * 0.4)}) !important;
      border-radius: ${Math.max(10, cardRadius - 6)}px !important;
    }

    /* Card rounded corners override */
    [class*="rounded-3xl"],
    [class*="rounded-[28px]"],
    [class*="rounded-2xl"] {
      border-radius: ${cardRadius}px !important;
    }

    /* Primary Accent Color Overrides for Buttons, Badges, Highlights */
    .bg-violet-600,
    button.bg-violet-600,
    .bg-pink-600,
    button.bg-pink-600 {
      background-color: ${accentColor} !important;
      box-shadow: 0 4px 20px -2px rgba(${rgbStr}, 0.45) !important;
    }

    .hover\\:bg-violet-600:hover,
    button.hover\\:bg-violet-600:hover,
    .hover\\:bg-pink-600:hover,
    button.hover\\:bg-pink-600:hover {
      background-color: ${accentColor} !important;
    }

    .text-violet-400,
    .text-violet-300 {
      color: ${accentColor} !important;
    }

    .hover\\:text-white:hover,
    button.hover\\:text-white:hover {
      color: #ffffff !important;
    }

    .border-violet-500,
    .border-violet-500\\/30,
    .border-violet-500\\/20,
    .border-violet-500\\/50 {
      border-color: rgba(${rgbStr}, 0.4) !important;
    }

    .bg-violet-500\\/10,
    .bg-violet-500\\/15,
    .bg-violet-500\\/20,
    .bg-violet-600\\/10,
    .bg-violet-600\\/15,
    .bg-violet-600\\/20,
    .bg-violet-600\\/25,
    .bg-violet-600\\/30 {
      background-color: rgba(${rgbStr}, 0.15) !important;
    }

    .hover\\:bg-violet-600\\/20:hover,
    button.hover\\:bg-violet-600\\/20:hover {
      background-color: rgba(${rgbStr}, 0.22) !important;
    }

    .saas-glow-violet {
      box-shadow: 0 0 ${Math.max(16, glowRadius * 1.6)}px -2px rgba(${rgbStr}, 0.6) !important;
    }

    /* Range input sliders thumb & track */
    input[type="range"] {
      accent-color: ${accentColor} !important;
    }
  `;
};

const THEME_ACCENTS: Record<string, string> = {
  cupcake: '#ec4899',
  ocean: '#0ea5e9',
  emerald: '#10b981',
  midnight: '#6366f1',
  orchid: '#a78bfa',
  sunset: '#f97316',
};

export const applyThemeVars = (presetName: string) => {
  const accent = THEME_ACCENTS[presetName] || '#8B5CF6';
  applyThemeToDOM({ accentColorHex: accent, presetName });
};

export const initThemeEngine = () => {
  if (typeof window === 'undefined') return;

  applyThemeToDOM();
  window.addEventListener('storage', () => applyThemeToDOM());
  window.addEventListener('dashboard-backdrop-updated', () => applyThemeToDOM());
};
