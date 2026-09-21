"use client";

import { useState } from "react";
import { inputClass } from "./Field";

export function PasswordField({ label, name, autoComplete, errors, hint }: { label: string; name: string; autoComplete: "current-password" | "new-password"; errors?: string[]; hint?: string }) {
  const [visible, setVisible] = useState(false);
  const id = `campo-${name}`;
  const describedBy = [errors?.length ? `${id}-erro` : null, hint ? `${id}-dica` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-ivory/85">
        {label}
      </label>
      <div className="relative">
        <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} maxLength={128} aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy} className={`${inputClass} pr-20`} />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-pressed={visible} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-gold transition hover:text-gold-soft">
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {hint && (
        <p id={`${id}-dica`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-erro`} role="alert" className="mt-1.5 text-xs text-red-300">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
