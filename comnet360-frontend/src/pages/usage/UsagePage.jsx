import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertCircle, CheckCircle2, Plus, Pencil, BarChart,
  TrendingUp, Search, Users, Shield, Info, Trash2,
} from 'lucide-react';
import { usageApi, slaApi } from '../../api/usage';
import { servicesApi } from '../../api/services';
import { PageSpinner } from '../../components/ui/Spinner';
import { SlaStatusBadge } from '../../components/ui/StatusBadge';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart as RechartBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

/* ── Metric colour palette ──────────────────────────────────────────── */
const METRIC_COLORS = {
  BANDWIDTH:      '#3b82f6',
  CALL_DURATION:  '#10b981',
  DATA_TRANSFER:  '#8b5cf6',
  MESSAGE_COUNT:  '#f59e0b',
  VIDEO_MINUTES:  '#ec4899',
  API_CALLS:      '#06b6d4',
};

const METRIC_UNITS = {
  BANDWIDTH:      'Mbps',
  CALL_DURATION:  'min',
  DATA_TRANSFER:  'GB',
  MESSAGE_COUNT:  'msgs',
  VIDEO_MINUTES:  'min',
  API_CALLS:      'calls',
};

/* ── Custom recharts tooltip ────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-sky-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function UsagePage() {
  const qc = useQueryClient();
  const { hasRole, user } = useAuth();

  const isEnterpriseUser  = hasRole('ENTERPRISE_USER');
  const canWriteSla       = hasRole('ADMIN', 'SERVICE_MANAGER');
  const canLogUsage       = hasRole('ADMIN', 'SERVICE_MANAGER', 'NETWORK_ENGINEER', 'ENTERPRISE_USER');
  const canResolveBreach  = hasRole('ADMIN', 'SERVICE_MANAGER', 'NETWORK_ENGINEER');
  const canViewAnalytics  = hasRole('ADMIN', 'SERVICE_MANAGER', 'OPERATIONS_HEAD');

  /* ── Tab + filter state ─────────────────────────────────────────── */
  const [activeTab, setActiveTab]             = useState('usage');
  const [selectedService, setSelectedService] = useState('');
  const [metricFilter, setMetricFilter]       = useState('');
  const [userSearch, setUserSearch]           = useState('');
  const [statusFilter, setStatusFilter]       = useState('all'); // 'all' | 'unresolved' | 'resolved'

  /* ── Modal state ────────────────────────────────────────────────── */
  const [slaModal,    setSlaModal]    = useState(false);
  const [slaForm,     setSlaForm]     = useState({ serviceId: '', metric: '', threshold: '', unit: '', operator: 'LESS_THAN', description: '' });
  const [editSla,     setEditSla]     = useState(null);
  const [editForm,    setEditForm]    = useState({ threshold: '', unit: '', operator: 'LESS_THAN', description: '' });
  const [usageModal,  setUsageModal]  = useState(false);
  const [usageForm,   setUsageForm]   = useState({ serviceId: '', metricType: 'BANDWIDTH', value: '', unit: '' });
  const [breachModal, setBreachModal] = useState(null);
  const [breachNotes, setBreachNotes] = useState('');

  /* ── Queries ────────────────────────────────────────────────────── */
  const { data: services } = useQuery({
    queryKey: ['services-all', isEnterpriseUser],
    queryFn: () =>
      isEnterpriseUser
        ? servicesApi.getMy().then(r => r.data)
        : servicesApi.getAll().then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 0,
  });

  /* Auto-select the enterprise user's ASSIGNED service (not just owned) */
  useEffect(() => {
    if (isEnterpriseUser && services?.length >= 1 && !selectedService) {
      // Prefer the service where this user is the assigned user, not just owner
      const assigned =
        services.find(s => String(s.assignedUserId) === String(user?.userId)) ??
        services.find(s => s.assignedUserId != null) ??
        services[0];
      setSelectedService(String(assigned.serviceId));
    }
  }, [services, isEnterpriseUser, selectedService, user]);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage', selectedService],
    queryFn: () =>
      selectedService
        ? usageApi.getByService(Number(selectedService)).then(r => r.data)
        : Promise.resolve([]),
    enabled: !!selectedService,
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const { data: slas, isLoading: slaLoading } = useQuery({
    queryKey: ['slas'],
    queryFn: () => slaApi.getAll().then(r => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const { data: breaches } = useQuery({
    queryKey: ['sla-breaches'],
    queryFn: () => slaApi.getAllBreaches().then(r => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  /* ── Lookup maps ────────────────────────────────────────────────── */
  const serviceNameMap = useMemo(() => {
    const m = {};
    (services ?? []).forEach(s => { m[s.serviceId] = s.name; });
    return m;
  }, [services]);

  /* serviceId → assigned enterprise user name */
  const serviceUserMap = useMemo(() => {
    const m = {};
    (services ?? []).forEach(s => {
      if (s.assignedUserName) m[s.serviceId] = s.assignedUserName;
    });
    return m;
  }, [services]);

  /* Enterprise users only see breaches for their own service */
  const visibleBreaches = useMemo(() => {
    if (!isEnterpriseUser || !services) return breaches ?? [];
    const myIds = new Set(services.map(s => s.serviceId));
    return (breaches ?? []).filter(b => myIds.has(b.serviceId));
  }, [breaches, services, isEnterpriseUser]);

  /* ── Chart data (fixed: sorted by date, pivoted by metric type) ── */
  const availableMetrics = useMemo(() => {
    const types = new Set((usage ?? []).map(u => u.metricType));
    return Array.from(types);
  }, [usage]);

  const chartData = useMemo(() => {
    const records = [...(usage ?? [])]
      .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt))
      .slice(-60);

    if (metricFilter) {
      return records
        .filter(u => u.metricType === metricFilter)
        .map(u => ({
          date: new Date(u.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          [metricFilter]: Number(u.value),
        }));
    }
    /* Pivot by date → { date, BANDWIDTH: x, CALL_DURATION: y, … } */
    const byDate = {};
    records.forEach(u => {
      const date = new Date(u.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!byDate[date]) byDate[date] = { date };
      byDate[date][u.metricType] = Number(u.value);
    });
    return Object.values(byDate);
  }, [usage, metricFilter]);

  const chartMetrics = metricFilter ? [metricFilter] : availableMetrics;

  /* ── Latest readings per metric (for enterprise health cards) ───── */
  const latestReadings = useMemo(() => {
    const latest = {};
    (usage ?? []).forEach(u => {
      if (!latest[u.metricType] || new Date(u.recordedAt) > new Date(latest[u.metricType].recordedAt)) {
        latest[u.metricType] = u;
      }
    });
    return latest;
  }, [usage]);

  /* Active SLAs for the selected service */
  const serviceSlas = useMemo(() =>
    (slas ?? []).filter(s => String(s.serviceId) === selectedService && s.status === 'ACTIVE'),
    [slas, selectedService]
  );

  /* SLAs visible in the table:
     Enterprise users see only SLAs for their own assigned service(s).
     Admins/managers see all SLAs. */
  const visibleSlas = useMemo(() => {
    if (!isEnterpriseUser || !services) return slas ?? [];
    const myServiceIds = new Set(services.map(s => String(s.serviceId)));
    return (slas ?? []).filter(s => myServiceIds.has(String(s.serviceId)));
  }, [slas, services, isEnterpriseUser]);

  /* Per-metric SLA compliance status */
  const slaStatusByMetric = useMemo(() => {
    const status = {};
    serviceSlas.forEach(sla => {
      const rec = latestReadings[sla.metric];
      if (!rec) { status[sla.metric] = 'no-data'; return; }
      const val = Number(rec.value), thr = Number(sla.threshold);
      const breached =
        sla.operator === 'LESS_THAN'    ? val >= thr :
        sla.operator === 'GREATER_THAN' ? val <= thr : false;
      status[sla.metric] = breached ? 'breach' : 'ok';
    });
    return status;
  }, [serviceSlas, latestReadings]);

  /* ── Breach analytics grouped by assigned user ───────────────────── */
  const breachByUser = useMemo(() => {
    const grouped = {};
    (breaches ?? []).forEach(b => {
      const userName = serviceUserMap[b.serviceId] ?? 'Unassigned';
      if (!grouped[userName]) {
        grouped[userName] = { userName, total: 0, unresolved: 0, services: new Set(), lastBreach: null };
      }
      grouped[userName].total++;
      if (!b.resolved) grouped[userName].unresolved++;
      grouped[userName].services.add(serviceNameMap[b.serviceId] ?? `Service #${b.serviceId}`);
      const t = b.breachTime ?? b.createdAt;
      if (t && (!grouped[userName].lastBreach || new Date(t) > new Date(grouped[userName].lastBreach))) {
        grouped[userName].lastBreach = t;
      }
    });
    return Object.values(grouped)
      .map(g => ({ ...g, services: Array.from(g.services) }))
      .sort((a, b) => b.total - a.total);
  }, [breaches, serviceUserMap, serviceNameMap]);

  /* slaId → sla object (for metric name lookup in breach table) */
  const slaMap = useMemo(() => {
    const m = {};
    (slas ?? []).forEach(s => { m[s.slaId] = s; });
    return m;
  }, [slas]);

  /* User summary filtered by search + statusFilter */
  const filteredBreachByUser = useMemo(() => {
    let list = breachByUser;
    if (userSearch.trim())
      list = list.filter(u => u.userName.toLowerCase().includes(userSearch.toLowerCase()));
    if (statusFilter === 'unresolved') list = list.filter(u => u.unresolved > 0);
    if (statusFilter === 'resolved')   list = list.filter(u => (u.total - u.unresolved) > 0);
    if (statusFilter === 'users')      list = list.filter(u => u.userName !== 'Unassigned');
    return list;
  }, [breachByUser, userSearch, statusFilter]);

  /* Detailed breach rows filtered by search + statusFilter */
  const filteredDetailBreaches = useMemo(() => {
    let list = breaches ?? [];
    if (statusFilter === 'unresolved') list = list.filter(b => !b.resolved);
    if (statusFilter === 'resolved')   list = list.filter(b =>  b.resolved);
    if (userSearch.trim()) {
      list = list.filter(b => {
        const name = serviceUserMap[b.serviceId] ?? 'Unassigned';
        return name.toLowerCase().includes(userSearch.toLowerCase());
      });
    }
    return list;
  }, [breaches, statusFilter, userSearch, serviceUserMap]);

  /* ── Mutations ─────────────────────────────────────────────────── */
  const logUsageMut = useMutation({
    mutationFn: () => usageApi.create({
      serviceId:  Number(usageForm.serviceId),
      metricType: usageForm.metricType,
      value:      Number(usageForm.value),
      unit:       usageForm.unit,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usage', usageForm.serviceId] });
      qc.invalidateQueries({ queryKey: ['sla-breaches'] });
      qc.invalidateQueries({ queryKey: ['sla-breaches-unresolved'] });
      toast.success('Usage logged. SLA breach checked instantly — refresh to see any new breaches.');
      setUsageModal(false);
      setUsageForm({ serviceId: '', metricType: 'BANDWIDTH', value: '', unit: '' });
    },
    onError: () => toast.error('Failed to log usage record'),
  });

  const createSlaMut = useMutation({
    mutationFn: () => slaApi.create({
      serviceId:   Number(slaForm.serviceId),
      metric:      slaForm.metric,
      threshold:   Number(slaForm.threshold),
      unit:        slaForm.unit,
      operator:    slaForm.operator,
      description: slaForm.description,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slas'] });
      toast.success('SLA created');
      setSlaModal(false);
      setSlaForm({ serviceId: '', metric: '', threshold: '', unit: '', operator: 'LESS_THAN', description: '' });
    },
    onError: () => toast.error('Failed to create SLA'),
  });

  const patchSlaMut = useMutation({
    mutationFn: () => slaApi.patch(editSla.slaId, {
      threshold:   editForm.threshold ? Number(editForm.threshold) : undefined,
      unit:        editForm.unit.trim()        || undefined,
      operator:    editForm.operator           || undefined,
      description: editForm.description.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slas'] });
      toast.success('SLA updated');
      setEditSla(null);
    },
    onError: () => toast.error('Failed to update SLA'),
  });

  const resolveBreachMut = useMutation({
    mutationFn: () => slaApi.resolveBreach(breachModal, breachNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sla-breaches'] });
      qc.invalidateQueries({ queryKey: ['sla-breaches-unresolved'] });
      toast.success('Breach resolved');
      setBreachModal(null);
      setBreachNotes('');
    },
    onError: () => toast.error('Failed to resolve breach'),
  });

  const toggleSlaMut = useMutation({
    mutationFn: ({ id, status }) => slaApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slas'] }),
  });

  const deleteUsageMut = useMutation({
    mutationFn: (id) => usageApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usage', selectedService] });
      toast.success('Usage record deleted');
    },
    onError: () => toast.error('Failed to delete usage record'),
  });

  const openEditModal = sla => {
    setEditSla(sla);
    setEditForm({ threshold: String(sla.threshold), unit: sla.unit, operator: sla.operator, description: sla.description ?? '' });
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Usage & SLA</h2>
          <p className="text-sm text-slate-500">Monitor service metrics, SLA compliance and breach history</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canWriteSla && (
            <Button size="sm" variant="secondary" icon={<Plus className="w-3 h-3" />} onClick={() => setSlaModal(true)}>
              New SLA
            </Button>
          )}
          {canLogUsage && (
            <Button
              size="sm"
              icon={<BarChart className="w-3 h-3" />}
              onClick={() => {
                setUsageForm(f => ({ ...f, serviceId: selectedService || f.serviceId }));
                setUsageModal(true);
              }}
            >
              Log Usage
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs (only shown when admin / manager / ops head) ──────── */}
      {canViewAnalytics && (
        <div className="flex gap-1 p-1 bg-sky-50 rounded-xl w-fit border border-sky-100">
          {[
            { id: 'usage',     label: 'Usage & SLA',      icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'analytics', label: 'Breach Analytics',  icon: <Shield className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-sky-700 shadow-sm border border-sky-100'
                  : 'text-slate-500 hover:text-sky-600 hover:bg-white/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 1 — Usage & SLA
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'usage' && (
        <div className="space-y-6">


          {/* Usage trend chart */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Usage Trend
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {/* Service selector — always visible */}
                <select
                  value={selectedService}
                  onChange={e => { setSelectedService(e.target.value); setMetricFilter(''); }}
                  className="text-sm px-3 py-1.5 border border-sky-100 rounded-lg focus:outline-none focus:border-sky-400 cursor-pointer bg-white"
                >
                  <option value="">Select a service</option>
                  {(services ?? []).map(s => (
                    <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Enterprise service label — always show so user knows which service they're viewing */}
            {isEnterpriseUser && (
              <p className="text-xs text-slate-400 mb-3">
                {selectedService
                  ? <>Viewing: <span className="font-semibold text-sky-700">{serviceNameMap[Number(selectedService)]}</span></>
                  : <span className="text-amber-500">No service assigned to your account yet</span>
                }
              </p>
            )}

            {usageLoading ? (
              <div className="flex items-center justify-center h-52"><PageSpinner /></div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <RechartBar data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  {chartMetrics.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
                  {chartMetrics.map((metric, i) => (
                    <Bar
                      key={metric}
                      dataKey={metric}
                      name={metric.replace(/_/g, ' ')}
                      fill={['#64748b', '#94a3b8', '#475569', '#cbd5e1', '#334155', '#b0bec5'][i % 6]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  ))}
                </RechartBar>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <Activity className="w-8 h-8 opacity-30" />
                {selectedService ? 'No usage data recorded yet for this service' : 'Select a service to view usage trend'}
              </div>
            )}
          </div>

          {/* Usage Records Table */}
          {selectedService && (usage ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sky-50">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-slate-400" />
                  Usage Records
                </h3>
                <span className="text-xs text-slate-400">{(usage ?? []).length} record{(usage ?? []).length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead style={{ background: '#f0f9ff' }} className="border-b border-sky-50">
                    <tr>
                      {['Metric', 'Value', 'Recorded At', ...(canWriteSla ? [''] : [])].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...(usage ?? [])]
                      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
                      .map(rec => (
                        <tr key={rec.usageId} className="hover:bg-sky-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                              style={{
                                background: (METRIC_COLORS[rec.metricType] ?? '#94a3b8') + '18',
                                color: METRIC_COLORS[rec.metricType] ?? '#64748b',
                              }}>
                              {rec.metricType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800">
                            {Number(rec.value).toLocaleString()}
                            {rec.unit && <span className="text-xs text-slate-400 ml-1">{rec.unit}</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(rec.recordedAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          {canWriteSla && (
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete this ${rec.metricType.replace(/_/g, ' ')} record (${Number(rec.value).toLocaleString()} ${rec.unit ?? ''})?`)) {
                                    deleteUsageMut.mutate(rec.usageId);
                                  }
                                }}
                                disabled={deleteUsageMut.isPending}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLA Definitions */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sky-50">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                {isEnterpriseUser ? 'Your Service SLA Metrics' : 'SLA Definitions'}
              </h3>
              {canWriteSla && (
                <Button size="sm" variant="secondary" icon={<Plus className="w-3 h-3" />} onClick={() => setSlaModal(true)}>
                  New SLA
                </Button>
              )}
            </div>
            {slaLoading ? (
              <div className="p-8 flex justify-center"><PageSpinner /></div>
            ) : visibleSlas.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                {isEnterpriseUser ? 'No SLA metrics are defined for your service yet' : 'No SLA definitions yet'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[580px]">
                  <thead style={{ background: '#f0f9ff' }} className="border-b border-sky-50">
                    <tr>
                      {['Service', 'Metric', 'Condition', 'Threshold', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visibleSlas.map(sla => (
                      <tr key={sla.slaId} className="hover:bg-sky-50 transition-colors">
                        {/* Service */}
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 max-w-[160px]">
                          <span className="block truncate">{sla.serviceName ?? serviceNameMap[sla.serviceId] ?? `#${sla.serviceId}`}</span>
                        </td>
                        {/* Metric + optional info tooltip */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                              {sla.metric.replace(/_/g, ' ')}
                            </span>
                            {sla.description && (
                              <span
                                title={sla.description}
                                className="text-slate-300 hover:text-slate-400 cursor-help transition-colors flex-shrink-0"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Condition */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {sla.operator.replace(/_/g, ' ')}
                          </span>
                        </td>
                        {/* Threshold + unit inline */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-slate-800">{String(sla.threshold)}</span>
                          {sla.unit && <span className="text-xs text-slate-400 ml-1">{sla.unit}</span>}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3"><SlaStatusBadge status={sla.status} /></td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          {canWriteSla && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(sla)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit SLA"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleSlaMut.mutate({ id: sla.slaId, status: sla.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                {sla.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SLA Breach Events — with Assigned User column */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sky-50">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400" /> SLA Breach Events
              </h3>
              <Badge color={visibleBreaches.some(b => !b.resolved) ? 'red' : 'green'} dot>
                {visibleBreaches.filter(b => !b.resolved).length} unresolved
              </Badge>
            </div>

            {visibleBreaches.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-9 h-9 text-emerald-300" />
                <p className="font-medium">No SLA breaches. All systems nominal!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead style={{ background: '#f0f9ff' }} className="border-b border-sky-50">
                    <tr>
                      {['SLA #', 'Service', 'Assigned User', 'Actual', 'Threshold', 'Breach Time', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visibleBreaches.map(b => (
                      <React.Fragment key={b.breachId}>
                        <tr className={`transition-colors ${b.resolved ? 'hover:bg-sky-50' : 'hover:bg-red-50/20'}`}>
                          <td className="px-4 py-3.5 text-slate-400 text-xs font-mono">#{b.slaId}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            {b.serviceName ?? serviceNameMap[b.serviceId] ?? `#${b.serviceId}`}
                          </td>
                          {/* Assigned User */}
                          <td className="px-4 py-3.5">
                            {serviceUserMap[b.serviceId] ? (
                              <span className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                                  {serviceUserMap[b.serviceId].charAt(0).toUpperCase()}
                                </span>
                                <span className="text-sm text-slate-700">{serviceUserMap[b.serviceId]}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-800">{String(b.actualValue)}</td>
                          <td className="px-4 py-3.5 font-mono text-slate-400">{String(b.thresholdValue)}</td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(b.breachTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge color={b.resolved ? 'green' : 'red'} dot>
                              {b.resolved ? 'Resolved' : 'Active'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            {!b.resolved && canResolveBreach && (
                              <button
                                onClick={() => setBreachModal(b.breachId)}
                                className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                        {b.resolutionNote && (
                          <tr className="bg-slate-50">
                            <td colSpan={8} className="px-4 py-2.5">
                              <p className="text-xs font-semibold text-slate-500 mb-0.5">Resolution Note</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{b.resolutionNote}</p>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2 — Breach Analytics (Admin / Manager / Ops Head)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && canViewAnalytics && (
        <div className="space-y-5">

          {/* Clickable stat filter cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'all',        label: 'Total Breaches', value: breaches?.length ?? 0 },
              { id: 'unresolved', label: 'Unresolved',     value: breaches?.filter(b => !b.resolved).length ?? 0 },
              { id: 'resolved',   label: 'Resolved',       value: breaches?.filter(b =>  b.resolved).length ?? 0 },
              { id: 'users',      label: 'Users Affected', value: breachByUser.filter(u => u.userName !== 'Unassigned').length },
            ].map(card => {
              const isActive = statusFilter === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => setStatusFilter(statusFilter === card.id ? 'all' : card.id)}
                  className={`bg-white rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    isActive ? 'border-sky-400 shadow-sm bg-sky-50/40' : 'border-sky-100 hover:border-sky-300'
                  }`}
                >
                  <p className="text-xs text-slate-400 font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                  {isActive && (
                    <p className="text-[10px] text-slate-400 mt-1">Click to clear</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + active filter indicator */}
          <div className="bg-white rounded-xl border border-sky-100 p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by username…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {/* Active filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 px-2.5 py-1 rounded-full border border-slate-300 bg-slate-50">
                  {statusFilter === 'unresolved' ? 'Unresolved only' : statusFilter === 'resolved' ? 'Resolved only' : 'Named users only'}
                  <button onClick={() => setStatusFilter('all')} className="ml-0.5 text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
                </span>
              )}
              {userSearch && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 px-2.5 py-1 rounded-full border border-slate-300 bg-slate-50">
                  "{userSearch}"
                  <button onClick={() => setUserSearch('')} className="ml-0.5 text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
                </span>
              )}
              {(statusFilter !== 'all' || userSearch) && (
                <button onClick={() => { setStatusFilter('all'); setUserSearch(''); }} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer underline">
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* User summary table */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
            <div className="px-5 py-4 border-b border-sky-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Breach Summary by User</h3>
              </div>
              <span className="text-xs text-slate-400">{filteredBreachByUser.length} user{filteredBreachByUser.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredBreachByUser.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No users match the current filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[580px]">
                  <thead style={{ background: '#f0f9ff' }} className="border-b border-sky-50">
                    <tr>
                      {['User', 'Services', 'Total', 'Unresolved', 'Resolved', 'Last Breach'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredBreachByUser.map(row => (
                      <tr
                        key={row.userName}
                        className="hover:bg-sky-50 transition-colors cursor-pointer"
                        onClick={() => setUserSearch(row.userName === userSearch ? '' : row.userName)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold flex-shrink-0">
                              {row.userName === 'Unassigned' ? '?' : row.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">{row.userName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {row.services.slice(0, 2).map(s => (
                              <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                            ))}
                            {row.services.length > 2 && <span className="text-xs text-slate-400">+{row.services.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{row.total}</td>
                        <td className="px-5 py-3.5">
                          {row.unresolved > 0
                            ? <span className="text-sm text-slate-700">{row.unresolved}</span>
                            : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">{row.total - row.unresolved}</td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {row.lastBreach ? new Date(row.lastBreach).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Full breach detail table (always visible, respects all filters) ── */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
            <div className="px-5 py-4 border-b border-sky-50 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                Breach Details
                {userSearch && <span className="text-blue-600">— {userSearch}</span>}
                {statusFilter !== 'all' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusFilter === 'unresolved' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {statusFilter}
                  </span>
                )}
              </h3>
              <span className="text-xs text-slate-400">{filteredDetailBreaches.length} record{filteredDetailBreaches.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredDetailBreaches.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No breach records match the current filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead style={{ background: '#f0f9ff' }} className="border-b border-sky-50">
                    <tr>
                      {['#', 'Service', 'Assigned User', 'Metric', 'Actual Used', 'Threshold', 'Breach Time', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredDetailBreaches.map(b => {
                      const metric = slaMap[b.slaId]?.metric ?? '—';
                      const unit   = slaMap[b.slaId]?.unit   ?? '';
                      const userName = serviceUserMap[b.serviceId] ?? '—';
                      return (
                        <tr key={b.breachId} className={`transition-colors ${b.resolved ? 'hover:bg-sky-50' : 'hover:bg-red-50/20'}`}>
                          <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">#{b.breachId}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            {b.serviceName ?? serviceNameMap[b.serviceId] ?? `#${b.serviceId}`}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-semibold flex-shrink-0">
                                {userName === '—' ? '?' : userName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm text-slate-700">{userName}</span>
                            </div>
                          </td>
                          {/* Metric type */}
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-slate-600">{metric.replace(/_/g, ' ')}</span>
                          </td>
                          {/* Actual value */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-sm text-slate-800">{String(b.actualValue)}</span>
                            {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
                          </td>
                          {/* Threshold */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-sm text-slate-400">{String(b.thresholdValue)}</span>
                            {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(b.breachTime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge color={b.resolved ? 'green' : 'red'} dot>
                              {b.resolved ? 'Resolved' : 'Active'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════ */}

      {/* Create SLA */}
      <Modal open={slaModal} onClose={() => setSlaModal(false)} title="Create SLA Definition"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSlaModal(false)}>Cancel</Button>
            <Button loading={createSlaMut.isPending} disabled={!slaForm.serviceId || !slaForm.metric.trim() || !slaForm.threshold} onClick={() => createSlaMut.mutate()}>Create SLA</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Service" value={slaForm.serviceId}
            onChange={e => setSlaForm(f => ({ ...f, serviceId: e.target.value }))}
            placeholder="Select service"
            options={(services ?? []).map(s => ({ value: String(s.serviceId), label: s.name }))}
          />
          <Input label="Metric Name" value={slaForm.metric}
            onChange={e => setSlaForm(f => ({ ...f, metric: e.target.value }))}
            placeholder="e.g. CALL_DURATION, VIDEO_MINUTES, MESSAGE_COUNT, BANDWIDTH" />
          <Select label="Operator" value={slaForm.operator}
            onChange={e => setSlaForm(f => ({ ...f, operator: e.target.value }))}
            options={[
              { value: 'LESS_THAN',    label: 'Less Than (breach if value goes above threshold)' },
              { value: 'GREATER_THAN', label: 'Greater Than (breach if value falls below threshold)' },
              { value: 'EQUAL_TO',     label: 'Equals' },
            ]}
          />
          <Input label="Threshold" type="number" value={slaForm.threshold}
            onChange={e => setSlaForm(f => ({ ...f, threshold: e.target.value }))} placeholder="e.g. 1000" />
          <Input label="Unit" value={slaForm.unit}
            onChange={e => setSlaForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. Mbps, ms, %" />
          <Input label="Description" value={slaForm.description}
            onChange={e => setSlaForm(f => ({ ...f, description: e.target.value }))} placeholder="What this SLA monitors" />
        </div>
      </Modal>

      {/* Edit SLA */}
      <Modal open={!!editSla} onClose={() => setEditSla(null)} title={`Edit SLA #${editSla?.slaId}: ${editSla?.metric}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditSla(null)}>Cancel</Button>
            <Button loading={patchSlaMut.isPending} onClick={() => patchSlaMut.mutate()}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            Metric and Service cannot be changed after creation.
          </p>
          <Select label="Operator" value={editForm.operator}
            onChange={e => setEditForm(f => ({ ...f, operator: e.target.value }))}
            options={[
              { value: 'LESS_THAN',    label: 'Less Than' },
              { value: 'GREATER_THAN', label: 'Greater Than' },
              { value: 'EQUAL_TO',     label: 'Equals' },
            ]}
          />
          <Input label="Threshold" type="number" value={editForm.threshold}
            onChange={e => setEditForm(f => ({ ...f, threshold: e.target.value }))} placeholder="e.g. 1000" />
          <Input label="Unit" value={editForm.unit}
            onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. Mbps, ms, %" />
          <Input label="Description" value={editForm.description}
            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="What this SLA monitors" />
        </div>
      </Modal>

      {/* Log Usage */}
      <Modal open={usageModal} onClose={() => setUsageModal(false)} title="Log Usage Record"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUsageModal(false)}>Cancel</Button>
            <Button
              loading={logUsageMut.isPending}
              disabled={!usageForm.serviceId || !usageForm.value}
              onClick={() => logUsageMut.mutate()}
            >
              Log Usage
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            ⚡ SLA breach detection runs <strong>instantly</strong> when usage is logged. Refresh the Breach Events table right after submitting to see any new breaches.
          </p>
          <Select label="Service" value={usageForm.serviceId}
            onChange={e => setUsageForm(f => ({ ...f, serviceId: e.target.value }))}
            placeholder="Select service"
            options={(services ?? []).map(s => ({ value: String(s.serviceId), label: s.name }))}
          />
          <Select label="Metric Type" value={usageForm.metricType}
            onChange={e => setUsageForm(f => ({ ...f, metricType: e.target.value }))}
            options={[
              { value: 'BANDWIDTH',     label: 'BANDWIDTH' },
              { value: 'CALL_DURATION', label: 'CALL_DURATION' },
              { value: 'DATA_TRANSFER', label: 'DATA_TRANSFER' },
              { value: 'MESSAGE_COUNT', label: 'MESSAGE_COUNT' },
              { value: 'VIDEO_MINUTES', label: 'VIDEO_MINUTES' },
              { value: 'API_CALLS',     label: 'API_CALLS' },
            ]}
          />
          <Input label="Value" type="number" value={usageForm.value}
            onChange={e => setUsageForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 5000" />
          <Input label="Unit" value={usageForm.unit}
            onChange={e => setUsageForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. Mbps, minutes, count" />
        </div>
      </Modal>

      {/* Resolve Breach */}
      <Modal open={!!breachModal} onClose={() => setBreachModal(null)} title="Resolve SLA Breach"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBreachModal(null)}>Cancel</Button>
            <Button variant="success" loading={resolveBreachMut.isPending} onClick={() => resolveBreachMut.mutate()}>
              Mark Resolved
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Resolution notes</label>
          <textarea
            value={breachNotes}
            onChange={e => setBreachNotes(e.target.value)}
            rows={3}
            placeholder="Describe what was done to resolve this breach…"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </Modal>

    </div>
  );
}
