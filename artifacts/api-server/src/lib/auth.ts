import crypto from "crypto";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const ADMIN_LOGIN_ID = "PAWZONE_A2005";
export const ADMIN_PASSWORD = "PawZone2005";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "pawzone_salt").digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId, token, expiresAt });
  return token;
}

export async function getUserFromToken(token: string) {
  const now = new Date();
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)));
  if (!session) return null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user || null;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  (req as any).user = user;
  next();
}

export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: Admin only" });
    return;
  }
  next();
}

export function generateOrderNumber(): string {
  return "PZ" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

export function generatePetCode(): string {
  return "PET" + Math.random().toString(36).slice(2, 8).toUpperCase();
}
