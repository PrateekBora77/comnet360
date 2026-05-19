import { forwardRef } from 'react';

const Select = forwardRef(({ label, error, options, placeholder, className = '', ...rest }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{label}</label>
      )}
      <select
        ref={ref}
        {...rest}
        className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white text-slate-900 font-medium outline-none transition-all cursor-pointer appearance-none
          ${error
            ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-500'
            : 'border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
          }
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
