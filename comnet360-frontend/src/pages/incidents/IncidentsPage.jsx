import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { incidentsApi } from '../../api/incidents';
import { servicesApi } from '../../api/services';
import { usersApi } from '../../api/auth';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { IncidentStatusBadge, SeverityBadge } from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function IncidentsPage() {
  const qc = useQueryClient();
  const { hasRole, user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    serviceId: '',
  });

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents', statusFilter, severityFilter],
    queryFn: () =>
      incidentsApi
        .getAll({
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
        })
        .then((r) => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const { data: services } = useQuery({
    queryKey: ['services-all'],
    queryFn: () => servicesApi.getAll().then((r) => r.data),
  });

  // Fetch users for name lookup (ADMIN, SM, OpsHead can access)
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
    enabled: hasRole('ADMIN', 'SERVICE_MANAGER', 'OPERATIONS_HEAD'),
  });

  // Build lookup maps: id → name
  const serviceMap = useMemo(() => {
    const m = {};
    services?.forEach((s) => { m[s.serviceId] = s.name; });
    return m;
  }, [services]);

  const userMap = useMemo(() => {
    const m = {};
    users?.forEach((u) => { m[u.userId] = u.name; });
    if (me) m[me.userId] = me.name;
    return m;
  }, [users, me]);

  const getServiceName = (id) => serviceMap[id] ?? `Service #${id}`;
  const getUserName = (id) => {
    if (!id) return null;
    return userMap[id] ?? `User #${id}`;
  };

  const createMut = useMutation({
    mutationFn: () =>
      incidentsApi.create({
        title: form.title,
        description: form.description,
        severity: form.severity,
        serviceId: Number(form.serviceId),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident created');
      setCreateOpen(false);
      setForm({ title: '', description: '', severity: 'MEDIUM', serviceId: '' });
    },
    onError: () => toast.error('Failed to create incident'),
  });

  const filtered = (incidents ?? []).filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Incidents</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {incidents?.filter((i) => i.status === 'OPEN').length ?? 0} open •{' '}
            {incidents?.length ?? 0} total
          </p>
        </div>
        {hasRole('ADMIN', 'SERVICE_MANAGER', 'NETWORK_ENGINEER') && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            New Incident
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
        >
          <option value="">All statuses</option>
          {['OPEN', 'RESOLVED', 'CLOSED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
        >
          <option value="">All severities</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertTriangle className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">No incidents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['#', 'Title', 'Service', 'Severity', 'Status', 'Detected', 'Assigned To', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((inc) => (
                <tr key={inc.incidentId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500 text-xs">#{inc.incidentId}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{inc.title}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                    {getServiceName(inc.serviceId)}
                  </td>
                  <td className="px-4 py-3.5"><SeverityBadge severity={inc.severity} /></td>
                  <td className="px-4 py-3.5"><IncidentStatusBadge status={inc.status} /></td>
                  <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500 text-xs">
                    {new Date(inc.detectedDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                    {getUserName(inc.assignedTo) ?? <span className="text-slate-300">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link to={`/incidents/${inc.incidentId}`} className="text-blue-600 text-xs font-medium hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Report New Incident"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Create Incident
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Brief description of the incident"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Detailed description..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
          <Select
            label="Severity"
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'CRITICAL', label: 'Critical' },
            ]}
          />
          <Select
            label="Affected Service"
            value={form.serviceId}
            onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
            placeholder="Select a service"
            options={(services ?? []).map((s) => ({ value: String(s.serviceId), label: s.name }))}
          />
        </div>
      </Modal>
    </div>
  );
}
