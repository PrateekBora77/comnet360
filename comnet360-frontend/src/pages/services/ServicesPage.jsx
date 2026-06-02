import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Server, UserCheck, UserPlus, Star, MessageSquarePlus } from 'lucide-react';
import { servicesApi } from '../../api/services';
import { usersApi } from '../../api/auth';
import { notificationsApi } from '../../api/notifications';
import { slaApi } from '../../api/usage';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { ServiceStatusBadge, ServiceTypeBadge } from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

/* ── Star Rating component ─────────────────────────────────────────────────── */
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className="w-7 h-7"
            fill={(hover || value) >= star ? '#F59E0B' : 'none'}
            stroke={(hover || value) >= star ? '#F59E0B' : '#CBD5E1'}
            strokeWidth={1.5}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-semibold text-slate-600">
        {value === 0 ? 'Select rating' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
      </span>
    </div>
  );
}

const FEEDBACK_CATEGORIES = [
  { value: 'PERFORMANCE',  label: '⚡ Performance' },
  { value: 'RELIABILITY',  label: '🛡️ Reliability' },
  { value: 'SUPPORT',      label: '🤝 Support Quality' },
  { value: 'FEATURES',     label: '✨ Features' },
  { value: 'GENERAL',      label: '💬 General' },
];

/* ── Feedback Modal ────────────────────────────────────────────────────────── */
function FeedbackModal({ open, onClose, service, user }) {
  const [rating,   setRating]   = useState(0);
  const [category, setCategory] = useState('GENERAL');
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);

  // Fetch admin user IDs to send notifications to
  const { data: admins } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  () => usersApi.getAdmins().then((r) => r.data),
    enabled:  open,
    staleTime: 60_000,
  });

  const handleClose = () => {
    setRating(0); setCategory('GENERAL'); setMessage('');
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) { toast.error('Please select a star rating'); return; }
    if (!message.trim()) { toast.error('Please write a brief comment'); return; }

    setSending(true);
    const stars      = '⭐'.repeat(rating);
    const catLabel   = FEEDBACK_CATEGORIES.find(c => c.value === category)?.label ?? category;
    const title      = `Service Feedback — ${service.name}`;
    const body       =
      `${stars} ${rating}/5 · ${catLabel}\n\n"${message.trim()}"\n\n` +
      `— ${user.name} (Enterprise User) for service: ${service.name} [${service.type}]`;

    try {
      // Send to every admin
      const targets = (admins ?? []);
      if (targets.length === 0) {
        toast.error('No admin users found to send feedback to.');
        setSending(false);
        return;
      }
      await Promise.all(
        targets.map((admin) =>
          notificationsApi.send({
            userId:    admin.userId,
            title,
            message:   body,
            category:  'SERVICE_UPDATE',
            channel:   'IN_APP',
            referenceId:   service.serviceId,
            referenceType: 'SERVICE_FEEDBACK',
          })
        )
      );
      toast.success('Feedback submitted! Thank you 🙏', { duration: 4000 });
      handleClose();
    } catch {
      toast.error('Could not submit feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Rate this service`}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button loading={sending} onClick={handleSubmit}>
            Submit Feedback
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Service name badge */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-sky-100 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Server className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{service?.name}</p>
            <p className="text-xs text-slate-400">{service?.type} service</p>
          </div>
        </div>

        {/* Star rating */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Overall Rating <span className="text-rose-500">*</span>
          </label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* Category */}
        <Select
          label="Feedback Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={FEEDBACK_CATEGORIES}
        />

        {/* Message */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Your Comment <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Describe your experience with this service..."
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">{message.length}/500 characters</p>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
          <Star className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 fill-amber-400 stroke-amber-400" />
          <span>Your feedback goes directly to the platform admins to help improve service quality.</span>
        </div>
      </div>
    </Modal>
  );
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const { hasRole, user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'VOICE' });

  // Assign-to-user modal
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');

  // Feedback modal
  const [feedbackTarget, setFeedbackTarget] = useState(null);

  const isEnterpriseUser = me?.role === 'ENTERPRISE_USER';

  // Enterprise users only see their own assigned services; other roles see all
  const { data: services, isLoading } = useQuery({
    queryKey: ['services', statusFilter, typeFilter, isEnterpriseUser],
    queryFn: () =>
      isEnterpriseUser
        ? servicesApi.getMy().then((r) => r.data)
        : servicesApi
            .getAll({ status: statusFilter || undefined, type: typeFilter || undefined })
            .then((r) => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  // Fetch users for owner name lookup + assign dropdown (admin only)
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
    enabled: me?.role === 'ADMIN',
  });

  const enterpriseUsers = useMemo(
    () => (users ?? []).filter((u) => u.role === 'ENTERPRISE_USER' && u.isActive),
    [users]
  );

  const userNameMap = useMemo(() => {
    const map = {};
    users?.forEach((u) => { map[u.userId] = u.name; });
    return map;
  }, [users]);

  const getOwnerName = (ownerUserId) => {
    if (userNameMap[ownerUserId]) return userNameMap[ownerUserId];
    if (me?.userId === ownerUserId) return me.name;
    return 'Unknown User';
  };

  // Fetch SLAs so enterprise users can see their service metrics
  const { data: slas } = useQuery({
    queryKey: ['slas'],
    queryFn: () => slaApi.getAll().then(r => r.data),
    enabled: isEnterpriseUser,
    staleTime: 30_000,
  });

  // serviceId → active metric names
  const slaMetricMap = useMemo(() => {
    const m = {};
    (slas ?? []).forEach(s => {
      if (s.status !== 'ACTIVE') return;
      const id = String(s.serviceId);
      if (!m[id]) m[id] = [];
      m[id].push(s.metric.replace(/_/g, ' '));
    });
    return m;
  }, [slas]);

  const createMut = useMutation({
    mutationFn: () => servicesApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service created');
      setCreateOpen(false);
      setForm({ name: '', description: '', type: 'VOICE' });
    },
    onError: () => toast.error('Failed to create service'),
  });

  const assignMut = useMutation({
    mutationFn: () => {
      const user = enterpriseUsers.find((u) => u.userId === Number(assignUserId));
      return servicesApi.assign(assignTarget.serviceId, Number(assignUserId), user?.name ?? '');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      const userName = enterpriseUsers.find((u) => u.userId === Number(assignUserId))?.name ?? 'user';
      toast.success(`Service assigned to ${userName}`);
      setAssignTarget(null);
      setAssignUserId('');
    },
    onError: () => toast.error('Failed to assign service'),
  });

  const filtered = (services ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <PageSpinner />;

  const canCreate = hasRole('ADMIN', 'SERVICE_MANAGER');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isEnterpriseUser ? 'My Assigned Services' : 'Services'}
          </h2>
          <p className="text-sm text-slate-500">
            {isEnterpriseUser
              ? `${services?.length ?? 0} service${(services?.length ?? 0) !== 1 ? 's' : ''} assigned to you`
              : `${services?.length ?? 0} services registered`}
          </p>
        </div>
        {canCreate && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            New Service
          </Button>
        )}
      </div>

      {/* Filters — hidden for enterprise users */}
      <div className={`bg-white rounded-xl border border-sky-100 p-4 flex flex-wrap gap-3${isEnterpriseUser ? ' hidden' : ''}`}>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
        >
          <option value="">All statuses</option>
          {['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'DECOMMISSIONED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
        >
          <option value="">All types</option>
          {['VOICE', 'VIDEO', 'MESSAGING'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Server className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">No services found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 border-b border-sky-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {filtered.map((svc) => (
                <tr key={svc.serviceId} className="hover:bg-sky-50 transition-colors">
                  {/* Name + owner */}
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{svc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {svc.description?.slice(0, 55)}{svc.description?.length > 55 ? '…' : ''}
                    </p>
                    {isEnterpriseUser && slaMetricMap[String(svc.serviceId)]?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {slaMetricMap[String(svc.serviceId)].map(metric => (
                          <span key={metric} className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {metric}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5"><ServiceTypeBadge type={svc.type} /></td>
                  <td className="px-4 py-3.5"><ServiceStatusBadge status={svc.status} /></td>

                  {/* Assigned To cell */}
                  <td className="px-4 py-3.5">
                    {isEnterpriseUser ? (
                      /* Enterprise user — shows "Assigned to you" + optional feedback button */
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit">
                          <UserCheck className="w-3 h-3" /> Assigned to you
                        </span>
                        {svc.status === 'ACTIVE' && (
                          <button
                            onClick={() => setFeedbackTarget(svc)}
                            className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium border border-dashed border-amber-300 hover:border-amber-500 rounded-md px-2 py-0.5 transition-colors w-fit"
                          >
                            <Star className="w-3 h-3" /> Give Feedback
                          </button>
                        )}
                      </div>
                    ) : (svc.assignedUserName || svc.assignedUserId) ? (
                      /* Admin/other — show who it's assigned to */
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium text-xs">
                          <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                          {svc.assignedUserName || userNameMap[svc.assignedUserId] || `User #${svc.assignedUserId}`}
                        </span>
                        {hasRole('ADMIN') && svc.status !== 'DECOMMISSIONED' && (
                          <button
                            onClick={() => { setAssignTarget(svc); setAssignUserId(svc.assignedUserId ? String(svc.assignedUserId) : ''); }}
                            className="block mt-1 text-xs text-slate-400 hover:text-violet-600 underline"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Admin — not yet assigned, show Assign button */
                      hasRole('ADMIN') && svc.status !== 'DECOMMISSIONED' ? (
                        <button
                          onClick={() => { setAssignTarget(svc); setAssignUserId(''); }}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:underline transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3" /> Assign User
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">Unassigned</span>
                      )
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(svc.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3.5">
                    <Link
                      to={`/services/${svc.serviceId}`}
                      className="text-blue-600 text-xs font-medium hover:underline whitespace-nowrap"
                    >
                      Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Assign to Enterprise User Modal ─────────────────────── */}
      <Modal
        open={!!assignTarget}
        onClose={() => { setAssignTarget(null); setAssignUserId(''); }}
        title="Assign Service to Enterprise User"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAssignTarget(null); setAssignUserId(''); }}>
              Cancel
            </Button>
            <Button
              loading={assignMut.isPending}
              disabled={!assignUserId}
              onClick={() => assignMut.mutate()}
            >
              Assign
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-600">
            <span className="font-medium text-slate-800">{assignTarget?.name}</span>
            <span className="text-slate-400 ml-2">({assignTarget?.type})</span>
          </div>
          <p className="text-xs text-slate-500">
            The selected enterprise user will receive an in-app notification and gain access
            to this service to log usage records.
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

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Service"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMut.isPending} onClick={() => createMut.mutate()}>
              Create Service
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Service Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Corporate Voice Gateway"
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Describe the service..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
          <Select
            label="Service Type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={[
              { value: 'VOICE', label: 'Voice' },
              { value: 'VIDEO', label: 'Video' },
              { value: 'MESSAGING', label: 'Messaging' },
            ]}
          />
        </div>
      </Modal>

      {/* ── Service Feedback Modal (enterprise users only) ───────── */}
      {isEnterpriseUser && (
        <FeedbackModal
          open={!!feedbackTarget}
          onClose={() => setFeedbackTarget(null)}
          service={feedbackTarget ?? {}}
          user={me}
        />
      )}
    </div>
  );
}
