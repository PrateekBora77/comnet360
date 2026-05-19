const variants = {
  primary:   'text-white font-semibold shadow-sm hover:shadow-md transition-all hover:-translate-y-px active:translate-y-0',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm font-semibold',
  danger:    'bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold shadow-sm hover:shadow-md hover:-translate-y-px transition-all',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  success:   'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-sm hover:shadow-md hover:-translate-y-px transition-all',
};

const primaryStyle = {
  background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)',
  boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  style,
  type = 'button',   // always default to "button" — never accidentally submit a form
  ...rest
}) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      style={isPrimary ? { ...primaryStyle, ...style } : style}
      className={`inline-flex items-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
