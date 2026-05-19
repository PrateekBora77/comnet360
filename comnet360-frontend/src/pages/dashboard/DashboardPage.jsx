import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Server, AlertTriangle, Activity, CheckCircle2,
  TrendingUp, Clock, Zap, Users, Radio,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { servicesApi } from '../../api/services';
import { incidentsApi } from '../../api/incidents';
import { slaApi } from '../../api/usage';
import { usersApi } from '../../api/auth';
import { StatCard } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  IncidentStatusBadge, ServiceStatusBadge,
  SeverityBadge,
} from '../../components/ui/StatusBadge';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

// useRealtime (see hooks/useRealtime.js) drives cache invalidation for all
// dashboard queries. We keep a staleTime so data loaded by one query isn't
// immediately thrown away when a second query mounts, but we don't need an
// independent refetchInterval here — that would double-poll every endpoint.
const STALE_MS = 30_000;   // data stays "fresh" for 30 s after last fetch
const REFETCH_MS  = 15_000;  // kept for the UI label only
const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

// ── Dark tooltip for recharts ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-white/10">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Severity dot colour ───────────────────────────────────────────────────────
const sevDot = {
  CRITICAL: '#f43f5e',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#0ea5e9',
};

// ── Live Activity Feed widget ─────────────────────────────────────────────────
function LiveActivityFeed({ incidents, breaches, services }) {
  // Build service id → name lookup
  const serviceMap = useMemo(() => {
    const m = {};
    (services ?? []).forEach(s => { m[s.serviceId] = s.name; });
    return m;
  }, [services]);

  // Combine incidents + breach events, newest first
  const events = useMemo(() => {
    const incItems = (incidents ?? []).map(i => ({
      id:       `inc-${i.incidentId}`,
      kind:     'incident',
      severity: i.severity,
      title:    i.title,
      status:   i.status,
      ts:       i.createdAt,
      link:     `/incidents/${i.incidentId}`,
    }));
    const breachItems = (breaches ?? []).map(b => {
      const svcName = b.serviceName
        ?? serviceMap[b.serviceId]
        ?? (b.serviceId ? `Service #${b.serviceId}` : 'Unknown Service');
      const metric  = b.metricType ?? b.metric ?? 'metric';
      return {
        id:       `breach-${b.id ?? b.breachId ?? Math.random()}`,
        kind:     'breach',
        severity: 'MEDIUM',
        title:    `SLA breach — ${metric} · ${svcName}`,
        status:   b.resolved ? 'RESOLVED' : 'ACTIVE',
        ts:       b.detectedAt ?? b.createdAt,
        link:     '/usage',
      };
    });
    return [...incItems, ...breachItems]
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 8);
  }, [incidents, breaches, serviceMap]);

  return (
    <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-500" />
          Live Activity
        </h3>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Auto-updating
        </span>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slateald-400 font-medium text-slate-400">
          No recent activity
        </div>
      ) : (
        <div className="divide-y divide-slate-50 dark:divide-slate-700">
          {events.map((ev) => (
            <Link
              key={ev.id}
              to={ev.link}
              className="flex items-center gap-3 px-5 py-3 hover:bg-sky-50/30 dark:hover:bg-slate-700/30 transition-colors group"
            >
              {/* Severity dot */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: sevDot[ev.severity] ?? '#94a3b8' }}
              />

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                  {ev.title}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 capitalize">
                  {ev.kind} · {relativeTime(ev.ts)}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <SeverityBadge severity={ev.severity} />
                {ev.kind === 'incident'
                  ? <IncidentStatusBadge status={ev.status} />
                  : (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                      ev.status === 'RESOLVED'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-rose-700 bg-rose-50 border-rose-200'
                    }`}>
                      {ev.status}
                    </span>
                  )
                }
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium text-center">
          Refreshing every {REFETCH_MS / 1000}s — data is live
        </p>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();

  const { data: services, isLoading: svcLoading } = useQuery({
    queryKey: ['services'],
    queryFn:  () => servicesApi.getAll().then(r => r.data),
    staleTime: STALE_MS,
  });

  const { data: incidents, isLoading: incLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn:  () => incidentsApi.getAll().then(r => r.data),
    staleTime: STALE_MS,
  });

  const { data: breaches } = useQuery({
    queryKey: ['sla-breaches-unresolved'],
    queryFn:  () => slaApi.getUnresolved().then(r => r.data),
    staleTime: STALE_MS,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn:  () => usersApi.getAll().then(r => r.data),
    enabled:  user?.role === 'ADMIN',
    staleTime: STALE_MS,
  });

  const userNameMap = useMemo(() => {
    const map = {};
    users?.forEach(u => { map[u.userId] = u.name; });
    return map;
  }, [users]);

  const getOwnerName = (id) => {
    if (userNameMap[id]) return userNameMap[id];
    if (user?.userId === id) return user.name;
    return `User #${id}`;
  };

  if (svcLoading || incLoading) return <PageSpinner />;

  // ── Derived stats ───────────────────────────────────────────────────────────
  const activeServices     = services?.filter(s => s.status === 'ACTIVE')?.length ?? 0;
  const openIncidents      = incidents?.filter(i => i.status === 'OPEN')?.length ?? 0;
  const inProgressIncidents = incidents?.filter(i => i.status === 'IN_PROGRESS')?.length ?? 0;
  const criticalIncidents  = incidents?.filter(i => i.severity === 'CRITICAL' && i.status === 'OPEN')?.length ?? 0;
  const unresolvedBreaches = breaches?.length ?? 0;

  const serviceTypeData = ['VOICE','VIDEO','MESSAGING']
    .map(type => ({ name: type, count: services?.filter(s => s.type === type)?.length ?? 0 }))
    .filter(d => d.count > 0);

  const severityData = ['CRITICAL','HIGH','MEDIUM','LOW'].map(sev => ({
    name: sev,
    count: incidents?.filter(i => i.severity === sev)?.length ?? 0,
  }));

  const recentIncidents = [...(incidents ?? [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Here's what's happening across your communications platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Open + in-progress incidents pill */}
          {(openIncidents + inProgressIncidents) > 0 && (
            <Link
              to="/incidents"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-3 py-1.5 hover:bg-rose-100 transition-colors"
            >
              <AlertTriangle className="w-3 h-3" />
              {openIncidents + inProgressIncidents} active
            </Link>
          )}
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · {REFETCH_MS / 1000}s
          </div>
        </div>
      </div>

      {/* ── Stat cards (values animate on change) ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Services"
          value={activeServices}
          icon={<Server className="w-5 h-5" />}
          color="blue"
          change={`${services?.length ?? 0} total services`}
        />
        <StatCard
          label="Open Incidents"
          value={openIncidents}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={openIncidents > 0 ? 'red' : 'green'}
          change={`${criticalIncidents} critical`}
        />
        <StatCard
          label="SLA Breaches"
          value={unresolvedBreaches}
          icon={<Activity className="w-5 h-5" />}
          color={unresolvedBreaches > 0 ? 'yellow' : 'green'}
          change="Unresolved"
        />
        {users
          ? <StatCard label="Total Users"  value={users.length}                                              icon={<Users className="w-5 h-5" />}        color="purple" change="Platform users" />
          : <StatCard label="Resolved"     value={incidents?.filter(i => i.status !== 'OPEN').length ?? 0}   icon={<CheckCircle2 className="w-5 h-5" />}  color="green"  change="Incidents" />
        }
      </div>

      {/* ── Live Activity Feed ───────────────────────────────────────────────── */}
      <LiveActivityFeed incidents={incidents} breaches={breaches} services={services} />

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Incidents by severity */}
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Incidents by Severity
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium">All-time distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {severityData.map((_, i) => (
                  <Cell key={i} fill={['#F43F5E','#F97316','#F59E0B','#0EA5E9'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service type pie */}
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-500" /> Service Distribution
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium">By type</p>
          {serviceTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-slate-400 font-medium">
              No services created yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" aspect={1.6}>
              <PieChart>
                <Pie data={serviceTypeData} dataKey="count" nameKey="name"
                  cx="50%" cy="44%" innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {serviceTypeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(v, e) => `${v} (${e.payload?.count ?? 0})`} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Incidents table ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Recent Incidents
          </h3>
          <Link to="/incidents" className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors">
            View all →
          </Link>
        </div>
        {recentIncidents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400 font-medium">No incidents found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Title','Service','Severity','Status','When'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {recentIncidents.map(inc => (
                  <tr key={inc.incidentId} className="hover:bg-sky-50/30 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link to={`/incidents/${inc.incidentId}`} className="font-semibold text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                        {inc.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-medium">#{inc.serviceId}</td>
                    <td className="px-5 py-3.5"><SeverityBadge severity={inc.severity} /></td>
                    <td className="px-5 py-3.5"><IncidentStatusBadge status={inc.status} /></td>
                    <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs font-medium">{relativeTime(inc.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Services Overview ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Services Overview
          </h3>
          <Link to="/services" className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors">
            Manage →
          </Link>
        </div>
        {(services ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400 font-medium">No services found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Name','Type','Status','Owner'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {(services ?? []).slice(0, 5).map(svc => (
                  <tr key={svc.serviceId} className="hover:bg-sky-50/30 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/services/${svc.serviceId}`} className="font-semibold text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                        {svc.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-medium">{svc.type}</td>
                    <td className="px-5 py-3.5"><ServiceStatusBadge status={svc.status} /></td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-medium">{getOwnerName(svc.ownerUserId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
