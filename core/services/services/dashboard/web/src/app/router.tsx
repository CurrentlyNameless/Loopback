import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout.tsx';
import { OverviewPage } from '../features/overview/OverviewPage.tsx';
import { ModulesPage } from '../features/modules/ModulesPage.tsx';
import { ModuleDetailPage } from '../features/modules/ModuleDetailPage.tsx';
import { CommandsPage } from '../features/commands/CommandsPage.tsx';
import { SettingsPage } from '../features/settings/SettingsPage.tsx';
import { LoginPage } from '../features/auth/LoginPage.tsx';
import { CommunityHubPage } from '../features/hub/CommunityHubPage.tsx';
import { TicketPortalPage } from '../features/hub/TicketPortalPage.tsx';
import { AppealPortalPage } from '../features/hub/AppealPortalPage.tsx';
import { BotUpdatePage } from '../features/updates/BotUpdatePage.tsx';
import { VariablesStudioPage } from '../features/variables/VariablesStudioPage.tsx';
import { MarketplacePage } from '../features/marketplace/MarketplacePage.tsx';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';

const PageLoader = (
  <div className="flex items-center justify-center min-h-screen bg-[#0A0D18]">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const hubLoaders = import.meta.glob<any>([
  '../../../../../../modules/applications/dashboard/ApplicationFormPortal.tsx',
  '../../../../../../modules/product-panel/dashboard/PublicStorePage.tsx',
  '../../../../../../modules/introductions/dashboard/IntroductionPortal.tsx',
  '../../../../../../modules/introduction-builder/dashboard/IntroductionPortal.tsx',
]);

const findLoader = (filename: string) => {
  const entry = Object.entries(hubLoaders).find(([key]) => key.endsWith(filename));
  return entry ? entry[1] : null;
};

const ApplicationFormPortal = React.lazy(async () => {
  const loader = findLoader('ApplicationFormPortal.tsx');
  if (loader) {
    try {
      const m = await loader();
      const comp = m.ApplicationFormPortal || m.default;
      if (comp) return { default: comp };
    } catch (e) {
      console.warn('Startup hub loader failed for ApplicationFormPortal, trying dynamic import:', e);
    }
  }

  // Dynamic on-demand fallback for post-startup installed module:
  try {
    const m = await import(/* @vite-ignore */ `/api/modules-ui/applications/ApplicationFormPortal.js?t=${Date.now()}`);
    const comp = m?.ApplicationFormPortal || m?.default || (m ? m[Object.keys(m)[0]] : null);
    if (comp) return { default: comp };
  } catch (dynamicErr) {
    console.warn('Dynamic import fallback failed for ApplicationFormPortal:', dynamicErr);
  }

  return {
    default: () => (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0D18] text-white p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl mb-4">
          ⚠️
        </div>
        <h1 className="text-xl font-bold mb-2">Application Portal Unavailable</h1>
        <p className="text-sm text-slate-400 max-w-md">
          The applications module is not installed or available on this server.
        </p>
      </div>
    ),
  };
});

const PublicStorePage = React.lazy(async () => {
  const loader = findLoader('PublicStorePage.tsx');
  if (loader) {
    try {
      const m = await loader();
      const comp = m.PublicStorePage || m.default;
      if (comp) return { default: comp };
    } catch (e) {
      console.warn('Startup hub loader failed for PublicStorePage, trying dynamic import:', e);
    }
  }

  // Dynamic on-demand fallback for post-startup installed module:
  try {
    const m = await import(/* @vite-ignore */ `/api/modules-ui/product-panel/PublicStorePage.js?t=${Date.now()}`);
    const comp = m?.PublicStorePage || m?.default || (m ? m[Object.keys(m)[0]] : null);
    if (comp) return { default: comp };
  } catch (dynamicErr) {
    console.warn('Dynamic import fallback failed for PublicStorePage:', dynamicErr);
  }

  return {
    default: () => (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0D18] text-white p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl mb-4">
          🛒
        </div>
        <h1 className="text-xl font-bold mb-2">Store Unavailable</h1>
        <p className="text-sm text-slate-400 max-w-md">
          The product store module is not installed or available on this server.
        </p>
      </div>
    ),
  };
});

const IntroductionPortal = React.lazy(async () => {
  const loader = findLoader('IntroductionPortal.tsx');
  if (loader) {
    try {
      const m = await loader();
      const comp = m.IntroductionPortal || m.default;
      if (comp) return { default: comp };
    } catch (e) {
      console.warn('Startup hub loader failed for IntroductionPortal, trying dynamic import:', e);
    }
  }

  try {
    const m =
      (await import(/* @vite-ignore */ `/api/modules-ui/introductions/IntroductionPortal.js?t=${Date.now()}`).catch(() => null)) ||
      (await import(/* @vite-ignore */ `/api/modules-ui/introduction-builder/IntroductionPortal.js?t=${Date.now()}`).catch(() => null));
    const comp = m?.IntroductionPortal || m?.default || (m ? m[Object.keys(m)[0]] : null);
    if (comp) return { default: comp };
  } catch (dynamicErr) {
    console.warn('Dynamic import fallback failed for IntroductionPortal:', dynamicErr);
  }

  return {
    default: () => (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0D18] text-white p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 text-2xl mb-4">
          👋
        </div>
        <h1 className="text-xl font-bold mb-2">Introduction Portal Unavailable</h1>
        <p className="text-sm text-slate-400 max-w-md">
          The introduction builder module is not installed or available on this server.
        </p>
      </div>
    ),
  };
});

