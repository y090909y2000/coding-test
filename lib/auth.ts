import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const COOKIE_NAME = "admin_token";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("請在 .env.local 設定 JWT_SECRET（至少 32 字元）");
  return new TextEncoder().encode(secret);
}

export async function signToken(adminId: string, email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

// 驗證 cookie 裡的 token，回傳管理員資訊；沒登入或 token 無效回傳 null
// 之後後台頁面與管理 API 都用這個函式把關
export async function getAdmin() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return { id: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}
