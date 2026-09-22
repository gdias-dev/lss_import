"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/money";

function useCountdown(expiresAt: string | null) {
  const [msLeft, setMsLeft] = useState(() => (expiresAt ? new Date(expiresAt).getTime() - Date.now() : null));
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setMsLeft(new Date(expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (msLeft === null) return null;
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return { minutes: Math.floor(total / 60), seconds: total % 60, expired: msLeft <= 0 };
}

export function PixPanel({ orderId, totalCents, qrCode, qrCodeBase64, expiresAt }: { orderId: string; totalCents: number; qrCode: string | null; qrCodeBase64: string | null; expiresAt: string | null }) {
  const countdown = useCountdown(expiresAt);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>("AGUARDANDO_PAGAMENTO");

  useEffect(() => {
    if (status !== "AGUARDANDO_PAGAMENTO") return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/pedidos/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          if (data.status) setStatus(data.status);
        }
      } catch {
        // sem internet momentânea: tenta de novo no próximo ciclo
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [orderId, status]);

  async function copy() {
    if (!qrCode) return;
    await navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (status === "PAGO") {
    return (
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-8 text-center">
        <p className="font-serif text-2xl text-gold">Pagamento confirmado!</p>
        <p className="mt-2 text-sm text-ivory/80">Recebemos o seu Pix. Já vamos preparar o seu pedido.</p>
      </div>
    );
  }
  if (status === "CANCELADO") {
    return (
      <div className="rounded-2xl border border-red-400/40 bg-red-400/10 p-8 text-center">
        <p className="font-serif text-2xl text-red-200">Pix não confirmado a tempo</p>
        <p className="mt-2 text-sm text-ivory/80">O prazo de pagamento expirou e o pedido foi cancelado. Você pode fazer um novo pedido quando quiser.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-8 text-center">
      <p className="mb-1 text-sm text-muted">Pague com Pix para confirmar o pedido</p>
      <p className="mb-6 font-serif text-3xl text-ivory">{formatBRL(totalCents)}</p>

      {qrCodeBase64 && (
        <div className="mx-auto mb-6 w-56 overflow-hidden rounded-xl border border-line bg-white p-3">
          <Image src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code do Pix" width={200} height={200} className="h-auto w-full" unoptimized />
        </div>
      )}

      {qrCode && (
        <div className="mb-4">
          <label htmlFor="pix-copia-cola" className="mb-2 block text-sm text-ivory/85">
            Ou copie o código
          </label>
          <div className="flex gap-2">
            <input id="pix-copia-cola" readOnly value={qrCode} className="min-w-0 flex-1 truncate rounded-lg border border-line bg-ink-soft px-3 py-2 text-xs text-ivory" />
            <button type="button" onClick={copy} className="btn-outline shrink-0 px-4 py-2 text-sm">
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {countdown && !countdown.expired && (
        <p className="text-sm text-gold" aria-live="polite">
          Expira em {String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
        </p>
      )}
      <p className="mt-4 text-xs text-muted">Assim que o pagamento for confirmado, esta página atualiza sozinha.</p>
    </div>
  );
}
