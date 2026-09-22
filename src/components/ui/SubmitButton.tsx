"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingLabel = "Aguarde...", className, variant = "primary", disabled = false }: { children: React.ReactNode; pendingLabel?: string; className?: string; variant?: "primary" | "outline"; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  return (
    <button type="submit" disabled={isDisabled} aria-disabled={isDisabled} className={cn(variant === "primary" ? "btn-primary" : "btn-outline", "w-full disabled:cursor-not-allowed disabled:opacity-60", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
