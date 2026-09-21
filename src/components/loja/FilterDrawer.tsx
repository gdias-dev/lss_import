"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** No celular os filtros ficam recolhidos atrás de um botão. No desktop aparecem sempre. */
export function FilterDrawer({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls="filtros" onClick={() => setOpen((v) => !v)} className="btn-outline w-full lg:hidden">
        {open ? "Ocultar filtros" : `Filtros${activeCount > 0 ? ` (${activeCount})` : ""}`}
      </button>
      <div id="filtros" className={cn("mt-6 lg:mt-0 lg:block", open ? "block" : "hidden")}>
        {children}
      </div>
    </div>
  );
}
