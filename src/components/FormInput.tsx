import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormInput({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        {...props}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-primary-800/50 border border-accent-500/20
          text-white placeholder-gray-500
          input-focus
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function FormTextarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <textarea
        {...props}
        rows={4}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-primary-800/50 border border-accent-500/20
          text-white placeholder-gray-500
          input-focus resize-none
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export function FormSelect({ label, options, value, onChange, error, placeholder }: SelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-primary-800/50 border border-accent-500/20
          text-white
          input-focus
          ${error ? 'border-red-500' : ''}
        `}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
