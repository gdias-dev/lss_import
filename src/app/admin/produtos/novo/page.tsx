import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/server/auth/guards";
import { listBrands } from "@/server/admin/products";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requireAdmin();
  const brands = await listBrands();
  return (
    <div>
      <h1 className="section-title mb-8">Novo produto</h1>
      <ProductForm brands={brands} defaults={{ name: "", brandId: brands[0]?.id ?? "", gender: "UNISSEX", concentration: "EDP", olfactoryFamily: "", description: "", notesTop: "", notesHeart: "", notesBase: "", longevity: "", projection: "", occasion: "", featured: false, active: true }} />
    </div>
  );
}
