import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/server/auth/guards";
import { getAllSettings } from "@/server/admin/settings";

export const metadata: Metadata = { title: "Configurações" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getAllSettings();
  return (
    <div>
      <h1 className="section-title mb-2">Configurações da loja</h1>
      <p className="mb-8 text-sm text-muted">O painel controla os valores de parcelamento, Pix e frete grátis. O número do WhatsApp continua sendo trocado por variável de ambiente.</p>
      <SettingsForm settings={settings} />
    </div>
  );
}
