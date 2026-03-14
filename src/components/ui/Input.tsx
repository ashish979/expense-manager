import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-lg border px-3 py-2 text-sm outline-none transition-colors
            border-gray-300 bg-white placeholder:text-gray-400
            focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
            disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
