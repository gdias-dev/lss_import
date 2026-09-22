import type { Metadata } from "next";
import { CouponForm } from "@/components/admin/CouponForm";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Novo cupom" };

export default async function NewCouponPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="section-title mb-8">Novo cupom</h1>
      <CouponForm defaults={{ code: "", type: "PERCENT", value: 10, minSubtotalCents: 0, maxUses: null, perUserLimit: null, startsAt: "", endsAt: "", active: true }} />
    </div>
  );
}
