import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertCircle, CheckCircle2, Plus, Pencil, BarChart } from 'lucide-react';
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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

export default function UsagePage() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const isEnterpriseUser = hasRole('ENTERPRISE_USER');
  // Write permissions — must match backend @PreAuthorize exactly
  const canWriteSla    = hasRole('ADMIN', 'SERVICE_MANAGER');          // create/edit/disable SLA
  const canLogUsage    = hasRole('ADMIN', 'SERVICE_MANAGER', 'NETWORK_ENGINEER', 'ENTERPRISE_USER'); // POST /usage
  const canResolveBreach = hasRole('ADMIN', 'SERVICE_MANAGER', 'NETWORK_ENGINEER'); // resolve breach
  const [selectedService, setSelectedService] = useState('');

  // ── Create SLA modal state ────────────────────────────────────
  const [slaModal, setSlaModal] = useState(false);
  const [slaForm, setSlaForm] = useState({
    serviceId: '',
    metric: '',
    threshold: '',
    unit: '',
    operator: 'LESS_THAN',
    description: '',
  });

  // ── Edit (patch) SLA modal state ─────────────────────────────
  const [editSla, setEditSla] = useState(null);
  const [editForm, setEditForm] = useState({
    threshold: '',
    unit: '',
    operator: 'LESS_THAN',
    description: '',
  });

  // ── Log usage modal state ─────────────────────────────────────
  const [usageModal, setUsageModal] = useState(false);
  const [usageForm, setUsageForm] = useState({
    serviceId: '',
    metricType: 'BANDWIDTH',
    value: '',
    unit: '',
  });

  // ── Resolve breach modal state ────────────────────────────────
  const [breachModal, setBreachModal] = useState(null);
  const [breachNotes, setBreachNotes] = useState('');

  // ── Queries ───────────────────────────────────────────────────
  // Enterprise users only see their assigned services; others see all
  const { data: services } = useQuery({
    queryKey: ['services-all', isEnterpriseUser],
    queryFn: () =>
      isEnterpriseUser
        ? servicesApi.getMy().then((r) => r.data)
        : servicesApi.getAll().then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 0,
  });

  // Build a serviceId → name lookup map from fetched services
  const serviceNameMap = useMemo(() => {
    const map = {};
    (services ?? []).forEach((s) => { map[s.serviceId] = s.name; });
    return map;
  }, [services]);

  // Auto-select when enterprise user has exactly one assigned service
  useEffect(() => {
    if (isEnterpriseUser && services?.length === 1 && !selectedService) {
      setSelectedService(String(services[0].serviceId));
    }
  }, [services, isEnterpriseUser, selectedService]);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage', selectedService],
    queryFn: () =>
      selectedService
        ? usageApi.getByService(Number(selectedService)).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!selectedService,
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const { data: slas, isLoading: slaLoading } = useQuery({
    queryKey: ['slas'],
    queryFn: () => slaApi.getAll().then((r) => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const { data: breaches } = useQuery({
    queryKey: ['sla-breaches'],
    queryFn: () => slaApi.getAllBreaches().then((r) => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const logUsageMut = useMutation({
    mutationFn: () =>
      usageApi.create({
        serviceId: Number(usageForm.serviceId),
        metricType: usageForm.metricType,
        value: Number(usageForm.value),
        unit: usageForm.unit,
      }),
    onSuccess: () => {
      // Refresh usage chart + breaches (scheduler may fire shortly)
      qc.invalidateQueries({ queryKey: ['usage', usageForm.serviceId] });
      qc.invalidateQueries({ queryKey: ['sla-breaches'] });
      qc.invalidateQueries({ queryKey: ['sla-breaches-unresolved'] });
      toast.success('Usage record logged. SLA check runs every 60 seconds — refresh breaches shortly.');
      setUsageModal(false);
      setUsageForm({ serviceId: '', metricType: 'BANDWIDTH', value: '', unit: '' });
    },
    onError: () => toast.error('Failed to log usage record'),
  });

  const createSlaMut = useMutation({
    mutationFn: () =>
      slaApi.create({
        serviceId: Number(slaForm.serviceId),
        metric: slaForm.metric,
        threshold: Number(slaForm.threshold),
        unit: slaForm.unit,
        operator: slaForm.operator,
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
    mutationFn: () =>
      slaApi.patch(editSla.slaId, {
        threshold: editForm.threshold ? Number(editForm.threshold) : undefined,
        unit: editForm.unit.trim() || undefined,
        operator: editForm.operator || undefined,
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
  });

  const toggleSlaMut = useMutation({
    mutationFn: ({ id, status }) => slaApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slas'] }),
  });

  // Open edit modal pre-filled with current SLA values
  const openEditModal = (sla) => {
    setEditSla(sla);
    setEditForm({
      threshold: String(sla.threshold),
      unit: sla.unit,
      operator: sla.operator,
      description: sla.description ?? '',
    });
  };

  // Format usage data for chart
  const chartData = (usage ?? []).slice(-30).map((u) => ({
    time: new Date(u.recordedAt).toLocaleDateString(),
    value: Number(u.value),
    metric: u.metricType,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Usage & SLA</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Monitor service usage metrics and SLA compliance</p>
      </div>

      {/* Usage chart */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Usage Metrics
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
            >
              <option value="">Select a service</option>
              {(services ?? []).map((s) => (
                <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
              ))}
            </select>
            {canLogUsage && (
              <Button
                size="sm"
                variant="secondary"
                icon={<BarChart className="w-3 h-3" />}
                onClick={() => {
                  // Pre-fill service if one is already selected (esp. for enterprise user)
                  setUsageForm((f) => ({ ...f, serviceId: selectedService || f.serviceId }));
                  setUsageModal(true);
                }}
              >
                Log Usage
              </Button>
            )}
          </div>
        </div>
        {usageLoading ? (
          <div className="flex items-center justify-center h-48"><PageSpinner /></div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            {selectedService ? 'No usage data for this service' : 'Select a service to view usage'}
          </div>
        )}
      </div>

      {/* SLA Definitions */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">SLA Definitions</h3>
          {canWriteSla && (
            <Button size="sm" variant="secondary" icon={<Plus className="w-3 h-3" />} onClick={() => setSlaModal(true)}>
              New SLA
            </Button>
          )}
        </div>
        {slaLoading ? (
          <div className="p-8 flex justify-center"><PageSpinner /></div>
        ) : !slas || slas.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No SLA definitions</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {['Service', 'Metric', 'Condition', 'Threshold', 'Unit', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {slas.map((sla) => (
                <tr key={sla.slaId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{sla.serviceName ?? serviceNameMap[sla.serviceId] ?? `#${sla.serviceId}`}</td>
                  <td className="px-5 py-3"><Badge color="blue">{sla.metric}</Badge></td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{sla.operator.replace('_', ' ')}</td>
                  <td className="px-5 py-3 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{String(sla.threshold)}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{sla.unit}</td>
                  <td className="px-5 py-3"><SlaStatusBadge status={sla.status} /></td>
                  <td className="px-5 py-3">
                    {canWriteSla && (
                      <div className="flex items-center gap-2">
                        {/* Edit (patch) button */}
                        <button
                          onClick={() => openEditModal(sla)}
                          title="Edit SLA"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {/* Enable / Disable toggle */}
                        <button
                          onClick={() => toggleSlaMut.mutate({ id: sla.slaId, status: sla.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                          className="text-xs text-blue-600 hover:underline cursor-pointer"
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

      {/* SLA Breaches */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            SLA Breach Events
          </h3>
          <Badge color={breaches?.some((b) => !b.resolved) ? 'red' : 'green'} dot>
            {breaches?.filter((b) => !b.resolved).length ?? 0} unresolved
          </Badge>
        </div>
        {!breaches || breaches.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-300" />
            <p>No SLA breaches — all good!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {['SLA', 'Service', 'Actual', 'Threshold', 'Breach Time', 'Resolved', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {breaches.map((b) => (
                <tr key={b.breachId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">SLA #{b.slaId}</td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{b.serviceName ?? serviceNameMap[b.serviceId] ?? `#${b.serviceId}`}</td>
                  <td className="px-5 py-3 font-mono text-red-600 dark:text-red-400 font-semibold">{String(b.actualValue)}</td>
                  <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">{String(b.thresholdValue)}</td>
                  <td className="px-5 py-3 text-slate-400 dark:text-slate-500 text-xs">{new Date(b.breachTime).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <Badge color={b.resolved ? 'green' : 'red'} dot>{b.resolved ? 'Yes' : 'No'}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {!b.resolved && canResolveBreach && (
                      <button onClick={() => setBreachModal(b.breachId)} className="text-xs text-blue-600 hover:underline cursor-pointer">
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Create SLA Modal ──────────────────────────────────────── */}
      <Modal open={slaModal} onClose={() => setSlaModal(false)} title="Create SLA Definition"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSlaModal(false)}>Cancel</Button>
            <Button loading={createSlaMut.isPending} onClick={() => createSlaMut.mutate()}>Create SLA</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Service" value={slaForm.serviceId}
            onChange={(e) => setSlaForm((f) => ({ ...f, serviceId: e.target.value }))}
            placeholder="Select service"
            options={(services ?? []).map((s) => ({ value: String(s.serviceId), label: s.name }))}
          />
          <Input label="Metric Name" value={slaForm.metric}
            onChange={(e) => setSlaForm((f) => ({ ...f, metric: e.target.value }))}
            placeholder="e.g. BANDWIDTH, LATENCY, UPTIME" />
          <Select label="Operator" value={slaForm.operator}
            onChange={(e) => setSlaForm((f) => ({ ...f, operator: e.target.value }))}
            options={[
              { value: 'LESS_THAN', label: 'Less Than' },
              { value: 'GREATER_THAN', label: 'Greater Than' },
              { value: 'EQUALS', label: 'Equals' },
            ]}
          />
          <Input label="Threshold" type="number" value={slaForm.threshold}
            onChange={(e) => setSlaForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="e.g. 1000" />
          <Input label="Unit" value={slaForm.unit}
            onChange={(e) => setSlaForm((f) => ({ ...f, unit: e.target.value }))} placeholder="e.g. Mbps, ms, %" />
          <Input label="Description" value={slaForm.description}
            onChange={(e) => setSlaForm((f) => ({ ...f, description: e.target.value }))} placeholder="What this SLA monitors" />
        </div>
      </Modal>

      {/* ── Edit (Patch) SLA Modal ────────────────────────────────── */}
      <Modal
        open={!!editSla}
        onClose={() => setEditSla(null)}
        title={`Edit SLA #${editSla?.slaId} — ${editSla?.metric}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditSla(null)}>Cancel</Button>
            <Button loading={patchSlaMut.isPending} onClick={() => patchSlaMut.mutate()}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            Metric and Service cannot be changed. Only threshold, operator, unit and description are editable.
          </p>
          <Select
            label="Operator"
            value={editForm.operator}
            onChange={(e) => setEditForm((f) => ({ ...f, operator: e.target.value }))}
            options={[
              { value: 'LESS_THAN', label: 'Less Than' },
              { value: 'GREATER_THAN', label: 'Greater Than' },
              { value: 'EQUALS', label: 'Equals' },
            ]}
          />
          <Input
            label="Threshold"
            type="number"
            value={editForm.threshold}
            onChange={(e) => setEditForm((f) => ({ ...f, threshold: e.target.value }))}
            placeholder="e.g. 1000"
          />
          <Input
            label="Unit"
            value={editForm.unit}
            onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="e.g. Mbps, ms, %"
          />
          <Input
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What this SLA monitors"
          />
        </div>
      </Modal>

      {/* ── Log Usage Modal ──────────────────────────────────────── */}
      <Modal
        open={usageModal}
        onClose={() => setUsageModal(false)}
        title="Log Usage Record"
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
          <p className="text-xs text-slate-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            ⏱ The SLA scheduler runs every <strong>60 seconds</strong>. After logging, wait up to a minute then refresh the Breach Events table to see any new breaches.
          </p>
          <Select
            label="Service"
            value={usageForm.serviceId}
            onChange={(e) => setUsageForm((f) => ({ ...f, serviceId: e.target.value }))}
            placeholder="Select service"
            options={(services ?? []).map((s) => ({ value: String(s.serviceId), label: s.name }))}
          />
          <Select
            label="Metric Type"
            value={usageForm.metricType}
            onChange={(e) => setUsageForm((f) => ({ ...f, metricType: e.target.value }))}
            options={[
              { value: 'BANDWIDTH',      label: 'BANDWIDTH' },
              { value: 'CALL_DURATION',  label: 'CALL_DURATION' },
              { value: 'DATA_TRANSFER',  label: 'DATA_TRANSFER' },
              { value: 'MESSAGE_COUNT',  label: 'MESSAGE_COUNT' },
              { value: 'VIDEO_MINUTES',  label: 'VIDEO_MINUTES' },
              { value: 'API_CALLS',      label: 'API_CALLS' },
            ]}
          />
          <Input
            label="Value"
            type="number"
            value={usageForm.value}
            onChange={(e) => setUsageForm((f) => ({ ...f, value: e.target.value }))}
            placeholder="e.g. 5000"
          />
          <Input
            label="Unit"
            value={usageForm.unit}
            onChange={(e) => setUsageForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="e.g. Mbps, minutes, count"
          />
        </div>
      </Modal>

      {/* ── Resolve Breach Modal ──────────────────────────────────── */}
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
          <textarea value={breachNotes} onChange={(e) => setBreachNotes(e.target.value)} rows={3}
            placeholder="Describe what was done to resolve this breach..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}
