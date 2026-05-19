import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, icon, hint, className = '', ...rest }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          {...rest}
          className={`w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border rounded-xl transition-all outline-none font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400
            ${icon ? 'pl-9' : ''}
            ${error
              ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-500'
              : 'border-slate-200 dark:border-slate-600 focus:border-sky-400 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
            }
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
            ${className}`}
        />
      </div>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
