import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeliveryZoneForm } from "@/components/admin/DeliveryZoneForm";
import { requireAdmin } from "@/server/auth/guards";
import { getDeliveryZone } from "@/server/admin/delivery-zones";

export const metadata: Metadata = { title: "Editar zona de entrega" };

export default async function EditDeliveryZonePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const zone = await getDeliveryZone(id);
  if (!zone) notFound();

  return (
    <div>
      <h1 className="section-title mb-8">Editar zona de entrega</h1>
      <DeliveryZoneForm
        defaults={{
          id: zone.id,
          name: zone.name,
          feeCents: zone.feeCents,
          freeAboveCents: zone.freeAboveCents,
          neighborhoods: zone.neighborhoods.join(", "),
          cepRanges: zone.ranges.map((r) => `${r.cepStart} a ${r.cepEnd}`).join(", "),
          allowsPayOnDelivery: zone.allowsPayOnDelivery,
          estimatedDays: zone.estimatedDays,
          active: zone.active,
        }}
      />
    </div>
  );
}
