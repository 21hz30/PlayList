import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile, access } from "node:fs/promises";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

async function readPassword() {
  if (!process.stdin.isTTY) {
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk.toString();
      if (Buffer.byteLength(input) > 1026) throw new Error("Password input is too long.");
    }
    return input.replace(/\r?\n$/, "");
  }

  // readline handles editing while the output stream suppresses password echo.
  const hiddenOutput = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const prompt = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true });
  process.stdout.write("Password for admin (hidden): ");
  try {
    return await new Promise((resolve, reject) => {
      prompt.once("SIGINT", () => reject(new Error("Setup cancelled.")));
      prompt.question("", resolve);
    });
  } finally {
    prompt.close();
    process.stdout.write("\n");
  }
}

try {
  const localPath = new URL("../.env.local", import.meta.url);
  const vercelPath = new URL("../.env.vercel", import.meta.url);
  const existing = await readFile(localPath, "utf8").catch(error => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  if (/^\s*(?:export\s+)?ADMIN_(?:PASSWORD_HASH|SESSION_SECRET)\s*=/m.test(existing)) {
    throw new Error("Admin settings already exist in .env.local. Keep or remove those settings before running setup again.");
  }
  if (await access(vercelPath).then(() => true, () => false)) {
    throw new Error(".env.vercel already exists. Keep or remove that file before running setup again.");
  }

  const password = await readPassword();
  if (password.length < 6 || Buffer.byteLength(password) > 1024 || /[\r\n]/.test(password)) {
    throw new Error("Use a password of at least 6 characters, at most 1024 bytes, on one line.");
  }
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  const hash = `scrypt$16384$8$1$${salt.toString("hex")}$${key.toString("hex")}`;
  const secret = randomBytes(32).toString("hex");

  // Next.js dotenv expands $, whereas the Vercel environment UI expects raw $.
  const localSettings = `ADMIN_PASSWORD_HASH="${hash.replaceAll("$", "\\$")}"\nADMIN_SESSION_SECRET="${secret}"\n`;
  const vercelSettings = `ADMIN_PASSWORD_HASH=${hash}\nADMIN_SESSION_SECRET=${secret}\n`;
  await writeFile(vercelPath, vercelSettings, { mode: 0o600, flag: "wx" });
  await writeFile(localPath, `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${localSettings}`, { mode: 0o600 });
  console.log("Admin configured. Local settings: .env.local. Vercel values: .env.vercel.");
  console.log("Keep both files private. Copy the two raw values from .env.vercel into Vercel Environment Variables, then redeploy.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Admin setup failed.");
  process.exitCode = 1;
}
