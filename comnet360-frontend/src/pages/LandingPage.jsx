import { Link } from 'react-router-dom';
import {
  Shield, Server, AlertTriangle, Activity, BarChart2,
  Bell, Lock, Users, ArrowRight, CheckCircle, Wifi, TrendingUp,
  Phone, Video, MessageSquare,
} from 'lucide-react';

const FEATURES = [
  { icon: <Server className="w-5 h-5" />,        color: 'text-sky-600 bg-sky-50 border-sky-200',           title: 'Service Provisioning', desc: 'Full lifecycle control for Voice, Video & Messaging services.' },
  { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-rose-600 bg-rose-50 border-rose-200',         title: 'Incident Management',  desc: 'Detect, assign and resolve incidents with real-time tracking.' },
  { icon: <Activity className="w-5 h-5" />,      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',title: 'SLA Monitoring',       desc: 'Define thresholds and get instant alerts when breaches occur.' },
  { icon: <BarChart2 className="w-5 h-5" />,     color: 'text-violet-600 bg-violet-50 border-violet-200',   title: 'Usage Analytics',      desc: 'Track KPIs, usage trends and service health over time.' },
  { icon: <Bell className="w-5 h-5" />,          color: 'text-amber-600 bg-amber-50 border-amber-200',      title: 'Notifications',        desc: 'Real-time in-app and email alerts for incidents, SLA breaches and assignments.' },
  { icon: <Lock className="w-5 h-5" />,          color: 'text-indigo-600 bg-indigo-50 border-indigo-200',   title: 'Role-Based Access',    desc: 'Six roles from Admin to Enterprise User, each with precise permissions.' },
];

const ROLES = [
  { icon: <Shield className="w-4 h-4" />,      role: 'Admin',              desc: 'Full platform control',  color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { icon: <Server className="w-4 h-4" />,      role: 'Service Manager',    desc: 'Provision & configure',  color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { icon: <TrendingUp className="w-4 h-4" />,  role: 'Operations Head',    desc: 'Operational oversight',  color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { icon: <Wifi className="w-4 h-4" />,        role: 'Network Engineer',   desc: 'Incident resolution',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { icon: <CheckCircle className="w-4 h-4" />, role: 'Compliance Officer', desc: 'Audit & reporting',      color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { icon: <Users className="w-4 h-4" />,       role: 'Enterprise User',    desc: 'Service consumption',    color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased bg-white text-slate-900">

      {/* ── Navbar ── */}
      <header className="bg-white/95 border-b border-sky-100 backdrop-blur sticky top-0 z-50">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-base tracking-tight text-slate-900">
              Comnet<span className="text-sky-500">-360</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {[['#features','Features'],['#roles','Users & Roles'],['#cta','Get Started']].map(([href, label]) => (
              <a key={href} href={href}
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors">
                {label}
              </a>
            ))}
          </div>

          <Link to="/login"
            className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors">
            Sign in
          </Link>

        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="py-20 px-6" style={{ background: 'linear-gradient(160deg, #e0f2fe 0%, #f0f9ff 55%, #ffffff 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest text-sky-500 uppercase mb-4">
            Enterprise Communication &amp; Service Management Platform
          </p>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.06] mb-6 text-slate-900">
            Comnet<span className="text-sky-500">-360</span>
          </h1>

          <p className="text-lg leading-relaxed mb-10 max-w-xl mx-auto text-slate-600">
            An enterprise communication and service management platform
            that gives telecom teams full control. From provisioning Voice, Video &amp; Messaging
            services to monitoring SLA compliance, resolving incidents and auditing usage in real time.
          </p>

        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-sky-100 bg-sky-50">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: 'Live',      label: 'SLA Monitoring',   color: 'text-emerald-500' },
            { value: 'Instant',  label: 'Breach Alerts',    color: 'text-sky-500'     },
            { value: '6',        label: 'User Role Types',  color: 'text-violet-500'  },
            { value: '3',        label: 'Service Types',    color: 'text-amber-500'   },
          ].map(s => (
            <div key={s.label}>
              <p className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</p>
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Services ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-sky-500 uppercase mb-3">What We Offer</p>
            <h2 className="text-3xl sm:text-4xl font-black mb-3 text-slate-900">Services We Provide</h2>
            <p className="text-slate-500">Three enterprise-grade communication service types, fully managed on the platform.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Voice */}
            <div className="rounded-2xl border border-sky-100 bg-white p-8 transition-all duration-200 hover:shadow-lg hover:shadow-sky-100 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-sky-500/20">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900">Voice Services</h3>
              <p className="text-sm leading-relaxed mb-5 text-slate-500">
                Enterprise-grade voice communication infrastructure. Manage call routing,
                corporate voice gateways and telephony configuration with full SLA oversight.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                {['Corporate Voice Gateway','Call Volume Monitoring','Latency & Quality SLAs','Real-time Incident Alerts'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Video */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-200 hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-1 relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
                <Video className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900">Video Services</h3>
              <p className="text-sm leading-relaxed mb-5 text-slate-500">
                High-definition video conferencing and collaboration infrastructure for enterprises.
                Monitor uptime and usage metrics across all video hubs.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                {['Enterprise Video Conferencing','Usage Below Minimum Detection','Video Hub Management','Bandwidth SLA Tracking'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Messaging */}
            <div className="rounded-2xl border border-sky-100 bg-white p-8 transition-all duration-200 hover:shadow-lg hover:shadow-sky-100 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900">Messaging Services</h3>
              <p className="text-sm leading-relaxed mb-5 text-slate-500">
                Scalable SMS broadcast and unified messaging APIs for enterprise communication.
                Track message volumes, queue depth and delivery SLAs in real time.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                {['SMS Broadcast Service','Unified Messaging Platform','Queue Depth Monitoring','Message Count SLA Alerts'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 bg-sky-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3 text-slate-900">Everything in one platform</h2>
            <p className="text-slate-500">Built for the full operations lifecycle, from provisioning to compliance.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title}
                className="border border-sky-100 bg-white rounded-xl p-6 hover:shadow-md hover:shadow-sky-100 hover:-translate-y-1 transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-bold mb-1.5 text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section id="roles" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3 text-slate-900">Designed for Every Role in Your Organization</h2>
            <p className="text-slate-500">Six dedicated roles ensuring each user has the right access and visibility.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLES.map(r => (
              <div key={r.role}
                className="flex items-center gap-3 border border-sky-100 bg-white rounded-xl p-4 hover:shadow-sm hover:border-sky-200 transition-all">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${r.color}`}>
                  {r.icon}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{r.role}</p>
                  <p className="text-xs text-slate-400">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="py-24 px-6 text-center"
        style={{ background: 'linear-gradient(160deg, #0EA5E9 0%, #06B6D4 100%)' }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-white">Ready to get started?</h2>
          <p className="mb-8 text-sky-100">
            Manage your communications infrastructure with real-time monitoring and incident management.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-sky-600 bg-white hover:bg-sky-50 rounded-xl transition-all hover:-translate-y-px shadow-lg">
            Create free account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 bg-white border-t border-sky-100">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Comnet-360 · Enterprise Communication &amp; Service Management
          </p>
        </div>
      </footer>

    </div>
  );
}
