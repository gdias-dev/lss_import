import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { countCartUnits } from "@/server/cart";

/** Quantidade de unidades no carrinho, para o número do ícone do cabeçalho. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const count = user ? await countCartUnits(user.id) : 0;
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
}
