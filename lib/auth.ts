import crypto from "crypto";
import { cookies } from "next/headers";
import { getSetting } from "./db";

export type Role = "chef" | "her";
const COOKIE = "gk_session";

async function secret() {
  return process.env.SESSION_SECRET || getSetting("session_secret", () => crypto.randomBytes(32).toString("hex"));
}

function sign(value: string, key: string) {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

export function pinFor(role: Role) {
  return role === "chef" ? process.env.CHEF_PIN || "1111" : process.env.HER_PIN || "2222";
}

export async function setSession(role: Role) {
  const key = await secret();
  const token = `${role}.${sign(role, key)}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getRole(): Promise<Role | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [role, mac] = token.split(".");
  if (role !== "chef" && role !== "her") return null;
  const key = await secret();
  const expected = sign(role, key);
  if (!mac || mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return role;
}

export const HER_NAME = process.env.HER_NAME || "Babe";
