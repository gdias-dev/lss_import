import { cn } from "@/lib/utils";

/** Logo provisório em texto. Trocar pelo arquivo oficial do cliente (SVG) quando chegar. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", className)}>
      <span className="font-serif text-3xl font-semibold tracking-wider text-gold">
        LS
        <span aria-hidden className="ml-0.5 align-super text-[0.45em]">
          ✦
        </span>
      </span>
      <span className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.55em] text-gold/80">Imports</span>
    </span>
  );
}
