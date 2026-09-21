import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

// scrypt com parâmetros equivalentes à recomendação da OWASP (N=2^15, r=8, p=3), sem dependências nativas.
const N = 2 ** 15;
const R = 8;
const P = 3;
const KEY_LENGTH = 64;
const MAXMEM = 128 * N * R * 2;

function derive(password: string, salt: Buffer, n: number, r: number, p: number, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password.normalize("NFKC"), salt, keylen, { N: n, r, p, maxmem: Math.max(MAXMEM, 128 * n * r * 2) }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Formato: scrypt$N$r$p$salt(base64)$hash(base64). Os parâmetros ficam junto, para poder subir o custo no futuro. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;
  const [nn, rr, pp] = [Number(n), Number(r), Number(p)];
  if (![nn, rr, pp].every((v) => Number.isInteger(v) && v > 0) || nn > 2 ** 20) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await derive(password, Buffer.from(saltB64, "base64"), nn, rr, pp, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

let dummyHash: Promise<string> | undefined;
/** Hash falso para gastar o mesmo tempo quando o e-mail não existe (evita descobrir contas pelo tempo de resposta). */
export const getDummyHash = () => (dummyHash ??= hashPassword("senha-falsa-para-igualar-o-tempo"));
