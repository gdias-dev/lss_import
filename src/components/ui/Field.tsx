import { cn } from "@/lib/utils";

export interface FieldProps {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  /** Modo controlado (usado quando o valor pode ser preenchido por código, como o CEP). */
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: string[];
  hint?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const inputClass = "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none aria-[invalid=true]:border-red-400/70";

export function Field({ label, name, type = "text", autoComplete, defaultValue, value, onChange, errors, hint, inputMode, maxLength, placeholder, required = true, className }: FieldProps) {
  const id = `campo-${name}`;
  const describedBy = [errors?.length ? `${id}-erro` : null, hint ? `${id}-dica` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm text-ivory/85">
        {label}
        {!required && <span className="ml-1 text-muted">(opcional)</span>}
      </label>
      <input id={id} name={name} type={type} autoComplete={autoComplete} defaultValue={value === undefined ? defaultValue : undefined} value={value} onChange={onChange} inputMode={inputMode} maxLength={maxLength} placeholder={placeholder} aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy} className={inputClass} />
      {hint && (
        <p id={`${id}-dica`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-erro`} role="alert" className={cn("mt-1.5 text-xs text-red-300")}>
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
