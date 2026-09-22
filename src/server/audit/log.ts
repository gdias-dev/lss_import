import { prisma } from "@/lib/prisma";

/**
 * Registro de quem mudou o quê. Nunca lança erro (uma falha ao registrar não pode derrubar a ação
 * do admin) e nunca guarda dado sensível (senha, token) em `before`/`after`.
 */
export async function logAdminAction(adminId: string, action: string, entity: string, entityId: string | null, before: unknown, after: unknown): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { adminId, action, entity, entityId, before: (before ?? undefined) as never, after: (after ?? undefined) as never } });
  } catch (error) {
    console.error("[audit] falha ao registrar", action, entity, entityId, error);
  }
}
