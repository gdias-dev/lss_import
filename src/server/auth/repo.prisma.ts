import { prisma } from "@/lib/prisma";
import type { AuthRepo } from "./service";

const userSelect = { id: true, name: true, email: true, phone: true, role: true, emailVerifiedAt: true } as const;

const isUniqueViolation = (error: unknown) => typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";

export const prismaAuthRepo: AuthRepo = {
  findUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  findUserById: (id) => prisma.user.findUnique({ where: { id } }),

  async createUser(data) {
    try {
      return await prisma.user.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  },

  async updateUserPassword(userId, passwordHash) {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },
  async updateUserProfile(userId, data) {
    await prisma.user.update({ where: { id: userId }, data });
  },
  async markEmailVerified(userId, at) {
    await prisma.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: at } });
  },

  async createEmailToken(data) {
    await prisma.emailToken.create({ data });
  },
  async deleteUnusedEmailTokens(userId, type) {
    await prisma.emailToken.deleteMany({ where: { userId, type, usedAt: null } });
  },
  findEmailToken: (tokenHash, type) =>
    prisma.emailToken.findFirst({ where: { tokenHash, type }, select: { id: true, userId: true, expiresAt: true, usedAt: true } }),
  async consumeEmailToken(id, at) {
    const result = await prisma.emailToken.updateMany({ where: { id, usedAt: null }, data: { usedAt: at } });
    return result.count === 1;
  },

  async createSession(data) {
    await prisma.session.create({ data });
  },
  findSession: (tokenHash) => prisma.session.findUnique({ where: { tokenHash }, select: { id: true, expiresAt: true, user: { select: userSelect } } }),
  async deleteSession(tokenHash) {
    await prisma.session.deleteMany({ where: { tokenHash } });
  },
  async deleteUserSessions(userId, exceptTokenHash) {
    await prisma.session.deleteMany({ where: { userId, ...(exceptTokenHash ? { NOT: { tokenHash: exceptTokenHash } } : {}) } });
  },
};
