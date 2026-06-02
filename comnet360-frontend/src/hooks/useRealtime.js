/**
 * useRealtime — central real-time polling hook
 *
 * Polls critical endpoints and:
 *  🔔 Toasts when NEW unread notifications arrive
 *  🚨 Toasts when a new CRITICAL or HIGH open incident appears
 *  📊 Toasts when a new SLA breach is detected
 *  🔄 Invalidates stale query caches automatically
 *  Returns { isLive, lastUpdated } for UI indicators (countdown, progress bar)
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../api/notifications';
import { incidentsApi } from '../api/incidents';
import { slaApi } from '../api/usage';
import toast from 'react-hot-toast';

// ── Polling intervals ─────────────────────────────────────────────────────────
// NOTIFICATION_INTERVAL is exported so TopBar can sync its countdown timer
export const NOTIFICATION_INTERVAL = 10_000;   // 10 s — fastest; drives the UI countdown
const INCIDENT_INTERVAL            = 15_000;   // 15 s
const SLA_INTERVAL                 = 20_000;   // 20 s
const SERVICE_INTERVAL             = 30_000;   // 30 s

export function useRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive]           = useState(true);

  // Track previous values — only toast on genuinely NEW data
  const prevNotifCount  = useRef(null);
  const prevAlertIds    = useRef(null);   // CRITICAL + HIGH open incidents
  const prevBreachCount = useRef(null);   // unresolved SLA breaches

  useEffect(() => {
    if (!user) return;

    // ── Notification poller ─────────────────────────────────────────────────
    const pollNotifications = async () => {
      try {
        const { data } = await notificationsApi.getUnreadCount(user.userId);
        const count = data?.unreadCount ?? 0;

        if (prevNotifCount.current !== null && count > prevNotifCount.current) {
          const diff = count - prevNotifCount.current;
          toast(
            `You have ${diff} new notification${diff > 1 ? 's' : ''}`,
            {
              icon: '🔔',
              duration: 4500,
              style: {
                fontSize: '13px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid rgba(14,165,233,0.3)',
              },
            }
          );
          qc.invalidateQueries({ queryKey: ['notifications'] });
        }

        prevNotifCount.current = count;
        qc.invalidateQueries({ queryKey: ['notifications-count'] });
        setLastUpdated(new Date());
        setIsLive(true);
      } catch {
        setIsLive(false);
      }
    };

    // ── Incident poller ─────────────────────────────────────────────────────
    const pollIncidents = async () => {
      try {
        const { data } = await incidentsApi.getAll();
        const all = data ?? [];

        // Alert on new CRITICAL or HIGH open incidents
        const alertable    = all.filter(
          (i) => (i.severity === 'CRITICAL' || i.severity === 'HIGH') && i.status === 'OPEN'
        );
        const alertableIds = new Set(alertable.map((i) => i.incidentId));

        if (prevAlertIds.current !== null) {
          const brandNew = alertable.filter(
            (i) => !prevAlertIds.current.has(i.incidentId)
          );
          brandNew.forEach((inc) => {
            const isCrit = inc.severity === 'CRITICAL';
            toast(
              `${isCrit ? '🚨' : '⚠️'} ${inc.severity}: ${inc.title}`,
              {
                duration: 7000,
                style: {
                  fontSize: '13px',
                  borderRadius: '12px',
                  background: isCrit ? '#450a0a' : '#431407',
                  color: '#fef2f2',
                  border: `1px solid ${isCrit ? '#dc2626' : '#ea580c'}`,
                  fontWeight: 600,
                },
              }
            );
          });
          if (brandNew.length > 0) {
            qc.invalidateQueries({ queryKey: ['incidents'] });
          }
        }

        prevAlertIds.current = alertableIds;
        // Always keep incident list fresh
        qc.invalidateQueries({ queryKey: ['incidents'] });
      } catch {
        // silently ignore — isLive handled by notification poller
      }
    };

    // ── SLA breach poller ───────────────────────────────────────────────────
    const pollSlaBreaches = async () => {
      try {
        const { data } = await slaApi.getUnresolved();
        const count = (data ?? []).length;

        if (prevBreachCount.current !== null && count > prevBreachCount.current) {
          const diff = count - prevBreachCount.current;
          toast(
            `${diff} new SLA breach${diff > 1 ? 'es' : ''} detected`,
            {
              icon: '📊',
              duration: 5500,
              style: {
                fontSize: '13px',
                borderRadius: '12px',
                background: '#451a03',
                color: '#fef3c7',
                border: '1px solid #d97706',
                fontWeight: 600,
              },
            }
          );
          qc.invalidateQueries({ queryKey: ['sla-breaches-unresolved'] });
          qc.invalidateQueries({ queryKey: ['sla-breaches'] });
        }

        prevBreachCount.current = count;
        qc.invalidateQueries({ queryKey: ['sla-breaches-unresolved'] });
      } catch {
        // silently ignore
      }
    };

    // ── Services / SLA definitions cache invalidator ────────────────────────
    const pollServices = () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      qc.invalidateQueries({ queryKey: ['sla-definitions'] });
      qc.invalidateQueries({ queryKey: ['usage'] });
    };

    // Stagger the initial polls so they don't all slam the backend at once.
    // TanStack Query's own useQuery hooks handle the very first data load;
    // useRealtime kicks in a few seconds later for background sync.
    const initNotif   = setTimeout(pollNotifications, 5_000);
    const initInc     = setTimeout(pollIncidents,     9_000);
    const initSla     = setTimeout(pollSlaBreaches,   13_000);

    const notifTimer   = setInterval(pollNotifications, NOTIFICATION_INTERVAL);
    const incTimer     = setInterval(pollIncidents,     INCIDENT_INTERVAL);
    const slaTimer     = setInterval(pollSlaBreaches,   SLA_INTERVAL);
    const serviceTimer = setInterval(pollServices,      SERVICE_INTERVAL);

    return () => {
      clearTimeout(initNotif);
      clearTimeout(initInc);
      clearTimeout(initSla);
      clearInterval(notifTimer);
      clearInterval(incTimer);
      clearInterval(slaTimer);
      clearInterval(serviceTimer);
    };
  }, [user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isLive, lastUpdated };
}
