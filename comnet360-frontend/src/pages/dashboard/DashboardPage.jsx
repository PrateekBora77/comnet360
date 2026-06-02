import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers, AlertCircle, TrendingUp, CheckCircle2,
  PieChart as PieIcon, Clock, User, Bell, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { servicesApi } from '../../api/services';
import { incidentsApi } from '../../api/incidents';
import { slaApi } from '../../api/usage';
import { usersApi } from '../../api/auth';
import { StatCard } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  IncidentStatusBadge, ServiceStatusBadge, SeverityBadge,
} from '../../components/ui/StatusBadge';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const STALE_MS = 30_000;
const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white text-slate-800 text-xs px-3 py-2 rounded-xl shadow-xl border border-sky-100">
      <p className="font-bold mb-1 text-slate-700">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

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

const sevDot = {
  CRITICAL: '#f43f5e', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#0ea5e9',
};

function getRoleSubtitle(role) {
  switch (role) {
    case 'ADMIN':              return 'Full platform overview — all services, incidents and users.';
    case 'SERVICE_MANAGER':    return 'Overview of your services, incidents and SLA status.';
    case 'NETWORK_ENGINEER':   return 'Your assigned incidents and actions requiring attention.';
    case 'OPERATIONS_HEAD':    return 'Read-only platform overview — services, incidents and SLA health.';
    case 'COMPLIANCE_OFFICER': return 'SLA compliance overview and incident audit trail.';
    case 'ENTERPRISE_USER':    return 'Status of your services and recent usage activity.';
    default:                   return "Here's what's happening across your platform.";
  }
}

