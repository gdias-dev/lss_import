"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { getShippingOptionsAction, placeOrderAction, type PlaceOrderState, type ShippingOptionView } from "@/app/checkout/actions";
import { AddressPicker, type AddressOption } from "@/components/checkout/AddressPicker";
import { CardFields, type TokenizedCard } from "@/components/checkout/CardFields";
import { Field, inputClass } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { isValidCpf, formatCpf } from "@/lib/cpf";
import { buildInstallments, formatBRL, type InstallmentRules } from "@/lib/money";
import type { CartSummary } from "@/lib/cart";
import { onlyDigits } from "@/lib/utils";

type PaymentChoice = "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH_ON_DELIVERY" | "CARD_ON_DELIVERY";

const PAYMENT_LABEL: Record<PaymentChoice, string> = { PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", CASH_ON_DELIVERY: "Dinheiro na entrega", CARD_ON_DELIVERY: "Cartão na entrega" };

export function CheckoutClient({
  addresses,
  cart,
  hasCpf,
  settings,
  installmentRules: rules,
  mpPublicKey,
}: {
  addresses: AddressOption[];
  cart: CartSummary;
  hasCpf: boolean;
  settings: { installmentsInterestFreeMax: number; minInstallmentCents: number; monthlyInterestRate: number; debitEnabled: boolean };
  installmentRules: InstallmentRules;
  mpPublicKey: string | null;
}) {
  const [addressId, setAddressId] = useState<string | null>(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOptionView[]>([]);
  const [shippingKey, setShippingKey] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [loadingShipping, startLoadingShipping] = useTransition();

  const [payment, setPayment] = useState<PaymentChoice>("PIX");
  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState<TokenizedCard | null>(null);
  const [cpf, setCpf] = useState("");
  const [changeFor, setChangeFor] = useState("");
  const [state, formAction] = useActionState<PlaceOrderState, FormData>(placeOrderAction, {});

  useEffect(() => {
    if (!addressId) return;
    setShippingKey(null);
    setShippingError(null);
    startLoadingShipping(async () => {
      const result = await getShippingOptionsAction(addressId);
      if (result.ok) {
        setShippingOptions(result.options);
        setShippingKey(result.options[0]?.key ?? null);
      } else {
        setShippingOptions([]);
        setShippingError(result.message);
      }
    });
  }, [addressId]);

  const selectedShipping = shippingOptions.find((o) => o.key === shippingKey) ?? null;
  const pixTotal = cart.pix?.totalCents ?? cart.totalCents;
  const productsForPayment = payment === "PIX" ? pixTotal : cart.totalCents;
  const shippingCents = selectedShipping?.costCents ?? 0;

  const installmentPlans = useMemo(() => (payment === "CREDIT_CARD" ? buildInstallments(cart.totalCents, rules) : []), [payment, cart.totalCents, rules]);
  const selectedPlan = installmentPlans.find((p) => p.count === installments) ?? installmentPlans[0];
  const interestCents = payment === "CREDIT_CARD" ? (selectedPlan?.interestCents ?? 0) : 0;
  const grandTotal = productsForPayment + shippingCents + interestCents;

  const isPayOnDelivery = payment === "CASH_ON_DELIVERY" || payment === "CARD_ON_DELIVERY";
  const paymentOptions: PaymentChoice[] = ["PIX", "CREDIT_CARD", ...(settings.debitEnabled ? (["DEBIT_CARD"] as const) : []), ...(selectedShipping?.allowsPayOnDelivery ? (["CASH_ON_DELIVERY", "CARD_ON_DELIVERY"] as const) : [])];

  const cpfOk = hasCpf || isValidCpf(cpf);
  const cardOk = payment !== "CREDIT_CARD" && payment !== "DEBIT_CARD" ? true : Boolean(card);
  const changeOk = payment !== "CASH_ON_DELIVERY" || changeFor.trim() === "" || Number(changeFor.replace(",", ".")) * 100 >= grandTotal;
  const canSubmit = Boolean(addressId && selectedShipping && cpfOk && cardOk && changeOk);

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-10">
        <input type="hidden" name="addressId" value={addressId ?? ""} />
        <input type="hidden" name="shippingKey" value={shippingKey ?? ""} />
        <input type="hidden" name="paymentMethod" value={payment} />
        {payment === "CREDIT_CARD" && <input type="hidden" name="installments" value={installments} />}
        {card && (
          <>
            <input type="hidden" name="cardToken" value={card.token} />
            <input type="hidden" name="cardPaymentMethodId" value={card.paymentMethodId} />
            {card.issuerId && <input type="hidden" name="cardIssuerId" value={card.issuerId} />}
          </>
        )}
        {payment === "CASH_ON_DELIVERY" && changeFor && <input type="hidden" name="changeForCents" value={Math.round(Number(changeFor.replace(",", ".")) * 100)} />}

        <section>
          <h2 className="eyebrow mb-4">1. Endereço de entrega</h2>
          <AddressPicker addresses={addresses} selectedId={addressId} onSelect={setAddressId} />
        </section>

        <section aria-live="polite">
          <h2 className="eyebrow mb-4">2. Forma de entrega</h2>
          {loadingShipping && <p className="text-sm text-muted">Calculando opções de entrega...</p>}
          {shippingError && <p className="text-sm text-red-300">{shippingError}</p>}
          {!loadingShipping && shippingOptions.length > 0 && (
            <div className="space-y-2" role="radiogroup" aria-label="Forma de entrega">
              {shippingOptions.map((o) => (
                <label key={o.key} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 text-sm transition ${shippingKey === o.key ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="shipping-visual" checked={shippingKey === o.key} onChange={() => setShippingKey(o.key)} className="h-4 w-4 accent-[var(--color-gold)]" />
                    {o.label}
                  </span>
                  <span className="text-ivory">{o.costCents === 0 ? "Grátis" : formatBRL(o.costCents)}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        {!hasCpf && (
          <section>
            <h2 className="eyebrow mb-4">3. CPF</h2>
            <p className="mb-3 text-sm text-muted">Necessário para o pagamento e a nota fiscal.</p>
            <input name="cpf" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} inputMode="numeric" maxLength={14} placeholder="000.000.000-00" className={inputClass} aria-invalid={cpf.length > 0 && !isValidCpf(cpf) ? true : undefined} />
            {cpf.length >= 14 && !isValidCpf(cpf) && (
              <p role="alert" className="mt-1.5 text-xs text-red-300">
                CPF inválido.
              </p>
            )}
          </section>
        )}

        <section>
          <h2 className="eyebrow mb-4">{hasCpf ? "3" : "4"}. Pagamento</h2>
          <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Forma de pagamento">
            {paymentOptions.map((p) => (
              <button key={p} type="button" onClick={() => setPayment(p)} className={`rounded-full border px-4 py-2 text-sm transition ${payment === p ? "border-gold bg-gold text-ink" : "border-line text-ivory/85 hover:border-gold/50"}`}>
                {PAYMENT_LABEL[p]}
              </button>
            ))}
          </div>

          {payment === "PIX" && <p className="text-sm text-muted">Você paga com o app do seu banco. O QR Code e o código aparecem na próxima tela e valem por tempo limitado.</p>}

          {(payment === "CREDIT_CARD" || payment === "DEBIT_CARD") && mpPublicKey && (
            <div className="space-y-5">
              <CardFields publicKey={mpPublicKey} onToken={setCard} onClear={() => setCard(null)} />
              {card && <p className="text-sm text-gold">Cartão validado. Você já pode continuar.</p>}
              {payment === "CREDIT_CARD" && installmentPlans.length > 1 && (
                <div>
                  <label htmlFor="parcelas" className="mb-2 block text-sm text-ivory/85">
                    Parcelas
                  </label>
                  <select id="parcelas" value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className={inputClass}>
                    {installmentPlans.map((p) => (
                      <option key={p.count} value={p.count}>
                        {p.count}x de {formatBRL(p.installmentCents)} {p.hasInterest ? `(total ${formatBRL(p.totalCents)})` : "sem juros"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {(payment === "CREDIT_CARD" || payment === "DEBIT_CARD") && !mpPublicKey && (
            <p className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">Pagamento por cartão está temporariamente indisponível. Escolha Pix ou pagamento na entrega.</p>
          )}

          {payment === "CASH_ON_DELIVERY" && (
            <Field label="Troco para quanto? (opcional)" name="_changeForDisplay" required={false} inputMode="decimal" placeholder="Deixe em branco se não precisar de troco" value={changeFor} onChange={(e) => setChangeFor(onlyDigits(e.target.value.replace(",", ".")) === "" ? "" : e.target.value)} />
          )}
          {payment === "CARD_ON_DELIVERY" && <p className="text-sm text-muted">Leve o cartão para o entregador passar na maquininha.</p>}
        </section>

        <FormAlert state={state} className="lg:hidden" />
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24">
        <h2 className="font-serif text-2xl text-ivory">Resumo</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ivory/75">Produtos</dt>
            <dd className="text-ivory">{formatBRL(cart.subtotalCents)}</dd>
          </div>
          {cart.discountCents > 0 && (
            <div className="flex justify-between text-gold">
              <dt>Desconto{cart.coupon ? ` (${cart.coupon.code})` : ""}</dt>
              <dd>-{formatBRL(cart.discountCents)}</dd>
            </div>
          )}
          {payment === "PIX" && cart.pix && (
            <div className="flex justify-between text-gold">
              <dt>Desconto Pix ({cart.pix.discountPercent}%)</dt>
              <dd>-{formatBRL(cart.discountCents > 0 ? cart.totalCents - cart.pix.totalCents : cart.pix.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ivory/75">Frete</dt>
            <dd className="text-ivory">{selectedShipping ? (selectedShipping.costCents === 0 ? "Grátis" : formatBRL(selectedShipping.costCents)) : "—"}</dd>
          </div>
          {interestCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-ivory/75">Juros do parcelamento</dt>
              <dd className="text-ivory">{formatBRL(interestCents)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="text-ivory">Total</dt>
            <dd className="font-serif text-2xl text-ivory">{selectedShipping ? formatBRL(grandTotal) : "—"}</dd>
          </div>
        </dl>
        <FormAlert state={state} className="hidden lg:block" />
        <SubmitButton pendingLabel="Finalizando..." disabled={!canSubmit}>
          Confirmar pedido
        </SubmitButton>
        {!canSubmit && <p className="text-xs text-muted">Complete os passos acima para continuar.</p>}
      </aside>
    </form>
  );
}
