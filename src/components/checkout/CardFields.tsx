"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "@/components/ui/Field";

/**
 * Campos "seguros" do Mercado Pago (SDK v2): número, validade e CVV rodam dentro de iframes do
 * próprio Mercado Pago, então o número do cartão nunca passa pelo nosso JavaScript nem pelo nosso
 * servidor — só o token final. Não testado contra credenciais reais (sem sandbox aqui); revisar com
 * a chave pública de teste antes de publicar. Documentação: https://github.com/mercadopago/sdk-js
 */

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string) => {
      fields: {
        create: (type: string, opts: Record<string, unknown>) => { mount: (id: string) => void; unmount: () => void };
      };
      createCardToken: (opts: Record<string, unknown>) => Promise<{ id: string }>;
      getPaymentMethods: (opts: { bin: string }) => Promise<{ results: { id: string; payment_type_id: string }[] }>;
      getIssuers: (opts: { paymentMethodId: string; bin: string }) => Promise<{ id: string; name: string }[]>;
    };
  }
}

export interface TokenizedCard {
  token: string;
  paymentMethodId: string;
  issuerId: string | null;
  isDebit: boolean;
}

export function CardFields({ publicKey, onToken, onClear, disabled }: { publicKey: string; onToken: (card: TokenizedCard) => void; onClear: () => void; disabled?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const ids = { number: `mp-number-${uid}`, expiry: `mp-expiry-${uid}`, cvv: `mp-cvv-${uid}` };
  const [ready, setReady] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const mpRef = useRef<InstanceType<NonNullable<Window["MercadoPago"]>> | null>(null);
  type MpInstance = InstanceType<NonNullable<Window["MercadoPago"]>>;
  type MpField = ReturnType<MpInstance["fields"]["create"]>;
  const fieldsRef = useRef<{ number?: MpField; expiry?: MpField; cvv?: MpField }>({});

  function initFields() {
    const MercadoPagoCtor = window.MercadoPago;
    if (!MercadoPagoCtor || fieldsRef.current.number) return;
    const mp = new MercadoPagoCtor(publicKey);
    mpRef.current = mp;
    fieldsRef.current.number = mp.fields.create("cardNumber", { placeholder: "0000 0000 0000 0000" });
    fieldsRef.current.number.mount(ids.number);
    fieldsRef.current.expiry = mp.fields.create("expirationDate", { placeholder: "MM/AA" });
    fieldsRef.current.expiry.mount(ids.expiry);
    fieldsRef.current.cvv = mp.fields.create("securityCode", { placeholder: "CVV" });
    fieldsRef.current.cvv.mount(ids.cvv);
    setReady(true);
  }

  useEffect(() => {
    if (window.MercadoPago) initFields();
    return () => {
      fieldsRef.current.number?.unmount();
      fieldsRef.current.expiry?.unmount();
      fieldsRef.current.cvv?.unmount();
      fieldsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tokenize() {
    setError(null);
    onClear();
    if (!mpRef.current || !holderName.trim()) {
      setError("Preencha o nome impresso no cartão.");
      return null;
    }
    setTokenizing(true);
    try {
      const token = await mpRef.current.createCardToken({ cardholderName: holderName.trim() });
      // O "bin" (6 primeiros dígitos) vem junto do token para identificar bandeira e parcelas sem juros.
      const withBin = token as unknown as { id: string; first_six_digits?: string };
      const bin = withBin.first_six_digits;
      let paymentMethodId = "";
      let issuerId: string | null = null;
      let isDebit = false;
      if (bin) {
        const methods = await mpRef.current.getPaymentMethods({ bin });
        const method = methods.results[0];
        if (method) {
          paymentMethodId = method.id;
          isDebit = method.payment_type_id === "debit_card";
          const issuers = await mpRef.current.getIssuers({ paymentMethodId, bin });
          issuerId = issuers[0]?.id ?? null;
        }
      }
      if (!paymentMethodId) {
        setError("Não reconhecemos a bandeira deste cartão. Confira o número digitado.");
        return null;
      }
      const card: TokenizedCard = { token: token.id, paymentMethodId, issuerId, isDebit };
      onToken(card);
      return card;
    } catch {
      setError("Não foi possível validar o cartão. Confira os dados e tente novamente.");
      return null;
    } finally {
      setTokenizing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onLoad={initFields} />
      <div>
        <label htmlFor={`nome-${uid}`} className="mb-2 block text-sm text-ivory/85">
          Nome impresso no cartão
        </label>
        <input id={`nome-${uid}`} value={holderName} onChange={(e) => setHolderName(e.target.value)} autoComplete="cc-name" disabled={disabled} className={inputClass} />
      </div>
      <div>
        <label className="mb-2 block text-sm text-ivory/85">Número do cartão</label>
        <div id={ids.number} className={`${inputClass} h-11`} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm text-ivory/85">Validade</label>
          <div id={ids.expiry} className={`${inputClass} h-11`} />
        </div>
        <div>
          <label className="mb-2 block text-sm text-ivory/85">CVV</label>
          <div id={ids.cvv} className={`${inputClass} h-11`} />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
      <button type="button" onClick={tokenize} disabled={!ready || tokenizing || disabled} className="btn-outline w-full disabled:cursor-not-allowed disabled:opacity-60">
        {tokenizing ? "Validando cartão..." : ready ? "Validar cartão" : "Carregando..."}
      </button>
    </div>
  );
}
