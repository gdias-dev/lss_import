/**
 * Uso: npm run make-admin -- email@exemplo.com
 * Promove uma conta já cadastrada a administrador. Não cria conta nova de propósito —
 * a pessoa precisa se cadastrar normalmente no site primeiro, com senha própria.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Uso: npm run make-admin -- email@exemplo.com");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Não encontrei nenhuma conta com o e-mail "${email}". A pessoa precisa se cadastrar no site primeiro (em /cadastrar).`);
    process.exit(1);
  }
  if (user.role === "ADMIN") {
    console.log(`"${email}" já é administrador.`);
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`Pronto! "${email}" agora é administrador. Peça para a pessoa sair e entrar de novo na conta.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
