import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usersApi } from '../../api/auth';
import { notificationsApi } from '../../api/notifications';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const SHAKE_CSS = `
@keyframes shake {
  0%,100%{transform:translateX(0)}
  15%{transform:translateX(-6px)}
  30%{transform:translateX(6px)}
  45%{transform:translateX(-5px)}
  60%{transform:translateX(5px)}
  75%{transform:translateX(-3px)}
  90%{transform:translateX(3px)}
}
.shake { animation: shake 0.5s ease; }
`;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [shake, setShake]   = useState(false);

  const validate = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!form.name.trim())                          e.name     = 'Full name is required';
    if (!emailRegex.test(form.email.trim()))        e.email    = 'Enter a valid email address';
    if (!passwordStrong.test(form.password))        e.password = 'Min 8 chars, include uppercase, lowercase and a number';
    if (form.password !== form.confirm)             e.confirm  = 'Passwords do not match';
    return e;
  };

  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setShake(true)));
    setTimeout(() => setShake(false), 520);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      triggerShake();
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await register(form.name, form.email.trim(), form.password);
      toast.success('Account created! Welcome to ComNet360.');

      // Notify all admins about the new registration (fire-and-forget)
      try {
        const admins = await usersApi.getAdmins().then(r => r.data);
        await Promise.all(
          admins.map(admin =>
            notificationsApi.send({
              userId:        admin.userId,
              title:         'New User Registered',
              message:       `${form.name} (${form.email.trim()}) has just registered as an Enterprise User. You may want to review and update their role from the User Management page.`,
              category:      'SYSTEM_ALERT',
              channel:       'IN_APP',
              referenceType: 'USER_REGISTRATION',
            })
          )
        );
      } catch {
        // Notification failure should never block the user from entering the app
      }

      navigate('/dashboard');
    } catch (err) {
      const status  = err?.response?.status;
      const backMsg = err?.response?.data?.message ?? '';
      let msg = 'Registration failed. Please try again.';
      if (!err.response || err.code === 'ERR_NETWORK') {
        msg = 'Cannot reach the server. Make sure all backend services are running.';
      } else if (status === 409) {
        msg = 'This email address is already registered. Try signing in instead.';
      } else if (backMsg) {
        msg = backMsg;
      }
      setApiError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    // Clear field-level error on change
    if (errors[k]) setErrors((prev) => { const n = { ...prev }; delete n[k]; return n; });
    if (apiError) setApiError('');
  };

  return (
    <>
      <style>{SHAKE_CSS}</style>
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)' }}>
        <div className="w-full max-w-sm">

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)', boxShadow: '0 8px 32px rgba(14,165,233,0.45)' }}>
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              ComNet<span className="text-sky-400">360</span>
            </h1>
            <p className="text-sky-400 text-xs mt-1.5 text-center max-w-[240px] leading-snug">
              Enterprise Communication &amp; Service Management Platform
            </p>
          </div>

          <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 ${shake ? 'shake' : ''}`}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Create account</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Fill in your details to get started</p>

            {apiError && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full name"
                value={form.name}
                onChange={set('name')}
                placeholder="Jane Smith"
                icon={<User className="w-4 h-4" />}
                error={errors.name}
                required
              />
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@company.com"
                icon={<Mail className="w-4 h-4" />}
                error={errors.email}
                required
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 8 characters"
                icon={<Lock className="w-4 h-4" />}
                error={errors.password}
                required
              />
              <Input
                label="Confirm password"
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="Repeat password"
                icon={<Lock className="w-4 h-4" />}
                error={errors.confirm}
                required
              />
              <Button type="submit" loading={loading} className="w-full justify-center mt-2">
                Create account
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors">
              ← Back to homepage
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
