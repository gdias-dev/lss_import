import type { MetadataRoute } from "next";
import { getAllProductSlugs } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/perfumes", "/trocas-e-devolucoes", "/privacidade", "/termos"].map((path) => ({
    url: `${siteUrl}${path}`,
  }));
  const products = (await getAllProductSlugs()).map((p) => ({ url: `${siteUrl}/produto/${p.slug}`, lastModified: p.updatedAt }));
  return [...staticRoutes, ...products];
}
