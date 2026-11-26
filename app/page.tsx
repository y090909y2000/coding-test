"use client";

import { useState } from "react";
import { QUESTIONS } from "@/data/questions";

type Step = "intro" | "quiz" | "email" | "submitting" | "result";
type Analysis = { style: string; analysis: string };

// 打 API 並把失敗轉成可讀的錯誤文字
async function postJson(url: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("網路連線失敗，請檢查網路後再試");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.status !== "success") {
    throw new Error(data?.message ?? `伺服器錯誤（${res.status}）`);
  }
  return data;
}

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  // AI 結果先暫存，Email 存進資料庫成功後才會顯示
  const [pending, setPending] = useState<Analysis | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);

  function start() {
    setAnswers([]);
    setCurrent(0);
    setEmail("");
    setError("");
    setPending(null);
    setResult(null);
    setStep("quiz");
  }

  function choose(optionIndex: number) {
    const next = [...answers.slice(0, current), optionIndex];
    setAnswers(next);
    if (current + 1 < QUESTIONS.length) setCurrent(current + 1);
    else setStep("email");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("請輸入有效的 Email");
      return;
    }
    setError("");
    setStep("submitting");
    try {
      // 重試時如果 AI 分析已經有了，就不重打 /api/analyze
      let analysis = pending;
      if (!analysis) {
        const data = await postJson("/api/analyze", { email: cleanEmail, answers });
        analysis = { style: data.style, analysis: data.analysis };
        setPending(analysis);
      }
      await postJson("/api/leads", {
        email: cleanEmail,
        answers,
        result: analysis.analysis,
        resultType: analysis.style,
      });
      setResult(analysis);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
      setStep("email");
    }
  }

  const q = QUESTIONS[current];
  const progress = Math.round((current / QUESTIONS.length) * 100);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-6">
      {step === "intro" && (
        <section className="animate-rise text-center sm:text-left">
          <p className="mb-4 text-sm font-semibold tracking-widest text-brand">
            CODING STYLE TEST
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            你是哪一種
            <br />
            <span className="text-brand">Coding 風格</span>的人？
          </h1>
          <p className="mt-6 text-lg text-zinc-600">
            8 個小問題，找出你的 Coding 風格，並由 AI 為你寫一份專屬分析。
          </p>
          <button onClick={start} className="btn btn-primary btn-lg mt-10">
            開始測驗 →
          </button>
          <p className="mt-4 text-sm text-zinc-400">約 1 分鐘・不需註冊</p>
        </section>
      )}

      {step === "quiz" && (
        <section>
          <div className="mb-8">
            <div className="mb-2 flex items-baseline justify-between text-sm text-zinc-500">
              <span>
                第 <b className="text-lg text-foreground">{current + 1}</b> / {QUESTIONS.length} 題
              </span>
              <span>{progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={QUESTIONS.length}
              aria-valuenow={current}
              className="h-2 w-full overflow-hidden rounded-full bg-zinc-200"
            >
              <div
                className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
                style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* key 變動時整塊重新播放轉場動畫 */}
          <div key={current} className="animate-rise">
            <h2 className="text-2xl font-bold leading-snug sm:text-3xl">{q.text}</h2>
            <div className="mt-8 flex flex-col gap-3">
              {q.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  style={{ animationDelay: `${60 + i * 60}ms` }}
                  className="animate-rise group flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left text-base transition hover:border-brand hover:bg-brand-soft active:scale-[0.99] sm:text-lg"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500 transition group-hover:bg-brand group-hover:text-white">
                    {"ABCD"[i]}
                  </span>
                  <span>{o.text}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {(step === "email" || step === "submitting") && (
        <form onSubmit={submit} className="animate-rise">
          <p className="mb-3 text-sm font-semibold tracking-widest text-brand">
            DONE · 8 / 8
          </p>
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">測驗完成！</h2>
          <p className="mt-3 text-lg text-zinc-600">
            請輸入 Email，馬上看到你的專屬分析結果。
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={step === "submitting"}
            placeholder="you@example.com"
            className="input mt-8 text-lg disabled:opacity-60"
          />
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={step === "submitting"}
            className="btn btn-primary btn-lg mt-5 w-full"
          >
            {step === "submitting" ? (
              <>
                <span className="spinner" />
                AI 分析中，請稍候…
              </>
            ) : error ? (
              "重試"
            ) : (
              "看結果"
            )}
          </button>
        </form>
      )}

      {step === "result" && result && (
        <section className="animate-rise">
          {/* 這張卡片就是要被截圖分享的畫面 */}
          <article className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand to-brand-dark p-7 text-white shadow-2xl shadow-brand/30 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/5" />
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.25em] text-white/70">
                MY CODING STYLE
              </p>
              <p className="mt-6 text-lg text-white/80">我是</p>
              <h2 className="mt-1 text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">
                {result.style}
              </h2>
              <div className="my-8 h-px w-16 bg-white/40" />
              <p className="whitespace-pre-wrap text-base leading-8 text-white/95 sm:text-lg sm:leading-9">
                {result.analysis}
              </p>
              <p className="mt-10 text-sm text-white/60">你是哪一種 Coding 風格的人？</p>
            </div>
          </article>
          <button onClick={start} className="btn btn-lg mx-auto mt-8 flex">
            再測一次
          </button>
        </section>
      )}
    </main>
  );
}
