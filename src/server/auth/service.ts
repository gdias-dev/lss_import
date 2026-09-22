/**
 * Regras de autenticação sem depender de banco ou de Next: recebe um "repositório" e um relógio.
 * Isso permite testar tokens de uso único, expiração e invalidação de sessões com um banco falso.
 */
import { getDummyHash, hashPassword, verifyPassword } from "./password";
import { generateToken, hashToken } from "./tokens";

export const SESSION_DAYS = 30;
export const VERIFY_TTL_HOURS = 48;
export const RESET_TTL_MINUTES = 60;

export type Role = "CUSTOMER" | "ADMIN";
export type EmailTokenType = "VERIFY_EMAIL" | "RESET_PASSWORD";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
}
export interface UserRecord extends SessionUser {
  passwordHash: string;
}
export interface EmailTokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface AuthRepo {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  /** Retorna null se o e-mail já existe. */
  createUser(data: { name: string; email: string; phone: string; passwordHash: string }): Promise<UserRecord | null>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  updateUserProfile(userId: string, data: { name: string; phone: string }): Promise<void>;
  markEmailVerified(userId: string, at: Date): Promise<void>;
  createEmailToken(data: { userId: string; type: EmailTokenType; tokenHash: string; expiresAt: Date }): Promise<void>;
  deleteUnusedEmailTokens(userId: string, type: EmailTokenType): Promise<void>;
  findEmailToken(tokenHash: string, type: EmailTokenType): Promise<EmailTokenRecord | null>;
  /** Atômico: só uma chamada consegue consumir o token. */
  consumeEmailToken(id: string, at: Date): Promise<boolean>;
  createSession(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findSession(tokenHash: string): Promise<{ id: string; expiresAt: Date; user: SessionUser } | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string, exceptTokenHash?: string): Promise<void>;
}

const addMs = (date: Date, ms: number) => new Date(date.getTime() + ms);
const HOUR = 3_600_000;

export const toSessionUser = (u: UserRecord | SessionUser): SessionUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  cpf: u.cpf,
  role: u.role,
  emailVerifiedAt: u.emailVerifiedAt,
});

export function createAuthService(repo: AuthRepo, clock: () => Date = () => new Date()) {
  async function issueEmailToken(userId: string, type: EmailTokenType, ttlMs: number): Promise<string> {
    await repo.deleteUnusedEmailTokens(userId, type); // só o link mais recente vale
    const token = generateToken();
    await repo.createEmailToken({ userId, type, tokenHash: hashToken(token), expiresAt: addMs(clock(), ttlMs) });
    return token;
  }

  async function findValidToken(token: string, type: EmailTokenType): Promise<EmailTokenRecord | null> {
    const record = await repo.findEmailToken(hashToken(token), type);
    if (!record || record.usedAt || record.expiresAt <= clock()) return null;
    return record;
  }

  return {
    async register(input: { name: string; email: string; phone: string; password: string }) {
      const passwordHash = await hashPassword(input.password);
      const user = await repo.createUser({ name: input.name, email: input.email, phone: input.phone, passwordHash });
      if (!user) return { ok: false as const, reason: "EMAIL_TAKEN" as const };
      const verifyToken = await issueEmailToken(user.id, "VERIFY_EMAIL", VERIFY_TTL_HOURS * HOUR);
      return { ok: true as const, user: toSessionUser(user), verifyToken };
    },

    async login(email: string, password: string): Promise<SessionUser | null> {
      const user = await repo.findUserByEmail(email);
      const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
      return user && valid ? toSessionUser(user) : null;
    },

    async startSession(userId: string) {
      const token = generateToken();
      const expiresAt = addMs(clock(), SESSION_DAYS * 24 * HOUR);
      await repo.createSession({ userId, tokenHash: hashToken(token), expiresAt });
      return { token, expiresAt };
    },

    async getSessionUser(token: string): Promise<SessionUser | null> {
      const tokenHash = hashToken(token);
      const session = await repo.findSession(tokenHash);
      if (!session) return null;
      if (session.expiresAt <= clock()) {
        await repo.deleteSession(tokenHash);
        return null;
      }
      return session.user;
    },

    endSession: (token: string) => repo.deleteSession(hashToken(token)),

    /** Devolve null se o e-mail não existe (quem chama responde igual nos dois casos). */
    async requestPasswordReset(email: string) {
      const user = await repo.findUserByEmail(email);
      if (!user) return null;
      const token = await issueEmailToken(user.id, "RESET_PASSWORD", RESET_TTL_MINUTES * 60_000);
      return { user: toSessionUser(user), token };
    },

    async resetPassword(token: string, newPassword: string) {
      const record = await findValidToken(token, "RESET_PASSWORD");
      if (!record) return { ok: false as const, reason: "INVALID_TOKEN" as const };
      const passwordHash = await hashPassword(newPassword);
      if (!(await repo.consumeEmailToken(record.id, clock()))) return { ok: false as const, reason: "INVALID_TOKEN" as const };
      await repo.updateUserPassword(record.userId, passwordHash);
      await repo.deleteUserSessions(record.userId); // derruba todos os logins
      await repo.markEmailVerified(record.userId, clock()); // quem recebeu o link comprovou ter acesso ao e-mail
      const user = await repo.findUserById(record.userId);
      return { ok: true as const, user: user ? toSessionUser(user) : null };
    },

    async requestEmailVerification(userId: string) {
      const user = await repo.findUserById(userId);
      if (!user || user.emailVerifiedAt) return null;
      const token = await issueEmailToken(user.id, "VERIFY_EMAIL", VERIFY_TTL_HOURS * HOUR);
      return { user: toSessionUser(user), token };
    },

    async verifyEmail(token: string) {
      const record = await findValidToken(token, "VERIFY_EMAIL");
      if (!record || !(await repo.consumeEmailToken(record.id, clock()))) return { ok: false as const, reason: "INVALID_TOKEN" as const };
      await repo.markEmailVerified(record.userId, clock());
      return { ok: true as const };
    },

    async changePassword(userId: string, current: string, next: string, keepSessionToken?: string) {
      const user = await repo.findUserById(userId);
      if (!user || !(await verifyPassword(current, user.passwordHash))) return { ok: false as const, reason: "WRONG_PASSWORD" as const };
      await repo.updateUserPassword(userId, await hashPassword(next));
      await repo.deleteUserSessions(userId, keepSessionToken ? hashToken(keepSessionToken) : undefined);
      return { ok: true as const, user: toSessionUser(user) };
    },

    async updateProfile(userId: string, data: { name: string; phone: string }) {
      await repo.updateUserProfile(userId, data);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
