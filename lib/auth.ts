import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Account } from "./types/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secure_secret_key_12345!",
);
export const COOKIE_NAME = "encova_auth_token";

const EXPIRATION_TIME = "24h";

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION_TIME)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function setToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NEXT_COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function getToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token || null;
}

export async function removeToken() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = await getToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return payload.user as Omit<Account, "password">;
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}
