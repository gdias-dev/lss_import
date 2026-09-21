"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingLabel = "Aguarde...", className, variant = "primary" }: { children: React.ReactNode; pendingLabel?: string; className?: string; variant?: "primary" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={cn(variant === "primary" ? "btn-primary" : "btn-outline", "w-full disabled:cursor-not-allowed disabled:opacity-60", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
