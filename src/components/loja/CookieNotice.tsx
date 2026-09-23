"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_KEY, shouldShowCookieNotice } from "@/lib/cookie-consent";

/**
 * Aviso informativo (não é um "banner de consentimento" complexo, porque o site não usa cookies de
 * publicidade ou análise — só os essenciais para login e carrinho). Guardado no localStorage do
 * navegador, nunca em cookie ou no banco.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(shouldShowCookieNotice(localStorage.getItem(COOKIE_CONSENT_KEY)));
    } catch {
      // navegação privada ou localStorage bloqueado: não insiste, apenas não mostra o aviso
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "aceito");
    } catch {
      // segue sem salvar; o aviso pode voltar a aparecer, sem prejuízo funcional
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink-soft/95 backdrop-blur">
      <div className="container-page flex flex-col items-center gap-4 py-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-ivory/80">
          Usamos apenas cookies essenciais para você continuar logado e manter seu carrinho. Nenhum cookie de publicidade ou rastreamento.{" "}
          <Link href="/privacidade" className="text-gold underline-offset-2 hover:underline">
            Saiba mais
          </Link>
          .
        </p>
        <button type="button" onClick={accept} className="btn-primary shrink-0 px-6 py-2 text-sm">
          Entendi
        </button>
      </div>
    </div>
  );
}
