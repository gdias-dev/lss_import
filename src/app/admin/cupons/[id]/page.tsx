import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CouponForm } from "@/components/admin/CouponForm";
import { requireAdmin } from "@/server/auth/guards";
import { getCoupon } from "@/server/admin/coupons";

export const metadata: Metadata = { title: "Editar cupom" };

const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const coupon = await getCoupon(id);
  if (!coupon) notFound();

  return (
    <div>
      <h1 className="section-title mb-8">Editar cupom</h1>
      <CouponForm
        defaults={{
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minSubtotalCents: coupon.minSubtotalCents,
          maxUses: coupon.maxUses,
          perUserLimit: coupon.perUserLimit,
          startsAt: toLocalInput(coupon.startsAt),
          endsAt: toLocalInput(coupon.endsAt),
          active: coupon.active,
        }}
      />
    </div>
  );
}
