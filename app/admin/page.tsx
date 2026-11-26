"use client";

import { useEffect, useState } from "react";

type LeadRow = { email: string; resultType: string; createdAt: string };
type ListData = { leads: LeadRow[]; page: number; total: number; totalPages: number };
type View = "loading" | "login" | "list";

type FetchResult =
  | { kind: "ok"; data: ListData }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

// 實際的權限判斷在後端 API；前端只是依回應（401）決定要顯示登入表單還是名單
async function fetchLeads(p: number): Promise<FetchResult> {
  try {
    const res = await fetch(`/api/admin/leads?page=${p}`);
    if (res.status === 401) return { kind: "unauthorized" };
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.status !== "success")
      return { kind: "error", message: json?.message ?? `讀取失敗（${res.status}）` };
    return { kind: "ok", data: json };
  } catch {
    return { kind: "error", message: "網路連線失敗，請檢查網路後再試" };
  }
}

export default function AdminPage() {
  const [view, setView] = useState<View>("loading");
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function apply(r: FetchResult) {
    if (r.kind === "unauthorized") {
      setData(null);
      setView("login");
    } else if (r.kind === "error") {
      setError(r.message);
      setView("list");
    } else {
      setData(r.data);
      setPage(r.data.page);
      setView("list");
    }
  }

  function load(p: number) {
    return fetchLeads(p).then(apply);
  }

  useEffect(() => {
    fetchLeads(1).then(apply);
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message ?? `登入失敗（${res.status}）`);
        return;
      }
      setPassword("");
      setView("loading");
      await load(1);
    } catch {
      setError("網路連線失敗，請檢查網路後再試");
    } finally {
      setBusy(false);
    }
  }

  // Excel 由後端產生，這裡只負責把回傳的檔案存下來
  async function download() {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/leads/export");
      if (res.status === 401) {
        setData(null);
        setView("login");
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.message ?? `下載失敗（${res.status}）`);
        return;
      }
      const name =
        /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
        "leads.xlsx";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("網路連線失敗，請檢查網路後再試");
    } finally {
      setDownloading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setData(null);
    setView("login");
  }

  if (view === "loading") return <main className="p-6">載入中…</main>;

  if (view === "login")
    return (
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="mb-6 text-2xl font-bold">管理員登入</h1>
        <form onSubmit={login} className="flex flex-col gap-3">
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="Email"
            required
            className="input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密碼"
            required
            className="input"
          />
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn btn-primary">
            {busy ? "登入中…" : "登入"}
          </button>
        </form>
      </main>
    );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">名單列表{data ? `（共 ${data.total} 筆）` : ""}</h1>
        <div className="flex gap-2">
          <button
            onClick={download}
            disabled={!data || data.total === 0 || downloading}
            className="btn btn-sm"
          >
            {downloading ? "下載中…" : "下載 Excel"}
          </button>
          <button onClick={logout} className="btn btn-sm">
            登出
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-red-600">
          {error}
        </p>
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">風格代號</th>
                <th className="px-4 py-3">填答時間</th>
              </tr>
            </thead>
            <tbody>
              {data.leads.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                    目前還沒有名單
                  </td>
                </tr>
              )}
              {data.leads.map((l) => (
                <tr key={l.email} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">{l.email}</td>
                  <td className="px-4 py-3">{l.resultType}</td>
                  <td className="px-4 py-3">{new Date(l.createdAt).toLocaleString("zh-TW")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="mt-5 flex items-center justify-center gap-4 text-sm">
            <button
              onClick={() => { setError(""); load(page - 1); }}
              disabled={page <= 1}
              className="btn btn-sm"
            >
              上一頁
            </button>
            <span>
              第 {data.page} / {data.totalPages} 頁
            </span>
            <button
              onClick={() => { setError(""); load(page + 1); }}
              disabled={page >= data.totalPages}
              className="btn btn-sm"
            >
              下一頁
            </button>
          </div>
        </>
      )}
    </main>
  );
}
