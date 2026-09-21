import { getSettings } from "@/lib/settings";
import { formatBRL } from "@/lib/money";

export async function AnnouncementBar() {
  const s = await getSettings();
  const messages = [
    "Enviamos para todo o Brasil",
    s.installmentsInterestFreeMax > 1 ? `Em até ${s.installmentsInterestFreeMax}x sem juros` : null,
    s.pixDiscountPercent > 0 ? `${s.pixDiscountPercent}% de desconto no Pix` : null,
    s.freeShippingAboveCents > 0 ? `Frete grátis acima de ${formatBRL(s.freeShippingAboveCents)}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="border-b border-line bg-ink-soft">
      <ul className="container-page flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-2 text-xs tracking-wide text-gold">
        {messages.map((m) => (
          <li key={m} className="flex items-center gap-2">
            <span aria-hidden className="text-[0.6rem]">✦</span>
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
