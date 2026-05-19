import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, User, Mail, Shield, Calendar, Phone, Pencil, Check, X,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { usersApi } from '../../api/auth';
import toast from 'react-hot-toast';

/* Role → gradient for avatar */
const roleGradients = {
  ADMIN:             'linear-gradient(135deg, #64748b, #475569)',   // slate
  SERVICE_MANAGER:   'linear-gradient(135deg, #8B5CF6, #6D28D9)',   // violet
  OPERATIONS_HEAD:   'linear-gradient(135deg, #0EA5E9, #0284C7)',   // sky
  COMPLIANCE_OFFICER:'linear-gradient(135deg, #F59E0B, #D97706)',   // amber
  NETWORK_ENGINEER:  'linear-gradient(135deg, #10B981, #059669)',   // emerald
  ENTERPRISE_USER:   'linear-gradient(135deg, #06B6D4, #0891B2)',   // cyan
};

const roleColors = {
  ADMIN:             'red',
  SERVICE_MANAGER:   'purple',
  OPERATIONS_HEAD:   'sky',
  COMPLIANCE_OFFICER:'yellow',
  NETWORK_ENGINEER:  'green',
  ENTERPRISE_USER:   'cyan',
};

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });

  const updateMut = useMutation({
    mutationFn: () =>
      usersApi.updateProfile(user.userId, {
        name:  form.name.trim()  || undefined,
        phone: form.phone.trim() || undefined,
      }),
    onSuccess: async () => {
      await refreshUser();
      toast.success('Profile updated');
      setEditing(false);
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const handleSignOut = async () => {
    await qc.cancelQueries();
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  if (!user) return null;

  const startEdit  = () => { setForm({ name: user.name, phone: user.phone ?? '' }); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setForm({ name: user.name, phone: user.phone ?? '' }); };

  const avatarGradient = roleGradients[user.role] ?? 'linear-gradient(135deg, #64748b, #475569)';
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    /* Centre the whole page content */
    <div className="min-h-full flex flex-col items-center justify-start py-6">
      <div className="w-full max-w-lg space-y-5">

        {/* ── Profile card ───────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

          {/* Coloured banner */}
          <div className="h-24 w-full" style={{
            background: 'linear-gradient(135deg, #0B1628 0%, #1E3A5F 50%, #0B1628 100%)',
          }} />

          {/* Avatar + name row (overlaps banner) */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl border-4 border-white flex-shrink-0"
                style={{ background: avatarGradient }}
              >
                {initials}
              </div>

              {/* Edit / Save buttons */}
              {!editing ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={startEdit}
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" loading={updateMut.isPending}
                    onClick={() => updateMut.mutate()}
                    icon={<Check className="w-3.5 h-3.5" />}>
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={cancelEdit}
                    icon={<X className="w-3.5 h-3.5" />}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Name + badge */}
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{user.name}</h3>
            <div className="mt-1.5">
              <Badge color={roleColors[user.role] ?? 'slate'}>
                {user.role.replace(/_/g, ' ')}
              </Badge>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-slate-700 my-5" />

            {/* View mode */}
            {!editing ? (
              <div className="space-y-1">
                {[
                  { icon: <User className="w-4 h-4" />,     label: 'Full Name',    value: user.name },
                  { icon: <Mail className="w-4 h-4" />,     label: 'Email Address',value: user.email },
                  { icon: <Phone className="w-4 h-4" />,    label: 'Phone',        value: user.phone || '—' },
                  { icon: <Shield className="w-4 h-4" />,   label: 'Role',         value: user.role.replace(/_/g, ' ') },
                  {
                    icon: <Calendar className="w-4 h-4" />,
                    label: 'Member Since',
                    value: new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    }),
                  },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
                    <span className="text-slate-300 dark:text-slate-600 flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Edit mode */
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  icon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Phone Number"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. +1 555 000 1234"
                  icon={<Phone className="w-4 h-4" />}
                />
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-3 py-2">
                    <Mail className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Email — cannot be changed</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <Shield className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Role — set by admin</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.role.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Account status ─────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">Account Status</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your account is active and in good standing</p>
            </div>
            <Badge color={user.isActive ? 'green' : 'red'} dot>
              {user.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </div>
        </div>

        {/* ── Sign out ────────────────────────────────────────── */}
        <Button
          variant="danger"
          icon={<LogOut className="w-4 h-4" />}
          onClick={handleSignOut}
          className="w-full justify-center"
        >
          Sign out of Comnet-360
        </Button>

      </div>
    </div>
  );
}
