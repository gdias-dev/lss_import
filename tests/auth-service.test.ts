import { beforeEach, describe, expect, it } from "vitest";
import { createAuthService, RESET_TTL_MINUTES, SESSION_DAYS, VERIFY_TTL_HOURS, type AuthRepo, type EmailTokenRecord, type EmailTokenType, type UserRecord } from "@/server/auth/service";
import { hashToken } from "@/server/auth/tokens";

/** Banco falso em memória: reproduz o comportamento que o serviço espera do repositório real. */
function memoryRepo() {
  const users: UserRecord[] = [];
  const tokens: (EmailTokenRecord & { type: EmailTokenType; tokenHash: string })[] = [];
  const sessions: { id: string; userId: string; tokenHash: string; expiresAt: Date }[] = [];
  let seq = 0;

  const repo: AuthRepo = {
    findUserByEmail: async (email) => users.find((u) => u.email === email) ?? null,
    findUserById: async (id) => users.find((u) => u.id === id) ?? null,
    async createUser(data) {
      if (users.some((u) => u.email === data.email)) return null;
      const user: UserRecord = { id: `u${++seq}`, ...data, cpf: null, role: "CUSTOMER", emailVerifiedAt: null };
      users.push(user);
      return user;
    },
    async updateUserPassword(userId, passwordHash) {
      const u = users.find((x) => x.id === userId);
      if (u) u.passwordHash = passwordHash;
    },
    async updateUserProfile(userId, data) {
      Object.assign(users.find((x) => x.id === userId) ?? {}, data);
    },
    async markEmailVerified(userId, at) {
      const u = users.find((x) => x.id === userId);
      if (u && !u.emailVerifiedAt) u.emailVerifiedAt = at;
    },
    async createEmailToken(data) {
      tokens.push({ id: `t${++seq}`, usedAt: null, ...data });
    },
    async deleteUnusedEmailTokens(userId, type) {
      for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i]!.userId === userId && tokens[i]!.type === type && !tokens[i]!.usedAt) tokens.splice(i, 1);
    },
    findEmailToken: async (tokenHash, type) => tokens.find((t) => t.tokenHash === tokenHash && t.type === type) ?? null,
    async consumeEmailToken(id, at) {
      const t = tokens.find((x) => x.id === id);
      if (!t || t.usedAt) return false;
      t.usedAt = at;
      return true;
    },
    async createSession(data) {
      sessions.push({ id: `s${++seq}`, ...data });
    },
    async findSession(tokenHash) {
      const s = sessions.find((x) => x.tokenHash === tokenHash);
      const user = s && users.find((u) => u.id === s.userId);
      return s && user ? { id: s.id, expiresAt: s.expiresAt, user } : null;
    },
    async deleteSession(tokenHash) {
      const i = sessions.findIndex((s) => s.tokenHash === tokenHash);
      if (i >= 0) sessions.splice(i, 1);
    },
    async deleteUserSessions(userId, except) {
      for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i]!.userId === userId && sessions[i]!.tokenHash !== except) sessions.splice(i, 1);
    },
  };
  return { repo, users, tokens, sessions };
}

const HOUR = 3_600_000;
const input = { name: "Maria Silva", email: "maria@exemplo.com", phone: "21999990000", password: "Perfume@2026" };

let now: Date;
let db: ReturnType<typeof memoryRepo>;
let auth: ReturnType<typeof createAuthService>;

beforeEach(() => {
  now = new Date("2026-09-21T12:00:00Z");
  db = memoryRepo();
  auth = createAuthService(db.repo, () => now);
});

const advance = (ms: number) => (now = new Date(now.getTime() + ms));

