import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function allow(key: string): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

/**
 * Limite les demandes par IP et par e-mail (normalisé) pour limiter spam et bruteforce.
 */
export function passwordResetRequestRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = getClientIp(req);
  const raw = req.body as { email?: unknown };
  const email =
    typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const ipOk = allow(`fp:ip:${ip}`);
  const emailOk = allow(`fp:em:${email || "_"}`);
  if (!ipOk || !emailOk) {
    res.status(429).json({
      message: "Trop de tentatives. Réessayez plus tard.",
    });
    return;
  }
  next();
}

const TOKEN_WINDOW_MS = 15 * 60 * 1000;
const TOKEN_MAX_PER_WINDOW = 10;

const tokenBuckets = new Map<string, { count: number; resetAt: number }>();

function allowToken(key: string): boolean {
  const now = Date.now();
  let b = tokenBuckets.get(key);
  if (!b || now > b.resetAt) {
    tokenBuckets.set(key, { count: 1, resetAt: now + TOKEN_WINDOW_MS });
    return true;
  }
  if (b.count >= TOKEN_MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}

/** Limite légère par IP sur validate / complete (anti-abus). */
export function passwordResetTokenRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = getClientIp(req);
  if (!allowToken(`fp:tok:${ip}`)) {
    res.status(429).json({
      message: "Trop de tentatives. Réessayez plus tard.",
    });
    return;
  }
  next();
}
