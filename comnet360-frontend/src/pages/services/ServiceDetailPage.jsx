import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Play, Pause, AlertOctagon, UserCheck } from 'lucide-react';
import { servicesApi, configurationsApi } from '../../api/services';
import { usersApi } from '../../api/auth';
import { PageSpinner } from '../../components/ui/Spinner';
import { ServiceStatusBadge, ServiceTypeBadge } from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const serviceId = Number(id);

  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const [addConfigOpen, setAddConfigOpen] = useState(false);
  const [config, setConfig] = useState({ parameter: '', value: '', effectiveDate: today });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => servicesApi.getById(serviceId).then((r) => r.data),
  });

  const { data: configs } = useQuery({
    queryKey: ['configurations', serviceId],
    queryFn: () => configurationsApi.getByService(serviceId).then((r) => r.data),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
    enabled: hasRole('ADMIN'),
  });

  const enterpriseUsers = useMemo(
    () => (allUsers ?? []).filter((u) => u.role === 'ENTERPRISE_USER' && u.isActive),
    [allUsers]
  );

  const userNameMap = useMemo(() => {
    const m = {};
    (allUsers ?? []).forEach((u) => { m[u.userId] = u.name; });
    return m;
  }, [allUsers]);

  const activateMut = useMutation({
    mutationFn: () => servicesApi.activate(serviceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service', serviceId] }); toast.success('Service activated'); },
    onError: () => toast.error('Failed to activate'),
  });

  const deactivateMut = useMutation({
    mutationFn: () => servicesApi.deactivate(serviceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service', serviceId] }); toast.success('Service deactivated'); },
    onError: () => toast.error('Failed to deactivate'),
  });

  const decommissionMut = useMutation({
    mutationFn: () => servicesApi.decommission(serviceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service', serviceId] }); toast.success('Service decommissioned'); },
    onError: () => toast.error('Failed to decommission'),
  });

  const assignMut = useMutation({
    mutationFn: () => {
      const user = enterpriseUsers.find((u) => u.userId === Number(assignUserId));
      return servicesApi.assign(serviceId, Number(assignUserId), user?.name ?? '');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service', serviceId] });
      const name = enterpriseUsers.find((u) => u.userId === Number(assignUserId))?.name ?? 'user';
      toast.success(`Service assigned to ${name}`);
      setAssignOpen(false);
      setAssignUserId('');
    },
    onError: () => toast.error('Failed to assign service'),
  });

  const addConfigMut = useMutation({
    mutationFn: () => configurationsApi.create(serviceId, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configurations', serviceId] });
      toast.success('Configuration added');
      setAddConfigOpen(false);
      setConfig({ parameter: '', value: '', effectiveDate: today });
    },
    onError: () => toast.error('Failed to add configuration'),
  });

  const deleteConfigMut = useMutation({
    mutationFn: (configId) => configurationsApi.delete(configId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['configurations', serviceId] }); toast.success('Deleted'); },
  });

  if (isLoading) return <PageSpinner />;
  if (!service) return <div className="p-6 text-slate-500">Service not found</div>;

  const canManage = hasRole('ADMIN', 'SERVICE_MANAGER');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to services
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{service.name}</h2>
              <ServiceTypeBadge type={service.type} />
              <ServiceStatusBadge status={service.status} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{service.description}</p>
          </div>
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              {service.status !== 'ACTIVE' && service.status !== 'DECOMMISSIONED' && (
                <Button variant="success" size="sm" icon={<Play className="w-3 h-3" />}
                  loading={activateMut.isPending} onClick={() => activateMut.mutate()}>
                  Activate
                </Button>
              )}
              {service.status === 'ACTIVE' && (
                <Button variant="secondary" size="sm" icon={<Pause className="w-3 h-3" />}
                  loading={deactivateMut.isPending} onClick={() => deactivateMut.mutate()}>
                  Deactivate
                </Button>
              )}
              {hasRole('ADMIN') && service.status !== 'DECOMMISSIONED' && (
                <Button variant="secondary" size="sm" icon={<UserCheck className="w-3 h-3" />}
                  onClick={() => { setAssignUserId(service.assignedUserId ? String(service.assignedUserId) : ''); setAssignOpen(true); }}>
                  {service.assignedUserName ? `Reassign (${service.assignedUserName})` : 'Assign User'}
                </Button>
              )}
              {hasRole('ADMIN') && service.status !== 'DECOMMISSIONED' && (
                <Button variant="danger" size="sm" icon={<AlertOctagon className="w-3 h-3" />}
                  loading={decommissionMut.isPending}
                  onClick={() => { if (confirm('Decommission this service?')) decommissionMut.mutate(); }}>
                  Decommission
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Service ID', value: `#${service.serviceId}` },
          { label: 'Owner', value: userNameMap[service.ownerUserId] ?? `User #${service.ownerUserId}` },
          { label: 'Created', value: new Date(service.createdAt).toLocaleDateString() },
          { label: 'Last Updated', value: new Date(service.updatedAt).toLocaleDateString() },
        ].map((item) => (
          <Card key={item.label} className="text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{item.label}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1 truncate" title={item.value}>{item.value}</p>
          </Card>
        ))}
        <Card className="text-center col-span-2 md:col-span-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1">Assigned Enterprise User</p>
          {service.assignedUserName ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
              {service.assignedUserName}
            </span>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500 italic">Not assigned yet</span>
          )}
        </Card>
      </div>

      {/* Configurations */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Configurations</h3>
          {canManage && (
            <Button size="sm" variant="secondary" icon={<Plus className="w-3 h-3" />}
              onClick={() => setAddConfigOpen(true)}>
              Add Config
            </Button>
          )}
        </div>
        {!configs || configs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No configurations yet</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {['Parameter', 'Value', 'Effective Date', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {configs.map((cfg) => (
                <tr key={cfg.configId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-5 py-3 font-mono text-xs text-blue-700 dark:text-sky-400 font-medium">{cfg.parameter}</td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300 text-xs">{cfg.value}</td>
                  <td className="px-5 py-3 text-slate-400 dark:text-slate-500 text-xs">{cfg.effectiveDate}</td>
                  <td className="px-5 py-3">
                    {hasRole('ADMIN') && (
                      <button
                        onClick={() => deleteConfigMut.mutate(cfg.configId)}
                        className="text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── Assign to Enterprise User Modal ──────────────────────── */}
      <Modal
        open={assignOpen}
        onClose={() => { setAssignOpen(false); setAssignUserId(''); }}
        title={service.assignedUserId ? 'Reassign Service' : 'Assign Service to Enterprise User'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAssignOpen(false); setAssignUserId(''); }}>
              Cancel
            </Button>
            <Button
              loading={assignMut.isPending}
              disabled={!assignUserId}
              onClick={() => assignMut.mutate()}
            >
              {service.assignedUserId ? 'Reassign' : 'Assign'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            The enterprise user will receive an in-app notification and can immediately
            start logging usage records for this service.
          </p>
          <Select
            label="Enterprise User"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            placeholder="Select enterprise user"
            options={enterpriseUsers.map((u) => ({
              value: String(u.userId),
              label: `${u.name} (${u.email})`,
            }))}
          />
          {enterpriseUsers.length === 0 && (
            <p className="text-xs text-amber-600">
              No active enterprise users found. Create one first from the Users page.
            </p>
          )}
        </div>
      </Modal>

      {/* Add Config Modal */}
      <Modal
        open={addConfigOpen}
        onClose={() => setAddConfigOpen(false)}
        title="Add Configuration"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddConfigOpen(false)}>Cancel</Button>
            <Button loading={addConfigMut.isPending} onClick={() => addConfigMut.mutate()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Parameter Name"
            value={config.parameter}
            onChange={(e) => setConfig((c) => ({ ...c, parameter: e.target.value }))}
            placeholder="e.g. max_channels"
          />
          <Input
            label="Value"
            value={config.value}
            onChange={(e) => setConfig((c) => ({ ...c, value: e.target.value }))}
            placeholder="e.g. 100"
          />
          <Input
            label="Effective Date"
            type="date"
            value={config.effectiveDate}
            onChange={(e) => setConfig((c) => ({ ...c, effectiveDate: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
