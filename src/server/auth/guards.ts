import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";

/** Exige login. Manda para /entrar e volta para a página de origem depois. */
export async function requireUser(fromPath = "/conta") {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(fromPath)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
