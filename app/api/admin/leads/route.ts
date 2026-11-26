import { getAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";

// 管理員專用：名單列表（分頁）
// 第一步就在後端驗證 JWT cookie，沒有合法憑證直接回 401，不查資料庫
// GET /api/admin/leads?page=1&pageSize=20
// 成功 { status: "success", leads: [{ email, resultType, createdAt }], page, pageSize, total, totalPages }

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function fail(status: number, code: string, message: string) {
  return Response.json({ status: "error", code, message }, { status });
}

function toInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return fail(401, "UNAUTHORIZED", "尚未登入或登入已過期，請先登入管理員帳號");

  const params = new URL(request.url).searchParams;
  const page = toInt(params.get("page"), 1);
  const pageSize = Math.min(toInt(params.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  try {
    await connectDB();
    const [leads, total] = await Promise.all([
      Lead.find({}, { email: 1, resultType: 1, createdAt: 1 }) // 只取需要的欄位
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Lead.countDocuments(),
    ]);

    return Response.json({
      status: "success",
      leads: leads.map((l) => ({
        email: l.email,
        resultType: l.resultType,
        createdAt: l.createdAt,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    return fail(500, "DB_ERROR", `讀取名單失敗：${err instanceof Error ? err.message : String(err)}`);
  }
}
