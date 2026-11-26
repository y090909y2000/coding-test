import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";

// 公開 API（不需登入），所以每個欄位都限制長度，避免被拿來塞垃圾資料
// 成功 { status: "success", created: true|false }（created=false 代表更新既有名單）
// 失敗 { status: "error", code, message }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
const MAX_ANSWERS = 50;
const MAX_RESULT = 5000;
const MAX_TYPE = 50;

function fail(status: number, code: string, message: string) {
  return Response.json({ status: "error", code, message }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown> | null;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_JSON", "請求內容不是合法的 JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return fail(400, "INVALID_BODY", "請求內容必須是 JSON 物件");

  const { email, answers, result, resultType } = body;

  if (typeof email !== "string" || !email.trim())
    return fail(400, "INVALID_EMAIL", "請填寫 email");
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail.length > MAX_EMAIL || !EMAIL_RE.test(cleanEmail))
    return fail(400, "INVALID_EMAIL", `「${email.trim().slice(0, 60)}」不是有效的 email 格式`);

  if (!Array.isArray(answers) || answers.length === 0)
    return fail(400, "INVALID_ANSWERS", "answers 必須是非空的陣列");
  if (answers.length > MAX_ANSWERS)
    return fail(400, "INVALID_ANSWERS", `answers 最多 ${MAX_ANSWERS} 筆`);

  if (typeof result !== "string" || !result.trim())
    return fail(400, "INVALID_RESULT", "result 必須是非空的文字");
  if (result.length > MAX_RESULT)
    return fail(400, "INVALID_RESULT", `result 最多 ${MAX_RESULT} 字`);

  if (typeof resultType !== "string" || !resultType.trim())
    return fail(400, "INVALID_RESULT_TYPE", "resultType 必須是非空的文字");
  if (resultType.length > MAX_TYPE)
    return fail(400, "INVALID_RESULT_TYPE", `resultType 最多 ${MAX_TYPE} 字`);

  try {
    await connectDB();

    const save = () =>
      Lead.findOneAndUpdate(
        { email: cleanEmail },
        { $set: { answers, result, resultType: resultType.trim() } },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true, // 新增時補上 createdAt；更新時不動它
          includeResultMetadata: true,
        }
      );

    let res;
    try {
      res = await save();
    } catch (err) {
      // 同一個 email 同時送出兩次，upsert 可能撞到唯一索引，重試一次就會變成更新
      if ((err as { code?: number }).code === 11000) res = await save();
      else throw err;
    }

    return Response.json({
      status: "success",
      created: !res.lastErrorObject?.updatedExisting,
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === "ValidationError")
      return fail(400, "VALIDATION_FAILED", `資料驗證失敗：${(err as Error).message}`);
    if (name?.startsWith("MongoServerSelection") || name === "MongooseServerSelectionError")
      return fail(503, "DB_UNREACHABLE", "無法連上資料庫，請稍後再試");
    return fail(500, "DB_ERROR", `儲存失敗：${err instanceof Error ? err.message : String(err)}`);
  }
}
