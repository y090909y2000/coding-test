// 一次性建立管理員帳號（只能建立一個）
// 用法：npm run create-admin -- 你的email 你的密碼
// 密碼會用 bcrypt 加密後才存進資料庫

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Resolver } from "node:dns/promises";

const [emailArg, password] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();

if (!email || !password) {
  console.error("用法：npm run create-admin -- <email> <password>");
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("email 格式不正確");
  process.exit(1);
}
if (password.length < 8) {
  console.error("密碼至少 8 個字元");
  process.exit(1);
}
const raw = process.env.MONGODB_URI;
if (!raw) {
  console.error("找不到 MONGODB_URI（請透過 npm run create-admin 執行，會自動讀 .env.local）");
  process.exit(1);
}

// 與 lib/mongodb.ts 相同的 SRV 繞路做法
async function resolveUri(uri) {
  const url = new URL(uri);
  if (url.protocol !== "mongodb+srv:") return uri;
  const r = new Resolver();
  r.setServers(["8.8.8.8", "1.1.1.1"]);
  const srv = await r.resolveSrv(`_mongodb._tcp.${url.hostname}`);
  const params = new URLSearchParams(url.search);
  try {
    new URLSearchParams((await r.resolveTxt(url.hostname)).flat().join("&")).forEach(
      (v, k) => params.has(k) || params.set(k, v)
    );
  } catch {}
  params.set("tls", "true");
  const auth = url.username ? `${url.username}:${url.password}@` : "";
  return `mongodb://${auth}${srv.map((s) => `${s.name}:${s.port}`).join(",")}${url.pathname || "/"}?${params}`;
}

await mongoose.connect(await resolveUri(raw));
const admins = mongoose.connection.collection("admins");

if ((await admins.countDocuments()) > 0) {
  console.error("已經有管理員帳號了，這個腳本只能建立第一個。");
  await mongoose.disconnect();
  process.exit(1);
}

await admins.createIndex({ email: 1 }, { unique: true });
await admins.insertOne({
  email,
  passwordHash: await bcrypt.hash(password, 10),
  createdAt: new Date(),
});
console.log(`管理員已建立：${email}`);
await mongoose.disconnect();
