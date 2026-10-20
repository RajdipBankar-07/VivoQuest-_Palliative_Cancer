import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label: string;
  id: string;
  as?: 'input' | 'textarea' | 'select';
  helperText?: string;
  error?: string;
  options?: { value: string; label: string }[];
  rows?: number;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  as = 'input',
  helperText,
  error,
  options = [],
  className = '',
  required,
  ...props
}) => {
  const isError = Boolean(error);
  const describedBy = isError ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  const baseInputStyles = `w-full px-4 py-3 rounded-xl border text-sm text-navy bg-white transition-all duration-200 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:cursor-not-allowed ${
    isError
      ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
      : 'border-border hover:border-border/80 focus:border-primary focus:ring-primary/20'
  } ${className}`;

  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      <label htmlFor={id} className="text-xs font-semibold text-navy/90 flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-destructive font-bold" aria-hidden="true">*</span>}
      </label>

      {as === 'textarea' ? (
        <textarea
          id={id}
          className={`${baseInputStyles} resize-y min-h-[100px]`}
          aria-invalid={isError}
          aria-describedby={describedBy}
          required={required}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : as === 'select' ? (
        <select
          id={id}
          className={`${baseInputStyles} appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2317324D%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:9px_9px] bg-[right_1rem_center] bg-no-repeat pr-10`}
          aria-invalid={isError}
          aria-describedby={describedBy}
          required={required}
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className={baseInputStyles}
          aria-invalid={isError}
          aria-describedby={describedBy}
          required={required}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {/* Error message */}
      {isError && (
        <p id={`${id}-error`} className="inline-flex items-center gap-1.5 text-xs text-destructive font-medium mt-0.5" role="alert">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Helper text */}
      {!isError && helperText && (
        <p id={`${id}-helper`} className="text-xs text-muted-foreground mt-0.5">
          {helperText}
        </p>
      )}
    </div>
  );
};
