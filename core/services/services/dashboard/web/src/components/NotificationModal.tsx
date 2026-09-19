import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBell,
  IconCheck,
  IconTrash,
  IconArrowUpRight,
  IconBolt,
  IconTicket,
  IconScale,
  IconFileText,
  IconDatabase,
  IconShield,
  IconSparkles,
  IconChecks
} from '@tabler/icons-react';
import { useNotificationStore, type DashboardNotification } from '../stores/notifications.ts';
import { useToast } from './Toast.tsx';
import { Modal } from './ui/Modal.tsx';
import { Button } from './ui/Button.tsx';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotificationStore();
  const [filter, setFilter] = useState<string>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return n.unread;
    return n.type === filter;
  });

  const handleAction = (n: DashboardNotification) => {
    markAsRead(n.id);
    onClose();
    if (n.link) {
      navigate(n.link);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'update':
        return <IconBolt size={22} className="text-amber-400" />;
      case 'ticket':
        return <IconTicket size={22} className="text-cyan-400" />;
      case 'appeal':
        return <IconScale size={22} className="text-rose-400" />;
      case 'application':
        return <IconFileText size={22} className="text-emerald-400" />;
      case 'backup':
        return <IconDatabase size={22} className="text-indigo-400" />;
      case 'automod':
        return <IconShield size={22} className="text-red-400" />;
      default:
        return <IconSparkles size={22} className="text-violet-400" />;
    }
  };

  const getBadgeColorForType = (type: string) => {
    switch (type) {
      case 'update':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
      case 'ticket':
        return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300';
      case 'appeal':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
      case 'application':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
      case 'backup':
        return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
      case 'automod':
        return 'bg-red-500/15 border-red-500/30 text-red-300';
      default:
        return 'bg-violet-500/15 border-violet-500/30 text-violet-300';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Notification & Alert Center"
      subtitle={`Live event hub • ${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`}
      icon={<IconBell size={22} />}
      size="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs font-mono text-slate-400">
            {notifications.length} total active notification{notifications.length === 1 ? '' : 's'}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconTrash size={14} />}
                onClick={() => {
                  clearAll();
                  showToast({ title: 'Alerts Cleared', message: 'All notifications cleared.', type: 'info' });
                }}
              >
                Clear All
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 -m-1">
        {/* Filter Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
          {[
            { id: 'all', label: `All Alerts (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'update', label: '🚀 Updates' },
            { id: 'ticket', label: '🎫 Tickets' },
            { id: 'appeal', label: '⚖️ Appeals' },
            { id: 'application', label: '📝 Applications' },
            { id: 'backup', label: '🗄️ Vault Backups' },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-heading whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-950/40'
                    : 'text-slate-400 hover:text-slate-200 bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notifications Grid / Feed */}
        <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-500 shadow-inner">
                <IconChecks size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-200 font-heading">You are all caught up!</h3>
                <p className="text-xs text-slate-500 font-mono">No notifications found under the current filter.</p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isUnread = n.unread;
              return (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isUnread
                      ? 'bg-violet-950/25 border-violet-500/40 hover:bg-violet-900/30 shadow-md shadow-violet-950/20'
                      : 'bg-white/[0.025] border-white/[0.08] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="p-3 rounded-2xl bg-black/50 border border-white/10 shrink-0 mt-0.5 shadow-md">
                      {getIconForType(n.type)}
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                          {n.title}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${getBadgeColorForType(n.type)}`}>
                          {n.type}
                        </span>
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black bg-rose-500 text-white shadow-sm animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                        {n.desc}
                      </p>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 pt-0.5">
                        <span>🕒 {n.time}</span>
                        {n.priority && (
                          <span className="uppercase text-[9px] font-bold text-slate-400 bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/5">
                            {n.priority} PRIORITY
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    {isUnread && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<IconCheck size={14} />}
                        onClick={() => {
                          markAsRead(n.id);
                          showToast({ title: 'Marked as Read', message: 'Notification marked as read.', type: 'info' });
                        }}
                        className="text-xs font-bold"
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<IconArrowUpRight size={14} />}
                      onClick={() => handleAction(n)}
                      className="bg-violet-600 hover:bg-violet-500 font-bold shadow-lg shadow-violet-600/30"
                    >
                      Open Action
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NotificationModal;
