import * as XLSX from "xlsx";
import { getAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";

// 管理員專用：匯出名單 Excel，在後端產生檔案再回傳
// 和名單 API 一樣，第一步就在後端驗證 JWT cookie，沒有合法憑證回 401
// GET /api/admin/leads/export → leads-YYYY-MM-DD.xlsx

const MAX_ROWS = 50_000; // 保底上限，避免一次吃光記憶體
const TZ = "Asia/Taipei";

function fail(status: number, code: string, message: string) {
  return Response.json({ status: "error", code, message }, { status });
}

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return fail(401, "UNAUTHORIZED", "尚未登入或登入已過期，請先登入管理員帳號");

  try {
    await connectDB();
    const leads = await Lead.find({}, { email: 1, resultType: 1, createdAt: 1 })
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_ROWS)
      .lean();

    if (leads.length === 0) return fail(404, "NO_DATA", "目前沒有名單可以匯出");

    const timeFmt = new Intl.DateTimeFormat("zh-TW", {
      timeZone: TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const rows = [
      ["Email", "風格", "填答時間"],
      ...leads.map((l) => [l.email, l.resultType, timeFmt.format(l.createdAt)]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 32 }, { wch: 14 }, { wch: 22 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "名單");
    const buffer: Buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

    const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="leads-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return fail(500, "EXPORT_ERROR", `匯出失敗：${err instanceof Error ? err.message : String(err)}`);
  }
}
