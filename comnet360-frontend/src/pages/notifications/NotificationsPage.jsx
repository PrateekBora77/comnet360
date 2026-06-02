import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Mail, Smartphone } from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.userId],
    queryFn: () => notificationsApi.getByUser(user.userId).then((r) => r.data),
    enabled: !!user,
    // Auto-refresh every 10 seconds so new notifications appear quickly
    refetchInterval: 10_000,
    staleTime: 0,
  });

  const { data: preferences } = useQuery({
    queryKey: ['notification-prefs', user?.userId],
    queryFn: () => notificationsApi.getPreferences(user.userId).then((r) => r.data),
    enabled: !!user,
  });

  const markReadMut = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', user?.userId] }),
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(user.userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.userId] });
      qc.invalidateQueries({ queryKey: ['notifications-count', user?.userId] });
      toast.success('All marked as read');
    },
  });

  const updatePrefsMut = useMutation({
    mutationFn: (updates) =>
      notificationsApi.updatePreferences(user.userId, { ...preferences, ...updates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs', user?.userId] }),
  });

  if (isLoading) return <PageSpinner />;

  const unread = (notifications ?? []).filter((n) => n.status === 'UNREAD');

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">{unread.length} unread</p>
        </div>
        {unread.length > 0 && (
          <Button variant="secondary" size="sm" icon={<CheckCheck className="w-3.5 h-3.5" />}
            loading={markAllMut.isPending} onClick={() => markAllMut.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
        {!notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bell className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-sky-50">
            {notifications.map((n) => {
              const isUnread = n.status === 'UNREAD';
              return (
                <div
                  key={n.notificationId}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${isUnread ? 'bg-blue-50/50' : 'hover:bg-sky-50'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isUnread ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    {n.channel === 'EMAIL' ? (
                      <Mail className={`w-4 h-4 ${isUnread ? 'text-blue-600' : 'text-slate-400'}`} />
                    ) : (
                      <Smartphone className={`w-4 h-4 ${isUnread ? 'text-blue-600' : 'text-slate-400'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                        {isUnread && <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block" />}
                      </p>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(n.createdDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge color={
                        n.category === 'SYSTEM_ALERT' ? 'red' :
                        n.category === 'INCIDENT'     ? 'orange' :
                        n.category === 'SLA_BREACH'   ? 'cyan' :
                        n.category === 'SERVICE_UPDATE' ? 'blue' : 'slate'
                      }>{n.category.replace(/_/g, ' ')}</Badge>
                      <Badge color={n.channel === 'EMAIL' ? 'purple' : 'blue'}>{n.channel}</Badge>
                    </div>
                  </div>
                  {isUnread && (
                    <button
                      onClick={() => markReadMut.mutate(n.notificationId)}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap cursor-pointer mt-0.5"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preferences */}
      {preferences && (
        <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            {[
              { key: 'emailEnabled',  label: 'Email notifications',    desc: 'Receive alerts via email' },
              { key: 'inAppEnabled',  label: 'In-app notifications',   desc: 'Show alerts in the platform' },
            ].map(({ key, label, desc }) => {
              const val = preferences[key];
              return (
                <label key={key} className="flex items-start justify-between gap-4 cursor-pointer group">
                  <div>
                    <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={val}
                    onClick={() => updatePrefsMut.mutate({ [key]: !val })}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer mt-0.5 ${val ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
