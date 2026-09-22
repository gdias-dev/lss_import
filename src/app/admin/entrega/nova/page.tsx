import type { Metadata } from "next";
import { DeliveryZoneForm } from "@/components/admin/DeliveryZoneForm";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Nova zona de entrega" };

export default async function NewDeliveryZonePage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="section-title mb-8">Nova zona de entrega</h1>
      <DeliveryZoneForm defaults={{ name: "", feeCents: 1000, freeAboveCents: null, neighborhoods: "", cepRanges: "", allowsPayOnDelivery: true, estimatedDays: 2, active: true }} />
    </div>
  );
}
