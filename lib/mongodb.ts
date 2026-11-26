import mongoose from "mongoose";
import { Resolver } from "node:dns/promises";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("請在 .env.local 設定 MONGODB_URI");
}

// 快取在 globalThis，避免開發模式熱重載時重複建立連線
type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: Cache;
};

const cache: Cache = (globalWithMongoose._mongooseCache ??= {
  conn: null,
  promise: null,
});

// 本機 DNS（127.0.0.1）不回應 Node 的 SRV 查詢，mongodb+srv:// 會出現 querySrv ECONNREFUSED。
// 這裡改用公共 DNS 查出 SRV / TXT，組成一般 mongodb:// 連線字串。
async function resolveMongoUri(uri: string): Promise<string> {
  const url = new URL(uri);
  if (url.protocol !== "mongodb+srv:") return uri;

  const resolver = new Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);

  const srv = await resolver.resolveSrv(`_mongodb._tcp.${url.hostname}`);
  const hosts = srv.map((s) => `${s.name}:${s.port}`).join(",");

  const params = new URLSearchParams(url.search);
  try {
    const txt = await resolver.resolveTxt(url.hostname);
    new URLSearchParams(txt.flat().join("&")).forEach((v, k) => {
      if (!params.has(k)) params.set(k, v);
    });
  } catch {
    // 沒有 TXT 記錄也沒關係
  }
  params.set("tls", "true");

  const auth = url.username ? `${url.username}:${url.password}@` : "";
  return `mongodb://${auth}${hosts}${url.pathname || "/"}?${params.toString()}`;
}

export async function connectDB() {
  if (cache.conn) return cache.conn;

  cache.promise ??= resolveMongoUri(MONGODB_URI!).then((uri) =>
    mongoose.connect(uri, { bufferCommands: false })
  );

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // 失敗時清掉，下次可重試
    throw err;
  }
  return cache.conn;
}
