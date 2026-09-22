import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ImageManager } from "@/components/admin/ImageManager";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantManager } from "@/components/admin/VariantManager";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminProduct, listBrands } from "@/server/admin/products";

export const metadata: Metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [product, brands] = await Promise.all([getAdminProduct(id), listBrands()]);
  if (!product) notFound();

  return (
    <div className="space-y-14">
      <div>
        <Link href="/admin/produtos" className="mb-6 inline-block text-sm text-muted transition hover:text-gold">
          ← Todos os produtos
        </Link>
        <h1 className="section-title mb-8">{product.name}</h1>
        <ProductForm
          brands={brands}
          defaults={{
            id: product.id,
            name: product.name,
            brandId: product.brandId,
            gender: product.gender,
            concentration: product.concentration,
            olfactoryFamily: product.olfactoryFamily ?? "",
            description: product.description ?? "",
            notesTop: product.notesTop ?? "",
            notesHeart: product.notesHeart ?? "",
            notesBase: product.notesBase ?? "",
            longevity: product.longevity ?? "",
            projection: product.projection ?? "",
            occasion: product.occasion ?? "",
            featured: product.featured,
            active: product.active,
          }}
        />
      </div>

      <section className="max-w-2xl">
        <h2 className="mb-5 font-serif text-2xl text-ivory">Fotos</h2>
        <ImageManager productId={product.id} images={product.images} />
      </section>

      <section className="max-w-2xl">
        <h2 className="mb-5 font-serif text-2xl text-ivory">Tamanhos e estoque</h2>
        <VariantManager productId={product.id} variants={product.variants} />
      </section>
    </div>
  );
}
