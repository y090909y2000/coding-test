import { getAdmin } from "@/lib/auth";

// 檢查目前是否已登入（也用來確認 cookie 與 JWT 驗證有效）
export async function GET() {
  const admin = await getAdmin();
  if (!admin)
    return Response.json(
      { status: "error", code: "UNAUTHORIZED", message: "尚未登入或登入已過期" },
      { status: 401 }
    );
  return Response.json({ status: "success", email: admin.email });
}
