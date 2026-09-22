import type { FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

export function FormAlert({ state, className }: { state: FormState; className?: string }) {
  if (state.error) {
    return (
      <p role="alert" className={cn("rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200", className)}>
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className={cn("rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold", className)}>
        {state.message}
      </p>
    );
  }
  return null;
}