// ── Live Activity Feed ────────────────────────────────────────────────────────
function LiveActivityFeed({ incidents, breaches, services }) {
  const serviceMap = useMemo(() => {
    const m = {};
    (services ?? []).forEach(s => { m[s.serviceId] = s.name; });
    return m;
  }, [services]);

  const events = useMemo(() => {
    const incItems = (incidents ?? []).map(i => ({
      id: `inc-${i.incidentId}`, kind: 'incident', severity: i.severity,
      title: i.title, status: i.status, ts: i.createdAt,
      link: `/incidents/${i.incidentId}`,
    }));
    const breachItems = (breaches ?? []).map(b => {
      const svcName = b.serviceName ?? serviceMap[b.serviceId] ?? `Service #${b.serviceId}`;
      return {
        id: `breach-${b.id ?? b.breachId ?? Math.random()}`, kind: 'breach', severity: 'MEDIUM',
        title: `${svcName} is not meeting its performance target`,
        status: b.resolved ? 'RESOLVED' : 'ACTIVE',
        ts: b.detectedAt ?? b.createdAt, link: '/usage',
      };
    });
    return [...incItems, ...breachItems]
      .sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 8);
  }, [incidents, breaches, serviceMap]);

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-sky-50 bg-slate-50">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-400" /> Recent Alerts
        </h3>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm font-medium text-slate-400">No recent activity</div>
      ) : (
        <div className="divide-y divide-sky-50">
          {events.map(ev => (
            <Link key={ev.id} to={ev.link}
              className="flex items-center gap-3 px-5 py-3 hover:bg-sky-50 transition-colors group">
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: sevDot[ev.severity] ?? '#94a3b8' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{ev.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                  {ev.kind === 'breach' ? 'Service Alert' : ev.kind} · {relativeTime(ev.ts)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <SeverityBadge severity={ev.severity} />
                {ev.kind === 'incident'
                  ? <IncidentStatusBadge status={ev.status} />
                  : <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                      ev.status === 'RESOLVED'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{ev.status}</span>
                }
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────
function DashboardCharts({ incidents, services }) {
  const severityData = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => ({
    name: sev, count: incidents?.filter(i => i.severity === sev)?.length ?? 0,
  }));
  const serviceTypeData = ['VOICE', 'VIDEO', 'MESSAGING']
    .map(type => ({ name: type, count: services?.filter(s => s.type === type)?.length ?? 0 }))
    .filter(d => d.count > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-slate-400" /> Incidents by Severity
        </h3>
        <p className="text-xs text-slate-400 mb-4 font-medium">All-time distribution</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={severityData} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(14,165,233,0.06)' }} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
              {severityData.map((_, i) => <Cell key={i} fill={['#F43F5E','#F97316','#F59E0B','#0EA5E9'][i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" /> Service Distribution
        </h3>
        <p className="text-xs text-slate-400 mb-4 font-medium">By type</p>
        {serviceTypeData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-slate-400 font-medium">No services yet</div>
        ) : (
          <ResponsiveContainer width="100%" aspect={1.6}>
            <PieChart>
              <Pie data={serviceTypeData} dataKey="count" nameKey="name"
                cx="50%" cy="44%" innerRadius={55} outerRadius={90} paddingAngle={4}>
                {serviceTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Legend formatter={(v, e) => `${v} (${e.payload?.count ?? 0})`} />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Recent Incidents Table ────────────────────────────────────────────────────
function RecentIncidentsTable({ incidents, title = 'Recent Incidents' }) {
  const recent = [...(incidents ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-sky-50 bg-slate-50">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> {title}
        </h3>
        <Link to="/incidents" className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">View all →</Link>
      </div>
      {recent.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-400 font-medium">No incidents found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-slate-50 border-b border-sky-100">
              <tr>{['Title','Service','Severity','Status'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {recent.map(inc => (
                <tr key={inc.incidentId} className="hover:bg-sky-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/incidents/${inc.incidentId}`} className="font-semibold text-slate-800 hover:text-slate-600">{inc.title}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs font-medium">#{inc.serviceId}</td>
                  <td className="px-5 py-3.5"><SeverityBadge severity={inc.severity} /></td>
                  <td className="px-5 py-3.5"><IncidentStatusBadge status={inc.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Services Table ────────────────────────────────────────────────────────────
function ServicesTable({ services, title = 'Services Overview', showManage = true, getOwnerName }) {
  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-sky-50 bg-slate-50">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" /> {title}
        </h3>
        {showManage && (
          <Link to="/services" className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Manage →</Link>
        )}
      </div>
      {(services ?? []).length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-400 font-medium">No services found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-slate-50 border-b border-sky-100">
              <tr>{['Name','Type','Status',...(getOwnerName ? ['Owner'] : [])].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {(services ?? []).slice(0, 5).map(svc => (
                <tr key={svc.serviceId} className="hover:bg-sky-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/services/${svc.serviceId}`} className="font-semibold text-slate-800 hover:text-slate-600">{svc.name}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs font-medium">{svc.type}</td>
                  <td className="px-5 py-3.5"><ServiceStatusBadge status={svc.status} /></td>
                  {getOwnerName && <td className="px-5 py-3.5 text-slate-500 text-xs font-medium">{getOwnerName(svc.ownerUserId)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  const isEnterpriseUser  = role === 'ENTERPRISE_USER';
  const isNetworkEngineer = role === 'NETWORK_ENGINEER';
  const isAdmin           = role === 'ADMIN';

  const { data: services, isLoading: svcLoading } = useQuery({
    queryKey: ['services'], queryFn: () => servicesApi.getAll().then(r => r.data), staleTime: STALE_MS,
  });
  const { data: incidents, isLoading: incLoading } = useQuery({
    queryKey: ['incidents'], queryFn: () => incidentsApi.getAll().then(r => r.data),
    staleTime: STALE_MS, enabled: !isEnterpriseUser,
  });
  const { data: breaches } = useQuery({
    queryKey: ['sla-breaches-unresolved'], queryFn: () => slaApi.getUnresolved().then(r => r.data), staleTime: STALE_MS,
  });
  const { data: users } = useQuery({
    queryKey: ['users'], queryFn: () => usersApi.getAll().then(r => r.data),
    enabled: isAdmin, staleTime: STALE_MS,
  });

  const userNameMap = useMemo(() => {
    const map = {}; users?.forEach(u => { map[u.userId] = u.name; }); return map;
  }, [users]);
  const getOwnerName = (id) => userNameMap[id] ?? (user?.userId === id ? user.name : 'Unknown');

  if (svcLoading || incLoading) return <PageSpinner />;

  // Derived
  const activeServices     = services?.filter(s => s.status === 'ACTIVE')?.length ?? 0;
  const totalServices      = services?.length ?? 0;
  const openIncidents      = incidents?.filter(i => i.status === 'OPEN')?.length ?? 0;
  const criticalIncidents  = incidents?.filter(i => i.severity === 'CRITICAL' && i.status === 'OPEN')?.length ?? 0;
  const unresolvedBreaches = breaches?.length ?? 0;
  const totalIncidents     = incidents?.length ?? 0;

  // NE — only their assigned incidents
  const myAssignedIncidents   = incidents?.filter(i => i.assignedTo === user?.userId) ?? [];
  const myOpenIncidents       = myAssignedIncidents.filter(i => i.status === 'OPEN').length;
  const myInProgressIncidents = myAssignedIncidents.filter(i => i.status === 'IN_PROGRESS').length;
  const myResolvedIncidents   = myAssignedIncidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  // EU — only their own services
  const myServices       = services?.filter(s =>
    s.ownerUserId === user?.userId ||
    s.assignedUserId === user?.userId ||
    s.enterpriseUserId === user?.userId ||
    s.clientUserId === user?.userId
  ) ?? [];
  const myActiveServices = myServices.filter(s => s.status === 'ACTIVE').length;
  const myBreaches       = breaches?.filter(b => myServices.some(s => s.serviceId === b.serviceId)) ?? [];

  const renderStatCards = () => {
    switch (role) {
      case 'ADMIN':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Services" value={activeServices}     icon={<Layers className="w-5 h-5"/>}       color="blue"                                          change={`${totalServices} total`} />
            <StatCard label="Open Incidents"  value={openIncidents}      icon={<AlertCircle className="w-5 h-5"/>}  color={openIncidents > 0 ? 'red' : 'green'}           change={`${criticalIncidents} critical`} />
            <StatCard label="SLA Breaches"    value={unresolvedBreaches} icon={<TrendingUp className="w-5 h-5"/>}   color={unresolvedBreaches > 0 ? 'yellow' : 'green'}   change="Unresolved" />
            <StatCard label="Total Users"     value={users?.length ?? 0} icon={<User className="w-5 h-5"/>}         color="purple"                                        change="Platform users" />
          </div>
        );
      case 'SERVICE_MANAGER':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Services" value={activeServices}     icon={<Layers className="w-5 h-5"/>}       color="blue"                                          change={`${totalServices} total`} />
            <StatCard label="Open Incidents"  value={openIncidents}      icon={<AlertCircle className="w-5 h-5"/>}  color={openIncidents > 0 ? 'red' : 'green'}           change={`${criticalIncidents} critical`} />
            <StatCard label="SLA Breaches"    value={unresolvedBreaches} icon={<TrendingUp className="w-5 h-5"/>}   color={unresolvedBreaches > 0 ? 'yellow' : 'green'}   change="Unresolved" />
            <StatCard label="Total Incidents" value={totalIncidents}     icon={<CheckCircle2 className="w-5 h-5"/>} color="green"                                         change="All time" />
          </div>
        );
      case 'NETWORK_ENGINEER':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="My Open"        value={myOpenIncidents}        icon={<AlertCircle className="w-5 h-5"/>}  color={myOpenIncidents > 0 ? 'red' : 'green'}           change="Assigned to me" />
            <StatCard label="In Progress"    value={myInProgressIncidents}  icon={<Clock className="w-5 h-5"/>}        color={myInProgressIncidents > 0 ? 'yellow' : 'green'}  change="Being worked on" />
            <StatCard label="SLA Breaches"   value={unresolvedBreaches}     icon={<TrendingUp className="w-5 h-5"/>}   color={unresolvedBreaches > 0 ? 'yellow' : 'green'}     change="Need resolution" />
            <StatCard label="My Resolved"    value={myResolvedIncidents}    icon={<CheckCircle2 className="w-5 h-5"/>} color="green"                                           change="Completed by me" />
          </div>
        );
      case 'OPERATIONS_HEAD':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Services" value={activeServices}     icon={<Layers className="w-5 h-5"/>}       color="blue"                                          change={`${totalServices} total`} />
            <StatCard label="Open Incidents"  value={openIncidents}      icon={<AlertCircle className="w-5 h-5"/>}  color={openIncidents > 0 ? 'red' : 'green'}           change={`${criticalIncidents} critical`} />
            <StatCard label="SLA Breaches"    value={unresolvedBreaches} icon={<TrendingUp className="w-5 h-5"/>}   color={unresolvedBreaches > 0 ? 'yellow' : 'green'}   change="Unresolved" />
            <StatCard label="Total Incidents" value={totalIncidents}     icon={<CheckCircle2 className="w-5 h-5"/>} color="green"                                         change="All time" />
          </div>
        );
      case 'COMPLIANCE_OFFICER':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Breaches" value={unresolvedBreaches} icon={<TrendingUp className="w-5 h-5"/>}   color={unresolvedBreaches > 0 ? 'red' : 'green'}     change="SLA violations" />
            <StatCard label="Active Services" value={activeServices}     icon={<Layers className="w-5 h-5"/>}       color="blue"                                         change={`${totalServices} total`} />
            <StatCard label="Total Incidents" value={totalIncidents}     icon={<AlertCircle className="w-5 h-5"/>}  color="yellow"                                       change="All time" />
            <StatCard label="Open Incidents"  value={openIncidents}      icon={<ShieldCheck className="w-5 h-5"/>}  color={openIncidents > 0 ? 'yellow' : 'green'}       change="Unresolved" />
          </div>
        );
      case 'ENTERPRISE_USER':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="My Active Services" value={myActiveServices}    icon={<Layers className="w-5 h-5"/>}       color="blue"                                      change={`${myServices.length} total mine`} />
            <StatCard label="My SLA Breaches"    value={myBreaches.length}   icon={<TrendingUp className="w-5 h-5"/>}   color={myBreaches.length > 0 ? 'red' : 'green'}  change="On my services" />
            <StatCard label="Platform Services"  value={activeServices}      icon={<CheckCircle2 className="w-5 h-5"/>} color="green"                                     change="Active on platform" />
            <StatCard label="Total Services"     value={totalServices}       icon={<PieIcon className="w-5 h-5"/>}      color="purple"                                    change="All services" />
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">{getRoleSubtitle(role)}</p>
        </div>
        <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
          {role?.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Stats */}
      {renderStatCards()}

      {/* ENTERPRISE USER — My Services + My Breaches only */}
      {isEnterpriseUser && (
        <>
          <ServicesTable services={myServices} title="My Services" showManage={false} />
          {myBreaches.length > 0 && (
            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-rose-50 bg-rose-50">
                <h3 className="text-sm font-black text-rose-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-400" /> Active SLA Breaches on My Services
                </h3>
              </div>
              <div className="divide-y divide-rose-50">
                {myBreaches.slice(0, 5).map(b => (
                  <div key={b.id ?? b.breachId} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {b.metricName} — actual: <span className="text-rose-600">{b.actualValue}</span> / threshold: {b.thresholdValue}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{relativeTime(b.detectedAt ?? b.createdAt)}</p>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border text-rose-700 bg-rose-50 border-rose-200">ACTIVE</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* NETWORK ENGINEER — My Assigned Incidents */}
      {isNetworkEngineer && (
        <RecentIncidentsTable incidents={myAssignedIncidents} title="My Assigned Incidents" />
      )}

      {/* Activity Feed — all roles except EU */}
      {!isEnterpriseUser && (
        <LiveActivityFeed
          incidents={isNetworkEngineer ? myAssignedIncidents : incidents}
          breaches={breaches}
          services={services}
        />
      )}

      {/* Charts — not for EU or NE */}
      {!isEnterpriseUser && !isNetworkEngineer && (
        <DashboardCharts incidents={incidents} services={services} />
      )}

      {/* Recent Incidents Table — not for EU or NE (NE already has their own above) */}
      {!isEnterpriseUser && !isNetworkEngineer && (
        <RecentIncidentsTable incidents={incidents} />
      )}

      {/* Services Overview — not for EU */}
      {!isEnterpriseUser && (
        <ServicesTable
          services={services}
          title="Services Overview"
          showManage={isAdmin || role === 'SERVICE_MANAGER'}
          getOwnerName={isAdmin ? getOwnerName : undefined}
        />
      )}

    </div>
  );
}