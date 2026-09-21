"use client";

import { useEffect } from "react";

/** Mantém o número do ícone do carrinho em dia depois de mudanças feitas na página do carrinho. */
export function CartSync({ count }: { count: number }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("cart:count", { detail: count }));
  }, [count]);
  return null;
}
