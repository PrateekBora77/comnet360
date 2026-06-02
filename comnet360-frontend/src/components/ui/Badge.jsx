const styles = {
  sky:     { badge: 'bg-sky-100 text-sky-700 border border-sky-200',         dot: 'bg-sky-500' },
  blue:    { badge: 'bg-sky-100 text-sky-700 border border-sky-200',         dot: 'bg-sky-500' },
  green:   { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  yellow:  { badge: 'bg-amber-100 text-amber-700 border border-amber-200',   dot: 'bg-amber-500' },
  red:     { badge: 'bg-rose-100 text-rose-700 border border-rose-200',      dot: 'bg-rose-500' },
  slate:   { badge: 'bg-slate-100 text-slate-600 border border-slate-200',   dot: 'bg-slate-400' },
  purple:  { badge: 'bg-violet-100 text-violet-700 border border-violet-200',dot: 'bg-violet-500' },
  orange:  { badge: 'bg-orange-100 text-orange-700 border border-orange-200',dot: 'bg-orange-500' },
  cyan:    { badge: 'bg-cyan-100 text-cyan-700 border border-cyan-200',      dot: 'bg-cyan-500' },
};

export default function Badge({ color = 'slate', children, dot = false }) {
  const s = styles[color] ?? styles.slate;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${s.badge}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />}
      {children}
    </span>
  );
}
