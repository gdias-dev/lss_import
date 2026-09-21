/** Aceita só caminhos internos (evita "open redirect" com ?next=https://site-malicioso). */
export function safeNextPath(next: string | null | undefined, fallback = "/conta"): string {
  if (!next) return fallback;
  if (!/^\/(?!\/)[^\s\\]*$/.test(next)) return fallback;
  if (next.startsWith("/entrar") || next.startsWith("/cadastrar")) return fallback;
  return next;
}
