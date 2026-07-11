"use client";

import type { FormFieldConfig } from "../_types/contact";

interface ContactFieldProps {
  field: FormFieldConfig;
  value: string;
  error: string | null;
  onChange: (name: string, value: string) => void;
}

/**
 * Champ de formulaire réutilisable.
 * S'adapte automatiquement au type (text, email, textarea, select, checkbox).
 */
export function ContactField({
  field,
  value,
  error,
  onChange,
}: ContactFieldProps) {
  const baseInputStyle =
    "w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-orange-400/60 focus:bg-white/10 focus:ring-1 focus:ring-orange-400/30";

  const errorInputStyle = error
    ? "border-red-400/50 focus:border-red-400/60 focus:ring-red-400/30"
    : "border-white/10";

  // Champ checkbox (RGPD)
  if (field.type === "checkbox") {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`field-${field.name}`}
          className="flex cursor-pointer items-start gap-3"
        >
          <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <input
              id={`field-${field.name}`}
              name={field.name}
              type="checkbox"
              checked={value === "true"}
              onChange={(e) =>
                onChange(field.name, e.target.checked ? "true" : "false")
              }
              required={field.required}
              className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-white/20 bg-white/5 transition checked:border-orange-400 checked:bg-orange-500 focus:ring-1 focus:ring-orange-400/30"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? `error-${field.name}` : undefined}
            />
            {/* Icône coche visible uniquement quand la checkbox est cochée */}
            <svg
              className="pointer-events-none absolute hidden h-3 w-3 text-white peer-checked:block"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </span>
          <span className="text-xs leading-5 text-gray-400">
            {field.label}
            {field.required && (
              <span className="ml-1 text-orange-400">*</span>
            )}
          </span>
        </label>
        {error && (
          <p
            id={`error-${field.name}`}
            role="alert"
            className="text-xs text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`field-${field.name}`}
        className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400"
      >
        {field.label}
        {field.required && (
          <span className="ml-1 text-orange-400">*</span>
        )}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={`field-${field.name}`}
          name={field.name}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          className={`${baseInputStyle} ${errorInputStyle} resize-none`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `error-${field.name}` : undefined}
        />
      ) : field.type === "select" ? (
        <select
          id={`field-${field.name}`}
          name={field.name}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          className={`${baseInputStyle} ${errorInputStyle} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22%239ca3af%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `error-${field.name}` : undefined}
        >
          <option value="" disabled>
            {field.placeholder}
          </option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt} className="bg-[#0d1b2e]">
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`field-${field.name}`}
          name={field.name}
          type={field.type}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={`${baseInputStyle} ${errorInputStyle}`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `error-${field.name}` : undefined}
        />
      )}

      {error && (
        <p
          id={`error-${field.name}`}
          role="alert"
          className="text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
