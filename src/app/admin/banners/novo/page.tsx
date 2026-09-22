import type { Metadata } from "next";
import { BannerForm } from "@/components/admin/BannerForm";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Novo banner" };

export default async function NewBannerPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="section-title mb-8">Novo banner</h1>
      <BannerForm defaults={{ title: "", imageUrl: "", linkUrl: "", position: 0, active: true }} />
    </div>
  );
}