describe("cadastro e login", () => {
  it("cria a conta com senha em hash e token de verificação guardado só em hash", async () => {
    const r = await auth.register(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(db.users[0]!.passwordHash).toMatch(/^scrypt\$/);
    expect(db.users[0]!.passwordHash).not.toContain(input.password);
    expect(r.user).not.toHaveProperty("passwordHash");
    expect(db.tokens[0]!.tokenHash).toBe(hashToken(r.verifyToken));
    expect(db.tokens[0]!.tokenHash).not.toBe(r.verifyToken);
  });

  it("não deixa cadastrar o mesmo e-mail duas vezes", async () => {
    await auth.register(input);
    expect(await auth.register(input)).toEqual({ ok: false, reason: "EMAIL_TAKEN" });
    expect(db.users).toHaveLength(1);
  });

  it("login funciona com a senha certa e falha do mesmo jeito para senha errada ou e-mail inexistente", async () => {
    await auth.register(input);
    expect((await auth.login(input.email, input.password))?.email).toBe(input.email);
    expect(await auth.login(input.email, "errada")).toBeNull();
    expect(await auth.login("ninguem@exemplo.com", input.password)).toBeNull();
  });
});

describe("verificação de e-mail", () => {
  it("confirma uma vez só", async () => {
    const r = await auth.register(input);
    if (!r.ok) throw new Error("falhou");
    expect(await auth.verifyEmail(r.verifyToken)).toEqual({ ok: true });
    expect(db.users[0]!.emailVerifiedAt).toEqual(now);
    expect(await auth.verifyEmail(r.verifyToken)).toEqual({ ok: false, reason: "INVALID_TOKEN" });
  });

  it("rejeita link vencido, inexistente e de outro tipo", async () => {
    const r = await auth.register(input);
    if (!r.ok) throw new Error("falhou");
    expect((await auth.verifyEmail("token-que-nao-existe")).ok).toBe(false);
    const reset = await auth.requestPasswordReset(input.email);
    expect((await auth.verifyEmail(reset!.token)).ok).toBe(false); // token de senha não confirma e-mail
    advance((VERIFY_TTL_HOURS + 1) * HOUR);
    expect((await auth.verifyEmail(r.verifyToken)).ok).toBe(false);
    expect(db.users[0]!.emailVerifiedAt).toBeNull();
  });

  it("reenvio invalida o link anterior e não envia se já confirmado", async () => {
    const r = await auth.register(input);
    if (!r.ok) throw new Error("falhou");
    const again = await auth.requestEmailVerification(r.user.id);
    expect((await auth.verifyEmail(r.verifyToken)).ok).toBe(false);
    expect((await auth.verifyEmail(again!.token)).ok).toBe(true);
    expect(await auth.requestEmailVerification(r.user.id)).toBeNull();
  });
});

describe("sessões", () => {
  it("abre, lê, expira e encerra", async () => {
    const r = await auth.register(input);
    if (!r.ok) throw new Error("falhou");
    const { token, expiresAt } = await auth.startSession(r.user.id);
    expect(expiresAt.getTime() - now.getTime()).toBe(SESSION_DAYS * 24 * HOUR);
    expect(db.sessions[0]!.tokenHash).toBe(hashToken(token));
    expect((await auth.getSessionUser(token))?.id).toBe(r.user.id);
    expect(await auth.getSessionUser("token-invalido")).toBeNull();

    advance((SESSION_DAYS * 24 + 1) * HOUR);
    expect(await auth.getSessionUser(token)).toBeNull();
    expect(db.sessions).toHaveLength(0); // sessão vencida é apagada

    const s2 = await auth.startSession(r.user.id);
    await auth.endSession(s2.token);
    expect(await auth.getSessionUser(s2.token)).toBeNull();
  });
});

describe("recuperação de senha", () => {
  it("não revela se o e-mail existe", async () => {
    expect(await auth.requestPasswordReset("ninguem@exemplo.com")).toBeNull();
  });

  it("troca a senha, derruba todas as sessões e o link só vale uma vez", async () => {
    const r = await auth.register(input);
    if (!r.ok) throw new Error("falhou");
    const s = await auth.startSession(r.user.id);
    const req = await auth.requestPasswordReset(input.email);

    const done = await auth.resetPassword(req!.token, "NovaSenha#2026");
    expect(done.ok).toBe(true);
    expect(await auth.login(input.email, "NovaSenha#2026")).not.toBeNull();
    expect(await auth.login(input.email, input.password)).toBeNull();
    expect(await auth.getSessionUser(s.token)).toBeNull();
    expect(db.users[0]!.emailVerifiedAt).not.toBeNull(); // quem recebeu o link comprovou o e-mail

    expect(await auth.resetPassword(req!.token, "OutraSenha#2026")).toEqual({ ok: false, reason: "INVALID_TOKEN" });
  });

  it("expira em 1 hora e só o link mais recente vale", async () => {
    await auth.register(input);
    const first = await auth.requestPasswordReset(input.email);
    const second = await auth.requestPasswordReset(input.email);
    expect((await auth.resetPassword(first!.token, "NovaSenha#2026")).ok).toBe(false);

    advance((RESET_TTL_MINUTES + 1) * 60_000);
    expect((await auth.resetPassword(second!.token, "NovaSenha#2026")).ok).toBe(false);
    expect(await auth.login(input.email, input.password)).not.toBeNull(); // senha original intacta
  });
});

describe("troca de senha logado", () => {
  it("exige a senha atual e mantém só a sessão atual", async () => {
    const r = await auth.register(input);
    if (!r.ok) throw new Error("falhou");
    const current = await auth.startSession(r.user.id);
    const other = await auth.startSession(r.user.id);

    expect(await auth.changePassword(r.user.id, "errada", "NovaSenha#2026", current.token)).toEqual({ ok: false, reason: "WRONG_PASSWORD" });
    expect((await auth.getSessionUser(other.token))?.id).toBe(r.user.id); // nada mudou

    expect((await auth.changePassword(r.user.id, input.password, "NovaSenha#2026", current.token)).ok).toBe(true);
    expect(await auth.getSessionUser(other.token)).toBeNull();
    expect((await auth.getSessionUser(current.token))?.id).toBe(r.user.id);
    expect(await auth.login(input.email, "NovaSenha#2026")).not.toBeNull();
  });
});
