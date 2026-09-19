import React, { useState } from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  IconAlertTriangle, 
  IconRotateClockwise, 
  IconHome, 
  IconCopy, 
  IconCheck, 
  IconBug, 
  IconLogout,
  IconSparkles,
  IconChevronDown,
  IconChevronUp
} from '@tabler/icons-react';
import { Button } from './ui/Button.tsx';
import { Footer } from './Footer.tsx';

export const ErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const [copied, setCopied] = useState(false);
  const [showStack, setShowStack] = useState(false);

  let errorMessage = 'An unexpected runtime exception occurred in this workspace.';
  let errorTitle = 'Unexpected Application Error';
  let stackTrace = '';

  if (isRouteErrorResponse(error)) {
    errorTitle = `${error.status} ${error.statusText || 'Page Error'}`;
    errorMessage = error.data?.message || error.statusText || 'The requested dashboard resource encountered an error.';
  } else if (error instanceof Error) {
    errorTitle = error.name || 'Runtime Error';
    errorMessage = error.message || 'An unhandled exception was caught by the safety boundary.';
    stackTrace = error.stack || '';
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  const handleCopy = () => {
    const fullReport = `=== FLOOFCORE APPLICATION ERROR REPORT ===
Time: ${new Date().toISOString()}
URL: ${window.location.href}
Title: ${errorTitle}
Message: ${errorMessage}

Stack Trace:
${stackTrace || 'No stack trace available.'}`;

    navigator.clipboard.writeText(fullReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleResetSession = () => {
    localStorage.removeItem('fc_instance_id');
    window.location.href = '/login';
  };

  return (
    <main className="min-h-screen w-full bg-[#06080E] text-slate-100 flex flex-col justify-between p-3 sm:p-4 md:p-8 relative overflow-x-hidden select-none font-sans">
      
      {/* ── Background Ray Geometry ───────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-rose-600/[0.07] blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-violet-600/[0.05] blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,8,14,0.92)_100%)]" />
      </div>

      {/* ── Error Shield Monolith ──────────────────────────────────── */}
      <div className="relative z-10 max-w-2xl w-full mx-auto my-auto py-6">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[32px] bg-[#0E1320]/90 border border-white/10 shadow-2xl backdrop-blur-3xl p-6 sm:p-9 space-y-6 relative overflow-hidden"
        >
          {/* Top Radiant Edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/80 to-transparent" />
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-600/20 blur-3xl rounded-full" />

          {/* Header Icon & Title */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shrink-0 shadow-xl shadow-rose-600/30 ring-2 ring-white/15">
              <IconAlertTriangle size={28} className="text-white" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  SAFETY BOUNDARY CAUGHT
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase tracking-wider bg-white/[0.04] text-slate-400 border border-white/10">
                  UI PRESERVED
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
                {errorTitle}
              </h1>
              <p className="text-xs text-slate-300 font-mono leading-relaxed pt-1">
                {errorMessage}
              </p>
            </div>
          </div>

          {/* Diagnostic Details Accordion */}
          <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
            <div className="p-3.5 flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowStack(!showStack)}
                className="flex items-center gap-2 font-mono font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <IconBug size={16} className="text-amber-400" />
                <span>Technical Stack Diagnostics</span>
                {showStack ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-mono font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/5"
              >
                {copied ? <IconCheck size={13} className="text-emerald-400" /> : <IconCopy size={13} />}
                <span>{copied ? 'Report Copied!' : 'Copy Report'}</span>
              </button>
            </div>

            {showStack && (
              <div className="p-4 border-t border-white/5 bg-black/60 max-h-48 overflow-y-auto custom-scrollbar font-mono text-[11px] text-rose-300/90 whitespace-pre-wrap leading-relaxed">
                {stackTrace || 'No stack trace available.'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              leftIcon={<IconRotateClockwise size={16} />}
              onClick={handleReload}
              className="w-full sm:flex-1 font-bold bg-gradient-to-r from-violet-600 to-indigo-600 shadow-xl shadow-violet-600/30 cursor-pointer"
            >
              Reload Application
            </Button>

            <Button
              variant="secondary"
              size="md"
              leftIcon={<IconHome size={16} />}
              onClick={handleGoHome}
              className="w-full sm:w-auto font-bold cursor-pointer"
            >
              Back to Overview
            </Button>

            <Button
              variant="ghost"
              size="md"
              leftIcon={<IconLogout size={16} />}
              onClick={handleResetSession}
              className="w-full sm:w-auto text-slate-400 hover:text-rose-400 cursor-pointer"
            >
              Reset Session
            </Button>
          </div>
        </motion.div>
      </div>

      {/* ── Standalone Footer ──────────────────────────────────────── */}
      <Footer />
    </main>
  );
};

export default ErrorBoundary;