const isApplySubdomain = typeof window !== 'undefined' && Boolean(
  window.location.hostname.startsWith('apply.') ||
  window.location.hostname.startsWith('applications.') ||
  window.location.hostname.includes('apply-')
);

const applySubdomainRoutes = [
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/status',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal defaultLookupOpen={true} /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/status/:trackingId',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal defaultLookupOpen={true} /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/form/:type',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/apply',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/apply/:guildId',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/apply/:guildId/:type',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/:type',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

const standardRoutes = [
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/hub',
    element: <CommunityHubPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/hub/tickets',
    element: <TicketPortalPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/hub/appeals',
    element: <AppealPortalPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/hub/applications',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/hub/apply',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/apply',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/apply/:guildId',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/apply/:guildId/:type',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/applications/portal',
    element: <React.Suspense fallback={PageLoader}><ApplicationFormPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/intro',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/intro/:guildId',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/introductions',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/introductions/:guildId',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/introductions/portal',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/introductionbuilder',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/introductionbuilder/:guildId',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/introduction-builder',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/introduction-builder/:guildId',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/intro-builder',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/intro-builder/:guildId',
    element: <React.Suspense fallback={PageLoader}><IntroductionPortal /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/ticket',
    element: <TicketPortalPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/appeal',
    element: <AppealPortalPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/store/:guildId',
    element: <React.Suspense fallback={PageLoader}><PublicStorePage /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/hub/store',
    element: <React.Suspense fallback={PageLoader}><PublicStorePage /></React.Suspense>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/hub/games',
    element: <Navigate to="/modules/game-host-check" replace />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/',
    element: <DashboardLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'modules', element: <ModulesPage /> },
      { path: 'modules/:moduleId', element: <ModuleDetailPage /> },
      { path: 'servers/:guildId/modules/:moduleId', element: <ModuleDetailPage /> },
      { path: 'commands', element: <CommandsPage /> },
      { path: 'variables', element: <VariablesStudioPage /> },
      { path: 'variable-builder', element: <VariablesStudioPage /> },
      { path: 'marketplace', element: <MarketplacePage /> },

      // Module route aliases — all redirect cleanly to their module's dashboard page
      { path: 'games', element: <Navigate to="/modules/game-host-check" replace /> },
      { path: 'gamehost', element: <Navigate to="/modules/game-host-check" replace /> },
      { path: 'products', element: <Navigate to="/modules/product-panel" replace /> },
      { path: 'store-builder', element: <Navigate to="/modules/product-panel" replace /> },
      { path: 'builder/products', element: <Navigate to="/modules/product-panel" replace /> },
      { path: 'builder', element: <Navigate to="/settings?tab=appearance" replace /> },
      { path: 'channels', element: <SettingsPage /> },
      { path: 'webhooks', element: <Navigate to="/modules/webhook-center" replace /> },
      { path: 'backups', element: <Navigate to="/modules/backup" replace /> },
      { path: 'tickets', element: <Navigate to="/modules/tickets" replace /> },
      { path: 'appeals', element: <Navigate to="/modules/auto-mod" replace /> },
      { path: 'applications', element: <Navigate to="/modules/applications" replace /> },
      { path: 'forms', element: <Navigate to="/modules/applications" replace /> },
      { path: 'introductions', element: <Navigate to="/modules/introductions" replace /> },
      { path: 'intro', element: <Navigate to="/modules/introductions" replace /> },
      { path: 'intro-builder', element: <Navigate to="/modules/introductions" replace /> },
      { path: 'introduction-builder', element: <Navigate to="/modules/introductions" replace /> },
      { path: 'introductionbuilder', element: <Navigate to="/modules/introductions" replace /> },
      { path: 'streamers', element: <Navigate to="/modules/streamer-notifications" replace /> },
      { path: 'updates', element: <BotUpdatePage /> },
      { path: 'update', element: <BotUpdatePage /> },
      { path: 'giveaway', element: <Navigate to="/modules/giveaway-manager" replace /> },
      { path: 'giveaways', element: <Navigate to="/modules/giveaway-manager" replace /> },
      { path: 'giveaway-manager', element: <Navigate to="/modules/giveaway-manager" replace /> },
      { path: 'birthdays', element: <Navigate to="/modules/birthdays" replace /> },
      { path: 'birthday', element: <Navigate to="/modules/birthdays" replace /> },
      { path: 'advent', element: <Navigate to="/modules/advent-calendar" replace /> },
      { path: 'advent-calendar', element: <Navigate to="/modules/advent-calendar" replace /> },
      { path: 'embed-builder', element: <Navigate to="/modules/embed-builder" replace /> },
      { path: 'embed', element: <Navigate to="/modules/embed-builder" replace /> },
      { path: 'embeds', element: <Navigate to="/modules/embed-builder" replace /> },
      { path: 'announcements', element: <Navigate to="/modules/embed-builder" replace /> },
      { path: 'announcement-builder', element: <Navigate to="/modules/embed-builder" replace /> },
      { path: 'mindscape', element: <Navigate to="/modules/mindscape-rpg" replace /> },
      { path: 'mindscape-rpg', element: <Navigate to="/modules/mindscape-rpg" replace /> },
      { path: 'selfcare', element: <Navigate to="/modules/mindscape-rpg" replace /> },
      { path: 'timed-channels', element: <Navigate to="/modules/timed-channels" replace /> },
      { path: 'timed-chat', element: <Navigate to="/modules/timed-channels" replace /> },
      { path: 'rules', element: <Navigate to="/modules/rules" replace /> },
      { path: 'server-rules', element: <Navigate to="/modules/rules" replace /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(isApplySubdomain ? applySubdomainRoutes : standardRoutes);
