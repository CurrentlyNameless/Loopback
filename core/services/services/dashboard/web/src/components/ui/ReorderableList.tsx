import React, { useState } from 'react';
import { IconGripVertical, IconArrowUp, IconArrowDown, IconLock } from '@tabler/icons-react';

export interface ReorderableItemHelpers {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  canDrag: boolean;
  moveUp: () => void;
  moveDown: () => void;
  dragHandleProps: {
    title: string;
    className: string;
  };
}

export interface ReorderableListProps<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  renderItem: (item: T, helpers: ReorderableItemHelpers) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  className?: string;
  itemClassName?: string | ((item: T, index: number, state: { isDragging: boolean; isDragOver: boolean }) => string);
  emptyState?: React.ReactNode;
  accentColor?: 'violet' | 'indigo' | 'emerald' | 'blue' | 'purple' | 'amber' | 'rose';
  disabled?: boolean;
  isItemDraggable?: (item: T, index: number) => boolean;
  canDropOn?: (draggedItem: T, targetItem: T, draggedIdx: number, targetIdx: number) => boolean;
  showDropEndZone?: boolean;
  dropEndLabel?: string;
  dropInsertLabel?: (targetIdx: number) => string;
}

export function ReorderableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor = (_, idx) => idx,
  className = 'space-y-3',
  itemClassName = '',
  emptyState = null,
  accentColor = 'violet',
  disabled = false,
  isItemDraggable,
  canDropOn,
  showDropEndZone = true,
  dropEndLabel,
  dropInsertLabel = (targetIdx) => `Move to Position #${targetIdx + 1}`,
}: ReorderableListProps<T>) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (!items || items.length === 0) {
    return <>{emptyState}</>;
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;
    const item = items[index];
    if (isItemDraggable && !isItemDraggable(item, index)) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const targetItem = items[target];
    if (canDropOn && !canDropOn(item, targetItem, index, target)) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    onReorder(next);
  };

  const handleDrop = (targetIndex: number) => {
    if (disabled || draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const draggedItem = items[draggedIdx];
    if (isItemDraggable && !isItemDraggable(draggedItem, draggedIdx)) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    if (targetIndex < items.length) {
      const targetItem = items[targetIndex];
      if (canDropOn && !canDropOn(draggedItem, targetItem, draggedIdx, targetIndex)) {
        setDraggedIdx(null);
        setDragOverIdx(null);
        return;
      }
    }
    const next = [...items];
    const [removed] = next.splice(draggedIdx, 1);
    next.splice(targetIndex, 0, removed);
    onReorder(next);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const accentStyles = {
    violet: {
      border: 'border-t-4 border-t-violet-400 shadow-[0_-4px_20px_rgba(139,92,246,0.4)]',
      badge: 'bg-violet-600 text-white border border-violet-400/50 shadow-lg shadow-violet-600/50',
      dropZone: 'border-violet-400 bg-violet-500/20 text-violet-300 shadow-violet-500/20',
      line: 'bg-violet-500',
    },
    indigo: {
      border: 'border-t-4 border-t-indigo-400 shadow-[0_-4px_20px_rgba(99,102,241,0.4)]',
      badge: 'bg-indigo-600 text-white border border-indigo-400/50 shadow-lg shadow-indigo-600/50',
      dropZone: 'border-indigo-400 bg-indigo-500/20 text-indigo-300 shadow-indigo-500/20',
      line: 'bg-indigo-500',
    },
    emerald: {
      border: 'border-t-4 border-t-emerald-400 shadow-[0_-4px_20px_rgba(16,185,129,0.4)]',
      badge: 'bg-emerald-600 text-white border border-emerald-400/50 shadow-lg shadow-emerald-600/50',
      dropZone: 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-emerald-500/20',
      line: 'bg-emerald-500',
    },
    blue: {
      border: 'border-t-4 border-t-blue-400 shadow-[0_-4px_20px_rgba(59,130,246,0.4)]',
      badge: 'bg-blue-600 text-white border border-blue-400/50 shadow-lg shadow-blue-600/50',
      dropZone: 'border-blue-400 bg-blue-500/20 text-blue-300 shadow-blue-500/20',
      line: 'bg-blue-500',
    },
    purple: {
      border: 'border-t-4 border-t-purple-400 shadow-[0_-4px_20px_rgba(168,85,247,0.4)]',
      badge: 'bg-purple-600 text-white border border-purple-400/50 shadow-lg shadow-purple-600/50',
      dropZone: 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-purple-500/20',
      line: 'bg-purple-500',
    },
    amber: {
      border: 'border-t-4 border-t-amber-400 shadow-[0_-4px_20px_rgba(245,158,11,0.4)]',
      badge: 'bg-amber-600 text-white border border-amber-400/50 shadow-lg shadow-amber-600/50',
      dropZone: 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-amber-500/20',
      line: 'bg-amber-500',
    },
    rose: {
      border: 'border-t-4 border-t-rose-400 shadow-[0_-4px_20px_rgba(244,63,94,0.4)]',
      badge: 'bg-rose-600 text-white border border-rose-400/50 shadow-lg shadow-rose-600/50',
      dropZone: 'border-rose-400 bg-rose-500/20 text-rose-300 shadow-rose-500/20',
      line: 'bg-rose-500',
    },
  }[accentColor];

  return (
    <div className={className}>
      {items.map((item, idx) => {
        const isDragging = draggedIdx === idx;
        const isDragOver = dragOverIdx === idx && draggedIdx !== idx;
        const key = keyExtractor(item, idx);
        const canDrag = !disabled && (isItemDraggable ? isItemDraggable(item, idx) : true);

        const customItemClass =
          typeof itemClassName === 'function'
            ? itemClassName(item, idx, { isDragging, isDragOver })
            : itemClassName;

        const helpers: ReorderableItemHelpers = {
          index: idx,
          isFirst: idx === 0,
          isLast: idx === items.length - 1,
          isDragging,
          isDragOver,
          canDrag,
          moveUp: () => handleMove(idx, 'up'),
          moveDown: () => handleMove(idx, 'down'),
          dragHandleProps: {
            title: canDrag ? 'Click & Drag to Reorder' : 'Locked',
            className: canDrag ? 'cursor-grab active:cursor-grabbing p-1 rounded-lg transition-colors' : 'cursor-not-allowed p-1 rounded-lg text-slate-600',
          },
        };

        return (
          <div
            key={key}
            draggable={canDrag}
            onDragStart={(e) => {
              if (!canDrag) {
                e.preventDefault();
                return;
              }
              setDraggedIdx(idx);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(idx));
            }}
            onDragOver={(e) => {
              if (disabled) return;
              if (draggedIdx !== null && items[draggedIdx] && canDropOn && !canDropOn(items[draggedIdx], item, draggedIdx, idx)) {
                return;
              }
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverIdx !== idx) setDragOverIdx(idx);
            }}
            onDragLeave={(e) => {
              // Only reset if leaving the card entirely (not child elements)
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                if (dragOverIdx === idx) setDragOverIdx(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(idx);
            }}
            onDragEnd={() => {
              setDraggedIdx(null);
              setDragOverIdx(null);
            }}
            className={`relative transition-all duration-150 ${
              isDragging
                ? 'opacity-35 border-dashed border-violet-500/70 scale-[0.98]'
                : isDragOver
                ? `${accentStyles.border} bg-[#21232a] translate-y-1`
                : ''
            } ${customItemClass}`}
          >
            {/* Non-intrusive floating indicator badge */}
            {isDragOver && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center justify-center">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${accentStyles.badge}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {dropInsertLabel(idx)}
                </span>
              </div>
            )}

            {renderItem(item, helpers)}
          </div>
        );
      })}

      {/* Optional End Drop Target */}
      {showDropEndZone && draggedIdx !== null && (
        <div
          onDragOver={(e) => {
            if (disabled) return;
            if (draggedIdx !== null && items[draggedIdx] && canDropOn && !canDropOn(items[draggedIdx], items[items.length - 1], draggedIdx, items.length - 1)) {
              return;
            }
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverIdx(items.length);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              if (dragOverIdx === items.length) setDragOverIdx(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(items.length);
          }}
          className={`p-3 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center text-xs font-mono font-bold cursor-pointer ${
            dragOverIdx === items.length
              ? accentStyles.dropZone
              : 'border-white/10 text-slate-500 hover:border-violet-500/40 hover:text-violet-400 bg-white/[0.01]'
          }`}
        >
          {dropEndLabel || `Move to End (Position #${items.length})`}
        </div>
      )}
    </div>
  );
}

/**
 * ReorderHandle: A pre-styled grip icon to drop into cards.
 */
export const ReorderHandle: React.FC<{
  className?: string;
  size?: number;
  disabled?: boolean;
}> = ({ className = '', size = 16, disabled = false }) => {
  if (disabled) {
    return (
      <div
        title="Locked: Positioned above bot or managed"
        className={`p-1 rounded-lg bg-white/[0.02] text-slate-600 shrink-0 cursor-not-allowed ${className}`}
      >
        <IconLock size={size} />
      </div>
    );
  }
  return (
    <div
      title="Click & Drag to Reorder"
      className={`p-1 rounded-lg bg-white/[0.03] hover:bg-violet-600/20 text-slate-400 hover:text-violet-300 cursor-grab active:cursor-grabbing shrink-0 transition-colors ${className}`}
    >
      <IconGripVertical size={size} />
    </div>
  );
};

/**
 * ReorderArrows: Pre-styled Up & Down buttons for manual stepping.
 */
export const ReorderArrows: React.FC<{
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  size?: number;
  className?: string;
}> = ({ onMoveUp, onMoveDown, isFirst, isLast, disabled = false, size = 14, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 shrink-0 ${className}`}>
      <button
        type="button"
        onClick={onMoveUp}
        disabled={isFirst || disabled}
        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all"
        title="Move Up"
      >
        <IconArrowUp size={size} />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={isLast || disabled}
        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all"
        title="Move Down"
      >
        <IconArrowDown size={size} />
      </button>
    </div>
  );
};