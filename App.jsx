import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const typeColors = {
  prize_received: 'text-neon-gold',
  deposit_approved: 'text-green-400',
  deposit_rejected: 'text-red-400',
  withdrawal_approved: 'text-green-400',
  withdrawal_rejected: 'text-red-400',
  prediction_won: 'text-neon-cyan',
  rank_up: 'text-neon-purple',
  badge_unlocked: 'text-neon-gold',
  dispute_created: 'text-orange-400',
  tournament_started: 'text-neon-cyan',
  match_started: 'text-primary',
};

const typeIcons = {
  challenge_joined: '⚔️', match_started: '🎮', result_submitted: '📊',
  dispute_created: '⚠️', tournament_started: '🏆', tournament_ended: '🏅',
  prediction_won: '🎯', deposit_approved: '✅', deposit_rejected: '❌',
  withdrawal_approved: '💸', withdrawal_rejected: '🚫', prize_received: '🤑',
  rank_up: '🚀', badge_unlocked: '🎖️',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  // Real-time subscribe
  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_id === user.id) {
        setNotifications(prev => [event.data, ...prev]);
        // Show sonner toast too
        const notif = event.data;
        const icon = typeIcons[notif.type] || '🔔';
        toast(notif.title, {
          description: notif.message,
          icon,
          duration: 5000,
        });
      } else if (event.type === 'update') {
        setNotifications(prev =>
          prev.map(n => n.id === event.id ? { ...n, ...event.data } : n)
        );
      }
    });
    return () => unsubscribe();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const data = await base44.entities.Notification.filter(
      { user_id: user.id }, '-created_date', 20
    ).catch(() => []);
    setNotifications(data);
    setLoading(false);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { read: true });
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-xs font-bold flex items-center justify-center text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-display font-bold text-sm">الإشعارات</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:underline"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    لا توجد إشعارات
                  </div>
                ) : (
                  notifications.map(n => {
                    const icon = typeIcons[n.type] || '🔔';
                    const color = typeColors[n.type] || 'text-foreground';
                    return (
                      <div
                        key={n.id}
                        onClick={async () => {
                          if (!n.read) {
                            await base44.entities.Notification.update(n.id, { read: true });
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                          }
                          setOpen(false);
                        }}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border/50 ${!n.read ? 'bg-primary/5' : ''}`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${color}`}>{n.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ''}
                          </div>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs text-primary hover:underline"
                >
                  عرض جميع الإشعارات
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}