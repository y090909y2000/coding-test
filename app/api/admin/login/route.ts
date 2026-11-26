import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { COOKIE_NAME, MAX_AGE, signToken } from "@/lib/auth";
import Admin from "@/models/Admin";

// 成功 { status: "success", email }，並設定 httpOnly cookie
// 失敗 { status: "error", code, message }

// 帳號不存在時也跑一次 bcrypt，避免從回應時間猜出帳號是否存在
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

function fail(status: number, code: string, message: string) {
  return Response.json({ status: "error", code, message }, { status });
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_JSON", "請求內容不是合法的 JSON");
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || password.length > 200)
    return fail(400, "MISSING_FIELDS", "請輸入 email 與密碼");

  try {
    await connectDB();
    const admin = await Admin.findOne({ email });
    const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
    if (!admin || !ok) return fail(401, "BAD_CREDENTIALS", "email 或密碼錯誤");

    const token = await signToken(String(admin._id), admin.email);
    const res = Response.json({ status: "success", email: admin.email });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.headers.append(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`
    );
    return res;
  } catch (err) {
    return fail(500, "LOGIN_ERROR", `登入失敗：${err instanceof Error ? err.message : String(err)}`);
  }
}
