import { createHash, randomBytes } from "node:crypto";

const SESSION_TOKEN_BYTES = 32;
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createSessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);
}