import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Server, AlertTriangle, Activity, BarChart2,
  Bell, Lock, Users, ArrowRight, CheckCircle, Wifi, TrendingUp,
  Sun, Moon, Phone, Video, MessageSquare,
} from 'lucide-react';

const FEATURES = [
  { icon: <Server className="w-5 h-5" />,        color: 'text-sky-600 bg-sky-50 border-sky-200',           title: 'Service Provisioning', desc: 'Full lifecycle control for Voice, Video & Messaging services.' },
  { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-rose-600 bg-rose-50 border-rose-200',         title: 'Incident Management',  desc: 'Detect, assign and resolve incidents with real-time tracking.' },
  { icon: <Activity className="w-5 h-5" />,      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',title: 'SLA Monitoring',       desc: 'Define thresholds and get instant alerts when breaches occur.' },
  { icon: <BarChart2 className="w-5 h-5" />,     color: 'text-violet-600 bg-violet-50 border-violet-200',   title: 'Usage Analytics',      desc: 'Track KPIs, usage trends and service health over time.' },
  { icon: <Bell className="w-5 h-5" />,          color: 'text-amber-600 bg-amber-50 border-amber-200',      title: 'Notifications',        desc: 'Real-time in-app alerts for incidents, SLA breaches and assignments.' },
  { icon: <Lock className="w-5 h-5" />,          color: 'text-indigo-600 bg-indigo-50 border-indigo-200',   title: 'Role-Based Access',    desc: 'Six roles — from Admin to Enterprise User — with precise permissions.' },
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
  const [dark, setDark] = useState(true);

  // ── Theme tokens ──────────────────────────────────────────
  const t = dark ? {
    page:        'bg-[#060C18] text-white',
    nav:         'bg-[#060C18]/95 border-white/8',
    navLink:     'text-slate-400 hover:text-white hover:bg-white/8',
    logo:        'text-white',
    heroGrad:    'linear-gradient(160deg,#060C18 0%,#0B1628 60%,#0A1020 100%)',
    heroBadge:   'bg-white/8 border-white/12',
    heroBadgeTxt:'text-slate-400',
    heroSub:     'text-slate-400',
    heroBtn2:    'text-slate-300 border-white/15 hover:border-white/30',
    statsStrip:  'bg-[#080F1C] border-white/6',
    statLabel:   'text-slate-500',
    featBg:      'bg-[#080F1C]',
    featHeading: 'text-white',
    featSub:     'text-slate-500',
    card:        'bg-[#0D1826] border-white/8 hover:border-white/16',
    cardTitle:   'text-white',
    cardDesc:    'text-slate-500',
    rolesBg:     'bg-[#060C18]',
    roleCard:    'bg-[#0D1826] border-white/8',
    roleTitle:   'text-white',
    roleDesc:    'text-slate-500',
    ctaGrad:     'linear-gradient(160deg,#040810,#071020)',
    ctaTitle:    'text-white',
    ctaSub:      'text-slate-400',
    footerBg:    '#040A14',
    footerBorder:'rgba(255,255,255,0.06)',
    footerText:  'text-slate-600',
    footerLogo:  'text-white',
    toggle:      'bg-white/8 border-white/12 text-slate-300 hover:bg-white/15',
  } : {
    page:        'bg-slate-50 text-slate-900',
    nav:         'bg-white/95 border-slate-200',
    navLink:     'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    logo:        'text-slate-900',
    heroGrad:    'linear-gradient(160deg,#e0f2fe 0%,#f0f9ff 60%,#e8f4fd 100%)',
    heroBadge:   'bg-sky-50 border-sky-200',
    heroBadgeTxt:'text-sky-700',
    heroSub:     'text-slate-600',
    heroBtn2:    'text-slate-700 border-slate-300 hover:border-slate-400',
    statsStrip:  'bg-white border-slate-200',
    statLabel:   'text-slate-500',
    featBg:      'bg-white',
    featHeading: 'text-slate-900',
    featSub:     'text-slate-500',
    card:        'bg-white border-slate-200 hover:border-slate-300',
    cardTitle:   'text-slate-900',
    cardDesc:    'text-slate-500',
    rolesBg:     'bg-slate-100',
    roleCard:    'bg-white border-slate-200',
    roleTitle:   'text-slate-900',
    roleDesc:    'text-slate-400',
    ctaGrad:     'linear-gradient(160deg,#0EA5E9,#0284C7)',
    ctaTitle:    'text-white',
    ctaSub:      'text-sky-100',
    footerBg:    '#f8fafc',
    footerBorder:'#e2e8f0',
    footerText:  'text-slate-400',
    footerLogo:  'text-slate-800',
    toggle:      'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200',
  };

  // Hero title colour
  const heroTitle = dark
    ? 'text-white'
    : 'text-slate-900';
  const heroAccent = dark
    ? { background:'linear-gradient(90deg,#38BDF8,#06B6D4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }
    : { color: '#0EA5E9' };

  return (
    <div className={`min-h-screen antialiased transition-colors duration-300 ${t.page}`}>

      {/* ── Navbar ── */}
      <header className={`border-b backdrop-blur sticky top-0 z-50 transition-colors duration-300 ${t.nav}`}>
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className={`font-black text-base tracking-tight ${t.logo}`}>
              Comnet<span className="text-sky-500">-360</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {[['#features','Features'],['#roles','Users & Roles'],['#cta','Get Started']].map(([href, label]) => (
              <a key={href} href={href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${t.navLink}`}>
                {label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setDark(!dark)}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${t.toggle}`}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/login"
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${t.navLink}`}>
              Sign in
            </Link>
            <Link to="/register"
              className="px-4 py-2 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="py-20 px-6 transition-all duration-300"
        style={{ background: t.heroGrad }}>
        <div className="max-w-3xl mx-auto text-center">
          <div>
            <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 mb-8 ${t.heroBadge}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className={`text-xs font-semibold ${t.heroBadgeTxt}`}>Real-time monitoring active</span>
            </div>

            <p className="text-xs font-bold tracking-widest text-sky-500 uppercase mb-4">
              Enterprise Communication &amp; Service Management Platform
            </p>

            <h1 className={`text-5xl sm:text-6xl font-black tracking-tight leading-[1.06] mb-6 ${heroTitle}`}>
              Comnet
              <span style={heroAccent}>-360</span>
            </h1>

            <p className={`text-lg leading-relaxed mb-10 max-w-xl mx-auto ${t.heroSub}`}>
              An enterprise communication and service management platform
              that gives telecom teams full control. From provisioning Voice, Video &amp; Messaging
              services to monitoring SLA compliance, resolving incidents and auditing usage in real time.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-bold text-white rounded-xl transition-all hover:-translate-y-px"
                style={{ background:'linear-gradient(135deg,#0EA5E9,#06B6D4)', boxShadow:'0 8px 28px rgba(14,165,233,0.35)' }}>
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login"
                className={`inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-bold border rounded-xl transition-all hover:-translate-y-px ${t.heroBtn2}`}>
                Sign in
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className={`border-y transition-colors duration-300 ${t.statsStrip}`}>
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value:'99.9%', label:'Platform Uptime',  color:'text-emerald-500' },
            { value:'< 2s',  label:'Alert Latency',    color:'text-sky-500' },
            { value:'6',     label:'User Role Types', color:'text-violet-500' },
            { value:'3',     label:'Service Types',    color:'text-amber-500' },
          ].map(s => (
            <div key={s.label}>
              <p className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</p>
              <p className={`text-sm font-medium ${t.statLabel}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Services ── */}
      <section className={`py-24 px-6 transition-colors duration-300 ${t.rolesBg}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-sky-500 uppercase mb-3">What We Offer</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-3 ${t.featHeading}`}>Services We Provide</h2>
            <p className={t.featSub}>Three enterprise-grade communication service types, fully managed on the platform.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Voice */}
            <div className={`rounded-2xl border p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${t.card}`}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-sky-500/25">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <h3 className={`text-xl font-black mb-2 ${t.cardTitle}`}>Voice Services</h3>
              <p className={`text-sm leading-relaxed mb-5 ${t.cardDesc}`}>
                Enterprise-grade voice communication infrastructure. Manage call routing,
                corporate voice gateways and telephony configuration with full SLA oversight.
              </p>
              <ul className={`space-y-2 text-sm ${t.cardDesc}`}>
                {['Corporate Voice Gateway','Call Volume Monitoring','Latency & Quality SLAs','Real-time Incident Alerts'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Video */}
            <div className={`rounded-2xl border p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 relative ${t.card}`}
              style={{ boxShadow: dark ? '0 0 0 1px rgba(14,165,233,0.2), 0 20px 40px rgba(14,165,233,0.08)' : undefined }}>
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-[11px] font-black px-4 py-1 rounded-full shadow-md">
                MOST USED
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
                <Video className="w-7 h-7 text-white" />
              </div>
              <h3 className={`text-xl font-black mb-2 ${t.cardTitle}`}>Video Services</h3>
              <p className={`text-sm leading-relaxed mb-5 ${t.cardDesc}`}>
                High-definition video conferencing and collaboration infrastructure for enterprises.
                Monitor packet loss, uptime and usage metrics across all video hubs.
              </p>
              <ul className={`space-y-2 text-sm ${t.cardDesc}`}>
                {['Enterprise Video Conferencing','Packet Loss Detection','Video Hub Management','Bandwidth SLA Tracking'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Messaging */}
            <div className={`rounded-2xl border p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${t.card}`}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className={`text-xl font-black mb-2 ${t.cardTitle}`}>Messaging Services</h3>
              <p className={`text-sm leading-relaxed mb-5 ${t.cardDesc}`}>
                Scalable SMS broadcast and unified messaging APIs for enterprise communication.
                Track message volumes, queue depth and delivery SLAs in real time.
              </p>
              <ul className={`space-y-2 text-sm ${t.cardDesc}`}>
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
      <section id="features" className={`py-24 px-6 transition-colors duration-300 ${t.featBg}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className={`text-3xl sm:text-4xl font-black mb-3 ${t.featHeading}`}>Everything in one platform</h2>
            <p className={t.featSub}>Built for the full operations lifecycle — from provisioning to compliance.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title}
                className={`border rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200 ${t.card}`}>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className={`font-bold mb-1.5 ${t.cardTitle}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${t.cardDesc}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section id="roles" className={`py-24 px-6 transition-colors duration-300 ${t.rolesBg}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className={`text-3xl sm:text-4xl font-black mb-3 ${t.featHeading}`}>Designed for Every Role in Your Organization</h2>
            <p className={t.featSub}>Six dedicated roles ensuring each user has the right access and visibility.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLES.map(r => (
              <div key={r.role}
                className={`flex items-center gap-3 border rounded-xl p-4 hover:shadow-sm transition-all ${t.roleCard}`}>
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${r.color}`}>
                  {r.icon}
                </div>
                <div>
                  <p className={`font-bold text-sm ${t.roleTitle}`}>{r.role}</p>
                  <p className={`text-xs ${t.roleDesc}`}>{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="py-24 px-6 text-center transition-all duration-300"
        style={{ background: t.ctaGrad }}>
        <div className="max-w-xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${t.ctaTitle}`}>Ready to get started?</h2>
          <p className={`mb-8 ${t.ctaSub}`}>
            Manage your communications infrastructure with real-time monitoring and incident management.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-white rounded-xl transition-all hover:-translate-y-px"
            style={{ background:'linear-gradient(135deg,#0EA5E9,#06B6D4)', boxShadow:'0 8px 28px rgba(14,165,233,0.35)' }}>
            Create free account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 transition-colors duration-300"
        style={{ background: t.footerBg, borderTop: `1px solid ${t.footerBorder}` }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`font-black text-sm ${t.footerLogo}`}>
              Comnet<span className="text-sky-500">-360</span>
            </span>
          </div>
          <p className={`text-xs ${t.footerText}`}>
            © {new Date().getFullYear()} Comnet-360 — Enterprise Communication &amp; Service Management
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </footer>

    </div>
  );
}
