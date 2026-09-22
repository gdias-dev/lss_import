import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel LS Imports" }, robots: { index: false } };
export const dynamic = "force-dynamic";

// Cada página confere requireAdmin de novo (o layout sozinho não protege as rotas filhas de verdade).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[13rem_1fr]">
      <aside>
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
