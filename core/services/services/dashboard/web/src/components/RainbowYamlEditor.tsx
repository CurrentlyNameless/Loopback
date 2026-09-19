import React, { useRef, useEffect, useCallback } from 'react';
import { IconFileCode, IconCopy, IconCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { useToast } from './Toast.tsx';

interface RainbowYamlEditorProps {
  value: string;
  onChange: (val: string) => void;
  onSave?: () => void;
  fileName?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export const RainbowYamlEditor: React.FC<RainbowYamlEditorProps> = ({
  value,
  onChange,
  onSave,
  fileName = 'module.yml',
  readOnly = false,
  minHeight = '520px',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const { show: showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleScroll = useCallback(() => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = value.slice(0, start) + '  ' + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave) onSave();
      }
    },
    [value, onChange, onSave]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    showToast({
      title: 'Copied to Clipboard',
      message: `${fileName} configuration copied.`,
      type: 'info',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightValue(val: string): string {
    if (!val) return '';
    const trimmed = val.trim();
    const escaped = escapeHtml(val);

    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return `<span style="color:#86efac">${escaped}</span>`; // Green strings
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return `<span style="color:#fbbf24; font-weight:700;">${escaped}</span>`; // Amber numbers
    }
    const low = trimmed.toLowerCase();
    if (low === 'true' || low === 'false' || low === 'yes' || low === 'no') {
      return `<span style="color:#c084fc; font-weight:700;">${escaped}</span>`; // Purple booleans
    }
    if (low === 'null' || low === '~' || low === 'undefined') {
      return `<span style="color:rgba(148,163,184,0.45); font-style:italic;">${escaped}</span>`; // Dimmed null
    }
    if (/^https?:\/\//.test(trimmed)) {
      return `<span style="color:#60a5fa; text-decoration:underline;">${escaped}</span>`; // Blue link
    }
    if (/^[A-Z0-9_-]+$/.test(trimmed) && trimmed.length >= 2) {
      return `<span style="color:#f472b6; font-weight:600;">${escaped}</span>`; // Pink constants/enums
    }

    return `<span style="color:#e2e8f0;">${escaped}</span>`;
  }

  function highlightYamlLine(line: string): string {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    const indentStr = line.slice(0, indent);

    if (trimmed.startsWith('#')) {
      return `<span style="color:rgba(148,163,184,0.55); font-style:italic;">${escapeHtml(line)}</span>`;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx);
      const afterColon = trimmed.slice(colonIdx + 1);

      if (key.trim().length > 0 && !key.includes(' ')) {
        const valHtml = highlightValue(afterColon);
        return `${indentStr}<span style="color:#7dd3fc; font-weight:700;">${escapeHtml(key)}</span><span style="color:rgba(148,163,184,0.45); font-weight:700;">:</span>${valHtml}`;
      }
    }

    if (trimmed.startsWith('- ')) {
      const rest = trimmed.slice(2);
      return `${indentStr}<span style="color:#f97316; font-weight:800;">- </span>${highlightValue(rest)}`;
    }

    return escapeHtml(line);
  }

  function highlightYaml(src: string): string {
    return src
      .split('\n')
      .map((line) => {
        let commentIdx = -1;
        for (let i = 0; i < line.length - 1; i++) {
          if (line[i] === '#' || (line[i] === '/' && line[i + 1] === '/')) {
            if (i > 0 && line[i - 1] === ':') continue;
            commentIdx = i;
            break;
          }
        }

        if (commentIdx >= 0 && !line.trimStart().startsWith('#')) {
          const before = line.slice(0, commentIdx);
          const comment = line.slice(commentIdx);
          return `${highlightYamlLine(before)}<span style="color:rgba(148,163,184,0.55); font-style:italic;">${escapeHtml(comment)}</span>`;
        }

        return highlightYamlLine(line);
      })
      .join('\n');
  }

  const lines = value.split('\n');
  const lineCount = Math.max(1, lines.length);

  return (
    <div className="flex flex-col rounded-2xl bg-[#090D16] border border-white/10 shadow-2xl overflow-hidden select-none font-mono">
      
      {/* ── Editor Toolbar Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 border-b border-white/[0.08] text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/15 border border-violet-500/20 text-violet-300 text-[11px] font-bold">
            <IconFileCode size={14} />
            <span>{fileName}</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            Rainbow YAML Syntax Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 mr-1">
            {lineCount} lines • {value.length} chars
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer text-[11px]"
          >
            {copied ? <IconCheck size={13} className="text-emerald-400" /> : <IconCopy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onSave && !readOnly && (
            <button
              type="button"
              onClick={onSave}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-sans font-bold shadow-md shadow-violet-600/30 border border-violet-500 transition-all cursor-pointer text-[11px]"
            >
              <IconDeviceFloppy size={13} />
              <span>Save (Ctrl+S)</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Editor Code Canvas with Synced Rainbow Highlight Backdrop ─ */}
      <div className="relative flex w-full overflow-hidden" style={{ minHeight, height: minHeight }}>
        
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-12 py-3 bg-black/40 border-r border-white/[0.06] text-right pr-3 font-mono text-[12px] leading-[20px] text-slate-600 select-none overflow-hidden shrink-0"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Viewport with Layered Textarea */}
        <div className="relative flex-1 h-full overflow-hidden bg-transparent">
          
          {/* Syntax Highlight Layer */}
          <div
            ref={highlightRef}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightYaml(value) + '<br/>' }}
            className="absolute inset-0 p-3 font-mono text-[12px] leading-[20px] whitespace-pre overflow-hidden pointer-events-none text-slate-200 select-none"
            style={{ tabSize: 2 }}
          />

          {/* Interactive Transparent Textarea Layer */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 p-3 font-mono text-[12px] leading-[20px] whitespace-pre overflow-auto resize-none bg-transparent text-transparent caret-white focus:outline-none border-none selection:bg-violet-500/30 selection:text-white"
            style={{ tabSize: 2 }}
          />
        </div>
      </div>
    </div>
  );
};

export default RainbowYamlEditor;
