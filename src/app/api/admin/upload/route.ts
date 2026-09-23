import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { createSignedUpload, isCloudinaryConfigured } from "@/server/admin/cloudinary";
import { checkRateLimits, rateLimitMessage } from "@/server/rate-limit";

/** Devolve os parâmetros assinados para o navegador subir a imagem direto ao Cloudinary. */
export async function GET() {
  const admin = await requireAdmin();
  if (!isCloudinaryConfigured()) return NextResponse.json({ error: "Upload de imagens não está configurado (faltam as variáveis CLOUDINARY_*)." }, { status: 503 });

  const limit = await checkRateLimits([{ key: `upload-sign:admin:${admin.id}`, limit: 60, windowSeconds: 60 }]);
  if (!limit.ok) return NextResponse.json({ error: rateLimitMessage(limit.retryAfterSeconds) }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  return NextResponse.json(createSignedUpload());
}
