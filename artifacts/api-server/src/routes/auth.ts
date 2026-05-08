import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable, waitlistTable } from "@workspace/db";
import {
  LoginBody,
  SignupBody,
  AddToWaitlistBody,
} from "@workspace/api-zod";
import {
  hashPassword,
  createSession,
  authMiddleware,
  ADMIN_LOGIN_ID,
  ADMIN_PASSWORD,
  generateToken,
} from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const loginId = parsed.data.loginId.trim();
  const password = parsed.data.password.trim();

  if (loginId.toUpperCase() === ADMIN_LOGIN_ID.toUpperCase() && password === ADMIN_PASSWORD) {
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
    if (!admin) {
      res.status(500).json({ error: "Admin account not found" });
      return;
    }
    const token = await createSession(admin.id);
    res.json({ user: formatUser(admin), token });
    return;
  }

  const normalizedEmail = loginId.toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.status === "blocked") {
    res.status(403).json({ error: "Your account has been blocked" });
    return;
  }
  if (user.role !== "buyer" && user.status !== "approved") {
    res.status(403).json({ error: "Your account is pending admin approval. Please wait for approval before logging in." });
    return;
  }

  const token = await createSession(user.id);
  res.json({ user: formatUser(user), token });
});

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { role, name, phone, address, city, state, pincode, country } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password.trim();

  const rawDeliveryPoints = req.body?.deliveryPoints;
  const deliveryPoints: string[] | null = Array.isArray(rawDeliveryPoints)
    ? rawDeliveryPoints.filter((p: any) => typeof p === "string" && p.trim())
    : null;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const status = role === "buyer" ? "approved" : "pending";
  const sellerId = role === "seller" ? "SEL" + Math.random().toString(36).slice(2, 7).toUpperCase() : null;

  const [user] = await db.insert(usersTable).values({
    role,
    name,
    email,
    phone: phone ?? null,
    passwordHash: hashPassword(password),
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    pincode: pincode ?? null,
    country: country ?? null,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    status,
    sellerId,
    sellerScore: 5,
    deliveryPoints: deliveryPoints?.length ? deliveryPoints : null,
  }).returning();

  const token = await createSession(user.id);
  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/logout", authMiddleware, async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization!;
  const token = authHeader.slice(7);
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json(formatUser(user));
});

router.post("/auth/waitlist", async (req, res): Promise<void> => {
  const parsed = AddToWaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.insert(waitlistTable).values(parsed.data);
  res.status(201).json({ success: true, message: "Added to waitlist" });
});

function formatUser(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default router;
