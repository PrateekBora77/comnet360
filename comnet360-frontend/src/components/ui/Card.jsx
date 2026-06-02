import { useEffect, useRef, useState } from 'react';

export default function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-xl border border-sky-100 shadow-sm ${padding ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

/**
 * StatCard — displays a key metric with a simple flat icon.
 * Animates the value with a smooth count-up when it changes.
 */
export function StatCard({ label, value, icon, color, change }) {
  // ── Animated count-up ────────────────────────────────────────────────────
  const [display, setDisplay] = useState(value);
  const prevValue             = useRef(null);
  const rafRef                = useRef(null);

  useEffect(() => {
    const prev = prevValue.current;
    prevValue.current = value;

    if (prev === null || prev === value) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startVal  = prev ?? 0;
    const endVal    = value ?? 0;
    const duration  = 400;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(endVal);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 flex items-center gap-4 cursor-default">
      {/* Simple flat icon box */}
      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
        <span className="text-sky-400 [&>svg]:w-5 [&>svg]:h-5">{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
        <p
          className="text-2xl font-bold text-slate-800 mt-0.5 leading-none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {display ?? value}
        </p>
        {change && <p className="text-xs text-slate-400 mt-1">{change}</p>}
      </div>
    </div>
  );
}
