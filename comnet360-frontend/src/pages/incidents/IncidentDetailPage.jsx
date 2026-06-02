import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserCheck, CheckCircle2, XCircle, MessageSquare, Plus, FileText } from 'lucide-react';
import { incidentsApi, commentsApi, actionsApi } from '../../api/incidents';
import { usersApi } from '../../api/auth';
import { servicesApi } from '../../api/services';
import { PageSpinner } from '../../components/ui/Spinner';
import { IncidentStatusBadge, SeverityBadge } from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Format role enum → readable label  e.g. NETWORK_ENGINEER → "Network Engineer"
const formatRole = (role) =>
  (role ?? '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const incidentId = Number(id);

  const [comment, setComment] = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [actionModal, setActionModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  // action form: ownerId + actionDescription (no title in backend)
  const [action, setAction] = useState({ actionDescription: '', ownerId: '' });

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => incidentsApi.getById(incidentId).then((r) => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const { data: comments } = useQuery({
    queryKey: ['incident-comments', incidentId],
    queryFn: () => commentsApi.getAll(incidentId).then((r) => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const { data: actions } = useQuery({
    queryKey: ['incident-actions', incidentId],
    queryFn: () => actionsApi.getByIncident(incidentId).then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
    enabled: hasRole('ADMIN', 'SERVICE_MANAGER', 'OPERATIONS_HEAD', 'NETWORK_ENGINEER', 'COMPLIANCE_OFFICER'),
  });

  const { data: services } = useQuery({
    queryKey: ['services-all'],
    queryFn: () => servicesApi.getAll().then((r) => r.data),
  });

  // Build name lookup maps
  const userMap = useMemo(() => {
    const m = {};
    users?.forEach((u) => { m[u.userId] = u.name; });
    if (user) m[user.userId] = user.name;
    return m;
  }, [users, user]);

  const serviceMap = useMemo(() => {
    const m = {};
    services?.forEach((s) => { m[s.serviceId] = s.name; });
    return m;
  }, [services]);

  const getUserName = (id, fallback = 'Unknown') =>
    id ? (userMap[id] ?? 'Unknown User') : fallback;

  const getServiceName = (id) => serviceMap[id] ?? `Service #${id}`;

  const resolveMut = useMutation({
    mutationFn: () => incidentsApi.resolve(incidentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incident', incidentId] }); toast.success('Incident resolved'); },
  });
  const closeMut = useMutation({
    mutationFn: () => incidentsApi.close(incidentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incident', incidentId] }); toast.success('Incident closed'); },
  });
  const assignMut = useMutation({
    // Backend reads body.get("assignedTo")
    mutationFn: () => incidentsApi.assign(incidentId, Number(assignUserId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident', incidentId] });
      toast.success('Assigned');
      setAssignModal(false);
    },
  });
  const commentMut = useMutation({
    // Backend AddCommentRequest: { comment } — NOT { content }
    mutationFn: () => commentsApi.create(incidentId, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-comments', incidentId] });
      setComment('');
    },
    onError: () => toast.error('Failed to post comment'),
  });
  const actionMut = useMutation({
    mutationFn: () =>
      actionsApi.create(incidentId, {
        ownerId: Number(action.ownerId),
        actionDescription: action.actionDescription,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-actions', incidentId] });
      toast.success('Action created');
      setActionModal(false);
      setAction({ actionDescription: '', ownerId: '' });
    },
    onError: () => toast.error('Failed to create action'),
  });
  const updateActionMut = useMutation({
    mutationFn: ({ actionId, status }) =>
      actionsApi.updateStatus(actionId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incident-actions', incidentId] }),
    onError: () => toast.error('Failed to update action status'),
  });


  if (isLoading) return <PageSpinner />;
  if (!incident) return <div className="p-6 text-slate-500">Incident not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to incidents
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{incident.title}</h2>
              <SeverityBadge severity={incident.severity} />
              <IncidentStatusBadge status={incident.status} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {hasRole('ADMIN', 'SERVICE_MANAGER') &&
              (incident.status === 'OPEN' || incident.status === 'IN_PROGRESS') && (
              <Button size="sm" variant="secondary" icon={<UserCheck className="w-3 h-3" />} onClick={() => setAssignModal(true)}>
                {incident.assignedTo ? 'Reassign' : 'Assign'}
              </Button>
            )}
            {(incident.status === 'OPEN' || incident.status === 'IN_PROGRESS') &&
              hasRole('ADMIN', 'NETWORK_ENGINEER', 'SERVICE_MANAGER') && (
              <Button size="sm" variant="success" icon={<CheckCircle2 className="w-3 h-3" />}
                loading={resolveMut.isPending} onClick={() => resolveMut.mutate()}>
                Resolve
              </Button>
            )}
            {incident.status === 'RESOLVED' &&
              hasRole('ADMIN', 'SERVICE_MANAGER') && (
              <Button size="sm" variant="secondary" icon={<XCircle className="w-3 h-3" />}
                loading={closeMut.isPending} onClick={() => closeMut.mutate()}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {[
          { label: 'Incident #',  value: `#${incident.incidentId}` },
          { label: 'Service',     value: getServiceName(incident.serviceId) },
          { label: 'Reported by', value: getUserName(incident.reportedBy) },
          { label: 'Assigned to', value: incident.assignedTo ? getUserName(incident.assignedTo) : 'Unassigned' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-sky-100 p-4">
            <p className="text-xs text-slate-400 font-medium">{m.label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {incident.description && (
        <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-sky-50">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Description</h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{incident.description}</p>
          </div>
        </div>
      )}

      {/* Resolution actions */}
      <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sky-50">
          <h3 className="text-sm font-semibold text-slate-700">Resolution Actions</h3>
          {hasRole('ADMIN') && (
            <Button size="sm" variant="secondary" icon={<Plus className="w-3 h-3" />} onClick={() => setActionModal(true)}>
              Add Action
            </Button>
          )}
        </div>
        {!actions || actions.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-400">No actions yet</div>
        ) : (
          <div className="divide-y divide-sky-50">
            {actions.map((a) => (
              <div key={a.actionId} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.actionDescription}</p>
                  {a.dueDate && (
                    <p className="text-xs text-slate-400 mt-0.5">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">Owner: {getUserName(a.ownerId)}</p>
                </div>
                {hasRole('ADMIN', 'NETWORK_ENGINEER') && a.status !== 'COMPLETED' ? (
                  <select
                    value={a.status}
                    onChange={(e) => updateActionMut.mutate({ actionId: a.actionId, status: e.target.value })}
                    className="text-xs px-2 py-1 border border-sky-100 rounded-lg bg-white cursor-pointer"
                  >
                    {(a.status === 'PENDING'
                      ? ['PENDING', 'IN_PROGRESS']
                      : ['IN_PROGRESS', 'COMPLETED']
                    ).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.status === 'COMPLETED'  ? 'bg-green-50 text-green-700' :
                    a.status === 'IN_PROGRESS'? 'bg-blue-50 text-blue-700'  :
                                                'bg-slate-100 text-slate-500'
                  }`}>{a.status}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-sky-50">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Discussion ({comments?.length ?? 0})</h3>
        </div>
        <div className="divide-y divide-sky-50">
          {(comments ?? []).length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">No comments yet. Be the first to add one below.</div>
          ) : (
            (comments ?? []).map((c) => {
              const authorName = getUserName(c.authorId, 'Unknown');
              const initial = authorName.charAt(0).toUpperCase();
              return (
                <div key={c.commentId} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {initial}
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{authorName}</span>
                    <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  {/* Backend field is "comment" not "content" */}
                  <p className="text-sm text-slate-700 ml-9 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg px-3 py-2">{c.comment}</p>
                </div>
              );
            })
          )}
        </div>
        {hasRole('ADMIN', 'NETWORK_ENGINEER', 'SERVICE_MANAGER', 'OPERATIONS_HEAD') && (
          <div className="px-5 py-4 border-t border-sky-50 flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && commentMut.mutate()}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <Button size="sm" loading={commentMut.isPending} onClick={() => commentMut.mutate()} disabled={!comment.trim()}>
                Post
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Incident"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button loading={assignMut.isPending} disabled={!assignUserId} onClick={() => assignMut.mutate()}>Assign</Button>
          </>
        }
      >
        <Select
          label="Assign to user"
          value={assignUserId}
          onChange={(e) => setAssignUserId(e.target.value)}
          placeholder="Select a user"
          options={(users ?? [])
            .filter((u) => ['ADMIN','SERVICE_MANAGER','NETWORK_ENGINEER'].includes(u.role) && u.isActive)
            .map((u) => ({ value: String(u.userId), label: `${u.name} (${formatRole(u.role)})` }))}
        />
      </Modal>

      {/* Add Action Modal */}
      <Modal open={actionModal} onClose={() => setActionModal(false)} title="Create Resolution Action"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionModal(false)}>Cancel</Button>
            <Button loading={actionMut.isPending} disabled={!action.actionDescription.trim() || !action.ownerId} onClick={() => actionMut.mutate()}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Action Description</label>
            <textarea
              value={action.actionDescription}
              onChange={(e) => setAction((a) => ({ ...a, actionDescription: e.target.value }))}
              rows={3}
              placeholder="Describe what needs to be done..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
          <Select
            label="Owner"
            value={action.ownerId}
            onChange={(e) => setAction((a) => ({ ...a, ownerId: e.target.value }))}
            placeholder="Assign owner"
            options={(users ?? [])
              .filter((u) => u.role === 'NETWORK_ENGINEER' && u.isActive)
              .map((u) => ({ value: String(u.userId), label: u.name }))}
          />
        </div>
      </Modal>
    </div>
  );
}
