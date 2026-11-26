import OpenAI from "openai";
import { QUESTIONS, STYLES, type Style } from "@/data/questions";

// 回應格式：
// 成功 { status: "success", style, scores, analysis }
// 失敗 { status: "error", code, message }（HTTP 狀態碼對應原因）
// 「等待中」是前端在等這支 API 回應的狀態，API 本身一次回完

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = 30_000;
const MAX_CHARS = 300;

function fail(status: number, code: string, message: string) {
  return Response.json({ status: "error", code, message }, { status });
}

// 驗證答案：必須是 8 個整數，每個代表該題選了第幾個選項（從 0 開始）
function parseAnswers(body: unknown): number[] | string {
  const answers = (body as { answers?: unknown } | null)?.answers;
  if (!Array.isArray(answers)) return "缺少 answers 欄位，必須是陣列";
  if (answers.length !== QUESTIONS.length)
    return `answers 必須有 ${QUESTIONS.length} 個答案，目前收到 ${answers.length} 個`;
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    const max = QUESTIONS[i].options.length - 1;
    if (!Number.isInteger(a) || a < 0 || a > max)
      return `第 ${i + 1} 題的答案必須是 0 到 ${max} 的整數，目前收到 ${JSON.stringify(a)}`;
  }
  return answers as number[];
}

// 用題庫的權重算出風格，結果固定、不靠 AI 猜
function scoreStyles(answers: number[]) {
  const scores = Object.fromEntries(STYLES.map((s) => [s, 0])) as Record<Style, number>;
  answers.forEach((a, i) => {
    const weights = QUESTIONS[i].options[a].weights;
    for (const [style, w] of Object.entries(weights)) scores[style as Style] += w ?? 0;
  });
  // 同分時取 STYLES 裡排在前面的
  const style = STYLES.reduce((best, s) => (scores[s] > scores[best] ? s : best), STYLES[0]);
  return { style, scores };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_JSON", "請求內容不是合法的 JSON");
  }

  // 後端強制要求有效 email：沒有 email 就拿不到分析結果（不能只靠前端擋）
  const email = (body as { email?: unknown } | null)?.email;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254)
    return fail(400, "INVALID_EMAIL", "請提供有效的 email 才能取得分析結果");

  const parsed = parseAnswers(body);
  if (typeof parsed === "string") return fail(400, "INVALID_ANSWERS", parsed);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return fail(500, "MISSING_API_KEY", "伺服器沒有設定 OPENAI_API_KEY，請在 .env.local 加入後重啟 server");

  const { style, scores } = scoreStyles(parsed);

  const answerLines = parsed
    .map((a, i) => `Q${i + 1} ${QUESTIONS[i].text}\n→ ${QUESTIONS[i].options[a].text}`)
    .join("\n");

  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `你是幽默又溫暖的測驗分析師。使用者剛做完「你是哪一種 Coding 風格的人」測驗，結果是「${style}」。請用繁體中文，根據他的實際答案寫一段個人化分析，點出他的優點與一個小盲點，語氣輕鬆。請控制在 ${MAX_CHARS - 60} 字左右（絕對不可超過 ${MAX_CHARS} 字），寫成一段完整的文字，結尾要是完整的句子。純文字，不要標題、不要條列、不要分段。`,
        },
        { role: "user", content: answerLines },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return fail(502, "EMPTY_RESPONSE", "OpenAI 回傳了空的內容，請稍後再試");

    // 模型偶爾會超過字數，截斷保底
    const analysis = [...text].slice(0, MAX_CHARS).join("");
    return Response.json({ status: "success", style, scores, analysis });
  } catch (err) {
    if (err instanceof OpenAI.APIConnectionTimeoutError)
      return fail(504, "TIMEOUT", `OpenAI 超過 ${TIMEOUT_MS / 1000} 秒沒有回應，請稍後再試`);
    if (err instanceof OpenAI.APIConnectionError)
      return fail(502, "NETWORK", "無法連上 OpenAI，請檢查伺服器網路連線");
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401)
        return fail(500, "INVALID_API_KEY", "OPENAI_API_KEY 無效或已被撤銷，請檢查金鑰");
      if (err.status === 429)
        return fail(429, "RATE_LIMIT_OR_QUOTA", `OpenAI 請求過多或額度用完：${err.message}`);
      if (err.status === 404)
        return fail(500, "MODEL_NOT_FOUND", `找不到模型「${MODEL}」，或此金鑰沒有使用權限`);
      return fail(502, "OPENAI_ERROR", `OpenAI 回傳錯誤（${err.status}）：${err.message}`);
    }
    return fail(500, "UNKNOWN", `未預期的錯誤：${err instanceof Error ? err.message : String(err)}`);
  }
}
