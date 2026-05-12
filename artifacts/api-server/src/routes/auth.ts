import { Router } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, usersTable, sessionsTable, waitlistTable, passwordResetRequestsTable } from "@workspace/db";
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

  const governmentIdUrl = typeof req.body?.governmentIdUrl === "string" && req.body.governmentIdUrl.trim()
    ? req.body.governmentIdUrl.trim() : null;
  const rcBookUrl = typeof req.body?.rcBookUrl === "string" && req.body.rcBookUrl.trim()
    ? req.body.rcBookUrl.trim() : null;

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
    governmentIdUrl,
    rcBookUrl,
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

// ─── Forgot Password ───────────────────────────────────────────────────────

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { name, phone, email } = req.body ?? {};
  if (!name || !phone || !email) {
    res.status(400).json({ error: "Name, phone, and email are required." });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = String(phone).trim();
  const normalizedName = String(name).trim().toLowerCase();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (
    !user ||
    user.name.trim().toLowerCase() !== normalizedName ||
    (user.phone ?? "").trim() !== normalizedPhone
  ) {
    res.status(404).json({ error: "No account found matching these details. Please check your name, phone, and email." });
    return;
  }

  if (user.status === "blocked") {
    res.status(403).json({ error: "This account has been blocked." });
    return;
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  if (user.role === "buyer") {
    const token = generateToken();
    const [req_] = await db.insert(passwordResetRequestsTable).values({
      userId: user.id,
      token,
      status: "pending",
      expiresAt,
    }).returning();
    res.json({ role: "buyer", token, requestId: req_.id });
    return;
  }

  // seller / transporter → admin must generate code
  const [req_] = await db.insert(passwordResetRequestsTable).values({
    userId: user.id,
    status: "pending",
    expiresAt,
  }).returning();

  res.json({ role: user.role, requestId: req_.id });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body ?? {};
  if (!token || !newPassword) {
    res.status(400).json({ error: "Token and new password are required." });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const now = new Date();
  const [resetReq] = await db.select().from(passwordResetRequestsTable).where(
    and(
      eq(passwordResetRequestsTable.token, String(token)),
      eq(passwordResetRequestsTable.status, "pending"),
      gt(passwordResetRequestsTable.expiresAt, now),
    )
  );

  if (!resetReq) {
    res.status(400).json({ error: "Invalid or expired reset link. Please start over." });
    return;
  }

  await db.update(usersTable)
    .set({ passwordHash: hashPassword(String(newPassword)) })
    .where(eq(usersTable.id, resetReq.userId));

  await db.update(passwordResetRequestsTable)
    .set({ status: "completed" })
    .where(eq(passwordResetRequestsTable.id, resetReq.id));

  res.json({ success: true, message: "Password reset successfully." });
});

router.post("/auth/verify-reset-code", async (req, res): Promise<void> => {
  const { requestId, code, newPassword } = req.body ?? {};
  if (!requestId || !code || !newPassword) {
    res.status(400).json({ error: "Request ID, code, and new password are required." });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const now = new Date();
  const [resetReq] = await db.select().from(passwordResetRequestsTable).where(
    and(
      eq(passwordResetRequestsTable.id, Number(requestId)),
      eq(passwordResetRequestsTable.status, "code_sent"),
      gt(passwordResetRequestsTable.expiresAt, now),
    )
  );

  if (!resetReq) {
    res.status(400).json({ error: "Invalid or expired request. Please start the process again." });
    return;
  }

  if (resetReq.resetCode !== String(code)) {
    res.status(400).json({ error: "Invalid code. Please check the code and try again." });
    return;
  }

  await db.update(usersTable)
    .set({ passwordHash: hashPassword(String(newPassword)) })
    .where(eq(usersTable.id, resetReq.userId));

  await db.update(passwordResetRequestsTable)
    .set({ status: "completed" })
    .where(eq(passwordResetRequestsTable.id, resetReq.id));

  res.json({ success: true, message: "Password reset successfully." });
});

function formatUser(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default router;
