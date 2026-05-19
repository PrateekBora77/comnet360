import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Shield, KeyRound, Lock, ArrowLeft, RefreshCw } from 'lucide-react';
import { authApi } from '../../api/auth';
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

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // ── Step control: 'email' → 'otp' ────────────────────────────────────────
  const [step, setStep] = useState('email');   // 'email' | 'otp'

  // ── Email step state ──────────────────────────────────────────────────────
  const [email, setEmail]           = useState('');
  const [emailLoading, setEmailLoad] = useState(false);

  // ── OTP step state ────────────────────────────────────────────────────────
  const [otp, setOtp]               = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPass]   = useState('');
  const [confirmPass, setConfirm]   = useState('');
  const [otpLoading, setOtpLoad]    = useState(false);
  const [resendLoading, setResend]  = useState(false);
  const [resendTimer, setTimer]     = useState(0);

  // ── Shake animation ───────────────────────────────────────────────────────
  const [shake, setShake] = useState(false);
  const formRef = useRef(null);

  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setShake(true)));
    setTimeout(() => setShake(false), 520);
  };

  // OTP digit refs for auto-focus
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // ── Start resend countdown (60 s) ─────────────────────────────────────────
  const startTimer = () => {
    setTimer(60);
    const t = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) { triggerShake(); return; }

    setEmailLoad(true);
    try {
      await authApi.forgotPassword(email.trim());
      toast.success('OTP sent! Check your email inbox.');
      setStep('otp');
      startTimer();
    } catch {
      toast.error('Failed to send OTP. Please try again.');
      triggerShake();
    } finally {
      setEmailLoad(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResend(true);
    try {
      await authApi.forgotPassword(email.trim());
      toast.success('New OTP sent to your email!');
      setOtp(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
      startTimer();
    } catch {
      toast.error('Failed to resend OTP.');
    } finally {
      setResend(false);
    }
  };

  // ── OTP digit input handling ──────────────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;           // digits only
    const next = [...otp];
    next[idx] = val.slice(-1);                // take last char
    setOtp(next);
    if (val && idx < 5) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    otpRefs[Math.min(pasted.length, 5)].current?.focus();
  };

  // ── Step 2: Reset Password ────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');

    if (otpValue.length < 6) {
      toast.error('Please enter the full 6-digit OTP.');
      triggerShake(); return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      triggerShake(); return;
    }
    if (newPassword !== confirmPass) {
      toast.error('Passwords do not match.');
      triggerShake(); return;
    }

    setOtpLoad(true);
    try {
      await authApi.resetPassword(email.trim(), otpValue, newPassword);
      toast.success('Password reset! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Invalid or expired OTP.';
      toast.error(msg);
      triggerShake();
    } finally {
      setOtpLoad(false);
    }
  };

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
          <div ref={formRef} className={`bg-white rounded-2xl shadow-2xl p-8 ${shake ? 'shake' : ''}`}>

            {/* ── STEP 1: Email ──────────────────────────────────────────────── */}
            {step === 'email' && (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-sky-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 leading-tight">Forgot Password</h2>
                    <p className="text-xs text-slate-400">Step 1 of 2</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-6 mt-2">
                  Enter your registered email and we'll send a 6-digit OTP.
                </p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
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
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none
                                   focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-60
                               text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {emailLoading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Sending OTP…</>
                    ) : (
                      'Send OTP'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 2: OTP + New Password ────────────────────────────────── */}
            {step === 'otp' && (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 leading-tight">Enter OTP</h2>
                    <p className="text-xs text-slate-400">Step 2 of 2</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-5 mt-2">
                  We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span>.
                  It expires in 5 minutes.
                </p>

                <form onSubmit={handleReset} className="space-y-5">
                  {/* OTP boxes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      6-Digit OTP
                    </label>
                    <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={otpRefs[idx]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-10 h-12 text-center text-lg font-black border-2 rounded-xl outline-none
                                     transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-100
                                     border-slate-200 text-slate-800"
                        />
                      ))}
                    </div>
                    {/* Resend */}
                    <div className="flex items-center justify-end mt-2">
                      {resendTimer > 0 ? (
                        <span className="text-xs text-slate-400">
                          Resend in {resendTimer}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={resendLoading}
                          className="text-xs text-sky-600 hover:underline font-medium disabled:opacity-50"
                        >
                          {resendLoading ? 'Sending…' : 'Resend OTP'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none
                                   focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        value={confirmPass}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg outline-none transition-all ${
                          confirmPass && confirmPass !== newPassword
                            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                      />
                    </div>
                    {confirmPass && confirmPass !== newPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60
                               text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {otpLoading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Resetting…</>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </form>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(['','','','','','']); }}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Use a different email
                </button>
              </>
            )}

            {/* Back to login */}
            <p className="mt-5 text-center text-sm text-slate-500">
              Remember your password?{' '}
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
