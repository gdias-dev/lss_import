import { NextResponse } from "next/server";
import { isValidCep, lookupCep } from "@/lib/cep";
import { checkRateLimits, getClientKey } from "@/server/rate-limit";

export async function GET(_request: Request, { params }: { params: Promise<{ cep: string }> }) {
  const { cep } = await params;
  if (!isValidCep(cep)) return NextResponse.json({ error: "CEP inválido" }, { status: 400 });

  const limit = await checkRateLimits([{ key: `cep:ip:${await getClientKey()}`, limit: 40, windowSeconds: 60 }]);
  if (!limit.ok) return NextResponse.json({ error: "Muitas consultas. Aguarde um instante." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const address = await lookupCep(cep);
  if (!address) return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
  return NextResponse.json(address, { headers: { "Cache-Control": "private, max-age=86400" } });
}
