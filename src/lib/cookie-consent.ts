/** Regra pura de quando mostrar o aviso de cookies: só se a pessoa ainda não decidiu. */
export const COOKIE_CONSENT_KEY = "ls-cookie-consent";

export function shouldShowCookieNotice(storedValue: string | null): boolean {
  return storedValue !== "aceito";
}
