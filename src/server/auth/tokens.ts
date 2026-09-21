import { createHash, randomBytes } from "node:crypto";

/** Token aleatório de 256 bits. Vai por e-mail ou cookie. No banco só existe o hash. */
export const generateToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
