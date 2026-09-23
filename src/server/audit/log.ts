import { after as runAfterResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Registro de quem mudou o quê. A gravação em si roda DEPOIS de a resposta já ter sido enviada ao
 * admin (via `after()` do Next.js), então o clique não fica esperando essa escrita — só o "antes" e
 * o "depois" (já em memória, sem consulta nova) são capturados agora. Nunca lança erro visível (uma
 * falha ao registrar não pode derrubar a ação do admin) e nunca guarda dado sensível (senha, token).
 */
export async function logAdminAction(adminId: string, action: string, entity: string, entityId: string | null, before: unknown, after: unknown): Promise<void> {
  runAfterResponse(async () => {
    try {
      await prisma.auditLog.create({ data: { adminId, action, entity, entityId, before: (before ?? undefined) as never, after: (after ?? undefined) as never } });
    } catch (error) {
      console.error("[audit] falha ao registrar", action, entity, entityId, error);
    }
  });
}
