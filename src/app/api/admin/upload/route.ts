import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { createSignedUpload, isCloudinaryConfigured } from "@/server/admin/cloudinary";

/** Devolve os parâmetros assinados para o navegador subir a imagem direto ao Cloudinary. */
export async function GET() {
  await requireAdmin();
  if (!isCloudinaryConfigured()) return NextResponse.json({ error: "Upload de imagens não está configurado (faltam as variáveis CLOUDINARY_*)." }, { status: 503 });
  return NextResponse.json(createSignedUpload());
}
