import { useEffect, useRef, useState } from 'react';

export default function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-slate-200/80 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

const statColors = {
  blue:   { bg: 'bg-sky-50',     icon: 'text-sky-600',     ring: 'bg-sky-100',     val: 'text-sky-700',     bar: 'bg-sky-500',     glow: 'rgba(14,165,233,0.25)'  },
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'bg-emerald-100', val: 'text-emerald-700', bar: 'bg-emerald-500', glow: 'rgba(16,185,129,0.25)'  },
  yellow: { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'bg-amber-100',   val: 'text-amber-700',   bar: 'bg-amber-500',   glow: 'rgba(245,158,11,0.25)'  },
  red:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    ring: 'bg-rose-100',    val: 'text-rose-700',    bar: 'bg-rose-500',    glow: 'rgba(244,63,94,0.25)'   },
  purple: { bg: 'bg-violet-50',  icon: 'text-violet-600',  ring: 'bg-violet-100',  val: 'text-violet-700',  bar: 'bg-violet-500',  glow: 'rgba(139,92,246,0.25)'  },
  cyan:   { bg: 'bg-cyan-50',    icon: 'text-cyan-600',    ring: 'bg-cyan-100',    val: 'text-cyan-700',    bar: 'bg-cyan-500',    glow: 'rgba(6,182,212,0.25)'   },
};

/**
 * StatCard — displays a key metric.
 * Animates the value with a smooth count-up when it changes.
 * Briefly flashes a glow border to signal a live data update.
 */
export function StatCard({ label, value, icon, color = 'blue', change }) {
  const c = statColors[color] ?? statColors.blue;

  // ── Animated count-up ────────────────────────────────────────────────────
  const [display, setDisplay]   = useState(value);
  const [glowing, setGlowing]   = useState(false);
  const prevValue               = useRef(null);
  const rafRef                  = useRef(null);

  useEffect(() => {
    const prev = prevValue.current;
    prevValue.current = value;

    if (prev === null || prev === value) return;       // first render or no change

    // Cancel any in-progress animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Flash the glow ring
    setGlowing(true);
    const clearGlow = setTimeout(() => setGlowing(false), 900);

    // Animate the number from prev → value
    const startVal  = prev ?? 0;
    const endVal    = value ?? 0;
    const duration  = 500;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);   // cubic ease-out
      setDisplay(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(endVal);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      clearTimeout(clearGlow);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <div
      className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-all duration-300 group"
      style={{
        borderColor: glowing ? c.glow.replace('0.25', '0.8') : 'rgba(226,232,240,0.8)',
        boxShadow:   glowing ? `0 0 0 3px ${c.glow}` : undefined,
        transition:  'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Icon ring */}
      <div className={`w-11 h-11 rounded-xl ${c.ring} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
        <span className={`w-5 h-5 ${c.icon}`}>{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
        <p
          className={`text-2xl font-black mt-0.5 transition-colors duration-300 ${c.val}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {display ?? value}
        </p>
        {change && <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">{change}</p>}
      </div>
    </div>
  );
}
