import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Shield, AlertCircle, Wifi, Server } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

/* Shake animation injected once */
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

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');      // message string
  const [errKind, setErrKind]   = useState('');      // 'creds' | 'disabled' | 'network' | 'server'
  const [shake, setShake]       = useState(false);
  const formRef = useRef(null);

  /* Clear error as soon as user edits either field */
  useEffect(() => {
    if (error) { setError(''); setErrKind(''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      setErrKind('creds');
      triggerShake();
      return;
    }

    setError('');
    setErrKind('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const status  = err?.response?.status;
      const backMsg = err?.response?.data?.message ?? '';

      let kind = 'creds';
      let msg  = 'Incorrect email or password. Please try again.';

      if (!err.response || err.code === 'ERR_NETWORK') {
        kind = 'network';
        msg  = 'Cannot reach the server. Make sure all backend services are running.';
      } else if (status === 502 || status === 503) {
        kind = 'server';
        msg  = 'Service unavailable. Make sure the IAM service is registered with Eureka.';
      } else if (status === 401) {
        if (backMsg.toLowerCase().includes('disabled')) {
          kind = 'disabled';
          msg  = 'This account has been disabled. Please contact your administrator.';
        } else {
          kind = 'creds';
          msg  = 'Incorrect email or password. Please try again.';
        }
      } else if (status === 400) {
        kind = 'creds';
        msg  = backMsg || 'Invalid request. Please check your input.';
      }

      setError(msg);
      setErrKind(kind);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(false);
    // force re-mount to replay animation
    requestAnimationFrame(() => requestAnimationFrame(() => setShake(true)));
    setTimeout(() => setShake(false), 520);
  };

  const isCredErr = errKind === 'creds' || errKind === 'disabled';

  /* Error icon by kind */
  const ErrIcon = errKind === 'network' ? Wifi : errKind === 'server' ? Server : AlertCircle;

  return (
    <>
      <style>{SHAKE_CSS}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)', boxShadow: '0 8px 32px rgba(14,165,233,0.45)' }}>
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Comnet<span className="text-sky-400">-360</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 text-center max-w-[240px] leading-snug">
              Enterprise Communication &amp; Service Management Platform
            </p>
          </div>

          {/* Card */}
          <div ref={formRef} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 ${shake ? 'shake' : ''}`}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Sign in</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enter your credentials to continue</p>

            {/* Error banner */}
            {error && (
              <div className={`mb-5 flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                errKind === 'network' || errKind === 'server'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <ErrIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoFocus
                    required
                    className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg outline-none transition-all ${
                      isCredErr
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg outline-none transition-all ${
                      isCredErr
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full justify-center mt-2">
                Sign in
              </Button>
            </form>

            <div className="mt-3 text-center">
              <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-sky-600 transition-colors">
                Forgot your password?
              </Link>
            </div>

            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-blue-600 font-medium hover:underline">
                Register
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
