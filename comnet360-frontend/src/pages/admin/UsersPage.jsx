import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Trash2, AlertTriangle, UserPlus, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { usersApi } from '../../api/auth';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Roles available when CREATING a user (admin role excluded — only one admin allowed)
const CREATE_ROLES = [
  'SERVICE_MANAGER', 'OPERATIONS_HEAD',
  'COMPLIANCE_OFFICER', 'NETWORK_ENGINEER', 'ENTERPRISE_USER',
];

// Roles available when CHANGING an existing user's role
const CHANGE_ROLES = [
  'SERVICE_MANAGER', 'OPERATIONS_HEAD',
  'COMPLIANCE_OFFICER', 'NETWORK_ENGINEER', 'ENTERPRISE_USER',
];


const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'ENTERPRISE_USER',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();

  // Create user modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm]   = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Change role modal
  const [roleTarget, setRoleTarget]   = useState(null);   // user object
  const [newRole, setNewRole]         = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
  });

  /* ── Mutations ────────────────────────────────────────────────── */

  const createMut = useMutation({
    mutationFn: () =>
      usersApi.createUser({
        name:     createForm.name.trim(),
        email:    createForm.email.trim(),
        password: createForm.password,
        phone:    createForm.phone.trim() || undefined,
        role:     createForm.role,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User "${res.data.name}" created`);
      setCreateModal(false);
      setCreateForm(emptyForm);
      setShowPassword(false);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message ?? 'Failed to create user';
      toast.error(msg);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, isActive }) => usersApi.updateStatus(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Role updated to ${newRole.replace(/_/g, ' ')}`);
      setRoleTarget(null);
      setNewRole('');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => usersApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User "${deleteTarget?.name}" deleted`);
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete user'),
  });

  /* ── Helpers ─────────────────────────────────────────────────── */
  const createFormValid =
    createForm.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email) &&
    createForm.password.length >= 8;

  const openRoleModal = (u) => {
    setRoleTarget(u);
    setNewRole(u.role);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500">{users?.length ?? 0} registered users</p>
        </div>
        {me?.role === 'ADMIN' && (
          <Button
            size="sm"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => { setCreateForm(emptyForm); setShowPassword(false); setCreateModal(true); }}
          >
            Create User
          </Button>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
        {!users || users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-sky-100">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {users.map((u) => (
                  <tr key={u.userId} className="hover:bg-sky-50 transition-colors">
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{u.name}</span>
                        {u.userId === me?.userId && <Badge color="blue">You</Badge>}
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{u.email}</td>
                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <Badge>{u.role.replace(/_/g, ' ')}</Badge>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <Badge color={u.isActive ? 'green' : 'red'} dot>
                        {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                    {/* Joined */}
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      {me?.role === 'ADMIN' && u.userId !== me.userId && (
                        <div className="flex items-center gap-2">
                          {/* Change Role */}
                          <button
                            onClick={() => openRoleModal(u)}
                            className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                          >
                            Role
                          </button>

                          {/* Activate / Deactivate */}
                          <button
                            onClick={() => statusMut.mutate({ id: u.userId, isActive: !u.isActive })}
                            className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(u)}
                            title="Delete user"
                            className="p-1 text-slate-300 hover:text-slate-600 rounded cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── Create User Modal ──────────────────────────────────────── */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Create New User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button
              loading={createMut.isPending}
              disabled={!createFormValid}
              onClick={() => createMut.mutate()}
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Create User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Jane Smith"
            autoComplete="off"
          />
          <Input
            label="Email Address"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="jane@company.com"
            autoComplete="off"
          />
          {/* Password with show/hide toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Password <span className="text-slate-400 font-normal text-xs">(min 8 characters)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {createForm.password.length > 0 && createForm.password.length < 8 && (
              <p className="text-xs text-red-500">Password must be at least 8 characters</p>
            )}
          </div>
          <Input
            label="Phone (optional)"
            value={createForm.phone}
            onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. +1 555 000 1234"
          />
          <Select
            label="Role"
            value={createForm.role}
            onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
            options={CREATE_ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))}
          />
        </div>
      </Modal>

      {/* ── Change Role Modal ──────────────────────────────────────── */}
      <Modal
        open={!!roleTarget}
        onClose={() => { setRoleTarget(null); setNewRole(''); }}
        title="Change User Role"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRoleTarget(null); setNewRole(''); }}>
              Cancel
            </Button>
            <Button
              loading={roleMut.isPending}
              disabled={!newRole || newRole === roleTarget?.role}
              onClick={() => roleMut.mutate({ id: roleTarget.userId, role: newRole })}
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
            >
              Update Role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 bg-slate-50 border border-sky-100 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0">
              {roleTarget?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{roleTarget?.name}</p>
              <p className="text-xs text-slate-400">{roleTarget?.email}</p>
            </div>
            <div className="ml-auto">
              <Badge>{roleTarget?.role?.replace(/_/g, ' ')}</Badge>
            </div>
          </div>

          <Select
            label="New Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={CHANGE_ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))}
          />

          {newRole && newRole !== roleTarget?.role && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Changing from <strong>{roleTarget?.role?.replace(/_/g, ' ')}</strong> to <strong>{newRole.replace(/_/g, ' ')}</strong>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.userId)}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              Are you sure you want to delete{' '}
              <span className="font-bold">{deleteTarget?.name}</span>?
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {deleteTarget?.email} · {deleteTarget?.role}
            </p>
            <p className="text-xs text-red-500 mt-2 font-medium">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
