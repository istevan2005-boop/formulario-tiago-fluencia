import { getRuntimeValue } from "./runtime";

const COOKIE_NAME = "tiago_admin";
const MAX_AGE = 60 * 60 * 24 * 30;

async function hash(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sessionToken() {
  const password = await getRuntimeValue("ADMIN_PASSWORD");
  return password ? hash(`tiago-formulario:${password}`) : "";
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  for (const part of cookies.split(";")) {
    const [cookieName, ...value] = part.trim().split("=");
    if (cookieName === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

export async function verifyPassword(candidate: string) {
  const password = await getRuntimeValue("ADMIN_PASSWORD");
  if (!password || !candidate) return false;
  return (await hash(candidate)) === (await hash(password));
}

export async function isAdmin(request: Request) {
  const expected = await sessionToken();
  return Boolean(expected) && readCookie(request, COOKIE_NAME) === expected;
}

export async function adminCookie(request: Request) {
  const token = await sessionToken();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure}`;
}

export function expiredAdminCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
